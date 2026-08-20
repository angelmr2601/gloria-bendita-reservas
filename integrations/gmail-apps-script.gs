/**
 * Google Apps Script para enviar los correos de Gloria Bendita desde Gmail.
 * Guardar GMAIL_WEBHOOK_SECRET y GMAIL_FROM_EMAIL en Propiedades del script
 * antes de publicar.
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var expectedSecret = PropertiesService.getScriptProperties().getProperty('GMAIL_WEBHOOK_SECRET');
    if (!expectedSecret || payload.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: 'No autorizado' });
    }
    if (!payload.to || !payload.subject || !payload.html) {
      return jsonResponse({ ok: false, error: 'Faltan datos' });
    }
    var fromEmail = payload.from || PropertiesService.getScriptProperties().getProperty('GMAIL_FROM_EMAIL');
    var emailOptions = {
      to: payload.to,
      subject: payload.subject,
      htmlBody: payload.html,
      name: 'Gloria Bendita'
    };
    if (fromEmail) {
      emailOptions.replyTo = fromEmail;
    }
    MailApp.sendEmail(emailOptions);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
