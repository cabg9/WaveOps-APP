const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {getAuth} = require("firebase-admin/auth");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {onRequest} = require("firebase-functions/v2/https");
const sgMail = require("@sendgrid/mail");

initializeApp();
const auth = getAuth();
const db = getFirestore();

const LOGO_URL = "https://wve-b3db5.web.app/logo-waveops.png";

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

function setCorsHeaders(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

exports.createAuthUser = onDocumentCreated("users/{userId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const userData = snap.data();
  const docId = event.params.userId;
  if (!userData.email || !userData.tempPassword) {
    console.log(`[createAuthUser] Missing email or tempPassword for ${docId}`);
    return;
  }
  try {
    const authUser = await auth.createUser({
      email: userData.email,
      password: userData.tempPassword,
      displayName: userData.name || userData.email,
    });
    await db.collection("users").doc(docId).update({
      tempPassword: null,
      authUid: authUser.uid,
      authCreated: true,
      authCreatedAt: new Date().toISOString(),
    });
    console.log(`[createAuthUser] Created auth user ${authUser.uid} for ${userData.email}`);
  } catch (error) {
    console.error(`[createAuthUser] Error for ${docId}:`, error.message);
    await db.collection("users").doc(docId).update({
      authError: error.message,
      authCreated: false,
    }).catch(() => {});
  }
});

exports.sendInvitationEmail = onRequest(
  {region: "us-central1", cors: true},
  async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    const sendgridKey = process.env.SENDGRID_API_KEY;
    if (!sendgridKey) {
      res.status(500).json({error: "SendGrid API key no configurada. Revisa el archivo .env"});
      return;
    }
    sgMail.setApiKey(sendgridKey);

    try {
      const {email, name, role, department, userId} = req.body;
      if (!email || !name || !userId) {
        res.status(400).json({error: "Faltan datos obligatorios"});
        return;
      }

      const token = Array.from({length: 32}, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 62))).join('');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 72);

      await db.collection("users").doc(userId).update({
        invitationPending: true,
        invitedAt: new Date().toISOString(),
      });

      await db.collection("invitations").doc(token).set({
        email, name, role, department, userId, token,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        acceptedAt: null,
      });

      const invitationLink = `https://wve-b3db5.web.app/invitation?token=${token}`;

      try {
        const template = invitationEmailTemplate(name, invitationLink, "Dive X Surf");
        await sgMail.send({
          to: email,
          from: "welcome@waveops.app",
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
        console.log(`[sendInvitationEmail] Email enviado a ${email}`);
        res.json({success: true, token, link: invitationLink, emailSent: true});
      } catch (emailError) {
        console.error(`[sendInvitationEmail] Error:`, emailError.message);
        res.json({success: true, token, link: invitationLink, emailSent: false, error: emailError.message});
      }
    } catch (err) {
      console.error("[sendInvitationEmail] Fatal error:", err.message);
      res.status(500).json({error: err.message});
    }
  }
);

exports.acceptInvitation = onRequest(
  {region: "us-central1", cors: true},
  async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    try {
      const {token, password} = req.body;
      if (!token || !password) {
        res.status(400).json({error: "Faltan token o password"});
        return;
      }

      const invRef = db.collection("invitations").doc(token);
      const invSnap = await invRef.get();
      if (!invSnap.exists) {
        res.status(400).json({error: "Token invalido"});
        return;
      }

      const invData = invSnap.data();
      if (invData.status !== "PENDING") {
        res.status(400).json({error: "Invitacion ya fue usada o expiro"});
        return;
      }
      if (new Date(invData.expiresAt) < new Date()) {
        await invRef.update({status: "EXPIRED"});
        res.status(400).json({error: "Invitacion expirada"});
        return;
      }

      let authUser;
      try {
        authUser = await auth.getUserByEmail(invData.email);
        await auth.updateUser(authUser.uid, { password: password, displayName: invData.name });
        console.log(`[acceptInvitation] Updated existing user: ${authUser.uid}`);
      } catch (getErr) {
        authUser = await auth.createUser({
          email: invData.email,
          password: password,
          displayName: invData.name,
        });
        console.log(`[acceptInvitation] Created new user: ${authUser.uid}`);
      }

      await db.collection("users").doc(invData.userId).update({
        authUid: authUser.uid,
        authCreated: true,
        authCreatedAt: new Date().toISOString(),
        isActive: true,
        mustChangePassword: false,
        profileComplete: false,
        invitationPending: false,
      });
      await invRef.update({
        status: "ACCEPTED",
        acceptedAt: new Date().toISOString(),
        authUid: authUser.uid,
      });
      console.log(`[acceptInvitation] Done: ${authUser.uid} for ${invData.email}`);
      res.json({success: true, uid: authUser.uid});
    } catch (err) {
      console.error("[acceptInvitation] Error:", err.message);
      res.status(500).json({error: err.message});
    }
  }
);

exports.deleteAuthUser = onRequest(
  {region: "us-central1", cors: true},
  async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    try {
      const {uid} = req.body;
      if (!uid) {
        res.status(400).json({error: "Falta uid"});
        return;
      }
      await auth.deleteUser(uid);
      console.log(`[deleteAuthUser] Deleted auth user ${uid}`);
      res.json({success: true});
    } catch (err) {
      console.error("[deleteAuthUser] Error:", err.message);
      res.status(500).json({error: err.message});
    }
  }
);

exports.setAuthUserDisabled = onRequest(
  {region: "us-central1", cors: true},
  async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    try {
      const {uid, disabled} = req.body;
      if (!uid) {
        res.status(400).json({error: "Falta uid"});
        return;
      }
      await auth.updateUser(uid, { disabled: disabled !== false });
      console.log(`[setAuthUserDisabled] User ${uid} disabled=${disabled !== false}`);
      res.json({success: true});
    } catch (err) {
      console.error("[setAuthUserDisabled] Error:", err.message);
      res.status(500).json({error: err.message});
    }
  }
);

exports.cleanupUserData = onRequest(
  {region: "us-central1", cors: true},
  async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    try {
      const {userId, email} = req.body;
      
      // Eliminar invitaciones pendientes para este email
      if (email) {
        const invitationsSnap = await db.collection("invitations")
          .where("email", "==", email)
          .where("status", "==", "PENDING")
          .get();
        const batch = db.batch();
        invitationsSnap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`[cleanupUserData] Deleted ${invitationsSnap.size} pending invitations for ${email}`);
      }
      
      // Eliminar documento de users
      if (userId) {
        await db.collection("users").doc(userId).delete();
        console.log(`[cleanupUserData] Deleted user doc ${userId}`);
      }
      
      let invitationsDeleted = 0;
      if (email) {
        invitationsDeleted = invitationsSnap.size;
      }
      res.json({success: true, invitationsDeleted});
    } catch (err) {
      console.error("[cleanupUserData] Error:", err.message);
      res.status(500).json({error: err.message});
    }
  }
);

exports.cleanupExpiredInvitations = onRequest(
  {region: "us-central1", cors: true},
  async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    try {
      const now = new Date().toISOString();
      const allSnap = await db.collection("invitations").get();
      const expired = allSnap.docs.filter(d => {
        const data = d.data();
        return data.status === "PENDING" && data.expiresAt < now;
      });
      
      const batch = db.batch();
      expired.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      console.log(`[cleanupExpiredInvitations] Deleted ${expired.length} expired invitations`);
      res.json({success: true, deleted: expired.length});
    } catch (err) {
      console.error("[cleanupExpiredInvitations] Error:", err.message);
      res.status(500).json({error: err.message});
    }
  }
);
