// ═══════════════════════════════════════════════════════════════════
// PRUEBA E2E (staging) — Ejecuta la MISMA lógica de la Cloud Function
// checkControlExpirations contra la gemela y verifica que las
// notificaciones se creen con los campos exactos que lee la campana.
// Uso: node test-control-alerts.cjs
// ═══════════════════════════════════════════════════════════════════

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const saPath = process.argv[2] || "/Users/cabg/Downloads/wve-pruebas-b3db5-firebase-adminsdk-fbsvc-db1ba52ec8.json";
// La config de las functions (src/config/firebase.js) hace initializeApp()
// con las credenciales por defecto; solo indicamos el archivo vía env.
process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath;

const { runExpirationCheck } = require("./src/notifications/controls");

async function main() {
  const db = admin.firestore();

  // 1) Usuario de prueba: el primero activo que no sea el director
  const usersSnap = await db.collection("users").where("isActive", "==", true).get();
  const target = usersSnap.docs.find((d) => d.data().role !== "DIRECTOR_GENERAL") || usersSnap.docs[0];
  const targetId = target.id;
  console.log("🎯 Usuario destino:", targetId, target.data().email, "(" + target.data().role + ")");

  // 2) Verificar que el uid de Auth coincide con el id del doc users (necesario para las reglas de lectura)
  try {
    const authUser = await admin.auth().getUser(targetId);
    console.log("✅ Auth UID coincide con doc users:", authUser.uid === targetId);
  } catch (e) {
    console.log("❌ Auth UID NO coincide o no existe:", e.message);
  }

  // 3) Crear tipo de control y asignación con vencimiento a +3 días (dentro de alerta de 30 días)
  const now = new Date();
  const expiry = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const typeRef = db.collection("controlTypes").doc("test-alerta-type");
  await typeRef.set({
    name: "Prueba Alerta E2E",
    appliesTo: ["personas"],
    roleIds: [],
    validityMonths: null,
    alertDaysBefore: 30,
    isRequired: false,
    verifierRole: "RRHH",
    customFields: [],
    isActive: true,
    tenantId: "default",
    createdAt: now.toISOString(),
    createdBy: "test",
  });
  const asgRef = db.collection("controlAssignments").doc("test-alerta-asg");
  await asgRef.set({
    controlTypeId: "test-alerta-type",
    controlTypeName: "Prueba Alerta E2E",
    targetType: "user",
    targetId,
    targetName: target.data().name || target.data().email,
    issueDate: now.toISOString(),
    expiryDate: expiry,
    customValues: {},
    status: "vigente",
    history: [],
    isActive: true,
    tenantId: "default",
    createdAt: now.toISOString(),
    createdBy: "test",
  });
  console.log("📝 Asignación creada con vencimiento:", expiry);

  // 4) Ejecutar la lógica EXACTA de la función programada/callable
  const result = await runExpirationCheck();
  console.log("⚙️  Resultado del chequeo:", result);

  // 5) Verificar notificaciones creadas para el destinatario
  const notifSnap = await db.collection("notifications")
    .where("userId", "==", targetId)
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();
  console.log(`🔔 Notificaciones del usuario (${notifSnap.size}):`);
  notifSnap.docs.forEach((d) => {
    const n = d.data();
    console.log("   -", JSON.stringify({ id: d.id, userId: n.userId, type: n.type, title: n.title, read: n.read, priority: n.priority, createdAt: n.createdAt, data: n.data }));
  });

  // 6) Verificar RRHH
  const rrhhSnap = await db.collection("users").where("role", "==", "RRHH").where("isActive", "==", true).get();
  for (const r of rrhhSnap.docs) {
    const nSnap = await db.collection("notifications").where("userId", "==", r.id).orderBy("createdAt", "desc").limit(1).get();
    nSnap.docs.forEach((d) => console.log("👤 RRHH", r.data().email, "→", d.data().title, "| read:", d.data().read));
  }

  // 7) Verificar estado persistido en la asignación
  const asgAfter = await asgRef.get();
  console.log("📌 Estado persistido del control:", asgAfter.data().status, "| lastAlertAt:", asgAfter.data().lastAlertAt);

  // Limpieza del doc de prueba (deja la notificación para ver la campana en vivo)
  await typeRef.delete();
  console.log("🧹 Doc de prueba del tipo eliminado (la asignación y la notificación quedan para que veas la campana)");
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
