// INVENTARIO MODULE - Fase 1 (Inventario / Warehouse)
// Sub-pestañas: Stock, Movimientos (kardex inmutable), Transferencias
// (FASE 1A-transfers), Conteos (FASE 1A-counts), Seriales
// (FASE 1B-serials: rentalUnits + QR + escáner + deep links) y Catálogos
// (movementTypes + serialStatuses). Todo payload lleva
// tenantId; los catálogos se crean desde la app (nada hardcodeado salvo
// seeds idempotentes).
import { useState, useEffect, useMemo, useRef, useId } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import {
  collection, onSnapshot, addDoc, updateDoc, doc, setDoc, getDoc, getDocs, query, orderBy, where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAudit } from '@/hooks/useAudit';
import { useFirestoreUsers } from '@/hooks/firestore/useFirestoreUsers';
import { normalizeDeptCode } from '@/hooks/firestore/useDynamicDepartments';
import { useStorageUpload } from '@/hooks/firestore/useStorageUpload';
import { executeWithConfirm } from '@/lib/confirm-action';
import { getCurrentTenantId } from '@/lib/tenant';
import { registerI18nKeys, t, getLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Role } from '@/types';
import type { AuditAction } from '@/types/develops';
import type {
  InventoryStock,
  InventoryMovement,
  InventoryTransfer,
  CountSession,
  CountFrequency,
  MovementType,
  SerialStatus,
  RentalUnit,
  RentalOrder,
  RentalOrderStatus,
  Product,
  Location,
  UnitOfMeasure,
  Supplier,
  ProductCategory,
} from '@/types/catalogs';
import { CATALOG_COLLECTIONS } from '@/types/catalogs';
import {
  Box, ArrowDownUp, Tags, Package, MapPin, Plus, Search, QrCode,
  ChevronDown, ChevronUp, Pencil, Power, Construction,
  Truck, ClipboardList, Play, Send, Inbox, Ban, Printer, Upload,
  ShoppingCart, ArrowUpRight, SlidersHorizontal, ArrowLeft, Camera,
  History, Wrench, ScanLine, Eraser, Check,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// AUDITORÍA (acciones nuevas del módulo Inventario)
// ═══════════════════════════════════════════════════════════════════

const AUDIT_ACTIONS = {
  stockMovementCreated: 'STOCK_MOVEMENT_CREATED' as AuditAction,
  movementTypeCreated: 'MOVEMENT_TYPE_CREATED' as AuditAction,
  movementTypeUpdated: 'MOVEMENT_TYPE_UPDATED' as AuditAction,
  movementTypesSeeded: 'MOVEMENT_TYPES_SEEDED' as AuditAction,
  serialStatusCreated: 'SERIAL_STATUS_CREATED' as AuditAction,
  serialStatusUpdated: 'SERIAL_STATUS_UPDATED' as AuditAction,
  serialStatusesSeeded: 'SERIAL_STATUSES_SEEDED' as AuditAction,
  transferCreated: 'TRANSFER_CREATED' as AuditAction,
  transferShipped: 'TRANSFER_SHIPPED' as AuditAction,
  transferReceived: 'TRANSFER_RECEIVED' as AuditAction,
  transferCancelled: 'TRANSFER_CANCELLED' as AuditAction,
  countScheduled: 'COUNT_SCHEDULED' as AuditAction,
  countCompleted: 'COUNT_COMPLETED' as AuditAction,
  countAdjustmentApproved: 'COUNT_ADJUSTMENT_APPROVED' as AuditAction,
  serialCreated: 'SERIAL_CREATED' as AuditAction,
  serialStatusChanged: 'SERIAL_STATUS_CHANGED' as AuditAction,
  serialUpdated: 'SERIAL_UPDATED' as AuditAction,
  purchaseRequisitionCreated: 'PURCHASE_REQUISITION_CREATED' as AuditAction,
};

// ═══════════════════════════════════════════════════════════════════
// I18N (prefijo inv.)
// ═══════════════════════════════════════════════════════════════════

registerI18nKeys({
  es: {
    'inv.devTitle': 'Módulo en desarrollo',
    'inv.devSubtitle': 'El módulo de Inventario está en construcción. Estará disponible próximamente.',
    'inv.tab.stock': 'Stock',
    'inv.tab.movements': 'Movimientos',
    'inv.tab.transfers': 'Transferencias',
    'inv.tab.counts': 'Conteos',
    'inv.tab.serials': 'Seriales',
    'inv.tab.catalogs': 'Catálogos',
    'inv.loading': 'Cargando inventario...',
    'inv.error.load': 'Error al cargar datos de inventario',
    'inv.error.save': 'Error al guardar',
    'inv.readOnly': 'Solo lectura. Solo Dirección General y RRHH pueden gestionar inventario.',

    'inv.view.back': 'Volver',
    'inv.home.movement': 'Registrar movimiento',
    'inv.home.movementDesc': 'Compra, consumo, ajuste o salida de stock',
    'inv.home.transfer': 'Transferencia',
    'inv.home.transferDesc': 'Mueve stock entre ubicaciones con seguimiento',
    'inv.home.count': 'Programar conteo',
    'inv.home.countDesc': 'Conteo cíclico de una ubicación',
    'inv.home.serial': 'Serial nuevo',
    'inv.home.serialDesc': 'Alta de una unidad rentable',

    'inv.stock.viewByProduct': 'Por producto',
    'inv.stock.viewByLocation': 'Por ubicación',
    'inv.stock.scanQr': 'Escanear QR',
    'inv.stock.scanQrSoon': 'Próximamente',
    'inv.stock.registerMovement': 'Registrar movimiento',
    'inv.stock.newMovement': 'Registrar movimiento',
    'inv.stock.editMinMax': 'Editar mín/máx',
    'inv.stock.min': 'Mín',
    'inv.stock.max': 'Máx',
    'inv.stock.minMaxHelp': 'Solo supervisores definen mínimos y máximos. Al bajar del mínimo avisaremos por campana con la sugerencia de compra.',
    'inv.stock.lowStock': 'Bajo mínimo',
    'inv.stock.orderSuggestion': 'Sugerencia de pedido',
    'inv.stock.suggestedQty': 'Cantidad sugerida',
    'inv.stock.sendOrder': 'Enviar pedido',
    'inv.stock.orderCreated': 'Pedido enviado (queda como borrador pendiente)',
    'inv.stock.orderDraftPending': 'Borrador pendiente',
    'inv.stock.preferredSupplier': 'Proveedor preferido',
    'inv.stock.paymentTerms': 'Condiciones de pago',
    'inv.stock.noPreferredSupplier': 'Sin proveedor preferido registrado',
    'inv.stock.noProducts': 'No hay productos activos con stock',
    'inv.stock.noProductsHint': 'Registra el primer movimiento para crear stock de un producto.',
    'inv.stock.emptyLocation': 'Sin productos con stock en esta ubicación',

    'inv.movementForm.title': 'Registrar movimiento',
    'inv.movementForm.product': 'Producto',
    'inv.movementForm.selectProduct': 'Selecciona un producto',
    'inv.movementForm.noMatches': 'Sin coincidencias',
    'inv.movementForm.category': 'Categoría',
    'inv.movementForm.selectCategory': 'Selecciona una categoría',
    'inv.movementForm.noCategory': 'Sin categoría',
    'inv.movementForm.type': 'Tipo de movimiento',
    'inv.movementForm.selectType': 'Selecciona un tipo',
    'inv.movementForm.quantity': 'Cantidad',
    'inv.movementForm.fromLocation': 'Ubicación origen',
    'inv.movementForm.toLocation': 'Ubicación destino',
    'inv.movementForm.selectLocation': 'Selecciona una ubicación',
    'inv.movementForm.reason': 'Motivo (opcional)',
    'inv.movementForm.reasonPlaceholder': 'Ej: compra a proveedor, consumo en mantenimiento...',
    'inv.movementForm.save': 'Guardar movimiento',
    'inv.quick.compra': 'Compra',
    'inv.quick.transferencia': 'Transferencia',
    'inv.quick.consumo': 'Consumo',
    'inv.quick.ajuste': 'Ajuste',
    'inv.movementForm.originFixedSupplier': 'Proveedor externo / compra directa',
    'inv.movementForm.supplier': 'Proveedor',
    'inv.movementForm.noSupplier': 'Sin proveedor específico',
    'inv.movementForm.destFixedConsumption': 'Consumo/Externo',
    'inv.movementForm.originExternalHint': 'En los movimientos de entrada, el origen es siempre un proveedor externo o una compra directa; elige el proveedor si está registrado.',
    'inv.movementForm.help': 'En una compra, la mercadería entra desde un proveedor hacia tu ubicación. En un consumo, sale de tu ubicación y se gasta. En una transferencia, viaja entre dos ubicaciones tuyas.',
    'inv.movementForm.reasonRequired': 'El motivo es obligatorio para un ajuste',
    'inv.movementForm.originAutoHelp': 'Se descuenta de tu ubicación: {location}',
    'inv.movementForm.originDeptRestricted': 'Solo se listan las ubicaciones de tu departamento.',
    'inv.movementForm.originNoDept': 'Tu usuario no tiene un departamento con ubicaciones asignadas: se muestran todas las ubicaciones.',

    'inv.movements.help': 'Bitácora inmutable: los movimientos no se editan ni se borran. Cada entrada queda registrada para siempre.',
    'inv.movements.filterProduct': 'Producto',
    'inv.movements.filterLocation': 'Ubicación',
    'inv.movements.filterType': 'Tipo',
    'inv.movements.all': 'Todos',
    'inv.movements.empty': 'No hay movimientos registrados',
    'inv.movements.in': 'Entrada',
    'inv.movements.out': 'Salida',
    'inv.movements.type': 'Tipo',
    'inv.movements.product': 'Producto',
    'inv.movements.from': 'Origen',
    'inv.movements.to': 'Destino',
    'inv.movements.reason': 'Motivo',
    'inv.movements.user': 'Usuario',
    'inv.movements.date': 'Fecha',
    'inv.movements.reference': 'Referencia',
    'inv.movements.noReason': 'Sin motivo registrado',

    'inv.catalogs.mt.title': 'Tipos de movimiento',
    'inv.catalogs.mt.subtitle': 'Definen el signo del movimiento: si restan o suman stock.',
    'inv.catalogs.mt.new': 'Nuevo tipo',
    'inv.catalogs.mt.loadSeeds': 'Cargar iniciales',
    'inv.catalogs.mt.isOutput': 'Resta stock',
    'inv.catalogs.mt.name': 'Nombre (español)',
    'inv.catalogs.mt.nameEn': 'Nombre (inglés, opcional)',
    'inv.catalogs.mt.empty': 'Sin tipos de movimiento. Crea el primero o carga el catálogo inicial.',
    'inv.catalogs.mt.seedsConfirmTitle': 'Cargar tipos de movimiento iniciales',
    'inv.catalogs.mt.seedsConfirmDesc': 'Se crearán los tipos iniciales que falten. Los existentes no se modifican.',
    'inv.catalogs.mt.seedsSummary': '{created} tipos cargados ({existing} ya existían)',
    'inv.catalogs.mt.renamed': 'Tipo de movimiento actualizado',

    'inv.catalogs.ss.title': 'Estados de ciclo de vida',
    'inv.catalogs.ss.subtitle': 'Estados de los seriales (unidades rentables). El que bloquea renta impide asignar la unidad.',
    'inv.catalogs.ss.new': 'Nuevo estado',
    'inv.catalogs.ss.loadSeeds': 'Cargar iniciales',
    'inv.catalogs.ss.blocksRental': 'Bloquea renta',
    'inv.catalogs.ss.name': 'Nombre (español)',
    'inv.catalogs.ss.nameEn': 'Nombre (inglés, opcional)',
    'inv.catalogs.ss.empty': 'Sin estados de ciclo de vida. Crea el primero o carga el catálogo inicial.',
    'inv.catalogs.ss.seedsConfirmTitle': 'Cargar estados iniciales',
    'inv.catalogs.ss.seedsConfirmDesc': 'Se crearán los estados iniciales que falten. Los existentes no se modifican.',
    'inv.catalogs.ss.seedsSummary': '{created} estados cargados ({existing} ya existían)',
    'inv.catalogs.ss.renamed': 'Estado actualizado',

    'inv.common.save': 'Guardar',
    'inv.common.cancel': 'Cancelar',
    'inv.common.create': 'Crear',
    'inv.common.active': 'Activo',
    'inv.common.inactive': 'Inactivo',
    'inv.validation.nameRequired': 'El nombre es obligatorio',
    'inv.validation.productRequired': 'Selecciona un producto',
    'inv.validation.typeRequired': 'Selecciona un tipo de movimiento',
    'inv.validation.quantityPositive': 'La cantidad debe ser mayor que cero',
    'inv.validation.fromRequired': 'La ubicación origen es obligatoria para tipos que restan stock',
    'inv.validation.toRequired': 'La ubicación destino es obligatoria para tipos que suman stock',

    'inv.transfers.help': 'Mueve stock entre ubicaciones con seguimiento de estado. Al crear se descuenta del origen; al recibir se suma al destino; al cancelar se devuelve al origen. Nada desaparece: filtra por estado para ver el historial completo. Puede recibir quien sea responsable de la ubicación destino, pertenezca al departamento de esa ubicación o sea Supervisor o superior.',
    'inv.transfers.new': 'Nueva transferencia',
    'inv.transfers.empty': 'No hay transferencias registradas',
    'inv.transfers.quantity': 'Cantidad',
    'inv.transfers.from': 'Ubicación origen',
    'inv.transfers.to': 'Ubicación destino',
    'inv.transfers.responsible': 'Responsable (opcional)',
    'inv.transfers.selectResponsible': 'Sin responsable asignado',
    'inv.transfers.status.pendiente': 'Pendiente',
    'inv.transfers.status.en_transito': 'En tránsito',
    'inv.transfers.status.recibido': 'Recibido',
    'inv.transfers.status.cancelado': 'Cancelado',
    'inv.transfers.validation.fromRequired': 'La ubicación origen es obligatoria',
    'inv.transfers.validation.toRequired': 'La ubicación destino es obligatoria',
    'inv.transfers.validation.sameLocation': 'El origen y el destino deben ser distintos',
    'inv.transfers.validation.insufficientStock': 'Stock insuficiente en el origen (disponible: {available})',
    'inv.transfers.createConfirmDesc': 'Se descontará {quantity} del stock del origen de inmediato.',
    'inv.transfers.dispatch': 'Despachar',
    'inv.transfers.filter.all': 'Todas',
    'inv.transfers.shippedBy': 'Despachada por',
    'inv.transfers.shippedAt': 'Despachada',
    'inv.transfers.receivedUnits': 'Seriales recibidos',
    'inv.transfers.receive': 'Recibir',
    'inv.transfers.cancel': 'Cancelar',
    'inv.transfers.receiveTitle': 'Recibir transferencia',
    'inv.transfers.receivedByLabel': 'Recibido por',
    'inv.transfers.receivedByPlaceholder': 'Nombre de quien recibe',
    'inv.transfers.cancelTitle': 'Cancelar transferencia',
    'inv.transfers.cancelReason': 'Motivo (opcional)',
    'inv.transfers.cancelReasonPlaceholder': 'Ej: se dañó el producto, se revirtió la solicitud...',
    'inv.transfers.createdBy': 'Creada por',
    'inv.transfers.responsibleLabel': 'Responsable',
    'inv.transfers.inTransitTo': 'En tránsito a {location}: {quantity} {unit}',
    'inv.transfers.reasonCreated': 'Transferencia creada',
    'inv.transfers.reasonReceived': 'Transferencia recibida',
    'inv.transfers.reasonCancelled': 'Transferencia cancelada',
    'inv.transfers.stockLine': '{location}: {quantity} {unit}',
    'inv.transfers.stockOrigin': 'Disponible en el origen',
    'inv.transfers.stockDestination': 'En el destino',
    'inv.transfers.receiveRule': 'Puede recibir quien sea responsable de la ubicación destino, pertenezca al departamento de esa ubicación o sea Supervisor o superior. Quien creó la transferencia no puede recibirla.',
    'inv.transfers.creatorHint': 'Quien crea o envía una transferencia no puede marcarla como recibida.',
    'inv.transfers.noDeptWarning': 'Esta ubicación no tiene departamento asignado: solo su responsable o un Supervisor o superior puede recibir.',
    'inv.transfers.serializedHint': 'Producto rentable con seriales: confirma las unidades que llegaron escaneando su QR o marcándolas en la lista.',
    'inv.transfers.unitsReceived': 'Unidades confirmadas',
    'inv.transfers.scanUnit': 'Escanear unidad',
    'inv.transfers.validation.serialNotForProduct': 'Ese serial no pertenece al producto de esta transferencia',
    'inv.transfers.validation.unitsRequired': 'Confirma las {expected} unidades que llegaron para poder recibir',

    'inv.counts.help': 'Un conteo cíclico revisa físicamente el stock de una ubicación para compararlo con lo registrado. Los productos rentables con seriales se cuentan escaneando el QR de cada unidad (obligatorio); los demás productos admiten entrada manual de cantidad (si tienen QR de producto, escanearlo salta a ese producto). Al finalizar se comparan contra el stock esperado; si hay diferencias, el ajuste requiere aprobación de un supervisor con motivo obligatorio.',
    'inv.counts.schedule': 'Programar conteo',
    'inv.counts.empty': 'No hay conteos programados',
    'inv.counts.frequency': 'Frecuencia',
    'inv.counts.location': 'Ubicación',
    'inv.counts.frequency.semanal': 'Semanal',
    'inv.counts.frequency.quincenal': 'Quincenal',
    'inv.counts.frequency.mensual': 'Mensual',
    'inv.counts.blind': 'Conteo ciego (oculta el stock esperado)',
    'inv.counts.blindYes': 'Ciego',
    'inv.counts.blindNo': 'No ciego',
    'inv.counts.status.programado': 'Programado',
    'inv.counts.status.en_curso': 'En curso',
    'inv.counts.status.finalizado': 'Finalizado',
    'inv.counts.status.ajustado': 'Ajustado',
    'inv.counts.start': 'Iniciar conteo',
    'inv.counts.continue': 'Continuar conteo',
    'inv.counts.scan': 'Escanear',
    'inv.counts.scanSoon': 'Próximamente',
    'inv.counts.scanRequired': 'Escanea el QR de cada unidad',
    'inv.counts.scannedCount': '{count} escaneadas',
    'inv.counts.undoScan': 'Deshacer último escaneo',
    'inv.counts.serialNotInCount': 'Ese serial no pertenece a un producto de este conteo',
    'inv.counts.serialAlreadyCounted': 'Ese serial ya fue contado',
    'inv.counts.productNotInCount': 'Ese producto no está en este conteo',
    'inv.counts.expected': 'Esperado',
    'inv.counts.counted': 'Contado',
    'inv.counts.savePartial': 'Guardar avance',
    'inv.counts.finish': 'Finalizar conteo',
    'inv.counts.backToList': 'Volver a la lista',
    'inv.counts.countingTitle': 'Conteo en curso',
    'inv.counts.differencesTitle': 'Diferencias detectadas',
    'inv.counts.noDifferences': 'Sin diferencias: el conteo coincide con el stock.',
    'inv.counts.applyAdjustment': 'Aplicar ajuste',
    'inv.counts.adjustmentReason': 'Motivo del ajuste (obligatorio)',
    'inv.counts.adjustmentReasonPlaceholder': 'Ej: merma, robo, error de registro...',
    'inv.counts.adjustmentReasonLabel': 'Motivo del ajuste',
    'inv.counts.validation.locationRequired': 'Selecciona una ubicación',
    'inv.counts.validation.reasonRequired': 'El motivo del ajuste es obligatorio',
    'inv.counts.scheduledAt': 'Programado',
    'inv.counts.startedAt': 'Iniciado',
    'inv.counts.finishedAt': 'Finalizado',
    'inv.counts.createdBy': 'Creado por',
    'inv.counts.approvedBy': 'Aprobado por',

    'inv.serials.help': 'Unidades individuales de productos rentables con número de serie único. Los estados que bloquean renta impiden rentar la unidad.',
    'inv.serials.new': 'Nuevo serial',
    'inv.serials.empty': 'No hay seriales registrados',
    'inv.serials.noRentable': 'No hay productos rentables activos. Crea primero un producto rentable en Catálogos.',
    'inv.serials.product': 'Producto',
    'inv.serials.selectProduct': 'Selecciona un producto rentable',
    'inv.serials.serialNumber': 'Número de serie',
    'inv.serials.serialNumberPlaceholder': 'Ej: T001',
    'inv.serials.size': 'Talla / tamaño (opcional)',
    'inv.serials.sizePlaceholder': 'Ej: M, 12L, XL...',
    'inv.serials.photo': 'Foto (opcional)',
    'inv.serials.uploadPhoto': 'Subir foto',
    'inv.serials.status': 'Estado inicial',
    'inv.serials.notes': 'Notas (opcionales)',
    'inv.serials.notesPlaceholder': 'Ej: incluye regulador y boquilla...',
    'inv.serials.validation.serialRequired': 'El número de serie es obligatorio',
    'inv.serials.validation.serialDuplicate': 'Ya existe un serial con ese número',
    'inv.serials.blocksRental': 'Bloqueado para renta',
    'inv.serials.createdAt': 'Creado',
    'inv.serials.updatedAt': 'Actualizado',
    'inv.serials.changeStatus': 'Cambiar estado',
    'inv.serials.edit': 'Editar talla y notas',
    'inv.serials.viewQr': 'Ver QR del serial',
    'inv.serials.history': 'Historial',
    'inv.serials.historyEmpty': 'Este serial aún no ha sido rentado.',
    'inv.serials.outAt': 'Salió',
    'inv.serials.backAt': 'Volvió',
    'inv.serials.inRepair': 'En reparación',
    'inv.serials.retire': 'Dar de baja',
    'inv.serials.retireTitle': 'Dar de baja serial',
    'inv.serials.retireDesc': 'Registra la evidencia y el motivo. La baja es permanente: el serial no podrá reactivarse.',
    'inv.serials.retirePhoto': 'Foto de evidencia (obligatoria)',
    'inv.serials.retireReason': 'Motivo (obligatorio)',
    'inv.serials.retireReasonPlaceholder': 'Ej: daño irreparable, pérdida, obsolescencia...',
    'inv.serials.retireConfirmDesc': 'El serial pasará a estado "Dado de baja" de forma permanente.',
    'inv.serials.retireDone': 'Serial dado de baja',
    'inv.serials.retired': 'Dado de baja',
    'inv.serials.retirePhotoRequired': 'La foto de evidencia es obligatoria',
    'inv.serials.retireReasonRequired': 'El motivo es obligatorio',

    'inv.qr.print': 'Imprimir',
    'inv.qr.product': 'Producto',
    'inv.qr.location': 'Ubicación',
    'inv.qr.serial': 'Serial',
    'inv.qr.productTitle': 'QR del producto',
    'inv.qr.locationTitle': 'QR de la ubicación',
    'inv.qr.scanProduct': 'QR del producto',
    'inv.qr.scanLocation': 'QR de la ubicación',

    'inv.scanner.title': 'Escanear código QR',
    'inv.scanner.hint': 'Apunta la cámara al código QR de un producto, ubicación o serial.',
    'inv.scanner.unrecognized': 'Código QR no reconocido',
    'inv.scanner.error': 'No se pudo iniciar la cámara',
    'inv.scanner.manual': 'Ingresar código manual',
    'inv.scanner.manualPlaceholder': 'Pega la URL del QR o el id del serial',
    'inv.scanner.manualSubmit': 'Buscar',
    'inv.scanner.switchCamera': 'Cambiar cámara',
    'inv.catalogs.seedsAlreadyLoaded': 'Ya están cargadas',

    'inv.home.stock': 'Stock',
    'inv.home.stockDesc': 'Disponibilidad por producto y ubicación',
    'inv.home.movements': 'Movimientos',
    'inv.home.movementsDesc': 'Kardex histórico del inventario',
    'inv.home.transfers': 'Transferencias',
    'inv.home.transfersDesc': 'Envíos y recepciones entre ubicaciones',
    'inv.home.counts': 'Conteos',
    'inv.home.countsDesc': 'Conteos cíclicos por ubicación',
    'inv.home.serials': 'Seriales',
    'inv.home.serialsDesc': 'Unidades individuales rentables',
    'inv.home.catalogs': 'Catálogos',
    'inv.home.catalogsDesc': 'Tipos de movimiento y estados',
    'inv.home.adjustments': 'Ajustes',
    'inv.home.adjustmentsDesc': 'Ajustes del kardex con motivo',
    'inv.home.scan': 'Escanear QR',
    'inv.home.scanDesc': 'Ficha de producto y acciones directas',
    'inv.adjustments.title': 'Ajustes',
    'inv.adjustments.help': 'Movimientos de tipo ajuste del kardex, con motivo, fecha y quién los registró. Solo lectura.',
    'inv.adjustments.empty': 'No hay ajustes registrados',
    'inv.product.title': 'Ficha de producto',
    'inv.product.buy': 'Comprar',
    'inv.product.transfer': 'Transferir',
    'inv.product.consume': 'Consumir',
    'inv.product.rent': 'Rentar',
    'inv.product.repair': 'Enviar a reparación',
    'inv.product.history': 'Ver historial',
    'inv.product.stockByLocation': 'Stock por ubicación',
    'inv.product.unitsByStatus': 'Unidades por estado',
    'inv.product.noStock': 'Sin stock registrado',
    'inv.product.notFound': 'Producto no encontrado',
    'inv.product.scanToSelect': 'Escanear para buscar',
    'inv.serialized.stockHint': 'Controlado por seriales',
    'inv.serialized.blockTitle': 'Producto serializado',
    'inv.serialized.blockHelp': 'Este producto se controla por unidades individuales (seriales): usa Seriales para darlo de alta, y renta/despacho para moverlo.',
    'inv.serialized.buyHelp': 'Las compras de productos serializados se reciben dando de alta cada unidad con su serial.',
    'inv.serialized.goSerials': 'Dar de alta seriales',
    'inv.receive.scanConfirmHelp': 'Producto con QR: escanea el QR del producto que llega para confirmar la recepción.',
    'inv.receive.scanConfirm': 'Escanear QR para confirmar',
    'inv.receive.scanConfirmed': 'QR confirmado',
    'inv.receive.noQrHelp': 'Este producto no tiene QR: adjunta una foto de lo recibido y la firma de quien recibe.',
    'inv.receive.photo': 'Foto de lo recibido',
    'inv.receive.signature': 'Firma de quien recibe',
    'inv.receive.signatureHint': 'Dibuja la firma con el dedo o el mouse',
    'inv.receive.signatureClear': 'Limpiar',
    'inv.repair.title': 'Enviar a reparación',
    'inv.repair.help': 'Selecciona las unidades disponibles que van a reparación e indica el motivo.',
    'inv.repair.selectUnits': 'Unidades a reparación',
    'inv.repair.reason': 'Motivo',
    'inv.repair.reasonPlaceholder': 'Ej: válvula con fuga',
    'inv.repair.noAvailable': 'No hay unidades disponibles de este producto.',
    'inv.repair.noSerialsHelp': 'Este producto no tiene seriales: registra una salida por ajuste con motivo de reparación.',
    'inv.repair.done': 'Unidades enviadas a reparación',
  },
  en: {
    'inv.devTitle': 'Module under development',
    'inv.devSubtitle': 'The Inventory module is under construction. It will be available soon.',
    'inv.tab.stock': 'Stock',
    'inv.tab.movements': 'Movements',
    'inv.tab.transfers': 'Transfers',
    'inv.tab.counts': 'Counts',
    'inv.tab.serials': 'Serials',
    'inv.tab.catalogs': 'Catalogs',
    'inv.loading': 'Loading inventory...',
    'inv.error.load': 'Error loading inventory data',
    'inv.error.save': 'Error saving',
    'inv.readOnly': 'Read only. Only General Management and HR can manage inventory.',

    'inv.view.back': 'Back',
    'inv.home.movement': 'Register movement',
    'inv.home.movementDesc': 'Purchase, consumption, adjustment or stock out',
    'inv.home.transfer': 'Transfer',
    'inv.home.transferDesc': 'Move stock between locations with tracking',
    'inv.home.count': 'Schedule count',
    'inv.home.countDesc': 'Cyclic count of a location',
    'inv.home.serial': 'New serial',
    'inv.home.serialDesc': 'Register a rentable unit',

    'inv.stock.viewByProduct': 'By product',
    'inv.stock.viewByLocation': 'By location',
    'inv.stock.scanQr': 'Scan QR',
    'inv.stock.scanQrSoon': 'Coming soon',
    'inv.stock.registerMovement': 'Register movement',
    'inv.stock.newMovement': 'Register movement',
    'inv.stock.editMinMax': 'Edit min/max',
    'inv.stock.min': 'Min',
    'inv.stock.max': 'Max',
    'inv.stock.minMaxHelp': 'Only supervisors set minimums and maximums. When stock drops below the minimum we will notify you with a purchase suggestion.',
    'inv.stock.lowStock': 'Below minimum',
    'inv.stock.orderSuggestion': 'Order suggestion',
    'inv.stock.suggestedQty': 'Suggested quantity',
    'inv.stock.sendOrder': 'Send order',
    'inv.stock.orderCreated': 'Order sent (saved as pending draft)',
    'inv.stock.orderDraftPending': 'Pending draft',
    'inv.stock.preferredSupplier': 'Preferred supplier',
    'inv.stock.paymentTerms': 'Payment terms',
    'inv.stock.noPreferredSupplier': 'No preferred supplier registered',
    'inv.stock.noProducts': 'No active products with stock',
    'inv.stock.noProductsHint': 'Register the first movement to create stock for a product.',
    'inv.stock.emptyLocation': 'No products with stock at this location',

    'inv.movementForm.title': 'Register movement',
    'inv.movementForm.product': 'Product',
    'inv.movementForm.selectProduct': 'Select a product',
    'inv.movementForm.noMatches': 'No matches',
    'inv.movementForm.category': 'Category',
    'inv.movementForm.selectCategory': 'Select a category',
    'inv.movementForm.noCategory': 'No category',
    'inv.movementForm.type': 'Movement type',
    'inv.movementForm.selectType': 'Select a type',
    'inv.movementForm.quantity': 'Quantity',
    'inv.movementForm.fromLocation': 'Source location',
    'inv.movementForm.toLocation': 'Destination location',
    'inv.movementForm.selectLocation': 'Select a location',
    'inv.movementForm.reason': 'Reason (optional)',
    'inv.movementForm.reasonPlaceholder': 'E.g.: supplier purchase, maintenance consumption...',
    'inv.movementForm.save': 'Save movement',
    'inv.quick.compra': 'Purchase',
    'inv.quick.transferencia': 'Transfer',
    'inv.quick.consumo': 'Consumption',
    'inv.quick.ajuste': 'Adjustment',
    'inv.movementForm.originFixedSupplier': 'External supplier / direct purchase',
    'inv.movementForm.supplier': 'Supplier',
    'inv.movementForm.noSupplier': 'No specific supplier',
    'inv.movementForm.destFixedConsumption': 'Consumption/External',
    'inv.movementForm.originExternalHint': 'In incoming movements, the source is always an external supplier or a direct purchase; choose the supplier if it is registered.',
    'inv.movementForm.help': 'In a purchase, goods come in from a supplier to your location. In consumption, they leave your location and are used up. In a transfer, they travel between two of your locations.',
    'inv.movementForm.reasonRequired': 'Reason is required for an adjustment',
    'inv.movementForm.originAutoHelp': 'It is subtracted from your location: {location}',
    'inv.movementForm.originDeptRestricted': 'Only the locations of your department are listed.',
    'inv.movementForm.originNoDept': 'Your user has no department with assigned locations: all locations are shown.',

    'inv.movements.help': 'Immutable log: movements are never edited or deleted. Every entry is recorded forever.',
    'inv.movements.filterProduct': 'Product',
    'inv.movements.filterLocation': 'Location',
    'inv.movements.filterType': 'Type',
    'inv.movements.all': 'All',
    'inv.movements.empty': 'No movements recorded',
    'inv.movements.in': 'In',
    'inv.movements.out': 'Out',
    'inv.movements.type': 'Type',
    'inv.movements.product': 'Product',
    'inv.movements.from': 'From',
    'inv.movements.to': 'To',
    'inv.movements.reason': 'Reason',
    'inv.movements.user': 'User',
    'inv.movements.date': 'Date',
    'inv.movements.reference': 'Reference',
    'inv.movements.noReason': 'No reason recorded',

    'inv.catalogs.mt.title': 'Movement types',
    'inv.catalogs.mt.subtitle': 'They define the movement sign: whether they subtract or add stock.',
    'inv.catalogs.mt.new': 'New type',
    'inv.catalogs.mt.loadSeeds': 'Load initial set',
    'inv.catalogs.mt.isOutput': 'Subtracts stock',
    'inv.catalogs.mt.name': 'Name (Spanish)',
    'inv.catalogs.mt.nameEn': 'Name (English, optional)',
    'inv.catalogs.mt.empty': 'No movement types. Create the first one or load the initial catalog.',
    'inv.catalogs.mt.seedsConfirmTitle': 'Load initial movement types',
    'inv.catalogs.mt.seedsConfirmDesc': 'Missing initial types will be created. Existing ones are not modified.',
    'inv.catalogs.mt.seedsSummary': '{created} types loaded ({existing} already existed)',
    'inv.catalogs.mt.renamed': 'Movement type updated',

    'inv.catalogs.ss.title': 'Lifecycle statuses',
    'inv.catalogs.ss.subtitle': 'Statuses of serials (rentable units). "Blocks rental" prevents assigning the unit.',
    'inv.catalogs.ss.new': 'New status',
    'inv.catalogs.ss.loadSeeds': 'Load initial set',
    'inv.catalogs.ss.blocksRental': 'Blocks rental',
    'inv.catalogs.ss.name': 'Name (Spanish)',
    'inv.catalogs.ss.nameEn': 'Name (English, optional)',
    'inv.catalogs.ss.empty': 'No lifecycle statuses. Create the first one or load the initial catalog.',
    'inv.catalogs.ss.seedsConfirmTitle': 'Load initial statuses',
    'inv.catalogs.ss.seedsConfirmDesc': 'Missing initial statuses will be created. Existing ones are not modified.',
    'inv.catalogs.ss.seedsSummary': '{created} statuses loaded ({existing} already existed)',
    'inv.catalogs.ss.renamed': 'Status updated',

    'inv.common.save': 'Save',
    'inv.common.cancel': 'Cancel',
    'inv.common.create': 'Create',
    'inv.common.active': 'Active',
    'inv.common.inactive': 'Inactive',
    'inv.validation.nameRequired': 'Name is required',
    'inv.validation.productRequired': 'Select a product',
    'inv.validation.typeRequired': 'Select a movement type',
    'inv.validation.quantityPositive': 'Quantity must be greater than zero',
    'inv.validation.fromRequired': 'Source location is required for types that subtract stock',
    'inv.validation.toRequired': 'Destination location is required for types that add stock',

    'inv.transfers.help': 'Moves stock between locations with status tracking. Creating it subtracts from the source; receiving adds to the destination; cancelling returns it to the source. Nothing disappears: filter by status to see the full history. Who can receive: the destination location responsible, anyone in that location\'s department, or a Supervisor or above.',
    'inv.transfers.new': 'New transfer',
    'inv.transfers.empty': 'No transfers recorded',
    'inv.transfers.quantity': 'Quantity',
    'inv.transfers.from': 'Source location',
    'inv.transfers.to': 'Destination location',
    'inv.transfers.responsible': 'Responsible (optional)',
    'inv.transfers.selectResponsible': 'No responsible assigned',
    'inv.transfers.status.pendiente': 'Pending',
    'inv.transfers.status.en_transito': 'In transit',
    'inv.transfers.status.recibido': 'Received',
    'inv.transfers.status.cancelado': 'Cancelled',
    'inv.transfers.validation.fromRequired': 'Source location is required',
    'inv.transfers.validation.toRequired': 'Destination location is required',
    'inv.transfers.validation.sameLocation': 'Source and destination must be different',
    'inv.transfers.validation.insufficientStock': 'Insufficient stock at source (available: {available})',
    'inv.transfers.createConfirmDesc': '{quantity} will be subtracted from the source stock immediately.',
    'inv.transfers.dispatch': 'Dispatch',
    'inv.transfers.filter.all': 'All',
    'inv.transfers.shippedBy': 'Dispatched by',
    'inv.transfers.shippedAt': 'Dispatched',
    'inv.transfers.receivedUnits': 'Received serials',
    'inv.transfers.receive': 'Receive',
    'inv.transfers.cancel': 'Cancel',
    'inv.transfers.receiveTitle': 'Receive transfer',
    'inv.transfers.receivedByLabel': 'Received by',
    'inv.transfers.receivedByPlaceholder': 'Name of who receives',
    'inv.transfers.cancelTitle': 'Cancel transfer',
    'inv.transfers.cancelReason': 'Reason (optional)',
    'inv.transfers.cancelReasonPlaceholder': 'E.g.: product damaged, request reverted...',
    'inv.transfers.createdBy': 'Created by',
    'inv.transfers.responsibleLabel': 'Responsible',
    'inv.transfers.inTransitTo': 'In transit to {location}: {quantity} {unit}',
    'inv.transfers.reasonCreated': 'Transfer created',
    'inv.transfers.reasonReceived': 'Transfer received',
    'inv.transfers.reasonCancelled': 'Transfer cancelled',
    'inv.transfers.stockLine': '{location}: {quantity} {unit}',
    'inv.transfers.stockOrigin': 'Available at source',
    'inv.transfers.stockDestination': 'At destination',
    'inv.transfers.receiveRule': 'Who can receive: the destination location responsible, anyone in that location\'s department, or a Supervisor or above. Whoever created the transfer cannot receive it.',
    'inv.transfers.creatorHint': 'Whoever creates or sends a transfer cannot mark it as received.',
    'inv.transfers.noDeptWarning': 'This location has no assigned department: only its responsible or a Supervisor or above can receive.',
    'inv.transfers.serializedHint': 'Rentable product with serials: confirm the units that arrived by scanning their QR or checking them in the list.',
    'inv.transfers.unitsReceived': 'Confirmed units',
    'inv.transfers.scanUnit': 'Scan unit',
    'inv.transfers.validation.serialNotForProduct': 'That serial does not belong to the product of this transfer',
    'inv.transfers.validation.unitsRequired': 'Confirm the {expected} units that arrived in order to receive',

    'inv.counts.help': 'A cyclic count physically checks the stock of a location to compare it with what is recorded. Rentable products with serials are counted by scanning the QR of each unit (mandatory); other products allow manual quantity entry (if they have a product QR, scanning it jumps to that product). On completion they are compared against expected stock; if there are differences, the adjustment requires supervisor approval with a mandatory reason.',
    'inv.counts.schedule': 'Schedule count',
    'inv.counts.empty': 'No counts scheduled',
    'inv.counts.frequency': 'Frequency',
    'inv.counts.location': 'Location',
    'inv.counts.frequency.semanal': 'Weekly',
    'inv.counts.frequency.quincenal': 'Biweekly',
    'inv.counts.frequency.mensual': 'Monthly',
    'inv.counts.blind': 'Blind count (hides expected stock)',
    'inv.counts.blindYes': 'Blind',
    'inv.counts.blindNo': 'Not blind',
    'inv.counts.status.programado': 'Scheduled',
    'inv.counts.status.en_curso': 'In progress',
    'inv.counts.status.finalizado': 'Finished',
    'inv.counts.status.ajustado': 'Adjusted',
    'inv.counts.start': 'Start count',
    'inv.counts.continue': 'Continue count',
    'inv.counts.scan': 'Scan',
    'inv.counts.scanSoon': 'Coming soon',
    'inv.counts.scanRequired': 'Scan the QR of each unit',
    'inv.counts.scannedCount': '{count} scanned',
    'inv.counts.undoScan': 'Undo last scan',
    'inv.counts.serialNotInCount': 'That serial does not belong to a product of this count',
    'inv.counts.serialAlreadyCounted': 'That serial has already been counted',
    'inv.counts.productNotInCount': 'That product is not in this count',
    'inv.counts.expected': 'Expected',
    'inv.counts.counted': 'Counted',
    'inv.counts.savePartial': 'Save progress',
    'inv.counts.finish': 'Finish count',
    'inv.counts.backToList': 'Back to list',
    'inv.counts.countingTitle': 'Count in progress',
    'inv.counts.differencesTitle': 'Differences detected',
    'inv.counts.noDifferences': 'No differences: the count matches the stock.',
    'inv.counts.applyAdjustment': 'Apply adjustment',
    'inv.counts.adjustmentReason': 'Adjustment reason (required)',
    'inv.counts.adjustmentReasonPlaceholder': 'E.g.: shrinkage, theft, recording error...',
    'inv.counts.adjustmentReasonLabel': 'Adjustment reason',
    'inv.counts.validation.locationRequired': 'Select a location',
    'inv.counts.validation.reasonRequired': 'Adjustment reason is required',
    'inv.counts.scheduledAt': 'Scheduled',
    'inv.counts.startedAt': 'Started',
    'inv.counts.finishedAt': 'Finished',
    'inv.counts.createdBy': 'Created by',
    'inv.counts.approvedBy': 'Approved by',

    'inv.serials.help': 'Individual units of rentable products with a unique serial number. Statuses that block rental prevent renting the unit.',
    'inv.serials.new': 'New serial',
    'inv.serials.empty': 'No serials recorded',
    'inv.serials.noRentable': 'No active rentable products. First create a rentable product in Catalogs.',
    'inv.serials.product': 'Product',
    'inv.serials.selectProduct': 'Select a rentable product',
    'inv.serials.serialNumber': 'Serial number',
    'inv.serials.serialNumberPlaceholder': 'E.g.: T001',
    'inv.serials.size': 'Size (optional)',
    'inv.serials.sizePlaceholder': 'E.g.: M, 12L, XL...',
    'inv.serials.photo': 'Photo (optional)',
    'inv.serials.uploadPhoto': 'Upload photo',
    'inv.serials.status': 'Initial status',
    'inv.serials.notes': 'Notes (optional)',
    'inv.serials.notesPlaceholder': 'E.g.: includes regulator and mouthpiece...',
    'inv.serials.validation.serialRequired': 'Serial number is required',
    'inv.serials.validation.serialDuplicate': 'A serial with that number already exists',
    'inv.serials.blocksRental': 'Blocked for rental',
    'inv.serials.createdAt': 'Created',
    'inv.serials.updatedAt': 'Updated',
    'inv.serials.changeStatus': 'Change status',
    'inv.serials.edit': 'Edit size and notes',
    'inv.serials.viewQr': 'View serial QR',
    'inv.serials.history': 'History',
    'inv.serials.historyEmpty': 'This serial has not been rented yet.',
    'inv.serials.outAt': 'Out',
    'inv.serials.backAt': 'Back',
    'inv.serials.inRepair': 'In repair',
    'inv.serials.retire': 'Decommission',
    'inv.serials.retireTitle': 'Decommission serial',
    'inv.serials.retireDesc': 'Record the evidence and the reason. This is permanent: the serial cannot be reactivated.',
    'inv.serials.retirePhoto': 'Evidence photo (required)',
    'inv.serials.retireReason': 'Reason (required)',
    'inv.serials.retireReasonPlaceholder': 'E.g.: irreparable damage, loss, obsolescence...',
    'inv.serials.retireConfirmDesc': 'The serial will permanently move to "Decommissioned" status.',
    'inv.serials.retireDone': 'Serial decommissioned',
    'inv.serials.retired': 'Decommissioned',
    'inv.serials.retirePhotoRequired': 'Evidence photo is required',
    'inv.serials.retireReasonRequired': 'Reason is required',

    'inv.qr.print': 'Print',
    'inv.qr.product': 'Product',
    'inv.qr.location': 'Location',
    'inv.qr.serial': 'Serial',
    'inv.qr.productTitle': 'Product QR',
    'inv.qr.locationTitle': 'Location QR',
    'inv.qr.scanProduct': 'Product QR',
    'inv.qr.scanLocation': 'Location QR',

    'inv.scanner.title': 'Scan QR code',
    'inv.scanner.hint': 'Point the camera at the QR code of a product, location or serial.',
    'inv.scanner.unrecognized': 'Unrecognized QR code',
    'inv.scanner.error': 'Could not start the camera',
    'inv.scanner.manual': 'Enter code manually',
    'inv.scanner.manualPlaceholder': 'Paste the QR URL or the serial id',
    'inv.scanner.manualSubmit': 'Look up',
    'inv.scanner.switchCamera': 'Switch camera',
    'inv.catalogs.seedsAlreadyLoaded': 'Already loaded',

    'inv.home.stock': 'Stock',
    'inv.home.stockDesc': 'Availability by product and location',
    'inv.home.movements': 'Movements',
    'inv.home.movementsDesc': 'Historical inventory ledger',
    'inv.home.transfers': 'Transfers',
    'inv.home.transfersDesc': 'Shipments and receipts between locations',
    'inv.home.counts': 'Counts',
    'inv.home.countsDesc': 'Cyclic counts per location',
    'inv.home.serials': 'Serials',
    'inv.home.serialsDesc': 'Individual rentable units',
    'inv.home.catalogs': 'Catalogs',
    'inv.home.catalogsDesc': 'Movement types and statuses',
    'inv.home.adjustments': 'Adjustments',
    'inv.home.adjustmentsDesc': 'Ledger adjustments with reason',
    'inv.home.scan': 'Scan QR',
    'inv.home.scanDesc': 'Product sheet and direct actions',
    'inv.adjustments.title': 'Adjustments',
    'inv.adjustments.help': 'Adjustment-type movements from the ledger, with reason, date and who registered them. Read only.',
    'inv.adjustments.empty': 'No adjustments recorded',
    'inv.product.title': 'Product sheet',
    'inv.product.buy': 'Buy',
    'inv.product.transfer': 'Transfer',
    'inv.product.consume': 'Consume',
    'inv.product.rent': 'Rent',
    'inv.product.repair': 'Send to repair',
    'inv.product.history': 'View history',
    'inv.product.stockByLocation': 'Stock by location',
    'inv.product.unitsByStatus': 'Units by status',
    'inv.product.noStock': 'No stock recorded',
    'inv.product.notFound': 'Product not found',
    'inv.product.scanToSelect': 'Scan to search',
    'inv.serialized.stockHint': 'Controlled by serials',
    'inv.serialized.blockTitle': 'Serialized product',
    'inv.serialized.blockHelp': 'This product is controlled by individual units (serials): use Serials to register it, and rental/dispatch to move it.',
    'inv.serialized.buyHelp': 'Purchases of serialized products are received by registering each unit with its serial.',
    'inv.serialized.goSerials': 'Register serials',
    'inv.receive.scanConfirmHelp': 'Product with QR: scan the QR of the product that arrived to confirm receipt.',
    'inv.receive.scanConfirm': 'Scan QR to confirm',
    'inv.receive.scanConfirmed': 'QR confirmed',
    'inv.receive.noQrHelp': 'This product has no QR: attach a photo of what arrived and the signature of who receives it.',
    'inv.receive.photo': 'Photo of what arrived',
    'inv.receive.signature': 'Signature of who receives',
    'inv.receive.signatureHint': 'Draw the signature with your finger or mouse',
    'inv.receive.signatureClear': 'Clear',
    'inv.repair.title': 'Send to repair',
    'inv.repair.help': 'Select the available units going to repair and state the reason.',
    'inv.repair.selectUnits': 'Units to repair',
    'inv.repair.reason': 'Reason',
    'inv.repair.reasonPlaceholder': 'E.g.: leaking valve',
    'inv.repair.noAvailable': 'There are no available units of this product.',
    'inv.repair.noSerialsHelp': 'This product has no serials: register an adjustment-type stock out with a repair reason.',
    'inv.repair.done': 'Units sent to repair',
  },
});

// ═══════════════════════════════════════════════════════════════════
// PARSERS DEFENSIVOS (docs Firestore → tipos)
// ═══════════════════════════════════════════════════════════════════

const toStr = (v: unknown): string => (typeof v === 'string' ? v : '');
const toNum = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const toNumOrNull = (v: unknown): number | null | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : v === null ? null : undefined;
const toBool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback);

