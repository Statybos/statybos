"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

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

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      assignedObjectId: objectId,
      status: objectId && employee.status !== "INACTIVE" ? "ON_SITE" : "BENCH_LT",
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
  const endDate = new Date(String(formData.get("endDate") ?? ""));
  const notes = String(formData.get("notes") ?? "");

  if (!employeeId || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { error: "Pasirinkite darbuotoją ir datas" };
  }
  if (endDate < startDate) {
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
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlapWork) {
      return {
        error: "Konfliktas: darbuotojas jau priskirtas kitam / tam pačiam objektui šiomis datomis.",
      };
    }
  } else {
    const overlapSame = await prisma.deployment.findFirst({
      where: {
        employeeId,
        type: { in: ["VACATION_LT", "TRANSIT"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlapSame) {
      return { error: "Konfliktas: jau yra atostogos arba tranzitas šiomis datomis." };
    }
  }

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

export async function deleteDeployment(id: string) {
  await prisma.deployment.delete({ where: { id } });
  revalidatePath("/admin/planuoklis");
  revalidatePath("/admin/darbuotojai");
}
