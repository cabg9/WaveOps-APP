const { onRequest } = require("firebase-functions/v2/https");
const { db } = require("../config/firebase");

const listCollections = onRequest({ region: "us-central1", cors: true }, async (req, res) => {
  try {
    const secret = req.query.secret;
    if (secret !== "WAVEOPS_RESET_2026") {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    // Obtener todas las colecciones de nivel raíz
    const collections = await db.listCollections();
    const result = {
      collections: collections.map(col => col.id),
      documentCounts: {},
      timestamp: new Date().toISOString()
    };

    // Contar documentos en cada colección
    for (const col of collections) {
      const snap = await col.limit(1).get(); // Solo verificamos si tiene docs
      const countSnap = await col.count().get();
      result.documentCounts[col.id] = countSnap.data().count;
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { listCollections };
