"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Euro, MapPin, Phone, Pencil, Plane, Trash2, UserX } from "lucide-react";
import {
  deleteEmployee,
  dismissEmployee,
  updateEmployeeWage,
  upsertEmployee,
} from "@/app/actions/employees";
import {
  closeEmployeeDeployment,
  deleteDeployment,
  startEmployeeDeployment,
} from "@/app/actions/planner";
import { SPECIALTIES } from "@/lib/constants";

type ObjectOpt = { id: string; title: string; country: string };

type WageChange = { rate: number; changedAt: string };
type DeploymentRow = {
  id: string;
  startDate: string;
  endDate: string | null;
  closedAt: string | null;
  isActive: boolean;
  type: string;
  notes: string;
  object: { title: string; country: string } | null;
};

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
  deployments: DeploymentRow[];
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

function deploymentDays(deployment: DeploymentRow) {
  const start = new Date(deployment.startDate);
  const end = deployment.endDate ? new Date(deployment.endDate) : new Date();
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}

function isCurrentDeployment(deployment: DeploymentRow) {
  const now = new Date();
  return (
    deployment.isActive &&
    new Date(deployment.startDate) <= now &&
    (!deployment.endDate || new Date(deployment.endDate) >= now)
  );
}

function isEmployeeTrip(deployment: DeploymentRow) {
  return deployment.type === "PERSONAL_TRIP" || (deployment.type === "WORK" && !deployment.object);
}

