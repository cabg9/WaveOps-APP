// ═══════════════════════════════════════════════════════════════════
// RESET BUSINESS DATA — Cloud Function callable
// Vacía las colecciones de datos de negocio (Fase 0/1). Solo puede
// ejecutarla un usuario autenticado con rol DIRECTOR_GENERAL (campo
// `role` del doc users, ver src/types). Devuelve resumen de conteos.
// La lógica de borrado se comparte con scripts/reset-business-data.cjs
// vía resetBusinessDataCore.js.
// ═══════════════════════════════════════════════════════════════════

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { auth, db } = require("../config/firebase");
const { resetBusinessData } = require("./resetBusinessDataCore");

const DIRECTOR_GENERAL_ROLE = "DIRECTOR_GENERAL";

/**
 * Resuelve el doc users del llamante a partir del uid de Auth:
 * 1) por campo authUid (lo escribe createAuthUser), 2) fallback por email.
 */
async function resolveUserDoc(uid) {
  const byAuthUid = await db.collection("users").where("authUid", "==", uid).limit(1).get();
  if (!byAuthUid.empty) return byAuthUid.docs[0];

  const record = await auth.getUser(uid).catch(() => null);
  if (!record || !record.email) return null;
  const byEmail = await db.collection("users").where("email", "==", record.email).limit(1).get();
  return byEmail.empty ? null : byEmail.docs[0];
}

const resetBusinessDataFn = onCall(
  { region: "us-central1" },
  async (request) => {
    // 1) Autenticado
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Debes iniciar sesión para ejecutar esta acción.");
    }

    // 2) Rol DIRECTOR_GENERAL en el doc users
    const userDoc = await resolveUserDoc(request.auth.uid);
    if (!userDoc) {
      throw new HttpsError("permission-denied", "No se encontró tu usuario en el sistema.");
    }
    const role = userDoc.data().role;
    if (role !== DIRECTOR_GENERAL_ROLE) {
      throw new HttpsError(
        "permission-denied",
        `Esta acción requiere rol DIRECTOR_GENERAL (rol actual: ${role || "sin rol"}).`
      );
    }

    // 3) Borrado (siempre real; el confirm crítico es responsabilidad del cliente)
    const result = await resetBusinessData(db, { dryRun: false });
    console.log(
      `[resetBusinessData] uid=${request.auth.uid} user=${userDoc.id} total=${result.total}`,
      result.deleted
    );

    return { deleted: result.deleted, total: result.total };
  }
);

module.exports = { resetBusinessData: resetBusinessDataFn };
