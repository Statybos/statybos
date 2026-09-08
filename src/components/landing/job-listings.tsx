"use client";

import { useSyncExternalStore } from "react";
import { MapPin, Wallet } from "lucide-react";
import { openApplyForm } from "@/components/landing/apply-form";

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
              className="pastel-card flex flex-col rounded-2xl border border-white/70 p-6"
            >
              {job.specialty ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-amber">
                  {job.specialty}
                </p>
              ) : null}
              <h3 className="mt-1 text-xl font-bold text-navy">{job.title}</h3>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {job.country}
                  {job.city ? `, ${job.city}` : ""}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Wallet className="h-4 w-4" />
                  {job.salaryText}
                </span>
              </div>
              {departureLabel ? (
                <p className="mt-3 text-sm font-semibold text-navy">{departureLabel}</p>
              ) : null}
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
                className="mt-5 inline-flex w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-2"
              >
                Kandidatuoti
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
