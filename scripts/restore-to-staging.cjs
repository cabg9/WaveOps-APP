// ═══════════════════════════════════════════════════════════════════
// RESTORE A STAGING — Restaura un backup de Firestore (JSON) en otro
// proyecto y crea las cuentas de Authentication correspondientes.
// Uso:
//   node restore-to-staging.cjs <backupDir> <serviceAccountDestino.json> <passwordTemporal>
// Ejemplo:
//   node restore-to-staging.cjs ../../backups/2026-09-13-wve-b3db5 \
//     /Users/cabg/Downloads/wve-pruebas-b3db5-firebase-adminsdk-xxx.json Pruebas2026!
// ═══════════════════════════════════════════════════════════════════

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const [backupDir, saPath, tempPassword] = process.argv.slice(2);
if (!backupDir || !saPath || !tempPassword) {
  console.error('Uso: node restore-to-staging.cjs <backupDir> <serviceAccount.json> <passwordTemporal>');
  process.exit(1);
}
if (!fs.existsSync(backupDir)) { console.error('No existe el backup:', backupDir); process.exit(1); }
if (!fs.existsSync(saPath)) { console.error('No existe el service account:', saPath); process.exit(1); }
if (tempPassword.length < 8) { console.error('La contraseña temporal debe tener al menos 8 caracteres'); process.exit(1); }

const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const auth = admin.auth();

function deserialize(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(deserialize);
  if (typeof value === 'object') {
    if (value.__timestamp) return new Date(value.__timestamp);
    if (value.__ref) return db.doc(value.__ref);
    if (value.__geo) return new admin.firestore.GeoPoint(value.__geo.lat, value.__geo.lng);
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = deserialize(v);
    return out;
  }
  return value;
}

// Estructura del backup: backupDir/<coleccion>/<docId>.json
//                    o: backupDir/<coleccion>/<docId>/<subcoleccion>/<subDocId>.json
async function restoreCollection(colName, colPath, parentRef) {
  const ref = parentRef ? parentRef.collection(colName) : db.collection(colName);
  const abs = colPath;
  if (!fs.existsSync(abs)) return 0;
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    const full = path.join(abs, entry.name);
    if (entry.isFile() && entry.name.endsWith('.json')) {
      const docId = entry.name.replace(/\.json$/, '');
      const data = deserialize(JSON.parse(fs.readFileSync(full, 'utf8')));
      await ref.doc(docId).set(data);
      count++;
    } else if (entry.isDirectory()) {
      // subcolecciones de este documento
      const docId = entry.name;
      count += await restoreDocSubcollections(full, ref.doc(docId));
    }
  }
  return count;
}

async function restoreDocSubcollections(docPath, docRef) {
  const entries = fs.readdirSync(docPath, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += await restoreCollection(entry.name, path.join(docPath, entry.name), docRef);
    }
  }
  return count;
}

async function main() {
  console.log(`Destino: ${serviceAccount.project_id}`);
  console.log(`Backup:  ${backupDir}`);
  console.log('');

  // 1. Restaurar colecciones raiz
  let total = 0;
  const topLevels = fs.readdirSync(backupDir, { withFileTypes: true });
  for (const entry of topLevels) {
    if (entry.name.startsWith('_') || !entry.isDirectory()) continue;
    const n = await restoreCollection(entry.name, path.join(backupDir, entry.name), null);
    console.log(`  ${entry.name}: ${n} documentos`);
    total += n;
  }
  console.log(`Total restaurado: ${total} documentos`);

  // 2. Crear usuarios de Authentication desde la coleccion users
  const usersDir = path.join(backupDir, 'users');
  let created = 0, skipped = 0, failed = 0;
  if (fs.existsSync(usersDir)) {
    const files = fs.readdirSync(usersDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const uid = f.replace(/\.json$/, '');
      const data = JSON.parse(fs.readFileSync(path.join(usersDir, f), 'utf8'));
      const email = data.email;
      if (!email) { skipped++; continue; }
      try {
        await auth.createUser({ uid, email, password: tempPassword });
        created++;
      } catch (err) {
        if (err.code === 'auth/uid-already-exists' || err.code === 'auth/email-already-exists') {
          skipped++;
        } else {
          console.error(`  Error creando ${email}: ${err.message}`);
          failed++;
        }
      }
    }
  }
  console.log(`\nUsuarios Auth creados: ${created} (omitidos: ${skipped}${failed ? `, fallidos: ${failed}` : ''})`);
}

main().catch((err) => { console.error('Error:', err.message); process.exit(1); });
