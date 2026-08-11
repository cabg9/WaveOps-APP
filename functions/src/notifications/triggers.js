// ═══════════════════════════════════════════════════════════════════
// NOTIFICATION TRIGGERS — COMPLETOS
// ═══════════════════════════════════════════════════════════════════

const { onDocumentCreated, onDocumentUpdated, onSchedule } = require("firebase-functions/v2/firestore");
const { onSchedule: onScheduleV2 } = require("firebase-functions/v2/scheduler");
const { db } = require("../config/firebase");

// ── Helper: Crear notificación ──
async function createNotification({ userId, type, title, body, data = {}, priority = 'normal', createdBy }) {
  return db.collection("notifications").add({
    userId, type, title, body, data,
    read: false,
    createdAt: new Date().toISOString(),
    createdBy: createdBy || null,
    priority,
  });
}

async function notifyMultiple({ userIds, type, title, body, data, priority, createdBy }) {
  return Promise.all(userIds.map(uid =>
    createNotification({ userId: uid, type, title, body, data, priority, createdBy })
  ));
}

async function getDepartmentLeaders(department) {
  const snap = await db.collection("users")
    .where("department", "==", department)
    .where("role", "in", ["SUPERVISOR", "GERENTE_DEPARTAMENTO", "GERENTE_OPERACIONES", "DIRECTOR", "DIRECTOR_GENERAL"])
    .where("isActive", "==", true)
    .get();
  return snap.docs.map(d => d.id);
}

async function getAdminsAndRRHH() {
  const snap = await db.collection("users")
    .where("role", "in", ["DIRECTOR_GENERAL", "DIRECTOR", "RRHH", "GERENTE_OPERACIONES"])
    .where("isActive", "==", true)
    .get();
  return snap.docs.map(d => d.id);
}

// ═══════════════════════════════════════════════════════════════════
// TAREAS
// ═══════════════════════════════════════════════════════════════════

const notifyTaskAssigned = onDocumentCreated("tasks/{taskId}", async (event) => {
  const task = event.data.data();
  if (!task.assigneeId) return;
  await createNotification({
    userId: task.assigneeId,
    type: "TASK_ASSIGNED",
    title: "Nueva tarea asignada",
    body: `${task.title || "Tarea"}`,
    data: { link: "/tareas", taskId: event.params.taskId },
    priority: task.priority === "high" ? "high" : "normal",
    createdBy: task.createdBy,
  });
});

const notifyTaskCompleted = onDocumentUpdated("tasks/{taskId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status === "completed" || after.status !== "completed") return;
  if (!after.createdBy || after.createdBy === after.completedBy) return;
  
  await createNotification({
    userId: after.createdBy,
    type: "TASK_COMPLETED",
    title: "Tarea completada",
    body: `"${after.title}" fue completada por ${after.completedByName || "un usuario"}`,
    data: { link: "/tareas", taskId: event.params.taskId },
    priority: "normal",
  });
});

// ═══════════════════════════════════════════════════════════════════
// INCIDENCIAS
// ═══════════════════════════════════════════════════════════════════

const notifyIncidenciaCreated = onDocumentCreated("incidencias/{incidenciaId}", async (event) => {
  const inc = event.data.data();
  const incId = event.params.incidenciaId;
  const leaders = await getDepartmentLeaders(inc.targetDepartment || "DIVE_SHOP");
  const areaSnap = await db.collection("users")
    .where("department", "==", inc.targetDepartment || "DIVE_SHOP")
    .where("isActive", "==", true)
    .get();
  const areaUsers = areaSnap.docs.map(d => d.id);
  const all = [...new Set([...leaders, ...areaUsers, inc.reportedBy].filter(Boolean))];
  
  await notifyMultiple({
    userIds: all,
    type: "INCIDENCIA_CREATED",
    title: "Nueva incidencia reportada",
    body: `${inc.type}: ${inc.description?.substring(0, 80) || "Sin descripción"}`,
    data: { link: `/incidencias/${incId}`, incidenciaId: incId },
    priority: "high",
    createdBy: inc.reportedBy,
  });
});

