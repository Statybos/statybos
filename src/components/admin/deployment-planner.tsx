"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getISOWeek,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { lt } from "date-fns/locale";
import { toast } from "sonner";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sun,
  Users,
} from "lucide-react";
import {
  createDeployment,
  deleteObject,
  deleteDeployment,
  updateEmployeeObject,
  updateObjectHeadcount,
  upsertObject,
} from "@/app/actions/planner";

type ObjectRow = {
  id: string;
  title: string;
  country: string;
  address: string;
  clientName: string;
  requiredHeadcount: number;
  status: string;
};

type EmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  status: string;
  phone: string;
  assignedObjectId: string | null;
};

type DeploymentRow = {
  id: string;
  employeeId: string;
  objectId: string | null;
  startDate: string;
  endDate: string;
  type: string;
  notes: string;
  employee: { firstName: string; lastName: string; specialty: string };
  object: { title: string; country: string } | null;
};

type StaffTone = "green" | "yellow" | "red" | "blue" | "grey";

function toInputDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function dayInRange(day: Date, startIso: string, endIso: string) {
  const start = startOfDay(new Date(startIso));
  const end = startOfDay(new Date(endIso));
  return day >= start && day <= end;
}

/** žalia = OK / virš min, geltona = −1, raudona = −2+, mėlyna = per daug, pilka = nėra tikslo */
export function staffingTone(present: number, required: number): StaffTone {
  if (!required || required <= 0) return "grey";
  const diff = present - required;
  if (diff > 0) return "blue";
  if (diff === 0) return "green";
  if (diff === -1) return "yellow";
  return "red";
}

const cellTone: Record<StaffTone, string> = {
  green: "bg-emerald-100 border-emerald-300 text-emerald-950 hover:brightness-95",
  yellow: "bg-amber-100 border-amber-300 text-amber-950 hover:brightness-95",
  red: "bg-red-100 border-red-300 text-red-950 hover:brightness-95",
  blue: "bg-sky-100 border-sky-300 text-sky-950 hover:brightness-95",
  grey: "bg-slate-50 border-slate-200 text-slate-600",
};

const badgeTone: Record<StaffTone, string> = {
  green: "bg-emerald-600 text-white",
  yellow: "bg-amber-400 text-navy",
  red: "bg-red-600 text-white",
  blue: "bg-sky-600 text-white",
  grey: "bg-slate-400 text-white",
};

const WEEKDAYS = ["Pr", "An", "Tr", "Kt", "Pn", "Št", "Sk"];

