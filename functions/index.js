// ═══════════════════════════════════════════════════════════════════
// WAVEOPS CLOUD FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

const { createAuthUser } = require("./src/auth/createUser");
const { sendInvitationEmail, acceptInvitation } = require("./src/auth/invitation");
const { deleteAuthUser, setAuthUserDisabled } = require("./src/auth/manageUser");
const { cleanupUserData, cleanupExpiredInvitations } = require("./src/auth/cleanup");

const {
  notifyTaskAssigned,
  notifyTaskCompleted,
  notifyTaskBlocked,
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
} = require("./src/notifications/triggers");

const {
  checkControlExpirations,
  checkControlsNow,
  notifyControlAssigned,
} = require("./src/notifications/controls");

// Fase 1 — Inventario
const {
  notifyTransferCreated,
  checkLowStock,
} = require("./src/notifications/inventory");

exports.createAuthUser = createAuthUser;
exports.sendInvitationEmail = sendInvitationEmail;
exports.acceptInvitation = acceptInvitation;
exports.deleteAuthUser = deleteAuthUser;
exports.setAuthUserDisabled = setAuthUserDisabled;
exports.cleanupUserData = cleanupUserData;
exports.cleanupExpiredInvitations = cleanupExpiredInvitations;

exports.notifyTaskAssigned = notifyTaskAssigned;
exports.notifyTaskCompleted = notifyTaskCompleted;
exports.notifyTaskBlocked = notifyTaskBlocked;
exports.notifyIncidenciaCreated = notifyIncidenciaCreated;
exports.notifyIncidenciaStatus = notifyIncidenciaStatus;
exports.notifyIncidenciaNoteAdded = notifyIncidenciaNoteAdded;
exports.notifyShiftAssigned = notifyShiftAssigned;
exports.notifyShiftUpdated = notifyShiftUpdated;
exports.notifyVacationRequested = notifyVacationRequested;
exports.notifyVacationApproved = notifyVacationApproved;
exports.notifyVacationRejected = notifyVacationRejected;
exports.notifyUserActivated = notifyUserActivated;
exports.notifyUserDeactivated = notifyUserDeactivated;
exports.notifyRoleChanged = notifyRoleChanged;
exports.checkOverdueTasks = checkOverdueTasks;
exports.cleanupOldNotifications = cleanupOldNotifications;

// Fase 0 — Catálogo Dinámico de Controles
exports.checkControlExpirations = checkControlExpirations;
exports.checkControlsNow = checkControlsNow;
exports.notifyControlAssigned = notifyControlAssigned;

// Fase 1 — Inventario
exports.notifyTransferCreated = notifyTransferCreated;
exports.checkLowStock = checkLowStock;

// Admin
const { resetDemoData } = require("./src/admin/resetDemoData");
exports.resetDemoData = resetDemoData;

// Admin fixes
const { fixRoles } = require('./src/admin/fixRoles');
exports.fixRoles = fixRoles;

// Admin utilities
const { listCollections } = require('./src/admin/listCollections');
exports.listCollections = listCollections;

const { resetDemoDataV2 } = require('./src/admin/resetDemoDataV2');
exports.resetDemoDataV2 = resetDemoDataV2;
