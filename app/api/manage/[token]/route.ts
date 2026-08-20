import { and, eq, ne } from "drizzle-orm";
import { getDb } from "../../../../db";
import { availabilityOverrides, reservations } from "../../../../db/schema";
import { BARBERS, DEFAULT_TIMES } from "../../../../lib/barbers";
import { hashManagementToken } from "../../../../lib/management";
import { intervalsOverlap, timeToMinutes } from "../../../../lib/services";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
async function findAppointment(token: string) { const hash = await hashManagementToken(token); const rows = await getDb().select().from(reservations).where(eq(reservations.managementTokenHash, hash)).limit(1); return rows[0] ?? null; }
async function timesFor(barber: string, date: string, currentId: number, requestedDuration: number) {
  const db = getDb(); const [overrides, booked] = await Promise.all([
    db.select().from(availabilityOverrides).where(and(eq(availabilityOverrides.barber, barber), eq(availabilityOverrides.appointmentDate, date))),
    db.select({ time: reservations.appointmentTime, duration: reservations.serviceDuration }).from(reservations).where(and(eq(reservations.barber, barber), eq(reservations.appointmentDate, date), eq(reservations.status, "confirmed"), ne(reservations.id, currentId))),
  ]);
  const active = new Set(DEFAULT_TIMES); for (const override of overrides) { if (override.enabled) active.add(override.appointmentTime); else active.delete(override.appointmentTime); }
  return [...active].filter((candidate) => !booked.some((item) => intervalsOverlap(timeToMinutes(candidate), requestedDuration, timeToMinutes(item.time), item.duration ?? 30))).sort();
}
export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params; const appointment = await findAppointment(token);
  if (!appointment) return Response.json({ error: "La cita no existe o el enlace ya no es válido." }, { status: 404 });
  const requestedDate = new URL(request.url).searchParams.get("date") || appointment.appointmentDate;
  if (!datePattern.test(requestedDate)) return Response.json({ error: "Fecha incorrecta" }, { status: 400 });
  const barber = BARBERS[appointment.barber as keyof typeof BARBERS];
  return Response.json({ appointment: { ...appointment, barberName: barber?.name ?? "Peluquero" }, availableTimes: await timesFor(appointment.barber, requestedDate, appointment.id, appointment.serviceDuration ?? 30) });
}
export async function PATCH(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params; const appointment = await findAppointment(token);
  if (!appointment) return Response.json({ error: "La cita no existe o el enlace ya no es válido." }, { status: 404 });
  const body = await request.json() as Record<string, unknown>; const action = String(body.action ?? "");
  if (action === "cancel") { await getDb().delete(reservations).where(eq(reservations.id, appointment.id)); return Response.json({ ok: true, cancelled: true }); }
  if (action === "reschedule") {
    const date = String(body.date ?? ""), time = String(body.time ?? "");
    if (!datePattern.test(date) || !timePattern.test(time)) return Response.json({ error: "Selecciona una fecha y una hora válidas." }, { status: 400 });
    const availableTimes = await timesFor(appointment.barber, date, appointment.id, appointment.serviceDuration ?? 30);
    if (!availableTimes.includes(time)) return Response.json({ error: "Esa hora ya no está disponible." }, { status: 409 });
    try { await getDb().update(reservations).set({ appointmentDate: date, appointmentTime: time }).where(eq(reservations.id, appointment.id)); return Response.json({ ok: true }); }
    catch { return Response.json({ error: "Esa hora acaba de ser reservada." }, { status: 409 }); }
  }
  return Response.json({ error: "Acción incorrecta" }, { status: 400 });
}
