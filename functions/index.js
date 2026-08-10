// ═══════════════════════════════════════════════════════════════════
// WAVEOPS CLOUD FUNCTIONS — ENTRY POINT
// ═══════════════════════════════════════════════════════════════════

// Auth
const { createAuthUser } = require("./src/auth/createUser");
const { sendInvitationEmail, acceptInvitation } = require("./src/auth/invitation");
const { deleteAuthUser, setAuthUserDisabled } = require("./src/auth/manageUser");
const { cleanupUserData, cleanupExpiredInvitations } = require("./src/auth/cleanup");

// Notifications (Fase 6 — próximamente)
// const { ... } = require("./src/notifications/triggers");

exports.createAuthUser = createAuthUser;
exports.sendInvitationEmail = sendInvitationEmail;
exports.acceptInvitation = acceptInvitation;
exports.deleteAuthUser = deleteAuthUser;
exports.setAuthUserDisabled = setAuthUserDisabled;
exports.cleanupUserData = cleanupUserData;
exports.cleanupExpiredInvitations = cleanupExpiredInvitations;
