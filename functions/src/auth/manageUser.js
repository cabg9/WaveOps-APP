const { onRequest } = require("firebase-functions/v2/https");
const { auth } = require("../config/firebase");
const { setCorsHeaders } = require("../utils/cors");

const deleteAuthUser = onRequest(
  { region: "us-central1", cors: true },
  async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    try {
      const { uid } = req.body;
      if (!uid) {
        res.status(400).json({ error: "Falta uid" });
        return;
      }
      await auth.deleteUser(uid);
      console.log(`[deleteAuthUser] Deleted auth user ${uid}`);
      res.json({ success: true });
    } catch (err) {
      console.error("[deleteAuthUser] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

const setAuthUserDisabled = onRequest(
  { region: "us-central1", cors: true },
  async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    try {
      const { uid, disabled } = req.body;
      if (!uid) {
        res.status(400).json({ error: "Falta uid" });
        return;
      }
      await auth.updateUser(uid, { disabled: disabled !== false });
      console.log(`[setAuthUserDisabled] User ${uid} disabled=${disabled !== false}`);
      res.json({ success: true });
    } catch (err) {
      console.error("[setAuthUserDisabled] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = { deleteAuthUser, setAuthUserDisabled };