function isCurrentLeave(deployment: DeploymentRow) {
  const now = new Date();
  return (
    deployment.isActive &&
    (deployment.type === "VACATION_LT" || deployment.type === "TRANSIT") &&
    new Date(deployment.startDate) <= now &&
    (!deployment.endDate || new Date(deployment.endDate) >= now)
  );
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
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRow | null>(null);
  const [tripStartDate, setTripStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [tripNotes, setTripNotes] = useState("");
  const [wageEditId, setWageEditId] = useState<string | null>(null);
  const [wageDraft, setWageDraft] = useState("");
  const [dismissId, setDismissId] = useState<string | null>(null);
  const [dismissDate, setDismissDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [pending, start] = useTransition();

  const counts = useMemo(() => {
    return {
      ALL: employees.length,
      ACTIVE: employees.filter((e) => e.status !== "INACTIVE").length,
      ON_LEAVE: employees.filter((e) => e.deployments.some(isCurrentLeave)).length,
      INACTIVE: employees.filter((e) => e.status === "INACTIVE").length,
    };
  }, [employees]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return employees.filter((e) => {
      if (view === "ACTIVE" && e.status === "INACTIVE") return false;
      if (view === "ON_LEAVE" && !e.deployments.some(isCurrentLeave)) return false;
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

  function openEmployee(e: EmployeeRow) {
    setSelectedEmployee(e);
    setTripStartDate(format(new Date(), "yyyy-MM-dd"));
    setTripNotes("");
  }

  function startTrip() {
    if (!selectedEmployee) return;
    const fd = new FormData();
    fd.set("employeeId", selectedEmployee.id);
    fd.set("startDate", tripStartDate);
    fd.set("notes", tripNotes);
    start(async () => {
      const result = await startEmployeeDeployment(fd);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Komandiruotė pradėta");
      setTripNotes("");
    });
  }

  function closeTrip(deploymentId: string) {
    start(async () => {
      const result = await closeEmployeeDeployment(deploymentId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Komandiruotė uždaryta");
    });
  }

  function removeTrip(deploymentId: string) {
    if (!window.confirm("Ištrinti šią komandiruotę iš istorijos?")) return;
    start(async () => {
      await deleteDeployment(deploymentId);
      toast.success("Komandiruotė ištrinta");
    });
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
          const activeDeployment = e.deployments.find(
            (deployment) => isEmployeeTrip(deployment) && isCurrentDeployment(deployment),
          );
          const editingWage = wageEditId === e.id;
          return (
            <article
              key={e.id}
              className="flex flex-col rounded-2xl border border-navy/10 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <button
                    type="button"
                    onClick={() => openEmployee(e)}
                    className="text-left font-bold text-navy underline-offset-2 hover:underline"
                  >
                    {e.firstName} {e.lastName}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => openEmployee(e)}
                  title={activeDeployment ? "Aktyvi komandiruotė" : "Nėra aktyvios komandiruotės"}
                  className={activeDeployment ? "rounded-md p-1 text-orange-500 hover:bg-orange-50" : "rounded-md p-1 text-emerald-600 hover:bg-emerald-50"}
                >
                  <Plane className="h-5 w-5" />
                </button>
              </div>

              {activeDeployment ? (
                <p className="mb-2 text-xs font-medium text-orange-700">
                  Komandiruotėje {deploymentDays(activeDeployment)} d. nuo {format(new Date(activeDeployment.startDate), "yyyy-MM-dd")}
                </p>
              ) : null}

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

      {selectedEmployee ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted">Darbuotojo informacija</p>
                <h2 className="text-xl font-bold text-navy">
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="rounded-lg border px-3 py-1.5 text-sm"
              >
                Uždaryti
              </button>
            </div>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Telefonas</dt>
                <dd className="font-medium text-navy">{selectedEmployee.phone || "Nenurodytas"}</dd>
              </div>
              <div>
                <dt className="text-muted">El. paštas</dt>
                <dd className="break-words font-medium text-navy">
                  {selectedEmployee.email || "Nenurodytas"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Asmens kodas</dt>
                <dd className="font-medium text-navy">{selectedEmployee.personalCode || "Nenurodytas"}</dd>
              </div>
              <div>
                <dt className="text-muted">Gyvenamasis adresas</dt>
                <dd className="font-medium text-navy">{selectedEmployee.addressLt || "Nenurodytas"}</dd>
              </div>
              <div>
                <dt className="text-muted">Valandinis</dt>
                <dd className="font-medium text-navy">
                  {selectedEmployee.hourlyRate > 0
                    ? `${selectedEmployee.hourlyRate.toFixed(2)} €/val.`
                    : "Nenustatyta"}
                </dd>
              </div>
              {selectedEmployee.dismissedAt ? (
                <div>
                  <dt className="text-muted">Atleidimo data</dt>
                  <dd className="font-medium text-navy">
                    {format(new Date(selectedEmployee.dismissedAt), "yyyy-MM-dd")}
                  </dd>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <dt className="text-muted">Objektas</dt>
                <dd className="font-medium text-navy">
                  {selectedEmployee.assignedObject
                    ? `${selectedEmployee.assignedObject.country} – ${selectedEmployee.assignedObject.title}`
                    : "Objektas nepriskirtas"}
                </dd>
              </div>
            </dl>

            <section className="mt-6 border-t pt-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-navy">Komandiruotė</h3>
                {selectedEmployee.deployments.some(
                  (deployment) => isEmployeeTrip(deployment) && isCurrentDeployment(deployment),
                ) ? (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600">
                    <Plane className="h-4 w-4" /> Vyksta
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                    <Plane className="h-4 w-4" /> Nėra
                  </span>
                )}
              </div>
              {!selectedEmployee.deployments.some(
                (deployment) => isEmployeeTrip(deployment) && isCurrentDeployment(deployment),
              ) && selectedEmployee.status !== "INACTIVE" ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    type="date"
                    value={tripStartDate}
                    onChange={(event) => setTripStartDate(event.target.value)}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={startTrip}
                    className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Pradėti
                  </button>
                  <input
                    value={tripNotes}
                    onChange={(event) => setTripNotes(event.target.value)}
                    placeholder="Pastaba (nebūtina)"
                    className="rounded-lg border px-3 py-2 text-sm sm:col-span-3"
                  />
                </div>
              ) : null}
            </section>

            <section className="mt-5">
              <h3 className="font-semibold text-navy">Komandiruočių istorija</h3>
              {selectedEmployee.deployments.filter(isEmployeeTrip).length === 0 ? (
                <p className="mt-2 text-sm text-muted">Komandiruočių dar nėra.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {selectedEmployee.deployments
                    .filter(isEmployeeTrip)
                    .map((deployment) => (
                      <div key={deployment.id} className="rounded-lg border p-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-navy">
                              {deployment.object
                                ? `${deployment.object.country} – ${deployment.object.title}`
                                : "Rankinė komandiruotė"}
                            </p>
                            <p className="text-muted">
                              {format(new Date(deployment.startDate), "yyyy-MM-dd")} – {deployment.endDate ? format(new Date(deployment.endDate), "yyyy-MM-dd") : "vyksta"}
                              <span className="ml-2 font-medium">({deploymentDays(deployment)} d.)</span>
                            </p>
                            {deployment.notes ? <p className="mt-1 text-xs text-muted">{deployment.notes}</p> : null}
                          </div>
                          <div className="flex shrink-0 gap-2">
                            {deployment.isActive && isCurrentDeployment(deployment) ? (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => closeTrip(deployment.id)}
                                className="rounded-lg bg-navy px-2 py-1 text-xs text-white disabled:opacity-50"
                              >
                                Uždaryti
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => removeTrip(deployment.id)}
                                className="rounded-lg border border-red-200 p-1.5 text-red-600 disabled:opacity-50"
                                title="Ištrinti iš istorijos"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>

            <div className="mt-6 flex justify-end border-t pt-4">
              <button
                type="button"
                onClick={() => {
                  edit(selectedEmployee);
                  setSelectedEmployee(null);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-navy px-3 py-2 text-sm text-white"
              >
                <Pencil className="h-3.5 w-3.5" />
                Redaguoti
              </button>
            </div>
          </div>
        </div>
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
