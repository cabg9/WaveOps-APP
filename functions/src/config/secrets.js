const { defineSecret } = require("firebase-functions/params");

const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");

module.exports = { SENDGRID_API_KEY };
