"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";
export default function RecoverPasswordPage() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setLoading(true); await createSupabaseBrowserClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/peluquero/restablecer` }); setSent(true); setLoading(false); }
  return <main className="auth-page"><section className="auth-card"><div className="andalusian-star"><i /><i /></div><p>RECUPERAR ACCESO</p><h1>Nueva contraseña</h1>{sent ? <><div className="auth-notice">Si el correo está registrado, recibirás un enlace para cambiar la contraseña.</div><Link href="/peluquero">Volver al acceso</Link></> : <form onSubmit={submit}><label>CORREO ELECTRÓNICO<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><button disabled={loading}>{loading ? "Enviando…" : "Enviar enlace"}</button></form>}</section></main>;
}
