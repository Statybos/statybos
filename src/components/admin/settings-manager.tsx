"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateSiteSettings } from "@/app/actions/settings";

export function SettingsManager({ contactPhone }: { contactPhone: string }) {
  const [pending, start] = useTransition();

  return (
    <div className="max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-navy">Nustatymai</h1>
      <p className="mt-1 text-sm text-muted">Šis telefono numeris rodomas landing puslapio viršuje šalia administracijos.</p>
      <form
        className="mt-5 rounded-2xl bg-white p-5 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          start(async () => {
            const result = await updateSiteSettings(formData);
            if (result?.error) {
              toast.error(result.error);
              return;
            }
            toast.success("Telefono numeris atnaujintas");
          });
        }}
      >
        <label className="grid gap-1 text-sm font-medium text-navy">
          Telefono numeris
          <input
            name="contactPhone"
            type="tel"
            required
            defaultValue={contactPhone}
            placeholder="+37060531718"
            className="rounded-lg border px-3 py-2 font-normal"
          />
        </label>
        <button disabled={pending} className="mt-4 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Išsaugoti
        </button>
      </form>
    </div>
  );
}