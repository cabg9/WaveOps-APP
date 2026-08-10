const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { db, messaging } = require("../config/firebase");

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATION TRIGGERS — Fase 6 (Próximamente)
// ═══════════════════════════════════════════════════════════════════
//
// onDocumentCreated("tasks/{taskId}")       → notificar assignee
// onDocumentUpdated("incidencias/{id}")     → notificar cambios de estado
// onDocumentCreated("shifts/{shiftId}")     → notificar asignado
// onDocumentUpdated("users/{userId}")       → notificar activación/desactivación
// onDocumentCreated("notifications/{id}")   → enviar push FCM
//
// Cron diario: limpiar notificaciones > 30 días

module.exports = {};
