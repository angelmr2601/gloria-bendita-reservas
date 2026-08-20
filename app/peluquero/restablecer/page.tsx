"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";
export default function ResetPasswordPage() {
  const router = useRouter(); const [password, setPassword] = useState(""); const [repeat, setRepeat] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres."); if (password !== repeat) return setError("Las contraseñas no coinciden."); setLoading(true); const { error: updateError } = await createSupabaseBrowserClient().auth.updateUser({ password }); if (updateError) { setError("El enlace ha caducado. Solicita uno nuevo."); setLoading(false); return; } router.push("/peluquero"); router.refresh(); }
  return <main className="auth-page"><section className="auth-card"><div className="andalusian-star"><i /><i /></div><p>RECUPERAR ACCESO</p><h1>Elige una contraseña</h1><form onSubmit={submit}><label>NUEVA CONTRASEÑA<input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>REPITE LA CONTRASEÑA<input type="password" required minLength={8} value={repeat} onChange={(event) => setRepeat(event.target.value)} /></label>{error && <span className="auth-error">{error}</span>}<button disabled={loading}>{loading ? "Guardando…" : "Guardar contraseña"}</button></form></section></main>;
}
