// ═══════════════════════════════════════════════════════════════════
// BACKUP DE FIRESTORE — Exporta todas las colecciones (y subcolecciones)
// a archivos JSON locales en ./backups/YYYY-MM-DD/
// Uso: node backup-firestore.cjs /ruta/al/service-account.json
// ═══════════════════════════════════════════════════════════════════

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = process.argv[2];
if (!serviceAccountPath) {
  console.error('Falta la ruta del service account:');
  console.error('  node backup-firestore.cjs /ruta/al/service-account.json');
  process.exit(1);
}

if (!fs.existsSync(serviceAccountPath)) {
  console.error('No existe el service account:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const projectId = serviceAccount.project_id;
const today = new Date().toISOString().slice(0, 10);
const outDir = path.join(__dirname, '..', 'backups', `${today}-${projectId}`);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function serialize(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof admin.firestore.Timestamp) {
    return { __timestamp: value.toDate().toISOString() };
  }
  if (value instanceof admin.firestore.GeoPoint) {
    return { __geo: { lat: value.latitude, lng: value.longitude } };
  }
  if (value instanceof admin.firestore.DocumentReference) {
    return { __ref: value.path };
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = serialize(v);
    return out;
  }
  return value;
}

async function exportCollection(ref, basePath) {
  const snap = await ref.get();
  if (snap.empty) return { docs: 0, sub: 0 };

  const dir = path.join(outDir, basePath);
  fs.mkdirSync(dir, { recursive: true });

  let count = 0;
  for (const doc of snap.docs) {
    const data = serialize(doc.data());
    fs.writeFileSync(path.join(dir, `${doc.id}.json`), JSON.stringify(data, null, 2));
    count++;
  }

  let subCount = 0;
  for (const doc of snap.docs) {
    const subCols = await doc.ref.listCollections();
    for (const sub of subCols) {
      const r = await exportCollection(sub, `${basePath}/${doc.id}/${sub.id}`);
      subCount += r.docs + r.sub;
    }
  }
  return { docs: count, sub: subCount };
}

async function main() {
  console.log(`Respaldo del proyecto: ${projectId}`);
  console.log(`Destino: ${outDir}`);
  fs.mkdirSync(outDir, { recursive: true });

  const cols = await db.listCollections();
  if (cols.length === 0) {
    console.log('No se encontraron colecciones.');
    return;
  }

  let total = 0;
  for (const col of cols) {
    const r = await exportCollection(col, col.id);
    total += r.docs + r.sub;
    console.log(`  ${col.id}: ${r.docs} documentos${r.sub ? ` (+${r.sub} en subcolecciones)` : ''}`);
  }

  // Manifest
  fs.writeFileSync(
    path.join(outDir, '_manifest.json'),
    JSON.stringify({ projectId, fecha: new Date().toISOString(), totalDocumentos: total, colecciones: cols.map(c => c.id) }, null, 2)
  );

  console.log(`\nListo: ${total} documentos respaldados en ${outDir}`);
}

main().catch((err) => {
  console.error('Error en el respaldo:', err.message);
  process.exit(1);
});
