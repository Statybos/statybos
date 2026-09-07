export const COUNTRIES = [
  "Olandija",
  "Vokietija",
  "Švedija",
  "Belgija",
  "Norvegija",
  "Suomija",
] as const;

export const SPECIALTIES = [
  "Elektrikas",
  "Mūrininkas",
  "Suvirintojas",
  "Betonuotojas",
  "Stogdengys",
  "Santechnikas",
  "Apdailininkas",
  "Pagalbinis darbininkas",
  "Brigadininkas",
] as const;

export const DRIVER_LICENSES = ["Nėra", "B", "C", "CE"] as const;

export const LANGUAGES = ["Anglų", "Vokiečių", "Olandų", "Rusų", "Nėra"] as const;

export const PHONE_CODES = [
  { code: "+370", label: "LT +370" },
  { code: "+371", label: "LV +371" },
  { code: "+372", label: "EE +372" },
  { code: "+48", label: "PL +48" },
  { code: "+49", label: "DE +49" },
  { code: "+31", label: "NL +31" },
  { code: "+46", label: "SE +46" },
] as const;

export const CANDIDATE_STATUSES = [
  { key: "NEW", label: "Nauji" },
  { key: "IN_REVIEW", label: "Svarstomi" },
  { key: "APPROVED", label: "Tinkami" },
  { key: "REJECTED", label: "Atmesti" },
] as const;

export const EMPLOYEE_STATUSES = [
  { key: "ON_SITE", label: "Gamyboje" },
  { key: "ON_LEAVE", label: "Atostogose LT" },
  { key: "BENCH_LT", label: "Laisvas / Laukia objekto" },
  { key: "INACTIVE", label: "Atleistas" },
] as const;

export const DEPLOYMENT_TYPES = [
  { key: "WORK", label: "Dirba objekte" },
  { key: "VACATION_LT", label: "Atostogos namo (LT)" },
  { key: "TRANSIT", label: "Tranzitas / Kelionė" },
] as const;

export function candidateStatusLabel(status: string) {
  return CANDIDATE_STATUSES.find((s) => s.key === status)?.label ?? status;
}

export function employeeStatusLabel(status: string) {
  return EMPLOYEE_STATUSES.find((s) => s.key === status)?.label ?? status;
}

export function deploymentTypeLabel(type: string) {
  return DEPLOYMENT_TYPES.find((s) => s.key === type)?.label ?? type;
}
