declare global {
  var __GLORIA_BENDITA_GMAIL_WEBHOOK_URL__: string | undefined;
  var __GLORIA_BENDITA_GMAIL_WEBHOOK_SECRET__: string | undefined;
  var __GLORIA_BENDITA_GMAIL_FROM_EMAIL__: string | undefined;
}

type ConfirmationEmail = { to: string; customerName: string; barberName: string; serviceName: string; price: string; date: string; time: string; managementUrl: string };

export async function sendConfirmationEmail(message: ConfirmationEmail) {
  const endpoint = globalThis.__GLORIA_BENDITA_GMAIL_WEBHOOK_URL__;
  const secret = globalThis.__GLORIA_BENDITA_GMAIL_WEBHOOK_SECRET__;
  const from = globalThis.__GLORIA_BENDITA_GMAIL_FROM_EMAIL__;
  if (!endpoint || !secret) return false;
  const html = `<div style="font-family:Arial,sans-serif;color:#273b32;max-width:560px;margin:auto"><h1 style="font-family:Georgia,serif;color:#176149">Gloria Bendita</h1><p>Hola ${escapeHtml(message.customerName)},</p><p>Tu cita con <strong>${escapeHtml(message.barberName)}</strong> está confirmada para el <strong>${escapeHtml(message.date)}</strong> a las <strong>${escapeHtml(message.time)}</strong>.</p><p><strong>Servicio:</strong> ${escapeHtml(message.serviceName)} · ${escapeHtml(message.price)}</p><p style="margin:30px 0"><a href="${escapeHtml(message.managementUrl)}" style="background:#176149;color:white;padding:14px 22px;text-decoration:none">Gestionar mi cita</a></p><p>Desde este enlace privado podrás cambiar o cancelar tu cita.</p><p style="font-size:12px;color:#777">No compartas este enlace con otras personas.</p></div>`;
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret, from, to: message.to, subject: "Tu cita en Gloria Bendita está confirmada", html }) });
    const result = await response.json().catch(() => null) as { ok?: boolean } | null;
    return response.ok && result?.ok === true;
  } catch { return false; }
}

function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character); }
