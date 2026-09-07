import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-navy/10 bg-peach/40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm">
        <p className="font-medium text-navy">Statybos Personalas</p>
        <Link href="/privatumo-politika" className="text-muted underline hover:text-navy">
          Privatumo politika
        </Link>
      </div>
    </footer>
  );
}
