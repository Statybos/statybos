const faqs = [
  {
    q: "Ar apgyvendinimas tikrai nemokamas?",
    a: "Taip. Apgyvendinimas objekte nekainuoja – būstas užtikrinamas be papildomų mokesčių.",
  },
  {
    q: "Kaip veikia rotacijos?",
    a: "Minimali rotacija 8/2 – dirbate sutartą laiką objekte, po to grįžtate namo. Datas deriname iš anksto.",
  },
  {
    q: "Ar darbas legalus?",
    a: "Taip. Pasirašome darbo sutartį, tvarkome A1 formą, mokame mokesčius ir socialines įmokas.",
  },
];

const testimonials = [
  {
    name: "Tomas",
    text: "Rotacija 8/2 veikia kaip žadėta, atlyginimas laiku. Apgyvendinimas tvarkingas.",
  },
  {
    name: "Andrius",
    text: "Komanda lietuviška, koordinacija aiški. Rekomenduoju kitiems.",
  },
  {
    name: "Mantas",
    text: "Geros sąlygos objekte, viskas buvo paaiškinta prieš išvykstant ir atlyginimas mokamas laiku.",
  },
];

export function FaqAndReviews() {
  return (
    <section id="duk" className="py-4">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-2">
        <div className="rounded-3xl bg-sky p-6 md:p-8">
          <h2 className="text-3xl font-bold text-navy">Atsiliepimai</h2>
          <div className="mt-6 grid gap-4">
            {testimonials.map((t) => (
              <blockquote key={t.name} className="rounded-2xl bg-white/70 p-5 shadow-sm">
                <p className="text-ink/90">“{t.text}”</p>
                <footer className="mt-3 text-sm font-medium text-amber">{t.name}</footer>
              </blockquote>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-mint p-6 md:p-8">
          <h2 className="text-3xl font-bold text-navy">Dažniausiai užduodami klausimai</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((item) => (
              <details key={item.q} className="rounded-2xl bg-white/70 p-4 shadow-sm">
                <summary className="cursor-pointer font-semibold text-navy">{item.q}</summary>
                <p className="mt-2 text-sm text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
