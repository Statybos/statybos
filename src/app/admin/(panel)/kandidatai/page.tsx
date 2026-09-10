import { CandidateBoard } from "@/components/admin/candidate-board";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const candidates = await prisma.candidate.findMany({
    where: { status: { not: "HIRED" } },
    orderBy: { createdAt: "desc" },
    include: { job: { select: { title: true, country: true } } },
  });

  const serialized = candidates.map((c) => ({
    ...c,
    jobTitle: c.jobTitle,
    jobCountry: c.jobCountry,
    createdAt: c.createdAt.toISOString(),
    availableFrom: c.availableFrom?.toISOString() ?? null,
  }));

  return <CandidateBoard candidates={serialized} />;
}