export function DeploymentPlanner({
  objects,
  employees,
  deployments,
}: {
  objects: ObjectRow[];
  employees: EmployeeRow[];
  deployments: DeploymentRow[];
}) {
  const activeObjects = useMemo(
    () => objects.filter((o) => o.status === "ACTIVE"),
    [objects],
  );

  const [selectedObjectId, setSelectedObjectId] = useState(
    () => activeObjects.find((o) => o.country === "Suomija")?.id ?? activeObjects[0]?.id ?? "",
  );
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(() => startOfDay(new Date()));
  const [pending, start] = useTransition();
  const [showObjectForm, setShowObjectForm] = useState(false);
  const [headcountDraft, setHeadcountDraft] = useState<number | null>(null);

  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [vacationEmployeeId, setVacationEmployeeId] = useState("");
  const [rangeStart, setRangeStart] = useState(toInputDate(new Date()));
  const [rangeEnd, setRangeEnd] = useState(toInputDate(addDays(new Date(), 14)));
  const [notes, setNotes] = useState("");

  const selected = activeObjects.find((o) => o.id === selectedObjectId) ?? null;

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  function isAway(employeeId: string, day: Date) {
    return deployments.some(
      (d) =>
        d.employeeId === employeeId &&
        (d.type === "VACATION_LT" || d.type === "TRANSIT") &&
        dayInRange(day, d.startDate, d.endDate),
    );
  }

  function workersOnObject(objectId: string, day: Date) {
    const ids = new Set<string>();
    for (const d of deployments) {
      if (d.type === "WORK" && d.objectId === objectId && dayInRange(day, d.startDate, d.endDate)) {
        ids.add(d.employeeId);
      }
    }
    return [...ids];
  }

  function presentCount(objectId: string, day: Date) {
    return workersOnObject(objectId, day).filter((id) => !isAway(id, day)).length;
  }

  function vacationCount(objectId: string, day: Date) {
    return workersOnObject(objectId, day).filter((id) => isAway(id, day)).length;
  }

  const objectTeam = useMemo(() => {
    if (!selected) return [] as EmployeeRow[];
    const ids = new Set<string>();
    for (const d of deployments) {
      if (d.type === "WORK" && d.objectId === selected.id) ids.add(d.employeeId);
    }
    for (const e of employees) {
      if (e.assignedObjectId === selected.id && e.status !== "INACTIVE") ids.add(e.id);
    }
    return employees
      .filter((e) => ids.has(e.id))
      .sort((a, b) => a.lastName.localeCompare(b.lastName, "lt"));
  }, [selected, deployments, employees]);

  const today = startOfDay(new Date());
  const statsDay = selectedDay ?? today;

  const stats = useMemo(() => {
    if (!selected) {
      return { goal: 0, assigned: 0, onLeave: 0, onTrip: 0, working: 0 };
    }
    const assigned = objectTeam.length;
    const onLeave = objectTeam.filter((e) => {
      return deployments.some(
        (d) =>
          d.employeeId === e.id &&
          d.type === "VACATION_LT" &&
          dayInRange(statsDay, d.startDate, d.endDate),
      );
    }).length;
    const onTrip = objectTeam.filter((e) => {
      return deployments.some(
        (d) =>
          d.employeeId === e.id &&
          d.type === "TRANSIT" &&
          dayInRange(statsDay, d.startDate, d.endDate),
      );
    }).length;
    const working = presentCount(selected.id, statsDay);
    return {
      goal: selected.requiredHeadcount,
      assigned,
      onLeave,
      onTrip,
      working,
    };
  }, [selected, objectTeam, deployments, statsDay]);

  const dayDetail = useMemo(() => {
    if (!selected || !selectedDay) return null;
    const workerIds = workersOnObject(selected.id, selectedDay);
    const working: EmployeeRow[] = [];
    const onLeave: { employee: EmployeeRow; until: string; type: string }[] = [];

    for (const id of workerIds) {
      const emp = employees.find((e) => e.id === id);
      if (!emp) continue;
      const leave = deployments.find(
        (d) =>
          d.employeeId === id &&
          (d.type === "VACATION_LT" || d.type === "TRANSIT") &&
          dayInRange(selectedDay, d.startDate, d.endDate),
      );
      if (leave) {
        onLeave.push({
          employee: emp,
          until: leave.endDate,
          type: leave.type,
        });
      } else {
        working.push(emp);
      }
    }

    const present = working.length;
    const required = selected.requiredHeadcount;
    const tone = staffingTone(present, required);
    const missing = Math.max(0, required - present);

    const neededSpecialties = new Set(onLeave.map((x) => x.employee.specialty));
    const busy = new Set(workerIds);
    for (const d of deployments) {
      if (d.type === "WORK" && dayInRange(selectedDay, d.startDate, d.endDate)) {
        busy.add(d.employeeId);
      }
    }
    const replacements = employees.filter((e) => {
      if (e.status !== "BENCH_LT") return false;
      if (busy.has(e.id)) return false;
      if (neededSpecialties.size === 0) return true;
      return neededSpecialties.has(e.specialty);
    });

    return { working, onLeave, present, required, tone, missing, replacements };
  }, [selected, selectedDay, employees, deployments]);

  function saveHeadcount() {
    if (!selected || headcountDraft == null) return;
    start(async () => {
      await updateObjectHeadcount(selected.id, headcountDraft);
      toast.success("Tikslas atnaujintas");
      setHeadcountDraft(null);
    });
  }

  function assignWorker(employeeId: string, from?: string, to?: string) {
    if (!selected) return;
    const fd = new FormData();
    fd.set("employeeId", employeeId);
    fd.set("objectId", selected.id);
    fd.set("type", "WORK");
    fd.set("startDate", from ?? rangeStart);
    fd.set("endDate", to ?? rangeEnd);
    fd.set("notes", notes || "Priskyrimas objektui");
    start(async () => {
      const result = await createDeployment(fd);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Darbuotojas priskirtas");
      setAssignEmployeeId("");
      setNotes("");
    });
  }

  function markVacation() {
    if (!vacationEmployeeId) {
      toast.error("Pasirinkite darbuotoją");
      return;
    }
    const fd = new FormData();
    fd.set("employeeId", vacationEmployeeId);
    fd.set("type", "VACATION_LT");
    fd.set("startDate", rangeStart);
    fd.set("endDate", rangeEnd);
    fd.set("notes", notes || "Atostogos LT");
    if (selected) fd.set("objectId", selected.id);
    start(async () => {
      const result = await createDeployment(fd);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Atostogos pažymėtos");
      setVacationEmployeeId("");
    });
  }

  function createObject(formData: FormData) {
    start(async () => {
      const result = await upsertObject(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Objektas sukurtas");
      setShowObjectForm(false);
    });
  }

  const bench = employees.filter((e) => e.status === "BENCH_LT");

  return (
    <div className="min-h-screen bg-[#f4f6f9] p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Planavimas</h1>
          <p className="text-sm text-muted">Mėnesio kalendorius pagal objektą – iškart matote, kada trūksta žmonių</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedObjectId}
            onChange={(e) => {
              setSelectedObjectId(e.target.value);
              setHeadcountDraft(null);
            }}
            className="rounded-xl border bg-white px-3 py-2 text-sm font-medium"
          >
            {activeObjects.map((o) => (
              <option key={o.id} value={o.id}>
                {o.country} – {o.title}
              </option>
            ))}
          </select>
          {selected ? (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(`Ištrinti objektą „${selected.title}“?`)) return;
                start(async () => {
                  await deleteObject(selected.id);
                  setSelectedObjectId("");
                  toast.success("Objektas ištrintas");
                });
              }}
              className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              Ištrinti objektą
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setShowObjectForm((v) => !v)}
            className="inline-flex items-center gap-1 rounded-xl bg-navy px-3 py-2 text-sm text-white"
          >
            <Plus className="h-4 w-4" />
            Objektas
          </button>
        </div>
      </div>

      {showObjectForm ? (
        <form
          action={createObject}
          className="mb-4 grid gap-2 rounded-2xl border bg-white p-3 md:grid-cols-6"
        >
          <input name="title" required placeholder="Pavadinimas" className="rounded-lg border px-2 py-1.5 text-sm" />
          <input
            name="country"
            required
            defaultValue="Suomija"
            placeholder="Šalis"
            className="rounded-lg border px-2 py-1.5 text-sm"
          />
          <input name="requiredHeadcount" type="number" min={1} defaultValue={9} className="rounded-lg border px-2 py-1.5 text-sm" />
          <input name="address" placeholder="Adresas" className="rounded-lg border px-2 py-1.5 text-sm" />
          <input name="clientName" placeholder="Klientas" className="rounded-lg border px-2 py-1.5 text-sm" />
          <button disabled={pending} className="rounded-lg bg-amber px-3 py-1.5 text-sm font-semibold text-navy">
            Išsaugoti
          </button>
        </form>
      ) : null}

      {!selected ? (
        <p className="rounded-2xl bg-white p-8 text-center text-muted">Sukurkite objektą.</p>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Tikslas", value: stats.goal, color: "text-navy" },
              { label: "Priskirta", value: stats.assigned, color: "text-navy" },
              { label: "Atostogose", value: stats.onLeave, color: "text-sky-700" },
              { label: "Tranzite", value: stats.onTrip, color: "text-amber-700" },
              { label: "Dirba dabar", value: stats.working, color: "text-emerald-700" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-navy/5">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-muted">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-navy/5">
              Reikia žmonių objekte
              <input
                type="number"
                min={1}
                value={headcountDraft ?? selected.requiredHeadcount}
                onChange={(e) => setHeadcountDraft(Number(e.target.value))}
                className="w-20 rounded-lg border px-2 py-1"
              />
              {headcountDraft != null && headcountDraft !== selected.requiredHeadcount ? (
                <button type="button" onClick={saveHeadcount} className="rounded-lg bg-navy px-2 py-1 text-xs text-white">
                  Išsaugoti
                </button>
              ) : null}
            </label>
            <p className="text-sm text-muted">
              {selected.country} · {selected.title}
              {selected.clientName ? ` · ${selected.clientName}` : ""}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            {/* Mėnesio kalendorius */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-navy/5">
              <div className="mb-4 flex items-center justify-between">
                <div className="min-w-28">
                  <p className="text-xs uppercase tracking-wide text-muted">Dabartinė savaitė</p>
                  <p className="text-lg font-bold text-navy">{getISOWeek(today)} savaitė</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMonth((m) => addMonths(m, -1))}
                  className="rounded-lg border p-2 hover:bg-sand"
                  aria-label="Ankstesnis mėnuo"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h2 className="text-lg font-bold capitalize text-navy">
                  {format(month, "LLLL yyyy", { locale: lt })}
                </h2>
                <button
                  type="button"
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                  className="rounded-lg border p-2 hover:bg-sand"
                  aria-label="Kitas mėnuo"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-1 grid grid-cols-7 gap-1.5">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-1 text-center text-xs font-semibold uppercase text-muted">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((day) => {
                  const inMonth = isSameMonth(day, month);
                  const present = inMonth ? presentCount(selected.id, day) : 0;
                  const required = selected.requiredHeadcount;
                  const tone = inMonth ? staffingTone(present, required) : "grey";
                  const vac = inMonth ? vacationCount(selected.id, day) : 0;
                  const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                  const isToday = isSameDay(day, today);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={!inMonth}
                      onClick={() => setSelectedDay(day)}
                      className={`relative flex min-h-[78px] flex-col rounded-xl border p-1.5 text-left transition ${
                        inMonth ? cellTone[tone] : "bg-transparent border-transparent text-slate-300"
                      } ${isSelected ? "ring-2 ring-navy ring-offset-1" : ""} ${
                        isToday && inMonth ? "outline outline-1 outline-navy/40" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className={`text-sm font-semibold ${isToday ? "text-navy" : ""}`}>
                          {format(day, "d")}
                        </span>
                        {inMonth && vac > 0 ? (
                          <Sun className="h-3.5 w-3.5 text-sky-600" aria-label="Yra atostogų" />
                        ) : null}
                      </div>
                      {inMonth ? (
                        <>
                          <span className="mt-auto text-sm font-bold tabular-nums">
                            {present}/{required || "–"}
                          </span>
                          <span className="text-[10px] leading-tight opacity-70">
                            {tone === "green"
                              ? "OK"
                              : tone === "yellow"
                                ? "−1"
                                : tone === "red"
                                  ? `−${required - present}`
                                  : tone === "blue"
                                    ? `+${present - required}`
                                    : "—"}
                          </span>
                        </>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Užpildyta
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Riba (−1)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Trūksta
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Per daug
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sun className="h-3.5 w-3.5 text-sky-600" /> Yra atostogų
                </span>
              </div>
            </div>

            {/* Dienos detalės */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-navy/5">
              {!selectedDay || !dayDetail ? (
                <div className="grid h-full min-h-[280px] place-items-center text-center text-sm text-muted">
                  Pasirinkite dieną kalendoriuje, kad matytumėte, kas tą dieną dirba.
                </div>
              ) : (
                <div className="flex h-full flex-col">
                  <div className="mb-3">
                    <h3 className="text-lg font-bold capitalize text-navy">
                      {format(selectedDay, "eeee, yyyy-MM-dd", { locale: lt })}
                    </h3>
                    <span
                      className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-bold ${badgeTone[dayDetail.tone]}`}
                    >
                      {dayDetail.present}/{dayDetail.required}
                      {dayDetail.missing > 0
                        ? ` · trūksta ${dayDetail.missing}`
                        : dayDetail.present > dayDetail.required
                          ? " · per daug"
                          : " · pilna"}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      Dirba objekte ({dayDetail.working.length})
                    </p>
                    {dayDetail.working.length === 0 ? (
                      <p className="text-sm text-muted">Niekas nedirba.</p>
                    ) : (
                      <ul className="max-h-40 space-y-1 overflow-y-auto">
                        {dayDetail.working.map((e) => (
                          <li key={e.id} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-sm">
                            <span className="font-medium">
                              {e.firstName} {e.lastName}
                            </span>
                            <span className="text-muted"> · {e.specialty}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      Atostogose / tranzite ({dayDetail.onLeave.length})
                    </p>
                    {dayDetail.onLeave.length === 0 ? (
                      <p className="text-sm text-muted">Niekas neatostogauja.</p>
                    ) : (
                      <ul className="space-y-1">
                        {dayDetail.onLeave.map(({ employee, until, type }) => (
                          <li key={employee.id} className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-sm">
                            <span className="font-medium">
                              {employee.firstName} {employee.lastName}
                            </span>
                            <span className="text-muted">
                              {" "}
                              · {type === "TRANSIT" ? "tranzitas" : "atostogos"} iki{" "}
                              {format(new Date(until), "yyyy-MM-dd")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {dayDetail.missing > 0 ? (
                    <div className="mt-auto border-t pt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
                        Galimi pakeitimai
                      </p>
                      {(dayDetail.replacements.length ? dayDetail.replacements : bench).length === 0 ? (
                        <p className="text-sm text-muted">Nėra laisvų kandidatų.</p>
                      ) : (
                        <ul className="space-y-2">
                          {(dayDetail.replacements.length ? dayDetail.replacements : bench)
                            .slice(0, 6)
                            .map((e) => (
                              <li
                                key={e.id}
                                className="flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2"
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    {e.firstName} {e.lastName}
                                  </p>
                                  <p className="text-xs text-muted">{e.specialty}</p>
                                </div>
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => {
                                    const leave = dayDetail.onLeave.find(
                                      (a) => a.employee.specialty === e.specialty,
                                    );
                                    assignWorker(
                                      e.id,
                                      leave
                                        ? toInputDate(selectedDay)
                                        : toInputDate(selectedDay),
                                      leave
                                        ? toInputDate(new Date(leave.until))
                                        : toInputDate(addDays(selectedDay, 21)),
                                    );
                                  }}
                                  className="rounded-lg bg-navy px-2.5 py-1 text-xs font-semibold text-white"
                                >
                                  Siųsti
                                </button>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Veiksmai + komanda */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-navy/5">
              <p className="mb-3 font-semibold text-navy">Priskirti žmogų</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={assignEmployeeId}
                  onChange={(e) => setAssignEmployeeId(e.target.value)}
                  className="rounded-lg border px-2 py-1.5 text-sm sm:col-span-2"
                >
                  <option value="">Laisvas personalas…</option>
                  {bench.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} · {e.specialty}
                    </option>
                  ))}
                </select>
                <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm" />
                <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm" />
                <button
                  type="button"
                  disabled={pending || !assignEmployeeId}
                  onClick={() => assignWorker(assignEmployeeId)}
                  className="rounded-lg bg-amber px-3 py-2 text-sm font-semibold text-navy disabled:opacity-50 sm:col-span-2"
                >
                  Priskirti į objektą
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-navy/5">
              <p className="mb-3 font-semibold text-navy">Pažymėti atostogas</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={vacationEmployeeId}
                  onChange={(e) => setVacationEmployeeId(e.target.value)}
                  className="rounded-lg border px-2 py-1.5 text-sm sm:col-span-2"
                >
                  <option value="">Objekto darbuotojas…</option>
                  {objectTeam.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName}
                    </option>
                  ))}
                </select>
                <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm" />
                <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm" />
                <button
                  type="button"
                  disabled={pending || !vacationEmployeeId}
                  onClick={markVacation}
                  className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
                >
                  Pažymėti atostogas
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-navy/5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-navy">
              <Users className="h-4 w-4" />
              Priskirti darbuotojai ({objectTeam.length})
            </h3>
            {objectTeam.length === 0 ? (
              <p className="text-sm text-muted">Dar niekas nepriskirtas šiam objektui.</p>
            ) : (
              <ul className="divide-y">
                {objectTeam.map((e) => {
                  const work = deployments.find(
                    (d) =>
                      d.employeeId === e.id &&
                      d.type === "WORK" &&
                      d.objectId === selected.id &&
                      dayInRange(today, d.startDate, d.endDate),
                  );
                  const leave = deployments.find(
                    (d) =>
                      d.employeeId === e.id &&
                      (d.type === "VACATION_LT" || d.type === "TRANSIT") &&
                      dayInRange(today, d.startDate, d.endDate),
                  );
                  return (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium">
                          {e.firstName} {e.lastName}
                        </p>
                        <label className="mt-1 block text-xs text-muted">
                          Priskirtas objektas
                          <select
                            value={e.assignedObjectId ?? ""}
                            onChange={(event) => {
                              const objectId = event.target.value || null;
                              start(async () => {
                                const result = await updateEmployeeObject(e.id, objectId);
                                if (result?.error) {
                                  toast.error(result.error);
                                  return;
                                }
                                toast.success("Priskyrimas atnaujintas");
                              });
                            }}
                            className="mt-1 block w-full rounded-lg border bg-white px-2 py-1.5 text-sm text-ink"
                          >
                            <option value="">Nepriskirta</option>
                            {activeObjects.map((object) => (
                              <option key={object.id} value={object.id}>
                                {object.country} – {object.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        {leave ? (
                          <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs text-sky-800">
                            <Sun className="h-3 w-3" />
                            Atostogose {format(new Date(leave.startDate), "yyyy-MM-dd")} –{" "}
                            {format(new Date(leave.endDate), "yyyy-MM-dd")}
                          </p>
                        ) : work ? (
                          <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-900">
                            <Briefcase className="h-3 w-3" />
                            Objekte nuo {format(new Date(work.startDate), "yyyy-MM-dd")}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        {leave ? (
                          <button
                            type="button"
                            className="rounded-lg border px-2 py-1 text-xs"
                            onClick={() =>
                              start(async () => {
                                await deleteDeployment(leave.id);
                                toast.success("Atostogos pašalintos");
                              })
                            }
                          >
                            Baigti atostogas
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="rounded-lg border px-2 py-1 text-xs"
                            onClick={() => {
                              setVacationEmployeeId(e.id);
                              toast.message("Pasirinkite datas ir spauskite „Pažymėti atostogas“");
                            }}
                          >
                            Atostogos
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
