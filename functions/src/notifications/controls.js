// ═══════════════════════════════════════════════════════════════════
// CONTROLES — Vencimientos y alertas (Catálogo Dinámico de Controles)
// ═══════════════════════════════════════════════════════════════════
// - checkControlExpirations: Cloud Function programada (cada 15 min).
//   Calcula estados (vigente/por_vencer/vencido), los persiste y envía
//   notificación (campana + push + email) al asignado y a RRHH.
// - notifyControlAssigned: al crear un control asignado, avisa de
//   inmediato a la persona asignada (campana + push + email).
// - checkControlsNow: callable para probar en caliente desde la UI
//   (botón "Verificar vencimientos ahora"). Solo DG/RRHH.

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const sgMail = require("@sendgrid/mail");
const { defineSecret } = require("firebase-functions/params");
const { db, auth } = require("../config/firebase");
const { sendPushNotification } = require("./push");

const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");

const REGION = "us-central1";
const ALERT_DEDUPE_HOURS = 20; // no re-notificar del mismo control antes de 20h

// ── Helpers ──

function toDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function computeStatus(expiryDate, alertDaysBefore, verifiedAt) {
  if (!expiryDate) return "vigente";
  const exp = toDate(expiryDate);
  if (!exp) return "vigente";
  const now = new Date();
  if (exp.getTime() < now.getTime()) return "vencido";
  const alertMs = (alertDaysBefore || 0) * 24 * 60 * 60 * 1000;
  if (exp.getTime() - alertMs <= now.getTime()) return "por_vencer";
  if (verifiedAt) return "verificado";
  return "vigente";
}

async function getRRHHUserIds() {
  const snap = await db.collection("users")
    .where("role", "==", "RRHH")
    .where("isActive", "==", true)
    .get();
  return snap.docs.map((d) => d.id);
}

async function getUserEmail(userId) {
  const snap = await db.collection("users").doc(userId).get();
  return snap.exists ? snap.data().email || null : null;
}

async function sendControlEmail({ to, subject, text }) {
  if (!to) return;
  try {
    sgMail.setApiKey(SENDGRID_API_KEY.value());
    await sgMail.send({
      to,
      from: "welcome@waveops.app",
      subject,
      text,
    });
  } catch (err) {
    console.warn(`[controles] Email no enviado a ${to}:`, err.message);
  }
}

async function notifyUser({ userId, type, title, body, priority, emailSubject, emailText }) {
  await db.collection("notifications").add({
    userId,
    type,
    title,
    body,
    data: { link: "/develops" },
    read: false,
    createdAt: new Date().toISOString(),
    createdBy: "system",
    priority: priority || "normal",
  });
  sendPushNotification(userId, title, body, { link: "/develops" }).catch(() => {});
  const email = await getUserEmail(userId);
  if (email) await sendControlEmail({ to: email, subject: emailSubject || title, text: emailText || body });
}

// ── Lógica central de verificación ──

