import { prisma } from "@/lib/db";
import { ApplyFormModal } from "@/components/landing/apply-form";
import { Benefits } from "@/components/landing/benefits";
import { FaqAndReviews } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { JobListings } from "@/components/landing/job-listings";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jobs = await prisma.jobPosting.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <JobListings jobs={jobs} />
        <Benefits />
        <FaqAndReviews />
      </main>
      <SiteFooter />
      <ApplyFormModal />
    </>
  );
}
