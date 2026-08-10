// ═══════════════════════════════════════════════════════════════════
// NOTIFICATION TRIGGERS — Cloud Functions v2
// ═══════════════════════════════════════════════════════════════════

const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { db } = require("../config/firebase");

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

// ── Tareas ──
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

// ── Incidencias ──
const notifyIncidenciaCreated = onDocumentCreated("incidencias/{incidenciaId}", async (event) => {
  const inc = event.data.data();
  const incId = event.params.incidenciaId;
  const leaders = await getDepartmentLeaders(inc.targetDepartment || "DIVE_SHOP");
  const areaSnap = await db.collection("users").where("department", "==", inc.targetDepartment || "DIVE_SHOP").where("isActive", "==", true).get();
  const areaUsers = areaSnap.docs.map(d => d.id);
  const all = [...new Set([...leaders, ...areaUsers, inc.reportedBy].filter(Boolean))];
  await notifyMultiple({ userIds: all, type: "INCIDENCIA_CREATED", title: "Nueva incidencia", body: `${inc.type}: ${inc.description?.substring(0, 80) || ""}`, data: { link: `/incidencias/${incId}`, incidenciaId: incId }, priority: "high", createdBy: inc.reportedBy });
});

const notifyIncidenciaStatus = onDocumentUpdated("incidencias/{incidenciaId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status === after.status) return;
  const msgs = { CONFIRMED: { title: "Incidencia confirmada", body: "Supervisor confirmó" }, RESOLVED: { title: "Resuelta", body: "Incidencia marcada resuelta" }, CLOSED: { title: "Cerrada", body: "Incidencia cerrada" }, REOPENED: { title: "Reabierta", body: "Incidencia reabierta" } };
  const msg = msgs[after.status];
  if (!msg) return;
  const leaders = await getDepartmentLeaders(after.targetDepartment || "DIVE_SHOP");
  const recipients = [...new Set([after.reportedBy, after.reportedFor, ...leaders].filter(Boolean))];
  await notifyMultiple({ userIds: recipients, type: `INCIDENCIA_${after.status}`, title: msg.title, body: msg.body, data: { link: `/incidencias/${event.params.incidenciaId}`, incidenciaId: event.params.incidenciaId }, priority: after.status === "REOPENED" ? "high" : "normal" });
});

// ── Turnos ──
const notifyShiftAssigned = onDocumentCreated("shiftAssignments/{id}", async (event) => {
  const a = event.data.data();
  await createNotification({ userId: a.userId, type: "SHIFT_ASSIGNED", title: "Nuevo turno", body: `${a.date || ""} — ${a.shiftName || "Turno"}`, data: { link: "/horarios", shiftId: event.params.id }, priority: "normal" });
});

module.exports = { notifyTaskAssigned, notifyIncidenciaCreated, notifyIncidenciaStatus, notifyShiftAssigned };
