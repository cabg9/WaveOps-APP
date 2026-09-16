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

// Precio escalonado por cantidad para productos rentables: a partir de
// minQty unidades, el precio por unidad/día es pricePerDay (maxQty null =
// sin tope superior). Campo aditivo de Product (priceTiers).
export interface PriceTier {
  minQty: number;
  maxQty: number | null;
  pricePerDay: number;
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
  rentalPricePerDay?: number | null; // precio de renta por unidad por día
  depositPercent?: number | null; // porcentaje de fianza sobre el valor de la renta
  priceTiers?: PriceTier[] | null; // precios escalonados por cantidad (rentable)
  // Admite descuento en la orden de renta (default true). Si es false, el
  // descuento de esa línea solo aplica vía solicitud aprobada (Supervisor+).
  admitsDiscount?: boolean;
}

// Descuento preconfigurado aplicable a órdenes de renta (catálogo Firestore
// rentalDiscounts). percent es positivo: 10 = -10 % sobre el total.
export interface RentalDiscount extends CatalogBase {
  name: string;
  percent: number;
}

// Impuesto o cargo configurable aplicable a órdenes de renta (catálogo
// Firestore rentalFees). mode 'percent' = value % sobre (subtotal − descuento);
// mode 'fixed' = monto fijo. value siempre positivo.
export interface RentalFee extends CatalogBase {
  name: string;
  mode: 'percent' | 'fixed';
  value: number;
}

// Fee aplicado a una orden (denormalizado para mostrar y auditar)
export interface RentalOrderFee {
  feeId: string;
  name: string;
  mode: 'percent' | 'fixed';
  value: number;
  amount: number; // monto efectivo cobrado (calculado sobre subtotal − descuento)
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
  /** Selecciones específicas por destino: { [appliesToId]: [targetIds o nombres] }.
   * Ej.: { personas: [uid1, uid2], departamentos: [deptId1], equipos: ['Tanque HP100'] } */
  targetSelections?: Record<string, string[]>;
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
  // Fase 1 — Inventario / Warehouse
  inventoryStocks: 'inventoryStocks',
  inventoryMovements: 'inventoryMovements',
  inventoryTransfers: 'inventoryTransfers',
  countSessions: 'countSessions',
  movementTypes: 'movementTypes',
  serialStatuses: 'serialStatuses',
  rentalUnits: 'rentalUnits',
  rentalOrders: 'rentalOrders',
  rentalOrderStatuses: 'rentalOrderStatuses',
  rentalDiscounts: 'rentalDiscounts',
  rentalFees: 'rentalFees',
} as const;

// ═══════════════════════════════════════════════════════════════════
// FASE 1 — INVENTARIO / WAREHOUSE
// ═══════════════════════════════════════════════════════════════════

// Stock de un producto en una ubicación (cantidad actual + mínimos/máximos)
export interface InventoryStock {
  id?: string;
  tenantId: string;
  productId: string;
  locationId: string;
  quantity: number;
  minStock?: number | null;
  maxStock?: number | null;
  updatedAt: string;
  updatedBy: string;
}

