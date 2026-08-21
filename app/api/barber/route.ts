import { getAuthenticatedBarber } from "../../../lib/auth";
import { DEFAULT_TIMES } from "../../../lib/barbers";
import { intervalsOverlap, timeToMinutes } from "../../../lib/services";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const shortTime = (value: string) => value.slice(0, 5);
function appointment(row: Record<string, unknown>) { return { id: row.id, appointmentDate: row.appointment_date, appointmentTime: shortTime(String(row.appointment_time)), serviceName: row.service_name, serviceDuration: row.service_duration, priceCents: row.price_cents, customerName: row.customer_name, customerPhone: row.customer_phone, customerEmail: row.customer_email }; }

export async function GET(request: Request) {
  const barber = await getAuthenticatedBarber();
  if (!barber) return Response.json({ error: "No autorizado" }, { status: 401 });
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!datePattern.test(date)) return Response.json({ error: "Fecha incorrecta" }, { status: 400 });
  const db = createSupabaseAdminClient();
  const [appointments, overrides, services, blocks] = await Promise.all([
    db.from("reservations").select("*").eq("barber_id", barber.id).eq("appointment_date", date).eq("status", "confirmed").order("appointment_time"),
    db.from("availability_overrides").select("appointment_time, enabled").eq("barber_id", barber.id).eq("appointment_date", date),
    db.from("barber_services").select("code, name, duration_minutes, price_cents").eq("barber_id", barber.id).eq("enabled", true).order("id"),
    db.from("availability_blocks").select("id, start_date, end_date, label, reason, note").eq("barber_id", barber.id).gte("end_date", new Date().toISOString().slice(0, 10)).order("start_date"),
  ]);
  if ([appointments, overrides, services, blocks].some((result) => result.error)) return Response.json({ error: "No se pudo cargar el panel." }, { status: 500 });
  const active = new Set(DEFAULT_TIMES);
  for (const row of overrides.data ?? []) { const time = shortTime(row.appointment_time); if (row.enabled) active.add(time); else active.delete(time); }
  return Response.json({ barber, appointments: (appointments.data ?? []).map(appointment), activeTimes: [...active].sort(), defaultTimes: DEFAULT_TIMES, services: (services.data ?? []).map((row) => ({ code: row.code, name: row.name, durationMinutes: row.duration_minutes, priceCents: row.price_cents })), blocks: blocks.data ?? [] });
}

