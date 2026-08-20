import { and, eq, ne } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { availabilityOverrides, barberServices, reservations } from "../../../db/schema";
import { BARBERS, barberFromEmail, DEFAULT_TIMES } from "../../../lib/barbers";
import { getBarberServices, intervalsOverlap, timeToMinutes } from "../../../lib/services";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
async function authorizedBarber() { const user = await getChatGPTUser(); if (!user) return null; const id = barberFromEmail(user.email); return id ? BARBERS[id] : null; }
export async function GET(request: Request) {
  const barber = await authorizedBarber(); if (!barber) return Response.json({ error: "No autorizado" }, { status: 401 });
  const date = new URL(request.url).searchParams.get("date") ?? ""; if (!datePattern.test(date)) return Response.json({ error: "Fecha incorrecta" }, { status: 400 });
  const db = getDb();
  const [appointments, overrides, services] = await Promise.all([
    db.select().from(reservations).where(and(eq(reservations.barber, barber.id), eq(reservations.appointmentDate, date), eq(reservations.status, "confirmed"))),
    db.select().from(availabilityOverrides).where(and(eq(availabilityOverrides.barber, barber.id), eq(availabilityOverrides.appointmentDate, date))),
    getBarberServices(barber.id),
  ]);
  const active = new Set(DEFAULT_TIMES); for (const override of overrides) { if (override.enabled) active.add(override.appointmentTime); else active.delete(override.appointmentTime); }
  return Response.json({ barber, appointments: appointments.sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime)), activeTimes: [...active].sort(), defaultTimes: DEFAULT_TIMES, services });
}
export async function PATCH(request: Request) {
  const barber = await authorizedBarber(); if (!barber) return Response.json({ error: "No autorizado" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>; const action = String(body.action ?? ""); const db = getDb();
    if (action === "cancel") { const id = Number(body.id); if (!Number.isInteger(id)) return Response.json({ error: "Cita incorrecta" }, { status: 400 }); await db.delete(reservations).where(and(eq(reservations.id, id), eq(reservations.barber, barber.id))); return Response.json({ ok: true }); }
    if (action === "reschedule") { const id = Number(body.id), date = String(body.date ?? ""), time = String(body.time ?? ""); if (!Number.isInteger(id) || !datePattern.test(date) || !timePattern.test(time)) return Response.json({ error: "Nueva fecha u hora incorrecta" }, { status: 400 }); const currentRows = await db.select().from(reservations).where(and(eq(reservations.id, id), eq(reservations.barber, barber.id))).limit(1); const current = currentRows[0]; if (!current) return Response.json({ error: "Cita no encontrada" }, { status: 404 }); const others = await db.select({ time: reservations.appointmentTime, duration: reservations.serviceDuration }).from(reservations).where(and(eq(reservations.barber, barber.id), eq(reservations.appointmentDate, date), ne(reservations.id, id), eq(reservations.status, "confirmed"))); if (others.some((item) => intervalsOverlap(timeToMinutes(time), current.serviceDuration ?? 30, timeToMinutes(item.time), item.duration ?? 30))) return Response.json({ error: "Esa hora se solapa con otra cita." }, { status: 409 }); await db.update(reservations).set({ appointmentDate: date, appointmentTime: time }).where(and(eq(reservations.id, id), eq(reservations.barber, barber.id))); return Response.json({ ok: true }); }
    if (action === "availability") { const date = String(body.date ?? ""), time = String(body.time ?? ""), enabled = Boolean(body.enabled); if (!datePattern.test(date) || !timePattern.test(time)) return Response.json({ error: "Hora incorrecta" }, { status: 400 }); await db.insert(availabilityOverrides).values({ barber: barber.id, appointmentDate: date, appointmentTime: time, enabled }).onConflictDoUpdate({ target: [availabilityOverrides.barber, availabilityOverrides.appointmentDate, availabilityOverrides.appointmentTime], set: { enabled } }); return Response.json({ ok: true }); }
    if (action === "service_price") { const code = String(body.code ?? ""), priceCents = Number(body.priceCents); if (!code || !Number.isInteger(priceCents) || priceCents < 0 || priceCents > 100000) return Response.json({ error: "Precio incorrecto" }, { status: 400 }); await getBarberServices(barber.id); await db.update(barberServices).set({ priceCents }).where(and(eq(barberServices.barber, barber.id), eq(barberServices.code, code))); return Response.json({ ok: true }); }
    return Response.json({ error: "Acción incorrecta" }, { status: 400 });
  } catch (error) { const message = error instanceof Error ? error.message.toLowerCase() : ""; if (message.includes("unique")) return Response.json({ error: "Esa hora ya está ocupada." }, { status: 409 }); return Response.json({ error: "No se pudo guardar el cambio." }, { status: 500 }); }
}
