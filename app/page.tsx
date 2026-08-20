"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DEFAULT_TIMES } from "../lib/barbers";

type Barber = { id: string; name: string; initials: string; specialty: string; schedule: string };
type Service = { code: string; name: string; durationMinutes: number; priceCents: number };
const barbers: Barber[] = [
  { id: "peluquero-1", name: "Javi Pérez", initials: "JP", specialty: "Corte · Degradado · Barba", schedule: "Martes a sábado" },
  { id: "peluquero-2", name: "Iván", initials: "IV", specialty: "Corte · Estilo · Barba", schedule: "Martes a sábado" },
];
function isoDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function longDate(value: string) { return value ? new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`)) : ""; }

export default function Home() {
  const dates = useMemo(() => {
    const result: { value: string; label: string }[] = [];
    const cursor = new Date(); cursor.setHours(12, 0, 0, 0);
    for (let i = 1; result.length < 14; i++) {
      const date = new Date(cursor); date.setDate(cursor.getDate() + i);
      if (date.getDay() === 0 || date.getDay() === 1) continue;
      result.push({ value: isoDate(date), label: new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(date) });
    }
    return result;
  }, []);
  const [barber, setBarber] = useState("");
  const [service, setService] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [activeTimes, setActiveTimes] = useState<string[]>(DEFAULT_TIMES);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"booking" | "details" | "success">("booking");
  const [error, setError] = useState("");
  const [managementUrl, setManagementUrl] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [dateBlocked, setDateBlocked] = useState(false);
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });

  useEffect(() => {
    if (!barber) return;
    let active = true;
    fetch(`/api/services?barber=${encodeURIComponent(barber)}`).then((response) => response.json()).then((data) => { if (active) setServices(data.services ?? []); }).catch(() => { if (active) setServices([]); });
    return () => { active = false; };
  }, [barber]);

  useEffect(() => {
    if (!barber || !service || !date) return;
    let active = true;
    fetch(`/api/reservations?barber=${encodeURIComponent(barber)}&service=${encodeURIComponent(service)}&date=${encodeURIComponent(date)}`)
      .then((response) => response.json()).then((data) => { if (active) { setBookedTimes(data.bookedTimes ?? []); setActiveTimes(data.activeTimes ?? DEFAULT_TIMES); setDateBlocked(Boolean(data.blocked)); } })
      .catch(() => active && setBookedTimes([])).finally(() => active && setLoadingTimes(false));
    return () => { active = false; };
  }, [barber, service, date]);

  const selectedBarber = barbers.find((item) => item.id === barber);
  const selectedService = services.find((item) => item.code === service);
  const availableTimes = activeTimes.filter((item) => !bookedTimes.includes(item));
  function continueToDetails() { if (barber && service && date && time) { setError(""); setStep("details"); } }
  async function submitReservation(event: FormEvent) {
    event.preventDefault();
    if (!customer.name.trim() || !customer.phone.trim() || !customer.email.trim()) { setError("Completa tus datos para confirmar la cita."); return; }
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ barber, service, date, time, ...customer }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo confirmar la cita.");
      setManagementUrl(data.managementUrl ?? ""); setEmailSent(Boolean(data.emailSent)); setStep("success");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo confirmar la cita."); }
    finally { setSubmitting(false); }
  }
  function reset() { setBarber(""); setService(""); setServices([]); setDate(""); setTime(""); setCustomer({ name: "", phone: "", email: "" }); setStep("booking"); setError(""); setManagementUrl(""); setEmailSent(false); }

  return <main className="booking-page">
    <div className="tile-corner tile-corner-left" aria-hidden="true" />
    <div className="tile-corner tile-corner-right" aria-hidden="true" />
    <section className="booking-section" aria-label="Reserva de cita">
      <div className="booking-card">
        <div className="booking-heading">
          <div className="andalusian-star" aria-hidden="true"><i /><i /></div>
          <p>GLORIA BENDITA</p>
          <h1>Reserva tu cita</h1>
          <span>Elige peluquero, servicio, fecha y hora</span>
        </div>
        {step === "booking" && <>
          <div className="progress"><span className="active">1</span><i /><span>2</span><i /><span>3</span><i /><span>4</span></div>
          <div className="form-block"><div className="block-title"><span>01</span><div><h3>Elige tu peluquero</h3><p>¿Con quién quieres reservar?</p></div></div>
            <div className="barber-grid">{barbers.map((item) => <button className={`barber-card ${barber === item.id ? "selected" : ""}`} key={item.id} onClick={() => { setBarber(item.id); setService(""); setServices([]); setDate(""); setTime(""); setBookedTimes([]); }} type="button"><span className="avatar">{item.initials}</span><span className="barber-info"><b>{item.name}</b><small>{item.specialty}</small><small className="schedule">{item.schedule}</small></span><span className="radio">{barber === item.id ? "✓" : ""}</span></button>)}</div>
          </div>
          <div className={`form-block ${!barber ? "muted" : ""}`}><div className="block-title"><span>02</span><div><h3>Elige el servicio</h3><p>Precio y duración con {selectedBarber?.name ?? "tu peluquero"}</p></div></div><div className="service-grid">{services.map((item) => <button type="button" key={item.code} className={service === item.code ? "selected" : ""} onClick={() => { setService(item.code); setDate(""); setTime(""); }} disabled={!barber}><span><b>{item.name}</b><small>{item.durationMinutes} min</small></span><strong>{(item.priceCents / 100).toFixed(2).replace(".00", "").replace(".", ",")} €</strong></button>)}</div></div>
          <div className={`form-block ${!service ? "muted" : ""}`}><div className="block-title"><span>03</span><div><h3>Elige el día</h3><p>Próximas fechas disponibles</p></div></div><label className="select-label">FECHA<select value={date} onChange={(event) => { setDate(event.target.value); setTime(""); setBookedTimes([]); setDateBlocked(false); setLoadingTimes(Boolean(event.target.value)); }} disabled={!service}><option value="">Selecciona una fecha</option>{dates.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label></div>
          <div className={`form-block ${!date ? "muted" : ""}`}><div className="block-title"><span>04</span><div><h3>Elige la hora</h3><p>{date ? `Disponibilidad para el ${longDate(date)}` : "Selecciona antes una fecha"}</p></div></div><div className="time-grid">{loadingTimes ? <p className="loading">Consultando disponibilidad…</p> : dateBlocked ? <p className="loading">El peluquero no acepta reservas durante esta fecha.</p> : availableTimes.length === 0 && date ? <p className="loading">No quedan horas disponibles para este día.</p> : availableTimes.map((item) => <button type="button" className={time === item ? "selected" : ""} onClick={() => setTime(item)} disabled={!date} key={item}>{item}</button>)}</div></div>
          <button className="submit-button" disabled={!barber || !service || !date || !time} onClick={continueToDetails}>CONTINUAR <span>→</span></button>
        </>}
        {step === "details" && <form onSubmit={submitReservation} className="details-form">
          <div className="progress"><span className="done">✓</span><i className="done" /><span className="done">✓</span><i className="done" /><span className="done">✓</span><i className="done" /><span className="active">4</span></div><button type="button" className="back" onClick={() => setStep("booking")}>← Volver</button>
          <div className="block-title"><span>05</span><div><h3>Tus datos</h3><p>Los usaremos para gestionar tu cita</p></div></div><div className="summary"><span>{selectedBarber?.name} · {selectedService?.name} ({selectedService ? `${(selectedService.priceCents / 100).toFixed(2).replace(".00", "").replace(".", ",")} €` : ""})</span><b>{longDate(date)} · {time}</b></div>
          <label>NOMBRE Y APELLIDOS<input required autoComplete="name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Tu nombre" /></label>
          <div className="field-row"><label>TELÉFONO<input required autoComplete="tel" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="600 000 000" /></label><label>CORREO ELECTRÓNICO<input required type="email" autoComplete="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="tu@email.com" /></label></div>
          {error && <p className="error" role="alert">{error}</p>}<button className="submit-button" disabled={submitting}>{submitting ? "CONFIRMANDO…" : "CONFIRMAR RESERVA"} <span>→</span></button><p className="privacy">Al reservar aceptas que usemos estos datos únicamente para gestionar tu cita.</p>
        </form>}
        {step === "success" && <div className="success"><div className="success-icon">✓</div><p className="eyebrow">CITA CONFIRMADA</p><h2>¡Te esperamos!</h2><p>Tu cita de <b>{selectedService?.name}</b> con <b>{selectedBarber?.name}</b> está reservada para el <b>{longDate(date)} a las {time}</b>.</p><div className="success-data"><span>{customer.name}</span><span>{customer.phone}</span><span>{customer.email}</span></div>{emailSent ? <p className="email-notice">Te hemos enviado el enlace privado para gestionar tu cita.</p> : <p className="email-notice pending">Guarda este enlace privado para cambiar o cancelar tu cita.</p>}{managementUrl && <a className="manage-link" href={managementUrl}>GESTIONAR MI CITA</a>}<button className="submit-button secondary" onClick={reset}>HACER OTRA RESERVA</button></div>}
      </div>
    </section>
  </main>;
}
