import { createSupabaseAdminClient } from "./supabase/admin";

export const DEFAULT_SERVICES = [
  { code: "corte", name: "Corte", durationMinutes: 45, priceCents: 1000 },
  { code: "barba", name: "Barba", durationMinutes: 30, priceCents: 1000 },
  { code: "corte-barba", name: "Corte + barba", durationMinutes: 60, priceCents: 1500 },
] as const;

export async function getBarberServices(barber: string) {
  const { data, error } = await createSupabaseAdminClient().from("barber_services").select("code, name, duration_minutes, price_cents").eq("barber_id", barber).eq("enabled", true).order("id");
  if (error) throw error;
  return (data ?? []).map((row) => ({ code: row.code, name: row.name, durationMinutes: row.duration_minutes, priceCents: row.price_cents }));
}

export function timeToMinutes(value: string) { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; }
export function intervalsOverlap(startA: number, durationA: number, startB: number, durationB: number) { return startA < startB + durationB && startB < startA + durationA; }
