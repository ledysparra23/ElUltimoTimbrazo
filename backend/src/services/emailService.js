const SibApiV3Sdk = require('sib-api-v3-sdk');
 
const otpStore = new Map();
 
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
 
const buildOtpEmail = (nombre, code) => `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#e8edf5;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8edf5;padding:30px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(30,64,175,0.13);max-width:560px;width:100%;">
  <tr><td style="background:linear-gradient(90deg,#1e40af,#2563eb,#3b82f6);height:6px;">&nbsp;</td></tr>
  <tr><td align="center" style="padding:36px 40px 20px;background:linear-gradient(160deg,#f0f6ff,#e8f1ff);">
    <div style="font-style:italic;font-weight:900;font-size:22px;color:#1e40af;">ElUltimoTimbraso</div>
    <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">Logistica Inteligente</div>
  </td></tr>
  <tr><td align="center" style="padding:24px 40px 0;">
    <h1 style="margin:0;font-size:22px;font-weight:900;color:#0f172a;">Tu Codigo de Verificacion</h1>
  </td></tr>
  <tr><td style="padding:16px 44px 0;">
    <p style="margin:0 0 6px;color:#374151;font-size:15px;">Estimado/a <strong style="color:#1e40af;">${nombre}</strong>,</p>
    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">Tu codigo de verificacion para acceder a <strong>ElUltimoTimbraso</strong> es:</p>
  </td></tr>
  <tr><td style="padding:24px 40px;">
    <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #bfdbfe;border-radius:14px;padding:28px 24px;text-align:center;">
      <div style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;">Codigo de Acceso</div>
      <div style="font-family:'Courier New',monospace;font-size:52px;font-weight:900;letter-spacing:18px;color:#1e3a8a;padding-left:18px;">${code}</div>
      <div style="margin-top:12px;font-size:13px;color:#64748b;">Valido por <strong>5 minutos</strong></div>
    </div>
  </td></tr>
  <tr><td style="padding:0 40px 28px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">Si no solicito este codigo, ignore este mensaje.</p>
  </td></tr>
  <tr><td style="background:linear-gradient(90deg,#1e40af,#2563eb,#3b82f6);height:6px;">&nbsp;</td></tr>
</table>
</td></tr></table>
</body></html>`;
 
const sendOTPEmail = async (email, nombre) => {
  const code = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore.set(email, { code, expiresAt });
 
  try {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
 
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
 
    sendSmtpEmail.sender = { name: 'ElUltimoTimbraso', email: 'ledysparra23@gmail.com' };
    sendSmtpEmail.to = [{ email: email, name: nombre }];
    sendSmtpEmail.subject = 'Tu codigo de verificacion - ElUltimoTimbraso';
    sendSmtpEmail.htmlContent = buildOtpEmail(nombre, code);
 
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ OTP enviado a ${email}`);
  } catch (err) {
    console.error('❌ Error enviando OTP:', err.message || err);
    console.log(`[FALLBACK] OTP para ${email}: ${code}`);
  }
 
  return code;
};
 
const verifyOTP = (email, inputCode) => {
  const entry = otpStore.get(email);
  if (!entry) return { valid: false, reason: 'No hay codigo activo. Solicita uno nuevo.' };
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email);
    return { valid: false, reason: 'El codigo expiro. Solicita uno nuevo.' };
  }
  if (entry.code !== inputCode.trim()) return { valid: false, reason: 'Codigo incorrecto.' };
  otpStore.delete(email);
  return { valid: true };
};
 
const clearOTP = (email) => otpStore.delete(email);
 
module.exports = { sendOTPEmail, verifyOTP, clearOTP };