import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { availabilityOverrides, reservations } from "../../../db/schema";
import { BARBERS, DEFAULT_TIMES } from "../../../lib/barbers";
import { sendConfirmationEmail } from "../../../lib/email";
import { createManagementToken, hashManagementToken } from "../../../lib/management";
import { getBarberServices, intervalsOverlap, timeToMinutes } from "../../../lib/services";
const allowedBarbers = new Set(Object.keys(BARBERS));
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;
async function availability(barber: string, date: string, duration: number) {
  const db = getDb();
  const [booked, overrides] = await Promise.all([
    db.select({ time: reservations.appointmentTime, duration: reservations.serviceDuration }).from(reservations).where(and(eq(reservations.barber, barber), eq(reservations.appointmentDate, date), eq(reservations.status, "confirmed"))),
    db.select({ time: availabilityOverrides.appointmentTime, enabled: availabilityOverrides.enabled }).from(availabilityOverrides).where(and(eq(availabilityOverrides.barber, barber), eq(availabilityOverrides.appointmentDate, date))),
  ]);
  const active = new Set(DEFAULT_TIMES);
  for (const override of overrides) {
    if (override.enabled) active.add(override.time); else active.delete(override.time);
  }
  const activeTimes = [...active].filter((candidate) => !booked.some((row) => intervalsOverlap(timeToMinutes(candidate), duration, timeToMinutes(row.time), row.duration ?? 30))).sort();
  return { bookedTimes: booked.map((row) => row.time), activeTimes };
}
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url); const barber = searchParams.get("barber") ?? ""; const date = searchParams.get("date") ?? ""; const serviceCode = searchParams.get("service") ?? "";
    if (!allowedBarbers.has(barber) || !datePattern.test(date)) return Response.json({ bookedTimes: [], activeTimes: DEFAULT_TIMES });
    const service = (await getBarberServices(barber)).find((item) => item.code === serviceCode);
    if (!service) return Response.json({ bookedTimes: [], activeTimes: [] });
    return Response.json(await availability(barber, date, service.durationMinutes));
  } catch { return Response.json({ bookedTimes: [], activeTimes: DEFAULT_TIMES }); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const barber = String(body.barber ?? ""), serviceCode = String(body.service ?? ""), date = String(body.date ?? ""), time = String(body.time ?? ""), name = String(body.name ?? "").trim(), phone = String(body.phone ?? "").trim(), email = String(body.email ?? "").trim().toLowerCase();
    if (!allowedBarbers.has(barber) || !datePattern.test(date) || !timePattern.test(time) || !name || !phone || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Revisa los datos de la reserva." }, { status: 400 });
    const service = (await getBarberServices(barber)).find((item) => item.code === serviceCode);
    if (!service) return Response.json({ error: "Selecciona un servicio disponible." }, { status: 400 });
    const current = await availability(barber, date, service.durationMinutes);
    if (!current.activeTimes.includes(time) || current.bookedTimes.includes(time)) return Response.json({ error: "Esa hora ya no está disponible. Elige otra." }, { status: 409 });
    const managementToken = createManagementToken();
    const managementTokenHash = await hashManagementToken(managementToken);
    await getDb().insert(reservations).values({ barber, appointmentDate: date, appointmentTime: time, serviceCode: service.code, serviceName: service.name, serviceDuration: service.durationMinutes, priceCents: service.priceCents, customerName: name, customerPhone: phone, customerEmail: email, managementTokenHash });
    const managementUrl = `${new URL(request.url).origin}/cita/${managementToken}`;
    const barberName = BARBERS[barber as keyof typeof BARBERS].name;
    const emailSent = await sendConfirmationEmail({ to: email, customerName: name, barberName, serviceName: service.name, price: `${(service.priceCents / 100).toFixed(2).replace(".", ",")} €`, date: new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`)), time, managementUrl });
    return Response.json({ ok: true, managementUrl, emailSent }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("unique")) return Response.json({ error: "Esa hora acaba de ser reservada. Elige otra disponible." }, { status: 409 });
    return Response.json({ error: "No se pudo guardar la cita. Inténtalo de nuevo." }, { status: 500 });
  }
}
