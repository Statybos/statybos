"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createBillingCustomer(formData: FormData) {
  const name = text(formData.get("name"));
  const billingInterval = text(formData.get("billingInterval")) || "BIWEEKLY";
  const billingDay = Math.min(31, Math.max(1, Number(formData.get("billingDay") ?? 1)));
  const anchorWeek = Math.min(53, Math.max(1, Number(formData.get("anchorWeek") ?? 1)));

  if (!name) return { error: "Įrašykite užsakovo pavadinimą" };
  if (!Number.isFinite(billingDay) || !Number.isFinite(anchorWeek)) {
    return { error: "Įrašykite teisingą periodiškumą" };
  }

  try {
    await prisma.billingCustomer.create({
      data: { name, billingInterval, billingDay, anchorWeek },
    });
  } catch {
    return { error: "Toks užsakovas jau įrašytas" };
  }
  revalidatePath("/admin/saskaitos");
  return { ok: true as const };
}

export async function deleteBillingCustomer(id: string) {
  await prisma.billingCustomer.delete({ where: { id } });
  revalidatePath("/admin/saskaitos");
}

export async function markInvoiceIssued(formData: FormData) {
  const customerId = text(formData.get("customerId"));
  const year = Number(formData.get("year"));
  const fromWeek = Number(formData.get("fromWeek"));
  const toWeek = Number(formData.get("toWeek"));

  if (!customerId || !Number.isInteger(year) || !Number.isInteger(fromWeek) || !Number.isInteger(toWeek)) {
    return { error: "Pasirinkite užsakovą ir savaites" };
  }
  if (fromWeek < 1 || toWeek > 53 || fromWeek > toWeek) {
    return { error: "Neteisingas savaičių intervalas" };
  }

  await prisma.billingInvoice.upsert({
    where: { customerId_year_fromWeek_toWeek: { customerId, year, fromWeek, toWeek } },
    update: { issuedAt: new Date() },
    create: { customerId, year, fromWeek, toWeek },
  });
  revalidatePath("/admin/saskaitos");
  return { ok: true as const };
}