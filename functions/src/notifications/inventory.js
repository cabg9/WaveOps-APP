// ═══════════════════════════════════════════════════════════════════
// INVENTARIO — Notificaciones Fase 1
// ═══════════════════════════════════════════════════════════════════
// - notifyTransferCreated: al crear una transferencia (inventoryTransfers),
//   avisa a quien responde en el destino (campana + push + email); si no
//   hay responsables definidos, avisa a Admins y RRHH.
// - checkLowStock: al actualizar un stock (inventoryStocks), detecta cuando
//   la cantidad cae al o bajo el mínimo y avisa al responsable del lugar
//   más Admins/RRHH (campana + push + email). Dedupe de 20h vía
//   lastLowStockAlertAt en el propio doc de stock.

const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const sgMail = require("@sendgrid/mail");
const { defineSecret } = require("firebase-functions/params");
const { db } = require("../config/firebase");
const { sendPushNotification } = require("./push");
const { getAdminsAndRRHH } = require("./triggers");

const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");

const REGION = "us-central1";
const ALERT_DEDUPE_HOURS = 20; // no re-notificar stock bajo antes de 20h

// ── Helpers ──

function toDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

async function getUserEmail(userId) {
  const snap = await db.collection("users").doc(userId).get();
  return snap.exists ? snap.data().email || null : null;
}

async function sendInventoryEmail({ to, subject, text }) {
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
    console.warn(`[inventario] Email no enviado a ${to}:`, err.message);
  }
}

async function notifyInventoryUser({ userId, type, title, body, priority, emailSubject, emailText }) {
  await db.collection("notifications").add({
    userId,
    type,
    title,
    body,
    data: { link: "/requisiciones" },
    read: false,
    createdAt: new Date().toISOString(),
    createdBy: "system",
    priority: priority || "normal",
  });
  sendPushNotification(userId, title, body, { link: "/requisiciones" }).catch(() => {});
  const email = await getUserEmail(userId);
  if (email) await sendInventoryEmail({ to: email, subject: emailSubject || title, text: emailText || body });
}

// ── 1) Transferencia creada ──

const notifyTransferCreated = onDocumentCreated({
  document: "inventoryTransfers/{id}",
  region: REGION,
  secrets: [SENDGRID_API_KEY],
}, async (event) => {
  const t = event.data.data();
  if (!t) return;
  const { productId, quantity, fromLocationId, toLocationId, responsibleUserId, createdByName } = t;

  const [toLocSnap, fromLocSnap, productSnap] = await Promise.all([
    toLocationId ? db.collection("locations").doc(toLocationId).get() : Promise.resolve(null),
    fromLocationId ? db.collection("locations").doc(fromLocationId).get() : Promise.resolve(null),
    productId ? db.collection("products").doc(productId).get() : Promise.resolve(null),
  ]);

  const toLocationName = toLocSnap && toLocSnap.exists ? toLocSnap.data().name || toLocationId : (toLocationId || "ubicación destino");
  const fromLocationName = fromLocSnap && fromLocSnap.exists ? fromLocSnap.data().name || fromLocationId : (fromLocationId || "ubicación origen");
  const productName = productSnap && productSnap.exists ? productSnap.data().name || productId : (productId || "Producto");

  // Destinatarios: responsable del destino → responsable de la transferencia → Admins/RRHH
  const recipients = [];
  const toResponsible = toLocSnap && toLocSnap.exists ? toLocSnap.data().responsibleUserId : null;
  if (toResponsible) recipients.push(toResponsible);
  if (responsibleUserId && responsibleUserId !== toResponsible) recipients.push(responsibleUserId);
  if (recipients.length === 0) {
    recipients.push(...(await getAdminsAndRRHH()));
  }

  const qty = quantity ?? "?";
  const title = `Nueva transferencia en destino: ${productName}`;
  const body = `${qty} × ${productName} de ${fromLocationName} → ${toLocationName}. Creada por ${createdByName || "un usuario"}.`;

  for (const uid of recipients) {
    await notifyInventoryUser({
      userId: uid,
      type: "TRANSFER_CREATED",
      title,
      body,
      priority: "normal",
      emailSubject: `[WaveOps] ${title}`,
      emailText: `${body}\n\nIngresa a WaveOps → Requisiciones para ver los detalles.`,
    });
  }
});

