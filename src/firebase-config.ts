// Firebase Configuration for WaveOps
// La app elige el proyecto segun la URL donde se abre:
// - URL de pruebas (contiene "pruebas" o "staging") o desarrollo local -> proyecto wve-pruebas-b3db5
// - Cualquier otra URL -> produccion wve-b3db5
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import { getFunctions } from "firebase/functions";

const prodConfig = {
  apiKey: "AIzaSyCOlASRXK2geXYb60GNOIgM5bIXoiZbj9k",
  authDomain: "wve-b3db5.firebaseapp.com",
  projectId: "wve-b3db5",
  storageBucket: "wve-b3db5.firebasestorage.app",
  messagingSenderId: "782495799708",
  appId: "1:782495799708:web:cee488686971bd86879059"
};

const stagingConfig = {
  apiKey: "AIzaSyDCOzOyj0yWUJ2kDwr-F6CExlVhtw52u2A",
  authDomain: "wve-pruebas-b3db5.firebaseapp.com",
  projectId: "wve-pruebas-b3db5",
  storageBucket: "wve-pruebas-b3db5.firebasestorage.app",
  messagingSenderId: "1036785993835",
  appId: "1:1036785993835:web:9999d70e8e0b1552e0492e"
};

function resolveConfig() {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const isStaging =
    isLocal ||
    host.includes("pruebas") ||
    host.includes("staging") ||
    host.includes("wve-pruebas-b3db5");
  return isStaging ? stagingConfig : prodConfig;
}

const firebaseConfig = resolveConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);
export const functions = getFunctions(app);

export default app;
