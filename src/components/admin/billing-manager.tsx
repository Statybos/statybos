"use client";

import { useState, useTransition } from "react";
import { addDays, addMonths, differenceInCalendarDays, format, getISOWeek, startOfDay, startOfWeek } from "date-fns";
import { lt } from "date-fns/locale";
import { toast } from "sonner";
import { Check, FileText, Plus, Trash2 } from "lucide-react";
import {
  createBillingCustomer,
  deleteBillingInvoice,
  deleteBillingCustomer,
  markInvoiceIssued,
} from "@/app/actions/billing";

type InvoiceRow = {
  id: string;
  year: number;
  fromWeek: number;
  toWeek: number;
  issuedAt: string;
};

type CustomerRow = {
  id: string;
  name: string;
  billingInterval: string;
  billingDay: number;
  anchorWeek: number;
  invoices: InvoiceRow[];
};

function scheduleLabel(customer: CustomerRow) {
  if (customer.billingInterval === "WEEKLY") return "Kas savaitę";
  if (customer.billingInterval === "BIWEEKLY") return `Kas 2 savaites, nuo ${customer.anchorWeek} sav.`;
  return `Kartą per mėnesį, mėnesio ${customer.billingDay} d.`;
}

function monthlyDate(base: Date, day: number) {
  const candidate = new Date(base.getFullYear(), base.getMonth(), 1);
  const lastDay = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
  candidate.setDate(Math.min(day, lastDay));
  return startOfDay(candidate);
}

function nextDueDate(customer: CustomerRow, currentDate: string) {
  const today = startOfDay(new Date(currentDate));
  const latest = customer.invoices[0];

  if (latest) {
    const issuedAt = startOfDay(new Date(latest.issuedAt));
    if (customer.billingInterval === "MONTHLY") {
      return monthlyDate(addMonths(issuedAt, 1), customer.billingDay);
    }
    return addDays(issuedAt, customer.billingInterval === "WEEKLY" ? 7 : 14);
  }

  if (customer.billingInterval === "MONTHLY") {
    const thisMonth = monthlyDate(today, customer.billingDay);
    return thisMonth >= today ? thisMonth : monthlyDate(addMonths(today, 1), customer.billingDay);
  }

  if (customer.billingInterval === "BIWEEKLY") {
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const currentWeek = getISOWeek(today);
    return (currentWeek - customer.anchorWeek + 53) % 2 === 0 ? weekStart : addDays(weekStart, 7);
  }

  return today;
}

function dueLabel(customer: CustomerRow, currentDate: string) {
  const dueDate = nextDueDate(customer, currentDate);
  const days = differenceInCalendarDays(dueDate, startOfDay(new Date(currentDate)));
  if (days > 0) return { tone: "upcoming", text: `Liko ${days} ${days === 1 ? "diena" : "dienos"} iki ${format(dueDate, "yyyy-MM-dd")}` };
  if (days === 0) return { tone: "today", text: `Galima išrašyti šiandien (${format(dueDate, "yyyy-MM-dd")})` };
  return { tone: "late", text: `Vėluojame išrašyti ${Math.abs(days)} ${Math.abs(days) === 1 ? "dieną" : "dienas"} (turėjo būti ${format(dueDate, "yyyy-MM-dd")})` };
}

