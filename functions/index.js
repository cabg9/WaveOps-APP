// ═══════════════════════════════════════════════════════════════════
// WAVEOPS CLOUD FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

// Auth
const { createAuthUser } = require("./src/auth/createUser");
const { sendInvitationEmail, acceptInvitation } = require("./src/auth/invitation");
const { deleteAuthUser, setAuthUserDisabled } = require("./src/auth/manageUser");
const { cleanupUserData, cleanupExpiredInvitations } = require("./src/auth/cleanup");

// Notifications
const {
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
} = require("./src/notifications/triggers");

// Auth exports
exports.createAuthUser = createAuthUser;
exports.sendInvitationEmail = sendInvitationEmail;
exports.acceptInvitation = acceptInvitation;
exports.deleteAuthUser = deleteAuthUser;
exports.setAuthUserDisabled = setAuthUserDisabled;
exports.cleanupUserData = cleanupUserData;
exports.cleanupExpiredInvitations = cleanupExpiredInvitations;

// Notification exports
exports.notifyTaskAssigned = notifyTaskAssigned;
exports.notifyTaskCompleted = notifyTaskCompleted;
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
