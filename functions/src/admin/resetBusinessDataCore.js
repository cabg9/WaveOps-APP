// ═══════════════════════════════════════════════════════════════════
// RESET DE DATOS DE NEGOCIO — Lógica compartida (core)
// Usada por:
//   - Cloud Function callable resetBusinessData (functions/src/admin)
//   - Script CLI scripts/reset-business-data.cjs (gemela de pruebas)
// Borra SOLO datos de negocio (Fase 0/1). Conserva usuarios,
// departamentos, roles, ubicaciones, módulos, flags, notificaciones,
// auditoría y catálogos base.
// ═══════════════════════════════════════════════════════════════════

// Colecciones que se vacían COMPLETAS
const FULL_DELETE_COLLECTIONS = [
  "products",
  "suppliers",
  "inventoryStocks",
  "inventoryMovements",
  "inventoryTransfers",
  "countSessions",
  "rentalUnits",
  "rentalOrders",
  "purchaseRequisitions",
  "controlAssignments",
];

// Colecciones que se conservan íntegras (referencia / documentación)
const PRESERVED_COLLECTIONS = [
  "users",
  "departments",
  "roleTemplates",
  "positions",
  "locations",
  "locationTypes",
  "locationGroups",
  "appModules",
  "appSettings",
  "notifications",
  "auditLogs",
  "timeOffRequests",
  "productCategories",
  "unitsOfMeasure",
  "costCenters",
  "salesChannels",
  "movementTypes",
  "serialStatuses",
  "rentalOrderStatuses",
  "rentalFees",
  "rentalDiscounts",
  "controlTypes",
  "controlTargetTypes",
];

// Clientes internos (por departamento) se conservan; se borran los de
// tipo externo/persona/empresa (campo `type`, ver Client en src/types/catalogs.ts)
const CLIENT_TYPE_PRESERVE = "interno";

const BATCH_SIZE = 500;

async function countCollection(db, name) {
  const snap = await db.collection(name).limit(BATCH_SIZE).get();
  return snap.size; // aproximado si hay más de BATCH_SIZE; suficiente para reporte
}

async function deleteCollectionInBatches(db, name) {
  let count = 0;
  while (true) {
    const snap = await db.collection(name).limit(BATCH_SIZE).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    count += snap.docs.length;
  }
  return count;
}

async function deleteExternalClients(db, dryRun) {
  let count = 0;
  let lastDoc = null;
  while (true) {
    let q = db.collection("clients").limit(BATCH_SIZE);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;
    lastDoc = snap.docs[snap.docs.length - 1];
    const toDelete = snap.docs.filter(
      (d) => d.data().type !== CLIENT_TYPE_PRESERVE
    );
    if (toDelete.length > 0) {
      if (!dryRun) {
        const batch = db.batch();
        toDelete.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      count += toDelete.length;
    }
    if (snap.size < BATCH_SIZE) break;
  }
  return count;
}

/**
 * Resetea los datos de negocio.
 * @param {FirebaseFirestore.Firestore} db
 * @param {{ dryRun?: boolean }} opts — dryRun=true solo cuenta, no borra
 * @returns {Promise<{deleted: Object<string, number>, preserved: string[], total: number, dryRun: boolean}>}
 */
async function resetBusinessData(db, opts = {}) {
  const dryRun = !!opts.dryRun;
  const deleted = {};

  for (const name of FULL_DELETE_COLLECTIONS) {
    deleted[name] = dryRun
      ? await countCollection(db, name)
      : await deleteCollectionInBatches(db, name);
  }

  deleted["clients (externos: persona/empresa)"] = await deleteExternalClients(db, dryRun);

  const total = Object.values(deleted).reduce((sum, n) => sum + n, 0);
  return { deleted, preserved: PRESERVED_COLLECTIONS.slice(), total, dryRun };
}

module.exports = {
  FULL_DELETE_COLLECTIONS,
  PRESERVED_COLLECTIONS,
  resetBusinessData,
};
