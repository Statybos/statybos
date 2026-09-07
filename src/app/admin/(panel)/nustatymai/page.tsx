import { prisma } from "@/lib/db";
import { DEFAULT_CONTACT_PHONE } from "@/lib/constants";
import { SettingsManager } from "@/components/admin/settings-manager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  return <SettingsManager contactPhone={settings?.contactPhone ?? DEFAULT_CONTACT_PHONE} />;
}