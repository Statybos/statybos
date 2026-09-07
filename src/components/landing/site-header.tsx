"use client";

import Link from "next/link";
import { HardHat } from "lucide-react";
import { openApplyForm } from "@/components/landing/apply-form";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-white/80 text-navy backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint text-navy">
            <HardHat className="h-5 w-5" />
          </span>
          Statybos Personalas
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <a href="#skelbimai" className="hover:text-navy">
            Skelbimai
          </a>
          <a href="#privalumai" className="hover:text-navy">
            Privalumai
          </a>
          <button type="button" onClick={() => openApplyForm()} className="hover:text-navy">
            Kandidatuoti
          </button>
          <a href="#duk" className="hover:text-navy">
            D.U.K.
          </a>
          <Link
            href="/admin/login"
            className="rounded-full border border-navy/15 px-3 py-1 hover:bg-mint/60"
          >
            Administracija
          </Link>
        </nav>
        <button
          type="button"
          onClick={() => openApplyForm()}
          className="rounded-full bg-amber px-4 py-2 text-sm font-semibold text-navy md:hidden"
        >
          Kandidatuoti
        </button>
      </div>
    </header>
  );
}
