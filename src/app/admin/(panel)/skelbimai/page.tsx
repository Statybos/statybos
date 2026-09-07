import { JobManager } from "@/components/admin/job-manager";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await prisma.jobPosting.findMany({ orderBy: { createdAt: "desc" } });
  return <JobManager jobs={jobs} />;
}