function docToStock(id: string, data: Record<string, unknown>): InventoryStock {
  return {
    id,
    tenantId: toStr(data.tenantId),
    productId: toStr(data.productId),
    locationId: toStr(data.locationId),
    quantity: toNum(data.quantity),
    minStock: toNumOrNull(data.minStock),
    maxStock: toNumOrNull(data.maxStock),
    updatedAt: toStr(data.updatedAt),
    updatedBy: toStr(data.updatedBy),
  };
}

function docToMovement(id: string, data: Record<string, unknown>): InventoryMovement {
  return {
    id,
    tenantId: toStr(data.tenantId),
    productId: toStr(data.productId),
    quantity: toNum(data.quantity),
    fromLocationId: data.fromLocationId ? toStr(data.fromLocationId) : null,
    toLocationId: data.toLocationId ? toStr(data.toLocationId) : null,
    movementTypeId: toStr(data.movementTypeId),
    reason: data.reason ? toStr(data.reason) : null,
    referenceType: (data.referenceType as InventoryMovement['referenceType']) ?? null,
    referenceId: data.referenceId ? toStr(data.referenceId) : null,
    createdAt: toStr(data.createdAt),
    createdBy: toStr(data.createdBy),
    createdByName: toStr(data.createdByName),
  };
}

function docToMovementType(id: string, data: Record<string, unknown>): MovementType {
  return {
    id,
    tenantId: toStr(data.tenantId),
    name: toStr(data.name),
    nameEn: data.nameEn ? toStr(data.nameEn) : undefined,
    isOutput: toBool(data.isOutput),
    isActive: toBool(data.isActive, true),
  };
}

function docToSupplier(id: string, data: Record<string, unknown>): Supplier {
  return {
    id,
    tenantId: toStr(data.tenantId),
    identification: toStr(data.identification),
    name: toStr(data.name),
    contactName: data.contactName ? toStr(data.contactName) : undefined,
    email: data.email ? toStr(data.email) : undefined,
    phone: data.phone ? toStr(data.phone) : undefined,
    paymentTerms: data.paymentTerms ? toStr(data.paymentTerms) : undefined,
    isActive: toBool(data.isActive, true),
    createdAt: toStr(data.createdAt),
    createdBy: toStr(data.createdBy),
  };
}

function docToSerialStatus(id: string, data: Record<string, unknown>): SerialStatus {  return {
    id,
    tenantId: toStr(data.tenantId),
    name: toStr(data.name),
    nameEn: data.nameEn ? toStr(data.nameEn) : undefined,
    blocksRental: toBool(data.blocksRental),
    isActive: toBool(data.isActive, true),
  };
}

function docToRentalUnit(id: string, data: Record<string, unknown>): RentalUnit {
  return {
    id,
    tenantId: toStr(data.tenantId),
    productId: toStr(data.productId),
    serialNumber: toStr(data.serialNumber),
    photoUrl: data.photoUrl ? toStr(data.photoUrl) : null,
    size: data.size ? toStr(data.size) : null,
    statusId: toStr(data.statusId),
    notes: data.notes ? toStr(data.notes) : null,
    createdAt: toStr(data.createdAt),
    createdBy: toStr(data.createdBy),
    updatedAt: toStr(data.updatedAt),
    updatedBy: toStr(data.updatedBy),
  };
}

function docToRentalOrder(id: string, data: Record<string, unknown>): RentalOrder {
  const items: RentalOrder['items'] = [];
  if (Array.isArray(data.items)) {
    for (const raw of data.items as Array<Record<string, unknown>>) {
      if (!raw || typeof raw !== 'object') continue;
      items.push({
        productId: toStr(raw.productId),
        quantity: toNum(raw.quantity),
        assignedUnitIds: Array.isArray(raw.assignedUnitIds)
          ? (raw.assignedUnitIds as unknown[]).filter((x): x is string => typeof x === 'string')
          : undefined,
        tallaRef: raw.tallaRef ? toStr(raw.tallaRef) : null,
      });
    }
  }
  return {
    id,
    tenantId: toStr(data.tenantId),
    orderNumber: toNumOrNull(data.orderNumber) ?? undefined,
    clientType: data.clientType === 'interno' ? 'interno' : 'externo',
    clientId: toStr(data.clientId),
    clientName: toStr(data.clientName),
    items,
    deliveryDate: toStr(data.deliveryDate),
    locationId: data.locationId ? toStr(data.locationId) : null,
    statusId: toStr(data.statusId),
    paymentStatus: (data.paymentStatus as RentalOrder['paymentStatus']) ?? 'pendiente',
    paymentProofUrl: data.paymentProofUrl ? toStr(data.paymentProofUrl) : null,
    paymentProofRef: data.paymentProofRef ? toStr(data.paymentProofRef) : null,
    depositAmount: toNumOrNull(data.depositAmount) ?? null,
    depositStatus: (data.depositStatus as RentalOrder['depositStatus']) ?? null,
    dispatchedBy: data.dispatchedBy ? toStr(data.dispatchedBy) : null,
    dispatchedAt: data.dispatchedAt ? toStr(data.dispatchedAt) : null,
    deliveredAt: data.deliveredAt ? toStr(data.deliveredAt) : null,
    returnedAt: data.returnedAt ? toStr(data.returnedAt) : null,
    verifiedBy: data.verifiedBy ? toStr(data.verifiedBy) : null,
    verifiedAt: data.verifiedAt ? toStr(data.verifiedAt) : null,
    storedAt: data.storedAt ? toStr(data.storedAt) : null,
    createdAt: toStr(data.createdAt),
    createdBy: toStr(data.createdBy),
    createdByName: toStr(data.createdByName),
    updatedAt: toStr(data.updatedAt),
  };
}

function docToRentalOrderStatus(id: string, data: Record<string, unknown>): RentalOrderStatus {
  return {
    id,
    tenantId: toStr(data.tenantId),
    name: toStr(data.name),
    nameEn: data.nameEn ? toStr(data.nameEn) : undefined,
    order: toNum(data.order),
    isFinalOk: typeof data.isFinalOk === 'boolean' ? (data.isFinalOk as boolean) : undefined,
    isFinalRepair: typeof data.isFinalRepair === 'boolean' ? (data.isFinalRepair as boolean) : undefined,
    isActive: toBool(data.isActive, true),
  };
}

function docToProduct(id: string, data: Record<string, unknown>): Product {
  const base: Product = {
    id,
    tenantId: toStr(data.tenantId),
    name: toStr(data.name),
    nameEn: data.nameEn ? toStr(data.nameEn) : undefined,
    categoryId: toStr(data.categoryId),
    unitId: toStr(data.unitId),
    sku: data.sku ? toStr(data.sku) : undefined,
    isRentable: toBool(data.isRentable),
    isConsumable: toBool(data.isConsumable),
    photoUrl: data.photoUrl ? toStr(data.photoUrl) : undefined,
    isActive: toBool(data.isActive, true),
    createdAt: toStr(data.createdAt),
    createdBy: toStr(data.createdBy),
  };
  // hasQr lo agrega el catálogo de productos (lado Develops/Catálogos):
  // se preserva de forma defensiva; ausente = con QR (comportamiento actual)
  if (data.hasQr !== undefined) {
    return { ...base, hasQr: toBool(data.hasQr, true) } as Product;
  }
  return base;
}

// Regla del modelo final de seriales: un producto "con QR" es el default;
// solo hasQr === false exige foto + firma al recibir transferencias
const productHasQr = (p: Product | undefined | null): boolean =>
  ((p as unknown as { hasQr?: unknown } | null)?.hasQr ?? true) !== false;

function docToLocation(id: string, data: Record<string, unknown>): Location {
  return {
    id,
    tenantId: toStr(data.tenantId),
    name: toStr(data.name),
    typeId: toStr(data.typeId),
    groupId: toStr(data.groupId),
    relatedModules: Array.isArray(data.relatedModules)
      ? (data.relatedModules as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
    responsibleUserId: data.responsibleUserId ? toStr(data.responsibleUserId) : undefined,
    responsibleDepartmentId: data.responsibleDepartmentId ? toStr(data.responsibleDepartmentId) : undefined,
    isActive: toBool(data.isActive, true),
    createdAt: toStr(data.createdAt),
    createdBy: toStr(data.createdBy),
  };
}

function docToUnit(id: string, data: Record<string, unknown>): UnitOfMeasure {
  return {
    id,
    tenantId: toStr(data.tenantId),
    name: toStr(data.name),
    abbreviation: data.abbreviation ? toStr(data.abbreviation) : undefined,
    isActive: toBool(data.isActive, true),
    createdAt: toStr(data.createdAt),
    createdBy: toStr(data.createdBy),
  };
}

function docToProductCategory(id: string, data: Record<string, unknown>): Omit<ProductCategory, 'id'> {
  return {
    tenantId: toStr(data.tenantId),
    isActive: data.isActive === undefined ? true : toBool(data.isActive),
    createdAt: toStr(data.createdAt),
    createdBy: toStr(data.createdBy),
    updatedAt: data.updatedAt ? toStr(data.updatedAt) : undefined,
    updatedBy: data.updatedBy ? toStr(data.updatedBy) : undefined,
    name: toStr(data.name),
    nameEn: data.nameEn ? toStr(data.nameEn) : undefined,
  };
}

function docToTransfer(id: string, data: Record<string, unknown>): InventoryTransfer {
  return {
    id,
    tenantId: toStr(data.tenantId),
    productId: toStr(data.productId),
    quantity: toNum(data.quantity),
    fromLocationId: toStr(data.fromLocationId),
    toLocationId: toStr(data.toLocationId),
    responsibleUserId: data.responsibleUserId ? toStr(data.responsibleUserId) : null,
    responsibleName: data.responsibleName ? toStr(data.responsibleName) : null,
    status: (data.status as InventoryTransfer['status']) ?? 'pendiente',
    receivedBy: data.receivedBy ? toStr(data.receivedBy) : null,
    receivedAt: data.receivedAt ? toStr(data.receivedAt) : null,
    receivedUnitIds: Array.isArray(data.receivedUnitIds)
      ? data.receivedUnitIds.map(u => toStr(u)).filter(Boolean)
      : null,
    shippedBy: data.shippedBy ? toStr(data.shippedBy) : null,
    shippedByName: data.shippedByName ? toStr(data.shippedByName) : null,
    shippedAt: data.shippedAt ? toStr(data.shippedAt) : null,
    createdAt: toStr(data.createdAt),
    createdBy: toStr(data.createdBy),
    createdByName: toStr(data.createdByName),
  };
}

// Borrador de pedido automático (punto 16): sugerencia al bajar del mínimo.
// NO toca stock ni genera movimiento; la orden de compra formal llega en Fase 5.
export interface PurchaseRequisition {
  id?: string;
  tenantId: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  suggestedQty: number;
  supplierId: string | null;
  supplierName: string | null;
  locationId: string;
  locationName: string;
  status: 'draft' | 'ordered' | 'cancelled';
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  notes?: string;
}

function docToPurchaseRequisition(id: string, data: Record<string, unknown>): PurchaseRequisition {
  return {
    id,
    tenantId: toStr(data.tenantId),
    productId: toStr(data.productId),
    productName: toStr(data.productName),
    quantity: toNum(data.quantity),
    unit: toStr(data.unit),
    suggestedQty: toNum(data.suggestedQty),
    supplierId: data.supplierId ? toStr(data.supplierId) : null,
    supplierName: data.supplierName ? toStr(data.supplierName) : null,
    locationId: toStr(data.locationId),
    locationName: toStr(data.locationName),
    status: (data.status as PurchaseRequisition['status']) ?? 'draft',
    createdBy: toStr(data.createdBy),
    createdByName: data.createdByName ? toStr(data.createdByName) : undefined,
    createdAt: toStr(data.createdAt),
    notes: data.notes ? toStr(data.notes) : undefined,
  };
}

function docToCountSession(id: string, data: Record<string, unknown>): CountSession {
  const counts: Record<string, number> = {};
  if (data.counts && typeof data.counts === 'object') {
    for (const [k, v] of Object.entries(data.counts as Record<string, unknown>)) {
      counts[k] = toNum(v);
    }
  }
  return {
    id,
    tenantId: toStr(data.tenantId),
    locationId: toStr(data.locationId),
    status: (data.status as CountSession['status']) ?? 'programado',
    blind: toBool(data.blind),
    frequency: (data.frequency as CountFrequency) ?? 'mensual',
    counts: Object.keys(counts).length ? counts : undefined,
    scannedSerials: (() => {
      if (!data.scannedSerials || typeof data.scannedSerials !== 'object') return undefined;
      const out: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(data.scannedSerials as Record<string, unknown>)) {
        if (Array.isArray(v)) out[k] = v.map(u => toStr(u)).filter(Boolean);
      }
      return Object.keys(out).length ? out : undefined;
    })(),
    differences: Array.isArray(data.differences)
      ? (data.differences as Array<Record<string, unknown>>).map(d => ({
          productId: toStr(d.productId),
          expected: toNum(d.expected),
          counted: toNum(d.counted),
          delta: toNum(d.delta),
        }))
      : undefined,
    approvedBy: data.approvedBy ? toStr(data.approvedBy) : null,
    approvedAt: data.approvedAt ? toStr(data.approvedAt) : null,
    adjustmentReason: data.adjustmentReason ? toStr(data.adjustmentReason) : null,
    scheduledAt: toStr(data.scheduledAt),
    startedAt: data.startedAt ? toStr(data.startedAt) : null,
    finishedAt: data.finishedAt ? toStr(data.finishedAt) : null,
    createdBy: toStr(data.createdBy),
    createdByName: toStr(data.createdByName),
  };
}