// Kardex: bitácora INMUTABLE de movimientos (create-only en reglas)
export interface InventoryMovement {
  id?: string;
  tenantId: string;
  productId: string;
  quantity: number; // con signo: + entrada, - salida
  fromLocationId?: string | null;
  toLocationId?: string | null;
  movementTypeId: string;
  reason?: string | null;
  referenceType?: 'transfer' | 'count' | 'rental' | null;
  referenceId?: string | null;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

// Transferencia entre ubicaciones con estado en tránsito
export interface InventoryTransfer {
  id?: string;
  tenantId: string;
  productId: string;
  quantity: number;
  fromLocationId: string;
  toLocationId: string;
  responsibleUserId?: string | null;
  responsibleName?: string | null;
  status: 'pendiente' | 'en_transito' | 'recibido' | 'cancelado';
  receivedBy?: string | null;
  receivedAt?: string | null;
  receivedUnitIds?: string[] | null; // seriales confirmados al recibir (productos rentables)
  shippedBy?: string | null;
  shippedByName?: string | null;
  shippedAt?: string | null;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export type CountFrequency = 'semanal' | 'quincenal' | 'mensual';

// Conteo cíclico por ubicación; el ajuste de diferencias requiere aprobación
export interface CountSession {
  id?: string;
  tenantId: string;
  locationId: string;
  status: 'programado' | 'en_curso' | 'finalizado' | 'ajustado';
  blind: boolean;
  frequency: CountFrequency;
  counts?: Record<string, number>;
  // Seriales escaneados por producto (productos rentables serializados: el
  // conteo se valida por escaneo; evita dobles conteos entre sesiones)
  scannedSerials?: Record<string, string[]>;
  differences?: Array<{ productId: string; expected: number; counted: number; delta: number }>;
  approvedBy?: string | null;
  approvedAt?: string | null;
  adjustmentReason?: string | null;
  scheduledAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdBy: string;
  createdByName: string;
}

// Tipo de movimiento (catálogo dinámico). isOutput = resta del stock.
export interface MovementType {
  id?: string;
  tenantId: string;
  name: string;
  nameEn?: string;
  isOutput: boolean;
  isActive: boolean;
}

// Estado de ciclo de vida de un serial (catálogo dinámico).
// blocksRental = true impide rentar la unidad (anti-sobre-renta).
export interface SerialStatus {
  id?: string;
  tenantId: string;
  name: string;
  nameEn?: string;
  blocksRental: boolean;
  isActive: boolean;
}

// Unidad serializada de un producto rentable (ej: Tanque #T001)
export interface RentalUnit {
  id?: string;
  tenantId: string;
  productId: string;
  serialNumber: string; // único
  photoUrl?: string | null;
  size?: string | null;
  statusId: string; // id del catálogo serialStatuses
  notes?: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export type RentalPaymentStatus = 'pagada' | 'pendiente' | 'parcial' | 'credito';

// Estado de aprobación del descuento de la orden: 'pending' cuando excede el
// máximo del vendedor o incluye un producto que no admite descuento; el
// supervisor aprueba o rechaza con un toque desde la campana (notificación
// accionable). Al rechazar, el descuento se quita del total.
export type RentalDiscountStatus = 'approved' | 'pending' | 'rejected';

// Ítem de una orden de renta: producto rentable + cantidad
export interface RentalOrderItem {
  productId: string;
  quantity: number;
  // Seriales exactos asignados al despachar (anti-sobre-renta: se sabe QUÉ salió)
  assignedUnitIds?: string[];
  tallaRef?: string | null; // rentas internas: referencia de pasajero/talla cuando aplique
  // Precio aplicado por unidad (tier según cantidad o precio base) y total de
  // la línea; solo los graban usuarios con permiso de montos (canSeeMoney)
  unitPrice?: number | null;
  subtotal?: number | null;
}

// Orden de renta: punto único de entrada del flujo canónico (Fase 1B)
export interface RentalOrder {
  id?: string;
  tenantId: string;
  orderNumber?: number; // correlativo (se asigna por Cloud Function)
  clientType: 'interno' | 'externo';
  clientId: string; // id de clients (interno = cliente del departamento)
  clientName: string;
  items: RentalOrderItem[];
  deliveryDate: string; // fecha y hora de entrega
  locationId?: string | null; // ubicación de entrega
  statusId: string; // id del catálogo rentalOrderStatuses
  paymentStatus: RentalPaymentStatus;
  paymentProofUrl?: string | null; // foto de comprobante
  paymentProofRef?: string | null; // n° de transacción
  activityRef?: string | null; // rentas internas: referencia de salida/actividad (opcional)
  depositAmount?: number | null; // fianza/depósito
  depositStatus?: 'retenida' | 'devuelta' | 'descontada' | null;
  depositDiscountApprovedBy?: string | null;
  depositDiscountEvidenceUrl?: string | null;
  // Precios cobrados (solo los graba personal con permiso de montos)
  subtotal?: number | null;
  discountId?: string | null; // ref rentalDiscounts
  discountName?: string | null; // denormalizado
  discountPercent?: number | null; // positivo: 10 = -10 %
  discountStatus?: RentalDiscountStatus | null; // aprobación del descuento
  // Impuestos/cargos aplicados (catálogo rentalFees) y su suma; el total
  // final = subtotal − descuento + feesTotal
  fees?: RentalOrderFee[];
  feesTotal?: number | null;
  total?: number | null;
  // Monto efectivamente cobrado al cliente (registro simple); con total
  // permite mostrar pagado / pendiente / parcial con cuánto falta
  amountPaid?: number | null;
  // Despacho de emergencia (escáner inoperativo): forzar el avance queda
  // auditado con motivo obligatorio y quién lo hizo (Supervisor+)
  emergencyDispatchReason?: string | null;
  emergencyDispatchBy?: string | null;
  emergencyDispatchAt?: string | null;
  observations?: string | null;
  preparedBy?: string | null; // quién prepara
  dispatchedBy?: string | null; // quién despacha (QR de la orden)
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  returnedAt?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  storedAt?: string | null;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt: string;
}

// Estado del flujo canónico de renta (catálogo dinámico, seeds en este orden:
// recibido → en_preparacion → listo_despachar → despachado → entregado →
// devuelto → verificado → almacenado | a_reparacion)
export interface RentalOrderStatus {
  id?: string;
  tenantId: string;
  name: string;
  nameEn?: string;
  order: number;
  isFinalOk?: boolean; // almacenado: fin feliz
  isFinalRepair?: boolean; // a_reparacion: fin con daño
  isActive: boolean;
}