async function runExpirationCheck() {
  const now = new Date();
  const nowIso = now.toISOString();
  const dedupeBefore = new Date(now.getTime() - ALERT_DEDUPE_HOURS * 60 * 60 * 1000);

  // Catálogo de tipos (para alertDaysBefore)
  const typesSnap = await db.collection("controlTypes").get();
  const typesMap = new Map(typesSnap.docs.map((d) => [d.id, d.data()]));

  // Asignaciones activas con vencimiento
  const snap = await db.collection("controlAssignments")
    .where("isActive", "==", true)
    .get();

  const rrhhIds = await getRRHHUserIds();
  let updated = 0;
  let alerts = 0;

  for (const doc of snap.docs) {
    const a = doc.data();
    if (!a.expiryDate) continue;
    const type = typesMap.get(a.controlTypeId) || {};
    const alertDays = a.alertDaysBefore ?? type.alertDaysBefore ?? 30;
    const status = computeStatus(a.expiryDate, alertDays, a.verifiedAt);

    // 1) Persistir cambio de estado (a) y (c) del reporte
    if (a.status !== status) {
      await doc.ref.update({
        status,
        updatedAt: nowIso,
        history: [
          ...(a.history || []),
          { action: "estado_auto", by: "system", byName: "Sistema", at: nowIso, note: `Estado calculado: ${status}` },
        ],
      });
      updated++;
    }

    // 2) ¿Entra en rango de alerta? (b) del reporte
    if (status !== "por_vencer" && status !== "vencido") continue;
    const lastAlert = toDate(a.lastAlertAt);
    if (lastAlert && lastAlert.getTime() > dedupeBefore.getTime()) continue;

    const expStr = toDate(a.expiryDate)?.toLocaleDateString("es-EC") || a.expiryDate;
    const isExpired = status === "vencido";
    const title = isExpired
      ? `Control vencido: ${a.controlTypeName || "Control"}`
      : `Control por vencer: ${a.controlTypeName || "Control"}`;
    const body = isExpired
      ? `"${a.controlTypeName || "Control"}" de ${a.targetName || "sin destinatario"} venció el ${expStr}.`
      : `"${a.controlTypeName || "Control"}" de ${a.targetName || "sin destinatario"} vence el ${expStr}.`;

    const recipients = new Set(rrhhIds);
    if (a.targetType === "user" && a.targetId) recipients.add(a.targetId);

    for (const uid of recipients) {
      await notifyUser({
        userId: uid,
        type: isExpired ? "CONTROL_EXPIRED" : "CONTROL_EXPIRING",
        title,
        body,
        priority: "high",
        emailSubject: `[WaveOps] ${title}`,
        emailText: `${body}\n\nIngresa a WaveOps → Develops → Controles para ver los detalles.`,
      });
      alerts++;
    }

    await doc.ref.update({
      lastAlertAt: nowIso,
      history: [
        ...(a.history || []),
        { action: "alerta_enviada", by: "system", byName: "Sistema", at: nowIso, note: `Alerta ${status} enviada a ${recipients.size} destinatario(s)` },
      ],
    });
  }

  console.log(`[checkControlExpirations] ${snap.size} revisados, ${updated} estados actualizados, ${alerts} alertas enviadas`);
  return { checked: snap.size, updated, alerts };
}

// ── 1) Programada: cada 15 minutos ──

const checkControlExpirations = onSchedule({
  schedule: "every 15 minutes",
  region: REGION,
  secrets: [SENDGRID_API_KEY],
}, async () => {
  await runExpirationCheck();
});

// ── 2) Probar en caliente desde la UI ──

const checkControlsNow = onCall({
  region: REGION,
  secrets: [SENDGRID_API_KEY],
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión");
  const callerSnap = await db.collection("users").doc(request.auth.uid).get();
  const role = callerSnap.exists ? callerSnap.data().role : null;
  if (!["DIRECTOR_GENERAL", "RRHH"].includes(role)) {
    throw new HttpsError("permission-denied", "Solo Director General o RRHH pueden ejecutar esta acción");
  }
  return await runExpirationCheck();
});

// ── 3) Notificación inmediata al asignar ──

const notifyControlAssigned = onDocumentCreated({
  document: "controlAssignments/{id}",
  region: REGION,
  secrets: [SENDGRID_API_KEY],
}, async (event) => {
  const a = event.data.data();
  if (!a || a.targetType !== "user" || !a.targetId) return;
  const title = "Control asignado";
  const body = `Se te asignó el control "${a.controlTypeName || "Control"}".`;
  await notifyUser({
    userId: a.targetId,
    type: "CONTROL_ASSIGNED",
    title,
    body,
    priority: "normal",
    emailSubject: "[WaveOps] Se te asignó un control",
    emailText: `${body}${a.expiryDate ? `\nVence: ${a.expiryDate}` : ""}\n\nIngresa a WaveOps → Develops → Controles para ver los detalles.`,
  });
});

module.exports = { checkControlExpirations, checkControlsNow, notifyControlAssigned, runExpirationCheck };
