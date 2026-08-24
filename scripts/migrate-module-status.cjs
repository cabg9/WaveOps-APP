const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyA0I98d1hP1EH-3bHHau0fLHQZuccfU10Y",
  authDomain: "wve-b3db5.firebaseapp.com",
  projectId: "wve-b3db5",
  storageBucket: "wve-b3db5.appspot.com",
  messagingSenderId: "79515389827",
  appId: "1:79515389827:web:4869ddbd6c7cc638ac0bb9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  const snap = await getDocs(collection(db, 'appModules'));
  let updated = 0;
  let skipped = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (!data.status) {
      await updateDoc(doc(db, 'appModules', d.id), { status: 'live', updatedAt: new Date().toISOString() });
      console.log(`✅ appModules/${d.id} → status: live`);
      updated++;
    } else {
      console.log(`⏭️  appModules/${d.id} → ya tiene status: ${data.status}`);
      skipped++;
    }
  }
  console.log(`\n✅ Migracion completada: ${updated} actualizados, ${skipped} omitidos`);
}

migrate().catch(e => { console.error('❌', e); process.exit(1); });
