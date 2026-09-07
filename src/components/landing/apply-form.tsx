"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { submitApplication } from "@/app/actions/apply";

type FormState = {
  jobId: string;
  fullName: string;
  phone: string;
  cityLt: string;
  driverLicense: "Turiu B" | "B neturiu";
  english: "Nemoku" | "Silpnai" | "Gerai" | "Puikiai";
  availableFrom: string;
  comment: string;
};

const initial: FormState = {
  jobId: "",
  fullName: "",
  phone: "",
  cityLt: "",
  driverLicense: "B neturiu",
  english: "Nemoku",
  availableFrom: "",
  comment: "",
};

export function openApplyForm(jobId = "") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("open-apply", { detail: jobId }));
}

export function ApplyFormModal() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState<FormState>(initial);

  useEffect(() => {
    function onOpen(e: Event) {
      const jobId = (e as CustomEvent<string>).detail || "";
      setForm((prev) => ({ ...prev, jobId }));
      setOpen(true);
    }
    function onSelectJob(e: Event) {
      const jobId = (e as CustomEvent<string>).detail || "";
      setForm((prev) => ({ ...prev, jobId }));
      setOpen(true);
    }
    window.addEventListener("open-apply", onOpen);
    window.addEventListener("select-job", onSelectJob);
    return () => {
      window.removeEventListener("open-apply", onOpen);
      window.removeEventListener("select-job", onSelectJob);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("fullName", form.fullName);
      fd.set("phone", form.phone);
      fd.set("cityLt", form.cityLt);
      fd.set("driverLicense", form.driverLicense);
      fd.set("english", form.english);
      if (form.availableFrom) fd.set("availableFrom", form.availableFrom);
      if (form.comment) fd.set("comment", form.comment);
      if (form.jobId) fd.set("jobId", form.jobId);

      const result = await submitApplication(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Paraiška išsiųsta. Susisieksime telefonu.");
      setForm(initial);
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy/45 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Uždaryti"
        onClick={() => setOpen(false)}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber">Paraiška</p>
            <h2 className="text-xl font-bold text-navy">Kandidatuoti dabar</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-navy/10 p-2 text-muted hover:bg-sand"
            aria-label="Uždaryti formą"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium md:col-span-2">
            Vardas, Pavardė *
            <input
              required
              value={form.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              className="rounded-xl border border-navy/10 px-3 py-2.5 font-normal"
              placeholder="Jonas Jonaitis"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium md:col-span-2">
            Telefono numeris *
            <input
              required
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              inputMode="tel"
              className="rounded-xl border border-navy/10 px-3 py-2.5 font-normal"
              placeholder="+370 612 34567"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium md:col-span-2">
            Miestas Lietuvoje *
            <input
              required
              value={form.cityLt}
              onChange={(e) => setField("cityLt", e.target.value)}
              className="rounded-xl border border-navy/10 px-3 py-2.5 font-normal"
              placeholder="Kaunas"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Vairuotojo pažymėjimas
            <select
              value={form.driverLicense}
              onChange={(e) =>
                setField("driverLicense", e.target.value as FormState["driverLicense"])
              }
              className="rounded-xl border border-navy/10 px-3 py-2.5 font-normal"
            >
              <option value="Turiu B">Turiu B</option>
              <option value="B neturiu">B neturiu</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Anglų kalba
            <select
              value={form.english}
              onChange={(e) => setField("english", e.target.value as FormState["english"])}
              className="rounded-xl border border-navy/10 px-3 py-2.5 font-normal"
            >
              <option value="Nemoku">Nemoku</option>
              <option value="Silpnai">Silpnai</option>
              <option value="Gerai">Gerai</option>
              <option value="Puikiai">Puikiai</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium md:col-span-2">
            Kada galite pradėti?
            <input
              type="date"
              value={form.availableFrom}
              onChange={(e) => setField("availableFrom", e.target.value)}
              className="rounded-xl border border-navy/10 px-3 py-2.5 font-normal"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium md:col-span-2">
            Komentaras
            <textarea
              value={form.comment}
              onChange={(e) => setField("comment", e.target.value)}
              rows={3}
              className="rounded-xl border border-navy/10 px-3 py-2.5 font-normal"
            />
          </label>
          <button
            disabled={pending}
            className="rounded-full bg-amber px-5 py-3 text-sm font-semibold text-navy disabled:opacity-60 md:col-span-2"
          >
            {pending ? "Siunčiama..." : "Pateikti paraišką"}
          </button>
        </form>
      </div>
    </div>
  );
}