// ── 2) Stock bajo ──

const checkLowStock = onDocumentUpdated({
  document: "inventoryStocks/{id}",
  region: REGION,
  secrets: [SENDGRID_API_KEY],
}, async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const { productId, locationId, quantity, minStock, maxStock, lastLowStockAlertAt } = after;

  // Solo actúa si hay mínimo definido y la cantidad está en o bajo el mínimo
  if (minStock == null || quantity == null) return;
  if (quantity > minStock) return;

  // Solo si cruzó el umbral o nunca se alertó
  const crossedThreshold = before.quantity == null || before.minStock == null || before.quantity > before.minStock;
  const hasAlertBefore = !!(before.lastLowStockAlertAt || lastLowStockAlertAt);
  if (!crossedThreshold && hasAlertBefore) return;

  // Dedupe: si ya se alertó hace menos de 20h, salta
  const now = new Date();
  const dedupeBefore = new Date(now.getTime() - ALERT_DEDUPE_HOURS * 60 * 60 * 1000);
  const lastAlert = toDate(lastLowStockAlertAt || before.lastLowStockAlertAt);
  if (lastAlert && lastAlert.getTime() > dedupeBefore.getTime()) return;

  const nowIso = now.toISOString();

  // Datos de contexto
  const [productSnap, locationSnap] = await Promise.all([
    productId ? db.collection("products").doc(productId).get() : Promise.resolve(null),
    locationId ? db.collection("locations").doc(locationId).get() : Promise.resolve(null),
  ]);
  const product = productSnap && productSnap.exists ? productSnap.data() : {};
  const productName = product.name || productId || "Producto";

  let unitName = "";
  if (product.unitId) {
    try {
      const unitSnap = await db.collection("unitsOfMeasure").doc(product.unitId).get();
      if (unitSnap.exists) {
        const unit = unitSnap.data();
        unitName = unit.symbol || unit.name || "";
      }
    } catch (err) {
      console.warn(`[inventario] No se pudo leer la unidad ${product.unitId}:`, err.message);
    }
  }

  let supplierName = "";
  if (product.preferredSupplierId) {
    const supplierSnap = await db.collection("suppliers").doc(product.preferredSupplierId).get();
    if (supplierSnap.exists) supplierName = supplierSnap.data().name || "";
  }

  const locationName = locationSnap && locationSnap.exists ? locationSnap.data().name || locationId : (locationId || "ubicación");
  const locationResponsible = locationSnap && locationSnap.exists ? locationSnap.data().responsibleUserId : null;

  // Sugerencia de reabastecimiento
  const suggestion = maxStock != null ? maxStock - quantity : minStock;

  // Destinatarios: responsable del lugar + Admins/RRHH (deduplicado)
  const recipients = [...new Set([locationResponsible, ...(await getAdminsAndRRHH())].filter(Boolean))];

  const unitSuffix = unitName ? ` ${unitName}` : "";
  const title = `Stock bajo: ${productName}`;
  const body = `Quedan ${quantity}${unitSuffix} en ${locationName} (mínimo ${minStock}). Sugerencia: requisición de ${suggestion}${unitSuffix} con ${supplierName || "el proveedor preferido"}.`;

  for (const uid of recipients) {
    await notifyInventoryUser({
      userId: uid,
      type: "LOW_STOCK",
      title,
      body,
      priority: "high",
      emailSubject: `[WaveOps] ${title}`,
      emailText: `${body}\n\nIngresa a WaveOps → Requisiciones para crear la requisición.`,
    });
  }

  // Marcar alerta para dedupe (campo nuevo, aditivo)
  await event.data.after.ref.update({ lastLowStockAlertAt: nowIso });
});

module.exports = { notifyTransferCreated, checkLowStock };
