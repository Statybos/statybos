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

async function syncEmployeeStatus(employeeId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.status === "INACTIVE") return;

  const now = new Date();
  const [work, away] = await Promise.all([
    prisma.deployment.findFirst({
      where: { employeeId, type: "WORK", isActive: true, ...dateOverlap(now, now) },
      select: { id: true },
    }),
    prisma.deployment.findFirst({
      where: {
        employeeId,
        type: { in: ["VACATION_LT", "TRANSIT", "PERSONAL_TRIP"] },
        isActive: true,
        ...dateOverlap(now, now),
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
  revalidatePath("/admin/planuoklis");
  revalidatePath("/admin/darbuotojai");
  return { ok: true as const };
}

export async function updateObjectHeadcount(id: string, requiredHeadcount: number) {
  const value = Math.max(1, Math.round(requiredHeadcount));
  await prisma.projectObject.update({
    where: { id },
    data: { requiredHeadcount: value },
  });
  revalidatePath("/admin/planuoklis");
  return { ok: true as const };
}

export async function deleteObject(id: string) {
  await prisma.projectObject.delete({ where: { id } });
  revalidatePath("/admin/planuoklis");
  revalidatePath("/admin/darbuotojai");
}

export async function updateEmployeeObject(employeeId: string, objectId: string | null) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: "Darbuotojas nerastas" };
  if (objectId) {
    const object = await prisma.projectObject.findUnique({ where: { id: objectId } });
    if (!object) return { error: "Objektas nerastas" };
  }

  const now = new Date();
  const currentWorkDeployment = await prisma.deployment.findFirst({
    where: {
      employeeId,
      type: "WORK",
      isActive: true,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    orderBy: { startDate: "desc" },
  });
  const currentAwayDeployment = await prisma.deployment.findFirst({
    where: {
      employeeId,
      type: { in: ["VACATION_LT", "TRANSIT"] },
      isActive: true,
      ...dateOverlap(now, now),
    },
    select: { id: true },
  });

  if (objectId) {
    try {
      await closePersonalTripsBeforeWork(employeeId, now, null);
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
    data: {
      assignedObjectId: objectId,
      status: objectId && employee.status !== "INACTIVE"
        ? currentAwayDeployment ? "ON_LEAVE" : "ON_SITE"
        : "BENCH_LT",
    },
  });
  revalidatePath("/admin/planuoklis");
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
      return { error: "Konfliktas: darbuotojas šiomis datomis jau dirba kitame objekte." };
    }
    try {
      await closePersonalTripsBeforeWork(employeeId, startDate, endDate);
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

  if (type === "WORK" && objectId) {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { status: "ON_SITE", assignedObjectId: objectId },
    });
  }
  if (type === "VACATION_LT") {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { status: "ON_LEAVE" },
    });
  }
  if (type === "TRANSIT") {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { status: "ON_LEAVE" },
    });
  }

  revalidatePath("/admin/planuoklis");
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
  revalidatePath("/admin/planuoklis");
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
  revalidatePath("/admin/planuoklis");
  return { ok: true as const };
}

export async function closeWorkDeployment(id: string) {
  const deployment = await prisma.deployment.findUnique({ where: { id } });
  if (!deployment || deployment.type !== "WORK") return { error: "Darbo priskyrimas nerastas" };
  if (!deployment.isActive) return { error: "Darbas objekte jau uždarytas" };

  const closedAt = new Date();
  await prisma.deployment.update({
    where: { id },
    data: { isActive: false, closedAt, endDate: closedAt },
  });
  await syncEmployeeStatus(deployment.employeeId);

  revalidatePath("/admin/darbuotojai");
  revalidatePath("/admin/planuoklis");
  return { ok: true as const };
}

export async function updateDeploymentDates(id: string, startValue: string, endValue: string) {
  const startDate = new Date(startValue);
  const endDate = endValue ? new Date(endValue) : null;
  if (Number.isNaN(startDate.getTime()) || (endDate && Number.isNaN(endDate.getTime()))) {
    return { error: "Pasirinkite pradžios datą" };
  }
  if (endDate && endDate < startDate) {
    return { error: "Pabaigos data negali būti ankstesnė už pradžią" };
  }

  const deployment = await prisma.deployment.findUnique({ where: { id } });
  if (!deployment) return { error: "Priskyrimas nerastas" };

  const overlap = await prisma.deployment.findFirst({
    where: {
      id: { not: id },
      employeeId: deployment.employeeId,
      type: deployment.type === "WORK"
        ? "WORK"
        : deployment.type === "VACATION_LT" || deployment.type === "TRANSIT"
          ? { in: ["VACATION_LT", "TRANSIT", "PERSONAL_TRIP"] }
          : "PERSONAL_TRIP",
      isActive: true,
      AND: [
        { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
        dateOverlap(startDate, endDate ?? new Date("9999-12-31")),
      ],
    },
  });

  if (overlap) {
    const typeLabel = overlap.type === "WORK"
      ? "darbas kitame objekte"
      : overlap.type === "PERSONAL_TRIP"
        ? "asmeninė komandiruotė"
        : overlap.type === "TRANSIT"
          ? "tranzitas"
          : "atostogos";
    return {
      error: `Konfliktas: datos persidengia su įrašu „${typeLabel}“ nuo ${overlap.startDate.toISOString().slice(0, 10)}${overlap.endDate ? ` iki ${overlap.endDate.toISOString().slice(0, 10)}` : " (be pabaigos)"}.`,
    };
  }

  if (deployment.type === "WORK") {
    try {
      await closePersonalTripsBeforeWork(deployment.employeeId, startDate, endDate);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Konfliktas su asmenine komandiruote." };
    }
  }
  if (deployment.type === "VACATION_LT") {
    await ensureWorkAfterVacation(deployment.employeeId, deployment.objectId, startDate, endDate);
  }

  await prisma.deployment.update({
    where: { id },
    data: { startDate, endDate },
  });
  await syncEmployeeStatus(deployment.employeeId);
  revalidatePath("/admin/planuoklis");
  revalidatePath("/admin/darbuotojai");
  return { ok: true as const };
}

export async function deleteDeployment(id: string) {
  const deployment = await prisma.deployment.findUnique({ where: { id } });
  if (!deployment) return { error: "Priskyrimas nerastas" };
  await prisma.deployment.delete({ where: { id } });
  await syncEmployeeStatus(deployment.employeeId);
  revalidatePath("/admin/planuoklis");
  revalidatePath("/admin/darbuotojai");
}
