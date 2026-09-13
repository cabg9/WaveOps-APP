// ═══════════════════════════════════════════════════════════════════
// PRUEBA E2E (staging) — Subida real a Storage con usuario autenticado,
// verificando las reglas de storage.rules en la ruta products/.
// Uso: node test-storage-upload.mjs
// ═══════════════════════════════════════════════════════════════════
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { initializeApp as initClient } from "firebase/app";
import { getAuth as getClientAuth, signInWithCustomToken } from "firebase/auth";
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";

process.env.GOOGLE_APPLICATION_CREDENTIALS =
  process.argv[2] || "/Users/cabg/Downloads/wve-pruebas-b3db5-firebase-adminsdk-fbsvc-db1ba52ec8.json";

const adminApp = initializeApp({ credential: cert(JSON.parse((await import("fs")).readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"))) }, "admin-test");
const adminAuth = getAuth(adminApp);

const stagingConfig = {
  apiKey: "AIzaSyDCOzOyj0yWUJ2kDwr-F6CExlVhtw52u2A",
  authDomain: "wve-pruebas-b3db5.firebaseapp.com",
  projectId: "wve-pruebas-b3db5",
  storageBucket: "wve-pruebas-b3db5.firebasestorage.app",
  messagingSenderId: "1036785993835",
  appId: "1:1036785993835:web:9999d70e8e0b1552e0492e",
};

const clientApp = initClient(stagingConfig);
const clientAuth = getClientAuth(clientApp);

const customToken = await adminAuth.createCustomToken("0HFLZ8CQEnCSRY8FEFPj"); // usuario director en staging
const cred = await signInWithCustomToken(clientAuth, customToken);
console.log("✅ Login cliente OK:", cred.user.uid);

const storage = getStorage(clientApp);
const testRef = ref(storage, "products/test_e2e_rules.txt");
await uploadString(testRef, "prueba de reglas de storage");
console.log("✅ Subida a products/ OK");
const url = await getDownloadURL(testRef);
console.log("✅ Download URL OK:", url.slice(0, 80) + "...");
await deleteObject(testRef);
console.log("✅ Eliminado (limpieza)");
process.exit(0);
