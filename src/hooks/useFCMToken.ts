// ═══════════════════════════════════════════════════════════════════
// FCM TOKEN — Push notifications con soporte Safari
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from "react";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase-config";
import { useAuth } from "@/hooks/useFirestoreAuth";

const VAPID_KEY = "BIn5L7lgm0k-4xNa4kJyC_ch0Vhoh4RxFdq7B0xR6nw0JW2X6SJDdfCZ-PhmFeTn86IwMTJvtmt-kEWiDHfA5a4";

export function useFCMToken() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | "default">("default");
  const [isSupportedState, setIsSupportedState] = useState<boolean | null>(null);

  // Verificar soporte al montar
  useEffect(() => {
    if (typeof window === "undefined") return;
    isSupported().then(setIsSupportedState).catch(() => setIsSupportedState(false));
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Función para solicitar permiso (DEBE llamarse por click de usuario)
  const requestPermission = useCallback(async () => {
    if (!user?.id || isSupportedState === false) return;

    try {
      const messaging = getMessaging();
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") return;

      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (token) {
        await setDoc(doc(db, "fcmTokens", token), {
          userId: user.id,
          token,
          platform: detectPlatform(),
          createdAt: new Date().toISOString(),
        });
      }

      // Escuchar mensajes en foreground
      onMessage(messaging, (payload) => {
        console.log("[FCM] Foreground:", payload);
        // Mostrar notificación nativa aunque esté en foreground
        if (payload.notification?.title) {
          new Notification(payload.notification.title, {
            body: payload.notification.body || "",
            icon: "/favicon.svg",
            tag: payload.data?.notificationId || Date.now().toString(),
          });
        }
      });
    } catch (e) {
      console.error("[FCM] Error:", e);
    }
  }, [user?.id, isSupportedState]);

  return { permission, isSupported: isSupportedState, requestPermission };
}

function detectPlatform() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Macintosh/.test(ua)) return "macos";
  if (/Windows/.test(ua)) return "windows";
  return "web";
}
