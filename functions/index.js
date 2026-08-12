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

// Admin
const { resetDemoData } = require("./src/admin/resetDemoData");
exports.resetDemoData = resetDemoData;

// Admin fixes
const { fixRoles } = require('./src/admin/fixRoles');
exports.fixRoles = fixRoles;
