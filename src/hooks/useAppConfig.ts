// ═══════════════════════════════════════════════════════════════════
// HOOK: useAppConfig - Configuración dinámica de la app
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import { useAuth } from './useFirestoreAuth';
import type { AppModule, AppSettings, RoleTemplate } from '@/types/develops';

// ═══════════════════════════════════════════════════════════════════
// ESTADO INICIAL
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_SETTINGS: AppSettings = {
  id: 'global',
  featureFlags: {},
  developAccess: {
    mode: 'whitelist',
    allowedUserIds: [],
    allowedRoles: ['DIRECTOR_GENERAL'],
    allowDelegation: true,
  },
  security: {
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    maxLoginAttempts: 5,
    sessionTimeoutMinutes: 480,
    requirePasswordForSensitiveActions: true,
    auditLogRetentionDays: 365,
  },
  branding: {
    appName: 'WaveOps',
    logoUrl: '',
    primaryColor: '#007AFF',
    companyName: 'Galapagos Dive & Surf',
  },
  modulesOrder: [],
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

// ═══════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════

export function useAppConfig() {
  const { user } = useAuth();

  const [modules, setModules] = useState<AppModule[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // ═══════════════════════════════════════════════════════════════════
  // ESCUCHAR MÓDULOS EN TIEMPO REAL
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'appModules'),
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AppModule[];
        const data = docs.sort((a, b) => (a.order || 0) - (b.order || 0));
        setModules(data);
        setLoading(false);
      },
      (err) => {
        console.error('[useAppConfig] Error cargando módulos:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // ESCUCHAR SETTINGS EN TIEMPO REAL
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'appSettings', 'global'),
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings({ id: docSnap.id, ...docSnap.data() } as AppSettings);
        }
      },
      (err) => {
        console.error('[useAppConfig] Error cargando settings:', err);
      }
    );

    return () => unsub();
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // ESCUCHAR ROLE TEMPLATES
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'roleTemplates'),
      (snapshot) => {
        const docs2 = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as RoleTemplate[];
        const data = docs2.filter((r) => r.isActive !== false).sort((a, b) => (a.level || 0) - (b.level || 0));
        setRoleTemplates(data);
      },
      (err) => {
        console.error('[useAppConfig] Error cargando roles:', err);
      }
    );

    return () => unsub();
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // COMPUTED: Módulos visibles para el usuario actual
  // ═══════════════════════════════════════════════════════════════════

  const visibleModules = useMemo(() => {
    if (!user) return [];
    return modules.filter((m) => {
      // Debe ser visible
      if (!m.isVisible) return false;
      // Debe estar habilitado por feature flag
      const flagKey = `enable${m.id.charAt(0).toUpperCase()}${m.id
        .slice(1)
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`;
      if (settings.featureFlags[flagKey] === false) return false;
      // Usuario debe tener el permiso requerido
      // (fallback: si no hay permiso definido, se muestra)
      return true;
    });
  }, [modules, settings, user]);

  // ═══════════════════════════════════════════════════════════════════
  // COMPUTED: Tiene acceso a Develops
  // ═══════════════════════════════════════════════════════════════════

  const hasDevelopAccess = useMemo(() => {
    console.log("[hasDevelopAccess] user:", { id: user?.id, email: user?.email, role: user?.role, allowedIds: settings.developAccess.allowedUserIds });
    console.log("[hasDevelopAccess] user:", { id: user?.id, email: user?.email, role: user?.role, allowedIds: settings.developAccess.allowedUserIds });
    if (!user) return false;

    const { developAccess } = settings;

    // Modo whitelist
    // Por ID de usuario
    if (developAccess.allowedUserIds.includes(user.id)) return true;
    // Por email de usuario (fallback)
    if (user.email && developAccess.allowedUserIds.includes(user.email)) return true;
    // Por rol
    return false;
  }, [settings, user]);

  // ═══════════════════════════════════════════════════════════════════
  // FUNCIONES AUXILIARES
  // ═══════════════════════════════════════════════════════════════════

  const isModuleEnabled = useCallback(
    (moduleId: string): boolean => {
      const flagKey = `enable${moduleId.charAt(0).toUpperCase()}${moduleId
        .slice(1)
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`;
      return settings.featureFlags[flagKey] !== false;
    },
    [settings]
  );

  const isFeatureEnabled = useCallback(
    (flag: string): boolean => {
      return settings.featureFlags[flag] === true;
    },
    [settings]
  );

  const getRoleTemplate = useCallback(
    (roleId: string): RoleTemplate | undefined => {
      return roleTemplates.find((r) => r.id === roleId);
    },
    [roleTemplates]
  );

  // ═══════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════

  return {
    // Módulos
    modules,
    visibleModules,
    // Settings
    settings,
    featureFlags: settings.featureFlags,
    // Roles
    roleTemplates,
    getRoleTemplate,
    // Acceso
    hasDevelopAccess,
    // Funciones
    isModuleEnabled,
    isFeatureEnabled,
    // Estado
    loading,
  };
}
