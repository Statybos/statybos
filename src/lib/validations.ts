import { z } from "zod";

export const applicationSchema = z.object({
  fullName: z.string().trim().min(3, "Įveskite vardą ir pavardę"),
  phone: z
    .string()
    .trim()
    .min(8, "Įveskite telefono numerį")
    .regex(/^[+\d][\d\s-]{7,18}$/, "Neteisingas telefono numeris"),
  cityLt: z.string().trim().min(2, "Įveskite miestą"),
  driverLicense: z.enum(["Turiu B", "B neturiu"]),
  english: z.enum(["Nemoku", "Silpnai", "Gerai", "Puikiai"]),
  availableFrom: z.string().optional(),
  comment: z.string().optional(),
  jobId: z.string().optional(),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
