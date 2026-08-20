import { BARBERS, DEFAULT_TIMES } from "../../../lib/barbers";
import { sendConfirmationEmail } from "../../../lib/email";
import { createManagementToken, hashManagementToken } from "../../../lib/management";
import { getBarberServices, intervalsOverlap, timeToMinutes } from "../../../lib/services";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

const allowedBarbers = new Set(Object.keys(BARBERS));
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const shortTime = (value: string) => value.slice(0, 5);

async function availability(barber: string, date: string, duration: number) {
  const db = createSupabaseAdminClient();
  const [bookedResult, overrideResult] = await Promise.all([
    db.from("reservations").select("appointment_time, service_duration").eq("barber_id", barber).eq("appointment_date", date).eq("status", "confirmed"),
    db.from("availability_overrides").select("appointment_time, enabled").eq("barber_id", barber).eq("appointment_date", date),
  ]);
  if (bookedResult.error) throw bookedResult.error; if (overrideResult.error) throw overrideResult.error;
  const booked = (bookedResult.data ?? []).map((row) => ({ time: shortTime(row.appointment_time), duration: row.service_duration ?? 30 }));
  const active = new Set(DEFAULT_TIMES);
  for (const row of overrideResult.data ?? []) { const time = shortTime(row.appointment_time); if (row.enabled) active.add(time); else active.delete(time); }
  return { bookedTimes: booked.map((row) => row.time), activeTimes: [...active].filter((candidate) => !booked.some((row) => intervalsOverlap(timeToMinutes(candidate), duration, timeToMinutes(row.time), row.duration))).sort() };
}

export async function GET(request: Request) {
  try { const params = new URL(request.url).searchParams; const barber = params.get("barber") ?? ""; const date = params.get("date") ?? ""; const serviceCode = params.get("service") ?? ""; if (!allowedBarbers.has(barber) || !datePattern.test(date)) return Response.json({ bookedTimes: [], activeTimes: DEFAULT_TIMES }); const service = (await getBarberServices(barber)).find((item) => item.code === serviceCode); if (!service) return Response.json({ bookedTimes: [], activeTimes: [] }); return Response.json(await availability(barber, date, service.durationMinutes)); }
  catch { return Response.json({ bookedTimes: [], activeTimes: DEFAULT_TIMES }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>; const barber = String(body.barber ?? ""), serviceCode = String(body.service ?? ""), date = String(body.date ?? ""), time = String(body.time ?? ""), name = String(body.name ?? "").trim(), phone = String(body.phone ?? "").trim(), email = String(body.email ?? "").trim().toLowerCase();
    if (!allowedBarbers.has(barber) || !datePattern.test(date) || !timePattern.test(time) || !name || !phone || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Revisa los datos de la reserva." }, { status: 400 });
    const service = (await getBarberServices(barber)).find((item) => item.code === serviceCode); if (!service) return Response.json({ error: "Selecciona un servicio disponible." }, { status: 400 });
    const current = await availability(barber, date, service.durationMinutes); if (!current.activeTimes.includes(time)) return Response.json({ error: "Esa hora ya no está disponible. Elige otra." }, { status: 409 });
    const managementToken = createManagementToken(); const managementTokenHash = await hashManagementToken(managementToken);
    const { error } = await createSupabaseAdminClient().from("reservations").insert({ barber_id: barber, appointment_date: date, appointment_time: time, service_code: service.code, service_name: service.name, service_duration: service.durationMinutes, price_cents: service.priceCents, customer_name: name, customer_phone: phone, customer_email: email, management_token_hash: managementTokenHash });
    if (error) { if (error.code === "23505") return Response.json({ error: "Esa hora acaba de ser reservada. Elige otra disponible." }, { status: 409 }); throw error; }
    const managementUrl = `${new URL(request.url).origin}/cita/${managementToken}`; const barberName = BARBERS[barber as keyof typeof BARBERS].name;
    const emailSent = await sendConfirmationEmail({ to: email, customerName: name, barberName, serviceName: service.name, price: `${(service.priceCents / 100).toFixed(2).replace(".", ",")} €`, date: new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`)), time, managementUrl });
    return Response.json({ ok: true, managementUrl, emailSent }, { status: 201 });
  } catch { return Response.json({ error: "No se pudo guardar la cita. Inténtalo de nuevo." }, { status: 500 }); }
}
