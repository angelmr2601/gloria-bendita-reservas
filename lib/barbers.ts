export const DEFAULT_TIMES = ["09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"];

export const BARBERS = {
  "peluquero-1": { id: "peluquero-1", name: "Javi Pérez", email: "javi.perez@gloriabendita.es" },
  "peluquero-2": { id: "peluquero-2", name: "Iván", email: "ivan@gloriabendita.es" },
} as const;

export type BarberId = keyof typeof BARBERS;

declare global {
  var __GLORIA_BENDITA_BARBER_1_ADMIN_EMAIL__: string | undefined;
}

export function barberFromEmail(email: string): BarberId | null {
  const normalized = email.trim().toLowerCase();
  const barber1AdminEmail = globalThis.__GLORIA_BENDITA_BARBER_1_ADMIN_EMAIL__?.trim().toLowerCase();
  if (normalized === BARBERS["peluquero-1"].email || (barber1AdminEmail && normalized === barber1AdminEmail)) return "peluquero-1";
  if (normalized === BARBERS["peluquero-2"].email) return "peluquero-2";
  return null;
}
