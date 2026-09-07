import { DeploymentPlanner } from "@/components/admin/deployment-planner";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  const [objects, employees, deployments] = await Promise.all([
    prisma.projectObject.findMany({ orderBy: [{ country: "asc" }, { title: "asc" }] }),
    prisma.employee.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialty: true,
        status: true,
        phone: true,
        assignedObjectId: true,
      },
    }),
    prisma.deployment.findMany({
      orderBy: { startDate: "asc" },
      include: {
        employee: { select: { firstName: true, lastName: true, specialty: true } },
        object: { select: { title: true, country: true } },
      },
    }),
  ]);

  return (
    <DeploymentPlanner
      objects={objects}
      employees={employees}
      deployments={deployments.map((d) => ({
        ...d,
        startDate: d.startDate.toISOString(),
        endDate: d.endDate.toISOString(),
      }))}
    />
  );
}
