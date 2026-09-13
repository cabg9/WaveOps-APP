// ═══════════════════════════════════════════════════════════════════
// TIPOS - Catálogos maestros y Ubicaciones (Fase 0)
// ═══════════════════════════════════════════════════════════════════
// Toda entidad nueva lleva tenant_id (preparación multi-tenancy),
// timestamps ISO y createdBy/updatedBy. Nada de valores hardcodeados:
// los catálogos se crean desde la app.

// ─── Base compartida ───

export interface CatalogBase {
  id: string;
  tenantId: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

// ─── Ubicaciones (2.5 del plano maestro) ───

export interface LocationType extends CatalogBase {
  name: string;
  description?: string;
  allowedModules: string[]; // ids de appModules permitidos en este tipo
}

export interface LocationGroup extends CatalogBase {
  name: string;
  description?: string;
}

export interface Location extends CatalogBase {
  name: string;
  typeId: string; // ref locationTypes
  groupId: string; // ref locationGroups
  country?: string;
  city?: string;
  province?: string; // provincia/estado
  address?: string;
  responsibleUserId?: string; // responsable (opcional)
  responsibleDepartmentId?: string; // departamento del responsable (opcional)
  relatedModules: string[]; // ids de appModules asociados
  notes?: string;
}

// ─── Catálogos maestros (2.6 del plano maestro) ───

export interface SupplierBankAccount {
  id: string;
  bank?: string;
  accountType?: string;
  accountNumber?: string;
  isPrimary?: boolean; // una sola cuenta marcable como principal
}

export interface Supplier extends CatalogBase {
  identification: string; // RUC / identificación
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  /** @deprecated campo único legacy — usar bankAccounts */
  bankData?: {
    bank?: string;
    accountType?: string;
    accountNumber?: string;
  };
  bankAccounts?: SupplierBankAccount[]; // cuentas bancarias múltiples
  productCategoryIds?: string[]; // categorías de producto que suministra
  costCenterIds?: string[]; // centros de costo frecuentes
  paymentTerms?: string; // condiciones de pago
  notes?: string;
}

export interface ProductCategory extends CatalogBase {
  name: string;
  nameEn?: string;
}

export interface UnitOfMeasure extends CatalogBase {
  name: string; // ej. unidad, galón, litro, caja
  abbreviation?: string;
}

export interface Product extends CatalogBase {
  name: string;
  nameEn?: string;
  categoryId: string; // ref productCategories (catálogo dinámico)
  unitId: string; // ref unitsOfMeasure (catálogo dinámico)
  sku?: string;
  isRentable: boolean; // es rentable
  isConsumable: boolean; // es consumible
  photoUrl?: string;
  preferredSupplierId?: string; // proveedor preferido (ref suppliers, opcional)
}

export interface CostCenter extends CatalogBase {
  name: string;
  departmentId?: string; // ref departments
}

export interface SalesChannel extends CatalogBase {
  name: string;
  nameEn?: string;
}

export type ClientType = 'persona' | 'empresa' | 'interno';

export interface Client extends CatalogBase {
  type: ClientType;
  identification?: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  billingData?: {
    businessName?: string;
    taxId?: string;
    address?: string;
  };
  departmentId?: string; // solo para tipo interno (ref departments)
}

// ─── Catálogo Dinámico de Controles (2.4 #7 del plano maestro) ───

export type ControlAppliesTo =
  | 'personas'
  | 'equipos'
  | 'vehiculos'
  | 'embarcaciones'
  | 'ubicaciones';

/** Catálogo dinámico "Aplica a" — CRUD desde la pestaña Controles */
export interface ControlTargetTypeItem extends CatalogBase {
  name: string;
  nameEn?: string;
  icon?: string; // nombre de icono lucide opcional
}

export type ControlFieldType = 'texto' | 'fecha' | 'numero' | 'seleccion';

export interface ControlCustomField {
  key: string;
  label: string;
  type: ControlFieldType;
  options?: string[]; // solo para tipo 'seleccion'
}

export interface ControlType extends CatalogBase {
  name: string;
  nameEn?: string;
  description?: string;
  /** ids del catálogo dinámico controlTargetTypes (ej. 'personas', 'equipos').
   * Valores legacy ('personas','equipos','vehiculos','embarcaciones','ubicaciones') siguen válidos. */
  appliesTo: string[];
  roleIds: string[]; // roles a los que aplica (ids de roleTemplates o Role)
  positionIds?: string[]; // posiciones a las que aplica (ref positions)
  validityMonths?: number | null; // vigencia en meses (null = no vence)
  frequencyDays?: number | null; // frecuencia en días alternativa
  customFields: ControlCustomField[];
  alertDaysBefore: number; // días de alerta antes del vencimiento
  isRequired: boolean; // obligatorio u opcional
  verifierRole: string; // quién verifica (default 'RRHH')
}

export type ControlAssignmentStatus = 'vigente' | 'por_vencer' | 'vencido' | 'verificado';

export type ControlTargetType = 'user' | 'departamento' | 'equipo' | 'vehiculo' | 'embarcacion' | 'ubicacion';

export interface ControlHistoryEntry {
  action: 'creado' | 'emitido' | 'verificado' | 'editado' | 'desactivado' | 'alerta_enviada' | 'estado_auto';
  by: string;
  byName: string;
  at: string;
  note?: string;
}

export interface ControlAssignment extends CatalogBase {
  controlTypeId: string; // ref controlTypes
  controlTypeName?: string; // denormalizado para mostrar
  targetType: ControlTargetType;
  targetId: string; // user id / equipo / vehículo / embarcación / ubicación
  targetName: string; // denormalizado
  targetDepartmentId?: string; // denormalizado (usuarios)
  issueDate: string; // fecha de emisión
  expiryDate: string | null; // vencimiento calculado
  customValues: Record<string, string | number>; // valores de campos personalizados
  photoUrl?: string; // foto del documento
  status: ControlAssignmentStatus;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  history: ControlHistoryEntry[];
  lastAlertAt?: string; // dedupe de alertas automáticas
}

// ─── Constantes de colecciones ───

export const CATALOG_COLLECTIONS = {
  locationTypes: 'locationTypes',
  locationGroups: 'locationGroups',
  locations: 'locations',
  suppliers: 'suppliers',
  products: 'products',
  productCategories: 'productCategories',
  unitsOfMeasure: 'unitsOfMeasure',
  costCenters: 'costCenters',
  salesChannels: 'salesChannels',
  clients: 'clients',
  controlTypes: 'controlTypes',
  controlAssignments: 'controlAssignments',
  controlTargetTypes: 'controlTargetTypes',
} as const;
