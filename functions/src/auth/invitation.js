const { onRequest } = require("firebase-functions/v2/https");
const sgMail = require("@sendgrid/mail");
const { db, auth } = require("../config/firebase");
const { SENDGRID_API_KEY } = require("../config/secrets");
const { invitationEmailTemplate } = require("../templates/emails");
const { setCorsHeaders } = require("../utils/cors");

const sendInvitationEmail = onRequest(
  { region: "us-central1", cors: true, secrets: [SENDGRID_API_KEY] },
  async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    const sendgridKey = SENDGRID_API_KEY.value();
    sgMail.setApiKey(sendgridKey);

    try {
      const { email, name, role, department, userId, origin } = req.body;
      if (!email || !name || !userId) {
        res.status(400).json({ error: "Faltan datos obligatorios" });
        return;
      }

      const token = Array.from({ length: 32 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 62))
      ).join('');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 72);

      await db.collection("users").doc(userId).set({
        invitationPending: true,
        invitedAt: new Date().toISOString(),
      }, { merge: true });

      // Invalidar invitaciones anteriores pendientes para este usuario/email
      const oldInvitations = await db.collection("invitations")
        .where("userId", "==", userId)
        .where("status", "==", "PENDING")
        .get();
      const batch = db.batch();
      oldInvitations.docs.forEach((doc) => {
        if (doc.id !== token) batch.update(doc.ref, { status: "SUPERSEDED", supersededAt: new Date().toISOString() });
      });
      await batch.commit();

      await db.collection("invitations").doc(token).set({
        email, name, role, department, userId, token,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        acceptedAt: null,
      });

      const baseUrl = origin || `https://wve-b3db5.web.app`;
      const invitationLink = `${baseUrl}/invitation?token=${token}`;

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
        res.json({ success: true, token, link: invitationLink, emailSent: true });
      } catch (emailError) {
        console.error(`[sendInvitationEmail] Error:`, emailError.message);
        res.json({ success: true, token, link: invitationLink, emailSent: false, error: emailError.message });
      }
    } catch (err) {
      console.error("[sendInvitationEmail] Fatal error:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

const acceptInvitation = onRequest(
  { region: "us-central1", cors: true },
  async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    try {
      const { token, password } = req.body;
      if (!token || !password) {
        res.status(400).json({ error: "Faltan token o password" });
        return;
      }

      const invRef = db.collection("invitations").doc(token);
      const invSnap = await invRef.get();
      if (!invSnap.exists) {
        res.status(400).json({ error: "Token invalido" });
        return;
      }

      const invData = invSnap.data();
      if (invData.status !== "PENDING") {
        res.status(400).json({ error: "Invitacion ya fue usada o expiro" });
        return;
      }
      if (new Date(invData.expiresAt) < new Date()) {
        await invRef.update({ status: "EXPIRED" });
        res.status(400).json({ error: "Invitacion expirada" });
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

      const userRef = db.collection("users").doc(invData.userId);
      const userSnap = await userRef.get();
      const userUpdate = {
        authUid: authUser.uid,
        authCreated: true,
        authCreatedAt: new Date().toISOString(),
        isActive: true,
        mustChangePassword: false,
        profileComplete: false,
        invitationPending: false,
      };
      if (userSnap.exists) {
        await userRef.update(userUpdate);
      } else {
        await userRef.set({
          id: invData.userId,
          email: invData.email,
          name: invData.name,
          role: invData.role || 'STAFF',
          department: invData.department || 'DIVE_SHOP',
          level: 7,
          isActive: true,
          createdAt: new Date().toISOString(),
          ...userUpdate,
        });
      }
      await invRef.update({
        status: "ACCEPTED",
        acceptedAt: new Date().toISOString(),
        authUid: authUser.uid,
      });
      console.log(`[acceptInvitation] Done: ${authUser.uid} for ${invData.email}`);
      res.json({ success: true, uid: authUser.uid });
    } catch (err) {
      console.error("[acceptInvitation] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = { sendInvitationEmail, acceptInvitation };
