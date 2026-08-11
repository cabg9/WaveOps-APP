const { messaging, db } = require("../config/firebase");

async function sendPushNotification(userId, title, body, data = {}) {
  try {
    // Buscar tokens del usuario
    const tokensSnap = await db.collection("fcmTokens").where("userId", "==", userId).get();
    if (tokensSnap.empty) return; // No tiene tokens

    const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
    if (tokens.length === 0) return;

    const message = {
      notification: { title, body },
      data,
      tokens,
      webpush: {
        notification: {
          icon: "https://wve-b3db5.web.app/favicon.svg",
          badge: "https://wve-b3db5.web.app/favicon.svg",
          click_action: data.link ? `https://wve-b3db5.web.app${data.link}` : "https://wve-b3db5.web.app",
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    // Borrar tokens inválidos
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error;
        if (error.code === "messaging/registration-token-not-registered" ||
            error.code === "messaging/invalid-registration-token") {
          const badToken = tokens[idx];
          db.collection("fcmTokens").doc(badToken).delete().catch(() => {});
        }
      }
    });
  } catch (e) {
    console.error("[Push] Error sending to", userId, e.message);
  }
}

module.exports = { sendPushNotification };
