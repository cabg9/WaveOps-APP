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
  status: 'live' | 'development';
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
  // Porcentaje máximo de descuento que un vendedor puede aplicar sin
  // aprobación (default 10 cuando no está definido). Si lo excede, la orden
  // queda "Descuento por aprobar" y la aprueba la jerarquía.
  maxDiscountWithoutApproval?: number;
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
  | 'ROLE_PERMISSION_GRANTED' | 'ROLE_PERMISSION_REVOKED'
  | 'MODULE_ACTIVATED' | 'MODULE_DEACTIVATED'
  | 'FEATURE_ENABLED' | 'FEATURE_DISABLED'
  | 'DEVELOP_ACCESS_GRANTED' | 'DEVELOP_ACCESS_REVOKED'
  | 'DEPARTMENT_CREATED' | 'DEPARTMENT_UPDATED' | 'DEPARTMENT_DELETED'
  | 'SHIFT_CREATED' | 'SHIFT_UPDATED' | 'SHIFT_DELETED'
  | 'POSITION_CREATED' | 'POSITION_UPDATED' | 'POSITION_DELETED'
  | 'SETTINGS_UPDATED' | 'SECURITY_POLICY_CHANGED'
  // Fase 0 — Ubicaciones
  | 'LOCATION_CREATED' | 'LOCATION_UPDATED' | 'LOCATION_DEACTIVATED' | 'LOCATION_ACTIVATED' | 'LOCATION_SEEDED'
  | 'LOCATION_TYPE_CREATED' | 'LOCATION_TYPE_UPDATED' | 'LOCATION_TYPE_DEACTIVATED' | 'LOCATION_TYPE_ACTIVATED' | 'LOCATION_TYPE_SEEDED'
  | 'LOCATION_GROUP_CREATED' | 'LOCATION_GROUP_UPDATED' | 'LOCATION_GROUP_DEACTIVATED' | 'LOCATION_GROUP_ACTIVATED' | 'LOCATION_GROUP_SEEDED'
  // Fase 0 — Catálogos maestros
  | 'SUPPLIER_CREATED' | 'SUPPLIER_UPDATED' | 'SUPPLIER_DEACTIVATED' | 'SUPPLIER_ACTIVATED' | 'SUPPLIER_SEEDED'
  | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DEACTIVATED' | 'PRODUCT_ACTIVATED' | 'PRODUCT_SEEDED'
  | 'PRODUCT_DELETED'
  | 'PRODUCT_CATEGORY_CREATED' | 'PRODUCT_CATEGORY_UPDATED' | 'PRODUCT_CATEGORY_SEEDED'
  | 'UNIT_OF_MEASURE_CREATED' | 'UNIT_OF_MEASURE_UPDATED' | 'UNIT_OF_MEASURE_SEEDED'
  | 'COST_CENTER_CREATED' | 'COST_CENTER_UPDATED' | 'COST_CENTER_SEEDED'
  | 'SALES_CHANNEL_CREATED' | 'SALES_CHANNEL_UPDATED' | 'SALES_CHANNEL_SEEDED'
  | 'CLIENT_CREATED' | 'CLIENT_UPDATED' | 'CLIENT_DEACTIVATED' | 'CLIENT_ACTIVATED'
  | 'CLIENT_INTERNAL_GENERATED' | 'CLIENT_SEEDED'
  // Fase 0 — Catálogo dinámico de controles
  | 'CONTROL_TYPE_CREATED' | 'CONTROL_TYPE_UPDATED' | 'CONTROL_TYPE_DEACTIVATED' | 'CONTROL_TYPE_ACTIVATED' | 'CONTROL_TYPE_SEEDED'
  | 'CONTROL_ASSIGNMENT_CREATED' | 'CONTROL_ASSIGNMENT_UPDATED' | 'CONTROL_ASSIGNMENT_DEACTIVATED'
  | 'CONTROL_ASSIGNMENT_ACTIVATED' | 'CONTROL_ASSIGNMENT_VERIFIED' | 'CONTROL_ASSIGNMENT_ALERT_SENT'
  // Fase 1 — Inventario / Warehouse
  | 'MOVEMENT_TYPE_CREATED' | 'MOVEMENT_TYPE_UPDATED' | 'MOVEMENT_TYPE_SEEDED'
  | 'SERIAL_STATUS_CREATED' | 'SERIAL_STATUS_UPDATED' | 'SERIAL_STATUS_SEEDED'
  | 'STOCK_MOVEMENT_CREATED' | 'STOCK_ADJUSTED'
  | 'TRANSFER_CREATED' | 'TRANSFER_SHIPPED' | 'TRANSFER_RECEIVED' | 'TRANSFER_CANCELLED'
  | 'COUNT_SCHEDULED' | 'COUNT_COMPLETED' | 'COUNT_ADJUSTMENT_APPROVED'
  | 'SERIAL_CREATED' | 'SERIAL_UPDATED' | 'SERIAL_STATUS_CHANGED'
  | 'RENTAL_ORDER_EMERGENCY_DISPATCH'
  | 'RENTAL_DISCOUNT_CREATED' | 'RENTAL_DISCOUNT_UPDATED'
  | 'RENTAL_DISCOUNT_ACTIVATED' | 'RENTAL_DISCOUNT_DEACTIVATED'
  | 'RENTAL_DISCOUNT_APPROVED' | 'RENTAL_DISCOUNT_REJECTED'
  | 'RENTAL_FEE_CREATED' | 'RENTAL_FEE_UPDATED'
  | 'RENTAL_FEE_ACTIVATED' | 'RENTAL_FEE_DEACTIVATED'
  | 'RENTAL_FEE_SEEDED'
  | 'RENTAL_ORDER_STATUS_CREATED' | 'RENTAL_ORDER_STATUS_UPDATED'
  | 'RENTAL_ORDER_STATUS_ACTIVATED' | 'RENTAL_ORDER_STATUS_DEACTIVATED'
  | 'RENTAL_ORDER_STATUS_SEEDED'
  | 'PURCHASE_REQUISITION_CREATED';

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
