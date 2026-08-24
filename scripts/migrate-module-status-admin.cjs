const admin = require('firebase-admin');
const serviceAccount = require('/Users/cabg/Downloads/wve-b3db5-firebase-adminsdk-fbsvc-b2642875d4.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrate() {
  const snapshot = await db.collection('appModules').get();
  const batch = db.batch();
  let count = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (!data.status) {
      batch.update(doc.ref, { status: 'live' });
      count++;
    } else if (data.status === 'beta') {
      batch.update(doc.ref, { status: 'live' });
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`✅ Migración completa: ${count} módulos actualizados a status: 'live'`);
  } else {
    console.log('ℹ️ No había módulos sin status ni en estado beta.');
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error en migración:', err);
    process.exit(1);
  });
