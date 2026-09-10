"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function upsertJob(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const data = {
    title: String(formData.get("title") ?? "").trim(),
    country: String(formData.get("country") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    salaryText: String(formData.get("salaryText") ?? "").trim(),
    specialty: String(formData.get("specialty") ?? "").trim(),
    requirements: String(formData.get("requirements") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  };

  if (!data.title || !data.country || !data.salaryText || !data.description) {
    return { error: "Užpildykite pavadinimą, šalį, atlyginimą ir aprašymą" };
  }

  if (id) {
    await prisma.jobPosting.update({ where: { id }, data });
  } else {
    await prisma.jobPosting.create({ data });
  }

  revalidatePath("/");
  revalidatePath("/admin/skelbimai");
  return { ok: true as const };
}

export async function deleteJob(id: string) {
  const job = await prisma.jobPosting.findUnique({
    where: { id },
    select: { title: true },
  });
  if (!job) throw new Error("Skelbimas nerastas");

  await prisma.$transaction([
    prisma.candidate.updateMany({
      where: { jobId: id },
      data: { jobTitle: job.title, jobId: null },
    }),
    prisma.jobPosting.delete({ where: { id } }),
  ]);
  revalidatePath("/");
  revalidatePath("/admin/skelbimai");
  revalidatePath("/admin/kandidatai");
}

export async function toggleJobActive(id: string, isActive: boolean) {
  await prisma.jobPosting.update({ where: { id }, data: { isActive } });
  revalidatePath("/");
  revalidatePath("/admin/skelbimai");
}
