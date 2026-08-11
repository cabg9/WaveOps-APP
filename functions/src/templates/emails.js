const LOGO_URL = "https://my.waveops.app/logo-waveops.png";

function invitationEmailTemplate(name, link, companyName) {
  return {
    subject: `Has sido invitado a unirte a ${companyName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${LOGO_URL}" alt="WaveOps" style="max-width: 260px; height: auto;" />
        </div>
        <div style="background: #F5F5F7; border-radius: 16px; padding: 32px; margin-bottom: 24px;">
          <h2 style="color: #1D1D1F; font-size: 20px; margin: 0 0 16px 0;">Hola ${name},</h2>
          <p style="color: #1D1D1F; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
            Has sido invitado a unirte al equipo de <strong>${companyName}</strong> en WaveOps.
          </p>
          <div style="text-align: center;">
            <a href="${link}" style="display: inline-block; background: #007AFF; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Aceptar Invitacion
            </a>
          </div>
        </div>
        <p style="color: #86868B; font-size: 12px; text-align: center; margin: 0;">
          Si no esperabas esta invitacion, puedes ignorar este email.
        </p>
      </div>
    `,
    text: `Hola ${name},\n\nHas sido invitado a unirte al equipo de ${companyName} en WaveOps.\n\nAbre este enlace para configurar tu cuenta (expira en 72h):\n${link}\n\nSi no esperabas esta invitacion, ignora este email.`
  };
}

module.exports = { LOGO_URL, invitationEmailTemplate };
