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
import { Role } from '@/types';
import type { AppModule, AppSettings, RoleTemplate } from '@/types/develops';
import { hasPermission as hasStaticPermission } from '@/lib/permissions-config';

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
    companyName: 'Dive X Surf',
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
  // COMPUTED: Plantilla de rol del usuario actual
  // ═══════════════════════════════════════════════════════════════════

  const userRoleTemplate = useMemo(() => {
    if (!user) return undefined;
    return roleTemplates.find((r) => r.baseRole === user.role || r.id === user.role);
  }, [roleTemplates, user]);

  // Usuario efectivo: combina datos de auth con permisos del roleTemplate
  const effectiveUser = useMemo(() => {
    if (!user) return null;
    return {
      ...user,
      permissions: userRoleTemplate?.permissions || [],
    };
  }, [user, userRoleTemplate]);

  // Verificar si el usuario actual tiene un permiso específico
  const hasPermission = useCallback(
    (perm: string): boolean => {
      if (!user) return false;
      // Director General tiene acceso total
      if (user.role === Role.DIRECTOR_GENERAL) return true;
      // Usar usuario efectivo (combina datos de auth con permisos del roleTemplate)
      const targetUser = effectiveUser || user;
      // Fallback a permisos estáticos por nivel/rol (que también respeta user.permissions)
      return hasStaticPermission(targetUser, perm as any);
    },
    [user, effectiveUser]
  );

  // ═══════════════════════════════════════════════════════════════════
  // COMPUTED: Tiene acceso a Develops
  // ═══════════════════════════════════════════════════════════════════

  const hasDevelopAccess = useMemo(() => {
    if (!user) return false;

    const { developAccess } = settings;
    const mode = developAccess.mode || 'whitelist';

    // Acceso por permiso explicito del rol
    if (hasPermission('canViewModuleDevelops')) return true;

    // Modo whitelist
    if (mode === 'whitelist' || mode === 'hybrid') {
      if (developAccess.allowedUserIds.includes(user.id)) return true;
      if (user.email && developAccess.allowedUserIds.includes(user.email)) return true;
    }

    // Modo role-based
    if (mode === 'role-based' || mode === 'hybrid') {
      if (developAccess.allowedRoles.includes(user.role)) return true;
    }

    return false;
  }, [settings, user, hasPermission]);

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
      // Estado del modulo: development solo para quienes tienen acceso a Develops
      const moduleStatus = m.status || 'live';
      if (moduleStatus === 'development' && !hasDevelopAccess) return false;
      // Usuario debe tener el permiso requerido
      if (m.requiredPermission && !hasPermission(m.requiredPermission)) return false;
      return true;
    });
  }, [modules, settings, user, hasPermission, hasDevelopAccess]);

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
    userRoleTemplate,
    hasPermission,
    effectiveUser,
    // Acceso
    hasDevelopAccess,
    // Funciones
    isModuleEnabled,
    isFeatureEnabled,
    // Estado
    loading,
  };
}
