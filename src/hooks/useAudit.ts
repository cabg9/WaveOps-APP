// ═══════════════════════════════════════════════════════════════════
// HOOK: useAudit - Trazabilidad de acciones
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import { useAuth } from './useFirestoreAuth';
import type { AuditLog, AuditAction, ImpactLevel, AuditFilters } from '@/types/develops';

const COLLECTION_NAME = 'auditLogs';

// ═══════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════

export function useAudit() {
  const { user } = useAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // ═══════════════════════════════════════════════════════════════════
  // ESCUCHAR LOGS EN TIEMPO REAL (últimos 100)
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as AuditLog[];
        setLogs(data);
        setLoading(false);
      },
      (err) => {
        console.error('[useAudit] Error cargando logs:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // GRABAR ACCIÓN EN AUDITORÍA
  // ═══════════════════════════════════════════════════════════════════

  const logAction = useCallback(
    async (params: {
      action: AuditAction;
      targetType: string;
      targetId: string;
      targetName: string;
      previousValue?: Record<string, any>;
      newValue?: Record<string, any>;
      impactLevel: ImpactLevel;
      description: string;
      confirmationMethod?: 'none' | 'simple' | 'password' | 'twoFactor';
      passwordConfirmed?: boolean;
    }): Promise<void> => {
      if (!user) {
        console.warn('[useAudit] No hay usuario logueado, no se graba audit');
        return;
      }

      try {
        const logEntry: Omit<AuditLog, 'id'> = {
          actorId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          actorRole: user.role,
          action: params.action,
          actionCategory: getActionCategory(params.action),
          targetType: params.targetType,
          targetId: params.targetId,
          targetName: params.targetName,
          ...(params.previousValue !== undefined ? { previousValue: params.previousValue } : {}),
          ...(params.newValue !== undefined ? { newValue: params.newValue } : {}),
          impactLevel: params.impactLevel,
          description: params.description,
          timestamp: new Date().toISOString(),
          confirmationMethod: params.confirmationMethod || 'none',
          passwordConfirmed: params.passwordConfirmed || false,
          ...(params.passwordConfirmed ? { confirmedAt: new Date().toISOString() } : {}),
        };

        await addDoc(collection(db, COLLECTION_NAME), logEntry);
        console.log(`[useAudit] ✅ ${params.action} - ${params.targetName}`);
      } catch (err) {
        console.error('[useAudit] Error grabando log:', err);
        // No lanzamos error para no interrumpir el flujo principal
      }
    },
    [user]
  );

  // ═══════════════════════════════════════════════════════════════════
  // FILTRAR LOGS
  // ═══════════════════════════════════════════════════════════════════

  const getFilteredLogs = useCallback(
    (filters: AuditFilters): AuditLog[] => {
      return logs.filter((log) => {
        if (filters.userId && log.actorId !== filters.userId) return false;
        if (filters.action && log.action !== filters.action) return false;
        if (filters.impactLevel && log.impactLevel !== filters.impactLevel) return false;
        if (filters.targetType && log.targetType !== filters.targetType) return false;
        if (filters.dateFrom && log.timestamp < filters.dateFrom) return false;
        if (filters.dateTo && log.timestamp > filters.dateTo) return false;
        return true;
      });
    },
    [logs]
  );

  // ═══════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════

  return {
    logs,
    loading,
    logAction,
    getFilteredLogs,
  };
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN AUXILIAR: Categoría de acción
// ═══════════════════════════════════════════════════════════════════

function getActionCategory(action: AuditAction): string {
  if (action.startsWith('USER_')) return 'user_management';
  if (action.startsWith('ROLE_')) return 'role_management';
  if (action.startsWith('MODULE_')) return 'module_management';
  if (action.startsWith('FEATURE_')) return 'feature_management';
  if (action.startsWith('DEVELOP_')) return 'develop_access';
  if (action.startsWith('DEPARTMENT_')) return 'department_management';
  if (action.startsWith('SHIFT_')) return 'shift_management';
  if (action.startsWith('POSITION_')) return 'position_management';
  if (action.startsWith('SETTINGS_') || action.startsWith('SECURITY_')) return 'system_configuration';
  return 'general';
}
