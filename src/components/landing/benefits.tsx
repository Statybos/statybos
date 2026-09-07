import { CalendarRange, Home, ShieldCheck } from "lucide-react";

const items = [
  {
    icon: CalendarRange,
    title: "Lanksčios atostogų rotacijos",
    text: "Minimali rotacija 8/2. Grafikas planuojamas iš anksto, kad galėtumėte ramiai grįžti namo.",
    tone: "bg-mint",
  },
  {
    icon: Home,
    title: "Apgyvendinimas nekainuoja",
    text: "Būstas objekte užtikrinamas be papildomų mokesčių.",
    tone: "bg-sky",
  },
  {
    icon: ShieldCheck,
    title: "Legalus darbas ir garantijos",
    text: "Darbo sutartis, A1 forma, laiku mokamas atlyginimas. Apmokame visus reikalingus sertifikatus ir kursus.",
    tone: "bg-peach",
  },
];

export function Benefits() {
  return (
    <section id="privalumai" className="py-4">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber">Privalumai</p>
        <h2 className="mt-1 text-3xl font-bold text-navy">Kodėl verta rinktis mus</h2>
        <p className="mt-2 max-w-2xl text-muted">
          Esame lietuviška komanda, kuri rūpinasi žmonėmis objekte ir namuose.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className={`rounded-3xl ${item.tone} p-6 shadow-sm`}>
              <item.icon className="h-8 w-8 text-navy" />
              <h3 className="mt-4 text-lg font-semibold text-navy">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
