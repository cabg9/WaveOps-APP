// ═══════════════════════════════════════════════════════════════════
// SEED FASE 1 — Warehouse (WaveOps)
// 1) Módulo appModules/warehouse (idempotente: no pisa si ya existe).
// 2) Feature flag enableWarehouse=false en appSettings/global
//    (solo si no existe; el módulo se controla por flag aunque el doc
//    del módulo exista).
// 3) Permiso canViewModuleWarehouse agregado a las plantillas de rol
//    director_general (baseRole DIRECTOR_GENERAL) y gerente_operaciones
//    (baseRole GERENTE_OPERACIONES), solo si no está.
// Uso:
//   node seed-fase1.cjs <serviceAccount.json>
// ═══════════════════════════════════════════════════════════════════

const admin = require('firebase-admin');
const fs = require('fs');

const [saPath] = process.argv.slice(2);
if (!saPath || !fs.existsSync(saPath)) {
  console.error('Uso: node seed-fase1.cjs <serviceAccount.json>');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const now = new Date().toISOString();

const WAREHOUSE_MODULE = {
  id: 'warehouse',
  name: 'Warehouse',
  nameEs: 'Warehouse',
  description: 'Cara operativa de inventario: órdenes de renta, despacho con QR, retornos y verificación',
  icon: 'Warehouse',
  color: '#0E7490',
  route: '/warehouse',
  isActive: true,
  isVisible: true,
  status: 'live',
  order: 20,
  category: 'operations',
  requiredPermission: 'canViewModuleWarehouse',
  isSystem: false,
  tenantId: 'default',
  createdAt: now,
  createdBy: 'system',
};

const PERMISSION = 'canViewModuleWarehouse';
// baseRole (no el id del doc) para no depender de cómo se llamen los docs
const TARGET_BASE_ROLES = ['DIRECTOR_GENERAL', 'GERENTE_OPERACIONES'];

async function main() {
  console.log('🌱 Seed Fase 1 — proyecto:', serviceAccount.project_id);

  // 1) Módulo warehouse (idempotente: no pisa si ya existe)
  const moduleRef = db.collection('appModules').doc('warehouse');
  const moduleSnap = await moduleRef.get();
  if (moduleSnap.exists) {
    console.log('⏭  Módulo "warehouse" ya existe, no se modifica');
  } else {
    await moduleRef.set(WAREHOUSE_MODULE);
    console.log('✅ Módulo creado: appModules/warehouse');
  }

  // 2) Feature flag enableWarehouse=false (solo si no existe)
  const settingsRef = db.collection('appSettings').doc('global');
  const settingsSnap = await settingsRef.get();
  const currentFlags = (settingsSnap.exists && settingsSnap.data().featureFlags) || {};
  if (currentFlags.enableWarehouse === undefined) {
    await settingsRef.set(
      { featureFlags: { ...currentFlags, enableWarehouse: false } },
      { merge: true }
    );
    console.log('✅ Feature flag escrito (apagado): enableWarehouse');
  } else {
    console.log('⏭  Feature flag enableWarehouse ya existe, no se modifica');
  }

  // 3) Permiso canViewModuleWarehouse en plantillas de rol (solo si falta)
  const rolesSnap = await db.collection('roleTemplates').get();
  for (const roleDoc of rolesSnap.docs) {
    const role = roleDoc.data();
    if (!TARGET_BASE_ROLES.includes(role.baseRole)) continue;
    const permissions = Array.isArray(role.permissions) ? role.permissions : [];
    if (permissions.includes(PERMISSION)) {
      console.log(`⏭  Rol "${role.name}" ya tiene ${PERMISSION}`);
      continue;
    }
    await roleDoc.ref.update({
      permissions: [...permissions, PERMISSION],
      updatedAt: now,
    });
    console.log(`✅ Permiso ${PERMISSION} agregado al rol "${role.name}"`);
  }

  console.log('🏁 Seed Fase 1 completado');
}

main().catch((err) => { console.error('Error:', err); process.exit(1); });