export async function PATCH(request: Request) {
  const barber = await getAuthenticatedBarber();
  if (!barber) return Response.json({ error: "No autorizado" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>; const action = String(body.action ?? ""); const db = createSupabaseAdminClient();
    if (action === "cancel") { const id = Number(body.id); if (!Number.isInteger(id)) return Response.json({ error: "Cita incorrecta" }, { status: 400 }); await db.from("reservations").update({ status: "cancelled" }).eq("id", id).eq("barber_id", barber.id); return Response.json({ ok: true }); }
    if (action === "reschedule") {
      const id = Number(body.id), date = String(body.date ?? ""), time = String(body.time ?? ""); if (!Number.isInteger(id) || !datePattern.test(date) || !timePattern.test(time)) return Response.json({ error: "Nueva fecha u hora incorrecta" }, { status: 400 });
      const blocked = await db.from("availability_blocks").select("id").eq("barber_id", barber.id).lte("start_date", date).gte("end_date", date).limit(1); if ((blocked.data ?? []).length) return Response.json({ error: "Ese día está cerrado." }, { status: 409 });
      const current = await db.from("reservations").select("service_duration").eq("id", id).eq("barber_id", barber.id).maybeSingle(); if (!current.data) return Response.json({ error: "Cita no encontrada" }, { status: 404 });
      const others = await db.from("reservations").select("appointment_time, service_duration").eq("barber_id", barber.id).eq("appointment_date", date).eq("status", "confirmed").neq("id", id); if ((others.data ?? []).some((row) => intervalsOverlap(timeToMinutes(time), current.data!.service_duration ?? 30, timeToMinutes(shortTime(row.appointment_time)), row.service_duration ?? 30))) return Response.json({ error: "Esa hora se solapa con otra cita." }, { status: 409 });
      const updated = await db.from("reservations").update({ appointment_date: date, appointment_time: time }).eq("id", id).eq("barber_id", barber.id); if (updated.error) return Response.json({ error: "Esa hora ya está ocupada." }, { status: 409 }); return Response.json({ ok: true });
    }
    if (action === "availability") { const date = String(body.date ?? ""), time = String(body.time ?? ""), enabled = Boolean(body.enabled); if (!datePattern.test(date) || !timePattern.test(time)) return Response.json({ error: "Hora incorrecta" }, { status: 400 }); const result = await db.from("availability_overrides").upsert({ barber_id: barber.id, appointment_date: date, appointment_time: time, enabled }, { onConflict: "barber_id,appointment_date,appointment_time" }); if (result.error) throw result.error; return Response.json({ ok: true }); }
    if (action === "service_update") { const code = String(body.code ?? ""), priceCents = Number(body.priceCents), durationMinutes = Number(body.durationMinutes); if (!code || !Number.isInteger(priceCents) || priceCents < 0 || priceCents > 100000) return Response.json({ error: "Precio incorrecto" }, { status: 400 }); if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) return Response.json({ error: "La duración debe estar entre 5 y 480 minutos." }, { status: 400 }); const result = await db.from("barber_services").update({ price_cents: priceCents, duration_minutes: durationMinutes }).eq("barber_id", barber.id).eq("code", code); if (result.error) throw result.error; return Response.json({ ok: true }); }
    if (action === "absence_preview") { const startDate = String(body.startDate ?? ""), endDate = String(body.endDate ?? ""); if (!datePattern.test(startDate) || !datePattern.test(endDate) || endDate < startDate) return Response.json({ error: "El rango de fechas no es válido." }, { status: 400 }); const result = await db.from("reservations").select("id, appointment_date, appointment_time, customer_name, service_name", { count: "exact" }).eq("barber_id", barber.id).eq("status", "confirmed").gte("appointment_date", startDate).lte("appointment_date", endDate).order("appointment_date").order("appointment_time").limit(20); if (result.error) throw result.error; return Response.json({ ok: true, affectedAppointments: result.count ?? 0, affectedPreview: result.data ?? [] }); }
    if (action === "save_absence") { const id = body.id == null ? null : Number(body.id), startDate = String(body.startDate ?? ""), endDate = String(body.endDate ?? ""), reason = String(body.reason ?? "other"), note = String(body.note ?? "").trim().slice(0, 300), label = String(body.label ?? "Ausencia").slice(0, 80); if (!datePattern.test(startDate) || !datePattern.test(endDate) || endDate < startDate) return Response.json({ error: "El rango de fechas no es válido." }, { status: 400 }); if (!["vacation", "illness", "personal", "holiday", "other"].includes(reason)) return Response.json({ error: "Motivo incorrecto." }, { status: 400 }); const values = { barber_id: barber.id, start_date: startDate, end_date: endDate, label, reason, note: note || null }; const result = id == null ? await db.from("availability_blocks").insert(values) : await db.from("availability_blocks").update(values).eq("id", id).eq("barber_id", barber.id); if (result.error) throw result.error; return Response.json({ ok: true }); }
    if (action === "unblock_range") { const id = Number(body.id); if (!Number.isInteger(id)) return Response.json({ error: "Cierre incorrecto" }, { status: 400 }); const result = await db.from("availability_blocks").delete().eq("id", id).eq("barber_id", barber.id); if (result.error) throw result.error; return Response.json({ ok: true }); }
    return Response.json({ error: "Acción incorrecta" }, { status: 400 });
  } catch { return Response.json({ error: "No se pudo guardar el cambio." }, { status: 500 }); }
}
