"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function updateSiteSettings(formData: FormData) {
  const contactPhone = String(formData.get("contactPhone") ?? "").trim();
  if (!contactPhone) return { error: "Įrašykite telefono numerį" };

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: { contactPhone },
    create: { id: 1, contactPhone },
  });
  revalidatePath("/");
  revalidatePath("/admin/nustatymai");
  return { ok: true as const };
}