"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

type Appointment = { id: number; appointmentDate: string; appointmentTime: string; serviceName: string | null; serviceDuration: number | null; priceCents: number | null; customerName: string; customerPhone: string; customerEmail: string };
type Service = { code: string; name: string; durationMinutes: number; priceCents: number };
type Barber = { id: string; name: string; email: string };
type DashboardData = { appointments: Appointment[]; activeTimes: string[]; defaultTimes: string[]; services: Service[] };

function localISO(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function prettyDate(value: string) { return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`)); }

export default function BarberDashboard({ barber }: { barber: Barber }) {
  const router = useRouter();
  const [date, setDate] = useState(localISO());
  const [data, setData] = useState<DashboardData>({ appointments: [], activeTimes: [], defaultTimes: [], services: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const load = useCallback(async () => {
    try { const response = await fetch(`/api/barber?date=${date}`); const body = await response.json(); if (!response.ok) throw new Error(body.error); setData(body); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo cargar la agenda."); }
    finally { setLoading(false); }
  }, [date]);
  useEffect(() => {
    let active = true;
    fetch(`/api/barber?date=${date}`).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (active) setData(body);
    }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "No se pudo cargar la agenda."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date]);

  const occupied = useMemo(() => new Set(data.appointments.map((item) => item.appointmentTime)), [data.appointments]);
  async function mutate(body: Record<string, unknown>) {
    setError("");
    const response = await fetch("/api/barber", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json(); if (!response.ok) { setError(result.error); return false; } await load(); return true;
  }
  async function cancel(appointment: Appointment) { if (window.confirm(`¿Cancelar la cita de ${appointment.customerName} a las ${appointment.appointmentTime}?`)) await mutate({ action: "cancel", id: appointment.id }); }
  function openEdit(appointment: Appointment) { setEditing(appointment); setNewDate(appointment.appointmentDate); setNewTime(appointment.appointmentTime); }
  async function saveEdit() { if (!editing || !newDate || !newTime) return; if (await mutate({ action: "reschedule", id: editing.id, date: newDate, time: newTime })) setEditing(null); }
  async function toggle(time: string) { if (occupied.has(time) && data.activeTimes.includes(time)) { setError("No puedes quitar una hora que ya tiene una cita reservada."); return; } await mutate({ action: "availability", date, time, enabled: !data.activeTimes.includes(time) }); }
  async function addTime() { if (!customTime) return; if (await mutate({ action: "availability", date, time: customTime, enabled: true })) setCustomTime(""); }
  async function updatePrice(service: Service, value: string) { const price = Number(value.replace(",", ".")); if (!Number.isFinite(price) || price < 0) { setError("Introduce un precio válido."); return; } await mutate({ action: "service_price", code: service.code, priceCents: Math.round(price * 100) }); }
  async function signOut() { await createSupabaseBrowserClient().auth.signOut(); router.refresh(); }

  return <main className="dashboard-page">
    <aside className="dashboard-side">
      <div className="dashboard-brand"><div className="andalusian-star"><i /><i /></div><div><b>GLORIA BENDITA</b><span>Zona de peluqueros</span></div></div>
      <nav><button className="active">Agenda</button><button onClick={() => document.getElementById("servicios")?.scrollIntoView({ behavior: "smooth" })}>Servicios y precios</button><button onClick={() => document.getElementById("horarios")?.scrollIntoView({ behavior: "smooth" })}>Disponibilidad</button></nav>
      <div className="barber-session"><span>{barber.name.split(" ").map((part) => part[0]).join("")}</span><div><b>{barber.name}</b><small>{barber.email}</small></div></div>
      <button className="sign-out" onClick={signOut}>Cerrar sesión</button>
    </aside>
    <section className="dashboard-content">
      <header className="dashboard-header"><div><p>MI AGENDA</p><h1>Buenos días, {barber.name.split(" ")[0]}</h1></div><label>FECHA<input type="date" value={date} onChange={(event) => { setLoading(true); setError(""); setDate(event.target.value); }} /></label></header>
      <div className="day-title"><div><span>{new Date(`${date}T12:00:00`).getDate()}</span><div><b>{prettyDate(date)}</b><small>{data.appointments.length} {data.appointments.length === 1 ? "cita" : "citas"} reservadas</small></div></div><button onClick={() => setDate(localISO())}>Hoy</button></div>
      {error && <p className="dashboard-error" role="alert">{error}</p>}
      <section className="appointments-panel"><h2>Citas del día</h2>{loading ? <p className="empty-state">Cargando agenda…</p> : data.appointments.length === 0 ? <p className="empty-state">No tienes citas para este día.</p> : <div className="appointment-list">{data.appointments.map((appointment) => <article className="appointment-card" key={appointment.id}><time>{appointment.appointmentTime}</time><div className="appointment-person"><b>{appointment.customerName}</b><strong>{appointment.serviceName ?? "Servicio no indicado"} · {appointment.serviceDuration ?? 30} min · {((appointment.priceCents ?? 0) / 100).toFixed(2).replace(".00", "").replace(".", ",")} €</strong><span>{appointment.customerPhone} · {appointment.customerEmail}</span></div><div className="appointment-actions"><a href={`tel:${appointment.customerPhone}`}>Llamar</a><button onClick={() => openEdit(appointment)}>Cambiar</button><button className="danger" onClick={() => cancel(appointment)}>Cancelar</button></div></article>)}</div>}</section>
      <section className="services-panel" id="servicios"><div className="panel-heading"><div><p>SERVICIOS</p><h2>Precios de {barber.name}</h2><span>Los cambios solo afectan a las nuevas reservas.</span></div></div><div className="price-grid">{data.services.map((service) => <article key={service.code}><div><b>{service.name}</b><small>{service.durationMinutes} minutos</small></div><label>PRECIO<div><input type="number" min="0" step="0.50" defaultValue={(service.priceCents / 100).toFixed(2)} id={`price-${service.code}`} /><span>€</span></div></label><button onClick={() => { const input = document.getElementById(`price-${service.code}`) as HTMLInputElement | null; if (input) void updatePrice(service, input.value); }}>Guardar</button></article>)}</div></section>
      <section className="availability-panel" id="horarios"><div className="panel-heading"><div><p>DISPONIBILIDAD</p><h2>Horas disponibles</h2><span>Activa o desactiva las horas que podrán reservar los clientes el {prettyDate(date)}.</span></div><div className="add-time"><input aria-label="Nueva hora" type="time" value={customTime} onChange={(event) => setCustomTime(event.target.value)} /><button onClick={addTime}>Añadir hora</button></div></div><div className="availability-grid">{[...new Set([...data.defaultTimes, ...data.activeTimes])].sort().map((time) => { const enabled = data.activeTimes.includes(time); return <button key={time} className={enabled ? "enabled" : "disabled"} onClick={() => toggle(time)}><b>{time}</b><span>{occupied.has(time) ? "Reservada" : enabled ? "Disponible" : "No disponible"}</span><i>{enabled ? "✓" : "+"}</i></button>; })}</div></section>
    </section>
    {editing && <div className="modal-backdrop" role="presentation"><div className="edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title"><button className="modal-close" onClick={() => setEditing(null)}>×</button><p>CAMBIAR CITA</p><h2 id="edit-title">{editing.customerName}</h2><label>NUEVA FECHA<input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} /></label><label>NUEVA HORA<input type="time" value={newTime} onChange={(event) => setNewTime(event.target.value)} /></label><button className="save-change" onClick={saveEdit}>Guardar cambios</button></div></div>}
  </main>;
}
