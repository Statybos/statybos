"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

function dateOverlap(startDate: Date, endDate: Date) {
  return {
    startDate: { lte: endDate },
    OR: [{ endDate: null }, { endDate: { gte: startDate } }],
  };
}

function currentDateRange() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    start: new Date(`${today}T00:00:00.000Z`),
    end: new Date(`${today}T23:59:59.999Z`),
  };
}

async function syncEmployeeStatus(employeeId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.status === "INACTIVE") return;

  const { start, end } = currentDateRange();
  const [work, away] = await Promise.all([
    prisma.deployment.findFirst({
      where: { employeeId, type: "WORK", isActive: true, ...dateOverlap(start, end) },
      select: { id: true },
    }),
    prisma.deployment.findFirst({
      where: {
        employeeId,
        type: { in: ["VACATION_LT", "TRANSIT", "PERSONAL_TRIP"] },
        isActive: true,
        ...dateOverlap(start, end),
      },
      select: { id: true },
    }),
  ]);

  await prisma.employee.update({
    where: { id: employeeId },
    data: { status: away ? "ON_LEAVE" : work ? "ON_SITE" : "BENCH_LT" },
  });
}

async function closePersonalTripsBeforeWork(employeeId: string, workStart: Date, workEnd: Date | null) {
  const trips = await prisma.deployment.findMany({
    where: {
      employeeId,
      type: "PERSONAL_TRIP",
      isActive: true,
      ...dateOverlap(workStart, workEnd ?? new Date("9999-12-31")),
    },
  });

  for (const trip of trips) {
    if (trip.startDate >= workStart) {
      await prisma.deployment.delete({ where: { id: trip.id } });
      continue;
    }
    await prisma.deployment.update({
      where: { id: trip.id },
      data: {
        endDate: new Date(workStart.getTime() - DAY_MS),
        isActive: false,
        closedAt: new Date(),
      },
    });
  }
}

async function ensureWorkAfterVacation(employeeId: string, objectId: string | null, vacationStart: Date, vacationEnd: Date | null) {
  if (!objectId || !vacationEnd) return;

  const workStart = new Date(vacationEnd.getTime() + DAY_MS);
  const continuation = await prisma.deployment.findFirst({
    where: {
      employeeId,
      objectId,
      type: "WORK",
      isActive: true,
      startDate: { gte: vacationStart },
    },
    orderBy: { startDate: "asc" },
  });

  if (continuation) {
    await prisma.deployment.update({
      where: { id: continuation.id },
      data: { startDate: workStart, closedAt: null },
    });
    return;
  }

  await prisma.deployment.create({
    data: {
      employeeId,
      objectId,
      type: "WORK",
      startDate: workStart,
      endDate: null,
      isActive: true,
      notes: "Grįžimas po atostogų",
    },
  });
}

async function clearAwayForWork(employeeId: string, workStart: Date, workEnd: Date | null) {
  const awayPeriods = await prisma.deployment.findMany({
    where: {
      employeeId,
      type: { in: ["VACATION_LT", "TRANSIT"] },
      isActive: true,
      ...dateOverlap(workStart, workEnd ?? new Date("9999-12-31")),
    },
  });

  for (const away of awayPeriods) {
    if (away.startDate < workStart) {
      await prisma.deployment.update({
        where: { id: away.id },
        data: { endDate: new Date(workStart.getTime() - DAY_MS) },
      });
    } else {
      await prisma.deployment.delete({ where: { id: away.id } });
    }
  }
}

export async function upsertObject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const requiredRaw = Number(formData.get("requiredHeadcount") ?? 1);
  const data = {
    title: String(formData.get("title") ?? "").trim(),
    country: String(formData.get("country") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    clientName: String(formData.get("clientName") ?? "").trim(),
    requiredHeadcount: Number.isFinite(requiredRaw) ? Math.max(1, Math.round(requiredRaw)) : 1,
    status: String(formData.get("status") ?? "ACTIVE"),
  };
  if (!data.title || !data.country) {
    return { error: "Įveskite objekto pavadinimą ir šalį" };
  }
  if (id) await prisma.projectObject.update({ where: { id }, data });
  else await prisma.projectObject.create({ data });
  revalidatePath("/admin/darbuotojai");
  return { ok: true as const };
}

