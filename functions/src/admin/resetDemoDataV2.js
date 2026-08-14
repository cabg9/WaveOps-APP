const { onRequest } = require("firebase-functions/v2/https");
const { db } = require("../config/firebase");

const resetDemoDataV2 = onRequest({ region: "us-central1", cors: true }, async (req, res) => {
  try {
    const secret = req.query.secret || req.body?.secret;
    if (req.method !== "POST" || secret !== "WAVEOPS_RESET_2026") {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const results = { deleted: {}, preserved: [], errors: [] };
    results.preserved = ["appModules", "appSettings", "departments", "roleTemplates", "users"];

    const collectionsToDelete = [
      "assignments", "auditLogs", "incapacidades",
      "notifications", "shiftRequests", "shifts", "solicitudes"
    ];

    for (const collection of collectionsToDelete) {
      try {
        let count = 0;
        while (true) {
          const snap = await db.collection(collection).limit(500).get();
          if (snap.empty) break;
          const batch = db.batch();
          snap.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          count += snap.docs.length;
        }
        results.deleted[collection] = count;
      } catch (e) {
        results.errors.push(`${collection}: ${e.message}`);
      }
    }

    results.success = true;
    results.timestamp = new Date().toISOString();
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { resetDemoDataV2 };
