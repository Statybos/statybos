"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { applicationSchema } from "@/lib/validations";
import { formatPhone } from "@/lib/utils";

export async function submitApplication(formData: FormData) {
  const parsed = applicationSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    cityLt: formData.get("cityLt"),
    driverLicense: formData.get("driverLicense"),
    english: formData.get("english"),
    availableFrom: formData.get("availableFrom") || undefined,
    comment: formData.get("comment") || undefined,
    jobId: formData.get("jobId") || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Patikrinkite formą";
    return { ok: false as const, error: first };
  }

  const data = parsed.data;
  const phone = formatPhone(data.phone.replace(/\s/g, ""));

  let specialty = "Nenurodyta";
  let jobTitle: string | null = null;
  let jobCountry: string | null = null;
  if (data.jobId) {
    const job = await prisma.jobPosting.findUnique({
      where: { id: data.jobId },
      select: { specialty: true, title: true, country: true },
    });
    jobTitle = job?.title ?? null;
    jobCountry = job?.country ?? null;
    if (job?.specialty) specialty = job.specialty;
    else if (job?.title) specialty = job.title;
  }

  await prisma.candidate.create({
    data: {
      fullName: data.fullName,
      phone,
      cityLt: data.cityLt,
      specialty,
      jobTitle,
      jobCountry,
      driverLicense: data.driverLicense,
      languages: JSON.stringify([`Anglų: ${data.english}`]),
      availableFrom: data.availableFrom ? new Date(data.availableFrom) : null,
      comment: data.comment || null,
      jobId: data.jobId || null,
      status: "NEW",
    },
  });

  revalidatePath("/admin/kandidatai");
  return { ok: true as const };
}
