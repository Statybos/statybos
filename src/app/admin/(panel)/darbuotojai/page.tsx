import { EmployeeManager } from "@/components/admin/employee-manager";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const [employees, objects] = await Promise.all([
    prisma.employee.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: { assignedObject: { select: { title: true, country: true } } },
    }),
    prisma.projectObject.findMany({ orderBy: { country: "asc" } }),
  ]);

  return (
    <EmployeeManager
      employees={employees.map((e) => ({
        ...e,
        dismissedAt: e.dismissedAt?.toISOString() ?? null,
      }))}
      objects={objects}
    />
  );
}