const notifyIncidenciaStatus = onDocumentUpdated("incidencias/{incidenciaId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status === after.status) return;
  
  const msgs = {
    CONFIRMED: { title: "Incidencia confirmada", body: "Un supervisor ha confirmado la incidencia" },
    RESOLVED: { title: "Incidencia resuelta", body: "La incidencia ha sido marcada como resuelta" },
    CLOSED: { title: "Incidencia cerrada", body: "La incidencia fue cerrada" },
    REOPENED: { title: "Incidencia reabierta", body: "La incidencia fue reabierta" },
  };
  const msg = msgs[after.status];
  if (!msg) return;
  
  const leaders = await getDepartmentLeaders(after.targetDepartment || "DIVE_SHOP");
  const recipients = [...new Set([after.reportedBy, after.reportedFor, ...leaders].filter(Boolean))];
  
  await notifyMultiple({
    userIds: recipients,
    type: `INCIDENCIA_${after.status}`,
    title: msg.title,
    body: msg.body,
    data: { link: `/incidencias/${event.params.incidenciaId}`, incidenciaId: event.params.incidenciaId },
    priority: after.status === "REOPENED" ? "high" : "normal",
  });
});

const notifyIncidenciaNoteAdded = onDocumentUpdated("incidencias/{incidenciaId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const beforeNotes = JSON.stringify(before.notes || []);
  const afterNotes = JSON.stringify(after.notes || []);
  if (beforeNotes === afterNotes) return;
  
  const newNote = after.notes?.[after.notes.length - 1];
  if (!newNote) return;
  
  const allUsers = [...new Set([
    after.reportedBy,
    after.reportedFor,
    after.confirmedBy,
    after.resolvedBy,
    after.closedBy,
    ...((after.notes || []).map(n => n.createdBy))
  ].filter(Boolean))];
  
  const recipients = allUsers.filter(u => u !== newNote.createdBy);
  if (recipients.length === 0) return;
  
  await notifyMultiple({
    userIds: recipients,
    type: "INCIDENCIA_NOTE_ADDED",
    title: "Nueva nota en incidencia",
    body: `${newNote.createdByName || "Usuario"}: ${newNote.content?.substring(0, 60) || ""}`,
    data: { link: `/incidencias/${event.params.incidenciaId}`, incidenciaId: event.params.incidenciaId },
    priority: "normal",
  });
});

// ═══════════════════════════════════════════════════════════════════
// TURNOS / HORARIOS
// ═══════════════════════════════════════════════════════════════════

const notifyShiftAssigned = onDocumentCreated("shiftAssignments/{id}", async (event) => {
  const a = event.data.data();
  await createNotification({
    userId: a.userId,
    type: "SHIFT_ASSIGNED",
    title: "Nuevo turno asignado",
    body: `${a.date || ""} — ${a.shiftName || "Turno"}`,
    data: { link: "/horarios", shiftId: event.params.id },
    priority: "normal",
  });
});

const notifyShiftUpdated = onDocumentUpdated("shiftAssignments/{id}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.date === after.date && before.shiftId === after.shiftId) return;
  
  await createNotification({
    userId: after.userId,
    type: "SHIFT_UPDATED",
    title: "Turno modificado",
    body: `Tu turno del ${before.date || ""} ha cambiado`,
    data: { link: "/horarios", shiftId: event.params.id },
    priority: "normal",
  });
});

// ═══════════════════════════════════════════════════════════════════
// VACACIONES / PERMISOS
// ═══════════════════════════════════════════════════════════════════

const notifyVacationRequested = onDocumentCreated("vacationRequests/{id}", async (event) => {
  const req = event.data.data();
  const admins = await getAdminsAndRRHH();
  const supervisors = await getDepartmentLeaders(req.department || "DIVE_SHOP");
  const all = [...new Set([...admins, ...supervisors, req.supervisorId].filter(Boolean))];
  
  await notifyMultiple({
    userIds: all,
    type: "VACATION_REQUESTED",
    title: "Solicitud de vacaciones",
    body: `${req.userName || "Un usuario"} solicita ${req.days || 0} días (${req.startDate || ""} - ${req.endDate || ""})`,
    data: { link: "/vacaciones", requestId: event.params.id },
    priority: "normal",
  });
});

const notifyVacationApproved = onDocumentUpdated("vacationRequests/{id}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status === after.status || after.status !== "approved") return;
  
  await createNotification({
    userId: after.userId,
    type: "VACATION_APPROVED",
    title: "Vacaciones aprobadas",
    body: `Tu solicitud del ${after.startDate || ""} al ${after.endDate || ""} fue aprobada`,
    data: { link: "/vacaciones", requestId: event.params.id },
    priority: "normal",
  });
});

