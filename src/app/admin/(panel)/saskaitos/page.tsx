import { getISOWeek, getISOWeekYear } from "date-fns";
import { prisma } from "@/lib/db";
import { BillingManager } from "@/components/admin/billing-manager";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const customers = await prisma.billingCustomer.findMany({
    orderBy: { name: "asc" },
    include: { invoices: { orderBy: { issuedAt: "desc" } } },
  });
  const now = new Date();

  return (
    <BillingManager
      customers={customers.map((customer) => ({
        ...customer,
        invoices: customer.invoices.map((invoice) => ({
          ...invoice,
          issuedAt: invoice.issuedAt.toISOString(),
        })),
      }))}
      currentWeek={getISOWeek(now)}
      currentYear={getISOWeekYear(now)}
      currentDate={now.toISOString()}
    />
  );
}