const { onRequest } = require("firebase-functions/v2/https");
const { db } = require("../config/firebase");
const { setCorsHeaders } = require("../utils/cors");

const cleanupUserData = onRequest(
  { region: "us-central1", cors: true },
  async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    try {
      const { userId, email } = req.body;
      let invitationsDeleted = 0;

      if (email) {
        const invitationsSnap = await db.collection("invitations")
          .where("email", "==", email)
          .where("status", "==", "PENDING")
          .get();
        const batch = db.batch();
        invitationsSnap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        invitationsDeleted = invitationsSnap.size;
        console.log(`[cleanupUserData] Deleted ${invitationsSnap.size} pending invitations for ${email}`);
      }

      if (userId) {
        await db.collection("users").doc(userId).delete();
        console.log(`[cleanupUserData] Deleted user doc ${userId}`);
      }

      res.json({ success: true, invitationsDeleted });
    } catch (err) {
      console.error("[cleanupUserData] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

const cleanupExpiredInvitations = onRequest(
  { region: "us-central1", cors: true },
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
      res.json({ success: true, deleted: expired.length });
    } catch (err) {
      console.error("[cleanupExpiredInvitations] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = { cleanupUserData, cleanupExpiredInvitations };
