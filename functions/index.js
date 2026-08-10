// ═══════════════════════════════════════════════════════════════════
// WAVEOPS CLOUD FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

const { createAuthUser } = require("./src/auth/createUser");
const { sendInvitationEmail, acceptInvitation } = require("./src/auth/invitation");
const { deleteAuthUser, setAuthUserDisabled } = require("./src/auth/manageUser");
const { cleanupUserData, cleanupExpiredInvitations } = require("./src/auth/cleanup");
const { notifyTaskAssigned, notifyIncidenciaCreated, notifyIncidenciaStatus, notifyShiftAssigned } = require("./src/notifications/triggers");

exports.createAuthUser = createAuthUser;
exports.sendInvitationEmail = sendInvitationEmail;
exports.acceptInvitation = acceptInvitation;
exports.deleteAuthUser = deleteAuthUser;
exports.setAuthUserDisabled = setAuthUserDisabled;
exports.cleanupUserData = cleanupUserData;
exports.cleanupExpiredInvitations = cleanupExpiredInvitations;

// Notifications
exports.notifyTaskAssigned = notifyTaskAssigned;
exports.notifyIncidenciaCreated = notifyIncidenciaCreated;
exports.notifyIncidenciaStatus = notifyIncidenciaStatus;
exports.notifyShiftAssigned = notifyShiftAssigned;
