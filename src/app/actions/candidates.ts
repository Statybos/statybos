"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseNotes, splitName } from "@/lib/utils";

export async function updateCandidateStatus(id: string, status: string) {
  await prisma.candidate.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/admin/kandidatai");
}

export async function hireCandidate(id: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) return { error: "Kandidatas nerastas" };

  const existing = await prisma.employee.findUnique({
    where: { candidateId: id },
  });
  if (existing) {
    await prisma.candidate.delete({ where: { id } });
    revalidatePath("/admin/kandidatai");
    revalidatePath("/admin/darbuotojai");
    return { ok: true as const };
  }

  const { firstName, lastName } = splitName(candidate.fullName);
  await prisma.employee.create({
    data: {
      firstName,
      lastName,
      phone: candidate.phone,
      specialty: candidate.specialty || "Nenurodyta",
      status: "BENCH_LT",
    },
  });
  await prisma.candidate.delete({ where: { id } });

  revalidatePath("/admin/kandidatai");
  revalidatePath("/admin/darbuotojai");
  return { ok: true as const };
}

export async function addCandidateNote(id: string, text: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) return;
  const notes = parseNotes(candidate.notes);
  notes.unshift({ at: new Date().toISOString(), text: text.trim() });
  await prisma.candidate.update({
    where: { id },
    data: { notes: JSON.stringify(notes) },
  });
  revalidatePath("/admin/kandidatai");
}

export async function deleteCandidate(id: string) {
  await prisma.candidate.delete({ where: { id } });
  revalidatePath("/admin/kandidatai");
}