export async function updateEmployeeObject(employeeId: string, objectId: string | null) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: "Darbuotojas nerastas" };
  if (employee.status === "INACTIVE") return { error: "Atleistam darbuotojui objekto priskirti negalima" };
  if (objectId) {
    const object = await prisma.projectObject.findUnique({ where: { id: objectId } });
    if (!object || object.status !== "ACTIVE") return { error: "Aktyvus objektas nerastas" };
  }

  const now = new Date();
  const { start, end } = currentDateRange();
  const currentWorkDeployment = await prisma.deployment.findFirst({
    where: {
      employeeId,
      type: "WORK",
      isActive: true,
      startDate: { lte: end },
      OR: [{ endDate: null }, { endDate: { gte: start } }],
    },
    orderBy: { startDate: "desc" },
  });
  const currentAwayDeployment = await prisma.deployment.findFirst({
    where: {
      employeeId,
      type: { in: ["VACATION_LT", "TRANSIT"] },
      isActive: true,
      ...dateOverlap(start, end),
    },
    select: { id: true },
  });

  if (objectId && currentAwayDeployment) {
    return { error: "Atostogaujančio darbuotojo perkelti į kitą objektą negalima" };
  }

  if (objectId) {
    try {
      await closePersonalTripsBeforeWork(employeeId, now, null);
      await clearAwayForWork(employeeId, now, null);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Konfliktas su asmenine komandiruote." };
    }
  }

  if (objectId) {
    if (currentWorkDeployment) {
      if (currentWorkDeployment.objectId === objectId) {
        await prisma.employee.update({
          where: { id: employeeId },
          data: { assignedObjectId: objectId },
        });
      } else {
        await prisma.deployment.update({
          where: { id: currentWorkDeployment.id },
          data: { endDate: now, isActive: false, closedAt: now },
        });
        await prisma.deployment.create({
          data: {
            employeeId,
            objectId,
            startDate: now,
            endDate: null,
            type: "WORK",
            isActive: true,
            notes: "Priskyrimas objektui",
          },
        });
      }
    } else {
      await prisma.deployment.create({
        data: {
          employeeId,
          objectId,
          startDate: now,
          endDate: null,
          type: "WORK",
          isActive: true,
          notes: "Priskyrimas objektui",
        },
      });
    }
  } else if (currentWorkDeployment) {
    await prisma.deployment.update({
      where: { id: currentWorkDeployment.id },
      data: { endDate: now, isActive: false, closedAt: now },
    });
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: { assignedObjectId: objectId },
  });
  await syncEmployeeStatus(employeeId);
  revalidatePath("/admin/darbuotojai");
  return { ok: true as const };
}

