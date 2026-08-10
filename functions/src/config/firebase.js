const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const auth = getAuth();
const db = getFirestore();
const messaging = getMessaging();

module.exports = { auth, db, messaging };
