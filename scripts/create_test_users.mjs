// Crea usuarios de prueba en Firebase Auth + Firestore para validar WaveOps.
// Uso: node scripts/create_test_users.mjs
// Nota: los usuarios creados deben eliminarse manualmente despues de las pruebas.

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, setPersistence, inMemoryPersistence } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCOlASRXK2geXYb60GNOIgM5bIXoiZbj9k",
  authDomain: "wve-b3db5.firebaseapp.com",
  projectId: "wve-b3db5",
  storageBucket: "wve-b3db5.firebasestorage.app",
  messagingSenderId: "782495799708",
  appId: "1:782495799708:web:cee488686971bd86879059"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
await setPersistence(auth, inMemoryPersistence);
const db = getFirestore(app);

const PASSWORD = 'WaveOps2026!';

const TEST_USERS = [
  {
    email: 'rrhh_prueba@waveops.test',
    name: 'RRHH Prueba',
    role: 'RRHH',
    department: 'ADMINISTRATIVO',
    position: 'RRHH',
    level: 3,
  },
  {
    email: 'gerente_ops_prueba@waveops.test',
    name: 'Gerente Operaciones Prueba',
    role: 'GERENTE_OPERACIONES',
    department: 'OPERACIONES',
    position: 'Gerente de Operaciones',
    level: 4,
  },
  {
    email: 'gerente_diveshop_prueba@waveops.test',
    name: 'Gerente Dive Shop Prueba',
    role: 'GERENTE_DEPARTAMENTO',
    department: 'DIVE_SHOP',
    position: 'Gerente Dive Shop',
    level: 5,
  },
  {
    email: 'supervisor_diveshop_prueba@waveops.test',
    name: 'Supervisor Dive Shop Prueba',
    role: 'SUPERVISOR',
    department: 'DIVE_SHOP',
    position: 'Supervisor Dive Shop',
    level: 6,
  },
  {
    email: 'staff1_diveshop_prueba@waveops.test',
    name: 'Staff Dive Shop 1 Prueba',
    role: 'STAFF',
    department: 'DIVE_SHOP',
    position: 'Voluntario Dive Shop',
    level: 7,
  },
  {
    email: 'staff2_diveshop_prueba@waveops.test',
    name: 'Staff Dive Shop 2 Prueba',
    role: 'STAFF',
    department: 'DIVE_SHOP',
    position: 'Voluntario Dive Shop',
    level: 7,
  },
];

const results = [];

for (const u of TEST_USERS) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, u.email, PASSWORD);
    const uid = cred.user.uid;

    await setDoc(doc(db, 'users', uid), {
      ...u,
      isActive: true,
      profileComplete: true,
      mustChangePassword: false,
      authUid: uid,
      authCreated: true,
      phone: '+593999999999',
      nationality: 'Ecuador',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    results.push({ email: u.email, password: PASSWORD, uid, status: 'creado' });
    console.log(`✓ Creado: ${u.email} → ${uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      results.push({ email: u.email, password: PASSWORD, uid: null, status: 'ya existe en Auth' });
      console.warn(`⚠ Ya existe: ${u.email}`);
    } else {
      results.push({ email: u.email, password: PASSWORD, uid: null, status: `error: ${err.message}` });
      console.error(`✗ Error creando ${u.email}:`, err.message);
    }
  }
}

console.log('\n--- RESUMEN ---');
console.table(results);
