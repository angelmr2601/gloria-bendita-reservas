import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { barberServices } from "../db/schema";

export const DEFAULT_SERVICES = [
  { code: "corte", name: "Corte", durationMinutes: 45, priceCents: 1000 },
  { code: "barba", name: "Barba", durationMinutes: 30, priceCents: 1000 },
  { code: "corte-barba", name: "Corte + barba", durationMinutes: 60, priceCents: 1500 },
] as const;

export async function getBarberServices(barber: string) {
  const db = getDb();
  for (const service of DEFAULT_SERVICES) {
    await db.insert(barberServices).values({ barber, ...service, enabled: true }).onConflictDoNothing({ target: [barberServices.barber, barberServices.code] });
  }
  return db.select().from(barberServices).where(and(eq(barberServices.barber, barber), eq(barberServices.enabled, true)));
}

export function timeToMinutes(value: string) { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; }
export function intervalsOverlap(startA: number, durationA: number, startB: number, durationB: number) { return startA < startB + durationB && startB < startA + durationA; }
