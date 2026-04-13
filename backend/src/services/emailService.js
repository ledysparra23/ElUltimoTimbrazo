const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const otpStore = new Map();
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const getLogoBase64 = () => {
  try {
    const p = path.join(__dirname, '../../../frontend/public/logo.png');
    if (fs.existsSync(p)) return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
  } catch (e) {}
  return '';
};

// Create a real SMTP transporter or throw
const getTransporter = async () => {
  // Si tienes SMTP real
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // Fallback (Ethereal)
  const testAccount = await nodemailer.createTestAccount();

  console.log('\n⚠️ SMTP no configurado. Usando Ethereal');
  console.log(`📧 ${testAccount.user}`);

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};
  
const buildOtpEmail = (nombre, code) => {
  const logo = getLogoBase64();
  const logoImg = logo
    ? `<img src="${logo}" alt="Logo" width="88" height="88" style="object-fit:contain;border-radius:50%;background:#fff;padding:6px;box-shadow:0 4px 16px rgba(37,99,235,0.18);">`
    : '<div style="font-size:48px;">&#128230;</div>';
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#e8edf5;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8edf5;padding:30px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(30,64,175,0.13);max-width:560px;width:100%;">
  <tr><td style="background:linear-gradient(90deg,#1e40af,#2563eb,#3b82f6);height:6px;font-size:0;">&nbsp;</td></tr>
  <tr><td align="center" style="padding:36px 40px 20px;background:linear-gradient(160deg,#f0f6ff,#e8f1ff);">
    ${logoImg}
    <div style="margin-top:12px;font-style:italic;font-weight:900;font-size:22px;color:#1e40af;">ElUltimoTimbraso</div>
    <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">Log&#237;stica Inteligente</div>
  </td></tr>
  <tr><td align="center" style="padding:24px 40px 0;"><h1 style="margin:0;font-size:22px;font-weight:900;color:#0f172a;">Tu C&#243;digo de Verificaci&#243;n</h1></td></tr>
  <tr><td style="padding:16px 44px 0;">
    <p style="margin:0 0 6px;color:#374151;font-size:15px;">Estimado/a <strong style="color:#1e40af;">${nombre}</strong>,</p>
    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">Tu c&#243;digo de verificaci&#243;n seguro (OTP) para <strong>ElUltimoTimbraso</strong> ha sido generado.</p>
  </td></tr>
  <tr><td style="padding:24px 40px;">
    <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #bfdbfe;border-radius:14px;padding:24px;text-align:center;">
      <div style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;">C&#243;digo de Acceso</div>
      <div style="font-family:'Courier New',monospace;font-size:52px;font-weight:900;letter-spacing:18px;color:#1e3a8a;padding-left:18px;">${code}</div>
      <div style="margin-top:12px;font-size:13px;color:#64748b;">&#9201;&nbsp;V&#225;lido por <strong>5 minutos</strong></div>
    </div>
  </td></tr>
  <tr><td align="center" style="padding:0 40px 24px;">
    <table cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#1d4ed8,#2563eb);border-radius:10px;">
      <span style="display:inline-block;padding:13px 44px;color:#fff;font-weight:700;font-size:15px;">Confirmar Transacci&#243;n</span>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e5e7eb;"></td></tr>
  <tr><td style="padding:18px 40px 24px;text-align:center;">
    <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;">Si no solicit&#243; este c&#243;digo, ignore este mensaje.</p>
    <p style="margin:0 0 12px;color:#9ca3af;font-size:12px;">Visite nuestro <a href="#" style="color:#3b82f6;">Centro de Ayuda</a> para m&#225;s informaci&#243;n.</p>
    <p style="margin:0;color:#cbd5e1;font-size:11px;font-style:italic;">"Cuando comieres el trabajo de tus manos, Bienaventurado ser&#225;s, y te ir&#225; bien."</p>
  </td></tr>
  <tr><td style="background:linear-gradient(90deg,#1e40af,#2563eb,#3b82f6);height:6px;font-size:0;">&nbsp;</td></tr>
</table></td></tr></table></body></html>`;
};

const sendOTPEmail = async (email, nombre) => {
  const code = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore.set(email, { code, expiresAt });

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER
        ? `"ElUltimoTimbraso" <${process.env.SMTP_USER}>`
        : '"ElUltimoTimbraso" <noreply@elultimotimbraso.com>',
      to: email,
      subject: '🔐 Tu código de verificación — ElUltimoTimbraso',
      html: buildOtpEmail(nombre, code),
    });
  console.log(`✅ OTP enviado a ${email}`);
  } catch (err) {
    console.error('❌ Error enviando email OTP:', err.message);
    // Still log code so dev can test even if email fails
    console.log(`[FALLBACK] OTP para ${email}: ${code}`);
  }

  return code;
};

const verifyOTP = (email, inputCode) => {
  const entry = otpStore.get(email);
  if (!entry) return { valid: false, reason: 'No hay código activo. Solicita uno nuevo.' };
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email);
    return { valid: false, reason: 'El código expiró. Solicita uno nuevo.' };
  }
  if (entry.code !== inputCode.trim()) return { valid: false, reason: 'Código incorrecto' };
  otpStore.delete(email);
  return { valid: true };
};

const clearOTP = (email) => otpStore.delete(email);

module.exports = { sendOTPEmail, verifyOTP, clearOTP };