export function BillingManager({
  customers,
  currentWeek,
  currentYear,
  currentDate,
}: {
  customers: CustomerRow[];
  currentWeek: number;
  currentYear: number;
  currentDate: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [pending, start] = useTransition();
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  function submitCustomer(formData: FormData) {
    start(async () => {
      const result = await createBillingCustomer(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Užsakovas pridėtas");
      setShowForm(false);
    });
  }

  function issueInvoice(customerId: string, fromWeek: number, toWeek: number) {
    const formData = new FormData();
    formData.set("customerId", customerId);
    formData.set("year", String(currentYear));
    formData.set("fromWeek", String(fromWeek));
    formData.set("toWeek", String(toWeek));
    start(async () => {
      const result = await markInvoiceIssued(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Laikotarpis pažymėtas kaip išrašytas");
    });
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{format(new Date(currentDate), "yyyy-MM-dd", { locale: lt })}</p>
          <h1 className="text-2xl font-bold text-navy">Sąskaitų priminimai</h1>
          <p className="text-sm text-muted">Dabartinė savaitė: {currentWeek}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-lg bg-amber px-3 py-2 text-sm font-semibold text-navy"
        >
          <Plus className="h-4 w-4" />
          Pridėti užsakovą
        </button>
      </div>

      {showForm ? (
        <form
          action={submitCustomer}
          className="mb-5 grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-4"
        >
          <input name="name" required placeholder="Užsakovo pavadinimas" className="rounded-lg border px-3 py-2 text-sm" />
          <select name="billingInterval" defaultValue="BIWEEKLY" className="rounded-lg border px-3 py-2 text-sm">
            <option value="WEEKLY">Kas savaitę</option>
            <option value="BIWEEKLY">Kas 2 savaites</option>
            <option value="MONTHLY">Kartą per mėnesį</option>
          </select>
          <label className="grid gap-1 text-sm">
            Mėnesio diena
            <input name="billingDay" type="number" min={1} max={31} defaultValue={21} className="rounded-lg border px-3 py-2 text-sm" />
          </label>
          <label className="grid gap-1 text-sm">
            Pradinė savaitė (kas 2 sav.)
            <input name="anchorWeek" type="number" min={1} max={53} defaultValue={currentWeek} className="rounded-lg border px-3 py-2 text-sm" />
          </label>
          <div className="flex gap-2 md:col-span-4">
            <button disabled={pending} className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white">Išsaugoti</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-3 py-2 text-sm">Atšaukti</button>
          </div>
        </form>
      ) : null}

      {customers.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Užsakovų dar nėra.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {customers.map((customer) => {
            const due = dueLabel(customer, currentDate);
            const periodStart = customer.billingInterval === "MONTHLY" ? currentWeek : Math.max(1, currentWeek - 1);
            const visibleInvoices = expandedHistory[customer.id] ? customer.invoices : customer.invoices.slice(0, 3);
            return (
              <article key={customer.id} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-navy">{customer.name}</h2>
                    <p className="text-sm text-muted">{scheduleLabel(customer)}</p>
                  </div>
                  <button
                    type="button"
                    title="Ištrinti užsakovą"
                    onClick={() => {
                      if (!window.confirm(`Ištrinti užsakovą „${customer.name}“?`)) return;
                      start(async () => {
                        await deleteBillingCustomer(customer.id);
                        toast.success("Užsakovas ištrintas");
                      });
                    }}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className={`mt-4 rounded-xl px-3 py-2 text-sm ${due.tone === "late" ? "bg-red-50 text-red-800" : due.tone === "today" ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>
                  {due.text}
                </div>
                {customer.billingInterval !== "MONTHLY" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span>Laikotarpis:</span>
                    <span>{periodStart}–{currentWeek} savaitė</span>
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => issueInvoice(customer.id, periodStart, currentWeek)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Pažymėti kaip išrašytą
                </button>
                <div className="mt-4 border-t pt-3">
                  <p className="mb-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted"><FileText className="h-3.5 w-3.5" /> Išrašytos sąskaitos</p>
                  {customer.invoices.length === 0 ? <p className="text-sm text-muted">Dar nepažymėta.</p> : (
                    <ul className="space-y-1 text-sm text-muted">
                      {visibleInvoices.map((invoice) => (
                        <li key={invoice.id} className="flex items-center justify-between gap-2">
                          <span>✓ Išrašyta {format(new Date(invoice.issuedAt), "yyyy-MM-dd")} · {invoice.fromWeek}–{invoice.toWeek} savaitės</span>
                          <button
                            type="button"
                            className="shrink-0 text-xs text-red-600 underline"
                            onClick={() => start(async () => {
                              await deleteBillingInvoice(invoice.id);
                              toast.success("Pažymėjimas atšauktas");
                            })}
                          >
                            Atšaukti
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {customer.invoices.length > 3 ? (
                    <button
                      type="button"
                      onClick={() => setExpandedHistory((state) => ({ ...state, [customer.id]: !state[customer.id] }))}
                      className="mt-2 text-xs font-semibold text-navy underline"
                    >
                      {expandedHistory[customer.id] ? "Rodyti mažiau" : `Rodyti daugiau (${customer.invoices.length - 3})`}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}