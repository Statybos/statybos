"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { lt } from "date-fns/locale";
import {
  addCandidateNote,
  deleteCandidate,
  hireCandidate,
  updateCandidateStatus,
} from "@/app/actions/candidates";
import { toast } from "sonner";
import { CANDIDATE_STATUSES, candidateStatusLabel } from "@/lib/constants";
import { parseJsonArray, parseNotes } from "@/lib/utils";

type CandidateRow = {
  id: string;
  fullName: string;
  phone: string;
  cityLt: string;
  specialty: string;
  languages: string;
  driverLicense: string;
  status: string;
  comment: string | null;
  cvUrl: string | null;
  notes: string;
  createdAt: string;
  availableFrom: string | null;
  jobTitle: string | null;
  job: { title: string } | null;
};

export function CandidateBoard({ candidates }: { candidates: CandidateRow[] }) {
  const [tab, setTab] = useState("NEW");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of CANDIDATE_STATUSES) map[s.key] = 0;
    for (const c of candidates) map[c.status] = (map[c.status] ?? 0) + 1;
    return map;
  }, [candidates]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return candidates.filter((c) => {
      if (c.status !== tab) return false;
      if (!query) return true;
      return (
        c.fullName.toLowerCase().includes(query) ||
        c.phone.replace(/\s/g, "").includes(query.replace(/\s/g, ""))
      );
    });
  }, [candidates, tab, q]);

  const selected = candidates.find((c) => c.id === openId) ?? null;

  function jobDisplay(candidate: CandidateRow) {
    const title = candidate.job?.title ?? candidate.jobTitle;
    if (!title) return null;
    return {
      title,
      deleted: !candidate.job,
    };
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Kandidatai</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Paieška pagal vardą arba telefoną"
          className="w-full max-w-sm rounded-lg border bg-white px-3 py-2 text-sm md:w-80"
        />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {CANDIDATE_STATUSES.map((s) => (
          <button
            key={s.key}
            onClick={() => setTab(s.key)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              tab === s.key ? "bg-navy text-white" : "bg-white text-ink"
            }`}
          >
            {s.label} ({counts[s.key] ?? 0})
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-navy text-white">
            <tr>
              {[
                "Data",
                "Vardas Pavardė",
                "Tel. Nr.",
                "Miestas",
                "Skelbimas",
                "Kalbos",
                "Vair. paž.",
                "Statusas",
                "Veiksmai",
              ].map(
                (h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t hover:bg-sand/60">
                <td className="whitespace-nowrap px-3 py-2">
                  {format(new Date(c.createdAt), "yyyy-MM-dd", { locale: lt })}
                </td>
                <td className="px-3 py-2 font-medium">{c.fullName}</td>
                  <td className="px-3 py-2">{c.phone}</td>
                <td className="px-3 py-2">{c.cityLt}</td>
                <td className="px-3 py-2">
                  {jobDisplay(c) ? (
                    <span>
                      {jobDisplay(c)?.title}
                      {jobDisplay(c)?.deleted ? (
                        <span className="block text-xs text-muted">Nebėra skelbimo</span>
                      ) : null}
                    </span>
                  ) : (
                    "Bendras kandidatas"
                  )}
                </td>
                <td className="px-3 py-2">{parseJsonArray(c.languages).join(", ")}</td>
                <td className="px-3 py-2">{c.driverLicense}</td>
                <td className="px-3 py-2">{candidateStatusLabel(c.status)}</td>
                <td className="px-3 py-2">
                  <button className="text-navy underline" onClick={() => setOpenId(c.id)}>
                    Atidaryti
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-muted">
                  Kandidatų nėra
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{selected.fullName}</h2>
                {jobDisplay(selected) ? (
                  <>
                    <p className="text-sm text-muted">{jobDisplay(selected)?.title}</p>
                    {jobDisplay(selected)?.deleted ? (
                      <p className="text-xs text-muted">Nebėra skelbimo</p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted">Bendras kandidatas</p>
                )}
              </div>
              <button onClick={() => setOpenId(null)} className="text-sm text-muted">
                Uždaryti
              </button>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Telefonas</dt>
                <dd>{selected.phone}</dd>
              </div>
              <div>
                <dt className="text-muted">Miestas</dt>
                <dd>{selected.cityLt}</dd>
              </div>
              <div>
                <dt className="text-muted">Kalbos</dt>
                <dd>{parseJsonArray(selected.languages).join(", ") || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Vairuotojo paž.</dt>
                <dd>{selected.driverLicense}</dd>
              </div>
              <div>
                <dt className="text-muted">Gali pradėti</dt>
                <dd>
                  {selected.availableFrom
                    ? format(new Date(selected.availableFrom), "yyyy-MM-dd")
                    : "Nenurodyta"}
                </dd>
              </div>
            </dl>
            {selected.comment ? <p className="mt-3 text-sm">{selected.comment}</p> : null}
            {selected.cvUrl ? (
              <a href={selected.cvUrl} className="mt-3 inline-block text-sm text-navy underline" target="_blank">
                Atsisiųsti CV
              </a>
            ) : (
              <p className="mt-3 text-sm text-muted">CV neįkeltas</p>
            )}

            <div className="mt-5 space-y-3">
              <label className="grid gap-1 text-sm font-medium">
                Statusas
                <select
                  disabled={pending}
                  defaultValue={selected.status}
                  className="rounded-lg border px-3 py-2"
                  onChange={(e) =>
                    start(async () => {
                      await updateCandidateStatus(selected.id, e.target.value);
                    })
                  }
                >
                  {CANDIDATE_STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={pending}
                className="w-full rounded-lg bg-amber px-3 py-2.5 text-sm font-semibold text-navy"
                onClick={() =>
                  start(async () => {
                    const result = await hireCandidate(selected.id);
                    if (result?.error) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success("Darbuotojas sukurtas. Kandidatas pašalintas iš sąrašo.");
                    setOpenId(null);
                  })
                }
              >
                Įdarbinti ir sukurti darbuotoją
              </button>
            </div>

            <form
              className="mt-5"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const text = String(new FormData(form).get("note") ?? "");
                if (!text.trim()) return;
                start(async () => {
                  await addCandidateNote(selected.id, text);
                  form.reset();
                });
              }}
            >
              <label className="grid gap-1 text-sm font-medium">
                Vidinė pastaba
                <textarea name="note" rows={3} className="rounded-lg border px-3 py-2" />
              </label>
              <button className="mt-2 rounded-lg bg-navy px-3 py-2 text-sm text-white">Įrašyti</button>
            </form>

            <ul className="mt-4 space-y-2 text-sm">
              {parseNotes(selected.notes).map((n, i) => (
                <li key={i} className="rounded-lg bg-sand p-2">
                  <span className="text-xs text-muted">
                    {format(new Date(n.at), "yyyy-MM-dd HH:mm")}
                  </span>
                  <p>{n.text}</p>
                </li>
              ))}
            </ul>

            <button
              className="mt-6 text-sm text-red-600 underline"
              onClick={() =>
                start(async () => {
                  await deleteCandidate(selected.id);
                  setOpenId(null);
                })
              }
            >
              Ištrinti kandidatą
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
