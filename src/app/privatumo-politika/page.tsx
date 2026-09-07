import Link from "next/link";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-bold text-navy">Privatumo politika</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          UAB „Statybos Personalas“ tvarko Jūsų asmens duomenis siekdama įvertinti kandidatūrą
          darbui statybose ir susisiekti dėl pasiūlymo. Renkame vardą, pavardę, telefoną, miestą,
          specialybę, kalbas, vairuotojo pažymėjimo duomenis, CV ir komentarus.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Teisinis pagrindas – Jūsų sutikimas ir veiksmai prieš sudarant sutartį (BDAR 6 str. 1
          dalies a ir b punktai). Duomenys saugomi iki 24 mėnesių nuo paraiškos, nebent tapote
          darbuotoju – tuomet taikomi darbo teisės terminai.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Turite teisę susipažinti su duomenimis, juos taisyti, ištrinti, apriboti tvarkymą ir
          pateikti skundą Valstybinei duomenų apsaugos inspekcijai. Rašykite: info@statybos-personalo.lt
        </p>
        <Link href="/" className="mt-8 inline-block text-navy underline">
          Grįžti į pradžią
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
