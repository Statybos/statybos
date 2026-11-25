"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export type WageChange = { rate: number; changedAt: string };

function dateOrNull(value: FormDataEntryValue | null) {
  const raw = String(value ?? "");
  return raw ? new Date(raw) : null;
}

function parseWageHistory(raw: string | null | undefined): WageChange[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function upsertEmployee(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const hourlyRateRaw = String(formData.get("hourlyRate") ?? "").replace(",", ".");
  const hourlyRate = Number(hourlyRateRaw);
  const status = String(formData.get("status") ?? "BENCH_LT");
  const dismissedAt = dateOrNull(formData.get("dismissedAt"));

  const data = {
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    personalCode: String(formData.get("personalCode") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    addressLt: String(formData.get("addressLt") ?? "").trim(),
    specialty: String(formData.get("specialty") ?? "").trim(),
    status,
    assignedObjectId:
      status === "INACTIVE" ? null : String(formData.get("assignedObjectId") ?? "") || null,
    hourlyRate: Number.isFinite(hourlyRate) ? hourlyRate : 0,
    dismissedAt: status === "INACTIVE" ? dismissedAt : null,
  };

  if (!data.firstName || !data.lastName || !data.phone || !data.specialty) {
    return { error: "Užpildykite vardą, pavardę, telefoną ir specialybę" };
  }

  if (id) {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) return { error: "Darbuotojas nerastas" };

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);
    const currentWorkDeployment = await prisma.deployment.findFirst({
      where: {
        employeeId: id,
        type: "WORK",
        isActive: true,
        startDate: { lte: todayEnd },
        OR: [{ endDate: null }, { endDate: { gte: todayStart } }],
      },
      orderBy: { startDate: "desc" },
    });

    if (existing.assignedObjectId !== data.assignedObjectId) {
      const currentAwayDeployment = await prisma.deployment.findFirst({
        where: {
          employeeId: id,
          type: { in: ["VACATION_LT", "TRANSIT"] },
          isActive: true,
          startDate: { lte: todayEnd },
          OR: [{ endDate: null }, { endDate: { gte: todayStart } }],
        },
        select: { id: true },
      });
      if (currentAwayDeployment) {
        return { error: "Atostogaujančio darbuotojo perkelti į kitą objektą negalima" };
      }
    }

    if (data.assignedObjectId && status !== "INACTIVE") {
      if (currentWorkDeployment?.objectId !== data.assignedObjectId) {
        if (currentWorkDeployment) {
          await prisma.deployment.update({
            where: { id: currentWorkDeployment.id },
            data: { endDate: now, isActive: false, closedAt: now },
          });
        }

        await prisma.deployment.create({
          data: {
            employeeId: id,
            objectId: data.assignedObjectId,
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

    let wageHistory = parseWageHistory(existing.wageHistory);
    if (Math.abs((existing.hourlyRate ?? 0) - data.hourlyRate) > 0.0001) {
      wageHistory = [
        { rate: data.hourlyRate, changedAt: new Date().toISOString() },
        ...wageHistory,
      ].slice(0, 30);
    }

    await prisma.employee.update({
      where: { id },
      data: { ...data, wageHistory: JSON.stringify(wageHistory) },
    });
  } else {
    const wageHistory =
      data.hourlyRate > 0
        ? JSON.stringify([{ rate: data.hourlyRate, changedAt: new Date().toISOString() }])
        : "[]";
    const createdEmployee = await prisma.employee.create({
      data: { ...data, wageHistory },
    });
    if (data.assignedObjectId) {
      const startDate = new Date();
      await prisma.deployment.create({
        data: {
          employeeId: createdEmployee.id,
          objectId: data.assignedObjectId,
          startDate,
          type: "WORK",
          isActive: true,
          notes: "Priskyrimas objektui",
        },
      });
    }
  }

  revalidatePath("/admin/darbuotojai");
  return { ok: true as const };
}

export async function dismissEmployee(employeeId: string, dismissedAt: string) {
  const date = new Date(dismissedAt);
  if (Number.isNaN(date.getTime())) {
    return { error: "Pasirinkite atleidimo datą" };
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: "Darbuotojas nerastas" };

  await prisma.$transaction([
    prisma.deployment.updateMany({
      where: { employeeId, isActive: true, startDate: { lte: date } },
      data: { endDate: date, isActive: false, closedAt: date },
    }),
    prisma.deployment.deleteMany({
      where: { employeeId, isActive: true, startDate: { gt: date } },
    }),
    prisma.employee.update({
      where: { id: employeeId },
      data: {
        status: "INACTIVE",
        dismissedAt: date,
        assignedObjectId: null,
      },
    }),
  ]);

  revalidatePath("/admin/darbuotojai");
  return { ok: true as const };
}

export async function reinstateEmployee(employeeId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: "Darbuotojas nerastas" };
  if (employee.status !== "INACTIVE") return { error: "Darbuotojas jau dirba" };

  await prisma.employee.update({
    where: { id: employeeId },
    data: { status: "BENCH_LT", dismissedAt: null, assignedObjectId: null },
  });

  revalidatePath("/admin/darbuotojai");
  return { ok: true as const };
}

export async function updateEmployeeWage(employeeId: string, hourlyRate: number) {
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return { error: "Įveskite teisingą valandinį" };
  }
  const existing = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!existing) return { error: "Darbuotojas nerastas" };

  if (Math.abs((existing.hourlyRate ?? 0) - hourlyRate) < 0.0001) {
    return { ok: true as const };
  }

  const wageHistory = [
    { rate: hourlyRate, changedAt: new Date().toISOString() },
    ...parseWageHistory(existing.wageHistory),
  ].slice(0, 30);

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      hourlyRate,
      wageHistory: JSON.stringify(wageHistory),
    },
  });

  revalidatePath("/admin/darbuotojai");
  return { ok: true as const };
}

export async function deleteEmployee(id: string) {
  await prisma.employee.delete({ where: { id } });
  revalidatePath("/admin/darbuotojai");
}
