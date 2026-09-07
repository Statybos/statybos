import { loginAction } from "@/app/actions/auth";
import { HardHat } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ klaida?: string }>;
}) {
  const { klaida } = await searchParams;
  return (
    <div className="grid min-h-screen place-items-center bg-navy px-4">
      <form action={loginAction} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-2 font-semibold text-navy">
          <HardHat className="h-5 w-5 text-amber" />
          Administracija
        </div>
        <label className="grid gap-1 text-sm">
          El. paštas
          <input
            name="email"
            type="email"
            required
            defaultValue="admin@statybos.lt"
            className="rounded-xl border px-3 py-2"
          />
        </label>
        <label className="mt-3 grid gap-1 text-sm">
          Slaptažodis
          <input name="password" type="password" required className="rounded-xl border px-3 py-2" />
        </label>
        {klaida ? (
          <p className="mt-3 text-sm text-red-600">Neteisingas el. paštas arba slaptažodis</p>
        ) : null}
        <button className="mt-4 w-full rounded-full bg-amber py-2.5 font-semibold text-navy">
          Prisijungti
        </button>
      </form>
    </div>
  );
}
