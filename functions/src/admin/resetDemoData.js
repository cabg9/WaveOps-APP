// ═══════════════════════════════════════════════════════════════════
// RESET DEMO DATA — Borra todo excepto usuario admin principal
// ═══════════════════════════════════════════════════════════════════

const { onRequest } = require("firebase-functions/v2/https");
const { db, auth } = require("../config/firebase");

const ADMIN_EMAIL = "andres.bonilla@galapagosdiveandsurf.com";

const resetDemoData = onRequest({ region: "us-central1", cors: true }, async (req, res) => {
  try {
    const secret = req.query.secret || req.body?.secret;
    if (req.method !== "POST" || secret !== "WAVEOPS_RESET_2026") {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const results = { deleted: {}, errors: [] };

    const adminSnap = await db.collection("users").where("email", "==", ADMIN_EMAIL).limit(1).get();
    let adminUid = null;
    if (!adminSnap.empty) {
      adminUid = adminSnap.docs[0].id;
      results.adminPreserved = { uid: adminUid, email: ADMIN_EMAIL };
    }

    const collectionsToDelete = [
      "tasks", "incidencias", "incidenciaNotes",
      "shiftAssignments", "changeRequests", "timeOffRequests",
      "notifications", "invitations", "fcmTokens"
    ];

    for (const collection of collectionsToDelete) {
      const snap = await db.collection(collection).get();
      const batch = db.batch();
      let count = 0;
      snap.docs.forEach(doc => { batch.delete(doc.ref); count++; });
      if (count > 0) await batch.commit();
      results.deleted[collection] = count;
    }

    const usersSnap = await db.collection("users").get();
    const usersBatch = db.batch();
    let usersDeleted = 0;
    usersSnap.docs.forEach(doc => {
      if (doc.id !== adminUid) { usersBatch.delete(doc.ref); usersDeleted++; }
    });
    if (usersDeleted > 0) await usersBatch.commit();
    results.deleted.users = usersDeleted;

    const authUsers = await auth.listUsers(1000);
    for (const userRecord of authUsers.users) {
      if (userRecord.email !== ADMIN_EMAIL) {
        try {
          await auth.deleteUser(userRecord.uid);
          results.deleted.authUsers = (results.deleted.authUsers || 0) + 1;
        } catch (e) {
          results.errors.push(`Auth delete ${userRecord.email}: ${e.message}`);
        }
      }
    }

    results.success = true;
    results.timestamp = new Date().toISOString();
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { resetDemoData };