// Id determinista del doc de stock (producto + ubicación)
const stockDocId = (productId: string, locationId: string) => `${productId}__${locationId}`;

// ═══════════════════════════════════════════════════════════════════
// SEMILLAS IDEMPOTENTES (ids deterministas, nunca pisan renombres)
// ═══════════════════════════════════════════════════════════════════

const SEED_MOVEMENT_TYPES: Array<{ id: string; name: string; nameEn: string; isOutput: boolean }> = [
  { id: 'compra', name: 'Compra', nameEn: 'Purchase', isOutput: false },
  { id: 'consumo', name: 'Consumo', nameEn: 'Consumption', isOutput: true },
  { id: 'ajuste', name: 'Ajuste', nameEn: 'Adjustment', isOutput: true },
  { id: 'renta', name: 'Renta', nameEn: 'Rental', isOutput: true },
  { id: 'devolucion', name: 'Devolución', nameEn: 'Return', isOutput: false },
  { id: 'dano', name: 'Daño', nameEn: 'Damage', isOutput: true },
  { id: 'transferencia', name: 'Transferencia', nameEn: 'Transfer', isOutput: true },
];

const SEED_SERIAL_STATUSES: Array<{ id: string; name: string; nameEn: string; blocksRental: boolean }> = [
  { id: 'disponible', name: 'Disponible', nameEn: 'Available', blocksRental: false },
  { id: 'rentado', name: 'Rentado', nameEn: 'Rented', blocksRental: true },
  { id: 'en_reparacion', name: 'En reparación', nameEn: 'Under repair', blocksRental: true },
  { id: 'en_mantenimiento', name: 'En mantenimiento', nameEn: 'Under maintenance', blocksRental: true },
  { id: 'dado_de_baja', name: 'Dado de baja', nameEn: 'Decommissioned', blocksRental: true },
];

// ═══════════════════════════════════════════════════════════════════
// TIPOS INTERNOS
// ═══════════════════════════════════════════════════════════════════

type StockView = 'product' | 'location';

// Vista interna del módulo (puntos 8 y 12): las tarjetas-módulo son LA
// navegación: cada sección (y cada acción de creación) ocupa una PANTALLA
// completa con botón Volver, en lugar de sub-pestañas o popups.
type InvView =
  | 'main'
  | 'stock'
  | 'movements'
  | 'transfers'
  | 'counts'
  | 'serials'
  | 'catalogs'
  | 'adjustments'
  | 'product'
  | 'movement'
  | 'transfer-new'
  | 'count-new'
  | 'serial-new'
  | 'receive';

type TransferStatusFilter = 'all' | InventoryTransfer['status'];

interface MovementFormState {
  productId: string;
  movementTypeId: string;
  quantity: string;
  fromLocationId: string;
  toLocationId: string;
  reason: string;
  supplierId: string;
}

const EMPTY_MOVEMENT_FORM: MovementFormState = {
  productId: '',
  movementTypeId: '',
  quantity: '',
  fromLocationId: '',
  toLocationId: '',
  reason: '',
  supplierId: '',
};

interface TransferFormState {
  productId: string;
  quantity: string;
  fromLocationId: string;
  toLocationId: string;
  responsibleUserId: string;
}

const EMPTY_TRANSFER_FORM: TransferFormState = {
  productId: '',
  quantity: '',
  fromLocationId: '',
  toLocationId: '',
  responsibleUserId: '',
};

interface CountFormState {
  locationId: string;
  frequency: CountFrequency;
  blind: boolean;
}

const EMPTY_COUNT_FORM: CountFormState = {
  locationId: '',
  frequency: 'mensual',
  blind: false,
};

interface SerialFormState {
  productId: string;
  serialNumber: string;
  size: string;
  statusId: string;
  notes: string;
}

const EMPTY_SERIAL_FORM: SerialFormState = {
  productId: '',
  serialNumber: '',
  size: '',
  statusId: '',
  notes: '',
};

// Badges de estado (mismo lenguaje visual que el resto del módulo)
const TRANSFER_STATUS_BADGE: Record<InventoryTransfer['status'], string> = {
  pendiente: 'bg-[#F5F5F7] text-[#86868B] border border-[#E5E5E7]',
  en_transito: 'bg-blue-50 text-blue-700 border border-blue-200',
  recibido: 'bg-green-50 text-green-700 border border-green-200',
  cancelado: 'bg-red-50 text-red-700 border border-red-200',
};

// Nivel de rol: definición de mínimos/máximos, ajustes por conteo y
// recepción de transferencias (Supervisor o superior, misma jerarquía que
// usa WarehouseModule: DG/Director/RRHH/GerOp/GerDept/Supervisor)
const SUPERVISOR_PLUS_ROLES: Role[] = [
  Role.DIRECTOR_GENERAL,
  Role.DIRECTOR,
  Role.RRHH,
  Role.GERENTE_OPERACIONES,
  Role.GERENTE_DEPARTAMENTO,
  Role.SUPERVISOR,
];

