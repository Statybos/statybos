"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Euro, MapPin, Phone, Pencil, UserX } from "lucide-react";
import {
  deleteEmployee,
  dismissEmployee,
  updateEmployeeWage,
  upsertEmployee,
} from "@/app/actions/employees";
import { SPECIALTIES } from "@/lib/constants";

type ObjectOpt = { id: string; title: string; country: string };

type WageChange = { rate: number; changedAt: string };

type EmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  personalCode: string;
  phone: string;
  email: string;
  addressLt: string;
  specialty: string;
  hourlyRate: number;
  wageHistory: string;
  status: string;
  dismissedAt: string | null;
  assignedObjectId: string | null;
  assignedObject: { title: string; country: string } | null;
};

type ViewFilter = "ALL" | "ON_LEAVE" | "INACTIVE" | "ACTIVE";

const empty = {
  id: "",
  firstName: "",
  lastName: "",
  personalCode: "",
  phone: "",
  email: "",
  addressLt: "",
  specialty: SPECIALTIES[0] as string,
  hourlyRate: "",
  status: "BENCH_LT",
  assignedObjectId: "",
  dismissedAt: "",
};

function isoDate(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function parseHistory(raw: string): WageChange[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function EmployeeManager({
  employees,
  objects,
}: {
  employees: EmployeeRow[];
  objects: ObjectOpt[];
}) {
  const [q, setQ] = useState("");
  const [view, setView] = useState<ViewFilter>("ACTIVE");
  const [objectId, setObjectId] = useState("");
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [wageEditId, setWageEditId] = useState<string | null>(null);
  const [wageDraft, setWageDraft] = useState("");
  const [dismissId, setDismissId] = useState<string | null>(null);
  const [dismissDate, setDismissDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [pending, start] = useTransition();

  const counts = useMemo(() => {
    return {
      ALL: employees.length,
      ACTIVE: employees.filter((e) => e.status !== "INACTIVE").length,
      ON_LEAVE: employees.filter((e) => e.status === "ON_LEAVE").length,
      INACTIVE: employees.filter((e) => e.status === "INACTIVE").length,
    };
  }, [employees]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return employees.filter((e) => {
      if (view === "ACTIVE" && e.status === "INACTIVE") return false;
      if (view === "ON_LEAVE" && e.status !== "ON_LEAVE") return false;
      if (view === "INACTIVE" && e.status !== "INACTIVE") return false;
      if (objectId && e.assignedObjectId !== objectId) return false;
      if (!query) return true;
      return `${e.firstName} ${e.lastName} ${e.phone} ${e.personalCode} ${e.specialty} ${e.assignedObject?.title ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [employees, q, view, objectId]);

  function edit(e: EmployeeRow) {
    setForm({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      personalCode: e.personalCode,
      phone: e.phone,
      email: e.email,
      addressLt: e.addressLt,
      specialty: e.specialty,
      hourlyRate: e.hourlyRate ? String(e.hourlyRate) : "",
      status: e.status,
      assignedObjectId: e.assignedObjectId ?? "",
      dismissedAt: isoDate(e.dismissedAt),
    });
    setOpen(true);
  }

  function saveWage(id: string) {
    const rate = Number(wageDraft.replace(",", "."));
    start(async () => {
      const result = await updateEmployeeWage(id, rate);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Valandinis atnaujintas");
      setWageEditId(null);
    });
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Darbuotojai</h1>
          <p className="text-sm text-muted">Rodoma: {rows.length}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Paieška"
            className="rounded-lg border bg-white px-3 py-2 text-sm"
          />
          <button
            className="rounded-lg bg-amber px-3 py-2 text-sm font-semibold text-navy"
            onClick={() => {
              setForm(empty);
              setOpen(true);
            }}
          >
            Naujas darbuotojas
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["ACTIVE", `Aktyvūs (${counts.ACTIVE})`],
            ["ALL", `Visi (${counts.ALL})`],
            ["ON_LEAVE", `Atostogose (${counts.ON_LEAVE})`],
            ["INACTIVE", `Atleisti (${counts.INACTIVE})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              view === key ? "bg-navy text-white" : "bg-white text-ink"
            }`}
          >
            {label}
          </button>
        ))}
        <select
          value={objectId}
          onChange={(e) => setObjectId(e.target.value)}
          className="rounded-full border bg-white px-3 py-1.5 text-sm"
        >
          <option value="">Visi objektai</option>
          {objects.map((o) => (
            <option key={o.id} value={o.id}>
              {o.country} – {o.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((e) => {
          const history = parseHistory(e.wageHistory);
          const lastChange = history[0];
          const editingWage = wageEditId === e.id;
          return (
            <article
              key={e.id}
              className="flex flex-col rounded-2xl border border-navy/10 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold text-navy">
                    {e.firstName} {e.lastName}
                  </h2>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-muted">
                <p className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {e.phone}
                </p>
                <p className="inline-flex items-start gap-1.5 font-medium text-navy">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    {e.assignedObject
                      ? `${e.assignedObject.country} – ${e.assignedObject.title}`
                      : "Objektas nepriskirtas"}
                  </span>
                </p>
                {e.status === "INACTIVE" && e.dismissedAt ? (
                  <p className="text-xs text-slate-600">
                    Atleistas: {format(new Date(e.dismissedAt), "yyyy-MM-dd")}
                  </p>
                ) : null}
              </div>

              <div className="mt-3 rounded-xl bg-sand/80 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    <Euro className="h-3.5 w-3.5" />
                    Valandinis
                  </p>
                  {e.status !== "INACTIVE" && !editingWage ? (
                    <button
                      type="button"
                      className="text-xs text-navy underline"
                      onClick={() => {
                        setWageEditId(e.id);
                        setWageDraft(e.hourlyRate ? String(e.hourlyRate) : "");
                      }}
                    >
                      Keisti
                    </button>
                  ) : null}
                </div>
                {editingWage ? (
                  <div className="flex gap-2">
                    <input
                      value={wageDraft}
                      onChange={(ev) => setWageDraft(ev.target.value)}
                      inputMode="decimal"
                      placeholder="pvz. 18.5"
                      className="w-full rounded-lg border px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => saveWage(e.id)}
                      className="rounded-lg bg-navy px-2 py-1 text-xs text-white"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <p className="text-lg font-bold text-navy">
                    {e.hourlyRate > 0 ? `${e.hourlyRate.toFixed(2)} €/val.` : "Nenustatyta"}
                  </p>
                )}
                {lastChange ? (
                  <p className="mt-1 text-[11px] text-muted">
                    Paskutinis keitimas:{" "}
                    {format(new Date(lastChange.changedAt), "yyyy-MM-dd HH:mm")} ·{" "}
                    {lastChange.rate.toFixed(2)} €
                  </p>
                ) : null}
              </div>

              <div className="mt-auto flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => edit(e)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-sm"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Redaguoti
                </button>
                {e.status !== "INACTIVE" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDismissId(e.id);
                      setDismissDate(format(new Date(), "yyyy-MM-dd"));
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-sm text-red-700"
                  >
                    <UserX className="h-3.5 w-3.5" />
                    Atleisti
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted">Pagal filtrą darbuotojų nėra.</p>
      ) : null}

      {dismissId ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-navy">Atleisti darbuotoją</h3>
            <p className="mt-1 text-sm text-muted">Pasirinkite atleidimo datą. Įrašas bus saugomas.</p>
            <label className="mt-4 grid gap-1 text-sm">
              Atleidimo data
              <input
                type="date"
                value={dismissDate}
                onChange={(e) => setDismissDate(e.target.value)}
                className="rounded-lg border px-3 py-2"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border px-3 py-2 text-sm"
                onClick={() => setDismissId(null)}
              >
                Atšaukti
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white"
                onClick={() =>
                  start(async () => {
                    const result = await dismissEmployee(dismissId, dismissDate);
                    if (result?.error) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success("Darbuotojas atleistas");
                    setDismissId(null);
                  })
                }
              >
                Patvirtinti
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6"
            onSubmit={(ev) => {
              ev.preventDefault();
              const fd = new FormData();
              fd.set("id", form.id);
              fd.set("firstName", form.firstName);
              fd.set("lastName", form.lastName);
              fd.set("personalCode", form.personalCode);
              fd.set("phone", form.phone);
              fd.set("email", form.email);
              fd.set("addressLt", form.addressLt);
              fd.set("specialty", form.specialty);
              fd.set("hourlyRate", form.hourlyRate);
              fd.set("status", form.status);
              fd.set("assignedObjectId", form.assignedObjectId);
              if (form.status === "INACTIVE" && form.dismissedAt) {
                fd.set("dismissedAt", form.dismissedAt);
              }
              start(async () => {
                const result = await upsertEmployee(fd);
                if (result?.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Išsaugota");
                setOpen(false);
              });
            }}
          >
            <h2 className="mb-4 text-lg font-bold">
              {form.id ? "Redaguoti darbuotoją" : "Naujas darbuotojas"}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {(
                [
                  ["firstName", "Vardas"],
                  ["lastName", "Pavardė"],
                  ["personalCode", "Asmens kodas"],
                  ["phone", "Telefonas"],
                  ["email", "El. paštas"],
                  ["addressLt", "Gyvenamasis adresas (LT)"],
                ] as const
              ).map(([name, label]) => (
                <label key={name} className="grid gap-1 text-sm">
                  {label}
                  <input
                    value={form[name]}
                    onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))}
                    className="rounded-lg border px-3 py-2"
                    required={name === "firstName" || name === "lastName" || name === "phone"}
                  />
                </label>
              ))}
              <label className="grid gap-1 text-sm">
                Valandinis (€)
                <input
                  value={form.hourlyRate}
                  onChange={(e) => setForm((p) => ({ ...p, hourlyRate: e.target.value }))}
                  inputMode="decimal"
                  placeholder="18.50"
                  className="rounded-lg border px-3 py-2"
                />
              </label>
              {form.status === "INACTIVE" ? (
                <label className="grid gap-1 text-sm">
                  Atleidimo data
                  <input
                    type="date"
                    value={form.dismissedAt}
                    onChange={(e) => setForm((p) => ({ ...p, dismissedAt: e.target.value }))}
                    className="rounded-lg border px-3 py-2"
                  />
                </label>
              ) : null}
              <label className="grid gap-1 text-sm md:col-span-2">
                Priskirtas objektas
                <select
                  value={form.assignedObjectId}
                  onChange={(e) => setForm((p) => ({ ...p, assignedObjectId: e.target.value }))}
                  className="rounded-lg border px-3 py-2"
                  disabled={form.status === "INACTIVE"}
                >
                  <option value="">Nepasirinkta</option>
                  {objects.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.country} – {o.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-between">
              {form.id ? (
                <button
                  type="button"
                  className="text-sm text-red-600"
                  onClick={() =>
                    start(async () => {
                      await deleteEmployee(form.id);
                      setOpen(false);
                    })
                  }
                >
                  Ištrinti visam
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-3 py-2 text-sm">
                  Atšaukti
                </button>
                <button disabled={pending} className="rounded-lg bg-navy px-3 py-2 text-sm text-white">
                  Išsaugoti
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
