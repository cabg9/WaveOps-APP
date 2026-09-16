// ═══════════════════════════════════════════════════════════════════
// RESET BUSINESS DATA — Script CLI para la gemela de pruebas
// wve-pruebas-b3db5 (alias "staging" en .firebaserc).
// Borra SOLO datos de negocio (ver resetBusinessDataCore.js). Conserva
// usuarios, departamentos, roles, ubicaciones, módulos, flags,
// notificaciones, auditoría y catálogos base.
//
// SEGURIDAD: aborta si el projectId del service account no es
// exactamente wve-pruebas-b3db5. Nunca contra producción.
//
// Uso:
//   node reset-business-data.cjs <serviceAccount.json>           # dry-run
//   node reset-business-data.cjs <serviceAccount.json> --execute # borra
// ═══════════════════════════════════════════════════════════════════

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const ALLOWED_PROJECT = 'wve-pruebas-b3db5';

const [saPath, ...flags] = process.argv.slice(2);
const execute = flags.includes('--execute');

if (!saPath || !fs.existsSync(saPath)) {
  console.error('Uso: node reset-business-data.cjs <serviceAccount.json> [--execute]');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));

// ─── Seguridad obligatoria: solo la gemela de pruebas ───
if (serviceAccount.project_id !== ALLOWED_PROJECT) {
  console.error(`❌ ABORTADO: Este script solo puede ejecutarse contra la gemela de pruebas (${ALLOWED_PROJECT}).`);
  console.error(`   project_id del credential recibido: ${serviceAccount.project_id}`);
  process.exit(1);
}

// La lógica de borrado vive en el core compartido con la Cloud Function
const { resetBusinessData } = require(path.join(__dirname, '..', 'functions', 'src', 'admin', 'resetBusinessDataCore'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
  console.log(`🧹 Reset de datos de negocio — proyecto: ${serviceAccount.project_id}`);
  console.log(`   Modo: ${execute ? 'EJECUCIÓN REAL (--execute)' : 'DRY-RUN (sin --execute, solo se cuentan)'}\n`);

  const result = await resetBusinessData(db, { dryRun: !execute });

  console.log(`${execute ? '🗑  Borrado' : '📋 Se borraría'} por colección:`);
  for (const [name, n] of Object.entries(result.deleted)) {
    console.log(`   ${name}: ${n}`);
  }
  console.log(`\nTotal: ${result.total} documento(s)`);
  console.log('\nConservado (no se toca):');
  console.log(`   ${result.preserved.join(', ')}`);

  if (!execute) {
    console.log('\n⚠️  DRY-RUN: no se borró nada. Ejecuta de nuevo con --execute para borrar de verdad.');
  } else {
    console.log('\n✅ Reset completado.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error('Error:', err); process.exit(1); });
