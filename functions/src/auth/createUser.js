const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { auth, db } = require("../config/firebase");

const createAuthUser = onDocumentCreated("users/{userId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const userData = snap.data();
  const docId = event.params.userId;
  if (!userData.email || !userData.tempPassword) {
    console.log(`[createAuthUser] Missing email or tempPassword for ${docId}`);
    return;
  }
  try {
    const authUser = await auth.createUser({
      email: userData.email,
      password: userData.tempPassword,
      displayName: userData.name || userData.email,
    });
    await db.collection("users").doc(docId).update({
      tempPassword: null,
      authUid: authUser.uid,
      authCreated: true,
      authCreatedAt: new Date().toISOString(),
    });
    console.log(`[createAuthUser] Created auth user ${authUser.uid} for ${userData.email}`);
  } catch (error) {
    console.error(`[createAuthUser] Error for ${docId}:`, error.message);
    await db.collection("users").doc(docId).update({
      authError: error.message,
      authCreated: false,
    }).catch(() => {});
  }
});

module.exports = { createAuthUser };
