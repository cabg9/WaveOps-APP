// ═══════════════════════════════════════════════════════════════════
// SEED FASE 0 — Cimientos WaveOps
// 1) Plantillas de rol nuevas: Conductor y Restaurante (toggles apagados).
// 2) Renombres de SOLO presentación (displayName) de módulos existentes:
//    'requisiciones'      → "Inventario / Requisiciones"
//    'ordenes-pago'       → "Compras & Pagos"
//    Los ids y rutas NO se tocan.
// Uso:
//   node seed-fase0.cjs <serviceAccount.json>
// ═══════════════════════════════════════════════════════════════════

const admin = require('firebase-admin');
const fs = require('fs');

const [saPath] = process.argv.slice(2);
if (!saPath || !fs.existsSync(saPath)) {
  console.error('Uso: node seed-fase0.cjs <serviceAccount.json>');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const now = new Date().toISOString();

const NEW_ROLE_TEMPLATES = [
  {
    id: 'conductor',
    name: 'Conductor',
    description: 'Rol operativo para conductores. Por ahora sin permisos: se activará con el módulo Movilidad (Fase 6). Sus toggles vienen desactivados por defecto.',
    baseRole: 'CONDUCTOR',
    level: 7,
    permissions: [],
    moduleAccess: [],
    isSystem: false,
    isActive: true,
    createdAt: now,
    createdBy: 'system',
  },
  {
    id: 'restaurante',
    name: 'Restaurante',
    description: 'Rol operativo para el personal de cocina/restaurante. Por ahora sin permisos: se activará con el módulo Cocina (Fase 3). Sus toggles vienen desactivados por defecto.',
    baseRole: 'RESTAURANTE',
    level: 7,
    permissions: [],
    moduleAccess: [],
    isSystem: false,
    isActive: true,
    createdAt: now,
    createdBy: 'system',
  },
];

const RENAMES = {
  'requisiciones': {
    name: 'Inventario / Requisiciones',
    nameEs: 'Inventario / Requisiciones',
    description: 'Inventario de equipos y productos, con requisiciones entre ubicaciones',
  },
  'ordenes-pago': {
    name: 'Compras & Pagos',
    nameEs: 'Compras & Pagos',
    description: 'Compras a proveedores, órdenes de compra y rol de pagos',
  },
};

async function main() {
  console.log('🌱 Seed Fase 0 — proyecto:', serviceAccount.project_id);

  // 1) Plantillas de rol (idempotente: no pisa si ya existe)
  for (const role of NEW_ROLE_TEMPLATES) {
    const ref = db.collection('roleTemplates').doc(role.id);
    const snap = await ref.get();
    if (snap.exists) {
      console.log(`⏭  Rol "${role.name}" ya existe, no se modifica`);
    } else {
      await ref.set(role);
      console.log(`✅ Rol creado: ${role.name} (permisos: 0, desactivados)`);
    }
  }

  // 2) Renombres de presentación (idempotente, solo name/nameEs/description)
  for (const [moduleId, patch] of Object.entries(RENAMES)) {
    const ref = db.collection('appModules').doc(moduleId);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`⚠️  Módulo "${moduleId}" no existe en este proyecto, se omite`);
      continue;
    }
    const current = snap.data();
    if (current.name === patch.name && current.description === patch.description) {
      console.log(`⏭  Módulo "${moduleId}" ya tiene el nombre nuevo`);
      continue;
    }
    await ref.update({ ...patch, updatedAt: now });
    console.log(`✅ Módulo renombrado: "${current.name}" → "${patch.name}" (id e ruta sin cambios)`);
  }

  // 2b) Feature flags de Fase 0: escritos explicitos en falso (idempotente)
  const settingsRef = db.collection('appSettings').doc('global');
  const settingsSnap = await settingsRef.get();
  const currentFlags = (settingsSnap.exists && settingsSnap.data().featureFlags) || {};
  const FASE0_FLAGS = { enableUbicaciones: false, enableCatalogosMaestros: false, enableCatalogoControles: false };
  const flagsPatch = {};
  for (const [k, v] of Object.entries(FASE0_FLAGS)) {
    if (currentFlags[k] === undefined) flagsPatch[k] = v;
  }
  if (Object.keys(flagsPatch).length > 0) {
    await settingsRef.set({ featureFlags: { ...currentFlags, ...flagsPatch } }, { merge: true });
    console.log('✅ Feature flags Fase 0 escritos (apagados):', Object.keys(flagsPatch).join(', '));
  } else {
    console.log('⏭  Feature flags Fase 0 ya existen, no se modifican');
  }

  console.log('🏁 Seed Fase 0 completado');
}

main().catch((err) => { console.error('Error:', err); process.exit(1); });
