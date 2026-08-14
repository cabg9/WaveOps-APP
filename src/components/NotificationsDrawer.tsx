// ═══════════════════════════════════════════════════════════════════
// NOTIFICATIONS DRAWER — Panel deslizable tipo iOS
// ═══════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { X, Bell, Check, Trash2, Clock, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Notification, NotificationType } from "@/types";

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
}

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  [NotificationType.TASK_ASSIGNED]: { icon: Bell, color: "text-corporate", label: "Tarea" },
  [NotificationType.TASK_OVERDUE]: { icon: AlertTriangle, color: "text-[#FF3B30]", label: "Urgente" },
  [NotificationType.INCIDENCIA_CREATED]: { icon: AlertTriangle, color: "text-[#FF9500]", label: "Incidencia" },
  [NotificationType.INCIDENCIA_RESOLVED]: { icon: CheckCircle2, color: "text-[#34C759]", label: "Resuelto" },
  [NotificationType.SHIFT_ASSIGNED]: { icon: Clock, color: "text-corporate", label: "Horario" },
  [NotificationType.VACATION_APPROVED]: { icon: CheckCircle2, color: "text-[#34C759]", label: "Vacaciones" },
  [NotificationType.VACATION_REJECTED]: { icon: AlertTriangle, color: "text-[#FF3B30]", label: "Vacaciones" },
  default: { icon: Info, color: "text-[#86868B]", label: "Notificación" },
};

export function NotificationsDrawer({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
}: NotificationsDrawerProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, filter]);

  const getConfig = (type: string) => typeConfig[type] || typeConfig.default;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer — derecha en desktop, bottom sheet en mobile */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#E5E5E7]">
          <div>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Notificaciones</h2>
            <p className="text-sm text-[#86868B]">
              {unreadCount > 0 ? `${unreadCount} sin leer` : "Todas leídas"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="p-2 rounded-xl text-[#86868B] hover:bg-[#F5F5F7] hover:text-corporate transition-colors"
                title="Marcar todas como leídas"
              >
                <Check className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 py-3 border-b border-[#E5E5E7]">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-corporate text-white"
                : "bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5E7]"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === "unread"
                ? "bg-corporate text-white"
                : "bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5E7]"
            }`}
          >
            Sin leer
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#86868B]">
              <Bell className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No hay notificaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5E7]">
              {filtered.map((n) => {
                const config = getConfig(n.type);
                const Icon = config.icon;
                return (
                  <div
                    key={n.id}
                    className={`group px-4 py-4 hover:bg-[#F5F5F7] transition-colors cursor-pointer ${
                      !n.read ? "bg-corporate/5" : ""
                    }`}
                    onClick={() => {
                      if (!n.read) onMarkAsRead(n.id);
                      if (n.data?.link) window.location.href = n.data.link;
                    }}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-0.5 ${config.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-[#1D1D1F]">
                              {n.title}
                              {!n.read && (
                                <span className="ml-2 inline-block w-2 h-2 rounded-full bg-corporate" />
                              )}
                            </p>
                            <p className="text-sm text-[#86868B] mt-0.5 line-clamp-2">
                              {n.body}
                            </p>
                            <p className="text-xs text-[#86868B]/60 mt-1">
                              {new Date(n.createdAt).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(n.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#86868B] hover:text-[#FF3B30] hover:bg-red-50 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