export async function createDeployment(formData: FormData) {
  const employeeId = String(formData.get("employeeId") ?? "");
  const objectId = String(formData.get("objectId") ?? "") || null;
  const type = String(formData.get("type") ?? "WORK");
  const startDate = new Date(String(formData.get("startDate") ?? ""));
  const endValue = String(formData.get("endDate") ?? "");
  const endDate = endValue ? new Date(endValue) : null;
  const notes = String(formData.get("notes") ?? "");

  if (!employeeId || Number.isNaN(startDate.getTime()) || (endDate && Number.isNaN(endDate.getTime()))) {
    return { error: "Pasirinkite darbuotoją ir pradžios datą" };
  }
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: "Darbuotojas nerastas" };
  if (employee.status === "INACTIVE") return { error: "Atleistam darbuotojui įrašo sukurti negalima" };
  if (!["WORK", "VACATION_LT", "TRANSIT", "PERSONAL_TRIP"].includes(type)) {
    return { error: "Pasirinktas netinkamas įrašo tipas" };
  }
  if (endDate && endDate < startDate) {
    return { error: "Pabaigos data negali būti ankstesnė už pradžią" };
  }
  if (type === "WORK" && !objectId) {
    return { error: "Darbo komandiruotei privalomas objektas" };
  }

  // Atostogos / tranzitas gali dengti darbo periodą – tada dienos neskaičiuojamos kaip „objekte“.
  // Darbo periodai tarpusavyje negali persidengti.
  if (type === "WORK") {
    const overlapWork = await prisma.deployment.findFirst({
      where: {
        employeeId,
        type: "WORK",
        isActive: true,
        ...dateOverlap(startDate, endDate ?? new Date("9999-12-31")),
      },
    });
    if (overlapWork) {
      if (overlapWork.objectId === objectId) {
        await prisma.deployment.update({
          where: { id: overlapWork.id },
          data: { startDate, endDate, isActive: true, closedAt: null },
        });
        await syncEmployeeStatus(employeeId);
        revalidatePath("/admin/darbuotojai");
        return { ok: true as const };
      }
      await prisma.deployment.update({
        where: { id: overlapWork.id },
        data: {
          endDate: new Date(startDate.getTime() - DAY_MS),
          isActive: false,
          closedAt: new Date(),
        },
      });
    }
    try {
      await closePersonalTripsBeforeWork(employeeId, startDate, endDate);
      await clearAwayForWork(employeeId, startDate, endDate);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Konfliktas su asmenine komandiruote." };
    }
  } else if (type === "VACATION_LT") {
    const overlappingDeployments = await prisma.deployment.findMany({
      where: {
        employeeId,
        isActive: true,
        ...dateOverlap(startDate, endDate ?? new Date("9999-12-31")),
      },
    });

    if (overlappingDeployments.some((deployment) => deployment.type !== "WORK")) {
      return { error: "Konfliktas: atostogos persidengia su kita atostogų arba tranzito atkarpa." };
    }

    await prisma.$transaction(async (tx) => {
      for (const deployment of overlappingDeployments) {
        const hasBeforePart = deployment.startDate < startDate;
        const hasAfterPart = endDate !== null && (deployment.endDate == null || deployment.endDate > endDate);

        if (hasBeforePart) {
          await tx.deployment.update({
            where: { id: deployment.id },
            data: { endDate: new Date(startDate.getTime() - DAY_MS) },
          });
        } else {
          await tx.deployment.delete({ where: { id: deployment.id } });
        }

        if (hasAfterPart) {
          await tx.deployment.create({
            data: {
              employeeId,
              objectId: deployment.objectId,
              startDate: new Date(endDate.getTime() + DAY_MS),
              endDate: deployment.endDate,
              closedAt: deployment.closedAt,
              isActive: deployment.isActive,
              type: deployment.type,
              notes: deployment.notes,
            },
          });
        }
      }

      await tx.deployment.create({
        data: {
          employeeId,
          objectId,
          type,
          startDate,
          endDate,
          notes,
        },
      });
    });
    await ensureWorkAfterVacation(employeeId, objectId, startDate, endDate);
  } else {
    const overlapSame = await prisma.deployment.findFirst({
      where: {
        employeeId,
        type: { in: ["VACATION_LT", "TRANSIT", "PERSONAL_TRIP"] },
        isActive: true,
        ...dateOverlap(startDate, endDate ?? new Date("9999-12-31")),
      },
    });
    if (overlapSame) {
      return { error: "Konfliktas: jau yra atostogos arba tranzitas šiomis datomis." };
    }
  }

  if (type !== "VACATION_LT") {
    await prisma.deployment.create({
      data: {
        employeeId,
        objectId: type === "WORK" ? objectId : objectId,
        type,
        startDate,
        endDate,
        notes,
      },
    });
  }

  const now = new Date();
  if (
    type === "WORK" &&
    objectId &&
    startDate <= now &&
    (!endDate || endDate >= now)
  ) {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { assignedObjectId: objectId },
    });
  }
  await syncEmployeeStatus(employeeId);

  revalidatePath("/admin/darbuotojai");
  return { ok: true as const };
}

export async function startEmployeeDeployment(formData: FormData) {
  const employeeId = String(formData.get("employeeId") ?? "");
  const startDate = new Date(String(formData.get("startDate") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();

  if (!employeeId || Number.isNaN(startDate.getTime())) {
    return { error: "Pasirinkite komandiruotės pradžios datą" };
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: "Darbuotojas nerastas" };
  if (employee.status === "INACTIVE") return { error: "Atleistam darbuotojui komandiruotės pradėti negalima" };

  const activeDeployment = await prisma.deployment.findFirst({
    where: {
      employeeId,
      isActive: true,
      type: { in: ["PERSONAL_TRIP", "WORK", "VACATION_LT", "TRANSIT"] },
      ...dateOverlap(startDate, new Date("9999-12-31")),
    },
  });
  if (activeDeployment) return { error: "Darbuotojas jau yra aktyvioje komandiruotėje" };

  await prisma.deployment.create({
    data: {
      employeeId,
      objectId: null,
      startDate,
      endDate: null,
      type: "PERSONAL_TRIP",
      notes,
      isActive: true,
    },
  });
  await syncEmployeeStatus(employeeId);

  revalidatePath("/admin/darbuotojai");
  return { ok: true as const };
}

export async function closeEmployeeDeployment(id: string) {
  const deployment = await prisma.deployment.findUnique({ where: { id } });
  if (!deployment) return { error: "Komandiruotė nerasta" };
  if (!deployment.isActive) return { error: "Komandiruotė jau uždaryta" };

  const closedAt = new Date();
  await prisma.deployment.update({
    where: { id },
    data: { isActive: false, closedAt, endDate: closedAt },
  });
  await syncEmployeeStatus(deployment.employeeId);

  revalidatePath("/admin/darbuotojai");
  return { ok: true as const };
}

export async function deleteDeployment(id: string) {
  const deployment = await prisma.deployment.findUnique({ where: { id } });
  if (!deployment) return { error: "Priskyrimas nerastas" };
  await prisma.deployment.delete({ where: { id } });
  await syncEmployeeStatus(deployment.employeeId);
  revalidatePath("/admin/darbuotojai");
}
