// ═══════════════════════════════════════════════════════════════════
// FCM TOKEN — Solicitar permiso push y guardar token
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase-config";
import { useAuth } from "@/hooks/useFirestoreAuth";

const VAPID_KEY = "BIn5L7lgm0k-4xNa4kJyC_ch0Vhoh4RxFdq7B0xR6nw0JW2X6SJDdfCZ-PhmFeTn86IwMTJvtmt-kEWiDHfA5a4"; // Firebase Console → Project Settings → Cloud Messaging → Web Push

export function useFCMToken() {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;

    const init = async () => {
      try {
        const supported = await isSupported();
        if (!supported) return;

        const messaging = getMessaging();
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;

        const t = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (t) {
          setToken(t);
          await setDoc(doc(db, "fcmTokens", t), {
            userId: user.id,
            token: t,
            platform: "web",
            createdAt: new Date().toISOString(),
          });
        }

        // Escuchar mensajes en foreground
        onMessage(messaging, (payload) => {
          console.log("[FCM] Foreground message:", payload);
          // El Service Worker maneja la notificación nativa
        });
      } catch (e) {
        console.error("[FCM] Error:", e);
      }
    };

    init();
  }, [user?.id]);

  return { token };
}
