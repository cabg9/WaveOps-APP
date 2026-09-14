// INVENTARIO MODULE - Fase 1 (Inventario / Warehouse)
// Sub-pestañas: Stock, Movimientos (kardex inmutable), Transferencias
// (FASE 1A-transfers), Conteos (FASE 1A-counts), Seriales
// (FASE 1B-serials: rentalUnits + QR + escáner + deep links) y Catálogos
// (movementTypes + serialStatuses). Todo payload lleva
// tenantId; los catálogos se crean desde la app (nada hardcodeado salvo
// seeds idempotentes).
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
  collection, onSnapshot, addDoc, updateDoc, doc, setDoc, getDoc, query, orderBy,
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAudit } from '@/hooks/useAudit';
import { useFirestoreUsers } from '@/hooks/firestore/useFirestoreUsers';
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
} from '@/types/catalogs';
import { CATALOG_COLLECTIONS } from '@/types/catalogs';
import {
  Box, ArrowDownUp, Tags, Package, MapPin, Plus, Search, QrCode,
  ChevronDown, ChevronUp, Pencil, Power, Construction,
  Truck, ClipboardList, Play, Send, Inbox, Ban, Printer, Upload,
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

    'inv.stock.viewByProduct': 'Por producto',
    'inv.stock.viewByLocation': 'Por ubicación',
    'inv.stock.scanQr': 'Escanear QR',
    'inv.stock.scanQrSoon': 'Próximamente',
    'inv.stock.registerMovement': 'Registrar movimiento',
    'inv.stock.editMinMax': 'Editar mín/máx',
    'inv.stock.min': 'Mín',
    'inv.stock.max': 'Máx',
    'inv.stock.lowStock': 'Bajo mínimo',
    'inv.stock.noProducts': 'No hay productos activos con stock',
    'inv.stock.noProductsHint': 'Registra el primer movimiento para crear stock de un producto.',
    'inv.stock.emptyLocation': 'Sin productos con stock en esta ubicación',

    'inv.movementForm.title': 'Registrar movimiento',
    'inv.movementForm.product': 'Producto',
    'inv.movementForm.selectProduct': 'Selecciona un producto',
    'inv.movementForm.type': 'Tipo de movimiento',
    'inv.movementForm.selectType': 'Selecciona un tipo',
    'inv.movementForm.quantity': 'Cantidad',
    'inv.movementForm.fromLocation': 'Ubicación origen',
    'inv.movementForm.toLocation': 'Ubicación destino',
    'inv.movementForm.selectLocation': 'Selecciona una ubicación',
    'inv.movementForm.reason': 'Motivo (opcional)',
    'inv.movementForm.reasonPlaceholder': 'Ej: compra a proveedor, consumo en mantenimiento...',
    'inv.movementForm.save': 'Guardar movimiento',

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

    'inv.transfers.help': 'Mueve stock entre ubicaciones con seguimiento de estado. Al crear se descuenta del origen; al recibir se suma al destino; al cancelar se devuelve al origen. Estados: pendiente, en tránsito, recibido y cancelado.',
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
    'inv.transfers.markInTransit': 'Marcar en tránsito',
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
    'inv.transfers.inTransitTo': 'En tránsito a {location}: {quantity}',
    'inv.transfers.reasonCreated': 'Transferencia creada',
    'inv.transfers.reasonReceived': 'Transferencia recibida',
    'inv.transfers.reasonCancelled': 'Transferencia cancelada',

    'inv.counts.help': 'Conteos cíclicos por ubicación. Al finalizar se comparan contra el stock esperado; si hay diferencias, el ajuste requiere aprobación con motivo obligatorio.',
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

    'inv.stock.viewByProduct': 'By product',
    'inv.stock.viewByLocation': 'By location',
    'inv.stock.scanQr': 'Scan QR',
    'inv.stock.scanQrSoon': 'Coming soon',
    'inv.stock.registerMovement': 'Register movement',
    'inv.stock.editMinMax': 'Edit min/max',
    'inv.stock.min': 'Min',
    'inv.stock.max': 'Max',
    'inv.stock.lowStock': 'Below minimum',
    'inv.stock.noProducts': 'No active products with stock',
    'inv.stock.noProductsHint': 'Register the first movement to create stock for a product.',
    'inv.stock.emptyLocation': 'No products with stock at this location',

    'inv.movementForm.title': 'Register movement',
    'inv.movementForm.product': 'Product',
    'inv.movementForm.selectProduct': 'Select a product',
    'inv.movementForm.type': 'Movement type',
    'inv.movementForm.selectType': 'Select a type',
    'inv.movementForm.quantity': 'Quantity',
    'inv.movementForm.fromLocation': 'Source location',
    'inv.movementForm.toLocation': 'Destination location',
    'inv.movementForm.selectLocation': 'Select a location',
    'inv.movementForm.reason': 'Reason (optional)',
    'inv.movementForm.reasonPlaceholder': 'E.g.: supplier purchase, maintenance consumption...',
    'inv.movementForm.save': 'Save movement',

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

    'inv.transfers.help': 'Moves stock between locations with status tracking. Creating it subtracts from the source; receiving adds to the destination; cancelling returns it to the source. Statuses: pending, in transit, received and cancelled.',
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
    'inv.transfers.markInTransit': 'Mark in transit',
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
    'inv.transfers.inTransitTo': 'In transit to {location}: {quantity}',
    'inv.transfers.reasonCreated': 'Transfer created',
    'inv.transfers.reasonReceived': 'Transfer received',
    'inv.transfers.reasonCancelled': 'Transfer cancelled',

    'inv.counts.help': 'Cyclic counts by location. On completion they are compared against expected stock; if there are differences, the adjustment requires approval with a mandatory reason.',
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

function docToSerialStatus(id: string, data: Record<string, unknown>): SerialStatus {
  return {
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
  return {
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
}

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
    createdAt: toStr(data.createdAt),
    createdBy: toStr(data.createdBy),
    createdByName: toStr(data.createdByName),
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

type InvTab = 'stock' | 'movements' | 'transfers' | 'counts' | 'serials' | 'catalogs';
type StockView = 'product' | 'location';

interface MovementFormState {
  productId: string;
  movementTypeId: string;
  quantity: string;
  fromLocationId: string;
  toLocationId: string;
  reason: string;
}

const EMPTY_MOVEMENT_FORM: MovementFormState = {
  productId: '',
  movementTypeId: '',
  quantity: '',
  fromLocationId: '',
  toLocationId: '',
  reason: '',
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

const COUNT_STATUS_BADGE: Record<CountSession['status'], string> = {
  programado: 'bg-[#F5F5F7] text-[#86868B] border border-[#E5E5E7]',
  en_curso: 'bg-blue-50 text-blue-700 border border-blue-200',
  finalizado: 'bg-green-50 text-green-700 border border-green-200',
  ajustado: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

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
  const [locations, setLocations] = useState<Location[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);

  // Estado de carga / error
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Navegación entre sub-pestañas
  const [tab, setTab] = useState<InvTab>('stock');

  // Tarjetas expandibles
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Vista de Stock
  const [stockView, setStockView] = useState<StockView>('product');

  // Modal de movimiento (compartido: lo reusan Stock y los siguientes agentes)
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementForm, setMovementForm] = useState<MovementFormState>(EMPTY_MOVEMENT_FORM);
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
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState<TransferFormState>(EMPTY_TRANSFER_FORM);
  const [savingTransfer, setSavingTransfer] = useState(false);
  const [receiveTransferId, setReceiveTransferId] = useState<string | null>(null);
  const [receivedByName, setReceivedByName] = useState('');
  const [cancelTransferId, setCancelTransferId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Conteos cíclicos (FASE 1A-counts)
  const [countSessions, setCountSessions] = useState<CountSession[]>([]);
  const [countModalOpen, setCountModalOpen] = useState(false);
  const [countForm, setCountForm] = useState<CountFormState>(EMPTY_COUNT_FORM);
  const [savingCount, setSavingCount] = useState(false);
  const [countingId, setCountingId] = useState<string | null>(null);
  const [countsDraft, setCountsDraft] = useState<Record<string, string>>({});
  const [adjustmentSessionId, setAdjustmentSessionId] = useState<string | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Seriales / unidades rentables (FASE 1B-serials)
  const [rentalUnits, setRentalUnits] = useState<RentalUnit[]>([]);
  // Órdenes de renta y sus estados: alimentan el historial de seriales (WH-D2)
  const [rentalOrders, setRentalOrders] = useState<RentalOrder[]>([]);
  const [rentalOrderStatuses, setRentalOrderStatuses] = useState<RentalOrderStatus[]>([]);
  const [serialModalOpen, setSerialModalOpen] = useState(false);
  const [serialForm, setSerialForm] = useState<SerialFormState>(EMPTY_SERIAL_FORM);
  const [serialPhotoFile, setSerialPhotoFile] = useState<File | null>(null);
  const [savingSerial, setSavingSerial] = useState(false);
  const [editingSerialId, setEditingSerialId] = useState<string | null>(null);
  const [serialEditDraft, setSerialEditDraft] = useState<{ size: string; notes: string }>({ size: '', notes: '' });

  // QR y escáner (FASE 1B-serials)
  const [qrDialog, setQrDialog] = useState<{ title: string; subtitle: string; qrText: string } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Deep links (?product= / ?location= / ?serial=): solo se procesan una vez
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkHandled = useRef(false);

  const { users } = useFirestoreUsers();
  const { uploadImage, uploading: uploadingSerialPhoto } = useStorageUpload();

  const tenantId = getCurrentTenantId();
  const enabled = isFeatureEnabled('enableInventario');
  const canWrite = currentUser?.role === Role.DIRECTOR_GENERAL || currentUser?.role === Role.RRHH;

  const activeProducts = useMemo(() => products.filter(p => p.isActive), [products]);
  const activeLocations = useMemo(() => locations.filter(l => l.isActive), [locations]);
  const activeMovementTypes = useMemo(() => movementTypes.filter(m => m.isActive), [movementTypes]);
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
    setMovementForm({
      ...EMPTY_MOVEMENT_FORM,
      productId: productId || '',
      fromLocationId: locationId || '',
      toLocationId: locationId || '',
    });
    setMovementModalOpen(true);
  };

  const handleSaveMovement = async () => {
    if (!currentUser || !canWrite) return;
    const qty = Number(movementForm.quantity);
    const mt = movementTypes.find(m => m.id === movementForm.movementTypeId);
    if (!movementForm.productId) return toast.error(t('inv.validation.productRequired'));
    if (!mt) return toast.error(t('inv.validation.typeRequired'));
    if (!Number.isFinite(qty) || qty <= 0) return toast.error(t('inv.validation.quantityPositive'));
    if (mt.isOutput && !movementForm.fromLocationId) return toast.error(t('inv.validation.fromRequired'));
    if (!mt.isOutput && !movementForm.toLocationId) return toast.error(t('inv.validation.toRequired'));

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
          const targetLocationId = mt.isOutput ? movementForm.fromLocationId : movementForm.toLocationId;
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
            fromLocationId: movementForm.fromLocationId || null,
            toLocationId: movementForm.toLocationId || null,
            movementTypeId: mt.id!,
            reason: movementForm.reason.trim() || null,
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
          setMovementModalOpen(false);
          setMovementForm(EMPTY_MOVEMENT_FORM);
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

  const openTransferForm = () => {
    setTransferForm(EMPTY_TRANSFER_FORM);
    setTransferModalOpen(true);
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

          // TODO Fase1B-notify: notificación push/email al coordinador (Cloud Function)

          await logAction({
            action: AUDIT_ACTIONS.transferCreated,
            targetType: 'inventory_transfer',
            targetId: transferRef.id,
            targetName: `${productName(transferForm.productId)} · ${qty}`,
            impactLevel: 'major',
            description: `Transferencia creada: ${productName(transferForm.productId)} · ${qty} · ${locationName(transferForm.fromLocationId)} → ${locationName(transferForm.toLocationId)}`,
          });

          toast.success(t('inv.transfers.new'));
          setTransferModalOpen(false);
          setTransferForm(EMPTY_TRANSFER_FORM);
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
      });
      await logAction({
        action: AUDIT_ACTIONS.transferShipped,
        targetType: 'inventory_transfer',
        targetId: transfer.id,
        targetName: `${productName(transfer.productId)} · ${transfer.quantity}`,
        impactLevel: 'minor',
        description: `Transferencia marcada en tránsito: ${productName(transfer.productId)} · ${transfer.quantity} · ${locationName(transfer.fromLocationId)} → ${locationName(transfer.toLocationId)}`,
      });
    } catch (err: any) {
      toast.error(`${t('inv.error.save')}: ${err.message}`);
    }
  };

  const openReceiveTransfer = (transfer: InventoryTransfer) => {
    setReceiveTransferId(transfer.id!);
    setReceivedByName(currentUser?.name || '');
  };

  const handleReceiveTransfer = async () => {
    const transfer = transfers.find(x => x.id === receiveTransferId);
    if (!currentUser || !canWrite || !transfer?.id) return;
    if (!receivedByName.trim()) return toast.error(t('inv.validation.nameRequired'));
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

          await updateDoc(doc(db, CATALOG_COLLECTIONS.inventoryTransfers, transfer.id), {
            status: 'recibido',
            receivedBy: receivedByName.trim(),
            receivedAt: now,
          });

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
      setCountModalOpen(false);
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
      await updateDoc(doc(db, CATALOG_COLLECTIONS.countSessions, session.id), { counts: parsed });
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

  // ═══════════════════════════════════════════════════════════════════
  // EDICIÓN INLINE DE MÍN/MÁX (config menor, sin auditoría)
  // ═══════════════════════════════════════════════════════════════════

  const startEditMinMax = (stock: InventoryStock) => {
    setEditingMinMaxId(stock.id || null);
    setMinMaxDraft({
      min: stock.minStock != null ? String(stock.minStock) : '',
      max: stock.maxStock != null ? String(stock.maxStock) : '',
    });
  };

  const handleSaveMinMax = async (stock: InventoryStock) => {
    if (!currentUser || !canWrite || !stock.id) return;
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

  const openSerialForm = () => {
    // Estado inicial por defecto: el primero activo que NO bloquea renta
    const defaultStatus = activeSerialStatuses.find(s => !s.blocksRental) ?? activeSerialStatuses[0];
    setSerialForm({ ...EMPTY_SERIAL_FORM, statusId: defaultStatus?.id || '' });
    setSerialPhotoFile(null);
    setSerialModalOpen(true);
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
          setSerialModalOpen(false);
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

  // Resultado de un escaneo (o deep link): abre la sub-pestaña y expande la tarjeta
  const revealTarget = (kind: 'product' | 'location' | 'serial', id: string) => {
    if (kind === 'product') {
      setTab('stock');
      setStockView('product');
    } else if (kind === 'location') {
      setTab('stock');
      setStockView('location');
    } else {
      setTab('serials');
    }
    setExpandedIds(new Set([id]));
  };

  const handleScanResult = (kind: 'product' | 'location' | 'serial', id: string) => {
    setScannerOpen(false);
    revealTarget(kind, id);
  };

  // Deep links: ?product= / ?location= / ?serial= → sub-pestaña + tarjeta expandida
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          toast.success(
            t('inv.catalogs.mt.seedsSummary')
              .replace('{created}', String(created))
              .replace('{existing}', String(existing))
          );
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
          toast.success(
            t('inv.catalogs.ss.seedsSummary')
              .replace('{created}', String(created))
              .replace('{existing}', String(existing))
          );
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

  const tabs: Array<{ id: InvTab; label: string }> = [
    { id: 'stock', label: t('inv.tab.stock') },
    { id: 'movements', label: t('inv.tab.movements') },
    { id: 'transfers', label: t('inv.tab.transfers') },
    { id: 'counts', label: t('inv.tab.counts') },
    { id: 'serials', label: t('inv.tab.serials') },
    { id: 'catalogs', label: t('inv.tab.catalogs') },
  ];

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* Pills de sub-pestañas */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              tab === tb.id
                ? 'bg-corporate text-white border-corporate'
                : 'bg-white text-[#1D1D1F] border-[#E5E5E7] hover:bg-[#F5F5F7]'
            )}
          >
            {tb.label}
          </button>
        ))}
        {!canWrite && (
          <span className="ml-auto text-xs text-[#86868B]">{t('inv.readOnly')}</span>
        )}
      </div>

      {/* ─── SUB-PESTAÑA: STOCK ─── */}
      {tab === 'stock' && (
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScannerOpen(true)}
              className="ml-auto gap-2 rounded-xl border-[#E5E5E7]"
            >
              <QrCode className="h-4 w-4" />
              {t('inv.stock.scanQr')}
            </Button>
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
              {activeProducts.map(product => {
                const productStocks = stocks.filter(s => s.productId === product.id && s.quantity !== 0);
                if (productStocks.length === 0) return null;
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
                                <span className="text-sm font-semibold text-[#1D1D1F]">
                                  {s.quantity} {unitName(product.unitId)}
                                </span>
                                {s.minStock != null && (
                                  <span className="text-xs text-[#86868B]">
                                    {t('inv.stock.min')} {s.minStock} · {t('inv.stock.max')}{' '}
                                    {s.maxStock ?? '—'}
                                  </span>
                                )}
                                {isLow && s.minStock != null && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                    {t('inv.stock.lowStock')}
                                  </span>
                                )}
                                {canWrite && (
                                  <div className="ml-auto flex items-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openMovementForm(product.id, s.locationId)}
                                      className="h-7 text-xs rounded-lg border-[#E5E5E7]"
                                    >
                                      <ArrowDownUp className="h-3.5 w-3.5 mr-1" />
                                      {t('inv.stock.registerMovement')}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEditMinMax(s)}
                                      className="h-7 text-xs text-[#86868B]"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </div>
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
                const locationStocks = stocks.filter(s => s.locationId === location.id && s.quantity !== 0);
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
                          // Transferencias en tránsito desde esta ubicación, agrupadas por destino
                          const transitGroups: Array<{ toLocationId: string; qty: number }> = [];
                          transfers
                            .filter(tr => tr.status === 'en_transito' && tr.fromLocationId === location.id && tr.productId === s.productId)
                            .forEach(tr => {
                              const g = transitGroups.find(x => x.toLocationId === tr.toLocationId);
                              if (g) g.qty += tr.quantity;
                              else transitGroups.push({ toLocationId: tr.toLocationId, qty: tr.quantity });
                            });
                          return (
                            <div key={s.id} className="p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-[#1D1D1F]">
                                  {product?.name || s.productId}
                                </span>
                                <span className="text-sm font-semibold text-[#1D1D1F]">
                                  {s.quantity} {unitName(product?.unitId || '')}
                                </span>
                                {s.minStock != null && (
                                  <span className="text-xs text-[#86868B]">
                                    {t('inv.stock.min')} {s.minStock} · {t('inv.stock.max')}{' '}
                                    {s.maxStock ?? '—'}
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
                              {transitGroups.map(g => (
                                <div
                                  key={g.toLocationId}
                                  className="mt-1 flex items-center gap-1 text-[11px] text-blue-700"
                                >
                                  <Truck className="h-3 w-3 shrink-0" />
                                  {t('inv.transfers.inTransitTo')
                                    .replace('{location}', locationName(g.toLocationId))
                                    .replace('{quantity}', String(g.qty))}
                                </div>
                              ))}
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

      {/* ─── SUB-PESTAÑA: MOVIMIENTOS (kardex) ─── */}
      {tab === 'movements' && (
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

      {/* ─── SUB-PESTAÑA: TRANSFERENCIAS (FASE 1A-transfers) ─── */}
      {tab === 'transfers' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-[#86868B] bg-[#F5F5F7] rounded-xl px-4 py-3 border border-[#E5E5E7] flex-1 min-w-[220px]">
              {t('inv.transfers.help')}
            </p>
            {canWrite && (
              <Button
                size="sm"
                onClick={openTransferForm}
                className="h-8 text-xs rounded-xl bg-corporate gap-2 shrink-0"
              >
                <Truck className="h-3.5 w-3.5" />
                {t('inv.transfers.new')}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {transfers.length === 0 && (
              <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-8 text-center text-sm text-[#86868B]">
                {t('inv.transfers.empty')}
              </div>
            )}
            {transfers.map(tr => {
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
                        </>
                      )}
                      {canWrite && tr.status === 'pendiente' && (
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleShipTransfer(tr)}
                            className="h-7 text-xs rounded-lg bg-corporate"
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
                            {t('inv.transfers.markInTransit')}
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
                      {canWrite && tr.status === 'en_transito' && (
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => openReceiveTransfer(tr)}
                            className="h-7 text-xs rounded-lg bg-corporate"
                          >
                            <Inbox className="h-3.5 w-3.5 mr-1" />
                            {t('inv.transfers.receive')}
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── SUB-PESTAÑA: CONTEOS (FASE 1A-counts) ─── */}
      {tab === 'counts' && (
        <div className="space-y-4">
          {!countingSession && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-[#86868B] bg-[#F5F5F7] rounded-xl px-4 py-3 border border-[#E5E5E7] flex-1 min-w-[220px]">
                {t('inv.counts.help')}
              </p>
              {canWrite && (
                <Button
                  size="sm"
                  onClick={() => { setCountForm(EMPTY_COUNT_FORM); setCountModalOpen(true); }}
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
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScannerOpen(true)}
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
                  return (
                    <div key={s.id} className="py-2 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-[#1D1D1F] truncate">
                          {product?.name || s.productId}
                        </div>
                        {!countingSession.blind && (
                          <div className="text-[11px] text-[#86868B]">
                            {t('inv.counts.expected')}: {s.quantity} {unitName(product?.unitId || '')}
                          </div>
                        )}
                      </div>
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
      {tab === 'serials' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-[#86868B] bg-[#F5F5F7] rounded-xl px-4 py-3 border border-[#E5E5E7] flex-1 min-w-[220px]">
              {t('inv.serials.help')}
            </p>
            {canWrite && (
              <Button
                size="sm"
                onClick={openSerialForm}
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
                                    status?.blocksRental
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : 'bg-green-50 text-green-700 border-green-200'
                                  )}
                                >
                                  {status ? (getLanguage() === 'en' && status.nameEn ? status.nameEn : status.name) : unit.statusId}
                                </span>
                                {status?.blocksRental && (
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

                          {canWrite && (
                            <div className="flex flex-wrap items-center gap-2 pt-2">
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
      {tab === 'catalogs' && (
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

      {/* ─── MODAL: REGISTRAR MOVIMIENTO (compartido) ─── */}
      <Dialog open={movementModalOpen} onOpenChange={setMovementModalOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1D1D1F]">{t('inv.movementForm.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.movementForm.product')}</Label>
              <select
                value={movementForm.productId}
                onChange={e => setMovementForm(f => ({ ...f, productId: e.target.value }))}
                className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
              >
                <option value="">{t('inv.movementForm.selectProduct')}</option>
                {activeProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
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
              <div className="space-y-1">
                <Label className="text-xs text-[#86868B]">{t('inv.movementForm.fromLocation')}</Label>
                <select
                  value={movementForm.fromLocationId}
                  onChange={e => setMovementForm(f => ({ ...f, fromLocationId: e.target.value }))}
                  className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
                >
                  <option value="">{t('inv.movementForm.selectLocation')}</option>
                  {activeLocations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
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
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.movementForm.reason')}</Label>
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
                onClick={() => { setMovementModalOpen(false); setMovementForm(EMPTY_MOVEMENT_FORM); }}
                className="text-xs text-[#86868B]"
              >
                {t('inv.common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveMovement}
                disabled={savingMovement}
                className="text-xs bg-corporate"
              >
                {t('inv.movementForm.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: NUEVA TRANSFERENCIA ─── */}
      <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1D1D1F] flex items-center gap-2">
              <Truck className="h-4 w-4 text-corporate" />
              {t('inv.transfers.new')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.movementForm.product')}</Label>
              <select
                value={transferForm.productId}
                onChange={e => setTransferForm(f => ({ ...f, productId: e.target.value }))}
                className="w-full h-9 text-sm rounded-lg border border-[#E5E5E7] bg-white px-2 text-[#1D1D1F]"
              >
                <option value="">{t('inv.movementForm.selectProduct')}</option>
                {activeProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
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
                onClick={() => { setTransferModalOpen(false); setTransferForm(EMPTY_TRANSFER_FORM); }}
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
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: RECIBIR TRANSFERENCIA ─── */}
      <Dialog open={receiveTransferId !== null} onOpenChange={open => { if (!open) setReceiveTransferId(null); }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1D1D1F] flex items-center gap-2">
              <Inbox className="h-4 w-4 text-corporate" />
              {t('inv.transfers.receiveTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-[#86868B]">{t('inv.transfers.receivedByLabel')}</Label>
              <Input
                value={receivedByName}
                onChange={e => setReceivedByName(e.target.value)}
                placeholder={t('inv.transfers.receivedByPlaceholder')}
                className="h-9 text-sm rounded-lg"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReceiveTransferId(null)}
                className="text-xs text-[#86868B]"
              >
                {t('inv.common.cancel')}
              </Button>
              <Button size="sm" onClick={handleReceiveTransfer} className="text-xs bg-corporate">
                {t('inv.transfers.receive')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: CANCELAR TRANSFERENCIA ─── */}
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

      {/* ─── MODAL: PROGRAMAR CONTEO ─── */}
      <Dialog open={countModalOpen} onOpenChange={setCountModalOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1D1D1F] flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-corporate" />
              {t('inv.counts.schedule')}
            </DialogTitle>
          </DialogHeader>
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
                onClick={() => { setCountModalOpen(false); setCountForm(EMPTY_COUNT_FORM); }}
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
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: APLICAR AJUSTE DE CONTEO ─── */}
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

      {/* ─── MODAL: NUEVO SERIAL ─── */}
      <Dialog open={serialModalOpen} onOpenChange={setSerialModalOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1D1D1F] flex items-center gap-2">
              <Box className="h-4 w-4 text-corporate" />
              {t('inv.serials.new')}
            </DialogTitle>
          </DialogHeader>
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
                onClick={() => { setSerialModalOpen(false); setSerialForm(EMPTY_SERIAL_FORM); setSerialPhotoFile(null); }}
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
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: QR (producto / ubicación / serial) ─── */}
      <QrDialog
        open={qrDialog !== null}
        onOpenChange={open => { if (!open) setQrDialog(null); }}
        title={qrDialog?.title || ''}
        subtitle={qrDialog?.subtitle || ''}
        qrText={qrDialog?.qrText || ''}
      />

      {/* ─── MODAL: ESCANER QR ─── */}
      <ScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScanResult}
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

const SCANNER_CONTAINER_ID = 'inv-qr-scanner-container';

interface ScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (kind: 'product' | 'location' | 'serial', id: string) => void;
}

function ScannerModal({ open, onOpenChange, onScan }: ScannerModalProps) {
  // Ref para que el callback del escáner siempre vea el handler actual
  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    if (!open) return;
    let scanner: Html5QrcodeScanner | null = null;
    try {
      scanner = new Html5QrcodeScanner(
        SCANNER_CONTAINER_ID,
        { fps: 10, qrbox: 250 },
        /* verbose= */ false
      );
      scanner.render(
        (decodedText) => {
          let parsed: URL | null = null;
          try {
            parsed = new URL(decodedText);
          } catch {
            parsed = null;
          }
          const product = parsed?.searchParams.get('product');
          const location = parsed?.searchParams.get('location');
          const serial = parsed?.searchParams.get('serial');
          if (!product && !location && !serial) {
            toast.error(t('inv.scanner.unrecognized'));
            return;
          }
          // QR válido: detener la cámara y entregar el resultado
          scanner?.clear().catch(() => undefined);
          if (product) onScanRef.current('product', product);
          else if (location) onScanRef.current('location', location);
          else if (serial) onScanRef.current('serial', serial);
        },
        () => undefined // errores de lectura transitorios: se ignoran
      );
    } catch (err) {
      console.error('[ScannerModal]', err);
      toast.error(t('inv.scanner.error'));
    }
    // Apaga la cámara al desmontar / cerrar el modal
    return () => {
      scanner?.clear().catch(() => undefined);
    };
  }, [open]);

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
          <div id={SCANNER_CONTAINER_ID} className="rounded-xl overflow-hidden" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InventarioModule;
