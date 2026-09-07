"use client";

import Image from "next/image";
import { ArrowRight, Award, Building2, MapPinned } from "lucide-react";
import { openApplyForm } from "@/components/landing/apply-form";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/hero-construction.jpg"
          alt="Statybų objektas Europoje"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/75 via-navy/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-sand/40 via-transparent to-navy/20" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div className="text-white">
          <p className="mb-3 inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wider text-amber-2 backdrop-blur">
            Komandiruotės iš Lietuvos
          </p>
          <h1 className="text-3xl font-bold leading-tight drop-shadow md:text-5xl">
            Darbas statybose užsienyje – tvarios komandiruotės ir geras atlyginimas
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/90 md:text-lg">
            Įdarbiname statybų specialistus Europoje. Legalios sutartys, nemokamas
            apgyvendinimas, apmokamos kelionės ir aiškios rotacijos. Rotacija gali būti ilgesnė pagal susitarimą, bet minimali trukmė – 8 savaitės.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#skelbimai"
              className="inline-flex items-center gap-2 rounded-full bg-action px-5 py-3 font-semibold text-navy shadow-sm hover:bg-action-hover"
            >
              Peržiūrėti skelbimus
              <ArrowRight className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() => openApplyForm()}
              className="inline-flex items-center rounded-full border border-white/40 bg-white/15 px-5 py-3 font-semibold backdrop-blur hover:bg-white/25"
            >
              Kandidatuoti dabar
            </button>
          </div>
        </div>
        <div className="grid gap-3 self-end md:self-center">
          {[
            {
              icon: Building2,
              label: "10+ metų patirtis",
              text: "Stabilūs objektai Europoje",
            },
            {
              icon: MapPinned,
              label: "Europa",
              text: "Suomija, Danija, Švedija ir kita",
            },
            {
              icon: Building2,
              label: "Apmokamos kelionės",
              text: "Kelionės į darbą ir iš darbo apmokamos",
            },
            {
              icon: Award,
              label: "Sertifikatai ir kursai",
              text: "Apmokame visus reikalingus sertifikatus ir kursus",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex gap-3 rounded-2xl border border-white/25 bg-white/15 p-4 text-white backdrop-blur-md"
            >
              <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-2" />
              <div>
                <p className="font-semibold">{item.label}</p>
                <p className="text-sm text-white/80">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
