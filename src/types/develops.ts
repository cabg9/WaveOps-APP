// ═══════════════════════════════════════════════════════════════════
// TIPOS DEVELOPS - WAVEOPS
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// MÓDULOS
// ═══════════════════════════════════════════════════════════════════

export interface AppModule {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  icon: string;
  color: string;
  route: string;
  isActive: boolean;
  isVisible: boolean;
  status: 'live' | 'beta' | 'development';
  order: number;
  category: string;
  requiredPermission: string;
  isSystem: boolean;
  createdAt: string;
  createdBy: string;
}

// ═══════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════

export interface AppSettings {
  id: string;
  featureFlags: Record<string, boolean>;
  developAccess: DevelopAccess;
  security: SecuritySettings;
  branding: BrandingSettings;
  modulesOrder: string[];
  updatedAt: string;
  updatedBy: string;
}

export interface DevelopAccess {
  mode: 'whitelist' | 'role-based' | 'hybrid';
  allowedUserIds: string[];
  allowedRoles: string[];
  allowDelegation: boolean;
}

export interface SecuritySettings {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumbers: boolean;
  maxLoginAttempts: number;
  sessionTimeoutMinutes: number;
  requirePasswordForSensitiveActions: boolean;
  auditLogRetentionDays: number;
}

export interface BrandingSettings {
  appName: string;
  logoUrl: string;
  primaryColor: string;
  companyName: string;
}

// ═══════════════════════════════════════════════════════════════════
// ROLES
// ═══════════════════════════════════════════════════════════════════

export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  baseRole: string;
  level: number;
  permissions: string[];
  moduleAccess: ModuleAccess[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

export interface ModuleAccess {
  moduleId: string;
  canView: boolean;
  canEdit: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// POSICIONES
// ═══════════════════════════════════════════════════════════════════

export interface Position {
  id: string;
  name: string;
  level: number;
  department?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ═══════════════════════════════════════════════════════════════════
// AUDITORÍA
// ═══════════════════════════════════════════════════════════════════

export type AuditAction =
  | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DEACTIVATED' | 'USER_DELETED'
  | 'USER_RESTORED' | 'PASSWORD_RESET' | 'PASSWORD_CHANGED'
  | 'ROLE_CREATED' | 'ROLE_UPDATED' | 'ROLE_DELETED'
  | 'MODULE_ACTIVATED' | 'MODULE_DEACTIVATED'
  | 'FEATURE_ENABLED' | 'FEATURE_DISABLED'
  | 'DEVELOP_ACCESS_GRANTED' | 'DEVELOP_ACCESS_REVOKED'
  | 'DEPARTMENT_CREATED' | 'DEPARTMENT_UPDATED' | 'DEPARTMENT_DELETED'
  | 'SHIFT_CREATED' | 'SHIFT_UPDATED' | 'SHIFT_DELETED'
  | 'POSITION_CREATED' | 'POSITION_UPDATED' | 'POSITION_DELETED'
  | 'SETTINGS_UPDATED' | 'SECURITY_POLICY_CHANGED';

export type ImpactLevel = 'minor' | 'major' | 'sensitive' | 'critical';

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: AuditAction;
  actionCategory: string;
  targetType: string;
  targetId: string;
  targetName: string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  impactLevel: ImpactLevel;
  description: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  confirmationMethod: 'none' | 'simple' | 'password' | 'twoFactor';
  passwordConfirmed?: boolean;
  confirmedAt?: string;
}

export interface AuditFilters {
  userId?: string;
  action?: AuditAction;
  impactLevel?: ImpactLevel;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ═══════════════════════════════════════════════════════════════════
// CONFIRMACIÓN
// ═══════════════════════════════════════════════════════════════════

export type ConfirmLevel = 'simple' | 'important' | 'sensitive' | 'critical';

export interface ConfirmActionOptions {
  level: ConfirmLevel;
  title: string;
  description: string;
  action: () => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// ═══════════════════════════════════════════════════════════════════
// PAPELERA
// ═══════════════════════════════════════════════════════════════════

export interface TrashedItem {
  id: string;
  originalId: string;
  originalCollection: string;
  originalData: Record<string, any>;
  deletedBy: string;
  deletedByName: string;
  deletedAt: string;
  deleteReason: string;
  expiresAt: string;
  restoredAt?: string;
  restoredBy?: string;
}