const notifyVacationRejected = onDocumentUpdated("vacationRequests/{id}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status === after.status || after.status !== "rejected") return;
  
  await createNotification({
    userId: after.userId,
    type: "VACATION_REJECTED",
    title: "Vacaciones rechazadas",
    body: `Tu solicitud del ${after.startDate || ""} al ${after.endDate || ""} fue rechazada. Motivo: ${after.rejectionReason || "Sin especificar"}`,
    data: { link: "/vacaciones", requestId: event.params.id },
    priority: "normal",
  });
});

// ═══════════════════════════════════════════════════════════════════
// USUARIOS / INVITACIONES
// ═══════════════════════════════════════════════════════════════════

const notifyUserActivated = onDocumentUpdated("users/{userId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.isActive === true || after.isActive !== true) return;
  
  await createNotification({
    userId: event.params.userId,
    type: "USER_ACTIVATED",
    title: "Cuenta activada",
    body: "Tu cuenta ha sido activada. Ya puedes acceder a la plataforma.",
    data: { link: "/dashboard" },
    priority: "normal",
  });
});

const notifyUserDeactivated = onDocumentUpdated("users/{userId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.isActive === false || after.isActive !== false) return;
  
  await createNotification({
    userId: event.params.userId,
    type: "USER_DEACTIVATED",
    title: "Cuenta desactivada",
    body: "Tu cuenta ha sido desactivada. Contacta a RRHH para más información.",
    data: { link: "/login" },
    priority: "high",
  });
});

const notifyRoleChanged = onDocumentUpdated("users/{userId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before.role || before.role === after.role) return;
  
  await createNotification({
    userId: event.params.userId,
    type: "ROLE_CHANGED",
    title: "Rol actualizado",
    body: `Tu rol cambió de ${before.role.replace(/_/g, ' ')} a ${after.role.replace(/_/g, ' ')}`,
    data: { link: "/perfil" },
    priority: "normal",
  });
});

// ═══════════════════════════════════════════════════════════════════
// CRON: Tareas vencidas (cada hora)
// ═══════════════════════════════════════════════════════════════════

const checkOverdueTasks = onScheduleV2({
  schedule: "every 60 minutes",
  region: "us-central1",
}, async (event) => {
  const now = new Date().toISOString();
  const overdueSnap = await db.collection("tasks")
    .where("status", "in", ["pending", "in_progress"])
    .where("dueDate", "<", now)
    .get();
  
  const batch = db.batch();
  let count = 0;
  
  for (const doc of overdueSnap.docs) {
    const task = doc.data();
    if (task.status === "overdue") continue;
    
    batch.update(doc.ref, { status: "overdue", overdueAt: now });
    
    if (task.assigneeId) {
      await createNotification({
        userId: task.assigneeId,
        type: "TASK_OVERDUE",
        title: "Tarea vencida",
        body: `"${task.title || "Tarea"}" venció el ${task.dueDate || ""}`,
        data: { link: "/tareas", taskId: doc.id },
        priority: "high",
      });
    }
    
    count++;
    if (count >= 400) { // Batch limit
      await batch.commit();
      break;
    }
  }
  
  if (count > 0) await batch.commit();
  console.log(`[checkOverdueTasks] ${count} tareas marcadas como vencidas`);
});

// ═══════════════════════════════════════════════════════════════════
// CRON: Limpiar notificaciones antiguas (cada día 3am)
// ═══════════════════════════════════════════════════════════════════

const cleanupOldNotifications = onScheduleV2({
  schedule: "0 3 * * *",
  region: "us-central1",
}, async (event) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString();
  
  const oldSnap = await db.collection("notifications")
    .where("createdAt", "<", cutoff)
    .limit(500)
    .get();
  
  const batch = db.batch();
  oldSnap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  
  console.log(`[cleanupOldNotifications] ${oldSnap.size} notificaciones eliminadas`);
});

module.exports = {
  notifyTaskAssigned,
  notifyTaskCompleted,
  notifyIncidenciaCreated,
  notifyIncidenciaStatus,
  notifyIncidenciaNoteAdded,
  notifyShiftAssigned,
  notifyShiftUpdated,
  notifyVacationRequested,
  notifyVacationApproved,
  notifyVacationRejected,
  notifyUserActivated,
  notifyUserDeactivated,
  notifyRoleChanged,
  checkOverdueTasks,
  cleanupOldNotifications,
};
