// ═══════════════════════════════════════════════════════════════════
// HOOK DE NOTIFICACIONES — FIRESTORE REALTIME
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase-config";
import { Notification } from "@/types";

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const ts = data.createdAt as Timestamp;
          return {
            id: docSnap.id,
            userId: data.userId,
            type: data.type,
            title: data.title,
            body: data.body,
            data: data.data || {},
            read: data.read ?? false,
            readAt: data.readAt,
            createdAt: ts?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            createdBy: data.createdBy,
            priority: data.priority || "normal",
          } as Notification;
        });

        setNotifications(docs);
        setUnreadCount(docs.filter((n) => !n.read).length);
        setLoading(false);
      },
      (error) => {
        console.error("[useNotifications] Error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    await updateDoc(doc(db, "notifications", notificationId), {
      read: true,
      readAt: new Date().toISOString(),
    });
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(
      unread.map((n) =>
        updateDoc(doc(db, "notifications", n.id), {
          read: true,
          readAt: new Date().toISOString(),
        })
      )
    );
  }, [notifications]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    await deleteDoc(doc(db, "notifications", notificationId));
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
