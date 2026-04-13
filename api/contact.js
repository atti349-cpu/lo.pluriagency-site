const { Resend } = require('resend');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, phone, message, company, chips, context } = req.body || {};

  if (!name || !message) {
    return res.status(400).json({ error: 'Campi obbligatori mancanti' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY non configurata nelle variabili d\'ambiente Vercel');
    return res.status(500).json({ error: 'Servizio email non configurato' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Build chips/context section
  const chipsHtml = chips && chips.length
    ? `<tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:11px;letter-spacing:2px;color:#6b6b80;text-transform:uppercase;width:120px;vertical-align:top">INTERESSE</td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07)">
          ${chips.map(c=>`<span style="display:inline-block;margin:2px 4px 2px 0;padding:3px 10px;background:rgba(212,168,67,0.12);border:1px solid rgba(212,168,67,0.3);font-size:12px;color:#d4a843">${escapeHtml(c)}</span>`).join('')}
        </td>
      </tr>` : '';

  const phoneHtml = phone
    ? `<tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:11px;letter-spacing:2px;color:#6b6b80;text-transform:uppercase">TELEFONO</td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:15px">${escapeHtml(phone)}</td>
      </tr>` : '';

  const companyHtml = company
    ? `<tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:11px;letter-spacing:2px;color:#6b6b80;text-transform:uppercase">AZIENDA</td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:15px">${escapeHtml(company)}</td>
      </tr>` : '';

  try {
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email||'');
    await resend.emails.send({
      from: 'Lorenzo Attinà <hello@pluriagency.com>',
      to: 'hello@pluriagency.com',
      ...(isValidEmail ? { replyTo: email } : {}),
      subject: `Nuova richiesta da ${name}${context ? ' [' + context + ']' : ''}${company ? ' — ' + company : ''}`,
      html: `
        <div style="font-family:sans-serif;max-width:580px;background:#07080a;color:#e8e4dc;padding:32px;border:1px solid rgba(255,255,255,0.08)">
          <div style="font-size:10px;letter-spacing:4px;color:#d4a843;text-transform:uppercase;margin-bottom:20px">
            // NUOVA RICHIESTA — LO.PLURIAGENCY.COM
          </div>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:11px;letter-spacing:2px;color:#6b6b80;text-transform:uppercase;width:120px">NOME</td>
              <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:15px">${escapeHtml(name)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:11px;letter-spacing:2px;color:#6b6b80;text-transform:uppercase">EMAIL</td>
              <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:15px"><a href="mailto:${escapeHtml(email)}" style="color:#d4a843">${escapeHtml(email)}</a></td>
            </tr>
            ${phoneHtml}
            ${companyHtml}
            ${chipsHtml}
            <tr>
              <td style="padding:12px 0 0;font-size:11px;letter-spacing:2px;color:#6b6b80;text-transform:uppercase;vertical-align:top">MESSAGGIO</td>
              <td style="padding:12px 0 0;font-size:14px;line-height:1.7">${escapeHtml(message).replace(/\n/g,'<br>')}</td>
            </tr>
          </table>
          <div style="margin-top:28px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#555">
            Lorenzo Attinà · lo.pluriagency.com · +39 389 688 1004
          </div>
        </div>
      `
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Resend error:', err);
    return res.status(500).json({ error: 'Errore invio email' });
  }
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
