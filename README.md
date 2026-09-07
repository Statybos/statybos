# Statybos Personalas

Statybų personalo įdarbinimo ir komandiruočių valdymo platforma (LT).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite (lengva pradžia; galima perjungti į PostgreSQL/Supabase)
- JWT cookie autentifikacija admin zonai
- Server Actions + Zod validacija

## Paleidimas

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

- Viešas puslapis: http://localhost:3000
- Admin: http://localhost:3000/admin/login  
  Demo: `admin@statybos.lt` / `admin123`

## Funkcijos

1. **Landing** – hero, skelbimai, privalumai, kandidatavimo forma, D.U.K., privatumo politika
2. **Kandidatai** – ATS filtrai (Nauji → Įdarbinti), pastabos, konversija į darbuotoją
3. **Darbuotojai** – CRUD profiliai, dokumentų datos, statusai
4. **Skelbimai** – aktyvūs / juodraščiai viešam puslapiui
5. **Planuoklis** – objektų laiko juosta, laisvo personalo sidebar, konfliktų tikrinimas

## Naudingos komandos

| Komanda | Aprašymas |
|---------|-----------|
| `npm run db:push` | Sinchronizuoti schemą |
| `npm run db:seed` | Demo duomenys |
| `npm run db:reset` | Iš naujo sukurti DB + seed |
| `npm run build` | Produkcijos build |
