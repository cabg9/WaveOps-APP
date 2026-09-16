// WAREHOUSE MODULE - Primera mitad (Fase 1B)
// Sub-pestañas: Pizarra (tablero del día), Órdenes (órdenes de renta con
// flujo canónico) y Retornos (verificación de retorno por escaneo).
// El catálogo de estados (rentalOrderStatuses) se CONSUME desde Firestore
// pero se administra en Develops → Catálogos → Estados de orden de renta.
// Todo payload lleva tenantId; los catálogos se crean desde la app
// (nada hardcodeado salvo seeds idempotentes con ids deterministas).
// Deep link: /warehouse?order=<id> abre el detalle de la orden.
import { useState, useEffect, useMemo, useRef, useId } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import QRCode from 'qrcode';
import {
  collection, onSnapshot, addDoc, updateDoc, doc, setDoc, getDoc, query, orderBy,
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useFirestoreUsers } from '@/hooks/firestore/useFirestoreUsers';
import { useStorageUpload } from '@/hooks/firestore/useStorageUpload';
import { useShifts } from '@/hooks/useShifts';
import { useAudit } from '@/hooks/useAudit';
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
import type {
  RentalOrder,
  RentalOrderStatus,
  RentalPaymentStatus,
  SerialStatus,
  RentalUnit,
  Product,
  Location,
  Client,
  InventoryStock,
  RentalDiscount,
} from '@/types/catalogs';
import type { AuditAction } from '@/types/develops';
import { CATALOG_COLLECTIONS } from '@/types/catalogs';
import {
  ClipboardList, Plus, Search, ChevronDown, ChevronUp,
  Construction, Package, UserPlus, MapPin, CalendarClock, Banknote, ArrowRight,
  RotateCcw, Users, LayoutGrid, Upload, QrCode, CheckCircle2, XCircle, Link2,
  Printer, AlertTriangle,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// I18N (prefijo wh.)
// ═══════════════════════════════════════════════════════════════════

registerI18nKeys({
  es: {
    'wh.devTitle': 'Módulo en desarrollo',
    'wh.devSubtitle': 'El módulo de Warehouse está en construcción. Estará disponible próximamente.',
    'wh.loading': 'Cargando warehouse...',
    'wh.error.load': 'Error al cargar datos de warehouse',
    'wh.tab.board': 'Pizarra',
    'wh.tab.orders': 'Órdenes',
    'wh.tab.returns': 'Retornos',

    'wh.common.save': 'Guardar',
    'wh.common.cancel': 'Cancelar',
    'wh.common.create': 'Crear',
    'wh.common.close': 'Cerrar',
    'wh.common.active': 'Activo',
    'wh.common.inactive': 'Inactivo',
    'wh.common.optional': 'opcional',

    'wh.orders.new': 'Nueva orden',
    'wh.orders.noStatuses': 'No hay estados de orden activos. Crea el catálogo en Desarrollo → Catálogos → Estados de orden de renta.',
    'wh.orders.empty': 'No hay órdenes de renta registradas',
    'wh.orders.searchPlaceholder': 'Buscar por cliente o número...',
    'wh.orders.filterStatus': 'Estado',
    'wh.orders.all': 'Todos',
    'wh.orders.itemsSummary': '{count} ítem(s)',
    'wh.orders.deliveryAt': 'Entrega',
    'wh.orders.createdBy': 'Creada por',

    'wh.orderForm.title': 'Nueva orden de renta',
    'wh.orderForm.clientType': 'Tipo de cliente',
    'wh.orderForm.clientTypeInterno': 'Interno (departamento)',
    'wh.orderForm.clientTypeExterno': 'Externo (persona o empresa)',
    'wh.orderForm.client': 'Cliente',
    'wh.orderForm.selectClient': 'Selecciona un cliente',
    'wh.orderForm.noInternalClients': 'No hay clientes internos activos. Crea uno en Catálogos maestros.',
    'wh.orderForm.createQuickClient': 'Crear cliente rápido',
    'wh.orderForm.quickClientTitle': 'Crear cliente rápido',
    'wh.orderForm.quickClientName': 'Nombre',
    'wh.orderForm.quickClientType': 'Tipo',
    'wh.orderForm.saveClient': 'Crear cliente',
    'wh.orderForm.items': 'Ítems',
    'wh.orderForm.addItem': 'Agregar ítem',
    'wh.orderForm.product': 'Producto',
    'wh.orderForm.selectProduct': 'Selecciona un producto rentable',
    'wh.orderForm.available': '{count} disponibles',
    'wh.orderForm.quantity': 'Cantidad',
    'wh.orderForm.tallaRef': 'Talla / ref.',
    'wh.orderForm.tallaRefPlaceholder': 'Pasajero o talla (rentas internas), opcional',
    'wh.orderForm.removeItem': 'Quitar ítem',
    'wh.orderForm.activityRef': 'Referencia de salida/actividad',
    'wh.orderForm.activityRefPlaceholder': 'Ej: salida de buceo, actividad del departamento...',
    'wh.orderForm.activityRefHelp': 'Opcional. Sirve para ligar la renta a una salida o actividad.',
    'wh.orderForm.deliveryDate': 'Fecha y hora de entrega',
    'wh.orderForm.location': 'Ubicación de entrega',
    'wh.orderForm.selectLocation': 'Selecciona una ubicación',
    'wh.orderForm.preparedBy': 'Quién prepara (opcional)',
    'wh.orderForm.noPreparer': 'Sin asignar',
    'wh.orderForm.payment': 'Pago',
    'wh.orderForm.paymentStatus': 'Estado de pago',
    'wh.orderForm.paymentStatus.pagada': 'Pagada',
    'wh.orderForm.paymentStatus.pendiente': 'Pendiente',
    'wh.orderForm.paymentStatus.parcial': 'Parcial',
    'wh.orderForm.paymentStatus.credito': 'Crédito',
    'wh.orderForm.proofModePhoto': 'Comprobante (foto)',
    'wh.orderForm.proofModeRef': 'Comprobante (n° de transacción)',
    'wh.orderForm.proofPhotoUpload': 'Subir foto del comprobante',
    'wh.orderForm.proofRef': 'N° de transacción',
    'wh.orderForm.proofRefPlaceholder': 'Ej: 1234567890',
    'wh.orderForm.depositAmount': 'Fianza (monto, opcional)',
    'wh.orderForm.depositSuggestion': 'Sugerencia: {days} día(s) × ${perDay}/día × {percent}% fianza = ${amount}',
    'wh.orderForm.observations': 'Observaciones',
    'wh.orderForm.observationsPlaceholder': 'Ej: entregar en recepción, cliente recoge con cédula...',
    'wh.orderForm.save': 'Crear orden',
    'wh.orderForm.validation.clientRequired': 'Selecciona un cliente',
    'wh.orderForm.validation.itemsRequired': 'Agrega al menos un ítem',
    'wh.orderForm.validation.itemProductRequired': 'Selecciona un producto en cada ítem',
    'wh.orderForm.validation.quantityPositive': 'La cantidad debe ser mayor que cero',
    'wh.orderForm.validation.deliveryRequired': 'La fecha y hora de entrega son obligatorias',

    'wh.detail.title': 'Orden de renta',
    'wh.detail.items': 'Ítems',
    'wh.detail.deliveryDate': 'Fecha de entrega',
    'wh.detail.location': 'Ubicación de entrega',
    'wh.detail.preparedBy': 'Preparada por',
    'wh.detail.unassigned': 'Sin asignar',
    'wh.detail.createdBy': 'Creada por',
    'wh.detail.createdAt': 'Creada',
    'wh.detail.updatedAt': 'Actualizada',
    'wh.detail.observations': 'Observaciones',
    'wh.detail.noObservations': 'Sin observaciones',
    'wh.detail.payment': 'Pago',
    'wh.detail.paymentStatus': 'Estado de pago',
    'wh.detail.proof': 'Comprobante',
    'wh.detail.noProof': 'Sin comprobante registrado',
    'wh.detail.viewProof': 'Ver comprobante',
    'wh.detail.proofRef': 'N° de transacción',
    'wh.detail.activityRef': 'Referencia de salida/actividad',
    'wh.detail.deposit': 'Fianza',
    'wh.detail.depositSuggestion': 'Sugerencia calculada: ${amount} ({days} día(s) × ${perDay}/día × {percent}%)',
    'wh.detail.depositStatus.retenida': 'Retenida',
    'wh.detail.depositStatus.devuelta': 'Devuelta',
    'wh.detail.depositStatus.descontada': 'Descontada',
    'wh.detail.markDepositReturned': 'Marcar devuelta',
    'wh.detail.discountDeposit': 'Descontar fianza',
    'wh.detail.discountTitle': 'Descontar fianza',
    'wh.detail.discountReason': 'Motivo (obligatorio)',
    'wh.detail.discountReasonPlaceholder': 'Ej: equipo dañado por mal uso, pieza faltante...',
    'wh.detail.discountEvidence': 'Evidencia (foto, opcional)',
    'wh.detail.discountEvidenceUpload': 'Subir evidencia',
    'wh.detail.discountApprovedBy': 'Aprobado por',
    'wh.detail.advance': 'Avanzar estado',
    'wh.detail.advanceTo': 'Avanzar a "{name}"',
    'wh.detail.authorized': 'Autorizada',
    'wh.detail.pendingAuth': 'Pendiente de pago',
    'wh.detail.timestamps': 'Registro de tiempos',
    'wh.detail.dispatchedAt': 'Despachada',
    'wh.detail.deliveredAt': 'Entregada',
    'wh.detail.returnedAt': 'Devuelta',
    'wh.detail.verifiedAt': 'Verificada',
    'wh.detail.storedAt': 'Almacenada',

    'wh.board.help': 'Tablero del día: las órdenes activas (sin estado final) agrupadas por su estado actual. Haz clic en una tarjeta para ver el detalle.',
    'wh.board.empty': 'No hay órdenes activas por ahora',
    'wh.board.shiftSummary': 'Resumen del turno',
    'wh.board.shiftSummaryHint': 'Lectura directa de los turnos publicados hoy en Horarios. No editable desde aquí.',
    'wh.board.noShifts': 'Nadie con turno publicado hoy',
    'wh.board.department': 'Departamento',
    'wh.board.client': 'Cliente',

    'wh.dispatch.button': 'Despachar (escanear)',
    'wh.dispatch.title': 'Despacho de orden',
    'wh.dispatch.step1': 'Orden',
    'wh.dispatch.step2': 'Seriales',
    'wh.dispatch.step3': 'Confirmar',
    'wh.dispatch.scanOrder': 'Escanear QR de la orden',
    'wh.dispatch.orSelect': 'O selecciona una orden manualmente',
    'wh.dispatch.selectOrderPlaceholder': 'Selecciona una orden lista para despachar',
    'wh.dispatch.noOrdersReady': 'No hay órdenes listas para despachar',
    'wh.dispatch.invalidStatus': 'La orden seleccionada no está lista para despachar',
    'wh.dispatch.orderUnknown': 'No se encontró la orden escaneada',
    'wh.dispatch.assigned': '{assigned}/{quantity}',
    'wh.dispatch.scanSerial': 'Escanear',
    'wh.dispatch.noSerials': 'No hay seriales registrados para este producto',
    'wh.dispatch.serialUnknown': 'No se encontró el serial escaneado',
    'wh.dispatch.serialWrongProduct': 'Este serial no corresponde a este ítem',
    'wh.dispatch.serialUnavailable': 'Este serial no está disponible para renta',
    'wh.dispatch.serialAlreadyAssigned': 'Este serial ya fue asignado en esta orden',
    'wh.dispatch.insufficient': 'Solo hay {available} disponible(s) y la orden pide {quantity}. Imposible despachar más unidades de las disponibles.',
    'wh.dispatch.allAssigned': 'Asigna todos los seriales antes de continuar',
    'wh.dispatch.summary': 'Se despacharán {units} unidad(es) de {items} ítem(s) de la orden de {client}.',
    'wh.dispatch.next': 'Continuar',
    'wh.dispatch.back': 'Atrás',
    'wh.dispatch.confirm': 'Confirmar despacho',
    'wh.dispatch.confirmTitle': 'Confirmar despacho',
    'wh.dispatch.confirmDesc': 'La orden pasará a "Despachado", los seriales quedarán como rentados y se registrará la salida de inventario.',
    'wh.dispatch.unrecognizedQr': 'QR no reconocido: escanea el QR de una orden o de un serial',

    'wh.return.button': 'Verificar retorno',
    'wh.return.title': 'Verificar retorno',
    'wh.return.instructions': 'Revisa cada serial devuelto y márcalo como OK o Dañada.',
    'wh.return.markOk': 'OK',
    'wh.return.markDamaged': 'Dañada',
    'wh.return.noSerials': 'Esta orden no tiene seriales asignados; usa "Avanzar estado" para registrar el retorno.',
    'wh.return.finish': 'Finalizar verificación',
    'wh.return.confirmTitle': 'Finalizar verificación',
    'wh.return.confirmDesc': 'Los seriales OK volverán a disponible, los dañados pasarán a reparación y se registrará la devolución en inventario.',
    'wh.return.depositHint': 'Hay equipo dañado y una fianza retenida: se sugiere descontar la fianza.',
    'wh.return.goDiscount': 'Descontar fianza',

    'wh.returns.help': 'Cola de verificación: órdenes devueltas que esperan la revisión de su equipo. También se listan las órdenes en poder del cliente.',
    'wh.returns.queue': 'Pendientes de verificar',
    'wh.returns.queueEmpty': 'No hay órdenes devueltas pendientes de verificar',
    'wh.returns.withClient': 'En poder del cliente',
    'wh.returns.withClientEmpty': 'No hay órdenes en poder del cliente',
    'wh.returns.verify': 'Verificar',
    'wh.returns.returnedAt': 'Devuelta',
    'wh.returns.serials': 'Seriales',

    'wh.board.pendingReturns': 'Retornos pendientes',
    'wh.board.pendingReturnsEmpty': 'No hay retornos pendientes de verificar',
    'wh.board.pendingReturnsHint': 'Órdenes devueltas que esperan verificación de equipo.',
    'wh.board.viewDetail': 'Ver detalle',

    'wh.scanner.title': 'Escanear QR',
    'wh.scanner.hint': 'Apunta la cámara al QR de la orden o del serial. También acepta texto plano de serial.',
    'wh.scanner.unrecognized': 'QR no reconocido',
    'wh.scanner.manualEntry': 'Ingresar código manual',
    'wh.scanner.manualPlaceholder': 'Pega la URL del QR o escribe el ID de la orden o del serial',
    'wh.scanner.manualApply': 'Usar código',

    'wh.toast.dispatched': 'Orden despachada',
    'wh.toast.returnVerified': 'Retorno verificado',

    'wh.returns.devTitle': 'Retornos',
    'wh.returns.devSubtitle': 'La gestión de retornos llegará en la siguiente fase.',

    'wh.toast.orderCreated': 'Orden creada',
    'wh.toast.statusChanged': 'Estado actualizado',
    'wh.toast.clientCreated': 'Cliente creado',
    'wh.toast.depositReturned': 'Fianza marcada como devuelta',
    'wh.toast.depositDiscounted': 'Fianza descontada',
    'wh.toast.error': 'Error al guardar',

    'wh.confirm.advanceTitle': 'Avanzar estado',
    'wh.confirm.advanceDesc': 'La orden pasará a "{name}".',
    'wh.confirm.depositReturnTitle': 'Marcar fianza devuelta',
    'wh.confirm.depositReturnDesc': 'Se registrará que la fianza fue devuelta al cliente.',
    'wh.confirm.discountTitle': 'Descontar fianza',
    'wh.confirm.discountDesc': 'Se descontará la fianza de esta orden. Requiere motivo obligatorio y quedará registrado quién lo aprueba.',

    'wh.quick.dispatch': 'Despachar',
    'wh.quick.return': 'Retorno',
    'wh.quick.detail': 'Ver detalle',
    'wh.quick.qr': 'Imprimir QR',

    'wh.qr.print': 'Imprimir',
    'wh.qr.title': 'QR de la orden',
    'wh.qr.hint': 'Escanea este código para abrir la orden en Warehouse.',

    'wh.emergency.button': 'Modo emergencia',
    'wh.emergency.title': 'Despacho de emergencia',
    'wh.emergency.desc': 'El escáner no está disponible. Un supervisor puede forzar el avance de la orden; el motivo es obligatorio y la acción queda auditada.',
    'wh.emergency.target': 'Avanzar a',
    'wh.emergency.reason': 'Motivo (obligatorio)',
    'wh.emergency.reasonPlaceholder': 'Ej: cámara del escáner dañada, QR ilegible...',
    'wh.emergency.forbidden': 'Solo supervisores pueden usar el modo emergencia',
    'wh.emergency.toast': 'Avance forzado registrado (emergencia)',

    'wh.scanOnly.dispatchBlocked': 'El despacho solo es posible escaneando el QR de la orden y los seriales, o con el modo emergencia.',
    'wh.scanOnly.returnBlocked': 'La verificación del retorno solo es posible escaneando el QR de la orden y los seriales que regresan, o con el modo emergencia.',

    'wh.orderForm.unitPrice': 'Precio unit.',
    'wh.orderForm.subtotal': 'Subtotal',
    'wh.orderForm.discount': 'Descuento',
    'wh.orderForm.discountNone': 'Sin descuento',
    'wh.orderForm.total': 'Total',
    'wh.orderForm.locationAvailability': 'Disponibilidad en {location}',
    'wh.orderForm.availableInLocation': '{product} ×{count} disponibles',

    'wh.detail.subtotal': 'Subtotal',
    'wh.detail.discountLabel': 'Descuento',
    'wh.detail.total': 'Total',
    'wh.detail.emergency': 'Avance de emergencia',
    'wh.detail.emergencyBy': 'Forzado por',

    'wh.return.scanOrder': 'Escanear QR de la orden',
    'wh.return.orSelect': 'O selecciona una orden manualmente',
    'wh.return.selectOrderPlaceholder': 'Selecciona una orden despachada o entregada',
    'wh.return.noOrdersForReturn': 'No hay órdenes despachadas o entregadas',
    'wh.return.invalidStatus': 'La orden seleccionada no está en retorno',
    'wh.return.scanSerials': 'Escanear seriales que regresan',
    'wh.return.scanSerialsHint': 'Escanea el QR o código de cada serial devuelto; solo los seriales escaneados se verifican.',
    'wh.return.serialUnknown': 'No se encontró el serial escaneado',
    'wh.return.serialNotAssigned': 'Este serial no pertenece a esta orden',
    'wh.return.serialAlreadyScanned': 'Este serial ya fue escaneado',
    'wh.return.returned': 'Regresó',
  },
  en: {
    'wh.devTitle': 'Module under development',
    'wh.devSubtitle': 'The Warehouse module is under construction. It will be available soon.',
    'wh.loading': 'Loading warehouse...',
    'wh.error.load': 'Error loading warehouse data',
    'wh.tab.board': 'Board',
    'wh.tab.orders': 'Orders',
    'wh.tab.returns': 'Returns',

    'wh.common.save': 'Save',
    'wh.common.cancel': 'Cancel',
    'wh.common.create': 'Create',
    'wh.common.close': 'Close',
    'wh.common.active': 'Active',
    'wh.common.inactive': 'Inactive',
    'wh.common.optional': 'optional',

    'wh.orders.new': 'New order',
    'wh.orders.noStatuses': 'No active order statuses. Create the catalog in Develops → Catalogs → Rental order statuses.',
    'wh.orders.empty': 'No rental orders recorded',
    'wh.orders.searchPlaceholder': 'Search by client or number...',
    'wh.orders.filterStatus': 'Status',
    'wh.orders.all': 'All',
    'wh.orders.itemsSummary': '{count} item(s)',
    'wh.orders.deliveryAt': 'Delivery',
    'wh.orders.createdBy': 'Created by',

    'wh.orderForm.title': 'New rental order',
    'wh.orderForm.clientType': 'Client type',
    'wh.orderForm.clientTypeInterno': 'Internal (department)',
    'wh.orderForm.clientTypeExterno': 'External (person or company)',
    'wh.orderForm.client': 'Client',
    'wh.orderForm.selectClient': 'Select a client',
    'wh.orderForm.noInternalClients': 'No active internal clients. Create one in Master Catalogs.',
    'wh.orderForm.createQuickClient': 'Quick create client',
    'wh.orderForm.quickClientTitle': 'Quick create client',
    'wh.orderForm.quickClientName': 'Name',
    'wh.orderForm.quickClientType': 'Type',
    'wh.orderForm.saveClient': 'Create client',
    'wh.orderForm.items': 'Items',
    'wh.orderForm.addItem': 'Add item',
    'wh.orderForm.product': 'Product',
    'wh.orderForm.selectProduct': 'Select a rentable product',
    'wh.orderForm.available': '{count} available',
    'wh.orderForm.quantity': 'Quantity',
    'wh.orderForm.tallaRef': 'Size / ref.',
    'wh.orderForm.tallaRefPlaceholder': 'Passenger or size (internal rentals), optional',
    'wh.orderForm.removeItem': 'Remove item',
    'wh.orderForm.activityRef': 'Activity/trip reference',
    'wh.orderForm.activityRefPlaceholder': 'E.g.: diving trip, department activity...',
    'wh.orderForm.activityRefHelp': 'Optional. Use it to link the rental to a trip or activity.',
    'wh.orderForm.deliveryDate': 'Delivery date and time',
    'wh.orderForm.location': 'Delivery location',
    'wh.orderForm.selectLocation': 'Select a location',
    'wh.orderForm.preparedBy': 'Prepared by (optional)',
    'wh.orderForm.noPreparer': 'Unassigned',
    'wh.orderForm.payment': 'Payment',
    'wh.orderForm.paymentStatus': 'Payment status',
    'wh.orderForm.paymentStatus.pagada': 'Paid',
    'wh.orderForm.paymentStatus.pendiente': 'Pending',
    'wh.orderForm.paymentStatus.parcial': 'Partial',
    'wh.orderForm.paymentStatus.credito': 'Credit',
    'wh.orderForm.proofModePhoto': 'Proof (photo)',
    'wh.orderForm.proofModeRef': 'Proof (transaction no.)',
    'wh.orderForm.proofPhotoUpload': 'Upload proof photo',
    'wh.orderForm.proofRef': 'Transaction no.',
    'wh.orderForm.proofRefPlaceholder': 'E.g.: 1234567890',
    'wh.orderForm.depositAmount': 'Deposit (amount, optional)',
    'wh.orderForm.depositSuggestion': 'Suggestion: {days} day(s) × ${perDay}/day × {percent}% deposit = ${amount}',
    'wh.orderForm.observations': 'Observations',
    'wh.orderForm.observationsPlaceholder': 'E.g.: deliver at reception, client picks up with ID...',
    'wh.orderForm.save': 'Create order',
    'wh.orderForm.validation.clientRequired': 'Select a client',
    'wh.orderForm.validation.itemsRequired': 'Add at least one item',
    'wh.orderForm.validation.itemProductRequired': 'Select a product on every item',
    'wh.orderForm.validation.quantityPositive': 'Quantity must be greater than zero',
    'wh.orderForm.validation.deliveryRequired': 'Delivery date and time are required',

    'wh.detail.title': 'Rental order',
    'wh.detail.items': 'Items',
    'wh.detail.deliveryDate': 'Delivery date',
    'wh.detail.location': 'Delivery location',
    'wh.detail.preparedBy': 'Prepared by',
    'wh.detail.unassigned': 'Unassigned',
    'wh.detail.createdBy': 'Created by',
    'wh.detail.createdAt': 'Created',
    'wh.detail.updatedAt': 'Updated',
    'wh.detail.observations': 'Observations',
    'wh.detail.noObservations': 'No observations',
    'wh.detail.payment': 'Payment',
    'wh.detail.paymentStatus': 'Payment status',
    'wh.detail.proof': 'Proof',
    'wh.detail.noProof': 'No proof recorded',
    'wh.detail.viewProof': 'View proof',
    'wh.detail.proofRef': 'Transaction no.',
    'wh.detail.activityRef': 'Activity/trip reference',
    'wh.detail.deposit': 'Deposit',
    'wh.detail.depositSuggestion': 'Calculated suggestion: ${amount} ({days} day(s) × ${perDay}/day × {percent}%)',
    'wh.detail.depositStatus.retenida': 'Held',
    'wh.detail.depositStatus.devuelta': 'Returned',
    'wh.detail.depositStatus.descontada': 'Discounted',
    'wh.detail.markDepositReturned': 'Mark returned',
    'wh.detail.discountDeposit': 'Discount deposit',
    'wh.detail.discountTitle': 'Discount deposit',
    'wh.detail.discountReason': 'Reason (required)',
    'wh.detail.discountReasonPlaceholder': 'E.g.: gear damaged by misuse, missing piece...',
    'wh.detail.discountEvidence': 'Evidence (photo, optional)',
    'wh.detail.discountEvidenceUpload': 'Upload evidence',
    'wh.detail.discountApprovedBy': 'Approved by',
    'wh.detail.advance': 'Advance status',
    'wh.detail.advanceTo': 'Advance to "{name}"',
    'wh.detail.authorized': 'Authorized',
    'wh.detail.pendingAuth': 'Payment pending',
    'wh.detail.timestamps': 'Timeline',
    'wh.detail.dispatchedAt': 'Dispatched',
    'wh.detail.deliveredAt': 'Delivered',
    'wh.detail.returnedAt': 'Returned',
    'wh.detail.verifiedAt': 'Verified',
    'wh.detail.storedAt': 'Stored',

    'wh.board.help': 'Board of the day: active orders (no final status) grouped by current status. Click a card to see the detail.',
    'wh.board.empty': 'No active orders right now',
    'wh.board.shiftSummary': 'Shift summary',
    'wh.board.shiftSummaryHint': 'Read-only from shifts published today in Schedules. Not editable here.',
    'wh.board.noShifts': 'No one with a published shift today',
    'wh.board.department': 'Department',
    'wh.board.client': 'Client',

    'wh.dispatch.button': 'Dispatch (scan)',
    'wh.dispatch.title': 'Order dispatch',
    'wh.dispatch.step1': 'Order',
    'wh.dispatch.step2': 'Serials',
    'wh.dispatch.step3': 'Confirm',
    'wh.dispatch.scanOrder': 'Scan order QR',
    'wh.dispatch.orSelect': 'Or select an order manually',
    'wh.dispatch.selectOrderPlaceholder': 'Select an order ready to dispatch',
    'wh.dispatch.noOrdersReady': 'No orders ready to dispatch',
    'wh.dispatch.invalidStatus': 'The selected order is not ready to dispatch',
    'wh.dispatch.orderUnknown': 'Scanned order not found',
    'wh.dispatch.assigned': '{assigned}/{quantity}',
    'wh.dispatch.scanSerial': 'Scan',
    'wh.dispatch.noSerials': 'No serials recorded for this product',
    'wh.dispatch.serialUnknown': 'Scanned serial not found',
    'wh.dispatch.serialWrongProduct': 'This serial does not belong to this item',
    'wh.dispatch.serialUnavailable': 'This serial is not available for rental',
    'wh.dispatch.serialAlreadyAssigned': 'This serial is already assigned in this order',
    'wh.dispatch.insufficient': 'Only {available} available and the order asks for {quantity}. Impossible to dispatch more units than available.',
    'wh.dispatch.allAssigned': 'Assign all serials before continuing',
    'wh.dispatch.summary': '{units} unit(s) of {items} item(s) will be dispatched for {client}\'s order.',
    'wh.dispatch.next': 'Continue',
    'wh.dispatch.back': 'Back',
    'wh.dispatch.confirm': 'Confirm dispatch',
    'wh.dispatch.confirmTitle': 'Confirm dispatch',
    'wh.dispatch.confirmDesc': 'The order will move to "Dispatched", the serials will be marked as rented and the inventory output will be recorded.',
    'wh.dispatch.unrecognizedQr': 'Unrecognized QR: scan an order or serial QR',

    'wh.return.button': 'Verify return',
    'wh.return.title': 'Verify return',
    'wh.return.instructions': 'Review each returned serial and mark it as OK or Damaged.',
    'wh.return.markOk': 'OK',
    'wh.return.markDamaged': 'Damaged',
    'wh.return.noSerials': 'This order has no assigned serials; use "Advance status" to record the return.',
    'wh.return.finish': 'Finish verification',
    'wh.return.confirmTitle': 'Finish verification',
    'wh.return.confirmDesc': 'OK serials will become available, damaged ones will go to repair and the return will be recorded in inventory.',
    'wh.return.depositHint': 'There is damaged gear and a held deposit: discounting the deposit is suggested.',
    'wh.return.goDiscount': 'Discount deposit',

    'wh.returns.help': 'Verification queue: returned orders waiting for their gear to be checked. Orders in the client\'s possession are also listed.',
    'wh.returns.queue': 'Pending verification',
    'wh.returns.queueEmpty': 'No returned orders pending verification',
    'wh.returns.withClient': 'In client\'s possession',
    'wh.returns.withClientEmpty': 'No orders in client\'s possession',
    'wh.returns.verify': 'Verify',
    'wh.returns.returnedAt': 'Returned',
    'wh.returns.serials': 'Serials',

    'wh.board.pendingReturns': 'Pending returns',
    'wh.board.pendingReturnsEmpty': 'No returns pending verification',
    'wh.board.pendingReturnsHint': 'Returned orders waiting for gear verification.',
    'wh.board.viewDetail': 'View detail',

    'wh.scanner.title': 'Scan QR',
    'wh.scanner.hint': 'Point the camera at the order or serial QR. Plain serial text is also accepted.',
    'wh.scanner.unrecognized': 'Unrecognized QR',
    'wh.scanner.manualEntry': 'Enter code manually',
    'wh.scanner.manualPlaceholder': 'Paste the QR URL or type the order or serial ID',
    'wh.scanner.manualApply': 'Use code',

    'wh.toast.dispatched': 'Order dispatched',
    'wh.toast.returnVerified': 'Return verified',

    'wh.returns.devTitle': 'Returns',
    'wh.returns.devSubtitle': 'Return management will arrive in the next phase.',

    'wh.toast.orderCreated': 'Order created',
    'wh.toast.statusChanged': 'Status updated',
    'wh.toast.clientCreated': 'Client created',
    'wh.toast.depositReturned': 'Deposit marked as returned',
    'wh.toast.depositDiscounted': 'Deposit discounted',
    'wh.toast.error': 'Error saving',

    'wh.confirm.advanceTitle': 'Advance status',
    'wh.confirm.advanceDesc': 'The order will move to "{name}".',
    'wh.confirm.depositReturnTitle': 'Mark deposit returned',
    'wh.confirm.depositReturnDesc': 'It will be recorded that the deposit was returned to the client.',
    'wh.confirm.discountTitle': 'Discount deposit',
    'wh.confirm.discountDesc': 'The deposit for this order will be discounted. A mandatory reason is required and who approves it will be recorded.',

    'wh.quick.dispatch': 'Dispatch',
    'wh.quick.return': 'Return',
    'wh.quick.detail': 'View detail',
    'wh.quick.qr': 'Print QR',

    'wh.qr.print': 'Print',
    'wh.qr.title': 'Order QR',
    'wh.qr.hint': 'Scan this code to open the order in Warehouse.',

    'wh.emergency.button': 'Emergency mode',
    'wh.emergency.title': 'Emergency dispatch',
    'wh.emergency.desc': 'The scanner is unavailable. A supervisor can force the order to advance; the reason is mandatory and the action is audited.',
    'wh.emergency.target': 'Advance to',
    'wh.emergency.reason': 'Reason (required)',
    'wh.emergency.reasonPlaceholder': 'E.g.: scanner camera broken, QR unreadable...',
    'wh.emergency.forbidden': 'Only supervisors can use emergency mode',
    'wh.emergency.toast': 'Forced advance recorded (emergency)',

    'wh.scanOnly.dispatchBlocked': 'Dispatch is only possible by scanning the order QR and the serials, or via emergency mode.',
    'wh.scanOnly.returnBlocked': 'Return verification is only possible by scanning the order QR and the returning serials, or via emergency mode.',

    'wh.orderForm.unitPrice': 'Unit price',
    'wh.orderForm.subtotal': 'Subtotal',
    'wh.orderForm.discount': 'Discount',
    'wh.orderForm.discountNone': 'No discount',
    'wh.orderForm.total': 'Total',
    'wh.orderForm.locationAvailability': 'Availability at {location}',
    'wh.orderForm.availableInLocation': '{product} ×{count} available',

    'wh.detail.subtotal': 'Subtotal',
    'wh.detail.discountLabel': 'Discount',
    'wh.detail.total': 'Total',
    'wh.detail.emergency': 'Emergency advance',
    'wh.detail.emergencyBy': 'Forced by',

    'wh.return.scanOrder': 'Scan order QR',
    'wh.return.orSelect': 'Or select an order manually',
    'wh.return.selectOrderPlaceholder': 'Select a dispatched or delivered order',
    'wh.return.noOrdersForReturn': 'No dispatched or delivered orders',
    'wh.return.invalidStatus': 'The selected order is not in return',
    'wh.return.scanSerials': 'Scan returning serials',
    'wh.return.scanSerialsHint': 'Scan the QR or code of each returned serial; only scanned serials are verified.',
    'wh.return.serialUnknown': 'Scanned serial not found',
    'wh.return.serialNotAssigned': 'This serial does not belong to this order',
    'wh.return.serialAlreadyScanned': 'This serial was already scanned',
    'wh.return.returned': 'Returned',
  },
});

// Interpola {variables} en un texto de i18n
function tf(key: string, vars: Record<string, string | number>): string {
  let out = t(key);
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(`{${k}}`, String(v));
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════
// PARSERS DEFENSIVOS (docs Firestore → tipos)
// ═══════════════════════════════════════════════════════════════════

const toStr = (v: unknown): string => (typeof v === 'string' ? v : '');
const toNum = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const toNumOrNull = (v: unknown): number | null | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : v === null ? null : undefined;
const toBool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback);

function docToProduct(id: string, data: Record<string, unknown>): Product {
  const priceTiers: Product['priceTiers'] = Array.isArray(data.priceTiers)
    ? (data.priceTiers as Array<Record<string, unknown>>)
        .filter(t => t && typeof t === 'object')
        .map(t => ({
          minQty: toNum(t.minQty),
          maxQty: toNumOrNull(t.maxQty) ?? null,
          pricePerDay: toNum(t.pricePerDay),
        }))
        .filter(t => t.minQty > 0 && t.pricePerDay > 0)
        .sort((a, b) => a.minQty - b.minQty)
    : null;
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
    rentalPricePerDay: toNumOrNull(data.rentalPricePerDay) ?? null,
    depositPercent: toNumOrNull(data.depositPercent) ?? null,
    priceTiers,
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
    country: data.country ? toStr(data.country) : undefined,
    city: data.city ? toStr(data.city) : undefined,
    province: data.province ? toStr(data.province) : undefined,
    address: data.address ? toStr(data.address) : undefined,
    responsibleUserId: data.responsibleUserId ? toStr(data.responsibleUserId) : undefined,
    responsibleDepartmentId: data.responsibleDepartmentId ? toStr(data.responsibleDepartmentId) : undefined,
    relatedModules: Array.isArray(data.relatedModules)
      ? (data.relatedModules as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
    notes: data.notes ? toStr(data.notes) : undefined,
    isActive: toBool(data.isActive, true),
    createdAt: toStr(data.createdAt),
    createdBy: toStr(data.createdBy),
  };
}

function docToClient(id: string, data: Record<string, unknown>): Client {
  return {
    id,
    tenantId: toStr(data.tenantId),
    type: (data.type as Client['type']) ?? 'persona',
    identification: data.identification ? toStr(data.identification) : undefined,
    name: toStr(data.name),
    contactName: data.contactName ? toStr(data.contactName) : undefined,
    email: data.email ? toStr(data.email) : undefined,
    phone: data.phone ? toStr(data.phone) : undefined,
    departmentId: data.departmentId ? toStr(data.departmentId) : undefined,
    isActive: toBool(data.isActive, true),
    createdAt: toStr(data.createdAt),
    createdBy: toStr(data.createdBy),
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
        unitPrice: toNumOrNull(raw.unitPrice) ?? null,
        subtotal: toNumOrNull(raw.subtotal) ?? null,
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
    paymentStatus: (data.paymentStatus as RentalPaymentStatus) ?? 'pendiente',
    paymentProofUrl: data.paymentProofUrl ? toStr(data.paymentProofUrl) : null,
    paymentProofRef: data.paymentProofRef ? toStr(data.paymentProofRef) : null,
    depositAmount: toNumOrNull(data.depositAmount) ?? null,
    depositStatus: (data.depositStatus as RentalOrder['depositStatus']) ?? null,
    depositDiscountApprovedBy: data.depositDiscountApprovedBy ? toStr(data.depositDiscountApprovedBy) : null,
    depositDiscountEvidenceUrl: data.depositDiscountEvidenceUrl ? toStr(data.depositDiscountEvidenceUrl) : null,
    subtotal: toNumOrNull(data.subtotal) ?? null,
    discountId: data.discountId ? toStr(data.discountId) : null,
    discountName: data.discountName ? toStr(data.discountName) : null,
    discountPercent: toNumOrNull(data.discountPercent) ?? null,
    total: toNumOrNull(data.total) ?? null,
    emergencyDispatchReason: data.emergencyDispatchReason ? toStr(data.emergencyDispatchReason) : null,
    emergencyDispatchBy: data.emergencyDispatchBy ? toStr(data.emergencyDispatchBy) : null,
    emergencyDispatchAt: data.emergencyDispatchAt ? toStr(data.emergencyDispatchAt) : null,
    observations: data.observations ? toStr(data.observations) : null,
    activityRef: data.activityRef ? toStr(data.activityRef) : null,
    preparedBy: data.preparedBy ? toStr(data.preparedBy) : null,
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

function docToInventoryStock(id: string, data: Record<string, unknown>): InventoryStock {
  return {
    id,
    tenantId: toStr(data.tenantId),
    productId: toStr(data.productId),
    locationId: toStr(data.locationId),
    quantity: toNum(data.quantity),
    updatedAt: toStr(data.updatedAt),
    updatedBy: toStr(data.updatedBy),
  };
}

function docToRentalDiscount(id: string, data: Record<string, unknown>): RentalDiscount {
  return {
    id,
    tenantId: toStr(data.tenantId),
    name: toStr(data.name),
    percent: toNum(data.percent),
    isActive: toBool(data.isActive, true),
    createdAt: toStr(data.createdAt),
    createdBy: toStr(data.createdBy),
    updatedAt: data.updatedAt ? toStr(data.updatedAt) : undefined,
    updatedBy: data.updatedBy ? toStr(data.updatedBy) : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════
// ROLES
// ═══════════════════════════════════════════════════════════════════

const MONEY_ROLES: Role[] = [
  Role.DIRECTOR_GENERAL,
  Role.DIRECTOR,
  Role.RRHH,
  Role.GERENTE_OPERACIONES,
  Role.GERENTE_DEPARTAMENTO,
  Role.SUPERVISOR,
];

const APPROVE_ROLES: Role[] = [
  Role.DIRECTOR_GENERAL,
  Role.RRHH,
  Role.GERENTE_OPERACIONES,
  Role.GERENTE_DEPARTAMENTO,
  Role.SUPERVISOR,
];

// Nivel Supervisor+ (misma jerarquía que InventarioModule): puede forzar el
// avance de una orden en modo emergencia cuando el escáner no funciona
const SUPERVISOR_PLUS_ROLES: Role[] = [
  Role.DIRECTOR_GENERAL,
  Role.DIRECTOR,
  Role.RRHH,
  Role.GERENTE_OPERACIONES,
  Role.GERENTE_DEPARTAMENTO,
  Role.SUPERVISOR,
];

// Estados que SOLO avanzan escaneando (QR de orden + seriales); el único
// atajo manual permitido es el modo emergencia (Supervisor+, auditado)
const SCAN_ONLY_STATUS_IDS = ['despachado', 'devuelto', 'verificado'];

const round2 = (n: number) => Math.round(n * 100) / 100;

// Precio por unidad/día aplicable a una cantidad: el tier más específico
// (mayor minQty) cuyo rango cubra la cantidad; sin tier, el precio base.
// null = producto sin precio definido.
function unitPriceForQty(product: Product | undefined, qty: number): number | null {
  if (!product || product.rentalPricePerDay == null) return null;
  const tiers = (product.priceTiers ?? []).filter(
    t => qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty)
  );
  if (tiers.length === 0) return product.rentalPricePerDay;
  return tiers.reduce((best, t) => (t.minQty >= best.minQty ? t : best)).pricePerDay;
}

// ═══════════════════════════════════════════════════════════════════
// TIPOS INTERNOS
// ═══════════════════════════════════════════════════════════════════

type WhTab = 'board' | 'orders' | 'returns';

interface OrderItemDraft {
  productId: string;
  quantity: string;
  tallaRef: string;
}

interface OrderFormState {
  clientType: 'interno' | 'externo';
  clientId: string;
  deliveryDate: string;
  locationId: string;
  preparedBy: string;
  paymentStatus: RentalPaymentStatus;
  proofMode: 'foto' | 'ref';
  proofRef: string;
  depositAmount: string;
  discountId: string; // '' = sin descuento (ref rentalDiscounts)
  observations: string;
  activityRef: string;
}

const EMPTY_ORDER_FORM: OrderFormState = {
  clientType: 'externo',
  clientId: '',
  deliveryDate: '',
  locationId: '',
  preparedBy: '',
  paymentStatus: 'pendiente',
  proofMode: 'ref',
  proofRef: '',
  depositAmount: '',
  discountId: '',
  observations: '',
  activityRef: '',
};

// Sugerencia de fianza: Σ (cantidad × precio/día) × días × % fianza / 100.
// Requiere fecha de entrega válida y que TODOS los ítems tengan producto con
// rentalPricePerDay y depositPercent; si no, no hay sugerencia (null).
interface DepositSuggestion {
  amount: number; // fianza sugerida, redondeada a 2 decimales
  days: number; // días de renta (mínimo 1)
  perDay: number; // valor de renta por día
  percent: number; // % de fianza efectivo (ponderado)
}

function computeDepositSuggestion(
  items: Array<{ productId: string; quantity: number }>,
  deliveryDate: string,
  fromIso: string,
  products: Product[],
): DepositSuggestion | null {
  if (!deliveryDate || items.length === 0) return null;
  const deliveryMs = new Date(deliveryDate).getTime();
  if (Number.isNaN(deliveryMs)) return null;
  const fromMs = new Date(fromIso).getTime();
  const base = Number.isNaN(fromMs) ? Date.now() : fromMs;
  const days = Math.max(1, Math.ceil((deliveryMs - base) / 86400000));
  let perDay = 0;
  let total = 0;
  for (const it of items) {
    const p = products.find(pr => pr.id === it.productId);
    if (!p || p.rentalPricePerDay == null || p.depositPercent == null) return null;
    const qty = it.quantity;
    if (!Number.isFinite(qty) || qty <= 0) return null;
    const daily = qty * p.rentalPricePerDay;
    perDay += daily;
    total += daily * days * (p.depositPercent / 100);
  }
  if (perDay <= 0) return null;
  const amount = Math.round(total * 100) / 100;
  return {
    amount,
    days,
    perDay: Math.round(perDay * 100) / 100,
    percent: Math.round((amount * 10000) / (perDay * days)) / 100,
  };
}

// Badges de estado por orden de secuencia (mismo lenguaje visual del módulo)
function statusBadgeClass(status: RentalOrderStatus | undefined): string {
  if (!status) return 'bg-[#F5F5F7] text-[#86868B] border border-[#E5E5E7]';
  if (status.isFinalOk) return 'bg-green-50 text-green-700 border border-green-200';
  if (status.isFinalRepair) return 'bg-red-50 text-red-700 border border-red-200';
  const palette: Record<number, string> = {
    1: 'bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5E7]',
    2: 'bg-blue-50 text-blue-700 border border-blue-200',
    3: 'bg-amber-50 text-amber-700 border border-amber-200',
    4: 'bg-orange-50 text-orange-700 border border-orange-200',
    5: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
    6: 'bg-purple-50 text-purple-700 border border-purple-200',
    7: 'bg-teal-50 text-teal-700 border border-teal-200',
  };
  return palette[status.order] ?? 'bg-[#F5F5F7] text-[#86868B] border border-[#E5E5E7]';
}

const PAYMENT_STATUS_BADGE: Record<RentalPaymentStatus, string> = {
  pagada: 'bg-green-50 text-green-700 border border-green-200',
  pendiente: 'bg-amber-50 text-amber-700 border border-amber-200',
  parcial: 'bg-blue-50 text-blue-700 border border-blue-200',
  credito: 'bg-purple-50 text-purple-700 border border-purple-200',
};

const DEPOSIT_STATUS_BADGE: Record<string, string> = {
  retenida: 'bg-amber-50 text-amber-700 border border-amber-200',
  devuelta: 'bg-green-50 text-green-700 border border-green-200',
  descontada: 'bg-red-50 text-red-700 border border-red-200',
};

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export function WarehouseModule() {
  const { user: currentUser } = useAuth();
  const { isFeatureEnabled } = useAppConfig();
  const { users } = useFirestoreUsers();
  const { uploadImage, uploading: uploadingFile } = useStorageUpload();
  const { getUserShifts } = useShifts();

  // Estado compartido (lo reusan las sub-pestañas y los siguientes agentes)
  const [orders, setOrders] = useState<RentalOrder[]>([]);
  const [statuses, setStatuses] = useState<RentalOrderStatus[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [rentalUnits, setRentalUnits] = useState<RentalUnit[]>([]);
  const [serialStatuses, setSerialStatuses] = useState<SerialStatus[]>([]);
  const [stocks, setStocks] = useState<InventoryStock[]>([]);
  const [rentalDiscounts, setRentalDiscounts] = useState<RentalDiscount[]>([]);

  // Estado de carga / error
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Navegación entre sub-pestañas
  const [tab, setTab] = useState<WhTab>('board');

  // Tarjetas expandibles (lista de órdenes)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Detalle de orden (Dialog compartido: lista, pizarra y deep link)
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  // Deep link (?order=<id>): abre el detalle y limpia el param una sola vez
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkHandled = useRef(false);

  // Filtros de la lista de órdenes
  const [filterStatusId, setFilterStatusId] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  // Formulario de nueva orden
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderForm, setOrderForm] = useState<OrderFormState>(EMPTY_ORDER_FORM);
  const [orderItems, setOrderItems] = useState<OrderItemDraft[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  // La sugerencia de fianza solo rellena el campo mientras el usuario no lo
  // haya editado manualmente
  const depositTouched = useRef(false);

  // Cliente rápido (mini-form dentro del dialog de nueva orden)
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientType, setQuickClientType] = useState<'persona' | 'empresa'>('persona');
  const [savingClient, setSavingClient] = useState(false);

  // Descontar fianza (solo canApprove)
  const [discountOrderId, setDiscountOrderId] = useState<string | null>(null);
  const [discountReason, setDiscountReason] = useState('');
  const [discountFile, setDiscountFile] = useState<File | null>(null);
  const [savingDiscount, setSavingDiscount] = useState(false);

  // Despacho con escaneo QR (WH-D2): paso 1 orden, paso 2 seriales, paso 3 confirmar
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchOrderId, setDispatchOrderId] = useState<string | null>(null);
  const [dispatchStep, setDispatchStep] = useState(1);
  // Asignación de seriales por índice de ítem (anti-sobre-renta: máx. quantity)
  const [dispatchAssignments, setDispatchAssignments] = useState<Record<number, string[]>>({});
  // Destino del escáner: 'order' (paso 1) o índice de ítem (paso 2)
  const [scanTarget, setScanTarget] = useState<'order' | number | null>(null);
  const [savingDispatch, setSavingDispatch] = useState(false);

  // Verificación de retorno (WH-D2): marca por serial 'ok' | 'damaged'
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const [returnStep, setReturnStep] = useState<1 | 2>(1);
  // Seriales que regresan: solo entran a la verificación escaneándolos
  const [returnedSerialIds, setReturnedSerialIds] = useState<Set<string>>(new Set());
  const [returnMarks, setReturnMarks] = useState<Record<string, 'ok' | 'damaged'>>({});
  const [savingReturn, setSavingReturn] = useState(false);
  // Destino del escáner en el flujo de retorno: QR de orden o serial devuelto
  const [returnScanTarget, setReturnScanTarget] = useState<'order' | 'serial' | null>(null);

  // Modo emergencia (Supervisor+): forzar avance con motivo obligatorio
  const [emergencyOrderId, setEmergencyOrderId] = useState<string | null>(null);
  const [emergencyTargetId, setEmergencyTargetId] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('');
  const [savingEmergency, setSavingEmergency] = useState(false);

  // QR imprimible de la orden (botón rápido de las tarjetas)
  const [qrOrderId, setQrOrderId] = useState<string | null>(null);

  const { logAction } = useAudit();

  const tenantId = getCurrentTenantId();
  const enabled = isFeatureEnabled('enableWarehouse');
  const role = currentUser?.role;
  const canSeeMoney = !!role && MONEY_ROLES.includes(role);
  const canApprove = !!role && APPROVE_ROLES.includes(role);
  const canSupervise = !!role && SUPERVISOR_PLUS_ROLES.includes(role);
  const canOperate = !!currentUser; // cualquier usuario autenticado opera órdenes

  const activeStatuses = useMemo(
    () => statuses.filter(s => s.isActive).sort((a, b) => a.order - b.order),
    [statuses]
  );
  const sortedStatuses = useMemo(
    () => [...statuses].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    [statuses]
  );
  const activeProducts = useMemo(() => products.filter(p => p.isActive), [products]);
  const rentableProducts = useMemo(() => activeProducts.filter(p => p.isRentable), [activeProducts]);
  const activeLocations = useMemo(() => locations.filter(l => l.isActive), [locations]);
  const activeClients = useMemo(() => clients.filter(c => c.isActive), [clients]);
  const activeUsers = useMemo(() => users.filter(u => u.isActive), [users]);
  const activeDiscounts = useMemo(
    () => rentalDiscounts.filter(d => d.isActive && d.percent > 0),
    [rentalDiscounts]
  );

  const stockAtLocation = (productId: string, locationId: string) =>
    stocks.find(s => s.productId === productId && s.locationId === locationId)?.quantity ?? 0;

  // Unidades disponibles por producto (solo lectura, anti-sobre-renta visual)
  const availableUnitsCount = (productId: string) =>
    rentalUnits.filter(u => {
      if (u.productId !== productId) return false;
      const st = serialStatuses.find(s => s.id === u.statusId);
      return st ? !st.blocksRental : false;
    }).length;

  const productName = (id: string) => products.find(p => p.id === id)?.name || id;
  const locationName = (id: string) => locations.find(l => l.id === id)?.name || id;
  const statusById = (id: string) => statuses.find(s => s.id === id);
  const statusName = (s: RentalOrderStatus | undefined) =>
    !s ? '—' : getLanguage() === 'en' && s.nameEn ? s.nameEn : s.name;
  const userName = (id: string) => users.find(u => u.id === id)?.name || id;

  // Sugerencia de fianza del formulario (solo canSeeMoney): días entre ahora y
  // la entrega; se recalcula al cambiar ítems, fecha o catálogo de productos
  const formDepositSuggestion = useMemo(
    () =>
      canSeeMoney
        ? computeDepositSuggestion(
            orderItems
              .filter(it => it.productId)
              .map(it => ({ productId: it.productId, quantity: Number(it.quantity) || 0 })),
            orderForm.deliveryDate,
            new Date().toISOString(),
            products,
          )
        : null,
    [canSeeMoney, orderItems, orderForm.deliveryDate, products]
  );

  // Prellena el monto de fianza con la sugerencia mientras no se haya tocado
  useEffect(() => {
    if (!canSeeMoney || depositTouched.current || !formDepositSuggestion) return;
    const value = String(formDepositSuggestion.amount);
    setOrderForm(prev => (prev.depositAmount === value ? prev : { ...prev, depositAmount: value }));
  }, [canSeeMoney, formDepositSuggestion]);

  // Precios del formulario (solo canSeeMoney): por ítem se aplica el tier que
  // corresponda a la cantidad (sin tier, precio base); el descuento
  // seleccionado se aplica sobre el subtotal. Base: 1 día de renta.
  // Las líneas se alinean por índice con orderItems (ítem sin producto o
  // cantidad inválida queda con precio null).
  const formPricing = useMemo(() => {
    if (!canSeeMoney) return null;
    const lines = orderItems.map(it => {
      const qty = Number(it.quantity);
      const product = it.productId ? products.find(p => p.id === it.productId) : undefined;
      const unitPrice =
        product && Number.isFinite(qty) && qty > 0 ? unitPriceForQty(product, qty) : null;
      return {
        productId: it.productId,
        qty,
        unitPrice,
        lineTotal: unitPrice != null ? round2(qty * unitPrice) : null,
      };
    });
    const subtotal = round2(lines.reduce((acc, l) => acc + (l.lineTotal ?? 0), 0));
    const discount = activeDiscounts.find(d => d.id === orderForm.discountId) ?? null;
    const percent = discount?.percent ?? 0;
    const total = round2(subtotal * (1 - percent / 100));
    return { lines, subtotal, discount, percent, total };
  }, [canSeeMoney, orderItems, products, activeDiscounts, orderForm.discountId]);

  // Sugerencia de fianza de una orden existente (referencia en el detalle):
  // días entre su creación y la fecha de entrega
  const orderDepositSuggestion = (order: RentalOrder): DepositSuggestion | null =>
    canSeeMoney
      ? computeDepositSuggestion(order.items, order.deliveryDate, order.createdAt, products)
      : null;

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return [...orders]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .filter(o => {
        if (filterStatusId && o.statusId !== filterStatusId) return false;
        if (!q) return true;
        const num = o.orderNumber != null ? String(o.orderNumber) : '';
        return o.clientName.toLowerCase().includes(q) || num.includes(q);
      });
  }, [orders, filterStatusId, orderSearch]);

  const detailOrder = detailOrderId ? orders.find(o => o.id === detailOrderId) ?? null : null;
  const dispatchOrder = dispatchOrderId ? orders.find(o => o.id === dispatchOrderId) ?? null : null;
  const returnOrder = returnOrderId ? orders.find(o => o.id === returnOrderId) ?? null : null;

  // ═══════════════════════════════════════════════════════════════════
  // DEEP LINK /warehouse?order=<id>
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!enabled || deepLinkHandled.current) return;
    const orderParam = searchParams.get('order');
    if (orderParam) {
      deepLinkHandled.current = true;
      setDetailOrderId(orderParam);
      const next = new URLSearchParams(searchParams);
      next.delete('order');
      setSearchParams(next, { replace: true });
    }
  }, [enabled, searchParams, setSearchParams]);

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
        console.error('[WarehouseModule] products:', err);
        setLoadError(true);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [enabled, tenantId]);

  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.rentalOrders), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setOrders(
          snap.docs
            .map(d => docToRentalOrder(d.id, d.data()))
            .filter(o => !o.tenantId || o.tenantId === tenantId)
        );
      },
      (err) => console.error('[WarehouseModule] rentalOrders:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.rentalOrderStatuses), orderBy('order', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setStatuses(
          snap.docs
            .map(d => docToRentalOrderStatus(d.id, d.data()))
            .filter(s => !s.tenantId || s.tenantId === tenantId)
        );
      },
      (err) => console.error('[WarehouseModule] rentalOrderStatuses:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.clients), orderBy('name', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setClients(
          snap.docs
            .map(d => docToClient(d.id, d.data()))
            .filter(c => !c.tenantId || c.tenantId === tenantId)
        );
      },
      (err) => console.error('[WarehouseModule] clients:', err)
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
      (err) => console.error('[WarehouseModule] locations:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  useEffect(() => {
    if (!enabled) return;
    const unsub = onSnapshot(
      collection(db, CATALOG_COLLECTIONS.rentalUnits),
      (snap) => {
        setRentalUnits(
          snap.docs
            .map(d => docToRentalUnit(d.id, d.data()))
            .filter(u => !u.tenantId || u.tenantId === tenantId)
        );
      },
      (err) => console.error('[WarehouseModule] rentalUnits:', err)
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
      (err) => console.error('[WarehouseModule] serialStatuses:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  // Stock por producto/ubicación (disponibilidad mostrada en el formulario)
  useEffect(() => {
    if (!enabled) return;
    const unsub = onSnapshot(
      collection(db, CATALOG_COLLECTIONS.inventoryStocks),
      (snap) => {
        setStocks(
          snap.docs
            .map(d => docToInventoryStock(d.id, d.data()))
            .filter(s => !s.tenantId || s.tenantId === tenantId)
        );
      },
      (err) => console.error('[WarehouseModule] inventoryStocks:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  // Descuentos preconfigurados de renta (selector del formulario de orden)
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, CATALOG_COLLECTIONS.rentalDiscounts), orderBy('name', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRentalDiscounts(
          snap.docs
            .map(d => docToRentalDiscount(d.id, d.data()))
            .filter(d => !d.tenantId || d.tenantId === tenantId)
        );
      },
      (err) => console.error('[WarehouseModule] rentalDiscounts:', err)
    );
    return () => unsub();
  }, [enabled, tenantId]);

  // ═══════════════════════════════════════════════════════════════════
  // CLIENTE RÁPIDO
  // ═══════════════════════════════════════════════════════════════════

  const createQuickClient = async () => {
    const name = quickClientName.trim();
    if (!name) return;
    setSavingClient(true);
    try {
      const docRef = await addDoc(collection(db, CATALOG_COLLECTIONS.clients), {
        tenantId,
        type: quickClientType,
        name,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: currentUser!.id,
      });
      setOrderForm(prev => ({ ...prev, clientId: docRef.id }));
      setQuickClientName('');
      setQuickClientType('persona');
      setQuickClientOpen(false);
      toast.success(t('wh.toast.clientCreated'));
    } catch (err) {
      console.error('[WarehouseModule] createQuickClient:', err);
      toast.error(t('wh.toast.error'));
    } finally {
      setSavingClient(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // NUEVA ORDEN
  // TODO WH-audit: registrar la creación de órdenes cuando exista una
  // acción de auditoría genérica adecuada (sin inventar tipos nuevos).
  // ═══════════════════════════════════════════════════════════════════

  const openOrderModal = () => {
    setOrderForm(EMPTY_ORDER_FORM);
    setOrderItems([{ productId: '', quantity: '1', tallaRef: '' }]);
    setProofFile(null);
    setQuickClientOpen(false);
    setQuickClientName('');
    depositTouched.current = false;
    setOrderModalOpen(true);
  };

  const updateItem = (index: number, patch: Partial<OrderItemDraft>) => {
    setOrderItems(prev => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const saveOrder = async () => {
    if (!canOperate) return;
    const client = activeClients.find(c => c.id === orderForm.clientId);
    if (!client) {
      toast.error(t('wh.orderForm.validation.clientRequired'));
      return;
    }
    if (orderItems.length === 0) {
      toast.error(t('wh.orderForm.validation.itemsRequired'));
      return;
    }
    for (const it of orderItems) {
      if (!it.productId) {
        toast.error(t('wh.orderForm.validation.itemProductRequired'));
        return;
      }
      const qty = Number(it.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        toast.error(t('wh.orderForm.validation.quantityPositive'));
        return;
      }
    }
    if (!orderForm.deliveryDate) {
      toast.error(t('wh.orderForm.validation.deliveryRequired'));
      return;
    }
    const firstStatus = activeStatuses[0];
    if (!firstStatus) {
      toast.error(t('wh.orders.noStatuses'));
      return;
    }

    setSavingOrder(true);
    try {
      let paymentProofUrl: string | null = null;
      if (canSeeMoney && orderForm.proofMode === 'foto' && proofFile) {
        paymentProofUrl = await uploadImage(proofFile, 'payments');
      }
      const deposit = canSeeMoney ? Number(orderForm.depositAmount) : 0;
      const hasDeposit = canSeeMoney && Number.isFinite(deposit) && deposit > 0;
      const now = new Date().toISOString();
      // Precios cobrados: solo los registra personal con permiso de montos.
      // Los demás roles dejan los campos en null (la orden no expone dinero).
      const pricingLines = canSeeMoney
        ? orderItems.map(it => {
            const qty = Number(it.quantity);
            const product = products.find(p => p.id === it.productId);
            const unitPrice = product ? unitPriceForQty(product, qty) : null;
            return { unitPrice, subtotal: unitPrice != null ? round2(qty * unitPrice) : null };
          })
        : [];
      const subtotal = canSeeMoney && formPricing ? formPricing.subtotal : null;
      const discount = canSeeMoney ? formPricing?.discount ?? null : null;
      const total = canSeeMoney && formPricing ? formPricing.total : null;
      await addDoc(collection(db, CATALOG_COLLECTIONS.rentalOrders), {
        tenantId,
        // TODO: orderNumber lo asigna una Cloud Function (correlativo); por ahora null
        orderNumber: null,
        clientType: orderForm.clientType,
        clientId: client.id,
        clientName: client.name,
        items: orderItems.map((it, idx) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          tallaRef: it.tallaRef.trim() || null,
          ...(canSeeMoney
            ? { unitPrice: pricingLines[idx]?.unitPrice ?? null, subtotal: pricingLines[idx]?.subtotal ?? null }
            : {}),
        })),
        deliveryDate: orderForm.deliveryDate,
        locationId: orderForm.locationId || null,
        statusId: firstStatus.id,
        paymentStatus: canSeeMoney ? orderForm.paymentStatus : 'pendiente',
        paymentProofUrl,
        paymentProofRef:
          canSeeMoney && orderForm.proofMode === 'ref' && orderForm.proofRef.trim()
            ? orderForm.proofRef.trim()
            : null,
        depositAmount: hasDeposit ? deposit : null,
        depositStatus: hasDeposit ? 'retenida' : null,
        ...(canSeeMoney
          ? {
              subtotal,
              discountId: discount?.id ?? null,
              discountName: discount?.name ?? null,
              discountPercent: discount?.percent ?? null,
              total,
            }
          : {}),
        activityRef:
          orderForm.clientType === 'interno' && orderForm.activityRef.trim()
            ? orderForm.activityRef.trim()
            : null,
        observations: orderForm.observations.trim() || null,
        preparedBy: orderForm.preparedBy || null,
        createdAt: now,
        createdBy: currentUser!.id,
        createdByName: currentUser!.name,
        updatedAt: now,
      });
      setOrderModalOpen(false);
      toast.success(t('wh.toast.orderCreated'));
    } catch (err) {
      console.error('[WarehouseModule] saveOrder:', err);
      toast.error(t('wh.toast.error'));
    } finally {
      setSavingOrder(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // TRANSICIONES DE ESTADO
  // despachado / devuelto / verificado NO avanzan con el botón manual: el
  // único camino es escanear (QR de orden + seriales); el modo emergencia
  // (Supervisor+, motivo obligatorio y auditado) es el único atajo.
  // ═══════════════════════════════════════════════════════════════════

  const orderHasAssignedSerials = (order: RentalOrder) =>
    order.items.some(it => (it.assignedUnitIds ?? []).length > 0);

  const isScanOnlyTarget = (order: RentalOrder, targetId: string) => {
    if (!SCAN_ONLY_STATUS_IDS.includes(targetId)) return false;
    // Sin seriales asignados no hay nada que escanear: el avance manual sigue
    // disponible para no bloquear órdenes de productos no serializados
    if ((targetId === 'devuelto' || targetId === 'verificado') && !orderHasAssignedSerials(order)) {
      return false;
    }
    return true;
  };

  const buildTransitionPatch = (target: RentalOrderStatus): Record<string, unknown> => {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { statusId: target.id, updatedAt: now };
    const key = target.id || '';
    if (key === 'despachado') {
      // Solo ocurre vía modo emergencia: el escaneo normal lo registra en confirmDispatch
      patch.dispatchedBy = currentUser!.name;
      patch.dispatchedAt = now;
    }
    if (key === 'entregado') patch.deliveredAt = now;
    if (key === 'devuelto') patch.returnedAt = now;
    if (key === 'verificado') {
      patch.verifiedBy = currentUser!.name;
      patch.verifiedAt = now;
    }
    if (key === 'almacenado') patch.storedAt = now;
    return patch;
  };

  const advanceOrder = async (order: RentalOrder, target: RentalOrderStatus) => {
    if (!canOperate) return;
    if (isScanOnlyTarget(order, target.id || '')) {
      toast.error(
        target.id === 'despachado'
          ? t('wh.scanOnly.dispatchBlocked')
          : t('wh.scanOnly.returnBlocked')
      );
      return;
    }
    await executeWithConfirm(
      {
        level: 2,
        title: t('wh.confirm.advanceTitle'),
        description: tf('wh.confirm.advanceDesc', { name: statusName(target) }),
      },
      async () => {
        try {
          await updateDoc(doc(db, CATALOG_COLLECTIONS.rentalOrders, order.id!), buildTransitionPatch(target));
          toast.success(t('wh.toast.statusChanged'));
        } catch (err) {
          console.error('[WarehouseModule] advanceOrder:', err);
          toast.error(t('wh.toast.error'));
        }
      }
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // MODO EMERGENCIA: el escáner no funciona y un Supervisor+ debe forzar el
  // avance. Motivo obligatorio en la orden + registro de auditoría.
  // ═══════════════════════════════════════════════════════════════════

  const openEmergency = (order: RentalOrder) => {
    if (!canSupervise) {
      toast.error(t('wh.emergency.forbidden'));
      return;
    }
    const firstBlocked = advanceTargetsFor(order).find(t => isScanOnlyTarget(order, t.id || ''));
    setEmergencyOrderId(order.id!);
    setEmergencyTargetId(firstBlocked?.id ?? '');
    setEmergencyReason('');
  };

  const saveEmergency = async () => {
    const order = orders.find(o => o.id === emergencyOrderId);
    const target = statuses.find(s => s.id === emergencyTargetId);
    const reason = emergencyReason.trim();
    if (!order || !currentUser) return;
    if (!target || !reason) {
      toast.error(t('wh.emergency.reason'));
      return;
    }
    await executeWithConfirm(
      {
        level: 'major',
        title: t('wh.emergency.title'),
        description: tf('wh.confirm.advanceDesc', { name: statusName(target) }),
      },
      async () => {
        setSavingEmergency(true);
        try {
          const now = new Date().toISOString();
          await updateDoc(doc(db, CATALOG_COLLECTIONS.rentalOrders, order.id!), {
            ...buildTransitionPatch(target),
            emergencyDispatchReason: reason,
            emergencyDispatchBy: currentUser.name,
            emergencyDispatchAt: now,
          });
          await logAction({
            action: 'RENTAL_ORDER_EMERGENCY_DISPATCH' as AuditAction,
            targetType: 'rental_order',
            targetId: order.id!,
            targetName: order.orderNumber != null ? `Orden #${order.orderNumber}` : order.clientName,
            previousValue: { statusId: order.statusId },
            newValue: { statusId: target.id, reason },
            impactLevel: 'sensitive',
            description: `Avance forzado en modo emergencia a "${statusName(target)}" sin escáner. Motivo: ${reason}`,
          });
          setEmergencyOrderId(null);
          toast.success(t('wh.emergency.toast'));
        } catch (err) {
          console.error('[WarehouseModule] saveEmergency:', err);
          toast.error(t('wh.toast.error'));
        } finally {
          setSavingEmergency(false);
        }
      }
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // FIANZA
  // ═══════════════════════════════════════════════════════════════════

  const markDepositReturned = async (order: RentalOrder) => {
    if (!canOperate) return;
    await executeWithConfirm(
      {
        level: 2,
        title: t('wh.confirm.depositReturnTitle'),
        description: t('wh.confirm.depositReturnDesc'),
      },
      async () => {
        try {
          await updateDoc(doc(db, CATALOG_COLLECTIONS.rentalOrders, order.id!), {
            depositStatus: 'devuelta',
            updatedAt: new Date().toISOString(),
          });
          toast.success(t('wh.toast.depositReturned'));
        } catch (err) {
          console.error('[WarehouseModule] markDepositReturned:', err);
          toast.error(t('wh.toast.error'));
        }
      }
    );
  };

  const openDiscount = (order: RentalOrder) => {
    setDiscountOrderId(order.id!);
    setDiscountReason('');
    setDiscountFile(null);
  };

  const saveDiscount = async () => {
    const order = orders.find(o => o.id === discountOrderId);
    if (!order) return;
    const reason = discountReason.trim();
    if (!reason) {
      toast.error(t('wh.detail.discountReason'));
      return;
    }
    setSavingDiscount(true);
    try {
      let evidenceUrl: string | null = null;
      if (discountFile) {
        evidenceUrl = await uploadImage(discountFile, 'deposits');
      }
      await updateDoc(doc(db, CATALOG_COLLECTIONS.rentalOrders, order.id!), {
        depositStatus: 'descontada',
        depositDiscountApprovedBy: currentUser!.name,
        depositDiscountEvidenceUrl: evidenceUrl,
        observations: order.observations
          ? `${order.observations}\n[Fianza descontada] ${reason}`
          : `[Fianza descontada] ${reason}`,
        updatedAt: new Date().toISOString(),
      });
      setDiscountOrderId(null);
      toast.success(t('wh.toast.depositDiscounted'));
    } catch (err) {
      console.error('[WarehouseModule] saveDiscount:', err);
      toast.error(t('wh.toast.error'));
    } finally {
      setSavingDiscount(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // DESPACHO (WH-D2): escaneo QR de orden + asignación exacta de seriales
  // TODO WH-audit: registrar el despacho cuando exista una acción de
  // auditoría genérica adecuada (sin inventar tipos nuevos).
  // ═══════════════════════════════════════════════════════════════════

  const serialStatusName = (s: SerialStatus) =>
    getLanguage() === 'en' && s.nameEn ? s.nameEn : s.name;

  const serialAvailable = (unit: RentalUnit) => {
    const st = serialStatuses.find(s => s.id === unit.statusId);
    return st ? !st.blocksRental : false;
  };

  // Descuenta/suma stock de un producto en una ubicación (crea el doc si no existe)
  const adjustStock = async (productId: string, locationId: string, delta: number, now: string) => {
    const ref = doc(db, CATALOG_COLLECTIONS.inventoryStocks, `${productId}__${locationId}`);
    const snap = await getDoc(ref);
    const current = snap.exists() && typeof snap.data().quantity === 'number' ? snap.data().quantity : 0;
    await setDoc(
      ref,
      {
        tenantId,
        productId,
        locationId,
        quantity: current + delta,
        updatedAt: now,
        updatedBy: currentUser!.name,
      },
      { merge: true }
    );
  };

  const openDispatch = (orderId?: string) => {
    setDispatchAssignments({});
    setScanTarget(null);
    setDispatchStep(orderId ? 2 : 1);
    setDispatchOrderId(orderId ?? null);
    setDispatchOpen(true);
  };

  const closeDispatch = () => {
    setDispatchOpen(false);
    setDispatchOrderId(null);
    setDispatchAssignments({});
    setScanTarget(null);
  };

  const selectDispatchOrder = (order: RentalOrder) => {
    if (order.statusId !== 'listo_despachar') {
      toast.error(t('wh.dispatch.invalidStatus'));
      return;
    }
    setDispatchOrderId(order.id!);
    setDispatchAssignments({});
    setDispatchStep(2);
  };

  const toggleSerialForItem = (itemIdx: number, unitId: string) => {
    const order = dispatchOrder;
    if (!order) return;
    const qty = order.items[itemIdx]?.quantity ?? 0;
    setDispatchAssignments(prev => {
      const cur = prev[itemIdx] ?? [];
      if (cur.includes(unitId)) return { ...prev, [itemIdx]: cur.filter(x => x !== unitId) };
      // Bloqueo anti-sobre-renta: nunca más de quantity
      if (cur.length >= qty) return prev;
      return { ...prev, [itemIdx]: [...cur, unitId] };
    });
  };

  // Resultado del escáner: QR de orden (${origin}/warehouse?order=<id>) o de
  // serial (${origin}/requisiciones?serial=<id>); texto plano = serial
  const handleDispatchScan = (kind: 'order' | 'serial', id: string) => {
    setScanTarget(null);
    if (kind === 'order') {
      const order = orders.find(o => o.id === id);
      if (!order) {
        toast.error(t('wh.dispatch.orderUnknown'));
        return;
      }
      selectDispatchOrder(order);
      return;
    }
    const unit = rentalUnits.find(u => u.id === id || u.serialNumber === id);
    if (!unit) {
      toast.error(t('wh.dispatch.serialUnknown'));
      return;
    }
    if (!dispatchOrder) return;
    const itemIdx = dispatchOrder.items.findIndex(it => it.productId === unit.productId);
    if (itemIdx === -1) {
      toast.error(t('wh.dispatch.serialWrongProduct'));
      return;
    }
    if (!serialAvailable(unit)) {
      toast.error(t('wh.dispatch.serialUnavailable'));
      return;
    }
    const alreadyAssigned = Object.entries(dispatchAssignments).some(
      ([idx, ids]) => Number(idx) !== itemIdx && ids.includes(unit.id!)
    );
    if (alreadyAssigned) {
      toast.error(t('wh.dispatch.serialAlreadyAssigned'));
      return;
    }
    toggleSerialForItem(itemIdx, unit.id!);
  };

  // Resolución de códigos manuales: texto plano = id de orden o de serial
  // (también acepta el número de serie); devuelve null si no hay coincidencia
  const resolveManualScanCode = (raw: string): { kind: 'order' | 'serial'; id: string } | null => {
    const text = raw.trim();
    if (!text) return null;
    if (orders.some(o => o.id === text)) return { kind: 'order', id: text };
    if (rentalUnits.some(u => u.id === text || u.serialNumber === text)) return { kind: 'serial', id: text };
    return null;
  };

  const dispatchComplete =
    !!dispatchOrder &&
    dispatchOrder.items.every((it, idx) => (dispatchAssignments[idx] ?? []).length === it.quantity);

  const confirmDispatch = async () => {
    const order = dispatchOrder;
    if (!order || !currentUser || !dispatchComplete) return;
    await executeWithConfirm(
      {
        level: 'major',
        title: t('wh.dispatch.confirmTitle'),
        description: t('wh.dispatch.confirmDesc'),
      },
      async () => {
        setSavingDispatch(true);
        try {
          const now = new Date().toISOString();
          const newItems = order.items.map((it, idx) => ({
            ...it,
            assignedUnitIds: dispatchAssignments[idx] ?? [],
          }));
          await updateDoc(doc(db, CATALOG_COLLECTIONS.rentalOrders, order.id!), {
            statusId: 'despachado',
            dispatchedBy: currentUser.name,
            dispatchedAt: now,
            items: newItems,
            updatedAt: now,
          });
          const allUnitIds = newItems.flatMap(it => it.assignedUnitIds ?? []);
          for (const unitId of allUnitIds) {
            await updateDoc(doc(db, CATALOG_COLLECTIONS.rentalUnits, unitId), {
              statusId: 'rentado',
              updatedAt: now,
              updatedBy: currentUser.name,
            });
          }
          for (const it of newItems) {
            const qty = (it.assignedUnitIds ?? []).length;
            if (qty === 0) continue;
            // Bitácora inmutable de la salida por renta
            await addDoc(collection(db, CATALOG_COLLECTIONS.inventoryMovements), {
              tenantId,
              productId: it.productId,
              quantity: -qty,
              fromLocationId: order.locationId ?? null,
              toLocationId: null,
              movementTypeId: 'renta',
              reason: `Renta orden ${order.clientName}`,
              referenceType: 'rental',
              referenceId: order.id,
              createdAt: now,
              createdBy: currentUser.id,
              createdByName: currentUser.name,
            });
            if (order.locationId) {
              await adjustStock(it.productId, order.locationId, -qty, now);
            }
          }
          // TODO WH-audit: registrar el despacho cuando exista una acción adecuada
          closeDispatch();
          toast.success(t('wh.toast.dispatched'));
        } catch (err) {
          console.error('[WarehouseModule] confirmDispatch:', err);
          toast.error(t('wh.toast.error'));
        } finally {
          setSavingDispatch(false);
        }
      }
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // RETORNO (WH-D2): verificación de seriales devueltos.
  // Flujo obligatorio por escáner: (1) QR de la orden, (2) cada serial que
  // regresa se escanea para entrar a la verificación y se marca OK/Dañada.
  // Solo así la orden avanza a su estado final (almacenado / a reparación).
  // TODO WH-audit: registrar la verificación cuando exista una acción de
  // auditoría genérica adecuada (sin inventar tipos nuevos).
  // ═══════════════════════════════════════════════════════════════════

  // Seriales asignados de la orden, con el índice del ítem al que pertenecen
  const assignedUnitEntries = (order: RentalOrder) => {
    const out: Array<{ unitId: string; itemIdx: number }> = [];
    order.items.forEach((it, idx) => {
      (it.assignedUnitIds ?? []).forEach(unitId => out.push({ unitId, itemIdx: idx }));
    });
    return out;
  };

  const openReturn = (orderId?: string) => {
    setReturnOrderId(orderId ?? null);
    setReturnStep(orderId ? 2 : 1);
    setReturnedSerialIds(new Set());
    setReturnMarks({});
    setReturnOpen(true);
  };

  const closeReturn = () => {
    setReturnOpen(false);
    setReturnOrderId(null);
    setReturnStep(1);
    setReturnedSerialIds(new Set());
    setReturnMarks({});
  };

  const selectReturnOrder = (order: RentalOrder) => {
    if (order.statusId !== 'despachado' && order.statusId !== 'entregado') {
      toast.error(t('wh.return.invalidStatus'));
      return;
    }
    setReturnOrderId(order.id!);
    setReturnedSerialIds(new Set());
    setReturnMarks({});
    setReturnStep(2);
  };

  // Escaneo en el flujo de retorno: QR de orden (paso 1) o serial devuelto
  const handleReturnScan = (kind: 'order' | 'serial', id: string) => {
    setReturnScanTarget(null);
    if (kind === 'order') {
      const order = orders.find(o => o.id === id);
      if (!order) {
        toast.error(t('wh.dispatch.orderUnknown'));
        return;
      }
      selectReturnOrder(order);
      return;
    }
    const order = returnOrder;
    if (!order) return;
    const unit = rentalUnits.find(u => u.id === id || u.serialNumber === id);
    if (!unit) {
      toast.error(t('wh.return.serialUnknown'));
      return;
    }
    const assigned = assignedUnitEntries(order).some(e => e.unitId === unit.id);
    if (!assigned) {
      toast.error(t('wh.return.serialNotAssigned'));
      return;
    }
    if (returnedSerialIds.has(unit.id!)) {
      toast.error(t('wh.return.serialAlreadyScanned'));
      return;
    }
    setReturnedSerialIds(prev => new Set(prev).add(unit.id!));
  };

  const finalizeReturn = async () => {
    const order = returnOrder;
    if (!order || !currentUser) return;
    const entries = assignedUnitEntries(order);
    const returnedEntries = entries.filter(e => returnedSerialIds.has(e.unitId));
    const okIds = returnedEntries.filter(e => returnMarks[e.unitId] === 'ok').map(e => e.unitId);
    const damagedIds = returnedEntries.filter(e => returnMarks[e.unitId] === 'damaged').map(e => e.unitId);
    // Todo serial asignado debe haber regresado (escaneado) y estar marcado
    if (entries.length > 0 && okIds.length + damagedIds.length < entries.length) return;
    await executeWithConfirm(
      {
        level: 'major',
        title: t('wh.return.confirmTitle'),
        description: t('wh.return.confirmDesc'),
      },
      async () => {
        setSavingReturn(true);
        try {
          const now = new Date().toISOString();
          for (const unitId of okIds) {
            await updateDoc(doc(db, CATALOG_COLLECTIONS.rentalUnits, unitId), {
              statusId: 'disponible',
              updatedAt: now,
              updatedBy: currentUser.name,
            });
          }
          for (const unitId of damagedIds) {
            await updateDoc(doc(db, CATALOG_COLLECTIONS.rentalUnits, unitId), {
              statusId: 'en_reparacion',
              updatedAt: now,
              updatedBy: currentUser.name,
            });
          }
          // Devolución a inventario: solo las unidades OK vuelven al stock
          for (const [idx, it] of order.items.entries()) {
            const okQty = returnedEntries.filter(e => e.itemIdx === idx && returnMarks[e.unitId] === 'ok').length;
            if (okQty === 0) continue;
            await addDoc(collection(db, CATALOG_COLLECTIONS.inventoryMovements), {
              tenantId,
              productId: it.productId,
              quantity: okQty,
              fromLocationId: null,
              toLocationId: order.locationId ?? null,
              movementTypeId: 'devolucion',
              reason: 'Retorno de renta',
              referenceType: 'rental',
              referenceId: order.id,
              createdAt: now,
              createdBy: currentUser.id,
              createdByName: currentUser.name,
            });
            if (order.locationId) {
              await adjustStock(it.productId, order.locationId, okQty, now);
            }
          }
          const allOk = entries.length === 0 || damagedIds.length === 0;
          await updateDoc(doc(db, CATALOG_COLLECTIONS.rentalOrders, order.id!), {
            statusId: allOk ? 'almacenado' : 'a_reparacion',
            verifiedBy: currentUser.name,
            verifiedAt: now,
            ...(order.returnedAt ? {} : { returnedAt: now }),
            ...(allOk ? { storedAt: now } : {}),
            updatedAt: now,
          });
          // TODO WH-audit: registrar la verificación cuando exista una acción adecuada
          closeReturn();
          toast.success(t('wh.toast.returnVerified'));
        } catch (err) {
          console.error('[WarehouseModule] finalizeReturn:', err);
          toast.error(t('wh.toast.error'));
        } finally {
          setSavingReturn(false);
        }
      }
    );
  };

  // Colas de la sub-pestaña Retornos y de la pizarra
  const returnedQueue = useMemo(() => orders.filter(o => o.statusId === 'devuelto'), [orders]);
  const withClientOrders = useMemo(
    () => orders.filter(o => o.statusId === 'despachado' || o.statusId === 'entregado'),
    [orders]
  );

  // ═══════════════════════════════════════════════════════════════════
  // DERIVADOS DE RENDER
  // ═══════════════════════════════════════════════════════════════════

  // Siguientes estados ofrecidos: el primer no-final; si solo quedan
  // finales, se ofrecen todos los finales (almacenado / a_reparacion).
  // Los estados de escaneo obligatorio (despachado, devuelto, verificado con
  // seriales asignados) nunca se ofrecen aquí: solo avanzan escaneando.
  const advanceTargetsFor = (order: RentalOrder): RentalOrderStatus[] => {
    const current = statusById(order.statusId);
    if (!current) return [];
    const nexts = activeStatuses
      .filter(s => s.order > current.order)
      .filter(s => !isScanOnlyTarget(order, s.id || ''));
    const nonFinal = nexts.filter(s => !s.isFinalOk && !s.isFinalRepair);
    if (nonFinal.length > 0) return [nonFinal[0]];
    return nexts.filter(s => s.isFinalOk || s.isFinalRepair);
  };

  const itemsSummary = (order: RentalOrder) =>
    order.items.map(it => `${productName(it.productId)} ×${it.quantity}`).join(' · ');

  const fmtDateTime = (iso: string | null | undefined) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
  };

  const fmtTime = (iso: string | null | undefined) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Pizarra: órdenes activas (sin estado final) agrupadas por estado
  const finalStatusIds = useMemo(
    () => new Set(statuses.filter(s => s.isFinalOk || s.isFinalRepair).map(s => s.id)),
    [statuses]
  );
  const activeOrders = useMemo(
    () => orders.filter(o => o.statusId && !finalStatusIds.has(o.statusId)),
    [orders, finalStatusIds]
  );

  // Resumen del turno: usuarios activos con turno publicado hoy (lectura de Horarios)
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const shiftSummary = useMemo(
    () =>
      activeUsers
        .map(u => ({ user: u, shifts: getUserShifts(u.id, todayStr) }))
        .filter(entry => entry.shifts.length > 0),
    [activeUsers, getUserShifts, todayStr]
  );

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
          <h2 className="text-lg font-semibold text-[#1D1D1F]">{t('wh.devTitle')}</h2>
          <p className="mt-2 text-sm text-[#86868B]">{t('wh.devSubtitle')}</p>
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
        {t('wh.loading')}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-red-600">
        {t('wh.error.load')}
      </div>
    );
  }

  const tabs: Array<{ id: WhTab; label: string }> = [
    { id: 'board', label: t('wh.tab.board') },
    { id: 'orders', label: t('wh.tab.orders') },
    { id: 'returns', label: t('wh.tab.returns') },
  ];

  // Contenido completo del detalle de una orden (reused: tarjeta expandida y Dialog)
  const renderOrderDetail = (order: RentalOrder) => {
    const currentStatus = statusById(order.statusId);
    const targets = advanceTargetsFor(order);
    const depositHeld =
      (order.depositAmount ?? 0) > 0 && order.depositStatus === 'retenida';
    // Precios cobrados (solo canSeeMoney): se muestran los guardados en la
    // orden; si la creó personal sin permiso de montos y faltan, se calculan
    // al vuelo con los tiers vigentes del catálogo
    const moneyLines = canSeeMoney
      ? order.items.map(it => {
          const p = products.find(pr => pr.id === it.productId);
          const unitPrice = it.unitPrice ?? (p ? unitPriceForQty(p, it.quantity) : null);
          return { unitPrice, lineTotal: unitPrice != null ? round2(it.quantity * unitPrice) : null };
        })
      : null;
    const moneySubtotal = order.subtotal ?? (moneyLines ? round2(moneyLines.reduce((a, l) => a + (l.lineTotal ?? 0), 0)) : null);
    const moneyTotal = order.total ?? (moneySubtotal != null
      ? round2(moneySubtotal * (1 - (order.discountPercent ?? 0) / 100))
      : null);
    return (
      <div className="space-y-4">
        {/* Ítems */}
        <div>
          <p className="text-xs font-medium text-[#86868B] mb-1.5">{t('wh.detail.items')}</p>
          <div className="space-y-1.5">
            {order.items.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-[#F5F5F7] rounded-xl px-3 py-2 text-sm"
              >
                <Package className="h-4 w-4 text-[#86868B] shrink-0" />
                <span className="text-[#1D1D1F] font-medium">{productName(it.productId)}</span>
                <span className="text-[#86868B]">×{it.quantity}</span>
                {canSeeMoney && moneyLines && moneyLines[idx]?.unitPrice != null && (
                  <span className="text-xs text-[#86868B]">
                    (${moneyLines[idx].unitPrice} × {it.quantity} = ${moneyLines[idx].lineTotal})
                  </span>
                )}
                {it.tallaRef && (
                  <span className="ml-auto text-xs text-[#86868B] border border-[#E5E5E7] bg-white rounded-full px-2 py-0.5">
                    {it.tallaRef}
                  </span>
                )}
              </div>
            ))}
          </div>
          {/* Totales cobrados (solo canSeeMoney) */}
          {canSeeMoney && moneySubtotal != null && moneyTotal != null && (
            <div className="mt-2 bg-[#F5F5F7] rounded-xl px-3 py-2 text-sm space-y-0.5">
              <div className="flex justify-between text-[#86868B]">
                <span>{t('wh.detail.subtotal')}</span>
                <span>${moneySubtotal}</span>
              </div>
              {(order.discountPercent ?? 0) > 0 && (
                <div className="flex justify-between text-[#86868B]">
                  <span>
                    {t('wh.detail.discountLabel')}: {order.discountName ?? ''} (-{order.discountPercent}%)
                  </span>
                  <span>-${round2(moneySubtotal * ((order.discountPercent ?? 0) / 100))}</span>
                </div>
              )}
              <div className="flex justify-between font-medium text-[#1D1D1F] pt-0.5 border-t border-[#E5E5E7]">
                <span>{t('wh.detail.total')}</span>
                <span>${moneyTotal}</span>
              </div>
            </div>
          )}
        </div>

        {/* Datos generales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-[#1D1D1F]">
            <CalendarClock className="h-4 w-4 text-[#86868B]" />
            <span className="text-[#86868B]">{t('wh.detail.deliveryDate')}:</span>
            <span>{fmtDateTime(order.deliveryDate)}</span>
          </div>
          {order.locationId && (
            <div className="flex items-center gap-2 text-[#1D1D1F]">
              <MapPin className="h-4 w-4 text-[#86868B]" />
              <span className="text-[#86868B]">{t('wh.detail.location')}:</span>
              <span>{locationName(order.locationId)}</span>
            </div>
          )}
          {order.activityRef && (
            <div className="flex items-center gap-2 text-[#1D1D1F]">
              <Link2 className="h-4 w-4 text-[#86868B]" />
              <span className="text-[#86868B]">{t('wh.detail.activityRef')}:</span>
              <span>{order.activityRef}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[#1D1D1F]">
            <Users className="h-4 w-4 text-[#86868B]" />
            <span className="text-[#86868B]">{t('wh.detail.preparedBy')}:</span>
            <span>{order.preparedBy ? userName(order.preparedBy) : t('wh.detail.unassigned')}</span>
          </div>
          <div className="flex items-center gap-2 text-[#1D1D1F]">
            <ClipboardList className="h-4 w-4 text-[#86868B]" />
            <span className="text-[#86868B]">{t('wh.detail.createdBy')}:</span>
            <span>{order.createdByName || order.createdBy}</span>
          </div>
        </div>

        {/* Pago / fianza (solo canSeeMoney) o badge de autorización */}
        {canSeeMoney ? (
          <div className="bg-[#F5F5F7] rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-[#86868B]" />
              <p className="text-xs font-medium text-[#86868B]">{t('wh.detail.payment')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium border', PAYMENT_STATUS_BADGE[order.paymentStatus])}>
                {t(`wh.orderForm.paymentStatus.${order.paymentStatus}`)}
              </span>
              {order.paymentProofUrl ? (
                <a
                  href={order.paymentProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-corporate underline"
                >
                  {t('wh.detail.viewProof')}
                </a>
              ) : order.paymentProofRef ? (
                <span className="text-xs text-[#86868B]">
                  {t('wh.detail.proofRef')}: {order.paymentProofRef}
                </span>
              ) : (
                <span className="text-xs text-[#86868B]">{t('wh.detail.noProof')}</span>
              )}
            </div>
            {(order.depositAmount ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm pt-1 border-t border-[#E5E5E7]">
                <span className="text-[#1D1D1F] font-medium">
                  {t('wh.detail.deposit')}: ${order.depositAmount}
                </span>
                {(() => {
                  const sug = orderDepositSuggestion(order);
                  return sug ? (
                    <span className="text-xs text-[#86868B]">
                      {tf('wh.detail.depositSuggestion', {
                        days: sug.days,
                        perDay: sug.perDay,
                        percent: sug.percent,
                        amount: sug.amount,
                      })}
                    </span>
                  ) : null;
                })()}
                {order.depositStatus && (
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium border', DEPOSIT_STATUS_BADGE[order.depositStatus] ?? '')}>
                    {t(`wh.detail.depositStatus.${order.depositStatus}`)}
                  </span>
                )}
                {depositHeld && canOperate && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto h-7 rounded-xl border-[#E5E5E7] text-xs"
                      onClick={() => markDepositReturned(order)}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      {t('wh.detail.markDepositReturned')}
                    </Button>
                    {canApprove && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-xl border-red-200 text-red-700 hover:bg-red-50 text-xs"
                        onClick={() => openDiscount(order)}
                      >
                        {t('wh.detail.discountDeposit')}
                      </Button>
                    )}
                  </>
                )}
                {order.depositStatus === 'descontada' && order.depositDiscountApprovedBy && (
                  <span className="text-xs text-[#86868B] w-full">
                    {t('wh.detail.discountApprovedBy')}: {order.depositDiscountApprovedBy}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium border',
                order.paymentStatus === 'pagada'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              )}
            >
              {order.paymentStatus === 'pagada' ? t('wh.detail.authorized') : t('wh.detail.pendingAuth')}
            </span>
          </div>
        )}

        {/* Observaciones */}
        {order.observations && (
          <div className="text-sm">
            <span className="text-[#86868B]">{t('wh.detail.observations')}: </span>
            <span className="text-[#1D1D1F] whitespace-pre-line">{order.observations}</span>
          </div>
        )}

        {/* Registro de tiempos */}
        {(order.dispatchedAt || order.deliveredAt || order.returnedAt || order.verifiedAt || order.storedAt) && (
          <div className="text-xs text-[#86868B] space-y-0.5 pt-1 border-t border-[#E5E5E7]">
            <p className="font-medium">{t('wh.detail.timestamps')}</p>
            {order.dispatchedAt && <p>{t('wh.detail.dispatchedAt')}: {fmtDateTime(order.dispatchedAt)}{order.dispatchedBy ? ` · ${userName(order.dispatchedBy)}` : ''}</p>}
            {order.deliveredAt && <p>{t('wh.detail.deliveredAt')}: {fmtDateTime(order.deliveredAt)}</p>}
            {order.returnedAt && <p>{t('wh.detail.returnedAt')}: {fmtDateTime(order.returnedAt)}</p>}
            {order.verifiedAt && <p>{t('wh.detail.verifiedAt')}: {fmtDateTime(order.verifiedAt)}{order.verifiedBy ? ` · ${order.verifiedBy}` : ''}</p>}
            {order.storedAt && <p>{t('wh.detail.storedAt')}: {fmtDateTime(order.storedAt)}</p>}
          </div>
        )}

        {/* Transiciones + puntos de extensión (WH-D2) */}
        {canOperate && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E5E7]">
            {targets.map(target => (
              <Button
                key={target.id}
                size="sm"
                className="rounded-xl bg-corporate hover:bg-corporate/90 text-xs"
                onClick={() => advanceOrder(order, target)}
              >
                <ArrowRight className="h-3.5 w-3.5 mr-1" />
                {tf('wh.detail.advanceTo', { name: statusName(target) })}
              </Button>
            ))}
            {/* WH-D2-dispatch: botón de despacho con escaneo QR, visible
                cuando el estado actual es listo_despachar */}
            {order.statusId === 'listo_despachar' && (
              <Button
                size="sm"
                className="rounded-xl bg-corporate hover:bg-corporate/90 text-xs"
                onClick={() => openDispatch(order.id!)}
              >
                <QrCode className="h-3.5 w-3.5 mr-1" />
                {t('wh.dispatch.button')}
              </Button>
            )}
            {/* WH-D2-return: botón de retorno con escaneo QR, visible cuando
                el estado actual es despachado o entregado */}
            {(order.statusId === 'despachado' || order.statusId === 'entregado') && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-[#E5E5E7] text-xs"
                onClick={() => openReturn(order.id!)}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                {t('wh.return.button')}
              </Button>
            )}
            {/* Modo emergencia (discreto, Supervisor+): forzar el avance cuando
                el escáner no funciona; motivo obligatorio y auditado */}
            {canSupervise &&
              ['listo_despachar', 'despachado', 'entregado', 'devuelto'].includes(order.statusId) && (
                <button
                  type="button"
                  onClick={() => openEmergency(order)}
                  className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#86868B] hover:text-amber-700 underline-offset-2 hover:underline"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {t('wh.emergency.button')}
                </button>
              )}
            {targets.length === 0 && !currentStatus?.isFinalOk && !currentStatus?.isFinalRepair && (
              <span className="text-xs text-[#86868B]">{statusName(currentStatus)}</span>
            )}
          </div>
        )}

        {/* Avance forzado en modo emergencia (auditable) */}
        {order.emergencyDispatchReason && (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 space-y-0.5">
            <p className="font-medium">{t('wh.detail.emergency')}</p>
            <p>{order.emergencyDispatchReason}</p>
            <p className="text-[#86868B]">
              {t('wh.detail.emergencyBy')}: {order.emergencyDispatchBy || '—'}
              {order.emergencyDispatchAt ? ` · ${fmtDateTime(order.emergencyDispatchAt)}` : ''}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Botones rápidos de cada tarjeta de orden (pizarra y lista): cada botón
  // hace exactamente lo que dice, sin confirmaciones extra. El contenedor
  // detiene la propagación para no disparar el clic de expansión/detalle.
  const renderQuickActions = (order: RentalOrder) => (
    <div className="flex flex-wrap items-center gap-1" onClick={e => e.stopPropagation()}>
      {order.statusId === 'listo_despachar' && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 rounded-lg text-[11px] gap-1 border-corporate text-corporate hover:bg-corporate/10"
          onClick={() => openDispatch(order.id!)}
        >
          <QrCode className="h-3 w-3" />
          {t('wh.quick.dispatch')}
        </Button>
      )}
      {(order.statusId === 'despachado' || order.statusId === 'entregado') && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 rounded-lg text-[11px] gap-1 border-[#E5E5E7] text-[#1D1D1F]"
          onClick={() => openReturn(order.id!)}
        >
          <RotateCcw className="h-3 w-3" />
          {t('wh.quick.return')}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 rounded-lg text-[11px] text-[#86868B] hover:text-[#1D1D1F]"
        onClick={() => setDetailOrderId(order.id!)}
      >
        {t('wh.quick.detail')}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 rounded-lg text-[11px] text-[#86868B] hover:text-[#1D1D1F]"
        onClick={() => setQrOrderId(order.id!)}
      >
        <Printer className="h-3 w-3" />
        {t('wh.quick.qr')}
      </Button>
    </div>
  );

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
      </div>

      {/* ─── SUB-PESTAÑA: PIZARRA ─── */}
      {tab === 'board' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-4">
            <div className="flex items-center gap-2 mb-1">
              <LayoutGrid className="h-4 w-4 text-corporate" />
              <h3 className="text-sm font-semibold text-[#1D1D1F]">{t('wh.tab.board')}</h3>
            </div>
            <p className="text-xs text-[#86868B]">{t('wh.board.help')}</p>
          </div>

          {activeOrders.length === 0 ? (
            <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-8 text-center text-sm text-[#86868B]">
              {t('wh.board.empty')}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {activeStatuses.map(status => {
                const columnOrders = activeOrders.filter(o => o.statusId === status.id);
                if (columnOrders.length === 0) return null;
                return (
                  <div key={status.id} className="min-w-[220px] w-[220px] shrink-0 space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium border', statusBadgeClass(status))}>
                        {statusName(status)}
                      </span>
                      <span className="text-xs text-[#86868B]">{columnOrders.length}</span>
                    </div>
                    {columnOrders.map(order => (
                      <div
                        key={order.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setDetailOrderId(order.id!)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') setDetailOrderId(order.id!);
                        }}
                        className="w-full text-left bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-3 hover:bg-[#F5F5F7] transition-colors cursor-pointer"
                      >
                        <p className="text-sm font-medium text-[#1D1D1F] truncate">{order.clientName}</p>
                        <p className="text-xs text-[#86868B] mt-0.5 flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {fmtTime(order.deliveryDate)}
                        </p>
                        <p className="text-xs text-[#86868B] mt-1 truncate">{itemsSummary(order)}</p>
                        {canOperate && <div className="mt-2">{renderQuickActions(order)}</div>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* WH-D2-retornos-cola: mini-sección de retornos pendientes */}
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-4">
            <div className="flex items-center gap-2 mb-1">
              <RotateCcw className="h-4 w-4 text-corporate" />
              <h3 className="text-sm font-semibold text-[#1D1D1F]">{t('wh.board.pendingReturns')}</h3>
              <span className="text-xs text-[#86868B]">{returnedQueue.length}</span>
            </div>
            <p className="text-xs text-[#86868B] mb-3">{t('wh.board.pendingReturnsHint')}</p>
            {returnedQueue.length === 0 ? (
              <p className="text-sm text-[#86868B]">{t('wh.board.pendingReturnsEmpty')}</p>
            ) : (
              <div className="space-y-2">
                {returnedQueue.map(order => (
                  <div
                    key={order.id}
                    className="flex flex-wrap items-center gap-2 bg-[#F5F5F7] rounded-xl px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-[#1D1D1F] truncate">
                      {order.orderNumber != null ? `#${order.orderNumber} · ` : ''}{order.clientName}
                    </span>
                    <span className="text-xs text-[#86868B]">
                      {t('wh.returns.returnedAt')}: {fmtDateTime(order.returnedAt || order.updatedAt)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto h-7 rounded-lg border-[#E5E5E7] text-xs"
                      onClick={() => setDetailOrderId(order.id!)}
                    >
                      {t('wh.board.viewDetail')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumen del turno (solo lectura desde Horarios) */}
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-corporate" />
              <h3 className="text-sm font-semibold text-[#1D1D1F]">{t('wh.board.shiftSummary')}</h3>
            </div>
            <p className="text-xs text-[#86868B] mb-3">{t('wh.board.shiftSummaryHint')}</p>
            {shiftSummary.length === 0 ? (
              <p className="text-sm text-[#86868B]">{t('wh.board.noShifts')}</p>
            ) : (
              <div className="space-y-2">
                {shiftSummary.map(({ user, shifts }) => (
                  <div
                    key={user.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-[#F5F5F7] rounded-xl px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-[#1D1D1F]">{user.name}</span>
                    <span className="text-[#86868B]">
                      {shifts.map((s: { name?: string; startTime?: string; endTime?: string }) =>
                        `${s.name ?? ''} · ${s.startTime ?? ''}–${s.endTime ?? ''}`
                      ).join(', ')}
                    </span>
                    <span className="text-xs text-[#86868B] ml-auto">
                      {t('wh.board.department')}: {user.department || '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SUB-PESTAÑA: ÓRDENES ─── */}
      {tab === 'orders' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                placeholder={t('wh.orders.searchPlaceholder')}
                className="pl-9 rounded-xl border-[#E5E5E7] w-64 text-sm"
              />
            </div>
            <select
              value={filterStatusId}
              onChange={e => setFilterStatusId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E5E5E7] bg-white text-sm text-[#1D1D1F]"
            >
              <option value="">{t('wh.orders.all')} · {t('wh.orders.filterStatus')}</option>
              {sortedStatuses.map(s => (
                <option key={s.id} value={s.id}>{statusName(s)}</option>
              ))}
            </select>
            {canOperate && (
              <Button
                size="sm"
                onClick={openOrderModal}
                className="ml-auto gap-2 rounded-xl bg-corporate hover:bg-corporate/90"
              >
                <Plus className="h-4 w-4" />
                {t('wh.orders.new')}
              </Button>
            )}
          </div>

          {filteredOrders.length === 0 && (
            <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-8 text-center text-sm text-[#86868B]">
              {t('wh.orders.empty')}
            </div>
          )}

          {filteredOrders.map(order => {
            const status = statusById(order.statusId);
            const isOpen = expandedIds.has(order.id!);
            return (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] overflow-hidden"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpanded(order.id!)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') toggleExpanded(order.id!);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#1D1D1F] truncate">
                        {order.orderNumber != null ? `#${order.orderNumber} · ` : ''}{order.clientName}
                      </span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium border shrink-0', statusBadgeClass(status))}>
                        {statusName(status)}
                      </span>
                    </div>
                    <div className="text-xs text-[#86868B] mt-0.5 truncate">
                      {itemsSummary(order)}
                    </div>
                    <div className="text-xs text-[#86868B] mt-0.5">
                      {t('wh.orders.deliveryAt')}: {fmtDateTime(order.deliveryDate)}
                      {' · '}{t('wh.orders.createdBy')}: {order.createdByName || order.createdBy}
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-[#86868B] shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#86868B] shrink-0" />
                  )}
                </div>
                {canOperate && (
                  <div className="px-3 pb-2" onClick={e => e.stopPropagation()}>
                    {renderQuickActions(order)}
                  </div>
                )}
                {isOpen && (
                  <div className="px-3 pb-3 pt-1 border-t border-[#E5E5E7]">
                    {renderOrderDetail(order)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── SUB-PESTAÑA: RETORNOS (WH-D2) ─── */}
      {tab === 'returns' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-4">
            <div className="flex items-center gap-2 mb-1">
              <RotateCcw className="h-4 w-4 text-corporate" />
              <h3 className="text-sm font-semibold text-[#1D1D1F]">{t('wh.tab.returns')}</h3>
            </div>
            <p className="text-xs text-[#86868B]">{t('wh.returns.help')}</p>
          </div>

          {/* Cola de verificación: órdenes devueltas pendientes */}
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              <h4 className="text-xs font-semibold text-[#1D1D1F]">{t('wh.returns.queue')}</h4>
              <span className="text-xs text-[#86868B]">{returnedQueue.length}</span>
            </div>
            {returnedQueue.length === 0 ? (
              <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-6 text-center text-sm text-[#86868B]">
                {t('wh.returns.queueEmpty')}
              </div>
            ) : (
              <div className="space-y-2">
                {returnedQueue.map(order => (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-[#1D1D1F] truncate">
                        {order.orderNumber != null ? `#${order.orderNumber} · ` : ''}{order.clientName}
                      </span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium border', statusBadgeClass(statusById(order.statusId)))}>
                        {statusName(statusById(order.statusId))}
                      </span>
                      <span className="text-xs text-[#86868B] ml-auto">
                        {t('wh.returns.returnedAt')}: {fmtDateTime(order.returnedAt || order.updatedAt)}
                      </span>
                      {canOperate && (
                        <Button
                          size="sm"
                          className="h-7 rounded-lg bg-corporate hover:bg-corporate/90 text-xs"
                          onClick={() => openReturn(order.id!)}
                        >
                          {t('wh.returns.verify')}
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-[#86868B]">{t('wh.returns.serials')}:</span>
                      {assignedUnitEntries(order).map(({ unitId }) => {
                        const unit = rentalUnits.find(u => u.id === unitId);
                        return (
                          <span
                            key={unitId}
                            className="px-2 py-0.5 rounded-full text-[11px] font-medium border bg-[#F5F5F7] text-[#1D1D1F] border-[#E5E5E7]"
                          >
                            {unit ? unit.serialNumber : unitId}
                            {unit?.size ? ` · ${unit.size}` : ''}
                          </span>
                        );
                      })}
                      {assignedUnitEntries(order).length === 0 && (
                        <span className="text-xs text-[#86868B]">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* En poder del cliente: despachadas o entregadas */}
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              <h4 className="text-xs font-semibold text-[#1D1D1F]">{t('wh.returns.withClient')}</h4>
              <span className="text-xs text-[#86868B]">{withClientOrders.length}</span>
            </div>
            {withClientOrders.length === 0 ? (
              <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-6 text-center text-sm text-[#86868B]">
                {t('wh.returns.withClientEmpty')}
              </div>
            ) : (
              <div className="space-y-2">
                {withClientOrders.map(order => (
                  <button
                    key={order.id}
                    onClick={() => setDetailOrderId(order.id!)}
                    className="w-full text-left bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5E7] p-3 hover:bg-[#F5F5F7] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#1D1D1F] truncate">
                        {order.orderNumber != null ? `#${order.orderNumber} · ` : ''}{order.clientName}
                      </span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium border', statusBadgeClass(statusById(order.statusId)))}>
                        {statusName(statusById(order.statusId))}
                      </span>
                      <span className="text-xs text-[#86868B] ml-auto">
                        {t('wh.orders.deliveryAt')}: {fmtDateTime(order.deliveryDate)}
                      </span>
                    </div>
                    <p className="text-xs text-[#86868B] mt-0.5 truncate">{itemsSummary(order)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── DIALOG: DETALLE DE ORDEN (deep link / pizarra) ─── */}
      <Dialog open={!!detailOrder} onOpenChange={open => !open && setDetailOrderId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1D1D1F]">
              <span>{t('wh.detail.title')}</span>
              {detailOrder?.orderNumber != null && <span>#{detailOrder.orderNumber}</span>}
              {detailOrder && (
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium border', statusBadgeClass(statusById(detailOrder.statusId)))}>
                  {statusName(statusById(detailOrder.statusId))}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailOrder && renderOrderDetail(detailOrder)}
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: DESCONTAR FIANZA ─── */}
      <Dialog open={!!discountOrderId} onOpenChange={open => !open && setDiscountOrderId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1D1D1F]">{t('wh.detail.discountTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-[#86868B]">{t('wh.detail.discountReason')}</Label>
              <Input
                value={discountReason}
                onChange={e => setDiscountReason(e.target.value)}
                placeholder={t('wh.detail.discountReasonPlaceholder')}
                className="mt-1 rounded-xl border-[#E5E5E7] text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-[#86868B]">{t('wh.detail.discountEvidence')}</Label>
              <label className="mt-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm text-[#1D1D1F] hover:bg-[#F5F5F7] cursor-pointer transition-colors">
                <Upload className="h-4 w-4 text-[#86868B]" />
                <span className="truncate">{discountFile ? discountFile.name : t('wh.detail.discountEvidenceUpload')}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setDiscountFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDiscountOrderId(null)}
                className="rounded-xl border-[#E5E5E7]"
              >
                {t('wh.common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={saveDiscount}
                disabled={savingDiscount || uploadingFile || !discountReason.trim()}
                className="rounded-xl bg-corporate hover:bg-corporate/90"
              >
                {savingDiscount || uploadingFile ? t('wh.common.save') + '…' : t('wh.common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: NUEVA ORDEN ─── */}
      <Dialog open={orderModalOpen} onOpenChange={setOrderModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1D1D1F]">{t('wh.orderForm.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Tipo de cliente */}
            <div>
              <Label className="text-xs text-[#86868B]">{t('wh.orderForm.clientType')}</Label>
              <div className="flex items-center gap-1 bg-[#F5F5F7] rounded-full p-1 mt-1 w-fit">
                {(['interno', 'externo'] as const).map(ct => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => {
                      setOrderForm(prev => ({ ...prev, clientType: ct, clientId: '' }));
                      setQuickClientOpen(false);
                    }}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                      orderForm.clientType === ct ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#86868B]'
                    )}
                  >
                    {ct === 'interno' ? t('wh.orderForm.clientTypeInterno') : t('wh.orderForm.clientTypeExterno')}
                  </button>
                ))}
              </div>
            </div>

            {/* Cliente */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-[#86868B]">{t('wh.orderForm.client')}</Label>
                {orderForm.clientType === 'externo' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-corporate"
                    onClick={() => setQuickClientOpen(prev => !prev)}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    {t('wh.orderForm.createQuickClient')}
                  </Button>
                )}
              </div>
              {orderForm.clientType === 'interno' &&
                activeClients.filter(c => c.type === 'interno').length === 0 && (
                  <p className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    {t('wh.orderForm.noInternalClients')}
                  </p>
                )}
              <select
                value={orderForm.clientId}
                onChange={e => setOrderForm(prev => ({ ...prev, clientId: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-[#E5E5E7] bg-white text-sm text-[#1D1D1F]"
              >
                <option value="">{t('wh.orderForm.selectClient')}</option>
                {activeClients
                  .filter(c =>
                    orderForm.clientType === 'interno'
                      ? c.type === 'interno'
                      : c.type === 'persona' || c.type === 'empresa'
                  )
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.type === 'interno' && c.departmentId ? ` · ${c.departmentId}` : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Cliente rápido */}
            {quickClientOpen && (
              <div className="bg-[#F5F5F7] rounded-xl p-3 space-y-2">
                <p className="text-xs font-medium text-[#1D1D1F]">{t('wh.orderForm.quickClientTitle')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    value={quickClientName}
                    onChange={e => setQuickClientName(e.target.value)}
                    placeholder={t('wh.orderForm.quickClientName')}
                    className="rounded-xl border-[#E5E5E7] text-sm sm:col-span-2"
                  />
                  <select
                    value={quickClientType}
                    onChange={e => setQuickClientType(e.target.value as 'persona' | 'empresa')}
                    className="px-3 py-2 rounded-xl border border-[#E5E5E7] bg-white text-sm text-[#1D1D1F]"
                  >
                    <option value="persona">{t('wh.orderForm.quickClientType')} · persona</option>
                    <option value="empresa">{t('wh.orderForm.quickClientType')} · empresa</option>
                  </select>
                </div>
                <Button
                  size="sm"
                  onClick={createQuickClient}
                  disabled={savingClient || !quickClientName.trim()}
                  className="rounded-xl bg-corporate hover:bg-corporate/90"
                >
                  {t('wh.orderForm.saveClient')}
                </Button>
              </div>
            )}

            {/* Referencia de salida/actividad (solo rentas internas, opcional) */}
            {orderForm.clientType === 'interno' && (
              <div>
                <Label className="text-xs text-[#86868B]">{t('wh.orderForm.activityRef')}</Label>
                <Input
                  value={orderForm.activityRef}
                  onChange={e => setOrderForm(prev => ({ ...prev, activityRef: e.target.value }))}
                  placeholder={t('wh.orderForm.activityRefPlaceholder')}
                  className="mt-1 rounded-xl border-[#E5E5E7] text-sm"
                />
                <p className="mt-1 text-xs text-[#86868B]">{t('wh.orderForm.activityRefHelp')}</p>
              </div>
            )}

            {/* Ítems dinámicos */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-[#86868B]">{t('wh.orderForm.items')}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-corporate"
                  onClick={() => setOrderItems(prev => [...prev, { productId: '', quantity: '1', tallaRef: '' }])}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {t('wh.orderForm.addItem')}
                </Button>
              </div>
              <div className="space-y-2">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 sm:col-span-5">
                      <select
                        value={item.productId}
                        onChange={e => updateItem(idx, { productId: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] bg-white text-sm text-[#1D1D1F]"
                      >
                        <option value="">{t('wh.orderForm.selectProduct')}</option>
                        {rentableProducts.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({tf('wh.orderForm.available', { count: availableUnitsCount(p.id!) })})
                          </option>
                        ))}
                      </select>
                      {/* Precio de la línea (solo quien cobra): tier según cantidad o precio base */}
                      {canSeeMoney && formPricing && formPricing.lines[idx]?.unitPrice != null && (
                        <p className="mt-0.5 text-[11px] text-[#86868B] pl-1">
                          {t('wh.orderForm.unitPrice')}: ${formPricing.lines[idx].unitPrice} · ${formPricing.lines[idx].lineTotal}
                        </p>
                      )}
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => updateItem(idx, { quantity: e.target.value })}
                      placeholder={t('wh.orderForm.quantity')}
                      className="col-span-4 sm:col-span-2 rounded-xl border-[#E5E5E7] text-sm"
                    />
                    <Input
                      value={item.tallaRef}
                      onChange={e => updateItem(idx, { tallaRef: e.target.value })}
                      placeholder={t('wh.orderForm.tallaRefPlaceholder')}
                      className="col-span-6 sm:col-span-4 rounded-xl border-[#E5E5E7] text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="col-span-2 sm:col-span-1 h-8 w-8 p-0 rounded-lg justify-self-end text-[#86868B] hover:text-red-600"
                      onClick={() => setOrderItems(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <span className="text-lg leading-none">×</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Entrega */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-[#86868B]">{t('wh.orderForm.deliveryDate')}</Label>
                <Input
                  type="datetime-local"
                  value={orderForm.deliveryDate}
                  onChange={e => setOrderForm(prev => ({ ...prev, deliveryDate: e.target.value }))}
                  className="mt-1 rounded-xl border-[#E5E5E7] text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-[#86868B]">{t('wh.orderForm.location')}</Label>
                <select
                  value={orderForm.locationId}
                  onChange={e => setOrderForm(prev => ({ ...prev, locationId: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-[#E5E5E7] bg-white text-sm text-[#1D1D1F]"
                >
                  <option value="">{t('wh.orderForm.selectLocation')}</option>
                  {activeLocations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                {/* Disponibilidad por ubicación de cada producto rentable pedido */}
                {orderForm.locationId &&
                  orderItems.some(it => it.productId) && (
                    <div className="mt-2 bg-[#F5F5F7] rounded-xl px-3 py-2 space-y-0.5">
                      <p className="text-[11px] font-medium text-[#86868B]">
                        {tf('wh.orderForm.locationAvailability', { location: locationName(orderForm.locationId) })}
                      </p>
                      {orderItems
                        .filter(it => it.productId)
                        .map((it, idx) => {
                          const available = stockAtLocation(it.productId, orderForm.locationId);
                          const qty = Number(it.quantity) || 0;
                          const short = qty > 0 && available < qty;
                          return (
                            <p
                              key={idx}
                              className={cn('text-xs', short ? 'text-red-700 font-medium' : 'text-[#1D1D1F]')}
                            >
                              {tf('wh.orderForm.availableInLocation', {
                                product: productName(it.productId),
                                count: available,
                              })}
                            </p>
                          );
                        })}
                    </div>
                  )}
              </div>
            </div>

            {/* Quién prepara */}
            <div>
              <Label className="text-xs text-[#86868B]">{t('wh.orderForm.preparedBy')}</Label>
              <select
                value={orderForm.preparedBy}
                onChange={e => setOrderForm(prev => ({ ...prev, preparedBy: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-[#E5E5E7] bg-white text-sm text-[#1D1D1F]"
              >
                <option value="">{t('wh.orderForm.noPreparer')}</option>
                {activeUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Pago (solo canSeeMoney) */}
            {canSeeMoney && (
              <div className="bg-[#F5F5F7] rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-[#86868B]" />
                  <p className="text-xs font-medium text-[#1D1D1F]">{t('wh.orderForm.payment')}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-[#86868B]">{t('wh.orderForm.paymentStatus')}</Label>
                    <select
                      value={orderForm.paymentStatus}
                      onChange={e => setOrderForm(prev => ({ ...prev, paymentStatus: e.target.value as RentalPaymentStatus }))}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-[#E5E5E7] bg-white text-sm text-[#1D1D1F]"
                    >
                      {(['pagada', 'pendiente', 'parcial', 'credito'] as const).map(ps => (
                        <option key={ps} value={ps}>{t(`wh.orderForm.paymentStatus.${ps}`)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-[#86868B]">{t('wh.orderForm.depositAmount')}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={orderForm.depositAmount}
                      onChange={e => {
                        depositTouched.current = true;
                        setOrderForm(prev => ({ ...prev, depositAmount: e.target.value }));
                      }}
                      className="mt-1 rounded-xl border-[#E5E5E7] text-sm"
                    />
                  </div>
                </div>
                {formDepositSuggestion && (
                  <p className="text-xs text-[#86868B]">
                    {tf('wh.orderForm.depositSuggestion', {
                      days: formDepositSuggestion.days,
                      perDay: formDepositSuggestion.perDay,
                      percent: formDepositSuggestion.percent,
                      amount: formDepositSuggestion.amount,
                    })}
                  </p>
                )}
                {/* Descuento preconfigurado: un toque modifica el total */}
                <div>
                  <Label className="text-xs text-[#86868B]">{t('wh.orderForm.discount')}</Label>
                  <select
                    value={orderForm.discountId}
                    onChange={e => setOrderForm(prev => ({ ...prev, discountId: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-[#E5E5E7] bg-white text-sm text-[#1D1D1F]"
                  >
                    <option value="">{t('wh.orderForm.discountNone')}</option>
                    {activeDiscounts.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} (-{d.percent}%)
                      </option>
                    ))}
                  </select>
                </div>
                {/* Totales: por ítem el tier que aplique; descuento sobre el total */}
                {formPricing && (
                  <div className="bg-white rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm space-y-0.5">
                    <div className="flex justify-between text-[#86868B]">
                      <span>{t('wh.orderForm.subtotal')}</span>
                      <span>${formPricing.subtotal}</span>
                    </div>
                    {formPricing.percent > 0 && (
                      <div className="flex justify-between text-[#86868B]">
                        <span>
                          {t('wh.orderForm.discount')}: {formPricing.discount?.name} (-{formPricing.percent}%)
                        </span>
                        <span>-${round2(formPricing.subtotal * (formPricing.percent / 100))}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium text-[#1D1D1F] pt-0.5 border-t border-[#E5E5E7]">
                      <span>{t('wh.orderForm.total')}</span>
                      <span>${formPricing.total}</span>
                    </div>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1 bg-white rounded-full p-1 w-fit border border-[#E5E5E7]">
                    {(['ref', 'foto'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setOrderForm(prev => ({ ...prev, proofMode: mode }))}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                          orderForm.proofMode === mode ? 'bg-corporate text-white' : 'text-[#86868B]'
                        )}
                      >
                        {mode === 'ref' ? t('wh.orderForm.proofModeRef') : t('wh.orderForm.proofModePhoto')}
                      </button>
                    ))}
                  </div>
                  {orderForm.proofMode === 'ref' ? (
                    <Input
                      value={orderForm.proofRef}
                      onChange={e => setOrderForm(prev => ({ ...prev, proofRef: e.target.value }))}
                      placeholder={t('wh.orderForm.proofRefPlaceholder')}
                      className="mt-2 rounded-xl border-[#E5E5E7] text-sm"
                    />
                  ) : (
                    <label className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E5E5E7] bg-white text-sm text-[#1D1D1F] hover:bg-[#F5F5F7] cursor-pointer transition-colors">
                      <Upload className="h-4 w-4 text-[#86868B]" />
                      <span className="truncate">{proofFile ? proofFile.name : t('wh.orderForm.proofPhotoUpload')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => setProofFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div>
              <Label className="text-xs text-[#86868B]">{t('wh.orderForm.observations')}</Label>
              <textarea
                value={orderForm.observations}
                onChange={e => setOrderForm(prev => ({ ...prev, observations: e.target.value }))}
                placeholder={t('wh.orderForm.observationsPlaceholder')}
                rows={2}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-corporate/20"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOrderModalOpen(false)}
                className="rounded-xl border-[#E5E5E7]"
              >
                {t('wh.common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={saveOrder}
                disabled={savingOrder || uploadingFile}
                className="rounded-xl bg-corporate hover:bg-corporate/90"
              >
                {savingOrder || uploadingFile ? t('wh.orderForm.save') + '…' : t('wh.orderForm.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: DESPACHO (WH-D2, 3 pasos) ─── */}
      <Dialog open={dispatchOpen} onOpenChange={open => !open && closeDispatch()}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1D1D1F]">{t('wh.dispatch.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Indicador de pasos */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(['wh.dispatch.step1', 'wh.dispatch.step2', 'wh.dispatch.step3'] as const).map((key, i) => (
                <span
                  key={key}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium border',
                    dispatchStep === i + 1
                      ? 'bg-corporate text-white border-corporate'
                      : 'bg-white text-[#86868B] border-[#E5E5E7]'
                  )}
                >
                  {i + 1}. {t(key)}
                </span>
              ))}
            </div>

            {/* Paso 1: escanear o seleccionar la orden */}
            {dispatchStep === 1 && (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScanTarget('order')}
                  className="rounded-xl border-[#E5E5E7] gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  {t('wh.dispatch.scanOrder')}
                </Button>
                <div>
                  <Label className="text-xs text-[#86868B]">{t('wh.dispatch.orSelect')}</Label>
                  <select
                    value={dispatchOrderId ?? ''}
                    onChange={e => {
                      const order = orders.find(o => o.id === e.target.value);
                      if (order) selectDispatchOrder(order);
                    }}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-[#E5E5E7] bg-white text-sm text-[#1D1D1F]"
                  >
                    <option value="">{t('wh.dispatch.selectOrderPlaceholder')}</option>
                    {orders
                      .filter(o => o.statusId === 'listo_despachar')
                      .map(o => (
                        <option key={o.id} value={o.id}>
                          {o.orderNumber != null ? `#${o.orderNumber} · ` : ''}{o.clientName}
                        </option>
                      ))}
                  </select>
                  {orders.filter(o => o.statusId === 'listo_despachar').length === 0 && (
                    <p className="mt-1 text-xs text-[#86868B]">{t('wh.dispatch.noOrdersReady')}</p>
                  )}
                </div>
                {dispatchOrder && (
                  <p className="text-sm text-[#1D1D1F] bg-[#F5F5F7] rounded-xl px-3 py-2">
                    {dispatchOrder.orderNumber != null ? `#${dispatchOrder.orderNumber} · ` : ''}
                    {dispatchOrder.clientName}
                    {' · '}{itemsSummary(dispatchOrder)}
                  </p>
                )}
              </div>
            )}

            {/* Paso 2: asignar seriales exactos por ítem */}
            {dispatchStep === 2 && dispatchOrder && (
              <div className="space-y-3">
                {dispatchOrder.items.map((it, idx) => {
                  const selected = dispatchAssignments[idx] ?? [];
                  const unitsOfProduct = rentalUnits.filter(u => u.productId === it.productId);
                  const availableCount = unitsOfProduct.filter(serialAvailable).length;
                  const insufficient = availableCount < it.quantity;
                  return (
                    <div key={idx} className="rounded-xl border border-[#E5E5E7] p-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Package className="h-4 w-4 text-[#86868B]" />
                        <span className="text-sm font-medium text-[#1D1D1F]">{productName(it.productId)}</span>
                        <span
                          className={cn(
                            'text-xs font-medium',
                            selected.length === it.quantity ? 'text-green-700' : 'text-[#86868B]'
                          )}
                        >
                          {tf('wh.dispatch.assigned', { assigned: selected.length, quantity: it.quantity })}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setScanTarget(idx)}
                          className="ml-auto h-7 rounded-lg border-[#E5E5E7] text-xs gap-1"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          {t('wh.dispatch.scanSerial')}
                        </Button>
                      </div>
                      {insufficient && (
                        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                          {tf('wh.dispatch.insufficient', { available: availableCount, quantity: it.quantity })}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {unitsOfProduct.map(u => {
                          const available = serialAvailable(u);
                          const isSelected = selected.includes(u.id!);
                          const full = selected.length >= it.quantity && !isSelected;
                          const st = serialStatuses.find(s => s.id === u.statusId);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              disabled={!available || full}
                              onClick={() => toggleSerialForItem(idx, u.id!)}
                              title={st ? serialStatusName(st) : u.statusId}
                              className={cn(
                                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                                isSelected
                                  ? 'bg-corporate text-white border-corporate'
                                  : available && !full
                                    ? 'bg-white text-[#1D1D1F] border-[#E5E5E7] hover:bg-[#F5F5F7]'
                                    : 'bg-[#F5F5F7] text-[#86868B] border-[#E5E5E7] cursor-not-allowed'
                              )}
                            >
                              {u.serialNumber}
                              {u.size && <span className="ml-1 opacity-75">· {u.size}</span>}
                              {!available && st && (
                                <span className="ml-1">({serialStatusName(st)})</span>
                              )}
                            </button>
                          );
                        })}
                        {unitsOfProduct.length === 0 && (
                          <span className="text-xs text-[#86868B]">{t('wh.dispatch.noSerials')}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!dispatchComplete && (
                  <p className="text-xs text-[#86868B]">{t('wh.dispatch.allAssigned')}</p>
                )}
              </div>
            )}

            {/* Paso 3: resumen y confirmación */}
            {dispatchStep === 3 && dispatchOrder && (
              <div className="space-y-3">
                <p className="text-sm text-[#1D1D1F]">
                  {tf('wh.dispatch.summary', {
                    units: dispatchOrder.items.reduce((acc, _, idx) => acc + (dispatchAssignments[idx] ?? []).length, 0),
                    items: dispatchOrder.items.length,
                    client: dispatchOrder.clientName,
                  })}
                </p>
                <div className="space-y-1.5">
                  {dispatchOrder.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#F5F5F7] rounded-xl px-3 py-2 text-sm">
                      <Package className="h-4 w-4 text-[#86868B] shrink-0" />
                      <span className="text-[#1D1D1F] font-medium">{productName(it.productId)}</span>
                      <span className="text-[#86868B] text-xs ml-auto text-right break-all">
                        {(dispatchAssignments[idx] ?? [])
                          .map(id => rentalUnits.find(u => u.id === id)?.serialNumber ?? id)
                          .join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navegación entre pasos */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E5E5E7]">
              <div>
                {dispatchStep > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDispatchStep(s => s - 1)}
                    className="rounded-xl border-[#E5E5E7]"
                  >
                    {t('wh.dispatch.back')}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeDispatch}
                  className="rounded-xl border-[#E5E5E7]"
                >
                  {t('wh.common.cancel')}
                </Button>
                {dispatchStep < 3 ? (
                  <Button
                    size="sm"
                    disabled={dispatchStep === 1 ? !dispatchOrder : !dispatchComplete}
                    onClick={() => setDispatchStep(s => s + 1)}
                    className="rounded-xl bg-corporate hover:bg-corporate/90"
                  >
                    {t('wh.dispatch.next')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={confirmDispatch}
                    disabled={savingDispatch}
                    className="rounded-xl bg-corporate hover:bg-corporate/90"
                  >
                    {savingDispatch ? t('wh.dispatch.confirm') + '…' : t('wh.dispatch.confirm')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: VERIFICAR RETORNO (WH-D2, escaneo obligatorio) ─── */}
      <Dialog open={returnOpen} onOpenChange={open => !open && closeReturn()}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1D1D1F]">{t('wh.return.title')}</DialogTitle>
          </DialogHeader>
          {/* Paso 1: escanear o seleccionar la orden que regresa */}
          {returnStep === 1 && (
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReturnScanTarget('order')}
                className="rounded-xl border-[#E5E5E7] gap-2"
              >
                <QrCode className="h-4 w-4" />
                {t('wh.return.scanOrder')}
              </Button>
              <div>
                <Label className="text-xs text-[#86868B]">{t('wh.return.orSelect')}</Label>
                <select
                  value={returnOrderId ?? ''}
                  onChange={e => {
                    const order = orders.find(o => o.id === e.target.value);
                    if (order) selectReturnOrder(order);
                  }}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-[#E5E5E7] bg-white text-sm text-[#1D1D1F]"
                >
                  <option value="">{t('wh.return.selectOrderPlaceholder')}</option>
                  {orders
                    .filter(o => o.statusId === 'despachado' || o.statusId === 'entregado')
                    .map(o => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber != null ? `#${o.orderNumber} · ` : ''}{o.clientName}
                      </option>
                    ))}
                </select>
                {orders.filter(o => o.statusId === 'despachado' || o.statusId === 'entregado').length === 0 && (
                  <p className="mt-1 text-xs text-[#86868B]">{t('wh.return.noOrdersForReturn')}</p>
                )}
              </div>
              {returnOrder && (
                <p className="text-sm text-[#1D1D1F] bg-[#F5F5F7] rounded-xl px-3 py-2">
                  {returnOrder.orderNumber != null ? `#${returnOrder.orderNumber} · ` : ''}
                  {returnOrder.clientName}
                  {' · '}{itemsSummary(returnOrder)}
                </p>
              )}
            </div>
          )}
          {/* Paso 2: escanear los seriales que regresan y marcarse OK/Dañada */}
          {returnStep === 2 && returnOrder && (() => {
            const entries = assignedUnitEntries(returnOrder);
            const damagedCount = entries.filter(e => returnedSerialIds.has(e.unitId) && returnMarks[e.unitId] === 'damaged').length;
            const allMarked = entries.length === 0 || entries.every(e => returnedSerialIds.has(e.unitId) && returnMarks[e.unitId]);
            const depositHeld =
              (returnOrder.depositAmount ?? 0) > 0 && returnOrder.depositStatus === 'retenida';
            return (
              <div className="space-y-3">
                <p className="text-xs text-[#86868B]">{t('wh.return.instructions')}</p>
                <p className="text-sm font-medium text-[#1D1D1F]">
                  {returnOrder.orderNumber != null ? `#${returnOrder.orderNumber} · ` : ''}
                  {returnOrder.clientName}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReturnScanTarget('serial')}
                    className="h-7 rounded-lg border-[#E5E5E7] text-xs gap-1"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    {t('wh.return.scanSerials')}
                  </Button>
                  <span className="text-xs text-[#86868B]">{t('wh.return.scanSerialsHint')}</span>
                </div>
                <div className="space-y-2">
                  {entries.map(({ unitId }) => {
                    const unit = rentalUnits.find(u => u.id === unitId);
                    if (!unit) return null;
                    const returned = returnedSerialIds.has(unitId);
                    const mark = returnMarks[unitId];
                    const st = serialStatuses.find(s => s.id === unit.statusId);
                    return (
                      <div
                        key={unitId}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-3',
                          returned ? 'border-[#E5E5E7]' : 'border-dashed border-[#E5E5E7] opacity-60'
                        )}
                      >
                        {unit.photoUrl ? (
                          <img
                            src={unit.photoUrl}
                            alt={unit.serialNumber}
                            className="h-10 w-10 rounded-lg object-cover border border-[#E5E5E7] shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-[#F5F5F7] flex items-center justify-center shrink-0">
                            <Package className="h-5 w-5 text-[#86868B]" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#1D1D1F] truncate">{unit.serialNumber}</p>
                          <p className="text-xs text-[#86868B]">
                            {unit.size && <span className="mr-2">{unit.size}</span>}
                            {st ? serialStatusName(st) : unit.statusId}
                            {!returned && <span className="ml-2">· {t('wh.return.scanSerials')}</span>}
                          </p>
                        </div>
                        {returned && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                              {t('wh.return.returned')}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReturnMarks(m => ({ ...m, [unitId]: 'ok' }))}
                              className={cn(
                                'h-7 rounded-lg text-xs gap-1',
                                mark === 'ok'
                                  ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-50'
                                  : 'border-[#E5E5E7]'
                              )}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t('wh.return.markOk')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReturnMarks(m => ({ ...m, [unitId]: 'damaged' }))}
                              className={cn(
                                'h-7 rounded-lg text-xs gap-1',
                                mark === 'damaged'
                                  ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-50'
                                  : 'border-[#E5E5E7]'
                              )}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              {t('wh.return.markDamaged')}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {entries.length === 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      {t('wh.return.noSerials')}
                    </p>
                  )}
                </div>
                {damagedCount > 0 && depositHeld && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <span>{t('wh.return.depositHint')}</span>
                    {canApprove && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          closeReturn();
                          openDiscount(returnOrder);
                        }}
                        className="ml-auto h-7 rounded-lg border-amber-300 text-amber-800 hover:bg-amber-100 text-xs"
                      >
                        {t('wh.return.goDiscount')}
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center gap-2 pt-2 border-t border-[#E5E5E7]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReturnStep(1);
                      setReturnOrderId(null);
                      setReturnedSerialIds(new Set());
                      setReturnMarks({});
                    }}
                    className="rounded-xl border-[#E5E5E7]"
                  >
                    {t('wh.dispatch.back')}
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={closeReturn}
                      className="rounded-xl border-[#E5E5E7]"
                    >
                      {t('wh.common.cancel')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={finalizeReturn}
                      disabled={savingReturn || !allMarked}
                      className="rounded-xl bg-corporate hover:bg-corporate/90"
                    >
                      {savingReturn ? t('wh.return.finish') + '…' : t('wh.return.finish')}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: MODO EMERGENCIA (Supervisor+, motivo obligatorio) ─── */}
      <Dialog open={!!emergencyOrderId} onOpenChange={open => !open && setEmergencyOrderId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1D1D1F]">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {t('wh.emergency.title')}
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const emergencyOrder = orders.find(o => o.id === emergencyOrderId);
            if (!emergencyOrder) return null;
            const blockedTargets = advanceTargetsFor(emergencyOrder).filter(s =>
              isScanOnlyTarget(emergencyOrder, s.id || '')
            );
            return (
              <div className="space-y-3">
                <p className="text-xs text-[#86868B]">{t('wh.emergency.desc')}</p>
                <p className="text-sm font-medium text-[#1D1D1F]">
                  {emergencyOrder.orderNumber != null ? `#${emergencyOrder.orderNumber} · ` : ''}
                  {emergencyOrder.clientName}
                </p>
                <div>
                  <Label className="text-xs text-[#86868B]">{t('wh.emergency.target')}</Label>
                  <select
                    value={emergencyTargetId}
                    onChange={e => setEmergencyTargetId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-[#E5E5E7] bg-white text-sm text-[#1D1D1F]"
                  >
                    <option value="">—</option>
                    {blockedTargets.map(s => (
                      <option key={s.id} value={s.id}>{statusName(s)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-[#86868B]">{t('wh.emergency.reason')}</Label>
                  <Input
                    value={emergencyReason}
                    onChange={e => setEmergencyReason(e.target.value)}
                    placeholder={t('wh.emergency.reasonPlaceholder')}
                    className="mt-1 rounded-xl border-[#E5E5E7] text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEmergencyOrderId(null)}
                    className="rounded-xl border-[#E5E5E7]"
                  >
                    {t('wh.common.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveEmergency}
                    disabled={savingEmergency || !emergencyTargetId || !emergencyReason.trim()}
                    className="rounded-xl bg-amber-600 hover:bg-amber-600/90 text-white"
                  >
                    {savingEmergency ? t('wh.common.save') + '…' : t('wh.common.save')}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: QR IMPRIMIBLE DE LA ORDEN ─── */}
      <WhQrDialog
        open={!!qrOrderId}
        onOpenChange={open => !open && setQrOrderId(null)}
        order={qrOrderId ? orders.find(o => o.id === qrOrderId) ?? null : null}
      />

      {/* ─── MODAL: ESCANER QR (WH-D2: orden / serial / texto plano) ─── */}
      <WhScannerModal
        open={scanTarget !== null || returnScanTarget !== null}
        onOpenChange={open => {
          if (!open) {
            setScanTarget(null);
            setReturnScanTarget(null);
          }
        }}
        onScan={(kind, id) => {
          if (returnScanTarget !== null) handleReturnScan(kind, id);
          else handleDispatchScan(kind, id);
        }}
        resolveManual={resolveManualScanCode}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL ESCANER QR (html5-qrcode) del módulo Warehouse: parsea URLs de la
// app con searchParams order / serial; si el contenido no es URL, se
// interpreta como texto plano de serial (número de serie o id). Incluye
// entrada manual con el mismo parseo (prop resolveManual del padre).
// Bug "HTML Element with id=... not found": html5-qrcode LANZA en su
// CONSTRUCTOR si el contenedor no está en el DOM todavía. Con el Dialog
// de Radix el portal puede montarse después del efecto, así que la
// instancia se crea SOLO cuando el contenedor ya existe (reintento por
// requestAnimationFrame) y el id es único por instancia (useId), igual que
// en el ScannerModal de InventarioModule.
// ═══════════════════════════════════════════════════════════════════

interface WhScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (kind: 'order' | 'serial', id: string) => void;
  /** Resuelve texto plano contra colecciones conocidas (id de orden / serial) */
  resolveManual?: (raw: string) => { kind: 'order' | 'serial'; id: string } | null;
}

function WhScannerModal({ open, onOpenChange, onScan, resolveManual }: WhScannerModalProps) {
  // Ref para que el callback del escáner siempre vea el handler actual
  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  const resolveManualRef = useRef(resolveManual);
  useEffect(() => { resolveManualRef.current = resolveManual; }, [resolveManual]);

  // Id único por instancia: nunca colisiona entre dos modales montados
  const instanceId = `wh-qr-scanner-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // Entrada manual de código
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  useEffect(() => {
    if (open) {
      setManualOpen(false);
      setManualCode('');
    }
  }, [open]);

  // Mismo parseo para cámara y entrada manual: URL con searchParams
  // order / serial, o texto plano resuelto contra colecciones conocidas
  const parseScan = (text: string): { kind: 'order' | 'serial'; id: string } | null => {
    let parsed: URL | null = null;
    try {
      parsed = new URL(text);
    } catch {
      parsed = null;
    }
    const order = parsed?.searchParams.get('order') ?? null;
    const serial = parsed?.searchParams.get('serial') ?? null;
    if (order) return { kind: 'order', id: order };
    if (serial) return { kind: 'serial', id: serial };
    const trimmed = text.trim();
    if (!parsed && trimmed) {
      const resolved = resolveManualRef.current?.(trimmed) ?? null;
      if (resolved) return resolved;
      // Texto plano no resuelto: se entrega como serial (el flujo valida)
      return { kind: 'serial', id: trimmed };
    }
    return null;
  };

  useEffect(() => {
    if (!open) return;
    let disposed = false;
    let scanner: Html5QrcodeScanner | null = null;
    let rafId = 0;
    let attempts = 0;

    const start = () => {
      if (disposed) return;
      // El contenedor vive en el portal del Dialog: no se crea la instancia
      // hasta verificar que existe (reintento durante ~1s).
      const el = document.getElementById(instanceId);
      if (!el) {
        attempts += 1;
        if (attempts < 60) rafId = requestAnimationFrame(start);
        return;
      }
      try {
        scanner = new Html5QrcodeScanner(
          instanceId,
          { fps: 10, qrbox: 250 },
          /* verbose= */ false
        );
        scanner.render(
          (decodedText) => {
            const result = parseScan(decodedText);
            if (!result) {
              toast.error(t('wh.scanner.unrecognized'));
              return;
            }
            // QR válido: detener la cámara y entregar el resultado
            scanner?.clear().catch(() => undefined);
            onScanRef.current(result.kind, result.id);
          },
          () => undefined // errores de lectura transitorios: se ignoran
        );
      } catch (err) {
        console.error('[WhScannerModal]', err);
        toast.error(t('wh.toast.error'));
      }
    };

    rafId = requestAnimationFrame(start);

    // Apaga la cámara al desmontar / cerrar el modal
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      const active = scanner;
      scanner = null;
      if (active) active.clear().catch(() => undefined);
    };
  }, [open, instanceId]);

  const applyManualCode = () => {
    const result = parseScan(manualCode);
    if (!result) {
      toast.error(t('wh.scanner.unrecognized'));
      return;
    }
    onOpenChange(false);
    onScanRef.current(result.kind, result.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1D1D1F] flex items-center gap-2">
            <QrCode className="h-4 w-4 text-corporate" />
            {t('wh.scanner.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-[#86868B]">{t('wh.scanner.hint')}</p>
          <div className="space-y-2">
            <div id={instanceId} className="rounded-xl overflow-hidden" />
            {!manualOpen ? (
              <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="text-xs text-corporate underline"
              >
                {t('wh.scanner.manualEntry')}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyManualCode()}
                  placeholder={t('wh.scanner.manualPlaceholder')}
                  className="rounded-xl border-[#E5E5E7] text-sm"
                />
                <Button
                  size="sm"
                  onClick={applyManualCode}
                  disabled={!manualCode.trim()}
                  className="rounded-xl bg-corporate hover:bg-corporate/90 shrink-0"
                >
                  {t('wh.scanner.manualApply')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DIÁLOGO QR DE LA ORDEN con impresión de etiqueta (mismo patrón que el
// QrDialog de InventarioModule). El QR apunta al deep link
// /warehouse?order=<id> que abre el detalle de la orden.
// ═══════════════════════════════════════════════════════════════════

function WhQrDialog({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: RentalOrder | null;
}) {
  const [dataUrl, setDataUrl] = useState('');

  const qrText = order
    ? `${window.location.origin}/warehouse?order=${order.id}`
    : '';

  useEffect(() => {
    if (!open || !qrText) return;
    let alive = true;
    QRCode.toDataURL(qrText, { width: 512, margin: 2 })
      .then(url => { if (alive) setDataUrl(url); })
      .catch(err => console.error('[WhQrDialog] QRCode:', err));
    return () => { alive = false; };
  }, [open, qrText]);

  const handlePrint = () => {
    if (!dataUrl || !order) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const title = order.orderNumber != null ? `Orden #${order.orderNumber}` : t('wh.qr.title');
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
    <p class="label">${order.clientName}</p>
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
            {t('wh.qr.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          {order && (
            <p className="text-sm font-medium text-[#1D1D1F]">
              {order.orderNumber != null ? `#${order.orderNumber} · ` : ''}{order.clientName}
            </p>
          )}
          <p className="text-xs text-[#86868B]">{t('wh.qr.hint')}</p>
          {dataUrl ? (
            <img src={dataUrl} alt="QR" className="w-56 h-56 rounded-xl border border-[#E5E5E7]" />
          ) : (
            <div className="w-56 h-56 rounded-xl bg-[#F5F5F7] flex items-center justify-center text-xs text-[#86868B]">
              {t('wh.loading')}
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
            {t('wh.qr.print')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
