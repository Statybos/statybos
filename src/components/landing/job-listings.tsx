"use client";

import { useSyncExternalStore } from "react";
import { CalendarDays, Plane, WalletCards } from "lucide-react";
import { openApplyForm } from "@/components/landing/apply-form";
import { countryFlag } from "@/lib/constants";

export type PublicJob = {
  id: string;
  title: string;
  country: string;
  city: string;
  salaryText: string;
  specialty: string;
  description: string;
  requirements: string;
};

function getDepartureLabel() {
  const now = new Date();
  const isSunday = now.getDay() === 0;
  const daysUntilSaturday = isSunday ? 6 : 6 - now.getDay();
  const departure = new Date(now);
  departure.setDate(now.getDate() + daysUntilSaturday);

  const day = String(departure.getDate()).padStart(2, "0");
  const month = String(departure.getMonth() + 1).padStart(2, "0");
  const year = departure.getFullYear();
  const date = `${day}.${month}.${year}`;

  return isSunday
    ? `Išvykimas kitą savaitgalį galimas: ${date}`
    : `Išvykimas šeštadienį ${date}`;
}

export function JobListings({ jobs }: { jobs: PublicJob[] }) {
  const departureLabel = useSyncExternalStore(
    () => () => {},
    getDepartureLabel,
    () => "",
  );

  return (
    <section id="skelbimai" className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber">Darbas</p>
        <h2 className="mt-1 text-3xl font-bold text-navy">Aktualūs darbo skelbimai</h2>
        <p className="mt-2 text-muted">Pasirinkite skelbimą ir kandidatuokite iš karto.</p>
      </div>
      {jobs.length === 0 ? (
        <p className="pastel-card rounded-2xl border border-white/70 p-8 text-center text-muted">
          Šiuo metu aktyvių skelbimų nėra.
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {jobs.map((job) => (
            <article
              key={job.id}
              className="pastel-card flex flex-col rounded-2xl border border-white/70 p-5"
            >
              {job.specialty ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-amber">
                  {job.specialty}
                </p>
              ) : null}
              <h3 className="mt-1 text-xl font-bold text-navy">{job.title}</h3>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-slate-200/80 py-3 text-sm text-muted">
                <span className="inline-flex items-center gap-2">
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {countryFlag(job.country)}
                  </span>
                  <span>
                    <span className="block text-xs text-muted">Šalis</span>
                    <span className="font-semibold text-navy">
                      {job.country}
                      {job.city ? `, ${job.city}` : ""}
                    </span>
                  </span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <WalletCards className="h-5 w-5 text-sky-600" />
                  <span>
                    <span className="block text-xs text-muted">Atlyginimas</span>
                    <span className="font-semibold text-navy">{job.salaryText}</span>
                  </span>
                </span>
                {departureLabel ? (
                  <span className="inline-flex items-center gap-2">
                    <Plane className="h-5 w-5 text-sky-600" />
                    <span>
                      <span className="block text-xs text-muted">Išvykimas</span>
                      <span className="font-semibold text-navy">
                        <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
                        {departureLabel.match(/\d{2}\.\d{2}\.\d{4}/)?.[0] ?? departureLabel}
                      </span>
                    </span>
                  </span>
                ) : null}
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/80">{job.description}</p>
              {job.requirements ? (
                <p className="mt-3 text-sm text-muted">
                  <span className="font-semibold text-navy">Reikalavimai: </span>
                  {job.requirements}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => openApplyForm(job.id)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7298e5] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#5f86d7]"
              >
                Kandidatuoti <span aria-hidden="true">→</span>
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
