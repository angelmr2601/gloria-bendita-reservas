"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

export default function LoginForm() {
  const router = useRouter(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setLoading(true); setError(""); const { error: authError } = await createSupabaseBrowserClient().auth.signInWithPassword({ email, password }); if (authError) { setError("El correo o la contraseña no son correctos."); setLoading(false); return; } router.refresh(); }
  return <main className="auth-page"><section className="auth-card"><div className="andalusian-star"><i /><i /></div><p>ZONA DE PELUQUEROS</p><h1>Accede a tu agenda</h1><form onSubmit={submit}><label>CORREO ELECTRÓNICO<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>CONTRASEÑA<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <span className="auth-error" role="alert">{error}</span>}<button disabled={loading}>{loading ? "Entrando…" : "Iniciar sesión"}</button></form><Link href="/peluquero/recuperar">He olvidado mi contraseña</Link></section></main>;
}
