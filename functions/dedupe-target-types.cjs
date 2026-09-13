// Depuración de controlTargetTypes en la gemela: lista entradas y elimina
// duplicadas (mismo nombre con distinto id), remapeando referencias en controlTypes.
// Uso: node functions/dedupe-target-types.cjs [--apply]
const admin = require('firebase-admin');
const fs = require('fs');
const os = require('os');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const KEY_PATH = '/Users/cabg/Downloads/wve-pruebas-b3db5-firebase-adminsdk-fbsvc-db1ba52ec8.json';

const canonicalIds = ['personas', 'departamentos', 'equipos', 'vehiculos', 'embarcaciones', 'ubicaciones'];

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'))),
});
const db = admin.firestore();

const norm = (s) => (s || '').trim().toLowerCase();

async function main() {
  const snap = await db.collection('controlTargetTypes').get();
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  console.log(`Total entradas: ${items.length}`);
  items.forEach((i) => console.log(`  id=${i.id}  name=${i.name}  active=${i.isActive}`));

  // 0) Si el catálogo está vacío, crear las 6 semillas de destinos (mismo
  //    shape que el botón "Cargar iniciales" de la UI).
  if (items.length === 0) {
    const now = new Date().toISOString();
    const seeds = [
      { id: 'personas', name: 'Personas' },
      { id: 'departamentos', name: 'Departamentos' },
      { id: 'equipos', name: 'Equipos' },
      { id: 'vehiculos', name: 'Vehículos' },
      { id: 'embarcaciones', name: 'Embarcaciones' },
      { id: 'ubicaciones', name: 'Ubicaciones' },
    ];
    if (!APPLY) {
      console.log('\n(dry-run) El catálogo está VACÍO. Con --apply se crean las 6 semillas de destinos.');
      return;
    }
    for (const s of seeds) {
      await db.collection('controlTargetTypes').doc(s.id).set({
        tenantId: 'default',
        name: s.name,
        isActive: true,
        createdAt: now,
        createdBy: 'seed-script',
        updatedAt: now,
        updatedBy: 'seed-script',
      });
      console.log(`  creado controlTargetTypes/${s.id} ("${s.name}")`);
    }
    const after = await db.collection('controlTargetTypes').get();
    items = after.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log(`Semillas creadas. Entradas: ${items.length}`);
  }

  // Agrupar por nombre normalizado
  const byName = new Map();
  for (const it of items) {
    const k = norm(it.name);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(it);
  }

  const removals = []; // { removeId, keepId, name }
  for (const [k, group] of byName) {
    if (group.length < 2) continue;
    // Mantener: id canónico de semilla si existe; si no, el primero
    const keep =
      group.find((g) => canonicalIds.includes(g.id)) || group[0];
    for (const g of group) {
      if (g.id !== keep.id) removals.push({ removeId: g.id, keepId: keep.id, name: g.name });
    }
  }

  if (removals.length === 0) {
    console.log('\nNo hay duplicados por nombre.');
    return;
  }

  console.log('\nDuplicados a eliminar:');
  removals.forEach((r) => console.log(`  quitar id=${r.removeId} ("${r.name}") → conservar id=${r.keepId}`));

  if (!APPLY) {
    console.log('\n(dry-run: vuelve a correr con --apply para ejecutar)');
    return;
  }

  // Remapear referencias en controlTypes
  const ctSnap = await db.collection('controlTypes').get();
  const remap = new Map(removals.map((r) => [r.removeId, r.keepId]));
  for (const d of ctSnap.docs) {
    const data = d.data();
    let changed = false;
    let appliesTo = Array.isArray(data.appliesTo) ? [...data.appliesTo] : [];
    appliesTo = appliesTo.map((id) => {
      if (remap.has(id)) { changed = true; return remap.get(id); }
      return id;
    });
    // quitar ids duplicados tras el remap
    const deduped = [...new Set(appliesTo)];
    if (deduped.length !== appliesTo.length) changed = true;

    let targetSelections = data.targetSelections && typeof data.targetSelections === 'object'
      ? { ...data.targetSelections } : undefined;
    if (targetSelections) {
      for (const [removeId, keepId] of remap) {
        if (removeId in targetSelections) {
          const merged = [...(targetSelections[keepId] || []), ...(targetSelections[removeId] || [])];
          targetSelections[keepId] = [...new Set(merged)];
          delete targetSelections[removeId];
          changed = true;
        }
      }
    }

    if (changed) {
      await d.ref.update({
        appliesTo: deduped,
        ...(targetSelections ? { targetSelections } : {}),
        updatedAt: new Date().toISOString(),
      });
      console.log(`  controlTypes/${d.id}: referencias remapeadas`);
    }
  }

  // Eliminar documentos duplicados
  for (const r of removals) {
    await db.collection('controlTargetTypes').doc(r.removeId).delete();
    console.log(`  eliminado controlTargetTypes/${r.removeId} ("${r.name}")`);
  }

  const after = await db.collection('controlTargetTypes').get();
  console.log(`\nListo. Entradas restantes: ${after.size}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
