import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import {
  Briefcase,
  CalendarRange,
  FileText,
  HardHat,
  LayoutList,
  Settings,
  Users,
} from "lucide-react";

const links = [
  { href: "/admin/darbuotojai", label: "Darbuotojai", icon: Users },
  { href: "/admin/planuoklis", label: "Planuoklis", icon: CalendarRange },
  { href: "/admin/kandidatai", label: "Kandidatai", icon: LayoutList },
  { href: "/admin/skelbimai", label: "Skelbimai", icon: Briefcase },
  { href: "/admin/saskaitos", label: "Sąskaitų priminimai", icon: FileText },
  { href: "/admin/nustatymai", label: "Nustatymai", icon: Settings },
];

export function AdminSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-navy text-white">
      <Link href="/" className="flex items-center gap-2 border-b border-white/10 px-5 py-4 font-semibold">
        <HardHat className="h-5 w-5 text-amber" />
        SP Admin
      </Link>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10"
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <form action={logoutAction} className="border-t border-white/10 p-3">
        <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10">
          Atsijungti
        </button>
      </form>
    </aside>
  );
}