const COUNT_STATUS_BADGE: Record<CountSession['status'], string> = {
  programado: 'bg-[#F5F5F7] text-[#86868B] border border-[#E5E5E7]',
  en_curso: 'bg-blue-50 text-blue-700 border border-blue-200',
  finalizado: 'bg-green-50 text-green-700 border border-green-200',
  ajustado: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

// Selector de producto con buscador (formularios de movimiento y transferencia).
// Escribe para filtrar; clic para elegir. El seleccionado se muestra como valor.
function ProductSearchSelect({
  products,
  value,
  onChange,
  selectPlaceholder,
  searchPlaceholder,
}: {
  products: Array<{ id: string; name: string }>;
  value: string;
  onChange: (id: string) => void;
  selectPlaceholder: string;
  searchPlaceholder: string;
}) {
  const [query, setQuery] = useState('');
  const selected = products.find(p => p.id === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? products.filter(p => p.name.toLowerCase().includes(q)) : products;
  return (
    <div className="relative">
      <input
        value={query || (selected ? selected.name : '')}
        onChange={e => setQuery(e.target.value)}
        placeholder={selectPlaceholder}
        className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-corporate/20"
      />
      {q && (
        <div className="absolute z-20 left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg border border-[#E5E5E7] bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[#86868B]">{searchPlaceholder}</div>
          ) : filtered.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange(p.id); setQuery(''); }}
              className="w-full text-left px-3 py-2 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7]"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export function InventarioModule() {
  const { user: currentUser } = useAuth();
  const { isFeatureEnabled } = useAppConfig();
  const { logAction } = useAudit();

  // Estado compartido (lo reusan las sub-pestañas y los siguientes agentes)
  const [stocks, setStocks] = useState<InventoryStock[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movementTypes, setMovementTypes] = useState<MovementType[]>([]);
  const [serialStatuses, setSerialStatuses] = useState<SerialStatus[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Estado de carga / error
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Navegación interna (punto 12): las tarjetas-módulo reemplazan a las
  // sub-pestañas; cada sección es una pantalla con botón Volver
  const [invView, setInvView] = useState<InvView>('main');

  // Tarjetas expandibles
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Vista de Stock
  const [stockView, setStockView] = useState<StockView>('product');

  // Pantalla interna de movimiento (compartida: la reusan Stock, Movimientos
  // y las tarjetas grandes de acción; ver invView)
  const [movementForm, setMovementForm] = useState<MovementFormState>(EMPTY_MOVEMENT_FORM);
  const [movementCategoryId, setMovementCategoryId] = useState('');
  const [savingMovement, setSavingMovement] = useState(false);

  // Edición inline de mín/máx por fila de stock
  const [editingMinMaxId, setEditingMinMaxId] = useState<string | null>(null);
  const [minMaxDraft, setMinMaxDraft] = useState<{ min: string; max: string }>({ min: '', max: '' });

  // CRUD de catálogo movementTypes
  const [mtNewName, setMtNewName] = useState('');
  const [mtNewNameEn, setMtNewNameEn] = useState('');
  const [mtNewIsOutput, setMtNewIsOutput] = useState(false);
  const [editingMtId, setEditingMtId] = useState<string | null>(null);
  const [editingMtName, setEditingMtName] = useState('');
  const [editingMtNameEn, setEditingMtNameEn] = useState('');
  const [savingCatalogs, setSavingCatalogs] = useState(false);

  // CRUD de catálogo serialStatuses
  const [ssNewName, setSsNewName] = useState('');
  const [ssNewNameEn, setSsNewNameEn] = useState('');
  const [ssNewBlocksRental, setSsNewBlocksRental] = useState(false);
  const [editingSsId, setEditingSsId] = useState<string | null>(null);
  const [editingSsName, setEditingSsName] = useState('');
  const [editingSsNameEn, setEditingSsNameEn] = useState('');

  // Filtros del kardex (Movimientos)
  const [filterProductId, setFilterProductId] = useState('');
  const [filterLocationId, setFilterLocationId] = useState('');
  const [filterTypeId, setFilterTypeId] = useState('');

  // Transferencias entre ubicaciones (FASE 1A-transfers)
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [transferForm, setTransferForm] = useState<TransferFormState>(EMPTY_TRANSFER_FORM);
  const [savingTransfer, setSavingTransfer] = useState(false);
  const [receiveTransferId, setReceiveTransferId] = useState<string | null>(null);
  const [receivedByName, setReceivedByName] = useState('');
  const [receiveSerialIds, setReceiveSerialIds] = useState<string[]>([]);
  // Verificación obligatoria al recibir (punto 11): consumibles con QR se
  // confirman escaneando el QR del producto; productos SIN QR (hasQr === false)
  // exigen foto + firma (dataURL) + nombre de quien recibe
  const [receiveScanConfirmed, setReceiveScanConfirmed] = useState(false);
  const [receivePhoto, setReceivePhoto] = useState<string | null>(null);
  const [receiveSignature, setReceiveSignature] = useState<string | null>(null);
  const [cancelTransferId, setCancelTransferId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Ficha de producto (punto 13): el escáner abre la ficha con acciones
  // directas (comprar/transferir/consumir/rentar/reparación/historial)
  const [productDetailId, setProductDetailId] = useState<string | null>(null);

  // Formulario de transferencia (punto 14): primero origen/destino, luego
  // categoría y producto (buscador + escaneo opcional)
  const [transferCategoryId, setTransferCategoryId] = useState('');

  // Envío a reparación desde la ficha (punto 13): selección de unidades
  // disponibles + motivo (diálogo)
  const [repairProductId, setRepairProductId] = useState<string | null>(null);
  const [repairUnitIds, setRepairUnitIds] = useState<string[]>([]);
  const [repairReason, setRepairReason] = useState('');

  // Conteos cíclicos (FASE 1A-counts)
  const [countSessions, setCountSessions] = useState<CountSession[]>([]);
  const [countForm, setCountForm] = useState<CountFormState>(EMPTY_COUNT_FORM);
  const [savingCount, setSavingCount] = useState(false);
  const [countingId, setCountingId] = useState<string | null>(null);
  const [countsDraft, setCountsDraft] = useState<Record<string, string>>({});
  const [scannedSerials, setScannedSerials] = useState<Record<string, string[]>>({});
  const [countHighlightId, setCountHighlightId] = useState<string | null>(null);
  const [adjustmentSessionId, setAdjustmentSessionId] = useState<string | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Seriales / unidades rentables (FASE 1B-serials)
  const [rentalUnits, setRentalUnits] = useState<RentalUnit[]>([]);
  // Órdenes de renta y sus estados: alimentan el historial de seriales (WH-D2)
  const [rentalOrders, setRentalOrders] = useState<RentalOrder[]>([]);
  const [rentalOrderStatuses, setRentalOrderStatuses] = useState<RentalOrderStatus[]>([]);
  const [serialForm, setSerialForm] = useState<SerialFormState>(EMPTY_SERIAL_FORM);
  const [serialPhotoFile, setSerialPhotoFile] = useState<File | null>(null);
  const [savingSerial, setSavingSerial] = useState(false);
  const [editingSerialId, setEditingSerialId] = useState<string | null>(null);
  const [serialEditDraft, setSerialEditDraft] = useState<{ size: string; notes: string }>({ size: '', notes: '' });

  // Filtro por estado de la pestaña Transferencias (punto 4): por defecto
  // se listan TODAS; los chips filtran sin que nada desaparezca del historial
  const [transferFilter, setTransferFilter] = useState<TransferStatusFilter>('all');

  // Borradores de pedido automático (punto 16, colección purchaseRequisitions)
  const [purchaseReqs, setPurchaseReqs] = useState<PurchaseRequisition[]>([]);
  const [savingPurchaseReq, setSavingPurchaseReq] = useState(false);

  // Baja permanente de un serial (foto + motivo obligatorios, aprobadores ampliados)
  const [retiringUnit, setRetiringUnit] = useState<RentalUnit | null>(null);
  const [retirePhotoFile, setRetirePhotoFile] = useState<File | null>(null);
  const [retireReason, setRetireReason] = useState('');
  const [savingRetire, setSavingRetire] = useState(false);

  // QR y escáner (FASE 1B-serials)
  const [qrDialog, setQrDialog] = useState<{ title: string; subtitle: string; qrText: string } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  // Contexto del escaneo: navegación general, conteo cíclico o recepción
  // de transferencia serializada (cambia cómo se procesa el resultado)
  const [scanContext, setScanContext] = useState<'navigate' | 'count' | 'receive'>('navigate');

  // Deep links (?product= / ?location= / ?serial=): solo se procesan una vez
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const deepLinkHandled = useRef(false);

  // Escaneo opcional dentro de selectores de producto (puntos 13/14): cuando
  // hay un callback pendiente, el resultado del escáner selecciona el producto
  // en vez de abrir la ficha
  const scanPickRef = useRef<((productId: string) => void) | null>(null);

  const { users } = useFirestoreUsers();
  const { uploadImage, uploading: uploadingSerialPhoto } = useStorageUpload();

  const tenantId = getCurrentTenantId();
  const enabled = isFeatureEnabled('enableInventario');
  const canWrite = currentUser?.role === Role.DIRECTOR_GENERAL || currentUser?.role === Role.RRHH;
  // Supervisor o superior (jerarquía de niveles 1-6): define mínimos/máximos,
  // aprueba ajustes por conteo y puede recibir transferencias ajenas
  const canSupervise = !!currentUser?.role && SUPERVISOR_PLUS_ROLES.includes(currentUser.role);
  // Baja permanente: además de canWrite, la aprueban gerentes de departamento y supervisores
  const canRetire =
    canWrite ||
    currentUser?.role === Role.GERENTE_DEPARTAMENTO ||
    currentUser?.role === Role.SUPERVISOR;

  const activeProducts = useMemo(() => products.filter(p => p.isActive), [products]);
  const activeCategories = useMemo(() => productCategories.filter(c => c.isActive), [productCategories]);
  // Formulario de movimiento: primero categoría, luego productos de esa
  // categoría en orden alfabético (los productos ya vienen ordenados por nombre)
  const movementFormProducts = useMemo(() => {
    if (!movementCategoryId) return [];
    if (movementCategoryId === '__none__') {
      return activeProducts.filter(p => !p.categoryId);
    }
    return activeProducts.filter(p => p.categoryId === movementCategoryId);
  }, [activeProducts, movementCategoryId]);
  const activeLocations = useMemo(() => locations.filter(l => l.isActive), [locations]);
  const activeMovementTypes = useMemo(() => movementTypes.filter(m => m.isActive), [movementTypes]);
  const activeSuppliers = useMemo(() => suppliers.filter(s => s.isActive), [suppliers]);
  const activeUsers = useMemo(() => users.filter(u => u.isActive), [users]);
  const sortedMovementTypes = useMemo(
    () => [...movementTypes].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name)),
    [movementTypes]
  );
  const sortedSerialStatuses = useMemo(
    () => [...serialStatuses].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name)),
    [serialStatuses]
  );
  const activeSerialStatuses = useMemo(() => serialStatuses.filter(s => s.isActive), [serialStatuses]);
  const rentableProducts = useMemo(() => activeProducts.filter(p => p.isRentable), [activeProducts]);

  // Modelo final de seriales (punto 4): producto "serializado" = rentable con
  // unidades registradas; su stock se muestra por estado, nunca como número plano
  const isSerializedProduct = (productId: string) =>
    !!products.find(p => p.id === productId)?.isRentable &&
    rentalUnits.some(u => u.productId === productId);

  // Conteo de unidades por estado de un producto serializado
  // ({ statusId: cantidad }), para mostrar "12 disponibles · 3 rentados..."
  const unitCountsByStatus = (productId: string): Array<{ status: SerialStatus; count: number }> => {
    const counts = new Map<string, number>();
    for (const u of rentalUnits) {
      if (u.productId !== productId) continue;
      counts.set(u.statusId, (counts.get(u.statusId) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([statusId, count]) => ({ status: serialStatuses.find(s => s.id === statusId), count }))
      .filter((x): x is { status: SerialStatus; count: number } => !!x.status)
      .sort((a, b) => a.status.name.localeCompare(b.status.name));
  };

  // Chips "N estado" del stock serializado (reutilizado en Stock y ficha)
  const renderUnitStatusChips = (productId: string) => (
    <div className="flex flex-wrap items-center gap-1">
      {unitCountsByStatus(productId).map(({ status, count }) => (
        <span
          key={status.id}
          className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-medium',
            status.blocksRental
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          )}
        >
          {count} {getLanguage() === 'en' && status.nameEn ? status.nameEn : status.name}
        </span>
      ))}
    </div>
  );

  // Tipo de movimiento seleccionado en la pantalla de movimiento (campos
  // adaptados al tipo). Se calcula arriba de los early returns porque la
  // regla de ubicación automática (punto 15) lo usa en un efecto.
  const selectedMt = movementTypes.find(m => m.id === movementForm.movementTypeId);
  const isTransferMt = selectedMt?.id === 'transferencia';
  const isInputMt = selectedMt ? !selectedMt.isOutput : false;
  const isAdjustMt = selectedMt?.id === 'ajuste';
  // Producto elegido en el formulario de movimiento: si es serializable
  // (rentable), el formulario de CANTIDAD queda bloqueado (punto 4b)
  const movementProduct = products.find(p => p.id === movementForm.productId);
  // Salidas (consumo/ajuste/daño, no transferencia): el origen se ofrece solo
  // entre las ubicaciones del departamento del usuario actual (punto 15)
  const isOutputNonTransfer = !!selectedMt?.isOutput && !isTransferMt;
  const myDeptCode = useMemo(
    () => normalizeDeptCode(currentUser?.department || ''),
    [currentUser?.department]
  );
  const myDeptLocations = useMemo(
    () =>
      activeLocations.filter(
        l => l.responsibleDepartmentId && normalizeDeptCode(l.responsibleDepartmentId) === myDeptCode
      ),
    [activeLocations, myDeptCode]
  );
  // Restricción activa: usuario con departamento y con ubicaciones en él
  const restrictOrigin = isOutputNonTransfer && !!myDeptCode && myDeptLocations.length > 0;
  // Una sola ubicación del departamento: se selecciona sola, sin pedir
  const autoOriginLocation = restrictOrigin && myDeptLocations.length === 1 ? myDeptLocations[0] : null;
  const movementOriginLocations = restrictOrigin ? myDeptLocations : activeLocations;

  // Selección automática de la única ubicación del departamento (punto 15)
  useEffect(() => {
    if (autoOriginLocation && movementForm.fromLocationId !== autoOriginLocation.id) {
      setMovementForm(f => ({ ...f, fromLocationId: autoOriginLocation.id }));
    }
  }, [autoOriginLocation, movementForm.fromLocationId]);

  // Cantidades "en tránsito" por producto + ubicación origen → destino
  // (punto 3): transferencias activas (pendiente o en_tránsito; el stock ya
  // se descuenta al crear, esto es solo información).
  const transitByOrigin = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const tr of transfers) {
      if (tr.status !== 'pendiente' && tr.status !== 'en_transito') continue;
      const key = `${tr.productId}__${tr.fromLocationId}`;
      const inner = map.get(key) || new Map<string, number>();
      inner.set(tr.toLocationId, (inner.get(tr.toLocationId) || 0) + tr.quantity);
      map.set(key, inner);
    }
    return map;
  }, [transfers]);

  // Historial de un serial: órdenes donde algún ítem lo tiene asignado (WH-D2)
  const ordersForSerial = (unitId: string) =>
    rentalOrders.filter(o => o.items.some(it => it.assignedUnitIds?.includes(unitId)));

  const rentalOrderStatusName = (statusId: string) => {
    const s = rentalOrderStatuses.find(x => x.id === statusId);
    return s ? (getLanguage() === 'en' && s.nameEn ? s.nameEn : s.name) : statusId;
  };

  const fmtSerialDate = (iso: string | null | undefined) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
  };

  const productName = (id: string) => products.find(p => p.id === id)?.name || id;
  const locationName = (id: string) => locations.find(l => l.id === id)?.name || id;
  const unitName = (id: string) => units.find(u => u.id === id)?.name || id;
  const movementTypeName = (mt: MovementType) =>
    getLanguage() === 'en' && mt.nameEn ? mt.nameEn : mt.name;
  const stockFor = (productId: string, locationId: string) =>
    stocks.find(s => s.productId === productId && s.locationId === locationId);

  // Líneas "En tránsito a {destino}: {cantidad} {unidad}" (punto 3):
  // transferencias activas (pendiente/en_tránsito) desde una ubicación
  // origen hacia cada destino, para una fila de stock concreta
  const renderTransitLines = (productId: string, fromLocationId: string, unit: string) => {
    const groups = transitByOrigin.get(`${productId}__${fromLocationId}`);
    if (!groups) return null;
    return [...groups.entries()].map(([toLocationId, qty]) => (
      <div key={toLocationId} className="mt-1 flex items-center gap-1 text-[11px] text-blue-700">
        <Truck className="h-3 w-3 shrink-0" />
        {t('inv.transfers.inTransitTo')
          .replace('{location}', locationName(toLocationId))
          .replace('{quantity}', String(qty))
          .replace('{unit}', unit)}
      </div>
    ));
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ═══════════════════════════════════════════════════════════════════
  // LISTENERS FIRESTORE (solo si el feature flag está activo)
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.products), orderBy('name', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setProducts(
          snap.docs
            .map(d => docToProduct(d.id, d.data()))
            .filter(p => !p.tenantId || p.tenantId === tenantId)
        );
        setLoading(false);
      },
      (err) => {
        console.error('[InventarioModule] products:', err);
        setLoadError(true);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [enabled, tenantId]);

  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.locations), orderBy('name', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLocations(
          snap.docs
            .map(d => docToLocation(d.id, d.data()))
            .filter(l => !l.tenantId || l.tenantId === tenantId)
        );
      },
      (err) => console.error('[InventarioModule] locations:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.unitsOfMeasure), orderBy('name', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setUnits(
          snap.docs
            .map(d => docToUnit(d.id, d.data()))
            .filter(u => !u.tenantId || u.tenantId === tenantId)
        );
      },
      (err) => console.error('[InventarioModule] unitsOfMeasure:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  useEffect(() => {
    if (!enabled) return;
    const unsub = onSnapshot(
      collection(db, CATALOG_COLLECTIONS.inventoryStocks),
      (snap) => {
        setStocks(
          snap.docs
            .map(d => docToStock(d.id, d.data()))
            .filter(s => !s.tenantId || s.tenantId === tenantId)
        );
      },
      (err) => console.error('[InventarioModule] inventoryStocks:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.inventoryMovements), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMovements(
          snap.docs
            .map(d => docToMovement(d.id, d.data()))
            .filter(m => !m.tenantId || m.tenantId === tenantId)
        );
      },
      (err) => console.error('[InventarioModule] inventoryMovements:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.movementTypes), orderBy('name', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMovementTypes(
          snap.docs
            .map(d => docToMovementType(d.id, d.data()))
            .filter(m => !m.tenantId || m.tenantId === tenantId)
        );
      },
      (err) => console.error('[InventarioModule] movementTypes:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  // Categorías de producto (selector por categoría en el formulario de movimiento)
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.productCategories), orderBy('name', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setProductCategories(
          snap.docs
            .map(d => ({ id: d.id, ...docToProductCategory(d.id, d.data()) } as ProductCategory))
            .filter(c => !c.tenantId || c.tenantId === tenantId)
        );
      },
      (err) => console.error('[InventarioModule] productCategories:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  // Proveedores (para movimientos de entrada: compra / devolución)
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.suppliers), orderBy('name', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSuppliers(
          snap.docs
            .map(d => docToSupplier(d.id, d.data()))
            .filter(s => !s.tenantId || s.tenantId === tenantId)
        );
      },
      (err) => console.error('[InventarioModule] suppliers:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.serialStatuses), orderBy('name', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSerialStatuses(
          snap.docs
            .map(d => docToSerialStatus(d.id, d.data()))
            .filter(s => !s.tenantId || s.tenantId === tenantId)
        );
      },
      (err) => console.error('[InventarioModule] serialStatuses:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.inventoryTransfers), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTransfers(
          snap.docs
            .map(d => docToTransfer(d.id, d.data()))
            .filter(x => !x.tenantId || x.tenantId === tenantId)
        );
      },
      (err) => console.error('[InventarioModule] inventoryTransfers:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  // Borradores de pedido automático (punto 16): colección nueva
  // purchaseRequisitions (cuberta por el match genérico de firestore.rules)
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'purchaseRequisitions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPurchaseReqs(
          snap.docs
            .map(d => docToPurchaseRequisition(d.id, d.data()))
            .filter(x => !x.tenantId || x.tenantId === tenantId)
        );
      },
      (err) => console.error('[InventarioModule] purchaseRequisitions:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.countSessions), orderBy('scheduledAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCountSessions(
          snap.docs
            .map(d => docToCountSession(d.id, d.data()))
            .filter(x => !x.tenantId || x.tenantId === tenantId)
        );
      },
      (err) => console.error('[InventarioModule] countSessions:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.rentalUnits), orderBy('serialNumber', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRentalUnits(
          snap.docs
            .map(d => docToRentalUnit(d.id, d.data()))
            .filter(u => !u.tenantId || u.tenantId === tenantId)
        );
      },
      (err) => console.error('[InventarioModule] rentalUnits:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  // Historial de seriales (WH-D2): órdenes de renta con seriales asignados
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.rentalOrders), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRentalOrders(
          snap.docs
            .map(d => docToRentalOrder(d.id, d.data()))
            .filter(o => !o.tenantId || o.tenantId === tenantId)
        );
      },
      (err) => console.error('[InventarioModule] rentalOrders:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.rentalOrderStatuses), orderBy('order', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRentalOrderStatuses(
          snap.docs
            .map(d => docToRentalOrderStatus(d.id, d.data()))
            .filter(s => !s.tenantId || s.tenantId === tenantId)
        );
      },
      (err) => console.error('[InventarioModule] rentalOrderStatuses:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  // ═══════════════════════════════════════════════════════════════════
  // MODAL DE MOVIMIENTO (compartido: Stock y futuras sub-pestañas)
  // ═══════════════════════════════════════════════════════════════════

  const openMovementForm = (productId?: string, locationId?: string) => {
    const product = productId ? products.find(p => p.id === productId) : null;
    setMovementCategoryId(product?.categoryId || '');
    setMovementForm({
      ...EMPTY_MOVEMENT_FORM,
      productId: productId || '',
      fromLocationId: locationId || '',
      toLocationId: locationId || '',
    });
    setInvView('movement');
  };

  // Botones rápidos: abre el formulario con un tipo preseleccionado.
  // Si el id semilla no existe en el catálogo, resuelve un equivalente activo.
  // productId opcional: preselecciona categoría y producto (ficha / escaneo).
  const openMovementFormFor = (typeId: string, productId?: string) => {
    let mt = activeMovementTypes.find(m => m.id === typeId);
    if (!mt) {
      if (typeId === 'compra') {
        mt = activeMovementTypes.find(m => !m.isOutput);
      } else if (typeId === 'consumo') {
        mt = activeMovementTypes.find(m => m.isOutput && m.id !== 'transferencia' && m.id !== 'ajuste');
      } else {
        // 'ajuste' u otro id de salida: comportamiento genérico
        mt = activeMovementTypes.find(m => m.isOutput);
      }
    }
    const product = productId ? products.find(p => p.id === productId) : null;
    setMovementCategoryId(product?.categoryId || '');
    setMovementForm({
      ...EMPTY_MOVEMENT_FORM,
      movementTypeId: mt?.id || '',
      productId: productId || '',
    });
    setInvView('movement');
  };

  const handleSaveMovement = async () => {
    if (!currentUser || !canWrite) return;
    const qty = Number(movementForm.quantity);
    const mt = movementTypes.find(m => m.id === movementForm.movementTypeId);
    if (!movementForm.productId) return toast.error(t('inv.validation.productRequired'));
    if (!mt) return toast.error(t('inv.validation.typeRequired'));
    if (!Number.isFinite(qty) || qty <= 0) return toast.error(t('inv.validation.quantityPositive'));
    const isTransfer = mt.id === 'transferencia';
    if (mt.isOutput && !movementForm.fromLocationId) return toast.error(t('inv.validation.fromRequired'));
    if ((!mt.isOutput || isTransfer) && !movementForm.toLocationId) return toast.error(t('inv.validation.toRequired'));
    if (isTransfer && movementForm.fromLocationId === movementForm.toLocationId) {
      return toast.error(t('inv.transfers.validation.sameLocation'));
    }
    if (mt.id === 'ajuste' && !movementForm.reason.trim()) {
      return toast.error(t('inv.movementForm.reasonRequired'));
    }

    // Ubicaciones efectivas según el tipo: en entradas no hay origen interno
    // (proveedor/externo) y en salidas no hay destino interno (consumo/externo)
    const effFromLocationId = mt.isOutput ? movementForm.fromLocationId : '';
    const effToLocationId = !mt.isOutput || isTransfer ? movementForm.toLocationId : '';
    // Persistencia del proveedor en compras: se antepone al motivo guardado
    let reason = movementForm.reason.trim();
    if (!mt.isOutput && movementForm.supplierId) {
      const supplier = activeSuppliers.find(s => s.id === movementForm.supplierId);
      if (supplier) reason = `Proveedor: ${supplier.name}. ${reason}`.trim();
    }

    await executeWithConfirm({
      level: 'major',
      title: t('inv.movementForm.title'),
      description: `${productName(movementForm.productId)} · ${movementTypeName(mt)} · ${qty}`,
      action: async () => {
        setSavingMovement(true);
        try {
          const now = new Date().toISOString();
          const signedQty = mt.isOutput ? -qty : qty;
          // La ubicación que cambia: origen si resta, destino si suma
          const targetLocationId = mt.isOutput ? effFromLocationId : effToLocationId;
          const current = stockFor(movementForm.productId, targetLocationId)?.quantity ?? 0;

          // Actualizar (o crear) el stock del producto en la ubicación
          await setDoc(
            doc(db, CATALOG_COLLECTIONS.inventoryStocks, stockDocId(movementForm.productId, targetLocationId)),
            {
              tenantId,
              productId: movementForm.productId,
              locationId: targetLocationId,
              quantity: current + signedQty,
              updatedAt: now,
              updatedBy: currentUser.name,
            },
            { merge: true }
          );

          // Bitácora inmutable del movimiento
          const movRef = await addDoc(collection(db, CATALOG_COLLECTIONS.inventoryMovements), {
            tenantId,
            productId: movementForm.productId,
            quantity: signedQty,
            fromLocationId: effFromLocationId || null,
            toLocationId: effToLocationId || null,
            movementTypeId: mt.id!,
            reason: reason || null,
            referenceType: null,
            referenceId: null,
            createdAt: now,
            createdBy: currentUser.id,
            createdByName: currentUser.name,
          });

          await logAction({
            action: AUDIT_ACTIONS.stockMovementCreated,
            targetType: 'inventory_movement',
            targetId: movRef.id,
            targetName: `${productName(movementForm.productId)} · ${movementTypeName(mt)}`,
            impactLevel: 'major',
            description: `Movimiento de inventario: ${productName(movementForm.productId)} · ${movementTypeName(mt)} · ${signedQty > 0 ? '+' : ''}${signedQty}`,
          });

          toast.success(t('inv.movementForm.save'));
          setInvView('main');
          setMovementForm(EMPTY_MOVEMENT_FORM);
          setMovementCategoryId('');
        } catch (err: any) {
          toast.error(`${t('inv.error.save')}: ${err.message}`);
        } finally {
          setSavingMovement(false);
        }
      },
    });
  };

  // ═══════════════════════════════════════════════════════════════════
  // TRANSFERENCIAS ENTRE UBICACIONES (FASE 1A-transfers)
  // ═══════════════════════════════════════════════════════════════════

  const openTransferForm = (productId?: string) => {
    const product = productId ? products.find(p => p.id === productId) : null;
    setTransferCategoryId(product?.categoryId || '');
    setTransferForm({ ...EMPTY_TRANSFER_FORM, productId: productId || '' });
    setInvView('transfer-new');
  };

  const handleCreateTransfer = async () => {
    if (!currentUser || !canWrite) return;
    const qty = Number(transferForm.quantity);
    if (!transferForm.productId) return toast.error(t('inv.validation.productRequired'));
    if (!Number.isFinite(qty) || qty <= 0) return toast.error(t('inv.validation.quantityPositive'));
    if (!transferForm.fromLocationId) return toast.error(t('inv.transfers.validation.fromRequired'));
    if (!transferForm.toLocationId) return toast.error(t('inv.transfers.validation.toRequired'));
    if (transferForm.fromLocationId === transferForm.toLocationId)
      return toast.error(t('inv.transfers.validation.sameLocation'));
    const available = stockFor(transferForm.productId, transferForm.fromLocationId)?.quantity ?? 0;
    if (qty > available)
      return toast.error(
        t('inv.transfers.validation.insufficientStock').replace('{available}', String(available))
      );

    await executeWithConfirm({
      level: 'major',
      title: t('inv.transfers.new'),
      description: `${productName(transferForm.productId)} · ${qty} · ${locationName(transferForm.fromLocationId)} → ${locationName(transferForm.toLocationId)}. ${t('inv.transfers.createConfirmDesc').replace('{quantity}', String(qty))}`,
      action: async () => {
        setSavingTransfer(true);
        try {
          const now = new Date().toISOString();
          const responsible = activeUsers.find(u => u.id === transferForm.responsibleUserId);

          const transferRef = await addDoc(collection(db, CATALOG_COLLECTIONS.inventoryTransfers), {
            tenantId,
            productId: transferForm.productId,
            quantity: qty,
            fromLocationId: transferForm.fromLocationId,
            toLocationId: transferForm.toLocationId,
            responsibleUserId: responsible?.id || null,
            responsibleName: responsible?.name || null,
            status: 'pendiente',
            receivedBy: null,
            receivedAt: null,
            createdAt: now,
            createdBy: currentUser.id,
            createdByName: currentUser.name,
          });

          // Se descuenta del origen de inmediato (crea el doc si no existe)
          await setDoc(
            doc(db, CATALOG_COLLECTIONS.inventoryStocks, stockDocId(transferForm.productId, transferForm.fromLocationId)),
            {
              tenantId,
              productId: transferForm.productId,
              locationId: transferForm.fromLocationId,
              quantity: available - qty,
              updatedAt: now,
              updatedBy: currentUser.name,
            },
            { merge: true }
          );

          // Bitácora inmutable del movimiento
          await addDoc(collection(db, CATALOG_COLLECTIONS.inventoryMovements), {
            tenantId,
            productId: transferForm.productId,
            quantity: -qty,
            fromLocationId: transferForm.fromLocationId,
            toLocationId: transferForm.toLocationId,
            movementTypeId: 'transferencia',
            reason: t('inv.transfers.reasonCreated'),
            referenceType: 'transfer',
            referenceId: transferRef.id,
            createdAt: now,
            createdBy: currentUser.id,
            createdByName: currentUser.name,
          });

          // La notificación al destino la envía la Cloud Function
          // notifyTransferCreated (onDocumentCreated de inventoryTransfers)

          await logAction({
            action: AUDIT_ACTIONS.transferCreated,
            targetType: 'inventory_transfer',
            targetId: transferRef.id,
            targetName: `${productName(transferForm.productId)} · ${qty}`,
            impactLevel: 'major',
            description: `Transferencia creada: ${productName(transferForm.productId)} · ${qty} · ${locationName(transferForm.fromLocationId)} → ${locationName(transferForm.toLocationId)}`,
          });

          toast.success(t('inv.transfers.new'));
          setInvView('main');
          setTransferForm(EMPTY_TRANSFER_FORM);
          setTransferCategoryId('');
        } catch (err: any) {
          toast.error(`${t('inv.error.save')}: ${err.message}`);
        } finally {
          setSavingTransfer(false);
        }
      },
    });
  };

  const handleShipTransfer = async (transfer: InventoryTransfer) => {
    if (!currentUser || !canWrite || !transfer.id) return;
    try {
      await updateDoc(doc(db, CATALOG_COLLECTIONS.inventoryTransfers, transfer.id), {
        status: 'en_transito',
        shippedBy: currentUser.id,
        shippedByName: currentUser.name,
        shippedAt: new Date().toISOString(),
      });
      await logAction({
        action: AUDIT_ACTIONS.transferShipped,
        targetType: 'inventory_transfer',
        targetId: transfer.id,
        targetName: `${productName(transfer.productId)} · ${transfer.quantity}`,
        impactLevel: 'minor',
        description: `Transferencia despachada: ${productName(transfer.productId)} · ${transfer.quantity} · ${locationName(transfer.fromLocationId)} → ${locationName(transfer.toLocationId)}`,
      });
    } catch (err: any) {
      toast.error(`${t('inv.error.save')}: ${err.message}`);
    }
  };

  // Quién puede confirmar la recepción (regla final, ronda 4), cumpliendo
  // CUALQUIERA de estas condiciones:
  // (a) es el responsable de la ubicación destino (locations.responsibleUserId)
  // (b) pertenece al departamento de esa ubicación (locations.responsibleDepartmentId
  //     comparado con el department del currentUser, normalizando códigos con
  //     normalizeDeptCode, igual que useDynamicDepartments.getVisibleDepartmentCodes)
  // (c) es Supervisor o superior (SUPERVISOR_PLUS_ROLES)
  // REGLA ABSOLUTA: quien CREÓ la transferencia NO puede recibirla NUNCA,
  // aunque cumpla (a), (b) o (c).
  // Si la ubicación destino no tiene departamento asignado en datos, el botón
  // lo ven el responsable (a) y Supervisor+ (c); en el detalle se muestra aviso.
  // Diagnóstico temporal en consola: si con datos reales el botón no aparece,
  // aquí se ve qué regla falló (ubicación sin responsable/depto, depto del
  // usuario distinto, etc.).
  const canReceiveTransfer = (transfer: InventoryTransfer): boolean => {
    if (!currentUser || !transfer.id || transfer.status !== 'en_transito') return false;
    if (transfer.createdBy && transfer.createdBy === currentUser.id) {
      console.info('[Inventario] Recibir bloqueado: quien creó la transferencia no puede recibirla', {
        transferId: transfer.id,
        createdBy: transfer.createdBy,
        currentUserId: currentUser.id,
      });
      return false;
    }
    const destLocation = locations.find(l => l.id === transfer.toLocationId);
    if (destLocation?.responsibleUserId && destLocation.responsibleUserId === currentUser.id) return true;
    const destDeptCode = normalizeDeptCode(destLocation?.responsibleDepartmentId || '');
    const userDeptCode = normalizeDeptCode(currentUser.department || '');
    if (destDeptCode && userDeptCode && destDeptCode === userDeptCode) return true;
    if (canSupervise) return true;
    console.info('[Inventario] Recibir no disponible para este usuario', {
      transferId: transfer.id,
      toLocationId: transfer.toLocationId,
      destResponsibleUserId: destLocation?.responsibleUserId ?? null,
      destResponsibleDepartmentId: destLocation?.responsibleDepartmentId ?? null,
      destDeptCode: destDeptCode || null,
      userDeptCode: userDeptCode || null,
      userRole: currentUser.role,
    });
    return false;
  };

  // Producto rentable con unidades serializadas: la recepción exige confirmar
  // las unidades (escaneo o selección) además de la cantidad
  const transferNeedsUnits = (transfer: InventoryTransfer): boolean => {
    const product = products.find(p => p.id === transfer.productId);
    return !!product?.isRentable && rentalUnits.some(u => u.productId === transfer.productId);
  };

  const openReceiveTransfer = (transfer: InventoryTransfer) => {
    if (!canReceiveTransfer(transfer)) {
      toast.error(
        currentUser?.id && transfer.createdBy === currentUser.id
          ? t('inv.transfers.creatorHint')
          : t('inv.transfers.receiveRule')
      );
      return;
    }
    setReceiveTransferId(transfer.id!);
    setReceivedByName(currentUser?.name || '');
    setReceiveSerialIds(transfer.receivedUnitIds ?? []);
    setReceiveScanConfirmed(false);
    setReceivePhoto(null);
    setReceiveSignature(null);
    setInvView('receive');
  };

  const handleReceiveTransfer = async () => {
    const transfer = transfers.find(x => x.id === receiveTransferId);
    if (!currentUser || !transfer?.id || !canReceiveTransfer(transfer)) return;
    if (!receivedByName.trim()) return toast.error(t('inv.validation.nameRequired'));
    const needsUnits = transferNeedsUnits(transfer);
    if (needsUnits && receiveSerialIds.length !== transfer.quantity) {
      return toast.error(
        t('inv.transfers.validation.unitsRequired').replace('{expected}', String(transfer.quantity))
      );
    }
    // Verificación obligatoria (punto 11): consumibles CON QR se confirman con
    // el escaneo del QR del producto; productos SIN QR exigen foto + firma
    const product = products.find(p => p.id === transfer.productId);
    const hasQr = productHasQr(product);
    if (!needsUnits && hasQr && !receiveScanConfirmed) {
      return toast.error(t('inv.receive.scanConfirmHelp'));
    }
    if (!needsUnits && !hasQr) {
      if (!receivePhoto) return toast.error(t('inv.receive.photo'));
      if (!receiveSignature) return toast.error(t('inv.receive.signature'));
    }
    await executeWithConfirm({
      level: 'major',
      title: t('inv.transfers.receiveTitle'),
      description: `${productName(transfer.productId)} · ${transfer.quantity} → ${locationName(transfer.toLocationId)}`,
      action: async () => {
        try {
          const now = new Date().toISOString();
          const current = stockFor(transfer.productId, transfer.toLocationId)?.quantity ?? 0;

          // Suma en el destino
          await setDoc(
            doc(db, CATALOG_COLLECTIONS.inventoryStocks, stockDocId(transfer.productId, transfer.toLocationId)),
            {
              tenantId,
              productId: transfer.productId,
              locationId: transfer.toLocationId,
              quantity: current + transfer.quantity,
              updatedAt: now,
              updatedBy: currentUser.name,
            },
            { merge: true }
          );

          await addDoc(collection(db, CATALOG_COLLECTIONS.inventoryMovements), {
            tenantId,
            productId: transfer.productId,
            quantity: transfer.quantity,
            fromLocationId: null,
            toLocationId: transfer.toLocationId,
            movementTypeId: 'transferencia',
            reason: t('inv.transfers.reasonReceived'),
            referenceType: 'transfer',
            referenceId: transfer.id,
            createdAt: now,
            createdBy: currentUser.id,
            createdByName: currentUser.name,
          });

          // Evidencia de recepción: foto + firma (dataURL) solo para productos
          // sin QR; el cast local evita tocar el tipo compartido (el campo es
          // aditivo y firestore lo acepta)
          const receivedPayload: Record<string, unknown> = {
            status: 'recibido',
            receivedBy: receivedByName.trim(),
            receivedAt: now,
            receivedUnitIds: needsUnits ? receiveSerialIds : (transfer.receivedUnitIds ?? null),
          };
          if (!needsUnits && !hasQr) {
            receivedPayload.receivedPhoto = receivePhoto;
            receivedPayload.receivedSignature = receiveSignature;
            receivedPayload.receivedQrConfirmed = false;
          } else if (!needsUnits && hasQr) {
            receivedPayload.receivedQrConfirmed = true;
          }
          await updateDoc(doc(db, CATALOG_COLLECTIONS.inventoryTransfers, transfer.id), receivedPayload);

          // Las notificaciones de esta transferencia quedan leídas al recibirla
          try {
            const notifSnap = await getDocs(
              query(
                collection(db, 'notifications'),
                where('userId', '==', currentUser.id),
                where('read', '==', false)
              )
            );
            await Promise.all(
              notifSnap.docs
                .filter(d => {
                  const data = d.data() as { data?: { transferId?: string } };
                  return data.data?.transferId === transfer.id;
                })
                .map(d => updateDoc(d.ref, { read: true }))
            );
          } catch {
            // Marcar leída es lo mejor esfuerzo: no bloquea la recepción
          }

          await logAction({
            action: AUDIT_ACTIONS.transferReceived,
            targetType: 'inventory_transfer',
            targetId: transfer.id,
            targetName: `${productName(transfer.productId)} · ${transfer.quantity}`,
            impactLevel: 'major',
            description: `Transferencia recibida: ${productName(transfer.productId)} · ${transfer.quantity} · recibido por ${receivedByName.trim()}`,
          });

          toast.success(t('inv.transfers.receive'));
          setReceiveTransferId(null);
          setReceiveSerialIds([]);
          setReceiveScanConfirmed(false);
          setReceivePhoto(null);
          setReceiveSignature(null);
          setInvView('main');
        } catch (err: any) {
          toast.error(`${t('inv.error.save')}: ${err.message}`);
        }
      },
    });
  };

  const openCancelTransfer = (transfer: InventoryTransfer) => {
    setCancelTransferId(transfer.id!);
    setCancelReason('');
  };

  const handleCancelTransfer = async () => {
    const transfer = transfers.find(x => x.id === cancelTransferId);
    if (!currentUser || !canWrite || !transfer?.id) return;
    await executeWithConfirm({
      level: 'major',
      title: t('inv.transfers.cancelTitle'),
      description: `${productName(transfer.productId)} · ${transfer.quantity} · ${locationName(transfer.fromLocationId)} → ${locationName(transfer.toLocationId)}`,
      action: async () => {
        try {
          const now = new Date().toISOString();
          const current = stockFor(transfer.productId, transfer.fromLocationId)?.quantity ?? 0;

          // Se devuelve la cantidad al origen
          await setDoc(
            doc(db, CATALOG_COLLECTIONS.inventoryStocks, stockDocId(transfer.productId, transfer.fromLocationId)),
            {
              tenantId,
              productId: transfer.productId,
              locationId: transfer.fromLocationId,
              quantity: current + transfer.quantity,
              updatedAt: now,
              updatedBy: currentUser.name,
            },
            { merge: true }
          );

          await addDoc(collection(db, CATALOG_COLLECTIONS.inventoryMovements), {
            tenantId,
            productId: transfer.productId,
            quantity: transfer.quantity,
            fromLocationId: transfer.fromLocationId,
            toLocationId: null,
            movementTypeId: 'transferencia',
            reason: cancelReason.trim()
              ? `${t('inv.transfers.reasonCancelled')} · ${cancelReason.trim()}`
              : t('inv.transfers.reasonCancelled'),
            referenceType: 'transfer',
            referenceId: transfer.id,
            createdAt: now,
            createdBy: currentUser.id,
            createdByName: currentUser.name,
          });

          await updateDoc(doc(db, CATALOG_COLLECTIONS.inventoryTransfers, transfer.id), {
            status: 'cancelado',
          });

          await logAction({
            action: AUDIT_ACTIONS.transferCancelled,
            targetType: 'inventory_transfer',
            targetId: transfer.id,
            targetName: `${productName(transfer.productId)} · ${transfer.quantity}`,
            impactLevel: 'major',
            description: `Transferencia cancelada: ${productName(transfer.productId)} · ${transfer.quantity}${cancelReason.trim() ? ` · motivo: ${cancelReason.trim()}` : ''}`,
          });

          toast.success(t('inv.transfers.cancel'));
          setCancelTransferId(null);
          setCancelReason('');
        } catch (err: any) {
          toast.error(`${t('inv.error.save')}: ${err.message}`);
        }
      },
    });
  };

  // ═══════════════════════════════════════════════════════════════════
  // PEDIDO AUTOMÁTICO — BORRADOR (punto 16)
  // ═══════════════════════════════════════════════════════════════════

  // ¿Ya existe un borrador pendiente para este producto + ubicación?
  const purchaseDraftFor = (productId: string, locationId: string) =>
    purchaseReqs.find(r => r.status === 'draft' && r.productId === productId && r.locationId === locationId);

  // Sugerencia de cantidad: hasta el máximo (max - actual) o hasta el mínimo
  // si no hay máximo (misma fórmula que la Cloud Function checkLowStock)
  const purchaseSuggestedQty = (stock: InventoryStock): number =>
    stock.maxStock != null ? stock.maxStock - stock.quantity : (stock.minStock ?? 0);

  const handleCreatePurchaseRequisition = async (stock: InventoryStock) => {
    if (!currentUser || savingPurchaseReq) return;
    const product = products.find(p => p.id === stock.productId);
    if (!product || stock.minStock == null) return;
    const suggestedQty = purchaseSuggestedQty(stock);
    if (suggestedQty <= 0) return;
    const supplier = product.preferredSupplierId
      ? suppliers.find(s => s.id === product.preferredSupplierId)
      : undefined;
    const unit = unitName(product.unitId);
    const locName = locationName(stock.locationId);

    await executeWithConfirm({
      level: 'major',
      title: t('inv.stock.orderSuggestion'),
      description: `${product.name} · ${locName} · ${suggestedQty} ${unit}${supplier ? ` · ${supplier.name}` : ''}`,
      action: async () => {
        setSavingPurchaseReq(true);
        try {
          const now = new Date().toISOString();
          const ref = await addDoc(collection(db, 'purchaseRequisitions'), {
            tenantId,
            productId: product.id,
            productName: product.name,
            quantity: suggestedQty,
            unit,
            suggestedQty,
            supplierId: supplier?.id || null,
            supplierName: supplier?.name || null,
            locationId: stock.locationId,
            locationName: locName,
            status: 'draft',
            createdBy: currentUser.id,
            createdByName: currentUser.name,
            createdAt: now,
            notes: `Bajo mínimo: quedan ${stock.quantity} ${unit} (mínimo ${stock.minStock}). La orden de compra formal se gestiona en Compras & Pagos (Fase 5).`,
          });

          // Notificación desde cliente (patrón de HorariosModule): avisa a
          // DG/RRHH y al responsable de la ubicación. Es lo mejor esfuerzo:
          // nunca bloquea la creación del borrador.
          try {
            const targets = new Set<string>();
            activeUsers
              .filter(u => u.role === Role.DIRECTOR_GENERAL || u.role === Role.RRHH)
              .forEach(u => u.id && targets.add(u.id));
            const locResponsible = locations.find(l => l.id === stock.locationId)?.responsibleUserId;
            if (locResponsible) targets.add(locResponsible);
            for (const uid of targets) {
              await addDoc(collection(db, 'notifications'), {
                userId: uid,
                type: 'PURCHASE_REQUISITION_CREATED',
                title: `Pedido sugerido: ${product.name}`,
                body: `${currentUser.name} creó un borrador de pedido de ${suggestedQty} ${unit} de ${product.name} para ${locName}${supplier ? ` (proveedor: ${supplier.name})` : ''}.`,
                data: { link: '/requisiciones' },
                read: false,
                createdAt: serverTimestamp(),
                createdBy: currentUser.id,
                priority: 'normal',
              });
            }
          } catch (notifErr) {
            console.error('[InventarioModule] notificación de pedido:', notifErr);
          }

          await logAction({
            action: AUDIT_ACTIONS.purchaseRequisitionCreated,
            targetType: 'purchase_requisition',
            targetId: ref.id,
            targetName: `${product.name} · ${suggestedQty} ${unit}`,
            impactLevel: 'major',
            description: `Borrador de pedido creado: ${product.name} · ${suggestedQty} ${unit} · ${locName}${supplier ? ` · proveedor: ${supplier.name}` : ''}`,
          });

          toast.success(t('inv.stock.orderCreated'));
        } catch (err: any) {
          toast.error(`${t('inv.error.save')}: ${err.message}`);
        } finally {
          setSavingPurchaseReq(false);
        }
      },
    });
  };

  // ═══════════════════════════════════════════════════════════════════
  // CONTEOS CÍCLICOS (FASE 1A-counts)
  // ═══════════════════════════════════════════════════════════════════

  const handleScheduleCount = async () => {
    if (!currentUser || !canWrite) return;
    if (!countForm.locationId) return toast.error(t('inv.counts.validation.locationRequired'));
    setSavingCount(true);
    try {
      const now = new Date().toISOString();
      const ref = await addDoc(collection(db, CATALOG_COLLECTIONS.countSessions), {
        tenantId,
        locationId: countForm.locationId,
        status: 'programado',
        blind: countForm.blind,
        frequency: countForm.frequency,
        scheduledAt: now,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
      });
      await logAction({
        action: AUDIT_ACTIONS.countScheduled,
        targetType: 'count_session',
        targetId: ref.id,
        targetName: locationName(countForm.locationId),
        impactLevel: 'minor',
        description: `Conteo programado: ${locationName(countForm.locationId)} · ${t(`inv.counts.frequency.${countForm.frequency}`)}${countForm.blind ? ` · ${t('inv.counts.blindYes').toLowerCase()}` : ''}`,
      });
      toast.success(t('inv.counts.schedule'));
      setInvView('main');
      setCountForm(EMPTY_COUNT_FORM);
    } catch (err: any) {
      toast.error(`${t('inv.error.save')}: ${err.message}`);
    } finally {
      setSavingCount(false);
    }
  };

  // Entra al panel de conteo cargando el avance guardado (si existe)
  const enterCounting = (session: CountSession) => {
    const rows = stocks.filter(s => s.locationId === session.locationId && s.quantity !== 0);
    const draft: Record<string, string> = {};
    rows.forEach(s => {
      const saved = session.counts?.[s.productId];
      draft[s.productId] = saved != null ? String(saved) : '';
    });
    setCountsDraft(draft);
    // Regla del conteo con QR: los productos rentables con unidades
    // serializadas se cuentan SOLO escaneando el QR de cada serial; los
    // demás (consumibles, productos sin seriales) admiten entrada manual.
    setScannedSerials(session.scannedSerials ?? {});
    setCountingId(session.id!);
  };

  const handleStartCount = async (session: CountSession) => {
    if (!currentUser || !canWrite || !session.id) return;
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, CATALOG_COLLECTIONS.countSessions, session.id), {
        status: 'en_curso',
        startedAt: now,
      });
      enterCounting({ ...session, status: 'en_curso', startedAt: now });
    } catch (err: any) {
      toast.error(`${t('inv.error.save')}: ${err.message}`);
    }
  };

  const handleSaveCountsDraft = async () => {
    const session = countSessions.find(x => x.id === countingId);
    if (!currentUser || !canWrite || !session?.id) return;
    try {
      const parsed: Record<string, number> = {};
      Object.entries(countsDraft).forEach(([pid, v]) => {
        const n = Number(v);
        if (v.trim() !== '' && Number.isFinite(n)) parsed[pid] = n;
      });
      await updateDoc(doc(db, CATALOG_COLLECTIONS.countSessions, session.id), {
        counts: parsed,
        scannedSerials,
      });
      toast.success(t('inv.common.save'));
    } catch (err: any) {
      toast.error(`${t('inv.error.save')}: ${err.message}`);
    }
  };

  const handleFinishCount = async () => {
    const session = countSessions.find(x => x.id === countingId);
    if (!currentUser || !canWrite || !session?.id) return;
    await executeWithConfirm({
      level: 'major',
      title: t('inv.counts.finish'),
      description: locationName(session.locationId),
      action: async () => {
        try {
          const now = new Date().toISOString();
          const rows = stocks.filter(s => s.locationId === session.locationId && s.quantity !== 0);
          const parsedCounts: Record<string, number> = {};
          const differences: Array<{ productId: string; expected: number; counted: number; delta: number }> = [];
          rows.forEach(s => {
            const raw = countsDraft[s.productId] ?? '';
            const counted = raw.trim() === '' || !Number.isFinite(Number(raw)) ? 0 : Number(raw);
            parsedCounts[s.productId] = counted;
            if (counted !== s.quantity) {
              differences.push({
                productId: s.productId,
                expected: s.quantity,
                counted,
                delta: counted - s.quantity,
              });
            }
          });

          await updateDoc(doc(db, CATALOG_COLLECTIONS.countSessions, session.id), {
            status: 'finalizado',
            finishedAt: now,
            counts: parsedCounts,
            differences,
          });

          await logAction({
            action: AUDIT_ACTIONS.countCompleted,
            targetType: 'count_session',
            targetId: session.id,
            targetName: locationName(session.locationId),
            impactLevel: 'major',
            description: differences.length
              ? `Conteo finalizado con ${differences.length} diferencias: ${locationName(session.locationId)}`
              : `Conteo finalizado sin diferencias: ${locationName(session.locationId)}`,
          });

          toast.success(differences.length ? t('inv.counts.differencesTitle') : t('inv.counts.noDifferences'));
          setCountingId(null);
        } catch (err: any) {
          toast.error(`${t('inv.error.save')}: ${err.message}`);
        }
      },
    });
  };

  const openAdjustment = (session: CountSession) => {
    setAdjustmentSessionId(session.id!);
    setAdjustmentReason('');
  };

  const handleApplyAdjustment = async () => {
    const session = countSessions.find(x => x.id === adjustmentSessionId);
    if (!currentUser || !canWrite || !session?.id) return;
    if (!adjustmentReason.trim()) return toast.error(t('inv.counts.validation.reasonRequired'));
    const diffs = session.differences ?? [];
    if (diffs.length === 0) return;
    await executeWithConfirm({
      level: 'major',
      title: t('inv.counts.applyAdjustment'),
      description: `${locationName(session.locationId)} · ${diffs.length}`,
      action: async () => {
        try {
          const now = new Date().toISOString();
          for (const d of diffs) {
            // Ajusta el stock al contado
            await setDoc(
              doc(db, CATALOG_COLLECTIONS.inventoryStocks, stockDocId(d.productId, session.locationId)),
              {
                tenantId,
                productId: d.productId,
                locationId: session.locationId,
                quantity: d.counted,
                updatedAt: now,
                updatedBy: currentUser.name,
              },
              { merge: true }
            );
            await addDoc(collection(db, CATALOG_COLLECTIONS.inventoryMovements), {
              tenantId,
              productId: d.productId,
              quantity: d.delta,
              fromLocationId: d.delta < 0 ? session.locationId : null,
              toLocationId: d.delta > 0 ? session.locationId : null,
              movementTypeId: 'ajuste',
              reason: `${adjustmentReason.trim()} · Ajuste por conteo`,
              referenceType: 'count',
              referenceId: session.id,
              createdAt: now,
              createdBy: currentUser.id,
              createdByName: currentUser.name,
            });
          }
          await updateDoc(doc(db, CATALOG_COLLECTIONS.countSessions, session.id), {
            status: 'ajustado',
            approvedBy: currentUser.name,
            approvedAt: now,
            adjustmentReason: adjustmentReason.trim(),
          });
          await logAction({
            action: AUDIT_ACTIONS.countAdjustmentApproved,
            targetType: 'count_session',
            targetId: session.id,
            targetName: locationName(session.locationId),
            impactLevel: 'sensitive',
            description: `Ajuste por conteo aprobado: ${locationName(session.locationId)} · ${diffs.length} productos · motivo: ${adjustmentReason.trim()}`,
          });
          toast.success(t('inv.counts.applyAdjustment'));
          setAdjustmentSessionId(null);
          setAdjustmentReason('');
        } catch (err: any) {
          toast.error(`${t('inv.error.save')}: ${err.message}`);
        }
      },
    });
  };

  // Sesión de conteo activa (panel de captura) y sus filas de productos
  const countingSession = countingId
    ? countSessions.find(x => x.id === countingId && x.status === 'en_curso') ?? null
    : null;
  const countRows = useMemo(
    () =>
      countingSession
        ? stocks.filter(s => s.locationId === countingSession.locationId && s.quantity !== 0)
        : [],
    [stocks, countingSession]
  );

  // ¿Producto rentable con unidades serializadas? → conteo por escaneo
  // obligatorio del QR de cada serial (regla del punto 12 de la spec)
  const productRequiresScan = (productId: string): boolean => {
    const product = products.find(p => p.id === productId);
    return !!product?.isRentable && rentalUnits.some(u => u.productId === productId);
  };

  // ═══════════════════════════════════════════════════════════════════
  // EDICIÓN INLINE DE MÍN/MÁX (config menor, sin auditoría)
  // ═══════════════════════════════════════════════════════════════════

  const startEditMinMax = (stock: InventoryStock) => {
    if (!canSupervise) return;
    setEditingMinMaxId(stock.id || null);
    setMinMaxDraft({
      min: stock.minStock != null ? String(stock.minStock) : '',
      max: stock.maxStock != null ? String(stock.maxStock) : '',
    });
  };

  const handleSaveMinMax = async (stock: InventoryStock) => {
    if (!currentUser || !canSupervise || !stock.id) return;
    try {
      const now = new Date().toISOString();
      const parseVal = (v: string): number | null => {
        const n = Number(v);
        return v.trim() !== '' && Number.isFinite(n) ? n : null;
      };
      await setDoc(
        doc(db, CATALOG_COLLECTIONS.inventoryStocks, stock.id),
        {
          tenantId,
          productId: stock.productId,
          locationId: stock.locationId,
          minStock: parseVal(minMaxDraft.min),
          maxStock: parseVal(minMaxDraft.max),
          updatedAt: now,
          updatedBy: currentUser.name,
        },
        { merge: true }
      );
      toast.success(t('inv.common.save'));
      setEditingMinMaxId(null);
    } catch (err: any) {
      toast.error(`${t('inv.error.save')}: ${err.message}`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // SERIALES / UNIDADES RENTABLES (FASE 1B-serials)
  // ═══════════════════════════════════════════════════════════════════

  const openSerialForm = (productId?: string) => {
    // Estado inicial por defecto: el primero activo que NO bloquea renta
    const defaultStatus = activeSerialStatuses.find(s => !s.blocksRental) ?? activeSerialStatuses[0];
    setSerialForm({ ...EMPTY_SERIAL_FORM, productId: productId || '', statusId: defaultStatus?.id || '' });
    setSerialPhotoFile(null);
    setInvView('serial-new');
  };

  const handleCreateSerial = async () => {
    if (!currentUser || !canWrite) return;
    if (!serialForm.productId) return toast.error(t('inv.validation.productRequired'));
    const serialNumber = serialForm.serialNumber.trim();
    if (!serialNumber) return toast.error(t('inv.serials.validation.serialRequired'));
    if (rentalUnits.some(u => u.serialNumber.trim().toLowerCase() === serialNumber.toLowerCase()))
      return toast.error(t('inv.serials.validation.serialDuplicate'));

    await executeWithConfirm({
      level: 'major',
      title: t('inv.serials.new'),
      description: `${productName(serialForm.productId)} · ${serialNumber}`,
      action: async () => {
        setSavingSerial(true);
        try {
          let photoUrl: string | null = null;
          if (serialPhotoFile) photoUrl = await uploadImage(serialPhotoFile, 'serials');
          const now = new Date().toISOString();
          const ref = await addDoc(collection(db, CATALOG_COLLECTIONS.rentalUnits), {
            tenantId,
            productId: serialForm.productId,
            serialNumber,
            photoUrl,
            size: serialForm.size.trim() || null,
            statusId: serialForm.statusId,
            notes: serialForm.notes.trim() || null,
            createdAt: now,
            createdBy: currentUser.name,
            updatedAt: now,
            updatedBy: currentUser.name,
          });
          await logAction({
            action: AUDIT_ACTIONS.serialCreated,
            targetType: 'rental_unit',
            targetId: ref.id,
            targetName: `${productName(serialForm.productId)} · ${serialNumber}`,
            impactLevel: 'major',
            description: `Serial creado: ${productName(serialForm.productId)} · ${serialNumber}`,
          });
          toast.success(t('inv.serials.new'));
          setInvView('main');
          setSerialForm(EMPTY_SERIAL_FORM);
          setSerialPhotoFile(null);
        } catch (err: any) {
          toast.error(`${t('inv.error.save')}: ${err.message}`);
        } finally {
          setSavingSerial(false);
        }
      },
    });
  };

  const handleChangeSerialStatus = async (unit: RentalUnit, statusId: string) => {
    if (!currentUser || !canWrite || !unit.id || !statusId || statusId === unit.statusId) return;
    if (unit.statusId === 'dado_de_baja') return; // baja permanente: no se reactiva
    try {
      const now = new Date().toISOString();
      const status = serialStatuses.find(s => s.id === statusId);
      await updateDoc(doc(db, CATALOG_COLLECTIONS.rentalUnits, unit.id), {
        statusId,
        updatedAt: now,
        updatedBy: currentUser.name,
      });
      await logAction({
        action: AUDIT_ACTIONS.serialStatusChanged,
        targetType: 'rental_unit',
        targetId: unit.id,
        targetName: `${productName(unit.productId)} · ${unit.serialNumber}`,
        impactLevel: 'minor',
        description: `Estado de serial cambiado: ${unit.serialNumber} → ${status?.name || statusId}`,
      });
      toast.success(t('inv.common.save'));
    } catch (err: any) {
      toast.error(`${t('inv.error.save')}: ${err.message}`);
    }
  };

  const startEditSerial = (unit: RentalUnit) => {
    setEditingSerialId(unit.id || null);
    setSerialEditDraft({ size: unit.size || '', notes: unit.notes || '' });
  };

  const handleSaveSerialEdit = async (unit: RentalUnit) => {
    if (!currentUser || !canWrite || !unit.id) return;
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, CATALOG_COLLECTIONS.rentalUnits, unit.id), {
        size: serialEditDraft.size.trim() || null,
        notes: serialEditDraft.notes.trim() || null,
        updatedAt: now,
        updatedBy: currentUser.name,
      });
      await logAction({
        action: AUDIT_ACTIONS.serialUpdated,
        targetType: 'rental_unit',
        targetId: unit.id,
        targetName: `${productName(unit.productId)} · ${unit.serialNumber}`,
        impactLevel: 'minor',
        description: `Serial actualizado: ${unit.serialNumber} (talla/notas)`,
      });
      toast.success(t('inv.common.save'));
      setEditingSerialId(null);
    } catch (err: any) {
      toast.error(`${t('inv.error.save')}: ${err.message}`);
    }
  };

  const openRetireSerial = (unit: RentalUnit) => {
    setRetiringUnit(unit);
    setRetirePhotoFile(null);
    setRetireReason('');
  };

  const handleRetireSerial = async () => {
    if (!currentUser || !retiringUnit?.id) return;
    const reason = retireReason.trim();
    if (!retirePhotoFile) return toast.error(t('inv.serials.retirePhotoRequired'));
    if (!reason) return toast.error(t('inv.serials.retireReasonRequired'));
    const unit = retiringUnit;
    await executeWithConfirm({
      level: 'sensitive',
      title: t('inv.serials.retireTitle'),
      description: `${productName(unit.productId)} · ${unit.serialNumber}\n${t('inv.serials.retireConfirmDesc')}`,
      action: async () => {
        setSavingRetire(true);
        try {
          const photoUrl = await uploadImage(retirePhotoFile, 'serials');
          const now = new Date().toISOString();
          await updateDoc(doc(db, CATALOG_COLLECTIONS.rentalUnits, unit.id!), {
            statusId: 'dado_de_baja',
            photoUrl,
            notes: `${reason} · Baja permanente`,
            updatedAt: now,
            updatedBy: currentUser.name,
          });
          await logAction({
            action: AUDIT_ACTIONS.serialStatusChanged,
            targetType: 'rental_unit',
            targetId: unit.id!,
            targetName: `${productName(unit.productId)} · ${unit.serialNumber}`,
            impactLevel: 'sensitive',
            description: `Baja permanente del serial ${unit.serialNumber}: ${reason}`,
          });
          toast.success(t('inv.serials.retireDone'));
          setRetiringUnit(null);
          setRetirePhotoFile(null);
          setRetireReason('');
        } catch (err: any) {
          toast.error(`${t('inv.error.save')}: ${err.message}`);
        } finally {
          setSavingRetire(false);
        }
      },
    });
  };

  // Envío a reparación desde la ficha del producto (punto 13): con seriales,
  // selección de unidades disponibles + motivo; sin seriales, el botón de la
  // ficha deriva a un movimiento de salida tipo ajuste con motivo "Reparación"
  const openRepairDialog = (productId: string) => {
    setRepairProductId(productId);
    setRepairUnitIds([]);
    setRepairReason('');
  };

  const handleSendRepair = async () => {
    if (!currentUser || !canWrite || !repairProductId) return;
    const reason = repairReason.trim() || 'Reparación';
    const units = rentalUnits.filter(u => repairUnitIds.includes(u.id || ''));
    if (units.length === 0) return toast.error(t('inv.repair.noAvailable'));
    await executeWithConfirm({
      level: 'major',
      title: t('inv.repair.title'),
      description: `${productName(repairProductId)} · ${units.length}`,
      action: async () => {
        try {
          const now = new Date().toISOString();
          const repairStatus = serialStatuses.find(s => s.id === 'en_reparacion')?.id
            ?? serialStatuses.find(s => s.blocksRental)?.id;
          if (!repairStatus) return toast.error(t('inv.error.save'));
          for (const unit of units) {
            await updateDoc(doc(db, CATALOG_COLLECTIONS.rentalUnits, unit.id!), {
              statusId: repairStatus,
              notes: `${reason} · Enviado a reparación`,
              updatedAt: now,
              updatedBy: currentUser.name,
            });
          }
          await logAction({
            action: AUDIT_ACTIONS.serialStatusChanged,
            targetType: 'rental_unit',
            targetId: repairProductId,
            targetName: `${productName(repairProductId)} · ${units.map(u => u.serialNumber).join(', ')}`,
            impactLevel: 'major',
            description: `Unidades enviadas a reparación: ${productName(repairProductId)} · ${units.length} · motivo: ${reason}`,
          });
          toast.success(t('inv.repair.done'));
          setRepairProductId(null);
          setRepairUnitIds([]);
          setRepairReason('');
        } catch (err: any) {
          toast.error(`${t('inv.error.save')}: ${err.message}`);
        }
      },
    });
  };

  // Seriales agrupados por producto rentable (para el render)
  const serialGroups = useMemo(() => {
    const groups = new Map<string, RentalUnit[]>();
    for (const unit of rentalUnits) {
      const list = groups.get(unit.productId) || [];
      list.push(unit);
      groups.set(unit.productId, list);
    }
    return [...groups.entries()]
      .map(([productId, units]) => ({ product: products.find(p => p.id === productId), units }))
      .filter(g => g.product && g.product.isActive)
      .sort((a, b) => (a.product!.name || '').localeCompare(b.product!.name || ''));
  }, [rentalUnits, products]);

  // ═══════════════════════════════════════════════════════════════════
  // QR / ESCANER / DEEP LINKS (FASE 1B-serials)
  // ═══════════════════════════════════════════════════════════════════

  const openProductQr = (product: Product) =>
    setQrDialog({
      title: t('inv.qr.productTitle'),
      subtitle: `${t('inv.qr.product')}: ${product.name}`,
      qrText: `${window.location.origin}/requisiciones?product=${product.id}`,
    });

  const openLocationQr = (location: Location) =>
    setQrDialog({
      title: t('inv.qr.locationTitle'),
      subtitle: `${t('inv.qr.location')}: ${location.name}`,
      qrText: `${window.location.origin}/requisiciones?location=${location.id}`,
    });

  const openSerialQr = (unit: RentalUnit) =>
    setQrDialog({
      title: t('inv.serials.viewQr'),
      subtitle: `${t('inv.qr.serial')}: ${unit.serialNumber}`,
      qrText: `${window.location.origin}/requisiciones?serial=${unit.id}`,
    });

  // Resultado de un escaneo (o deep link). Punto 13: el escáner es el centro
  // de operaciones — un QR de producto abre su FICHA con acciones directas;
  // cuando el escaneo nació de un selector de producto (escaneo opcional en
  // formularios), selecciona el producto en ese formulario en vez de abrir la ficha
  const revealTarget = (kind: 'product' | 'location' | 'serial', id: string) => {
    if (kind === 'product') {
      setProductDetailId(id);
      setInvView('product');
    } else if (kind === 'location') {
      setStockView('location');
      setInvView('stock');
    } else {
      setInvView('serials');
    }
    setExpandedIds(new Set([id]));
  };

  const handleScanResult = (kind: 'product' | 'location' | 'serial', id: string) => {
    if (scanContext === 'count') {
      handleCountScan(kind, id);
      return;
    }
    if (scanContext === 'receive') {
      handleReceiveScan(kind, id);
      return;
    }
    // Escaneo opcional dentro de un selector de producto: selecciona y listo
    const pick = scanPickRef.current;
    if (pick) {
      if (kind !== 'product') {
        toast.error(t('inv.scanner.unrecognized'));
        return;
      }
      scanPickRef.current = null;
      setScannerOpen(false);
      pick(id);
      return;
    }
    setScannerOpen(false);
    revealTarget(kind, id);
  };

  // Escaneo dentro de un conteo cíclico:
  // - QR de serial (producto serializado): suma 1 a ese producto; no admite
  //   doble conteo del mismo serial y no permite entrada manual.
  // - QR de producto (consumibles u otros): salta a ese producto de la lista.
  const handleCountScan = (kind: 'product' | 'location' | 'serial', id: string) => {
    const session = countingSession;
    if (!session) {
      setScannerOpen(false);
      return;
    }
    if (kind === 'serial') {
      const unit = rentalUnits.find(u => u.id === id);
      const productId = unit?.productId;
      if (!productId || !countRows.some(r => r.productId === productId)) {
        toast.error(t('inv.counts.serialNotInCount'));
        return;
      }
      const already = scannedSerials[productId] ?? [];
      if (already.includes(id)) {
        toast.error(t('inv.counts.serialAlreadyCounted'));
        return;
      }
      setScannedSerials(prev => ({ ...prev, [productId]: [...already, id] }));
      const current = Number(countsDraft[productId] ?? 0);
      setCountsDraft(d => ({ ...d, [productId]: String((Number.isFinite(current) ? current : 0) + 1) }));
      toast.success(productName(productId));
      return;
    }
    if (kind === 'product') {
      if (!countRows.some(r => r.productId === id)) {
        toast.error(t('inv.counts.productNotInCount'));
        return;
      }
      setScannerOpen(false);
      setCountHighlightId(id);
      setTimeout(() => {
        document.getElementById(`count-row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
      setTimeout(() => setCountHighlightId(null), 1800);
      return;
    }
    toast.error(t('inv.counts.productNotInCount'));
  };

  // Escaneo en la recepción de una transferencia (punto 11):
  // - seriales: confirma la unidad que llegó (alternativa a marcarla en la lista)
  // - consumibles con QR: el QR del producto confirma la recepción
  const handleReceiveScan = (kind: 'product' | 'location' | 'serial', id: string) => {
    const transfer = transfers.find(x => x.id === receiveTransferId);
    if (!transfer) {
      setScannerOpen(false);
      return;
    }
    if (kind === 'product') {
      if (id !== transfer.productId) {
        toast.error(t('inv.transfers.validation.serialNotForProduct'));
        return;
      }
      setReceiveScanConfirmed(true);
      toast.success(t('inv.receive.scanConfirmed'));
      return;
    }
    if (kind !== 'serial') {
      toast.error(t('inv.transfers.validation.serialNotForProduct'));
      return;
    }
    const unit = rentalUnits.find(u => u.id === id);
    if (!unit || unit.productId !== transfer.productId) {
      toast.error(t('inv.transfers.validation.serialNotForProduct'));
      return;
    }
    setReceiveSerialIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    toast.success(unit.serialNumber);
  };

  // Deshace el último serial escaneado de un producto (conteo por QR)
  const undoLastScan = (productId: string) => {
    const list = scannedSerials[productId] ?? [];
    if (list.length === 0) return;
    setScannedSerials(prev => ({ ...prev, [productId]: list.slice(0, -1) }));
    const current = Number(countsDraft[productId] ?? 0);
    setCountsDraft(d => ({ ...d, [productId]: String(Math.max(0, (Number.isFinite(current) ? current : 0) - 1)) }));
  };

  // Deep links: ?product= / ?location= / ?serial= → sección correspondiente
  // (ficha de producto / stock por ubicación / seriales) con tarjeta expandida
  useEffect(() => {
    if (!enabled || deepLinkHandled.current) return;
    const product = searchParams.get('product');
    const location = searchParams.get('location');
    const serial = searchParams.get('serial');
    if (!product && !location && !serial) return;
    if (product) revealTarget('product', product);
    else if (location) revealTarget('location', location);
    else if (serial) revealTarget('serial', serial);
    setSearchParams({}, { replace: true });
    deepLinkHandled.current = true;
  }, [enabled, searchParams, setSearchParams]);

  // ═══════════════════════════════════════════════════════════════════
  // CATÁLOGO: TIPOS DE MOVIMIENTO (movementTypes)
  // ═══════════════════════════════════════════════════════════════════

  const handleCreateMovementType = async () => {
    if (!currentUser || !canWrite) return;
    if (!mtNewName.trim()) return toast.error(t('inv.validation.nameRequired'));
    setSavingCatalogs(true);
    try {
      const ref = await addDoc(collection(db, CATALOG_COLLECTIONS.movementTypes), {
        tenantId,
        name: mtNewName.trim(),
        nameEn: mtNewNameEn.trim() || null,
        isOutput: mtNewIsOutput,
        isActive: true,
      });
      await logAction({
        action: AUDIT_ACTIONS.movementTypeCreated,
        targetType: 'movement_type',
        targetId: ref.id,
        targetName: mtNewName.trim(),
        impactLevel: 'minor',
        description: `Tipo de movimiento creado: ${mtNewName.trim()}`,
      });
      setMtNewName('');
      setMtNewNameEn('');
      setMtNewIsOutput(false);
    } catch (err: any) {
      toast.error(`${t('inv.error.save')}: ${err.message}`);
    } finally {
      setSavingCatalogs(false);
    }
  };

  const handleRenameMovementType = async () => {
    if (!currentUser || !canWrite || !editingMtId || !editingMtName.trim()) return;
    setSavingCatalogs(true);
    try {
      await updateDoc(doc(db, CATALOG_COLLECTIONS.movementTypes, editingMtId), {
        name: editingMtName.trim(),
        nameEn: editingMtNameEn.trim() || null,
      });
      await logAction({
        action: AUDIT_ACTIONS.movementTypeUpdated,
        targetType: 'movement_type',
        targetId: editingMtId,
        targetName: editingMtName.trim(),
        impactLevel: 'minor',
        description: `Tipo de movimiento renombrado: ${editingMtName.trim()}`,
      });
      toast.success(t('inv.catalogs.mt.renamed'));
      setEditingMtId(null);
      setEditingMtName('');
      setEditingMtNameEn('');
    } catch (err: any) {
      toast.error(`${t('inv.error.save')}: ${err.message}`);
    } finally {
      setSavingCatalogs(false);
    }
  };

  const handleToggleMovementTypeActive = async (mt: MovementType) => {
    if (!currentUser || !canWrite || !mt.id) return;
    try {
      await updateDoc(doc(db, CATALOG_COLLECTIONS.movementTypes, mt.id), {
        isActive: !mt.isActive,
      });
      await logAction({
        action: AUDIT_ACTIONS.movementTypeUpdated,
        targetType: 'movement_type',
        targetId: mt.id,
        targetName: mt.name,
        impactLevel: 'minor',
        description: mt.isActive
          ? `Tipo de movimiento desactivado: ${mt.name}`
          : `Tipo de movimiento activado: ${mt.name}`,
      });
    } catch (err: any) {
      toast.error(`${t('inv.error.save')}: ${err.message}`);
    }
  };

  const handleSeedMovementTypes = async () => {
    if (!currentUser || !canWrite) return;
    await executeWithConfirm({
      level: 'minor',
      title: t('inv.catalogs.mt.seedsConfirmTitle'),
      description: t('inv.catalogs.mt.seedsConfirmDesc'),
      action: async () => {
        setSavingCatalogs(true);
        try {
          const now = new Date().toISOString();
          let created = 0;
          let existing = 0;
          for (const seed of SEED_MOVEMENT_TYPES) {
            const ref = doc(db, CATALOG_COLLECTIONS.movementTypes, seed.id);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              if (!snap.data()?.name) await setDoc(ref, { name: seed.name }, { merge: true });
              existing++;
            } else {
              await setDoc(ref, {
                tenantId,
                name: seed.name,
                nameEn: seed.nameEn,
                isOutput: seed.isOutput,
                isActive: true,
                createdAt: now,
                createdBy: currentUser.name,
              }, { merge: true });
              created++;
            }
          }
          await logAction({
            action: AUDIT_ACTIONS.movementTypesSeeded,
            targetType: 'movement_type',
            targetId: 'initial-catalog',
            targetName: 'Catálogo inicial de tipos de movimiento',
            impactLevel: 'minor',
            description: `Tipos de movimiento iniciales cargados: ${created} nuevos (${existing} ya existían)`,
          });
          if (created === 0) {
            toast.info(t('inv.catalogs.seedsAlreadyLoaded'));
          } else {
            toast.success(
              t('inv.catalogs.mt.seedsSummary')
                .replace('{created}', String(created))
                .replace('{existing}', String(existing))
            );
          }
        } catch (err: any) {
          toast.error(`${t('inv.error.save')}: ${err.message}`);
        } finally {
          setSavingCatalogs(false);
        }
      },
    });
  };

  // ═══════════════════════════════════════════════════════════════════
  // CATÁLOGO: ESTADOS DE CICLO DE VIDA (serialStatuses)
  // ═══════════════════════════════════════════════════════════════════

  const handleCreateSerialStatus = async () => {
    if (!currentUser || !canWrite) return;
    if (!ssNewName.trim()) return toast.error(t('inv.validation.nameRequired'));
    setSavingCatalogs(true);
    try {
      const ref = await addDoc(collection(db, CATALOG_COLLECTIONS.serialStatuses), {
        tenantId,
        name: ssNewName.trim(),
        nameEn: ssNewNameEn.trim() || null,
        blocksRental: ssNewBlocksRental,
        isActive: true,
      });
      await logAction({
        action: AUDIT_ACTIONS.serialStatusCreated,
        targetType: 'serial_status',
        targetId: ref.id,
        targetName: ssNewName.trim(),
        impactLevel: 'minor',
        description: `Estado de ciclo de vida creado: ${ssNewName.trim()}`,
      });
      setSsNewName('');
      setSsNewNameEn('');
      setSsNewBlocksRental(false);
    } catch (err: any) {
      toast.error(`${t('inv.error.save')}: ${err.message}`);
    } finally {
      setSavingCatalogs(false);
    }
  };

  const handleRenameSerialStatus = async () => {
    if (!currentUser || !canWrite || !editingSsId || !editingSsName.trim()) return;
    setSavingCatalogs(true);
    try {
      await updateDoc(doc(db, CATALOG_COLLECTIONS.serialStatuses, editingSsId), {
        name: editingSsName.trim(),
        nameEn: editingSsNameEn.trim() || null,
      });
      await logAction({
        action: AUDIT_ACTIONS.serialStatusUpdated,
        targetType: 'serial_status',
        targetId: editingSsId,
        targetName: editingSsName.trim(),
        impactLevel: 'minor',
        description: `Estado de ciclo de vida renombrado: ${editingSsName.trim()}`,
      });
      toast.success(t('inv.catalogs.ss.renamed'));
      setEditingSsId(null);
      setEditingSsName('');
      setEditingSsNameEn('');
    } catch (err: any) {
      toast.error(`${t('inv.error.save')}: ${err.message}`);
    } finally {
      setSavingCatalogs(false);
    }
  };

  const handleToggleSerialStatusActive = async (ss: SerialStatus) => {
    if (!currentUser || !canWrite || !ss.id) return;
    try {
      await updateDoc(doc(db, CATALOG_COLLECTIONS.serialStatuses, ss.id), {
        isActive: !ss.isActive,
      });
      await logAction({
        action: AUDIT_ACTIONS.serialStatusUpdated,
        targetType: 'serial_status',
        targetId: ss.id,
        targetName: ss.name,
        impactLevel: 'minor',
        description: ss.isActive
          ? `Estado de ciclo de vida desactivado: ${ss.name}`
          : `Estado de ciclo de vida activado: ${ss.name}`,
      });
    } catch (err: any) {
      toast.error(`${t('inv.error.save')}: ${err.message}`);
    }
  };

  const handleSeedSerialStatuses = async () => {
    if (!currentUser || !canWrite) return;
    await executeWithConfirm({
      level: 'minor',
      title: t('inv.catalogs.ss.seedsConfirmTitle'),
      description: t('inv.catalogs.ss.seedsConfirmDesc'),
      action: async () => {
        setSavingCatalogs(true);
        try {
          const now = new Date().toISOString();
          let created = 0;
          let existing = 0;
          for (const seed of SEED_SERIAL_STATUSES) {
            const ref = doc(db, CATALOG_COLLECTIONS.serialStatuses, seed.id);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              if (!snap.data()?.name) await setDoc(ref, { name: seed.name }, { merge: true });
              existing++;
            } else {
              await setDoc(ref, {
                tenantId,
                name: seed.name,
                nameEn: seed.nameEn,
                blocksRental: seed.blocksRental,
                isActive: true,
                createdAt: now,
                createdBy: currentUser.name,
              }, { merge: true });
              created++;
            }
          }
          await logAction({
            action: AUDIT_ACTIONS.serialStatusesSeeded,
            targetType: 'serial_status',
            targetId: 'initial-catalog',
            targetName: 'Catálogo inicial de estados de ciclo de vida',
            impactLevel: 'minor',
            description: `Estados iniciales cargados: ${created} nuevos (${existing} ya existían)`,
          });
          if (created === 0) {
            toast.info(t('inv.catalogs.seedsAlreadyLoaded'));
          } else {
            toast.success(
              t('inv.catalogs.ss.seedsSummary')
                .replace('{created}', String(created))
                .replace('{existing}', String(existing))
            );
          }
        } catch (err: any) {
          toast.error(`${t('inv.error.save')}: ${err.message}`);
        } finally {
          setSavingCatalogs(false);
        }
      },
    });
  };

  // ═══════════════════════════════════════════════════════════════════
  // FILTRADO DEL KARDEX (Movimientos)
  // ═══════════════════════════════════════════════════════════════════

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (filterProductId && m.productId !== filterProductId) return false;
      if (filterTypeId && m.movementTypeId !== filterTypeId) return false;
      if (filterLocationId && m.fromLocationId !== filterLocationId && m.toLocationId !== filterLocationId)
        return false;
      return true;
    });
  }, [movements, filterProductId, filterLocationId, filterTypeId]);

  // Formulario de transferencia (punto 14): primero origen/destino, luego
  // categoría y producto (buscador + escaneo opcional)
  const transferFormProducts = useMemo(() => {
    if (!transferCategoryId) return [];
    if (transferCategoryId === '__none__') return activeProducts.filter(p => !p.categoryId);
    return activeProducts.filter(p => p.categoryId === transferCategoryId);
  }, [activeProducts, transferCategoryId]);

  // Ajustes (punto 12): movimientos tipo 'ajuste' del kardex, con motivo,
  // fecha y quién — vista de solo lectura
  const adjustmentMovements = useMemo(
    () => movements.filter(m => m.movementTypeId === 'ajuste'),
    [movements]
  );

  // Filtrado de la pestaña Transferencias (punto 4): la lista base ya trae
  // TODAS las transferencias; el filtro solo decide cuáles se muestran
  const filteredTransfers = useMemo(
    () => (transferFilter === 'all' ? transfers : transfers.filter(tr => tr.status === transferFilter)),
    [transfers, transferFilter]
  );

  // Tarjetas-módulo (punto 12): SON la navegación del módulo. Pequeñas
  // (2-3 por fila en desktop, apiladas en móvil); cada una abre la pantalla
  // de su sección. La creación rápida vive DENTRO de cada sección (los botones
  // rápidos de Stock y los botones de cada lista se mantienen).
  const moduleCards: Array<{ id: string; icon: typeof Truck; title: string; desc: string; onClick: () => void }> = [
    { id: 'stock', icon: Package, title: t('inv.home.stock'), desc: t('inv.home.stockDesc'), onClick: () => setInvView('stock') },
    { id: 'movements', icon: ArrowDownUp, title: t('inv.home.movements'), desc: t('inv.home.movementsDesc'), onClick: () => setInvView('movements') },
    { id: 'transfers', icon: Truck, title: t('inv.home.transfers'), desc: t('inv.home.transfersDesc'), onClick: () => setInvView('transfers') },
    { id: 'counts', icon: ClipboardList, title: t('inv.home.counts'), desc: t('inv.home.countsDesc'), onClick: () => setInvView('counts') },
    { id: 'serials', icon: Box, title: t('inv.home.serials'), desc: t('inv.home.serialsDesc'), onClick: () => setInvView('serials') },
    { id: 'catalogs', icon: Tags, title: t('inv.home.catalogs'), desc: t('inv.home.catalogsDesc'), onClick: () => setInvView('catalogs') },
    { id: 'adjustments', icon: SlidersHorizontal, title: t('inv.home.adjustments'), desc: t('inv.home.adjustmentsDesc'), onClick: () => setInvView('adjustments') },
    {
      id: 'scan',
      icon: ScanLine,
      title: t('inv.home.scan'),
      desc: t('inv.home.scanDesc'),
      onClick: () => { scanPickRef.current = null; setScanContext('navigate'); setScannerOpen(true); },
    },
  ];

  // ═══════════════════════════════════════════════════════════════════
  // RENDER: placeholder si el módulo no está habilitado
  // ═══════════════════════════════════════════════════════════════════

  if (!enabled) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-10 max-w-md text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[#F5F5F7] flex items-center justify-center">
            <Construction className="h-7 w-7 text-[#86868B]" />
          </div>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">{t('inv.devTitle')}</h2>
          <p className="mt-2 text-sm text-[#86868B]">{t('inv.devSubtitle')}</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDER: carga / error
  // ═══════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-[#86868B]">
        {t('inv.loading')}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-red-600">
        {t('inv.error.load')}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  // Transferencia en recepción (pantalla interna, punto 8)
  const receivingTransfer = transfers.find(x => x.id === receiveTransferId) || null;

  return (
    <div className="space-y-4">
      {invView === 'main' && (
      <>
      {/* Tarjetas-módulo (punto 12): la navegación del módulo. 2-3 por fila
          en desktop, apiladas en móvil. La tarjeta "Registrar movimiento"
          grande se eliminó: los botones rápidos de Stock (Compra/Consumo/
          Ajuste/Transferencia) y el botón genérico del kardex ya cubren esa
          entrada; las creaciones viven dentro de cada sección. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {moduleCards.map(card => (
          <button
            key={card.id}
            type="button"
            onClick={card.onClick}
            className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-3 text-left transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
          >
            <div className="h-8 w-8 rounded-lg bg-corporate/10 flex items-center justify-center mb-2">
              <card.icon className="h-4 w-4 text-corporate" />
            </div>
            <div className="text-sm font-semibold text-[#1D1D1F]">{card.title}</div>
            <div className="text-[11px] text-[#86868B] mt-0.5 leading-snug">{card.desc}</div>
          </button>
        ))}
      </div>
      {!canWrite && (
        <p className="text-xs text-[#86868B]">{t('inv.readOnly')}</p>
      )}
      </>
      )}

      {/* ─── SECCIÓN: STOCK (pantalla completa, punto 12) ─── */}
      {invView === 'stock' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-[#F5F5F7] rounded-full p-1">
              <button
                onClick={() => setStockView('product')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  stockView === 'product' ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#86868B]'
                )}
              >
                {t('inv.stock.viewByProduct')}
              </button>
              <button
                onClick={() => setStockView('location')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  stockView === 'location' ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#86868B]'
                )}
              >
                {t('inv.stock.viewByLocation')}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {canWrite && (
                <>
                  <Button
                    size="sm"
                    onClick={() => openMovementFormFor('compra')}
                    className="gap-2 rounded-xl bg-corporate hover:bg-corporate/90"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {t('inv.quick.compra')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openTransferForm()}
                    className="gap-2 rounded-xl border-[#E5E5E7]"
                  >
                    <Truck className="h-4 w-4" />
                    {t('inv.quick.transferencia')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openMovementFormFor('consumo')}
                    className="gap-2 rounded-xl border-[#E5E5E7]"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    {t('inv.quick.consumo')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openMovementFormFor('ajuste')}
                    className="gap-2 rounded-xl border-[#E5E5E7]"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {t('inv.quick.ajuste')}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setScanContext('navigate'); setScannerOpen(true); }}
                className="gap-2 rounded-xl border-[#E5E5E7]"
              >
                <QrCode className="h-4 w-4" />
                {t('inv.stock.scanQr')}
              </Button>
            </div>
          </div>

          {/* Vista por producto */}
          {stockView === 'product' && (
            <div className="space-y-2">
              {activeProducts.length === 0 && (
                <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-8 text-center text-sm text-[#86868B]">
                  {t('inv.stock.noProducts')}
                  <div className="mt-1 text-xs">{t('inv.stock.noProductsHint')}</div>
                </div>
              )}
              {/* Punto 3 (ronda 4): un producto con doc de stock registrado se
                  muestra aunque su cantidad sea 0 (p. ej. "Cloro: 0 gal"); el
                  filtro anterior (quantity !== 0) lo ocultaba por completo */}
              {activeProducts.map(product => {
                const productStocks = stocks.filter(s => s.productId === product.id);
                if (productStocks.length === 0) return null;
                const serialized = isSerializedProduct(product.id!);
                const isOpen = expandedIds.has(product.id!);
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] overflow-hidden"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleExpanded(product.id!)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') toggleExpanded(product.id!);
                      }}
                      className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
                    >
                      {product.photoUrl ? (
                        <img
                          src={product.photoUrl}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover border border-[#E5E5E7]"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-[#F5F5F7] flex items-center justify-center">
                          <Package className="h-5 w-5 text-[#86868B]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[#1D1D1F] truncate">{product.name}</div>
                        <div className="text-xs text-[#86868B]">
                          {product.sku && <span className="mr-2">{product.sku}</span>}
                          <span>{unitName(product.unitId)}</span>
                        </div>
                        {/* Modelo final de seriales (punto 4): el stock de un
                            producto serializado se muestra por estado
                            ("12 disponibles · 3 rentados"), nunca plano */}
                        {serialized && (
                          <div className="mt-1">{renderUnitStatusChips(product.id!)}</div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation();
                          openProductQr(product);
                        }}
                        className="h-7 w-7 p-0 text-[#86868B] shrink-0"
                        title={t('inv.qr.scanProduct')}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-[#86868B] shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#86868B] shrink-0" />
                      )}
                    </div>
                    {isOpen && (
                      <div className="border-t border-[#E5E5E7] divide-y divide-[#F5F5F7]">
                        {productStocks.map(s => {
                          const isLow = s.quantity <= (s.minStock ?? Infinity);
                          const isEditingMm = editingMinMaxId === s.id;
                          return (
                            <div key={s.id} className="p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-[#86868B]" />
                                <span className="text-sm text-[#1D1D1F]">{locationName(s.locationId)}</span>
                                {serialized ? (
                                  <span className="text-xs text-[#86868B]">
                                    {t('inv.serialized.stockHint')}
                                  </span>
                                ) : (
                                  <span className="text-sm font-semibold text-[#1D1D1F]">
                                    {s.quantity} {unitName(product.unitId)}
                                  </span>
                                )}
                                {s.minStock != null && (
                                  <span className="text-xs text-[#86868B]">
                                    {t('inv.stock.min')} {s.minStock} · {t('inv.stock.max')}{' '}
                                    {s.maxStock ?? '—'}
                                  </span>
                                )}
                                {s.minStock != null && (
                                  <span className="text-[10px] text-[#86868B] w-full sm:w-auto">
                                    {t('inv.stock.minMaxHelp')}
                                  </span>
                                )}
                                {isLow && s.minStock != null && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                    {t('inv.stock.lowStock')}
                                  </span>
                                )}
                                <div className="ml-auto flex items-center gap-1">
                                  {canWrite && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openMovementForm(product.id, s.locationId)}
                                      className="h-7 text-xs rounded-lg border-[#E5E5E7]"
                                    >
                                      <ArrowDownUp className="h-3.5 w-3.5 mr-1" />
                                      {t('inv.stock.registerMovement')}
                                    </Button>
                                  )}
                                  {canSupervise && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEditMinMax(s)}
                                      title={t('inv.stock.editMinMax')}
                                      className="h-7 w-7 p-0 text-[#86868B]"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {renderTransitLines(s.productId, s.locationId, unitName(product.unitId))}
                              {isLow && s.minStock != null && product && (() => {
                                const draft = purchaseDraftFor(s.productId, s.locationId);
                                const supplier = product.preferredSupplierId
                                  ? suppliers.find(x => x.id === product.preferredSupplierId)
                                  : undefined;
                                const suggested = purchaseSuggestedQty(s);
                                const unit = unitName(product.unitId);
                                return (
                                  <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 space-y-1">
                                    <div className="text-[11px] font-semibold text-amber-800">
                                      {t('inv.stock.orderSuggestion')}
                                    </div>
                                    <div className="text-[11px] text-amber-800">
                                      {t('inv.stock.suggestedQty')}: {suggested} {unit}
                                    </div>
                                    <div className="text-[11px] text-amber-800">
                                      {t('inv.stock.preferredSupplier')}:{' '}
                                      {supplier?.name || t('inv.stock.noPreferredSupplier')}
                                      {supplier?.paymentTerms
                                        ? ` · ${t('inv.stock.paymentTerms')}: ${supplier.paymentTerms}`
                                        : ''}
                                    </div>
                                    <div className="pt-0.5">
                                      {draft ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] bg-white text-[#86868B] border border-amber-200">
                                          {t('inv.stock.orderDraftPending')}
                                        </span>
                                      ) : (
                                        <Button
                                          size="sm"
                                          onClick={() => handleCreatePurchaseRequisition(s)}
                                          disabled={savingPurchaseReq || suggested <= 0}
                                          className="h-7 text-xs rounded-lg bg-corporate"
                                        >
                                          <Send className="h-3.5 w-3.5 mr-1" />
                                          {t('inv.stock.sendOrder')}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                              {isEditingMm && (
                                <div className="mt-2 flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={minMaxDraft.min}
                                    onChange={e => setMinMaxDraft(d => ({ ...d, min: e.target.value }))}
                                    placeholder={t('inv.stock.min')}
                                    className="h-8 w-24 text-xs rounded-lg"
                                  />
                                  <Input
                                    type="number"
                                    value={minMaxDraft.max}
                                    onChange={e => setMinMaxDraft(d => ({ ...d, max: e.target.value }))}
                                    placeholder={t('inv.stock.max')}
                                    className="h-8 w-24 text-xs rounded-lg"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveMinMax(s)}
                                    className="h-8 text-xs rounded-lg bg-corporate"
                                  >
                                    {t('inv.common.save')}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingMinMaxId(null)}
                                    className="h-8 text-xs text-[#86868B]"
                                  >
                                    {t('inv.common.cancel')}
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Vista por ubicación */}
          {stockView === 'location' && (
            <div className="space-y-2">
              {activeLocations.map(location => {
                // Punto 3 (ronda 4): misma regla que la vista por producto —
                // el stock registrado en 0 sigue listándose
                const locationStocks = stocks.filter(s => s.locationId === location.id);
                const isOpen = expandedIds.has(location.id);
                return (
                  <div
                    key={location.id}
                    className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] overflow-hidden"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleExpanded(location.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') toggleExpanded(location.id);
                      }}
                      className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
                    >
                      <div className="h-10 w-10 rounded-lg bg-[#F5F5F7] flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-[#86868B]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[#1D1D1F]">{location.name}</div>
                        <div className="text-xs text-[#86868B]">
                          {locationStocks.length} {t('inv.tab.stock').toLowerCase()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation();
                          openLocationQr(location);
                        }}
                        className="h-7 w-7 p-0 text-[#86868B] shrink-0"
                        title={t('inv.qr.scanLocation')}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-[#86868B] shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#86868B] shrink-0" />
                      )}
                    </div>
                    {isOpen && (
                      <div className="border-t border-[#E5E5E7] divide-y divide-[#F5F5F7]">
                        {locationStocks.length === 0 && (
                          <div className="p-3 text-xs text-[#86868B]">{t('inv.stock.emptyLocation')}</div>
                        )}
                        {locationStocks.map(s => {
                          const product = products.find(p => p.id === s.productId);
                          const isLow = s.quantity <= (s.minStock ?? Infinity);
                          const serialized = isSerializedProduct(s.productId);
                          return (
                            <div key={s.id} className="p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-[#1D1D1F]">
                                  {product?.name || s.productId}
                                </span>
                                {serialized ? (
                                  <>
                                    <span className="text-xs text-[#86868B]">
                                      {t('inv.serialized.stockHint')}
                                    </span>
                                    {renderUnitStatusChips(s.productId)}
                                  </>
                                ) : (
                                  <span className="text-sm font-semibold text-[#1D1D1F]">
                                    {s.quantity} {unitName(product?.unitId || '')}
                                  </span>
                                )}
                                {s.minStock != null && (
                                  <span className="text-xs text-[#86868B]">
                                    {t('inv.stock.min')} {s.minStock} · {t('inv.stock.max')}{' '}
                                    {s.maxStock ?? '—'}
                                  </span>
                                )}
                                {s.minStock != null && (
                                  <span className="text-[10px] text-[#86868B] w-full sm:w-auto">
                                    {t('inv.stock.minMaxHelp')}
                                  </span>
                                )}
                                {isLow && s.minStock != null && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                    {t('inv.stock.lowStock')}
                                  </span>
                                )}
                                {product && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openProductQr(product)}
                                    className="h-7 w-7 p-0 text-[#86868B] ml-auto"
                                    title={t('inv.qr.scanProduct')}
                                  >
                                    <QrCode className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {canWrite && product && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMovementForm(product.id, location.id)}
                                    className="h-7 text-xs rounded-lg border-[#E5E5E7]"
                                  >
                                    <ArrowDownUp className="h-3.5 w-3.5 mr-1" />
                                    {t('inv.stock.registerMovement')}
                                  </Button>
                                )}
                              </div>
                              {renderTransitLines(s.productId, location.id, unitName(product?.unitId || ''))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── SECCIÓN: MOVIMIENTOS (kardex) ─── */}
      {invView === 'movements' && (
        <div className="space-y-4">
          <p className="text-xs text-[#86868B] bg-[#F5F5F7] rounded-xl px-4 py-3 border border-[#E5E5E7]">
            {t('inv.movements.help')}
          </p>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-[#86868B]" />
              <select
                value={filterProductId}
                onChange={e => setFilterProductId(e.target.value)}
                className="h-8 text-xs rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
              >
                <option value="">{t('inv.movements.filterProduct')}: {t('inv.movements.all')}</option>
                {activeProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                value={filterLocationId}
                onChange={e => setFilterLocationId(e.target.value)}
                className="h-8 text-xs rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
              >
                <option value="">{t('inv.movements.filterLocation')}: {t('inv.movements.all')}</option>
                {activeLocations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <select
                value={filterTypeId}
                onChange={e => setFilterTypeId(e.target.value)}
                className="h-8 text-xs rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
              >
                <option value="">{t('inv.movements.filterType')}: {t('inv.movements.all')}</option>
                {movementTypes.map(mt => (
                  <option key={mt.id} value={mt.id}>{movementTypeName(mt)}</option>
                ))}
              </select>
            </div>
            {canWrite && (
              <Button
                size="sm"
                onClick={() => openMovementForm()}
                className="ml-auto gap-2 rounded-xl bg-corporate hover:bg-corporate/90"
              >
                <Plus className="h-4 w-4" />
                {t('inv.stock.newMovement')}
              </Button>
            )}
          </div>

          {/* Lista cronológica inversa */}
          <div className="space-y-2">
            {filteredMovements.length === 0 && (
              <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-8 text-center text-sm text-[#86868B]">
                {t('inv.movements.empty')}
              </div>
            )}
            {filteredMovements.map(m => {
              const mt = movementTypes.find(x => x.id === m.movementTypeId);
              const isOpen = expandedIds.has(m.id!);
              const isIn = m.quantity > 0;
              return (
                <div
                  key={m.id}
                  className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpanded(m.id!)}
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-semibold shrink-0',
                        isIn
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      )}
                    >
                      {isIn ? '+' : ''}{m.quantity}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[#1D1D1F] truncate">
                        {productName(m.productId)}
                      </div>
                      <div className="text-xs text-[#86868B]">
                        {mt ? movementTypeName(mt) : m.movementTypeId}
                        {m.fromLocationId && ` · ${t('inv.movements.from')}: ${locationName(m.fromLocationId)}`}
                        {m.toLocationId && ` · ${t('inv.movements.to')}: ${locationName(m.toLocationId)}`}
                      </div>
                    </div>
                    <span className="text-xs text-[#86868B] shrink-0">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-[#86868B] shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#86868B] shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="border-t border-[#E5E5E7] p-3 space-y-1.5">
                      <DetailRow label={t('inv.movements.type')} value={mt ? movementTypeName(mt) : m.movementTypeId} />
                      <DetailRow label={t('inv.movements.product')} value={productName(m.productId)} />
                      <DetailRow
                        label={t('inv.movements.from')}
                        value={m.fromLocationId ? locationName(m.fromLocationId) : '—'}
                      />
                      <DetailRow
                        label={t('inv.movements.to')}
                        value={m.toLocationId ? locationName(m.toLocationId) : '—'}
                      />
                      <DetailRow label={t('inv.movements.reason')} value={m.reason || t('inv.movements.noReason')} />
                      <DetailRow label={t('inv.movements.user')} value={m.createdByName || '—'} />
                      <DetailRow
                        label={t('inv.movements.date')}
                        value={m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                      />
                      {m.referenceType && (
                        <DetailRow
                          label={t('inv.movements.reference')}
                          value={`${m.referenceType}${m.referenceId ? ` · ${m.referenceId}` : ''}`}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── SECCIÓN: TRANSFERENCIAS (FASE 1A-transfers) ─── */}
      {invView === 'transfers' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-[#86868B] bg-[#F5F5F7] rounded-xl px-4 py-3 border border-[#E5E5E7] flex-1 min-w-[220px]">
              {t('inv.transfers.help')}
            </p>
            {canWrite && (
              <Button
                size="sm"
                onClick={() => openTransferForm()}
                className="h-8 text-xs rounded-xl bg-corporate gap-2 shrink-0"
              >
                <Truck className="h-3.5 w-3.5" />
                {t('inv.transfers.new')}
              </Button>
            )}
          </div>

          {/* Filtro por estado (punto 4): la lista trae TODAS las transferencias */}
          {transfers.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'pendiente', 'en_transito', 'recibido', 'cancelado'] as TransferStatusFilter[]).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTransferFilter(f)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                    transferFilter === f
                      ? 'bg-corporate text-white border-corporate'
                      : 'bg-white text-[#1D1D1F] border-[#E5E5E7] hover:bg-[#F5F5F7]'
                  )}
                >
                  {f === 'all' ? t('inv.transfers.filter.all') : t(`inv.transfers.status.${f}`)}
                  {' '}
                  ({f === 'all' ? transfers.length : transfers.filter(tr => tr.status === f).length})
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {filteredTransfers.length === 0 && (
              <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-8 text-center text-sm text-[#86868B]">
                {t('inv.transfers.empty')}
              </div>
            )}
            {filteredTransfers.map(tr => {
              const isOpen = expandedIds.has(tr.id!);
              return (
                <div
                  key={tr.id}
                  className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpanded(tr.id!)}
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0',
                        TRANSFER_STATUS_BADGE[tr.status]
                      )}
                    >
                      {t(`inv.transfers.status.${tr.status}`)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[#1D1D1F] truncate">
                        {productName(tr.productId)}
                      </div>
                      <div className="text-xs text-[#86868B] truncate">
                        {tr.quantity} · {locationName(tr.fromLocationId)} → {locationName(tr.toLocationId)}
                      </div>
                    </div>
                    <span className="text-xs text-[#86868B] shrink-0">
                      {tr.createdAt ? new Date(tr.createdAt).toLocaleDateString() : '—'}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-[#86868B] shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#86868B] shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="border-t border-[#E5E5E7] p-3 space-y-1.5">
                      <DetailRow label={t('inv.movements.product')} value={productName(tr.productId)} />
                      <DetailRow label={t('inv.transfers.quantity')} value={String(tr.quantity)} />
                      <DetailRow
                        label={t('inv.transfers.from')}
                        value={locationName(tr.fromLocationId)}
                      />
                      <DetailRow
                        label={t('inv.transfers.to')}
                        value={locationName(tr.toLocationId)}
                      />
                      <DetailRow
                        label={t('inv.transfers.responsibleLabel')}
                        value={tr.responsibleName || '—'}
                      />
                      <DetailRow label={t('inv.transfers.createdBy')} value={tr.createdByName || '—'} />
                      <DetailRow
                        label={t('inv.movements.date')}
                        value={tr.createdAt ? new Date(tr.createdAt).toLocaleString() : '—'}
                      />
                      {tr.shippedByName && (
                        <>
                          <DetailRow label={t('inv.transfers.shippedBy')} value={tr.shippedByName} />
                          <DetailRow
                            label={t('inv.transfers.shippedAt')}
                            value={tr.shippedAt ? new Date(tr.shippedAt).toLocaleString() : '—'}
                          />
                        </>
                      )}
                      {tr.status === 'recibido' && (
                        <>
                          <DetailRow
                            label={t('inv.transfers.receivedByLabel')}
                            value={tr.receivedBy || '—'}
                          />
                          <DetailRow
                            label={t('inv.movements.date')}
                            value={tr.receivedAt ? new Date(tr.receivedAt).toLocaleString() : '—'}
                          />
                          {tr.receivedUnitIds && tr.receivedUnitIds.length > 0 && (
                            <DetailRow
                              label={t('inv.transfers.receivedUnits')}
                              value={tr.receivedUnitIds
                                .map(uid => rentalUnits.find(u => u.id === uid)?.serialNumber || uid)
                                .join(', ')}
                            />
                          )}
                        </>
                      )}
                      {tr.status === 'en_transito' && !locations.find(l => l.id === tr.toLocationId)?.responsibleDepartmentId && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          {t('inv.transfers.noDeptWarning')}
                        </p>
                      )}
                      {canWrite && tr.status === 'pendiente' && (
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleShipTransfer(tr)}
                            className="h-7 text-xs rounded-lg bg-corporate"
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
                            {t('inv.transfers.dispatch')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCancelTransfer(tr)}
                            className="h-7 text-xs rounded-lg border-[#E5E5E7]"
                          >
                            <Ban className="h-3.5 w-3.5 mr-1" />
                            {t('inv.transfers.cancel')}
                          </Button>
                        </div>
                      )}
                      {tr.status === 'en_transito' && (canWrite || canReceiveTransfer(tr)) && (
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          {canReceiveTransfer(tr) && (
                            <Button
                              size="sm"
                              onClick={() => openReceiveTransfer(tr)}
                              className="h-7 text-xs rounded-lg bg-corporate"
                            >
                              <Inbox className="h-3.5 w-3.5 mr-1" />
                              {t('inv.transfers.receive')}
                            </Button>
                          )}
                          {canWrite && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openCancelTransfer(tr)}
                              className="h-7 text-xs rounded-lg border-[#E5E5E7]"
                            >
                              <Ban className="h-3.5 w-3.5 mr-1" />
                              {t('inv.transfers.cancel')}
                            </Button>
                          )}
                          {!canReceiveTransfer(tr) && currentUser?.id && tr.createdBy === currentUser.id && (
                            <span className="text-[11px] text-[#86868B]">{t('inv.transfers.creatorHint')}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── SECCIÓN: CONTEOS (FASE 1A-counts) ─── */}
      {invView === 'counts' && (
        <div className="space-y-4">
          {!countingSession && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-[#86868B] bg-[#F5F5F7] rounded-xl px-4 py-3 border border-[#E5E5E7] flex-1 min-w-[220px]">
                {t('inv.counts.help')}
              </p>
              {canWrite && (
                <Button
                  size="sm"
                  onClick={() => { setCountForm(EMPTY_COUNT_FORM); setInvView('count-new'); }}
                  className="h-8 text-xs rounded-xl bg-corporate gap-2 shrink-0"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  {t('inv.counts.schedule')}
                </Button>
              )}
            </div>
          )}

          {/* Panel de captura del conteo en curso */}
          {countingSession ? (
            <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-[#1D1D1F] flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-corporate" />
                    {t('inv.counts.countingTitle')}
                  </h3>
                  <p className="text-xs text-[#86868B] mt-0.5">
                    {locationName(countingSession.locationId)}
                    {' · '}
                    {countingSession.blind ? t('inv.counts.blindYes') : t('inv.counts.blindNo')}
                  </p>
                  {countRows.some(r => productRequiresScan(r.productId)) && (
                    <p className="text-[11px] text-corporate mt-0.5">
                      {t('inv.counts.scanRequired')}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setScanContext('count'); setScannerOpen(true); }}
                  className="h-7 text-xs rounded-lg border-[#E5E5E7] gap-2 shrink-0"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  {t('inv.counts.scan')}
                </Button>
              </div>

              <div className="divide-y divide-[#F5F5F7]">
                {countRows.length === 0 && (
                  <p className="text-xs text-[#86868B] py-3">{t('inv.stock.emptyLocation')}</p>
                )}
                {countRows.map(s => {
                  const product = products.find(p => p.id === s.productId);
                  const needsScan = productRequiresScan(s.productId);
                  const scanned = scannedSerials[s.productId]?.length ?? 0;
                  const highlighted = countHighlightId === s.productId;
                  return (
                    <div
                      key={s.id}
                      id={`count-row-${s.productId}`}
                      className={cn('py-2 flex items-center gap-3 rounded-lg px-1 -mx-1', highlighted && 'bg-corporate/10')}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-[#1D1D1F] truncate flex items-center gap-1.5">
                          {product?.name || s.productId}
                          {needsScan && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-corporate/10 text-corporate shrink-0">
                              QR
                            </span>
                          )}
                        </div>
                        {!countingSession.blind && (
                          <div className="text-[11px] text-[#86868B]">
                            {t('inv.counts.expected')}: {s.quantity} {unitName(product?.unitId || '')}
                          </div>
                        )}
                        {needsScan && (
                          <div className="text-[11px] text-corporate">
                            {t('inv.counts.scannedCount').replace('{count}', String(scanned))}
                          </div>
                        )}
                      </div>
                      {needsScan ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[#1D1D1F] font-semibold w-10 text-right">
                            {countsDraft[s.productId] || '0'}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => undoLastScan(s.productId)}
                            disabled={scanned === 0}
                            title={t('inv.counts.undoScan')}
                            className="h-8 w-8 p-0 rounded-lg border-[#E5E5E7]"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={countsDraft[s.productId] ?? ''}
                          onChange={e =>
                            setCountsDraft(d => ({ ...d, [s.productId]: e.target.value }))
                          }
                          placeholder={t('inv.counts.counted')}
                          className="h-8 w-28 text-xs rounded-lg"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCountingId(null)}
                  className="h-7 text-xs text-[#86868B]"
                >
                  {t('inv.counts.backToList')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveCountsDraft}
                  className="h-7 text-xs rounded-lg border-[#E5E5E7]"
                >
                  {t('inv.counts.savePartial')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleFinishCount}
                  className="h-7 text-xs rounded-lg bg-corporate"
                >
                  {t('inv.counts.finish')}
                </Button>
              </div>
            </div>
          ) : (
            /* Lista de sesiones de conteo */
            <div className="space-y-2">
              {countSessions.length === 0 && (
                <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-8 text-center text-sm text-[#86868B]">
                  {t('inv.counts.empty')}
                </div>
              )}
              {countSessions.map(cs => {
                const isOpen = expandedIds.has(cs.id!);
                const diffs = cs.differences ?? [];
                return (
                  <div
                    key={cs.id}
                    className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] overflow-hidden"
                  >
                    <button
                      onClick={() => toggleExpanded(cs.id!)}
                      className="w-full flex items-center gap-3 p-3 text-left"
                    >
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0',
                          COUNT_STATUS_BADGE[cs.status]
                        )}
                      >
                        {t(`inv.counts.status.${cs.status}`)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[#1D1D1F] truncate">
                          {locationName(cs.locationId)}
                        </div>
                        <div className="text-xs text-[#86868B]">
                          {t(`inv.counts.frequency.${cs.frequency}`)}
                          {' · '}
                          {cs.blind ? t('inv.counts.blindYes') : t('inv.counts.blindNo')}
                        </div>
                      </div>
                      <span className="text-xs text-[#86868B] shrink-0">
                        {cs.scheduledAt ? new Date(cs.scheduledAt).toLocaleDateString() : '—'}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-[#86868B] shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#86868B] shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="border-t border-[#E5E5E7] p-3 space-y-1.5">
                        <DetailRow label={t('inv.counts.location')} value={locationName(cs.locationId)} />
                        <DetailRow label={t('inv.counts.frequency')} value={t(`inv.counts.frequency.${cs.frequency}`)} />
                        <DetailRow
                          label={t('inv.movements.type')}
                          value={cs.blind ? t('inv.counts.blindYes') : t('inv.counts.blindNo')}
                        />
                        <DetailRow
                          label={t('inv.counts.scheduledAt')}
                          value={cs.scheduledAt ? new Date(cs.scheduledAt).toLocaleString() : '—'}
                        />
                        {cs.startedAt && (
                          <DetailRow
                            label={t('inv.counts.startedAt')}
                            value={new Date(cs.startedAt).toLocaleString()}
                          />
                        )}
                        {cs.finishedAt && (
                          <DetailRow
                            label={t('inv.counts.finishedAt')}
                            value={new Date(cs.finishedAt).toLocaleString()}
                          />
                        )}
                        <DetailRow label={t('inv.counts.createdBy')} value={cs.createdByName || '—'} />
                        {cs.approvedBy && (
                          <>
                            <DetailRow label={t('inv.counts.approvedBy')} value={cs.approvedBy} />
                            <DetailRow
                              label={t('inv.counts.adjustmentReasonLabel')}
                              value={cs.adjustmentReason || '—'}
                            />
                          </>
                        )}

                        {/* Diferencias detectadas */}
                        {diffs.length > 0 && (
                          <div className="pt-2 space-y-1">
                            <p className="text-xs font-semibold text-[#1D1D1F]">
                              {t('inv.counts.differencesTitle')}
                            </p>
                            {diffs.map(d => (
                              <div key={d.productId} className="flex items-center gap-2 text-xs">
                                <span className="min-w-0 flex-1 truncate text-[#1D1D1F]">
                                  {productName(d.productId)}
                                </span>
                                <span className="text-[#86868B] shrink-0">
                                  {t('inv.counts.expected')}: {d.expected}
                                </span>
                                <span className="text-[#86868B] shrink-0">
                                  {t('inv.counts.counted')}: {d.counted}
                                </span>
                                <span
                                  className={cn(
                                    'px-1.5 py-0.5 rounded font-semibold shrink-0',
                                    d.delta > 0
                                      ? 'bg-green-50 text-green-700'
                                      : 'bg-red-50 text-red-700'
                                  )}
                                >
                                  {d.delta > 0 ? `+${d.delta}` : d.delta}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Acciones según estado */}
                        {canWrite && cs.status === 'programado' && (
                          <div className="pt-2">
                            <Button
                              size="sm"
                              onClick={() => handleStartCount(cs)}
                              className="h-7 text-xs rounded-lg bg-corporate"
                            >
                              <Play className="h-3.5 w-3.5 mr-1" />
                              {t('inv.counts.start')}
                            </Button>
                          </div>
                        )}
                        {cs.status === 'en_curso' && (
                          <div className="pt-2">
                            <Button
                              size="sm"
                              onClick={() => enterCounting(cs)}
                              className="h-7 text-xs rounded-lg bg-corporate"
                            >
                              <Play className="h-3.5 w-3.5 mr-1" />
                              {t('inv.counts.continue')}
                            </Button>
                          </div>
                        )}
                        {canWrite && cs.status === 'finalizado' && diffs.length > 0 && (
                          <div className="pt-2">
                            <Button
                              size="sm"
                              onClick={() => openAdjustment(cs)}
                              className="h-7 text-xs rounded-lg bg-corporate"
                            >
                              {t('inv.counts.applyAdjustment')}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── SUB-PESTAÑA: SERIALES (FASE 1B-serials) ─── */}
      {/* ─── SECCIÓN: SERIALES (FASE 1B-serials) ─── */}
      {invView === 'serials' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-[#86868B] bg-[#F5F5F7] rounded-xl px-4 py-3 border border-[#E5E5E7] flex-1 min-w-[220px]">
              {t('inv.serials.help')}
            </p>
            {canWrite && (
              <Button
                size="sm"
                onClick={() => openSerialForm()}
                className="h-8 text-xs rounded-xl bg-corporate gap-2 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('inv.serials.new')}
              </Button>
            )}
          </div>

          {serialGroups.length === 0 && (
            <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-8 text-center text-sm text-[#86868B]">
              {rentableProducts.length === 0 ? t('inv.serials.noRentable') : t('inv.serials.empty')}
            </div>
          )}

          {serialGroups.map(group => (
            <div
              key={group.product!.id}
              className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-[#1D1D1F] flex items-center gap-2">
                <Package className="h-4 w-4 text-corporate" />
                {group.product!.name}
                <span className="text-xs font-normal text-[#86868B]">
                  {group.units.length}
                </span>
              </h3>
              <div className="space-y-2">
                {group.units.map(unit => {
                  const status = serialStatuses.find(s => s.id === unit.statusId);
                  const isOpen = expandedIds.has(unit.id!);
                  const isEditing = editingSerialId === unit.id;
                  return (
                    <div
                      key={unit.id}
                      className="rounded-xl border border-[#E5E5E7] overflow-hidden"
                    >
                      <button
                        onClick={() => toggleExpanded(unit.id!)}
                        className="w-full flex items-center gap-3 p-3 text-left"
                      >
                        {unit.photoUrl ? (
                          <img
                            src={unit.photoUrl}
                            alt={unit.serialNumber}
                            className="h-10 w-10 rounded-lg object-cover border border-[#E5E5E7]"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-[#F5F5F7] flex items-center justify-center shrink-0">
                            <Box className="h-5 w-5 text-[#86868B]" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-[#1D1D1F] truncate">
                            {unit.serialNumber}
                          </div>
                          <div className="text-xs text-[#86868B]">
                            {unit.size && <span className="mr-2">{unit.size}</span>}
                            <span>{status ? (getLanguage() === 'en' && status.nameEn ? status.nameEn : status.name) : unit.statusId}</span>
                          </div>
                        </div>
                        {status?.blocksRental && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 shrink-0">
                            {t('inv.serials.blocksRental')}
                          </span>
                        )}
                        {unit.statusId === 'dado_de_baja' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F5F5F7] text-[#86868B] border border-[#E5E5E7] shrink-0">
                            {t('inv.serials.retired')}
                          </span>
                        )}
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-[#86868B] shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#86868B] shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="border-t border-[#E5E5E7] p-3 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {unit.photoUrl && (
                              <button
                                onClick={() => window.open(unit.photoUrl!, '_blank')}
                                className="shrink-0"
                                title={unit.serialNumber}
                              >
                                <img
                                  src={unit.photoUrl}
                                  alt={unit.serialNumber}
                                  className="h-16 w-16 rounded-lg object-cover border border-[#E5E5E7] hover:opacity-80 transition-opacity"
                                />
                              </button>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-lg font-semibold text-[#1D1D1F] break-words">
                                {unit.serialNumber}
                              </div>
                              {unit.size && (
                                <DetailRow label={t('inv.serials.size')} value={unit.size} />
                              )}
                              <div className="flex items-center gap-2 pt-1">
                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded-full text-[10px] font-medium border',
                                    unit.statusId === 'dado_de_baja'
                                      ? 'bg-[#F5F5F7] text-[#86868B] border-[#E5E5E7]'
                                      : status?.blocksRental
                                        ? 'bg-red-50 text-red-700 border-red-200'
                                        : 'bg-green-50 text-green-700 border-green-200'
                                  )}
                                >
                                  {unit.statusId === 'dado_de_baja'
                                    ? t('inv.serials.retired')
                                    : status ? (getLanguage() === 'en' && status.nameEn ? status.nameEn : status.name) : unit.statusId}
                                </span>
                                {status?.blocksRental && unit.statusId !== 'dado_de_baja' && (
                                  <span className="text-[11px] text-red-700">
                                    {t('inv.serials.blocksRental')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openSerialQr(unit)}
                              className="h-7 text-xs rounded-lg border-[#E5E5E7] gap-2 shrink-0"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                              {t('inv.serials.viewQr')}
                            </Button>
                          </div>
                          {unit.notes && (
                            <DetailRow label={t('inv.serials.notes')} value={unit.notes} />
                          )}
                          <DetailRow
                            label={t('inv.serials.createdAt')}
                            value={unit.createdAt ? new Date(unit.createdAt).toLocaleString() : '—'}
                          />
                          <DetailRow
                            label={t('inv.serials.updatedAt')}
                            value={unit.updatedAt ? new Date(unit.updatedAt).toLocaleString() : '—'}
                          />

                          {/* Historial de rentas del serial (WH-D2) */}
                          <div className="pt-2 border-t border-[#F5F5F7]">
                            <p className="text-xs font-medium text-[#86868B]">{t('inv.serials.history')}</p>
                            {ordersForSerial(unit.id!).length === 0 ? (
                              <p className="text-xs text-[#86868B] mt-1">{t('inv.serials.historyEmpty')}</p>
                            ) : (
                              <div className="mt-1.5 space-y-1.5">
                                {ordersForSerial(unit.id!).map(order => (
                                  <div
                                    key={order.id}
                                    className="bg-[#F5F5F7] rounded-xl px-3 py-2 space-y-0.5"
                                  >
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-xs font-medium text-[#1D1D1F]">
                                        {order.orderNumber != null
                                          ? `#${order.orderNumber}`
                                          : fmtSerialDate(order.createdAt)}
                                        {' · '}{order.clientName}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border bg-white text-[#1D1D1F] border-[#E5E5E7]">
                                        {rentalOrderStatusName(order.statusId)}
                                      </span>
                                      {unit.statusId === 'en_reparacion' && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                                          {t('inv.serials.inRepair')}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-[#86868B]">
                                      {t('inv.serials.outAt')}: {fmtSerialDate(order.dispatchedAt)}
                                      {' · '}{t('inv.serials.backAt')}:{' '}
                                      {fmtSerialDate(order.returnedAt || order.storedAt)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {(canWrite || canRetire) && unit.statusId !== 'dado_de_baja' && (
                            <div className="flex flex-wrap items-center gap-2 pt-2">
                              {canWrite && (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <Label className="text-xs text-[#86868B]">{t('inv.serials.changeStatus')}</Label>
                                    <select
                                      value={unit.statusId}
                                      onChange={e => handleChangeSerialStatus(unit, e.target.value)}
                                      className="h-7 text-xs rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
                                    >
                                      {activeSerialStatuses.map(s => (
                                        <option key={s.id} value={s.id}>
                                          {getLanguage() === 'en' && s.nameEn ? s.nameEn : s.name}
                                          {s.blocksRental ? ` · ${t('inv.catalogs.ss.blocksRental')}` : ''}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startEditSerial(unit)}
                                    className="h-7 text-xs rounded-lg border-[#E5E5E7] gap-1.5"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    {t('inv.serials.edit')}
                                  </Button>
                                </>
                              )}
                              {canRetire && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openRetireSerial(unit)}
                                  className="h-7 text-xs rounded-lg border-[#E5E5E7] gap-1.5 text-[#86868B]"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  {t('inv.serials.retire')}
                                </Button>
                              )}
                            </div>
                          )}

                          {canWrite && isEditing && (
                            <div className="pt-2 space-y-2 border-t border-[#F5F5F7]">
                              <Input
                                value={serialEditDraft.size}
                                onChange={e => setSerialEditDraft(d => ({ ...d, size: e.target.value }))}
                                placeholder={t('inv.serials.sizePlaceholder')}
                                className="h-8 text-xs rounded-lg"
                              />
                              <Input
                                value={serialEditDraft.notes}
                                onChange={e => setSerialEditDraft(d => ({ ...d, notes: e.target.value }))}
                                placeholder={t('inv.serials.notesPlaceholder')}
                                className="h-8 text-xs rounded-lg"
                              />
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveSerialEdit(unit)}
                                  className="h-7 text-xs rounded-lg bg-corporate"
                                >
                                  {t('inv.common.save')}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingSerialId(null)}
                                  className="h-7 text-xs text-[#86868B]"
                                >
                                  {t('inv.common.cancel')}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── SUB-PESTAÑA: CATÁLOGOS ─── */}
      {/* ─── SECCIÓN: CATÁLOGOS (movementTypes + serialStatuses) ─── */}
      {invView === 'catalogs' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Catálogo: Tipos de movimiento */}
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <ArrowDownUp className="h-4 w-4 text-corporate" />
                  {t('inv.catalogs.mt.title')}
                </h3>
                <p className="text-xs text-[#86868B] mt-0.5">{t('inv.catalogs.mt.subtitle')}</p>
              </div>
              {canWrite && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedMovementTypes}
                  disabled={savingCatalogs}
                  className="h-7 text-xs rounded-lg border-[#E5E5E7] shrink-0"
                >
                  <Tags className="h-3.5 w-3.5 mr-1" />
                  {t('inv.catalogs.mt.loadSeeds')}
                </Button>
              )}
            </div>

            {/* Crear */}
            {canWrite && (
              <div className="space-y-2">
                <Input
                  value={mtNewName}
                  onChange={e => setMtNewName(e.target.value)}
                  placeholder={t('inv.catalogs.mt.name')}
                  className="h-8 text-xs rounded-lg"
                />
                <Input
                  value={mtNewNameEn}
                  onChange={e => setMtNewNameEn(e.target.value)}
                  placeholder={t('inv.catalogs.mt.nameEn')}
                  className="h-8 text-xs rounded-lg"
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-[#1D1D1F]">
                    <input
                      type="checkbox"
                      checked={mtNewIsOutput}
                      onChange={e => setMtNewIsOutput(e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    {t('inv.catalogs.mt.isOutput')}
                  </label>
                  <Button
                    size="sm"
                    onClick={handleCreateMovementType}
                    disabled={savingCatalogs}
                    className="h-7 text-xs rounded-lg bg-corporate ml-auto"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t('inv.catalogs.mt.new')}
                  </Button>
                </div>
              </div>
            )}

            {/* Lista */}
            <div className="divide-y divide-[#F5F5F7]">
              {sortedMovementTypes.length === 0 && (
                <p className="text-xs text-[#86868B] py-3">{t('inv.catalogs.mt.empty')}</p>
              )}
              {sortedMovementTypes.map(mt =>
                editingMtId === mt.id ? (
                  <div key={mt.id} className="py-2 space-y-1.5">
                    <Input
                      value={editingMtName}
                      onChange={e => setEditingMtName(e.target.value)}
                      placeholder={t('inv.catalogs.mt.name')}
                      className="h-8 text-xs rounded-lg"
                    />
                    <Input
                      value={editingMtNameEn}
                      onChange={e => setEditingMtNameEn(e.target.value)}
                      placeholder={t('inv.catalogs.mt.nameEn')}
                      className="h-8 text-xs rounded-lg"
                    />
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        onClick={handleRenameMovementType}
                        disabled={savingCatalogs}
                        className="h-7 text-xs rounded-lg bg-corporate"
                      >
                        {t('inv.common.save')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingMtId(null); setEditingMtName(''); setEditingMtNameEn(''); }}
                        className="h-7 text-xs text-[#86868B]"
                      >
                        {t('inv.common.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div key={mt.id} className="py-2 flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-sm truncate', mt.isActive ? 'text-[#1D1D1F]' : 'text-[#86868B] line-through')}>
                        {movementTypeName(mt)}
                      </div>
                      <div className="text-[11px] text-[#86868B]">
                        {mt.isOutput ? t('inv.catalogs.mt.isOutput') : t('inv.movements.in')}
                      </div>
                    </div>
                    {canWrite && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingMtId(mt.id!);
                            setEditingMtName(mt.name);
                            setEditingMtNameEn(mt.nameEn || '');
                          }}
                          className="h-7 w-7 p-0 text-[#86868B]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleMovementTypeActive(mt)}
                          className={cn('h-7 w-7 p-0', mt.isActive ? 'text-green-600' : 'text-[#86868B]')}
                          title={mt.isActive ? t('inv.common.active') : t('inv.common.inactive')}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Catálogo: Estados de ciclo de vida (seriales) */}
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <Box className="h-4 w-4 text-corporate" />
                  {t('inv.catalogs.ss.title')}
                </h3>
                <p className="text-xs text-[#86868B] mt-0.5">{t('inv.catalogs.ss.subtitle')}</p>
              </div>
              {canWrite && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedSerialStatuses}
                  disabled={savingCatalogs}
                  className="h-7 text-xs rounded-lg border-[#E5E5E7] shrink-0"
                >
                  <Tags className="h-3.5 w-3.5 mr-1" />
                  {t('inv.catalogs.ss.loadSeeds')}
                </Button>
              )}
            </div>

            {/* Crear */}
            {canWrite && (
              <div className="space-y-2">
                <Input
                  value={ssNewName}
                  onChange={e => setSsNewName(e.target.value)}
                  placeholder={t('inv.catalogs.ss.name')}
                  className="h-8 text-xs rounded-lg"
                />
                <Input
                  value={ssNewNameEn}
                  onChange={e => setSsNewNameEn(e.target.value)}
                  placeholder={t('inv.catalogs.ss.nameEn')}
                  className="h-8 text-xs rounded-lg"
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-[#1D1D1F]">
                    <input
                      type="checkbox"
                      checked={ssNewBlocksRental}
                      onChange={e => setSsNewBlocksRental(e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    {t('inv.catalogs.ss.blocksRental')}
                  </label>
                  <Button
                    size="sm"
                    onClick={handleCreateSerialStatus}
                    disabled={savingCatalogs}
                    className="h-7 text-xs rounded-lg bg-corporate ml-auto"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t('inv.catalogs.ss.new')}
                  </Button>
                </div>
              </div>
            )}

            {/* Lista */}
            <div className="divide-y divide-[#F5F5F7]">
              {sortedSerialStatuses.length === 0 && (
                <p className="text-xs text-[#86868B] py-3">{t('inv.catalogs.ss.empty')}</p>
              )}
              {sortedSerialStatuses.map(ss =>
                editingSsId === ss.id ? (
                  <div key={ss.id} className="py-2 space-y-1.5">
                    <Input
                      value={editingSsName}
                      onChange={e => setEditingSsName(e.target.value)}
                      placeholder={t('inv.catalogs.ss.name')}
                      className="h-8 text-xs rounded-lg"
                    />
                    <Input
                      value={editingSsNameEn}
                      onChange={e => setEditingSsNameEn(e.target.value)}
                      placeholder={t('inv.catalogs.ss.nameEn')}
                      className="h-8 text-xs rounded-lg"
                    />
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        onClick={handleRenameSerialStatus}
                        disabled={savingCatalogs}
                        className="h-7 text-xs rounded-lg bg-corporate"
                      >
                        {t('inv.common.save')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingSsId(null); setEditingSsName(''); setEditingSsNameEn(''); }}
                        className="h-7 text-xs text-[#86868B]"
                      >
                        {t('inv.common.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div key={ss.id} className="py-2 flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-sm truncate', ss.isActive ? 'text-[#1D1D1F]' : 'text-[#86868B] line-through')}>
                        {getLanguage() === 'en' && ss.nameEn ? ss.nameEn : ss.name}
                      </div>
                      {ss.blocksRental && (
                        <div className="text-[11px] text-amber-700">{t('inv.catalogs.ss.blocksRental')}</div>
                      )}
                    </div>
                    {canWrite && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingSsId(ss.id!);
                            setEditingSsName(ss.name);
                            setEditingSsNameEn(ss.nameEn || '');
                          }}
                          className="h-7 w-7 p-0 text-[#86868B]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleSerialStatusActive(ss)}
                          className={cn('h-7 w-7 p-0', ss.isActive ? 'text-green-600' : 'text-[#86868B]')}
                          title={ss.isActive ? t('inv.common.active') : t('inv.common.inactive')}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {invView !== 'main' && (
      <>
      {/* Botón Volver de las pantallas internas (punto 8): secciones y
          formularios viven en pantalla completa con el mismo patrón */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setInvView('main')}
          className="gap-2 rounded-xl border-[#E5E5E7] text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('inv.view.back')}
        </Button>
      </div>

      {/* ─── PANTALLA INTERNA: REGISTRAR MOVIMIENTO (punto 8) ─── */}
      {invView === 'movement' && (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-4 sm:p-6">
          <h2 className="text-base font-semibold text-[#1D1D1F] mb-4">{t('inv.movementForm.title')}</h2>
          <div className="space-y-3">
            <p className="text-xs text-[#86868B] bg-[#F5F5F7] rounded-lg px-3 py-2">
              {t('inv.movementForm.help')}
            </p>
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.movementForm.category')}</Label>
              <select
                value={movementCategoryId}
                onChange={e => {
                  setMovementCategoryId(e.target.value);
                  setMovementForm(f => ({ ...f, productId: '' }));
                }}
                className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
              >
                <option value="">{t('inv.movementForm.selectCategory')}</option>
                {activeCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                {activeProducts.some(p => !p.categoryId) && (
                  <option value="__none__">{t('inv.movementForm.noCategory')}</option>
                )}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.movementForm.product')}</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <ProductSearchSelect
                    products={movementFormProducts}
                    value={movementForm.productId}
                    onChange={id => setMovementForm(f => ({ ...f, productId: id }))}
                    selectPlaceholder={movementCategoryId ? t('inv.movementForm.selectProduct') : t('inv.movementForm.selectCategory')}
                    searchPlaceholder={t('inv.movementForm.noMatches')}
                  />
                </div>
                {/* Escaneo opcional (puntos 13/14): selecciona el producto
                    escaneado en este formulario; nunca obligatorio */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    scanPickRef.current = id => {
                      const p = products.find(x => x.id === id);
                      setMovementCategoryId(p?.categoryId || '');
                      setMovementForm(f => ({ ...f, productId: id }));
                    };
                    setScanContext('navigate');
                    setScannerOpen(true);
                  }}
                  className="h-9 w-9 p-0 rounded-lg border-[#E5E5E7] shrink-0"
                  title={t('inv.product.scanToSelect')}
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Modelo final de seriales (punto 4b): los movimientos de
                CANTIDAD son solo para productos NO serializados */}
            {movementProduct?.isRentable && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 space-y-2">
                <div className="text-[11px] font-semibold text-amber-800">
                  {t('inv.serialized.blockTitle')}
                </div>
                <p className="text-[11px] text-amber-800">
                  {isInputMt ? t('inv.serialized.buyHelp') : t('inv.serialized.blockHelp')}
                </p>
                {isInputMt && (
                  <Button
                    size="sm"
                    onClick={() => openSerialForm(movementForm.productId)}
                    className="h-7 text-xs rounded-lg bg-corporate"
                  >
                    <Box className="h-3.5 w-3.5 mr-1" />
                    {t('inv.serialized.goSerials')}
                  </Button>
                )}
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.movementForm.type')}</Label>
              <select
                value={movementForm.movementTypeId}
                onChange={e => setMovementForm(f => ({ ...f, movementTypeId: e.target.value }))}
                className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
              >
                <option value="">{t('inv.movementForm.selectType')}</option>
                {activeMovementTypes.map(mt => (
                  <option key={mt.id} value={mt.id}>
                    {movementTypeName(mt)} {mt.isOutput ? '(-)' : '(+)'}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.movementForm.quantity')}</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={movementForm.quantity}
                onChange={e => setMovementForm(f => ({ ...f, quantity: e.target.value }))}
                className="h-9 text-sm rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {isInputMt ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#86868B]">{t('inv.movementForm.fromLocation')}</Label>
                    <div className="h-9 flex items-center px-2 rounded-lg border border-[#E5E5E7] bg-[#F5F5F7] text-sm text-[#86868B]">
                      {t('inv.movementForm.originFixedSupplier')}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#86868B]">{t('inv.movementForm.toLocation')}</Label>
                    <select
                      value={movementForm.toLocationId}
                      onChange={e => setMovementForm(f => ({ ...f, toLocationId: e.target.value }))}
                      className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
                    >
                      <option value="">{t('inv.movementForm.selectLocation')}</option>
                      {activeLocations.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#86868B]">{t('inv.movementForm.fromLocation')}</Label>
                    {autoOriginLocation ? (
                      <>
                        <div className="h-9 flex items-center px-2 rounded-lg border border-[#E5E5E7] bg-[#F5F5F7] text-sm text-[#1D1D1F]">
                          {autoOriginLocation.name}
                        </div>
                        <p className="text-[11px] text-corporate">
                          {t('inv.movementForm.originAutoHelp').replace('{location}', autoOriginLocation.name)}
                        </p>
                      </>
                    ) : (
                      <>
                        <select
                          value={movementForm.fromLocationId}
                          onChange={e => setMovementForm(f => ({ ...f, fromLocationId: e.target.value }))}
                          className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
                        >
                          <option value="">{t('inv.movementForm.selectLocation')}</option>
                          {movementOriginLocations.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                        {restrictOrigin && (
                          <p className="text-[11px] text-[#86868B]">{t('inv.movementForm.originDeptRestricted')}</p>
                        )}
                        {isOutputNonTransfer && !restrictOrigin && (
                          <p className="text-[11px] text-amber-700">{t('inv.movementForm.originNoDept')}</p>
                        )}
                      </>
                    )}
                  </div>
                  {isTransferMt ? (
                    <div className="space-y-1">
                      <Label className="text-xs text-[#86868B]">{t('inv.movementForm.toLocation')}</Label>
                      <select
                        value={movementForm.toLocationId}
                        onChange={e => setMovementForm(f => ({ ...f, toLocationId: e.target.value }))}
                        className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
                      >
                        <option value="">{t('inv.movementForm.selectLocation')}</option>
                        {activeLocations.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-xs text-[#86868B]">{t('inv.movementForm.toLocation')}</Label>
                      <div className="h-9 flex items-center px-2 rounded-lg border border-[#E5E5E7] bg-[#F5F5F7] text-sm text-[#86868B]">
                        {t('inv.movementForm.destFixedConsumption')}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            {isInputMt && (
              <div className="space-y-1">
                <Label className="text-xs text-[#86868B]">{t('inv.movementForm.supplier')}</Label>
                <select
                  value={movementForm.supplierId}
                  onChange={e => setMovementForm(f => ({ ...f, supplierId: e.target.value }))}
                  className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
                >
                  <option value="">{t('inv.movementForm.noSupplier')}</option>
                  {activeSuppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-[#86868B]">{t('inv.movementForm.originExternalHint')}</p>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">
                {t('inv.movementForm.reason')}
                {isAdjustMt && <span className="text-red-500"> *</span>}
              </Label>
              <Input
                value={movementForm.reason}
                onChange={e => setMovementForm(f => ({ ...f, reason: e.target.value }))}
                placeholder={t('inv.movementForm.reasonPlaceholder')}
                className="h-9 text-sm rounded-lg"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setInvView('main'); setMovementForm(EMPTY_MOVEMENT_FORM); setMovementCategoryId(''); }}
                className="text-xs text-[#86868B]"
              >
                {t('inv.common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveMovement}
                disabled={savingMovement || !!movementProduct?.isRentable}
                className="text-xs bg-corporate"
              >
                {t('inv.movementForm.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PANTALLA INTERNA: NUEVA TRANSFERENCIA (punto 8) ─── */}
      {invView === 'transfer-new' && (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-4 sm:p-6">
          <h2 className="text-base font-semibold text-[#1D1D1F] mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-corporate" />
            {t('inv.transfers.new')}
          </h2>
          <div className="space-y-3">
            {/* Punto 14: origen y destino PRIMERO, luego categoría → producto */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-[#86868B]">{t('inv.transfers.from')}</Label>
                <select
                  value={transferForm.fromLocationId}
                  onChange={e => setTransferForm(f => ({ ...f, fromLocationId: e.target.value }))}
                  className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
                >
                  <option value="">{t('inv.movementForm.selectLocation')}</option>
                  {activeLocations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#86868B]">{t('inv.transfers.to')}</Label>
                <select
                  value={transferForm.toLocationId}
                  onChange={e => setTransferForm(f => ({ ...f, toLocationId: e.target.value }))}
                  className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
                >
                  <option value="">{t('inv.movementForm.selectLocation')}</option>
                  {activeLocations
                    .filter(l => l.id !== transferForm.fromLocationId)
                    .map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.movementForm.category')}</Label>
              <select
                value={transferCategoryId}
                onChange={e => {
                  setTransferCategoryId(e.target.value);
                  setTransferForm(f => ({ ...f, productId: '' }));
                }}
                className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
              >
                <option value="">{t('inv.movementForm.selectCategory')}</option>
                {activeCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                {activeProducts.some(p => !p.categoryId) && (
                  <option value="__none__">{t('inv.movementForm.noCategory')}</option>
                )}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.movementForm.product')}</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <ProductSearchSelect
                    products={transferFormProducts}
                    value={transferForm.productId}
                    onChange={id => setTransferForm(f => ({ ...f, productId: id }))}
                    selectPlaceholder={transferCategoryId ? t('inv.movementForm.selectProduct') : t('inv.movementForm.selectCategory')}
                    searchPlaceholder={t('inv.movementForm.noMatches')}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    scanPickRef.current = id => {
                      const p = products.find(x => x.id === id);
                      setTransferCategoryId(p?.categoryId || '');
                      setTransferForm(f => ({ ...f, productId: id }));
                    };
                    setScanContext('navigate');
                    setScannerOpen(true);
                  }}
                  className="h-9 w-9 p-0 rounded-lg border-[#E5E5E7] shrink-0"
                  title={t('inv.product.scanToSelect')}
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.transfers.quantity')}</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={transferForm.quantity}
                onChange={e => setTransferForm(f => ({ ...f, quantity: e.target.value }))}
                className="h-9 text-sm rounded-lg"
              />
            </div>
            {transferForm.productId && (
              <div className="rounded-lg bg-[#F5F5F7] border border-[#E5E5E7] px-3 py-2 space-y-1">
                <div className="text-[11px] text-[#86868B]">
                  {t('inv.transfers.stockOrigin')}
                </div>
                <div className="text-xs text-[#1D1D1F] font-medium">
                  {t('inv.transfers.stockLine')
                    .replace('{location}', locationName(transferForm.fromLocationId) || '—')
                    .replace('{quantity}', String(stockFor(transferForm.productId, transferForm.fromLocationId)?.quantity ?? 0))
                    .replace('{unit}', unitName(products.find(p => p.id === transferForm.productId)?.unitId || ''))}
                </div>
                <div className="text-[11px] text-[#86868B] pt-1">
                  {t('inv.transfers.stockDestination')}
                </div>
                <div className="text-xs text-[#1D1D1F] font-medium">
                  {t('inv.transfers.stockLine')
                    .replace('{location}', locationName(transferForm.toLocationId) || '—')
                    .replace('{quantity}', String(stockFor(transferForm.productId, transferForm.toLocationId)?.quantity ?? 0))
                    .replace('{unit}', unitName(products.find(p => p.id === transferForm.productId)?.unitId || ''))}
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.transfers.responsible')}</Label>
              <select
                value={transferForm.responsibleUserId}
                onChange={e => setTransferForm(f => ({ ...f, responsibleUserId: e.target.value }))}
                className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
              >
                <option value="">{t('inv.transfers.selectResponsible')}</option>
                {activeUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setInvView('main'); setTransferForm(EMPTY_TRANSFER_FORM); setTransferCategoryId(''); }}
                className="text-xs text-[#86868B]"
              >
                {t('inv.common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleCreateTransfer}
                disabled={savingTransfer}
                className="text-xs bg-corporate"
              >
                {t('inv.common.create')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PANTALLA INTERNA: RECIBIR TRANSFERENCIA (punto 8) ─── */}
      {invView === 'receive' && (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-4 sm:p-6">
          <h2 className="text-base font-semibold text-[#1D1D1F] mb-4 flex items-center gap-2">
            <Inbox className="h-4 w-4 text-corporate" />
            {t('inv.transfers.receiveTitle')}
          </h2>
          {(() => {
            const needsUnits = receivingTransfer ? transferNeedsUnits(receivingTransfer) : false;
            const unitOptions = needsUnits && receivingTransfer
              ? rentalUnits.filter(u => u.productId === receivingTransfer.productId)
              : [];
            // Verificación obligatoria (punto 11): seriales → unidades
            // confirmadas; consumible con QR → QR del producto escaneado;
            // producto SIN QR → foto + firma obligatorias
            const receiveProduct = receivingTransfer
              ? products.find(p => p.id === receivingTransfer.productId)
              : undefined;
            const hasQr = productHasQr(receiveProduct);
            const unitsReady = !receivingTransfer || (needsUnits
              ? receiveSerialIds.length === receivingTransfer.quantity
              : hasQr
                ? receiveScanConfirmed
                : !!(receivePhoto && receiveSignature));
            return (
              <div className="space-y-3">
                {receivingTransfer && (
                  <p className="text-xs text-[#86868B]">
                    {productName(receivingTransfer.productId)} · {receivingTransfer.quantity} · {locationName(receivingTransfer.toLocationId)}
                  </p>
                )}
                <div className="space-y-1">
                  <Label className="text-xs text-[#86868B]">{t('inv.transfers.receivedByLabel')}</Label>
                  <Input
                    value={receivedByName}
                    onChange={e => setReceivedByName(e.target.value)}
                    placeholder={t('inv.transfers.receivedByPlaceholder')}
                    className="h-9 text-sm rounded-lg"
                  />
                </div>
                {needsUnits && receivingTransfer && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[#86868B]">{t('inv.transfers.serializedHint')}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[#1D1D1F]">
                        {t('inv.transfers.unitsReceived')}: {receiveSerialIds.length} / {receivingTransfer.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setScanContext('receive'); setScannerOpen(true); }}
                        className="h-7 text-xs rounded-lg border-[#E5E5E7] gap-2"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        {t('inv.transfers.scanUnit')}
                      </Button>
                    </div>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-[#E5E5E7] divide-y divide-[#F5F5F7]">
                      {unitOptions.length === 0 && (
                        <p className="px-3 py-2 text-xs text-[#86868B]">{t('inv.serials.empty')}</p>
                      )}
                      {unitOptions.map(u => {
                        const checked = receiveSerialIds.includes(u.id || '');
                        return (
                          <label
                            key={u.id}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-[#1D1D1F] cursor-pointer hover:bg-[#F5F5F7]"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setReceiveSerialIds(prev =>
                                  checked ? prev.filter(x => x !== u.id) : [...prev, u.id || '']
                                )
                              }
                              className="h-3.5 w-3.5 accent-corporate"
                            />
                            <span className="font-medium">{u.serialNumber}</span>
                            {u.size && <span className="text-[#86868B]">{u.size}</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Punto 11: consumible CON QR → escaneo obligatorio de
                    confirmación; SIN QR → foto + recuadro de firma */}
                {!needsUnits && receivingTransfer && hasQr && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[#86868B]">{t('inv.receive.scanConfirmHelp')}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-medium',
                        receiveScanConfirmed ? 'text-green-700' : 'text-[#1D1D1F]'
                      )}
                      >
                        {receiveScanConfirmed && <Check className="h-3.5 w-3.5" />}
                        {receiveScanConfirmed
                          ? t('inv.receive.scanConfirmed')
                          : `${t('inv.transfers.quantity')}: ${receivingTransfer.quantity}`}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setScanContext('receive'); setScannerOpen(true); }}
                        className="h-7 text-xs rounded-lg border-[#E5E5E7] gap-2"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        {t('inv.receive.scanConfirm')}
                      </Button>
                    </div>
                  </div>
                )}
                {!needsUnits && receivingTransfer && !hasQr && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[#86868B]">{t('inv.receive.noQrHelp')}</p>
                    <div className="space-y-1">
                      <Label className="text-xs text-[#86868B]">{t('inv.receive.photo')}</Label>
                      <div className="flex items-center gap-3">
                        {receivePhoto && (
                          <img
                            src={receivePhoto}
                            alt={t('inv.receive.photo')}
                            className="h-16 w-16 rounded-lg object-cover border border-[#E5E5E7]"
                          />
                        )}
                        <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-corporate hover:underline">
                          <Upload className="h-3.5 w-3.5" />
                          {t('inv.receive.photo')}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0] || null;
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => setReceivePhoto(typeof reader.result === 'string' ? reader.result : null);
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[#86868B]">{t('inv.receive.signature')}</Label>
                      <SignatureCanvas value={receiveSignature} onChange={setReceiveSignature} />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReceiveTransferId(null);
                      setReceiveSerialIds([]);
                      setReceiveScanConfirmed(false);
                      setReceivePhoto(null);
                      setReceiveSignature(null);
                      setInvView('main');
                    }}
                    className="text-xs text-[#86868B]"
                  >
                    {t('inv.common.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleReceiveTransfer}
                    disabled={!unitsReady}
                    className="text-xs bg-corporate"
                  >
                    {t('inv.transfers.receive')}
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ─── MODAL: CANCELAR TRANSFERENCIA (acción secundaria) ─── */}
      <Dialog open={cancelTransferId !== null} onOpenChange={open => { if (!open) setCancelTransferId(null); }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1D1D1F] flex items-center gap-2">
              <Ban className="h-4 w-4 text-corporate" />
              {t('inv.transfers.cancelTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.transfers.cancelReason')}</Label>
              <Input
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder={t('inv.transfers.cancelReasonPlaceholder')}
                className="h-9 text-sm rounded-lg"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCancelTransferId(null); setCancelReason(''); }}
                className="text-xs text-[#86868B]"
              >
                {t('inv.common.cancel')}
              </Button>
              <Button size="sm" onClick={handleCancelTransfer} className="text-xs bg-corporate">
                {t('inv.transfers.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── PANTALLA INTERNA: PROGRAMAR CONTEO (punto 8) ─── */}
      {invView === 'count-new' && (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-4 sm:p-6">
          <h2 className="text-base font-semibold text-[#1D1D1F] mb-4 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-corporate" />
            {t('inv.counts.schedule')}
          </h2>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.counts.location')}</Label>
              <select
                value={countForm.locationId}
                onChange={e => setCountForm(f => ({ ...f, locationId: e.target.value }))}
                className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
              >
                <option value="">{t('inv.movementForm.selectLocation')}</option>
                {activeLocations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.counts.frequency')}</Label>
              <select
                value={countForm.frequency}
                onChange={e => setCountForm(f => ({ ...f, frequency: e.target.value as CountFrequency }))}
                className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
              >
                <option value="semanal">{t('inv.counts.frequency.semanal')}</option>
                <option value="quincenal">{t('inv.counts.frequency.quincenal')}</option>
                <option value="mensual">{t('inv.counts.frequency.mensual')}</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-[#1D1D1F]">
              <input
                type="checkbox"
                checked={countForm.blind}
                onChange={e => setCountForm(f => ({ ...f, blind: e.target.checked }))}
                className="h-3.5 w-3.5"
              />
              {t('inv.counts.blind')}
            </label>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setInvView('main'); setCountForm(EMPTY_COUNT_FORM); }}
                className="text-xs text-[#86868B]"
              >
                {t('inv.common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleScheduleCount}
                disabled={savingCount}
                className="text-xs bg-corporate"
              >
                {t('inv.common.create')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: APLICAR AJUSTE DE CONTEO (acción secundaria) ─── */}
      <Dialog open={adjustmentSessionId !== null} onOpenChange={open => { if (!open) setAdjustmentSessionId(null); }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1D1D1F]">{t('inv.counts.applyAdjustment')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.counts.adjustmentReason')}</Label>
              <Input
                value={adjustmentReason}
                onChange={e => setAdjustmentReason(e.target.value)}
                placeholder={t('inv.counts.adjustmentReasonPlaceholder')}
                className="h-9 text-sm rounded-lg"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setAdjustmentSessionId(null); setAdjustmentReason(''); }}
                className="text-xs text-[#86868B]"
              >
                {t('inv.common.cancel')}
              </Button>
              <Button size="sm" onClick={handleApplyAdjustment} className="text-xs bg-corporate">
                {t('inv.counts.applyAdjustment')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── PANTALLA INTERNA: NUEVO SERIAL (punto 8) ─── */}
      {invView === 'serial-new' && (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-4 sm:p-6">
          <h2 className="text-base font-semibold text-[#1D1D1F] mb-4 flex items-center gap-2">
            <Box className="h-4 w-4 text-corporate" />
            {t('inv.serials.new')}
          </h2>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.serials.product')}</Label>
              {rentableProducts.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {t('inv.serials.noRentable')}
                </p>
              ) : (
                <select
                  value={serialForm.productId}
                  onChange={e => setSerialForm(f => ({ ...f, productId: e.target.value }))}
                  className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
                >
                  <option value="">{t('inv.serials.selectProduct')}</option>
                  {rentableProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.serials.serialNumber')}</Label>
              <Input
                value={serialForm.serialNumber}
                onChange={e => setSerialForm(f => ({ ...f, serialNumber: e.target.value }))}
                placeholder={t('inv.serials.serialNumberPlaceholder')}
                className="h-9 text-sm rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.serials.size')}</Label>
              <Input
                value={serialForm.size}
                onChange={e => setSerialForm(f => ({ ...f, size: e.target.value }))}
                placeholder={t('inv.serials.sizePlaceholder')}
                className="h-9 text-sm rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.serials.photo')}</Label>
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-corporate hover:underline">
                <Upload className="h-3.5 w-3.5" />
                {uploadingSerialPhoto ? '...' : t('inv.serials.uploadPhoto')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingSerialPhoto}
                  onChange={e => setSerialPhotoFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.serials.status')}</Label>
              <select
                value={serialForm.statusId}
                onChange={e => setSerialForm(f => ({ ...f, statusId: e.target.value }))}
                className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
              >
                {activeSerialStatuses.map(s => (
                  <option key={s.id} value={s.id}>
                    {getLanguage() === 'en' && s.nameEn ? s.nameEn : s.name}
                    {s.blocksRental ? ` · ${t('inv.catalogs.ss.blocksRental')}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.serials.notes')}</Label>
              <Input
                value={serialForm.notes}
                onChange={e => setSerialForm(f => ({ ...f, notes: e.target.value }))}
                placeholder={t('inv.serials.notesPlaceholder')}
                className="h-9 text-sm rounded-lg"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setInvView('main'); setSerialForm(EMPTY_SERIAL_FORM); setSerialPhotoFile(null); }}
                className="text-xs text-[#86868B]"
              >
                {t('inv.common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleCreateSerial}
                disabled={savingSerial || uploadingSerialPhoto || rentableProducts.length === 0}
                className="text-xs bg-corporate"
              >
                {t('inv.common.create')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: BAJA PERMANENTE DE SERIAL (acción secundaria) ─── */}
      <Dialog
        open={retiringUnit !== null}
        onOpenChange={open => { if (!open) { setRetiringUnit(null); setRetirePhotoFile(null); setRetireReason(''); } }}
      >
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1D1D1F] flex items-center gap-2">
              <Ban className="h-4 w-4 text-corporate" />
              {t('inv.serials.retireTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-[#86868B]">
              {retiringUnit ? `${productName(retiringUnit.productId)} · ${retiringUnit.serialNumber}` : ''}
              {' — '}{t('inv.serials.retireDesc')}
            </p>
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.serials.retirePhoto')}</Label>
              <div className="flex items-center gap-3">
                {retirePhotoFile && (
                  <img
                    src={URL.createObjectURL(retirePhotoFile)}
                    alt={retiringUnit?.serialNumber || ''}
                    className="h-14 w-14 rounded-lg object-cover border border-[#E5E5E7]"
                  />
                )}
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-corporate hover:underline">
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingSerialPhoto ? '...' : t('inv.serials.uploadPhoto')}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingSerialPhoto}
                    onChange={e => setRetirePhotoFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.serials.retireReason')}</Label>
              <textarea
                value={retireReason}
                onChange={e => setRetireReason(e.target.value)}
                placeholder={t('inv.serials.retireReasonPlaceholder')}
                rows={3}
                className="w-full text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 py-1.5 text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-corporate/30 resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setRetiringUnit(null); setRetirePhotoFile(null); setRetireReason(''); }}
                className="text-xs text-[#86868B]"
              >
                {t('inv.common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleRetireSerial}
                disabled={savingRetire || uploadingSerialPhoto}
                className="text-xs bg-corporate"
              >
                {t('inv.serials.retire')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── SECCIÓN: AJUSTES (punto 12): movimientos tipo 'ajuste', lectura ─── */}
      {invView === 'adjustments' && (
        <div className="space-y-4">
          <p className="text-xs text-[#86868B] bg-[#F5F5F7] rounded-xl px-4 py-3 border border-[#E5E5E7]">
            {t('inv.adjustments.help')}
          </p>
          <div className="space-y-2">
            {adjustmentMovements.length === 0 && (
              <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-8 text-center text-sm text-[#86868B]">
                {t('inv.adjustments.empty')}
              </div>
            )}
            {adjustmentMovements.map(m => {
              const isOpen = expandedIds.has(m.id!);
              return (
                <div
                  key={m.id}
                  className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpanded(m.id!)}
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-semibold shrink-0',
                        m.quantity > 0
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      )}
                    >
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[#1D1D1F] truncate">
                        {productName(m.productId)}
                      </div>
                      <div className="text-xs text-[#86868B] truncate">
                        {m.reason || t('inv.movements.noReason')}
                      </div>
                    </div>
                    <span className="text-xs text-[#86868B] shrink-0">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-[#86868B] shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#86868B] shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="border-t border-[#E5E5E7] p-3 space-y-1.5">
                      <DetailRow label={t('inv.movements.product')} value={productName(m.productId)} />
                      <DetailRow
                        label={t('inv.movements.from')}
                        value={m.fromLocationId ? locationName(m.fromLocationId) : '—'}
                      />
                      <DetailRow
                        label={t('inv.movements.to')}
                        value={m.toLocationId ? locationName(m.toLocationId) : '—'}
                      />
                      <DetailRow label={t('inv.movements.reason')} value={m.reason || t('inv.movements.noReason')} />
                      <DetailRow label={t('inv.movements.user')} value={m.createdByName || '—'} />
                      <DetailRow
                        label={t('inv.movements.date')}
                        value={m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── PANTALLA: FICHA DE PRODUCTO (punto 13, centro de operaciones) ─── */}
      {invView === 'product' && (() => {
        const product = products.find(p => p.id === productDetailId);
        if (!product) {
          return (
            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-8 text-center text-sm text-[#86868B]">
              {t('inv.product.notFound')}
            </div>
          );
        }
        const serialized = isSerializedProduct(product.id!);
        const productStocks = stocks.filter(s => s.productId === product.id);
        const repairUnits = rentalUnits.filter(
          u => u.productId === product.id && u.statusId === 'disponible'
        );
        return (
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              {product.photoUrl ? (
                <img
                  src={product.photoUrl}
                  alt={product.name}
                  className="h-12 w-12 rounded-xl object-cover border border-[#E5E5E7]"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-[#F5F5F7] flex items-center justify-center">
                  <Package className="h-6 w-6 text-[#86868B]" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-[#1D1D1F] truncate">{product.name}</h2>
                <div className="text-xs text-[#86868B]">
                  {product.sku && <span className="mr-2">{product.sku}</span>}
                  <span>{unitName(product.unitId)}</span>
                  {product.isRentable && <span className="ml-2">· {t('inv.serialized.stockHint')}</span>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openProductQr(product)}
                className="h-8 w-8 p-0 text-[#86868B] shrink-0"
                title={t('inv.qr.scanProduct')}
              >
                <QrCode className="h-4 w-4" />
              </Button>
            </div>

            {/* Stock: serializado → conteo por estado; no serializado → por ubicación */}
            {serialized ? (
              <div className="space-y-1">
                <Label className="text-xs text-[#86868B]">{t('inv.product.unitsByStatus')}</Label>
                {renderUnitStatusChips(product.id!)}
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs text-[#86868B]">{t('inv.product.stockByLocation')}</Label>
                {productStocks.length === 0 && (
                  <p className="text-xs text-[#86868B]">{t('inv.product.noStock')}</p>
                )}
                {productStocks.map(s => (
                  <div key={s.id} className="text-sm text-[#1D1D1F]">
                    {locationName(s.locationId)}: <span className="font-semibold">{s.quantity}</span>{' '}
                    {unitName(product.unitId)}
                  </div>
                ))}
              </div>
            )}

            {/* Acciones directas (punto 13) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {canWrite && (
                <>
                  <Button
                    size="sm"
                    onClick={() => openMovementFormFor('compra', product.id)}
                    className="h-9 text-xs rounded-xl bg-corporate gap-2"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    {t('inv.product.buy')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openTransferForm(product.id)}
                    className="h-9 text-xs rounded-xl border-[#E5E5E7] gap-2"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    {t('inv.product.transfer')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openMovementFormFor('consumo', product.id)}
                    className="h-9 text-xs rounded-xl border-[#E5E5E7] gap-2"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    {t('inv.product.consume')}
                  </Button>
                  {product.isRentable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/warehouse?newOrder=1&productId=${product.id}`)}
                      className="h-9 text-xs rounded-xl border-[#E5E5E7] gap-2"
                    >
                      <Box className="h-3.5 w-3.5" />
                      {t('inv.product.rent')}
                    </Button>
                  )}
                  {serialized ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRepairDialog(product.id!)}
                      className="h-9 text-xs rounded-xl border-[#E5E5E7] gap-2"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      {t('inv.product.repair')}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        openMovementFormFor('ajuste', product.id);
                        setMovementForm(f => ({ ...f, reason: 'Reparación' }));
                      }}
                      className="h-9 text-xs rounded-xl border-[#E5E5E7] gap-2"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      {t('inv.product.repair')}
                    </Button>
                  )}
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterProductId(product.id!);
                  setInvView('movements');
                }}
                className="h-9 text-xs rounded-xl border-[#E5E5E7] gap-2"
              >
                <History className="h-3.5 w-3.5" />
                {t('inv.product.history')}
              </Button>
            </div>
            {repairUnits.length === 0 && product.isRentable && (
              <p className="text-[11px] text-[#86868B]">{t('inv.repair.noAvailable')}</p>
            )}
          </div>
        );
      })()}

      </>)}

      {/* ─── MODAL: QR (producto / ubicación / serial) ─── */}
      <QrDialog
        open={qrDialog !== null}
        onOpenChange={open => { if (!open) setQrDialog(null); }}
        title={qrDialog?.title || ''}
        subtitle={qrDialog?.subtitle || ''}
        qrText={qrDialog?.qrText || ''}
      />

      {/* ─── MODAL: ENVIAR A REPARACIÓN (punto 13, desde ficha de producto) ─── */}
      <Dialog
        open={repairProductId !== null}
        onOpenChange={open => { if (!open) { setRepairProductId(null); setRepairUnitIds([]); setRepairReason(''); } }}
      >
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1D1D1F] flex items-center gap-2">
              <Wrench className="h-4 w-4 text-corporate" />
              {t('inv.repair.title')}
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const available = repairProductId
              ? rentalUnits.filter(u => u.productId === repairProductId && u.statusId === 'disponible')
              : [];
            return (
              <div className="space-y-3">
                <p className="text-xs text-[#86868B]">
                  {repairProductId ? `${productName(repairProductId)} — ` : ''}{t('inv.repair.help')}
                </p>
                {available.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {t('inv.repair.noAvailable')}
                  </p>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs text-[#86868B]">{t('inv.repair.selectUnits')}</Label>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-[#E5E5E7] divide-y divide-[#F5F5F7]">
                      {available.map(u => {
                        const checked = repairUnitIds.includes(u.id || '');
                        return (
                          <label
                            key={u.id}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-[#1D1D1F] cursor-pointer hover:bg-[#F5F5F7]"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setRepairUnitIds(prev =>
                                  checked ? prev.filter(x => x !== u.id) : [...prev, u.id || '']
                                )
                              }
                              className="h-3.5 w-3.5 accent-corporate"
                            />
                            <span className="font-medium">{u.serialNumber}</span>
                            {u.size && <span className="text-[#86868B]">{u.size}</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs text-[#86868B]">{t('inv.repair.reason')}</Label>
                  <Input
                    value={repairReason}
                    onChange={e => setRepairReason(e.target.value)}
                    placeholder={t('inv.repair.reasonPlaceholder')}
                    className="h-9 text-sm rounded-lg"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setRepairProductId(null); setRepairUnitIds([]); setRepairReason(''); }}
                    className="text-xs text-[#86868B]"
                  >
                    {t('inv.common.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendRepair}
                    disabled={repairUnitIds.length === 0}
                    className="text-xs bg-corporate"
                  >
                    {t('inv.repair.title')}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: ESCANER QR ─── */}
      <ScannerModal
        open={scannerOpen}
        onOpenChange={open => {
          setScannerOpen(open);
          // Al cerrar sin escanear se anula cualquier selección pendiente:
          // el próximo escaneo en modo navegación abre la ficha normal
          if (!open) scanPickRef.current = null;
        }}
        onScan={handleScanResult}
        serialIds={rentalUnits.map(u => u.id || '')}
        multiScan={scanContext !== 'navigate'}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FILA DE DETALLE (etiqueta + valor)
// ═══════════════════════════════════════════════════════════════════

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 text-xs">
      <span className="sm:w-32 shrink-0 text-[#86868B] font-medium">{label}</span>
      <span className="text-[#1D1D1F] break-words">{value || '—'}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// RECUADRO DE FIRMA (punto 11): canvas simple donde quien recibe dibuja
// su firma con el dedo o el mouse; entrega un dataURL (o null si está vacío)
// ═══════════════════════════════════════════════════════════════════

function SignatureCanvas({ value, onChange }: { value: string | null; onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const rect = canvas!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    drawingRef.current = true;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getPos(e);
    ctx.strokeStyle = '#1D1D1F';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    hasInkRef.current = true;
  };

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    onChange(canvas && hasInkRef.current ? canvas.toDataURL('image/png') : null);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
    onChange(null);
  };

  return (
    <div className="space-y-1">
      <canvas
        ref={canvasRef}
        width={520}
        height={160}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerLeave={handleUp}
        className="w-full h-36 rounded-lg border border-[#E5E5E7] bg-white touch-none"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-[#86868B]">{t('inv.receive.signatureHint')}</p>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 text-[11px] text-corporate hover:underline shrink-0"
        >
          <Eraser className="h-3 w-3" />
          {t('inv.receive.signatureClear')}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DIÁLOGO QR (producto / ubicación / serial) con impresión de etiqueta
// ═══════════════════════════════════════════════════════════════════

interface QrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  qrText: string;
}

function QrDialog({ open, onOpenChange, title, subtitle, qrText }: QrDialogProps) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!open || !qrText) return;
    let alive = true;
    QRCode.toDataURL(qrText, { width: 512, margin: 2 })
      .then(url => { if (alive) setDataUrl(url); })
      .catch(err => console.error('[QrDialog] QRCode:', err));
    return () => { alive = false; };
  }, [open, qrText]);

  const handlePrint = () => {
    if (!dataUrl) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: -apple-system, system-ui, sans-serif; text-align: center; padding: 24px; color: #1D1D1F; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      p.label { font-size: 14px; color: #555; margin: 0 0 16px; }
      img { width: 280px; height: 280px; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <p class="label">${subtitle}</p>
    <img src="${dataUrl}" alt="QR" />
    <script>window.onload = function () { window.print(); };</script>
  </body>
</html>`);
    win.document.close();
    win.focus();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#1D1D1F] flex items-center gap-2">
            <QrCode className="h-4 w-4 text-corporate" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-[#86868B]">{subtitle}</p>
          {dataUrl ? (
            <img src={dataUrl} alt="QR" className="w-56 h-56 rounded-xl border border-[#E5E5E7]" />
          ) : (
            <div className="w-56 h-56 rounded-xl bg-[#F5F5F7] flex items-center justify-center text-xs text-[#86868B]">
              {t('inv.loading')}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={!dataUrl}
            className="h-8 text-xs rounded-lg border-[#E5E5E7] gap-2"
          >
            <Printer className="h-3.5 w-3.5" />
            {t('inv.qr.print')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL ESCANER QR (html5-qrcode): parsea URLs de la app con
// searchParams product / location / serial
// ═══════════════════════════════════════════════════════════════════
// CÁMARA DIRECTA (punto 2): se abre de inmediato con facingMode
// 'environment' (trasera en móvil), SIN el selector de cámaras que muestra
// Html5QrcodeScanner por defecto. Si la trasera falla (p. ej. desktop sin
// cámara trasera), se reintenta automáticamente con la primera cámara
// disponible y se ofrece un botón pequeño (icono de cámara) para alternar
// entre las cámaras detectadas.
// Bug "HTML Element with id=... not found": html5-qrcode LANZA en su
// CONSTRUCTOR si el contenedor no está en el DOM todavía. Con el Dialog
// de Radix el portal puede montarse después del efecto, así que la instancia
// se crea SOLO cuando el contenedor ya existe (reintento por
// requestAnimationFrame) y el id es único por instancia (useId), así el
// escáner funciona igual en Stock, Seriales, Conteos, Transferencias y la
// ficha de producto.
// RONDA 4 (punto 2): "abre la cámara pero no registra nada" — html5-qrcode
// NO permite start() tras stop() en la MISMA instancia; ahora cada sesión de
// escaneo (apertura del modal y cada reactivación multiScan) crea una
// instancia NUEVA con el callback de éxito bien cableado, y hay un log
// temporal en consola ([ScannerModal] QR detectado) para diagnosticar.

interface ScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (kind: 'product' | 'location' | 'serial', id: string) => void;
  /** ids de seriales existentes: un texto plano que coincida se trata como serial */
  serialIds: string[];
  /** true en conteos/recepción: la cámara se reactiva tras cada lectura
   *  válida para poder escanear varias unidades sin cerrar el modal */
  multiScan?: boolean;
}

function ScannerModal({ open, onOpenChange, onScan, serialIds, multiScan = false }: ScannerModalProps) {
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  // Cámaras detectadas (para el botón de respaldo) y cámara activa:
  // -1 = facingMode 'environment' (trasera), >= 0 = índice en cameraList
  const [cameraList, setCameraList] = useState<Array<{ id: string; label: string }>>([]);
  const [cameraIndex, setCameraIndex] = useState(-1);
  const [cameraFailed, setCameraFailed] = useState(false);
  // Id único por instancia: nunca colisiona entre dos ScannerModal montados
  const instanceId = `inv-qr-scanner-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // Refs para que los callbacks siempre vean los valores actuales
  const onScanRef = useRef(onScan);
  const serialIdsRef = useRef(serialIds);
  const multiScanRef = useRef(multiScan);
  const cameraListRef = useRef(cameraList);
  const cameraIndexRef = useRef(cameraIndex);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { serialIdsRef.current = serialIds; }, [serialIds]);
  useEffect(() => { multiScanRef.current = multiScan; }, [multiScan]);
  useEffect(() => { cameraListRef.current = cameraList; }, [cameraList]);
  useEffect(() => { cameraIndexRef.current = cameraIndex; }, [cameraIndex]);

  // Reinicia la entrada manual y la cámara cada vez que se abre el modal
  useEffect(() => {
    if (open) {
      setManualOpen(false);
      setManualCode('');
      setCameraIndex(-1);
      setCameraFailed(false);
    }
  }, [open]);

  // Mismo parseo para cámara y entrada manual: URL con searchParams
  // product / location / serial, o texto plano que sea id de serial existente
  const parseScan = (text: string): { kind: 'product' | 'location' | 'serial'; id: string } | null => {
    let parsed: URL | null = null;
    try {
      parsed = new URL(text);
    } catch {
      parsed = null;
    }
    const product = parsed?.searchParams.get('product');
    const location = parsed?.searchParams.get('location');
    const serial = parsed?.searchParams.get('serial');
    if (product) return { kind: 'product', id: product };
    if (location) return { kind: 'location', id: location };
    if (serial) return { kind: 'serial', id: serial };
    const trimmed = text.trim();
    if (trimmed && serialIdsRef.current.includes(trimmed)) return { kind: 'serial', id: trimmed };
    return null;
  };

  useEffect(() => {
    if (!open) return;
    let disposed = false;
    let scanner: Html5Qrcode | null = null;
    let rafId = 0;
    let attempts = 0;

    // Detiene y limpia la instancia actual (la misma instancia de
    // html5-qrcode NO puede volver a arrancar tras stop(): por eso cada
    // sesión de escaneo crea una instancia NUEVA, ver startSession)
    const stopScanner = async () => {
      const active = scanner;
      scanner = null;
      if (active) {
        try { await active.stop(); } catch { /* ya detenida */ }
        try { active.clear(); } catch { /* contenedor ya limpio */ }
      }
    };

    const startSession = () => {
      if (disposed) return;
      // El contenedor vive en el portal del Dialog: no se crea la instancia
      // hasta verificar que existe (reintento durante ~1s).
      const el = document.getElementById(instanceId);
      if (!el) {
        attempts += 1;
        if (attempts < 60) rafId = requestAnimationFrame(startSession);
        return;
      }
      // INSTANCIA NUEVA por cada sesión de escaneo: apertura del modal y cada
      // reactivación multiScan. html5-qrcode no soporta start() tras stop() en
      // la misma instancia; crear una nueva por sesión es el cableado correcto
      let session: Html5Qrcode;
      try {
        session = new Html5Qrcode(instanceId, { verbose: false });
      } catch (err) {
        console.error('[ScannerModal]', err);
        if (!disposed) setCameraFailed(true);
        return;
      }
      scanner = session;

      const onDecode = (decodedText: string) => {
        // Diagnóstico temporal (ronda 4): verifica que onSuccess dispara con
        // un string decodificado; si la cámara abre pero "no pasa nada", este
        // log confirma si el problema está en el decode o en el parseo
        console.info('[ScannerModal] QR detectado:', decodedText);
        const result = parseScan(decodedText);
        if (!result) {
          toast.error(t('inv.scanner.unrecognized'));
          return;
        }
        if (multiScanRef.current) {
          // Conteo/recepción: detener → entregar → NUEVA instancia para la
          // siguiente unidad, sin cerrar el modal
          void session.stop()
            .then(() => {
              session.clear();
              if (scanner === session) scanner = null;
              if (disposed) return;
              onScanRef.current(result.kind, result.id);
              rafId = requestAnimationFrame(startSession);
            })
            .catch(() => {
              if (disposed) return;
              rafId = requestAnimationFrame(startSession);
            });
        } else {
          // QR válido: detener la cámara y entregar el resultado
          void stopScanner().finally(() => {
            if (disposed) return;
            onScanRef.current(result.kind, result.id);
          });
        }
      };

      // Cámara directa: trasera (environment) salvo que el botón de respaldo
      // haya elegido una cámara concreta
      const cameraId = cameraIndexRef.current >= 0 ? cameraListRef.current[cameraIndexRef.current]?.id : undefined;
      const cameraSel: string | MediaTrackConstraints = cameraId || { facingMode: 'environment' };
      session.start(cameraSel, { fps: 10, qrbox: 250 }, onDecode, () => undefined)
        .then(() => {
          if (disposed) { void stopScanner(); return; }
          setCameraFailed(false);
          // Lista de cámaras para el botón de respaldo (una sola vez)
          if (cameraListRef.current.length === 0) {
            Html5Qrcode.getCameras()
              .then(cams => {
                if (disposed) return;
                setCameraList(cams.map(c => ({ id: c.id, label: c.label || c.id })));
              })
              .catch(() => undefined);
          }
        })
        .catch((err) => {
          console.error('[ScannerModal]', err);
          if (disposed) return;
          setCameraFailed(true);
          toast.error(t('inv.scanner.error'));
          // Respaldo: si la trasera falla (p. ej. desktop), se reintenta
          // automáticamente con la primera cámara disponible
          Html5Qrcode.getCameras()
            .then(cams => {
              if (disposed || cams.length === 0) return;
              setCameraList(cams.map(c => ({ id: c.id, label: c.label || c.id })));
              if (cameraIndexRef.current < 0) setCameraIndex(0);
            })
            .catch(() => undefined);
        });
    };

    rafId = requestAnimationFrame(startSession);

    // Apaga la cámara al desmontar / cerrar el modal o cambiar de cámara
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      void stopScanner();
    };
  }, [open, instanceId, cameraIndex]);

  // Botón de respaldo: alterna entre las cámaras disponibles
  const switchCamera = () => {
    if (cameraList.length === 0) return;
    setCameraIndex(prev => (prev + 1 >= cameraList.length ? 0 : prev + 1));
  };

  const handleManualSubmit = () => {
    const result = parseScan(manualCode);
    if (!result) {
      toast.error(t('inv.scanner.unrecognized'));
      return;
    }
    onScanRef.current(result.kind, result.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1D1D1F] flex items-center gap-2">
            <QrCode className="h-4 w-4 text-corporate" />
            {t('inv.scanner.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-[#86868B]">{t('inv.scanner.hint')}</p>
          <div id={instanceId} className="rounded-xl overflow-hidden" />
          {(cameraFailed || cameraList.length > 1) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={switchCamera}
              className="h-7 text-xs rounded-lg border-[#E5E5E7] gap-2"
            >
              <Camera className="h-3.5 w-3.5" />
              {t('inv.scanner.switchCamera')}
              {cameraIndex >= 0 && cameraList[cameraIndex] && (
                <span className="text-[#86868B] truncate max-w-40">({cameraList[cameraIndex].label})</span>
              )}
            </Button>
          )}
          {manualOpen ? (
            <div className="flex items-center gap-2">
              <Input
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleManualSubmit(); }}
                placeholder={t('inv.scanner.manualPlaceholder')}
                className="h-8 text-xs rounded-lg"
              />
              <Button
                size="sm"
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
                className="h-8 text-xs rounded-lg bg-corporate shrink-0"
              >
                {t('inv.scanner.manualSubmit')}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="text-xs text-corporate hover:underline"
            >
              {t('inv.scanner.manual')}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InventarioModule;
