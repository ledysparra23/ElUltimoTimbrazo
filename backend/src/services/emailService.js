const SibApiV3Sdk = require('sib-api-v3-sdk');

const sendOTPEmail = async (email, nombre) => {
  const code = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore.set(email, { code, expiresAt });

  try {
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
    const api = new SibApiV3Sdk.TransactionalEmailsApi();
    await api.sendTransacEmail({
      sender: { name: 'ElUltimoTimbraso', email: 'noreply@elultimotimbraso.com' },
      to: [{ email, name: nombre }],
      subject: '🔐 Tu código de verificación — ElUltimoTimbraso',
      htmlContent: buildOtpEmail(nombre, code),
    });
    console.log(`✅ OTP enviado a ${email}`);
  } catch (err) {
    console.error('❌ Error enviando OTP:', err.message);
    console.log(`[FALLBACK] OTP para ${email}: ${code}`);
  }
  return code;
};