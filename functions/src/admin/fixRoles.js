const { onRequest } = require("firebase-functions/v2/https");
const { db } = require("../config/firebase");

const fixRoles = onRequest({ region: "us-central1", cors: true }, async (req, res) => {
  try {
    const secret = req.query.secret || req.body?.secret;
    if (secret !== "WAVEOPS_RESET_2026") {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const usersSnap = await db.collection("users").get();
    const results = { fixed: [], alreadyOk: [] };

    for (const doc of usersSnap.docs) {
      const data = doc.data();
      const oldRole = data.role;
      // Normalizar: espacios → guiones, todo a mayúsculas
      let newRole = oldRole;
      if (typeof oldRole === 'string') {
        newRole = oldRole.replace(/ /g, '_').toUpperCase();
      }
      if (newRole !== oldRole) {
        await doc.ref.update({ role: newRole });
        results.fixed.push({ uid: doc.id, oldRole, newRole });
      } else {
        results.alreadyOk.push({ uid: doc.id, role: oldRole });
      }
    }

    res.json({ success: true, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { fixRoles };
