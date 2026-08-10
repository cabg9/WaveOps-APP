importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCOlASRXK2geXYb60GNOIgM5bIXoiZbj9k",
  authDomain: "wve-b3db5.firebaseapp.com",
  projectId: "wve-b3db5",
  storageBucket: "wve-b3db5.firebasestorage.app",
  messagingSenderId: "782495799708",
  appId: "1:782495799708:web:cee488686971bd86879059"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message:", payload);
  const notificationTitle = payload.notification?.title || "WaveOps";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/logo-icon.png",
    badge: "/logo-icon.png",
    tag: payload.data?.notificationId || Date.now().toString(),
    data: payload.data,
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.link || "/";
  event.waitUntil(clients.openWindow(url));
});
