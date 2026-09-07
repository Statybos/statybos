"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen bg-[#eef1f5] text-ink">
      <AdminSidebar pathname={pathname} />
      <div className="min-w-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
