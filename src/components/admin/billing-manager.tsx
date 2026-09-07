"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { lt } from "date-fns/locale";
import { toast } from "sonner";
import { Check, FileText, Plus, Trash2 } from "lucide-react";
import {
  createBillingCustomer,
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

function isCovered(customer: CustomerRow, year: number, week: number) {
  return customer.invoices.some(
    (invoice) =>
      invoice.year === year && invoice.fromWeek <= week && invoice.toWeek >= week,
  );
}

function isDue(customer: CustomerRow, currentYear: number, currentWeek: number, currentDate: string) {
  if (isCovered(customer, currentYear, currentWeek)) return false;
  if (customer.billingInterval === "WEEKLY") return true;
  if (customer.billingInterval === "BIWEEKLY") {
    return (currentWeek - customer.anchorWeek + 53) % 2 === 0;
  }
  return new Date(currentDate).getDate() >= customer.billingDay;
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
  const [fromWeek, setFromWeek] = useState(String(Math.max(1, currentWeek - 1)));
  const [toWeek, setToWeek] = useState(String(currentWeek));

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

  function issueInvoice(customerId: string) {
    const formData = new FormData();
    formData.set("customerId", customerId);
    formData.set("year", String(currentYear));
    formData.set("fromWeek", fromWeek);
    formData.set("toWeek", toWeek);
    start(async () => {
      const result = await markInvoiceIssued(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Sąskaita pažymėta kaip išrašyta");
    });
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{format(new Date(currentDate), "yyyy-MM-dd", { locale: lt })}</p>
          <h1 className="text-2xl font-bold text-navy">Sąskaitų išrašymai</h1>
          <p className="text-sm text-muted">Dabar yra {currentYear} metų {currentWeek} savaitė.</p>
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
          <input name="billingDay" type="number" min={1} max={31} defaultValue={21} placeholder="Mėnesio diena" className="rounded-lg border px-3 py-2 text-sm" />
          <input name="anchorWeek" type="number" min={1} max={53} defaultValue={currentWeek} placeholder="Pradinė savaitė" className="rounded-lg border px-3 py-2 text-sm" />
          <div className="flex gap-2 md:col-span-4">
            <button disabled={pending} className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white">Išsaugoti</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-3 py-2 text-sm">Atšaukti</button>
          </div>
        </form>
      ) : null}

      <div className="mb-4 rounded-2xl bg-mint/60 p-4">
        <p className="font-semibold text-navy">Sąskaitos laikotarpis</p>
          <p className="mt-1 text-sm text-muted">Tai tik vidinis žymėjimas ir priminimas. Tikrų sąskaitų čia nekuriame ir nesiunčiame.</p>
          <p className="mt-1 text-sm text-muted">Pasirinkite savaites, kurias apima sąskaita, ir pažymėkite laikotarpį kaip išrašytą.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-sm">Nuo savaitės <input type="number" min={1} max={53} value={fromWeek} onChange={(event) => setFromWeek(event.target.value)} className="ml-1 w-20 rounded-lg border bg-white px-2 py-1.5" /></label>
          <label className="text-sm">Iki savaitės <input type="number" min={1} max={53} value={toWeek} onChange={(event) => setToWeek(event.target.value)} className="ml-1 w-20 rounded-lg border bg-white px-2 py-1.5" /></label>
          <span className="text-sm text-muted">{currentYear} metai</span>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Užsakovų dar nėra.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {customers.map((customer) => {
            const due = isDue(customer, currentYear, currentWeek, currentDate);
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
                <div className={`mt-4 rounded-xl px-3 py-2 text-sm ${due ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>
                  {due ? `Priminimas: pagal nustatymą laikas tikrinti ${currentWeek} savaitę.` : "Šiam laikotarpiui sąskaita pažymėta arba dar ne laikas."}
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => issueInvoice(customer.id)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Pažymėti kaip išrašytą už {fromWeek}–{toWeek} savaitę
                </button>
                <div className="mt-4 border-t pt-3">
                  <p className="mb-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted"><FileText className="h-3.5 w-3.5" /> Išrašytos sąskaitos</p>
                  {customer.invoices.length === 0 ? <p className="text-sm text-muted">Dar nepažymėta.</p> : (
                    <ul className="space-y-1 text-sm text-muted">
                      {customer.invoices.slice(0, 5).map((invoice) => <li key={invoice.id}>✓ {invoice.year} m. {invoice.fromWeek}–{invoice.toWeek} savaitės · {format(new Date(invoice.issuedAt), "yyyy-MM-dd")}</li>)}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}