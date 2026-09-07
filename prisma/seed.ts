import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.deployment.deleteMany();
  await prisma.employeeDocument.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.jobPosting.deleteMany();
  await prisma.projectObject.deleteMany();

  const jobs = await prisma.jobPosting.createManyAndReturn({
    data: [
      {
        title: "Elektrikai Vokietijoje",
        country: "Vokietija",
        city: "Miunchenas",
        salaryText: "18–22 €/val. neto",
        specialty: "Elektrikas",
        isActive: true,
        requirements:
          "Elektros instaliacijos patirtis, VDE pagrindai, pageidautina vokiečių kalba A2.",
        description:
          "Gyvenamųjų ir komercinių objektų elektros montavimas. Komandiruotės 6/2 rotacija, apmokamas būstas ir kelionės.",
      },
      {
        title: "Mūrininkai Olandijoje",
        country: "Olandija",
        city: "Amsterdamas",
        salaryText: "19–24 €/val. neto",
        specialty: "Mūrininkas",
        isActive: true,
        requirements: "Blokelių ir plytų mūras, skaityti brėžinius, B kategorija privalumas.",
        description:
          "Hangaro ir daugiabučių mūro darbai Amsterdame. 4/1 rotacija, modernus būstas, legalus įdarbinimas.",
      },
      {
        title: "Suvirintojai Švedijoje",
        country: "Švedija",
        city: "Geteborgas",
        salaryText: "21–26 €/val. neto",
        specialty: "Suvirintojas",
        isActive: true,
        requirements: "MAG/MIG sertifikatai, konstrukcinis plienas, anglų kalba B1.",
        description:
          "Plieno konstrukcijų suvirinimas pramonės objekte. 6/2 grafikas, A1 forma ir visos socialinės garantijos.",
      },
      {
        title: "Pagalbiniai darbininkai Belgijoje",
        country: "Belgija",
        city: "Antverpenas",
        salaryText: "15–17 €/val. neto",
        specialty: "Pagalbinis darbininkas",
        isActive: true,
        requirements: "Fizinis pasirengimas, darbas komandoje, pageidautina B vairuotojo pažymėjimas.",
        description:
          "Pagalba karkaso ir apdailos brigadoms. Apmokamos kelionės, būstas, aiškus grafikas.",
      },
      {
        title: "Betonuotojai Vokietijoje (juodraštis)",
        country: "Vokietija",
        city: "Hamburgas",
        salaryText: "17–20 €/val. neto",
        specialty: "Betonuotojas",
        isActive: false,
        requirements: "Klojinių ir armatūros patirtis.",
        description: "Ruošiamas naujas objektas Hamburgui – skelbimas dar neviešinamas.",
      },
    ],
  });

  const jobByTitle = Object.fromEntries(jobs.map((j) => [j.title, j]));

  const candidates = await prisma.candidate.createManyAndReturn({
    data: [
      {
        jobId: jobByTitle["Elektrikai Vokietijoje"]?.id,
        fullName: "Tomas Kazlauskas",
        phone: "+37061234567",
        cityLt: "Kaunas",
        specialty: "Elektrikas",
        languages: JSON.stringify(["Anglų", "Vokiečių"]),
        driverLicense: "B",
        availableFrom: new Date("2026-09-15"),
        status: "NEW",
        comment: "Dirbo Vokietijoje 2 sezonus.",
        notes: JSON.stringify([]),
      },
      {
        jobId: jobByTitle["Mūrininkai Olandijoje"]?.id,
        fullName: "Andrius Jankauskas",
        phone: "+37069811223",
        cityLt: "Šiauliai",
        specialty: "Mūrininkas",
        languages: JSON.stringify(["Rusų"]),
        driverLicense: "C",
        availableFrom: new Date("2026-09-08"),
        status: "IN_REVIEW",
        notes: JSON.stringify([
          { at: new Date().toISOString(), text: "Paskambinta – laukia pasiūlymo." },
        ]),
      },
      {
        fullName: "Greta Petrauskienė",
        phone: "+37060099887",
        cityLt: "Vilnius",
        specialty: "Apdailininkas",
        languages: JSON.stringify(["Anglų"]),
        driverLicense: "B",
        status: "APPROVED",
        notes: JSON.stringify([]),
      },
      {
        fullName: "Mindaugas Stankevičius",
        phone: "+37067733441",
        cityLt: "Klaipėda",
        specialty: "Suvirintojas",
        languages: JSON.stringify(["Anglų", "Rusų"]),
        driverLicense: "CE",
        status: "REJECTED",
        notes: JSON.stringify([{ at: new Date().toISOString(), text: "Neturi galiojančių sertifikatų." }]),
      },
      {
        fullName: "Darius Navickas",
        phone: "+37065522110",
        cityLt: "Panevėžys",
        specialty: "Betonuotojas",
        languages: JSON.stringify(["Nėra"]),
        driverLicense: "Nėra",
        status: "HIRED",
        notes: JSON.stringify([]),
      },
    ],
  });

  const hired = candidates.find((c) => c.fullName === "Darius Navickas");

  const objects = await prisma.projectObject.createManyAndReturn({
    data: [
      {
        title: "Amsterdam Hangar",
        country: "Olandija",
        address: "Havenstraat 12, Amsterdam",
        clientName: "NordBuild BV",
        requiredHeadcount: 1,
        status: "ACTIVE",
      },
      {
        title: "Munich Housing",
        country: "Vokietija",
        address: "Baustelle 8, München",
        clientName: "BayerBau GmbH",
        requiredHeadcount: 1,
        status: "ACTIVE",
      },
      {
        title: "Göteborg Steel",
        country: "Švedija",
        address: "Industrivägen 4, Göteborg",
        clientName: "NordStål AB",
        requiredHeadcount: 2,
        status: "ACTIVE",
      },
      {
        title: "Helsinki Tower",
        country: "Suomija",
        address: "Rakennuskatu 1, Helsinki",
        clientName: "SuomiBuild Oy",
        requiredHeadcount: 9,
        status: "ACTIVE",
      },
    ],
  });

  const amsterdam = objects.find((o) => o.title === "Amsterdam Hangar")!;
  const munich = objects.find((o) => o.title === "Munich Housing")!;
  const helsinki = objects.find((o) => o.title === "Helsinki Tower")!;

  const employees = await prisma.employee.createManyAndReturn({
    data: [
      {
        candidateId: hired?.id,
        firstName: "Darius",
        lastName: "Navickas",
        personalCode: "38501011234",
        phone: "+37065522110",
        email: "darius.navickas@mail.lt",
        addressLt: "Ukmergės g. 12, Panevėžys",
        iban: "LT12 1000 0111 0100 1000",
        specialty: "Betonuotojas",
        hourlyRate: 18.5,
        wageHistory: JSON.stringify([
          { rate: 18.5, changedAt: new Date("2026-08-01").toISOString() },
          { rate: 17, changedAt: new Date("2026-03-15").toISOString() },
        ]),
        status: "ON_SITE",
        assignedObjectId: amsterdam.id,
        a1Expiry: new Date("2027-03-01"),
        contractExpiry: new Date("2027-01-15"),
        idCardExpiry: new Date("2030-05-20"),
      },
      {
        firstName: "Rokas",
        lastName: "Žukauskas",
        personalCode: "39003124567",
        phone: "+37061122334",
        email: "rokas.z@mail.lt",
        addressLt: "Savanorių pr. 88, Kaunas",
        iban: "LT33 7044 0600 0000 0077",
        specialty: "Elektrikas",
        hourlyRate: 20,
        wageHistory: JSON.stringify([{ rate: 20, changedAt: new Date("2026-07-01").toISOString() }]),
        status: "ON_SITE",
        assignedObjectId: munich.id,
        a1Expiry: new Date("2026-12-01"),
        contractExpiry: new Date("2026-11-30"),
        idCardExpiry: new Date("2029-08-12"),
      },
      {
        firstName: "Linas",
        lastName: "Paulauskas",
        personalCode: "38811223344",
        phone: "+37062233445",
        email: "linas.p@mail.lt",
        addressLt: "Taikos pr. 5, Klaipėda",
        iban: "LT98 4010 0425 0000 1234",
        specialty: "Mūrininkas",
        hourlyRate: 19,
        wageHistory: JSON.stringify([{ rate: 19, changedAt: new Date("2026-05-01").toISOString() }]),
        status: "ON_LEAVE",
        a1Expiry: new Date("2027-06-01"),
        contractExpiry: new Date("2027-02-01"),
        idCardExpiry: new Date("2028-01-01"),
      },
      {
        firstName: "Vytautas",
        lastName: "Baranauskas",
        personalCode: "39207079876",
        phone: "+37063344556",
        email: "vytautas.b@mail.lt",
        addressLt: "J. Basanavičiaus g. 3, Vilnius",
        iban: "LT21 7300 0101 0000 5555",
        specialty: "Suvirintojas",
        hourlyRate: 21,
        wageHistory: JSON.stringify([{ rate: 21, changedAt: new Date("2026-04-01").toISOString() }]),
        status: "BENCH_LT",
        a1Expiry: new Date("2027-09-01"),
        contractExpiry: new Date("2027-04-01"),
        idCardExpiry: new Date("2031-03-03"),
      },
      {
        firstName: "Evaldas",
        lastName: "Rimkus",
        personalCode: "38612120011",
        phone: "+37064455667",
        email: "evaldas.r@mail.lt",
        addressLt: "Vilniaus g. 9, Šiauliai",
        iban: "LT15 5010 0000 0000 8888",
        specialty: "Pagalbinis darbininkas",
        hourlyRate: 15.5,
        wageHistory: JSON.stringify([{ rate: 15.5, changedAt: new Date("2026-07-10").toISOString() }]),
        status: "BENCH_LT",
        a1Expiry: new Date("2026-10-15"),
        contractExpiry: new Date("2026-12-31"),
        idCardExpiry: new Date("2027-07-07"),
      },
      {
        firstName: "Jonas",
        lastName: "Petraitis",
        personalCode: "38505051111",
        phone: "+37060011122",
        email: "jonas.p@mail.lt",
        addressLt: "Gedimino pr. 1, Vilnius",
        iban: "LT11 1010 0000 0000 1111",
        specialty: "Mūrininkas",
        hourlyRate: 19.5,
        wageHistory: JSON.stringify([
          { rate: 19.5, changedAt: new Date("2026-08-20").toISOString() },
          { rate: 18, changedAt: new Date("2026-02-01").toISOString() },
        ]),
        status: "ON_SITE",
        assignedObjectId: helsinki.id,
        a1Expiry: new Date("2027-05-01"),
        contractExpiry: new Date("2027-03-01"),
        idCardExpiry: new Date("2030-01-01"),
      },
      {
        firstName: "Mantas",
        lastName: "Kazlauskas",
        personalCode: "39006062222",
        phone: "+37060022233",
        email: "mantas.k@mail.lt",
        addressLt: "Laisvės al. 10, Kaunas",
        iban: "LT22 2020 0000 0000 2222",
        specialty: "Mūrininkas",
        hourlyRate: 19,
        wageHistory: JSON.stringify([{ rate: 19, changedAt: new Date("2026-08-01").toISOString() }]),
        status: "ON_SITE",
        assignedObjectId: helsinki.id,
        a1Expiry: new Date("2027-05-01"),
        contractExpiry: new Date("2027-03-01"),
        idCardExpiry: new Date("2030-02-01"),
      },
      {
        firstName: "Saulius",
        lastName: "Jonaitis",
        personalCode: "38807073333",
        phone: "+37060033344",
        email: "saulius.j@mail.lt",
        addressLt: "Tilžės g. 4, Šiauliai",
        iban: "LT33 3030 0000 0000 3333",
        specialty: "Elektrikas",
        hourlyRate: 20.5,
        wageHistory: JSON.stringify([{ rate: 20.5, changedAt: new Date("2026-07-15").toISOString() }]),
        status: "ON_SITE",
        assignedObjectId: helsinki.id,
        a1Expiry: new Date("2027-04-01"),
        contractExpiry: new Date("2027-02-15"),
        idCardExpiry: new Date("2029-11-11"),
      },
      {
        firstName: "Karolis",
        lastName: "Zujus",
        personalCode: "39108084444",
        phone: "+37060044455",
        email: "karolis.z@mail.lt",
        addressLt: "Minijos g. 8, Klaipėda",
        iban: "LT44 4040 0000 0000 4444",
        specialty: "Betonuotojas",
        status: "ON_SITE",
        assignedObjectId: helsinki.id,
        a1Expiry: new Date("2027-06-01"),
        contractExpiry: new Date("2027-04-01"),
        idCardExpiry: new Date("2031-01-01"),
      },
      {
        firstName: "Tadas",
        lastName: "Vaitkus",
        personalCode: "38709095555",
        phone: "+37060055566",
        email: "tadas.v@mail.lt",
        addressLt: "Respublikos g. 2, Panevėžys",
        iban: "LT55 5050 0000 0000 5555",
        specialty: "Apdailininkas",
        status: "ON_SITE",
        assignedObjectId: helsinki.id,
        a1Expiry: new Date("2027-07-01"),
        contractExpiry: new Date("2027-05-01"),
        idCardExpiry: new Date("2030-06-01"),
      },
      {
        firstName: "Giedrius",
        lastName: "Morkūnas",
        personalCode: "38610106666",
        phone: "+37060066677",
        email: "giedrius.m@mail.lt",
        addressLt: "Vytauto g. 15, Marijampolė",
        iban: "LT66 6060 0000 0000 6666",
        specialty: "Pagalbinis darbininkas",
        status: "ON_SITE",
        assignedObjectId: helsinki.id,
        a1Expiry: new Date("2027-03-01"),
        contractExpiry: new Date("2027-01-01"),
        idCardExpiry: new Date("2028-12-12"),
      },
      {
        firstName: "Arnas",
        lastName: "Šimkus",
        personalCode: "39211117777",
        phone: "+37060077788",
        email: "arnas.s@mail.lt",
        addressLt: "J. Janonio g. 7, Alytus",
        iban: "LT77 7070 0000 0000 7777",
        specialty: "Suvirintojas",
        status: "ON_SITE",
        assignedObjectId: helsinki.id,
        a1Expiry: new Date("2027-08-01"),
        contractExpiry: new Date("2027-06-01"),
        idCardExpiry: new Date("2031-09-09"),
      },
      {
        firstName: "Povilas",
        lastName: "Urbonas",
        personalCode: "38912128888",
        phone: "+37060088899",
        email: "povilas.u@mail.lt",
        addressLt: "Kęstučio g. 3, Telšiai",
        iban: "LT88 8080 0000 0000 8888",
        specialty: "Mūrininkas",
        status: "ON_LEAVE",
        assignedObjectId: helsinki.id,
        a1Expiry: new Date("2027-05-01"),
        contractExpiry: new Date("2027-03-01"),
        idCardExpiry: new Date("2029-04-04"),
      },
      {
        firstName: "Deividas",
        lastName: "Ramanauskas",
        personalCode: "39301019999",
        phone: "+37060099900",
        email: "deividas.r@mail.lt",
        addressLt: "Sodų g. 11, Utena",
        iban: "LT99 9090 0000 0000 9999",
        specialty: "Mūrininkas",
        status: "BENCH_LT",
        a1Expiry: new Date("2027-09-01"),
        contractExpiry: new Date("2027-07-01"),
        idCardExpiry: new Date("2032-02-02"),
      },
    ],
  });

  for (const e of employees) {
    if (!e.hourlyRate) {
      const rate =
        e.specialty === "Pagalbinis darbininkas"
          ? 15.5
          : e.specialty === "Suvirintojas"
            ? 21
            : e.specialty === "Elektrikas"
              ? 20
              : 18;
      await prisma.employee.update({
        where: { id: e.id },
        data: {
          hourlyRate: rate,
          wageHistory: JSON.stringify([{ rate, changedAt: new Date("2026-08-01").toISOString() }]),
        },
      });
    }
  }

  const darius = employees.find((e) => e.lastName === "Navickas")!;
  const rokas = employees.find((e) => e.lastName === "Žukauskas")!;
  const linas = employees.find((e) => e.lastName === "Paulauskas")!;
  const jonas = employees.find((e) => e.lastName === "Petraitis")!;
  const mantas = employees.find((e) => e.lastName === "Kazlauskas")!;
  const saulius = employees.find((e) => e.lastName === "Jonaitis")!;
  const karolis = employees.find((e) => e.lastName === "Zujus")!;
  const tadas = employees.find((e) => e.lastName === "Vaitkus")!;
  const giedrius = employees.find((e) => e.lastName === "Morkūnas")!;
  const arnas = employees.find((e) => e.lastName === "Šimkus")!;
  const povilas = employees.find((e) => e.lastName === "Urbonas")!;

  const today = new Date();
  const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };

  const helsinkiWorkers = [jonas, mantas, saulius, karolis, tadas, giedrius, arnas, povilas];

  await prisma.deployment.createMany({
    data: [
      {
        employeeId: darius.id,
        objectId: amsterdam.id,
        startDate: addDays(today, -14),
        endDate: addDays(today, 21),
        type: "WORK",
        notes: "Hangaro grindų betonavimas",
      },
      {
        employeeId: rokas.id,
        objectId: munich.id,
        startDate: addDays(today, -7),
        endDate: addDays(today, 35),
        type: "WORK",
        notes: "Butų elektros instaliacija",
      },
      {
        employeeId: linas.id,
        objectId: amsterdam.id,
        startDate: addDays(today, -28),
        endDate: addDays(today, -2),
        type: "WORK",
        notes: "Baigtas etapas",
      },
      {
        employeeId: linas.id,
        startDate: addDays(today, -1),
        endDate: addDays(today, 13),
        type: "VACATION_LT",
        notes: "Rotacija namo 2 sav.",
      },
      ...helsinkiWorkers.map((e) => ({
        employeeId: e.id,
        objectId: helsinki.id,
        startDate: addDays(today, -21),
        endDate: addDays(today, 45),
        type: "WORK",
        notes: "Helsinki Tower montavimas",
      })),
      {
        employeeId: povilas.id,
        startDate: addDays(today, -3),
        endDate: addDays(today, 11),
        type: "VACATION_LT",
        notes: "Rotacija LT 2 sav.",
      },
      {
        employeeId: tadas.id,
        startDate: addDays(today, 5),
        endDate: addDays(today, 18),
        type: "VACATION_LT",
        notes: "Planuojamos atostogos",
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
