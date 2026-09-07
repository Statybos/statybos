"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteJob, toggleJobActive, upsertJob } from "@/app/actions/jobs";
import { SPECIALTIES } from "@/lib/constants";

type Job = {
  id: string;
  title: string;
  country: string;
  city: string;
  salaryText: string;
  description: string;
  requirements: string;
  specialty: string;
  isActive: boolean;
};

const empty: Job = {
  id: "",
  title: "",
  country: "",
  city: "",
  salaryText: "",
  description: "",
  requirements: "",
  specialty: SPECIALTIES[0] as string,
  isActive: true,
};

export function JobManager({ jobs }: { jobs: Job[] }) {
  const [form, setForm] = useState<Job | null>(null);
  const [pending, start] = useTransition();

  function patch<K extends keyof Job>(key: K, value: Job[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Darbo skelbimai</h1>
        <button
          className="rounded-lg bg-amber px-3 py-2 text-sm font-semibold text-navy"
          onClick={() => setForm({ ...empty })}
        >
          Naujas skelbimas
        </button>
      </div>
      <div className="grid gap-3">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-semibold">{job.title}</p>
              <p className="text-sm text-muted">
                {job.country}
                {job.city ? `, ${job.city}` : ""} · {job.salaryText} ·{" "}
                {job.isActive ? "Aktyvus" : "Juodraštis"}
              </p>
            </div>
            <div className="flex gap-2 text-sm">
              <button
                className="rounded-lg border px-3 py-1"
                onClick={() => start(() => toggleJobActive(job.id, !job.isActive))}
              >
                {job.isActive ? "Į juodraštį" : "Skelbti"}
              </button>
              <button className="rounded-lg border px-3 py-1" onClick={() => setForm({ ...job })}>
                Redaguoti
              </button>
              <button
                className="rounded-lg border px-3 py-1 text-red-600"
                onClick={() => start(() => deleteJob(job.id))}
              >
                Trinti
              </button>
            </div>
          </div>
        ))}
      </div>

      {form ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            className="w-full max-w-xl space-y-3 rounded-2xl bg-white p-6"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData();
              fd.set("id", form.id);
              fd.set("title", form.title);
              fd.set("country", form.country);
              fd.set("city", form.city);
              fd.set("salaryText", form.salaryText);
              fd.set("specialty", form.specialty);
              fd.set("requirements", form.requirements);
              fd.set("description", form.description);
              if (form.isActive) fd.set("isActive", "on");
              start(async () => {
                const result = await upsertJob(fd);
                if (result?.error) {
                  toast.error(result.error);
                  // forma lieka su įvestais duomenimis
                  return;
                }
                toast.success("Skelbimas išsaugotas");
                setForm(null);
              });
            }}
          >
            <h2 className="text-lg font-bold">{form.id ? "Redaguoti skelbimą" : "Naujas skelbimas"}</h2>
            <input
              value={form.title}
              onChange={(e) => patch("title", e.target.value)}
              placeholder="Pavadinimas *"
              className="w-full rounded-lg border px-3 py-2"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={form.country}
                onChange={(e) => patch("country", e.target.value)}
                placeholder="Šalis * (pvz. Danija)"
                className="rounded-lg border px-3 py-2"
              />
              <input
                value={form.city}
                onChange={(e) => patch("city", e.target.value)}
                placeholder="Miestas"
                className="rounded-lg border px-3 py-2"
              />
              <input
                value={form.salaryText}
                onChange={(e) => patch("salaryText", e.target.value)}
                placeholder="Atlyginimas *"
                className="rounded-lg border px-3 py-2"
              />
              <select
                value={form.specialty}
                onChange={(e) => patch("specialty", e.target.value)}
                className="rounded-lg border px-3 py-2"
              >
                {SPECIALTIES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <textarea
              value={form.requirements}
              onChange={(e) => patch("requirements", e.target.value)}
              placeholder="Reikalavimai"
              className="w-full rounded-lg border px-3 py-2"
              rows={2}
            />
            <textarea
              value={form.description}
              onChange={(e) => patch("description", e.target.value)}
              placeholder="Aprašymas *"
              className="w-full rounded-lg border px-3 py-2"
              rows={4}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => patch("isActive", e.target.checked)}
              />
              Aktyvus (rodomas svetainėje)
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Atšaukti
              </button>
              <button disabled={pending} className="rounded-lg bg-navy px-3 py-2 text-sm text-white">
                Išsaugoti
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
