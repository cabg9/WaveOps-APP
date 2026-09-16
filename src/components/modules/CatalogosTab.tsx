// CATALOGOS TAB - Catálogos maestros (Fase 0 del plano maestro)
// Piso de los futuros módulos Inventario y Compras & Pagos.
// Cero datos hardcodeados: todo se crea desde la app.
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus, Pencil, Package, Truck, Layers, Calculator, Megaphone, Users,
  Eye, EyeOff, Upload, Sparkles, Building2, Info, Lock, Tags, Scale,
  Search, Trash2, ArrowUpDown, Star, ChevronDown, ChevronUp, Percent,
  ClipboardList, Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useAudit } from '@/hooks/useAudit';
import { useDynamicDepartments } from '@/hooks/firestore/useDynamicDepartments';
import { useStorageUpload } from '@/hooks/firestore/useStorageUpload';
import { executeWithConfirm } from '@/lib/confirm-action';
import { getCurrentTenantId } from '@/lib/tenant';
import { registerI18nKeys, t, getLanguage } from '@/lib/i18n';
import { Role } from '@/types';
import type { AuditAction } from '@/types/develops';
import type {
  CatalogBase, Supplier, SupplierBankAccount, Product, ProductCategory, UnitOfMeasure,
  CostCenter, SalesChannel, Client, ClientType, PriceTier, RentalDiscount, RentalOrderStatus,
  RentalFee,
} from '@/types/catalogs';

// Utilidad compartida: alternar un id en una lista (multi-selects de catálogos)
const toggleArrayId = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

// ═══════════════════════════════════════════════════════════════════
// I18N
// ═══════════════════════════════════════════════════════════════════

registerI18nKeys({
  es: {
    'catalogs.tabs.suppliers': 'Proveedores',
    'catalogs.tabs.products': 'Productos',
    'catalogs.tabs.categories': 'Categorías y unidades',
    'catalogs.tabs.costCenters': 'Centros de costo',
    'catalogs.tabs.salesChannels': 'Canales de venta',
    'catalogs.tabs.clients': 'Clientes',
    'catalogs.readonly.title': 'Modo solo lectura',
    'catalogs.readonly.message': 'Solo DIRECTOR GENERAL y RRHH pueden crear o editar catálogos. Tu rol tiene acceso de consulta.',
    'catalogs.common.new': 'Nuevo',
    'catalogs.common.create': 'Crear',
    'catalogs.common.update': 'Actualizar',
    'catalogs.common.cancel': 'Cancelar',
    'catalogs.common.edit': 'Editar',
    'catalogs.common.activate': 'Activar',
    'catalogs.common.deactivate': 'Desactivar',
    'catalogs.common.active': 'Activo',
    'catalogs.common.inactive': 'Inactivo',
    'catalogs.common.status': 'Estado',
    'catalogs.common.createdAt': 'Fecha de creación',
    'catalogs.common.updatedAt': 'Última edición',
    'catalogs.common.none': 'Ninguno',
    'catalogs.common.yes': 'Sí',
    'catalogs.common.no': 'No',
    'catalogs.common.empty': 'No hay registros todavía',
    'catalogs.common.required': 'Completa los campos obligatorios',
    'catalogs.common.confirmActivateTitle': 'Activar registro',
    'catalogs.common.confirmActivate': '¿Activar "{name}"? Volverá a estar disponible en los módulos.',
    'catalogs.common.confirmDeactivateTitle': 'Desactivar registro',
    'catalogs.common.confirmDeactivate': '¿Desactivar "{name}"? Quedará oculto pero no se eliminará.',
    'catalogs.common.loadInitial': 'Cargar iniciales',
    'catalogs.common.loadInitialDone': 'Semillas cargadas: {created} nuevas, {existing} ya existían',
    'catalogs.common.openImage': 'Abrir imagen en pestaña nueva',
    'catalogs.suppliers.title': 'Proveedores',
    'catalogs.suppliers.count': '{count} proveedor(es)',
    'catalogs.suppliers.new': 'Nuevo proveedor',
    'catalogs.suppliers.edit': 'Editar proveedor',
    'catalogs.suppliers.identification': 'RUC / Identificación',
    'catalogs.suppliers.name': 'Nombre o razón social',
    'catalogs.suppliers.contactName': 'Nombre de contacto',
    'catalogs.suppliers.email': 'Correo',
    'catalogs.suppliers.phone': 'Teléfono',
    'catalogs.suppliers.bank': 'Banco',
    'catalogs.suppliers.accountType': 'Tipo de cuenta',
    'catalogs.suppliers.accountNumber': 'Número de cuenta',
    'catalogs.suppliers.bankAccounts': 'Cuentas bancarias',
    'catalogs.suppliers.addAccount': 'Agregar cuenta',
    'catalogs.suppliers.removeAccount': 'Quitar cuenta',
    'catalogs.suppliers.primary': 'Principal',
    'catalogs.suppliers.noAccounts': 'Sin cuentas registradas',
    'catalogs.suppliers.accountsLine': '{count} cuenta(s) · Principal: {primary}',
    'catalogs.suppliers.suppliedCategories': 'Categorías que suministra',
    'catalogs.suppliers.frequentCostCenters': 'Centros de costo frecuentes',
    'catalogs.suppliers.noCategories': 'No hay categorías activas',
    'catalogs.suppliers.noCostCenters': 'No hay centros de costo activos',
    'catalogs.suppliers.paymentTerms': 'Condiciones de pago',
    'catalogs.suppliers.paymentTermsOther': 'Otro',
    'catalogs.suppliers.notes': 'Notas',
    'catalogs.suppliers.preferredProducts': 'Productos donde es proveedor preferido',
    'catalogs.suppliers.preferredProductsNone': 'No es proveedor preferido de ningún producto',
    'catalogs.products.title': 'Productos',
    'catalogs.products.count': '{count} producto(s)',
    'catalogs.products.new': 'Nuevo producto',
    'catalogs.products.edit': 'Editar producto',
    'catalogs.products.name': 'Nombre',
    'catalogs.products.nameEn': 'Nombre (inglés)',
    'catalogs.products.category': 'Categoría',
    'catalogs.products.unit': 'Unidad de medida',
    'catalogs.products.sku': 'SKU / Código',
    'catalogs.products.isRentable': '¿Se controla por seriales/unidades individuales?',
    'catalogs.products.isRentableHelp': 'Sí = cada unidad tiene su propio código y QR (ej: tanques, reguladores). Se renta y cuenta unidad por unidad. No = se maneja por cantidad (ej: cloro, papel).',
    'catalogs.products.rentableBadge': 'Rentable',
    'catalogs.products.isConsumable': 'Es consumible',
    'catalogs.products.isConsumableHelp': 'Se gasta y se acaba (ej: cloro, papel, snacks). Se controla por CANTIDAD (ej: 20 galones) y baja con cada salida.',
    'catalogs.products.photo': 'Foto del producto',
    'catalogs.products.uploadPhoto': 'Subir foto',
    'catalogs.products.selectCategory': 'Selecciona una categoría',
    'catalogs.products.selectUnit': 'Selecciona una unidad',
    'catalogs.products.yes': 'Sí',
    'catalogs.products.no': 'No',
    'catalogs.products.preferredSupplier': 'Proveedor preferido',
    'catalogs.products.selectSupplier': 'Selecciona un proveedor',
    'catalogs.products.searchPlaceholder': 'Buscar por nombre o SKU',
    'catalogs.products.allCategories': 'Todas las categorías',
    'catalogs.products.sortBy': 'Ordenar por',
    'catalogs.products.sortNameAsc': 'Nombre A-Z',
    'catalogs.products.sortNameDesc': 'Nombre Z-A',
    'catalogs.products.sortSku': 'SKU',
    'catalogs.products.groupByCategory': 'Agrupar por categoría',
    'catalogs.products.noCategory': 'Sin categoría',
    'catalogs.products.noResults': 'Sin resultados para los filtros aplicados',
    'catalogs.products.rentalPrice': 'Precio de renta por unidad/día',
    'catalogs.products.rentalPriceHelp': 'Precio por unidad por día cuando se renta.',
    'catalogs.products.depositPercent': 'Fianza (% sobre el valor de la renta)',
    'catalogs.products.depositPercentHelp': 'Porcentaje retenido como fianza sobre el valor de la renta.',
    'catalogs.products.priceTiers': 'Precios escalonados por cantidad',
    'catalogs.products.priceTiersHelp': 'Rangos de cantidad con su precio por unidad/día. Si un rango cubre la cantidad pedida, se usa su precio en lugar del precio base (el rango más específico gana).',
    'catalogs.products.tierMin': 'Desde (unidades)',
    'catalogs.products.tierMax': 'Hasta (vacío = sin tope)',
    'catalogs.products.tierPrice': 'Precio/unidad/día',
    'catalogs.products.addTier': 'Agregar rango',
    'catalogs.products.tierRange': '{min}–{max}: ${price}/día',
    'catalogs.products.tierRangeOpen': '{min} o más: ${price}/día',
    'catalogs.products.tierInvalid': 'Revisa los rangos: mínimo ≥ 1, máximo vacío o ≥ mínimo, precio > 0',
    'catalogs.categories.title': 'Categorías y unidades',
    'catalogs.categories.categories': 'Categorías de producto',
    'catalogs.categories.units': 'Unidades de medida',
    'catalogs.categories.newCategory': 'Nueva categoría',
    'catalogs.categories.editCategory': 'Editar categoría',
    'catalogs.categories.newUnit': 'Nueva unidad',
    'catalogs.categories.editUnit': 'Editar unidad',
    'catalogs.categories.name': 'Nombre',
    'catalogs.categories.nameEn': 'Nombre (inglés)',
    'catalogs.categories.abbreviation': 'Abreviatura',
    'catalogs.categories.categoryCount': '{count} categoría(s)',
    'catalogs.categories.unitCount': '{count} unidad(es)',
    'catalogs.costCenters.title': 'Centros de costo',
    'catalogs.costCenters.count': '{count} centro(s)',
    'catalogs.costCenters.new': 'Nuevo centro de costo',
    'catalogs.costCenters.edit': 'Editar centro de costo',
    'catalogs.costCenters.name': 'Nombre',
    'catalogs.costCenters.department': 'Departamento',
    'catalogs.costCenters.noDepartment': 'Sin departamento',
    'catalogs.salesChannels.title': 'Canales de venta',
    'catalogs.salesChannels.count': '{count} canal(es)',
    'catalogs.salesChannels.new': 'Nuevo canal de venta',
    'catalogs.salesChannels.edit': 'Editar canal de venta',
    'catalogs.salesChannels.name': 'Nombre',
    'catalogs.salesChannels.nameEn': 'Nombre (inglés)',
    'catalogs.clients.title': 'Clientes',
    'catalogs.clients.count': '{count} cliente(s)',
    'catalogs.clients.new': 'Nuevo cliente',
    'catalogs.clients.edit': 'Editar cliente',
    'catalogs.clients.type': 'Tipo de cliente',
    'catalogs.clients.typePersona': 'Persona',
    'catalogs.clients.typeEmpresa': 'Empresa',
    'catalogs.clients.typeInterno': 'Interno',
    'catalogs.clients.identification': 'Identificación',
    'catalogs.clients.name': 'Nombre',
    'catalogs.clients.contactName': 'Nombre de contacto',
    'catalogs.clients.email': 'Correo',
    'catalogs.clients.phone': 'Teléfono',
    'catalogs.clients.billingData': 'Datos de facturación',
    'catalogs.clients.businessName': 'Nombre comercial',
    'catalogs.clients.taxId': 'RUC / NIT',
    'catalogs.clients.address': 'Dirección',
    'catalogs.clients.department': 'Departamento',
    'catalogs.clients.selectDepartment': 'Selecciona un departamento',
    'catalogs.clients.duplicate': 'Ya existe un cliente activo con esos datos: "{name}"',
    'catalogs.clients.generateInternal': 'Generar clientes internos',
    'catalogs.clients.internalGenerated': 'Clientes internos: {created} creados, {existing} ya existían',
    'catalogs.clients.internalPrefix': 'Interno - ',
    'catalogs.tabs.discounts': 'Descuentos de renta',
    'catalogs.discounts.title': 'Descuentos de renta',
    'catalogs.discounts.count': '{count} descuento(s)',
    'catalogs.discounts.new': 'Nuevo descuento',
    'catalogs.discounts.edit': 'Editar descuento',
    'catalogs.discounts.name': 'Nombre',
    'catalogs.discounts.percent': 'Porcentaje de descuento',
    'catalogs.discounts.percentHelp': 'Valor positivo: 10 significa -10 % sobre el total de la orden.',
    'catalogs.discounts.percentInvalid': 'El porcentaje debe ser un número mayor que 0 y máximo 100',
    'catalogs.discounts.preAuthorized': 'Pre-autorizado',
    'catalogs.discounts.preAuthorizedHelp': 'Se aplica sin aprobación caso por caso porque ya está autorizado (ej: convenios, comisiones Bokun).',
    'catalogs.discounts.badgePreAuthorized': 'Pre-autorizado',
    'catalogs.discounts.appliesTo': 'Aplica a',
    'catalogs.discounts.appliesToHelp': 'Si no eliges productos, aplica a todos.',
    'catalogs.discounts.allProducts': 'Todos los productos',
    'catalogs.discounts.noRentableProducts': 'No hay productos rentables activos',
    'catalogs.tabs.orderStatuses': 'Estados de orden de renta',
    'catalogs.orderStatuses.title': 'Estados de orden de renta',
    'catalogs.orderStatuses.count': '{count} estado(s)',
    'catalogs.orderStatuses.new': 'Nuevo estado',
    'catalogs.orderStatuses.edit': 'Editar estado',
    'catalogs.orderStatuses.name': 'Nombre (español)',
    'catalogs.orderStatuses.nameEn': 'Nombre (inglés, opcional)',
    'catalogs.orderStatuses.order': 'Orden (secuencia)',
    'catalogs.orderStatuses.orderHelp': 'El número define la secuencia en que avanza una orden; los estados inactivos no se ofrecen al avanzar.',
    'catalogs.orderStatuses.finalOk': 'Final exitoso',
    'catalogs.orderStatuses.finalRepair': 'Final a reparación',
    'catalogs.orderStatuses.help': 'Son los estados por los que pasa una orden de renta: recibido → en preparación → listo para despachar → despachado → entregado → devuelto → verificado → almacenado. Si el equipo regresa dañado, la orden cierra en "a reparación" en lugar de "almacenado". El número de orden define la secuencia de avance. Este catálogo lo consume el módulo Warehouse desde Firestore.',
    'catalogs.orderStatuses.noDelete': 'Los estados no se eliminan: se desactivan para conservar el historial.',
    'catalogs.orderStatuses.orderInvalid': 'El orden debe ser un número entero',
    'catalogs.orderStatuses.seedsConfirmTitle': 'Cargar estados iniciales',
    'catalogs.orderStatuses.seedsConfirmDesc': 'Se crearán los estados iniciales que falten. Los existentes no se modifican.',
    'catalogs.orderStatuses.seedsAlreadyLoaded': 'Ya están cargadas',
    'catalogs.tabs.fees': 'Impuestos y cargos',
    'catalogs.fees.title': 'Impuestos y cargos',
    'catalogs.fees.count': '{count} impuesto(s)/cargo(s)',
    'catalogs.fees.new': 'Nuevo impuesto o cargo',
    'catalogs.fees.edit': 'Editar impuesto o cargo',
    'catalogs.fees.name': 'Nombre',
    'catalogs.fees.mode': 'Tipo de cálculo',
    'catalogs.fees.modePercent': 'Porcentaje (%)',
    'catalogs.fees.modeFixed': 'Monto fijo ($)',
    'catalogs.fees.value': 'Valor',
    'catalogs.fees.valueHelp': 'Con porcentaje, 15 significa 15 % sobre (subtotal − descuento). Con monto fijo, el valor se suma tal cual al total.',
    'catalogs.fees.valueInvalid': 'El valor debe ser un número mayor que 0',
    'catalogs.fees.linePercent': '{value}%',
    'catalogs.fees.lineFixed': '${value}',
    'catalogs.fees.help': 'Se suman al total de la orden de renta calculados sobre (subtotal − descuento). Los activos se pueden seleccionar al crear la orden. Semillas sugeridas: IVA 15 %, Servicio 5 %.',
    'catalogs.fees.seedsConfirmTitle': 'Cargar impuestos iniciales',
    'catalogs.fees.seedsConfirmDesc': 'Se crearán los impuestos/cargos iniciales que falten (IVA 15 % y Servicio 5 %). Los existentes no se modifican.',
    'catalogs.fees.seedsAlreadyLoaded': 'Ya están cargadas',
    'catalogs.products.admitsDiscount': 'Admite descuento',
    'catalogs.products.admitsDiscountHelp': 'Si es "No", el descuento en esta línea solo aplica cuando un supervisor aprueba la orden (sin importar el %).',
    'catalogs.products.hasQr': '¿Lleva código QR?',
    'catalogs.products.hasQrHelp': 'Sí = se escanea en despachos, conteos y recepciones. No = se confirma con firma/foto (se pedirá al recibir o despachar).',
    'catalogs.common.phonePrefix': 'Prefijo',
    'catalogs.suppliers.paymentTermsOtherKind': 'Tipo',
    'catalogs.suppliers.paymentTermsOtherKindCredit': 'Crédito a X días',
    'catalogs.suppliers.paymentTermsOtherKindAdvance': 'Anticipo %',
    'catalogs.suppliers.paymentTermsOtherValueCredit': 'Días de crédito',
    'catalogs.suppliers.paymentTermsOtherValueAdvance': 'Porcentaje de anticipo',
    'catalogs.suppliers.paymentTermsOtherFrequency': 'Frecuencia (opcional)',
    'catalogs.suppliers.paymentTermsFreqUnique': 'Única',
    'catalogs.suppliers.paymentTermsFreqWeekly': 'Semanal',
    'catalogs.suppliers.paymentTermsFreqBiweekly': 'Quincenal',
    'catalogs.suppliers.paymentTermsFreqMonthly': 'Mensual',
    'catalogs.suppliers.paymentTermsOtherInvalid': 'Completa el tipo y el valor de las condiciones de pago',
    'catalogs.suppliers.paymentTermsOtherLegacy': 'Valor guardado actualmente (solo lectura)',
    'catalogs.suppliers.accountTypePlaceholder': 'Selecciona el tipo de cuenta',
    'catalogs.suppliers.accountTypePersonalSavings': 'Personal Ahorros',
    'catalogs.suppliers.accountTypePersonalChecking': 'Personal Corriente',
    'catalogs.suppliers.accountTypeBusinessSavings': 'Empresarial Ahorros',
    'catalogs.suppliers.accountTypeBusinessChecking': 'Empresarial Corriente',
    'catalogs.suppliers.accountTypeInternational': 'Internacional',
    'catalogs.suppliers.swift': 'SWIFT',
    'catalogs.suppliers.iban': 'IBAN',
    'catalogs.suppliers.extraCode': 'Otro código (opcional)',
    'catalogs.products.delete': 'Eliminar producto',
    'catalogs.products.deleteTitle': 'Eliminar producto',
    'catalogs.products.deleteConfirm': '¿Eliminar "{name}" definitivamente? Esta acción no se puede deshacer.',
    'catalogs.products.deleteBlocked': 'Tiene historial: no se puede eliminar',
  },
  en: {
    'catalogs.tabs.suppliers': 'Suppliers',
    'catalogs.tabs.products': 'Products',
    'catalogs.tabs.categories': 'Categories & units',
    'catalogs.tabs.costCenters': 'Cost centers',
    'catalogs.tabs.salesChannels': 'Sales channels',
    'catalogs.tabs.clients': 'Clients',
    'catalogs.readonly.title': 'Read-only mode',
    'catalogs.readonly.message': 'Only GENERAL DIRECTOR and HR can create or edit catalogs. Your role has read access.',
    'catalogs.common.new': 'New',
    'catalogs.common.create': 'Create',
    'catalogs.common.update': 'Update',
    'catalogs.common.cancel': 'Cancel',
    'catalogs.common.edit': 'Edit',
    'catalogs.common.activate': 'Activate',
    'catalogs.common.deactivate': 'Deactivate',
    'catalogs.common.active': 'Active',
    'catalogs.common.inactive': 'Inactive',
    'catalogs.common.status': 'Status',
    'catalogs.common.createdAt': 'Created at',
    'catalogs.common.updatedAt': 'Last edited',
    'catalogs.common.none': 'None',
    'catalogs.common.yes': 'Yes',
    'catalogs.common.no': 'No',
    'catalogs.common.empty': 'No records yet',
    'catalogs.common.required': 'Please fill in the required fields',
    'catalogs.common.confirmActivateTitle': 'Activate record',
    'catalogs.common.confirmActivate': 'Activate "{name}"? It will become available again in the modules.',
    'catalogs.common.confirmDeactivateTitle': 'Deactivate record',
    'catalogs.common.confirmDeactivate': 'Deactivate "{name}"? It will be hidden but not deleted.',
    'catalogs.common.loadInitial': 'Load initial data',
    'catalogs.common.loadInitialDone': 'Seeds loaded: {created} new, {existing} already existed',
    'catalogs.common.openImage': 'Open image in new tab',
    'catalogs.suppliers.title': 'Suppliers',
    'catalogs.suppliers.count': '{count} supplier(s)',
    'catalogs.suppliers.new': 'New supplier',
    'catalogs.suppliers.edit': 'Edit supplier',
    'catalogs.suppliers.identification': 'Tax ID / Identification',
    'catalogs.suppliers.name': 'Name or legal name',
    'catalogs.suppliers.contactName': 'Contact name',
    'catalogs.suppliers.email': 'Email',
    'catalogs.suppliers.phone': 'Phone',
    'catalogs.suppliers.bank': 'Bank',
    'catalogs.suppliers.accountType': 'Account type',
    'catalogs.suppliers.accountNumber': 'Account number',
    'catalogs.suppliers.bankAccounts': 'Bank accounts',
    'catalogs.suppliers.addAccount': 'Add account',
    'catalogs.suppliers.removeAccount': 'Remove account',
    'catalogs.suppliers.primary': 'Primary',
    'catalogs.suppliers.noAccounts': 'No accounts registered',
    'catalogs.suppliers.accountsLine': '{count} account(s) · Primary: {primary}',
    'catalogs.suppliers.suppliedCategories': 'Categories supplied',
    'catalogs.suppliers.frequentCostCenters': 'Frequent cost centers',
    'catalogs.suppliers.noCategories': 'No active categories',
    'catalogs.suppliers.noCostCenters': 'No active cost centers',
    'catalogs.suppliers.paymentTerms': 'Payment terms',
    'catalogs.suppliers.paymentTermsOther': 'Other',
    'catalogs.suppliers.notes': 'Notes',
    'catalogs.suppliers.preferredProducts': 'Products where preferred supplier',
    'catalogs.suppliers.preferredProductsNone': 'Not the preferred supplier of any product',
    'catalogs.products.title': 'Products',
    'catalogs.products.count': '{count} product(s)',
    'catalogs.products.new': 'New product',
    'catalogs.products.edit': 'Edit product',
    'catalogs.products.name': 'Name',
    'catalogs.products.nameEn': 'Name (English)',
    'catalogs.products.category': 'Category',
    'catalogs.products.unit': 'Unit of measure',
    'catalogs.products.sku': 'SKU / Code',
    'catalogs.products.isRentable': 'Tracked by serials / individual units?',
    'catalogs.products.isRentableHelp': 'Yes = each unit has its own code and QR (e.g. tanks, regulators). It is rented and counted unit by unit. No = managed by quantity (e.g. chlorine, paper).',
    'catalogs.products.rentableBadge': 'Rentable',
    'catalogs.products.isConsumable': 'Consumable',
    'catalogs.products.isConsumableHelp': 'It gets used up (e.g. chlorine, paper, snacks). Tracked by QUANTITY (e.g. 20 gallons) and decreases with each outgoing movement.',
    'catalogs.products.photo': 'Product photo',
    'catalogs.products.uploadPhoto': 'Upload photo',
    'catalogs.products.selectCategory': 'Select a category',
    'catalogs.products.selectUnit': 'Select a unit',
    'catalogs.products.yes': 'Yes',
    'catalogs.products.no': 'No',
    'catalogs.products.preferredSupplier': 'Preferred supplier',
    'catalogs.products.selectSupplier': 'Select a supplier',
    'catalogs.products.searchPlaceholder': 'Search by name or SKU',
    'catalogs.products.allCategories': 'All categories',
    'catalogs.products.sortBy': 'Sort by',
    'catalogs.products.sortNameAsc': 'Name A-Z',
    'catalogs.products.sortNameDesc': 'Name Z-A',
    'catalogs.products.sortSku': 'SKU',
    'catalogs.products.groupByCategory': 'Group by category',
    'catalogs.products.noCategory': 'Uncategorized',
    'catalogs.products.noResults': 'No results for the applied filters',
    'catalogs.products.rentalPrice': 'Rental price per unit/day',
    'catalogs.products.rentalPriceHelp': 'Price per unit per day when rented.',
    'catalogs.products.depositPercent': 'Deposit (% of rental value)',
    'catalogs.products.depositPercentHelp': 'Percentage held as a deposit on the rental value.',
    'catalogs.products.priceTiers': 'Quantity tiered pricing',
    'catalogs.products.priceTiersHelp': 'Quantity ranges with their price per unit/day. If a range covers the ordered quantity, its price is used instead of the base price (the most specific range wins).',
    'catalogs.products.tierMin': 'From (units)',
    'catalogs.products.tierMax': 'To (empty = no cap)',
    'catalogs.products.tierPrice': 'Price/unit/day',
    'catalogs.products.addTier': 'Add range',
    'catalogs.products.tierRange': '{min}–{max}: ${price}/day',
    'catalogs.products.tierRangeOpen': '{min} or more: ${price}/day',
    'catalogs.products.tierInvalid': 'Check the ranges: minimum ≥ 1, maximum empty or ≥ minimum, price > 0',
    'catalogs.tabs.discounts': 'Rental discounts',
    'catalogs.discounts.title': 'Rental discounts',
    'catalogs.discounts.count': '{count} discount(s)',
    'catalogs.discounts.new': 'New discount',
    'catalogs.discounts.edit': 'Edit discount',
    'catalogs.discounts.name': 'Name',
    'catalogs.discounts.percent': 'Discount percentage',
    'catalogs.discounts.percentHelp': 'Positive value: 10 means -10 % off the order total.',
    'catalogs.discounts.percentInvalid': 'The percentage must be a number greater than 0 and at most 100',
    'catalogs.discounts.preAuthorized': 'Pre-authorized',
    'catalogs.discounts.preAuthorizedHelp': 'It applies without case-by-case approval because it is already authorized (e.g. agreements, Bokun commissions).',
    'catalogs.discounts.badgePreAuthorized': 'Pre-authorized',
    'catalogs.discounts.appliesTo': 'Applies to',
    'catalogs.discounts.appliesToHelp': 'If you pick no products, it applies to all.',
    'catalogs.discounts.allProducts': 'All products',
    'catalogs.discounts.noRentableProducts': 'No active rentable products',
    'catalogs.tabs.orderStatuses': 'Rental order statuses',
    'catalogs.orderStatuses.title': 'Rental order statuses',
    'catalogs.orderStatuses.count': '{count} status(es)',
    'catalogs.orderStatuses.new': 'New status',
    'catalogs.orderStatuses.edit': 'Edit status',
    'catalogs.orderStatuses.name': 'Name (Spanish)',
    'catalogs.orderStatuses.nameEn': 'Name (English, optional)',
    'catalogs.orderStatuses.order': 'Order (sequence)',
    'catalogs.orderStatuses.orderHelp': 'The number defines the sequence in which an order advances; inactive statuses are not offered when advancing.',
    'catalogs.orderStatuses.finalOk': 'Successful final',
    'catalogs.orderStatuses.finalRepair': 'Repair final',
    'catalogs.orderStatuses.help': 'These are the statuses a rental order goes through: received → in preparation → ready to dispatch → dispatched → delivered → returned → verified → stored. If the equipment comes back damaged, the order closes in "to repair" instead of "stored". The order number defines the advance sequence. The Warehouse module consumes this catalog from Firestore.',
    'catalogs.orderStatuses.noDelete': 'Statuses are not deleted: they are deactivated to preserve history.',
    'catalogs.orderStatuses.orderInvalid': 'Order must be a whole number',
    'catalogs.orderStatuses.seedsConfirmTitle': 'Load initial statuses',
    'catalogs.orderStatuses.seedsConfirmDesc': 'Missing initial statuses will be created. Existing ones are not modified.',
    'catalogs.orderStatuses.seedsAlreadyLoaded': 'Already loaded',
    'catalogs.tabs.fees': 'Taxes & fees',
    'catalogs.fees.title': 'Taxes & fees',
    'catalogs.fees.count': '{count} tax(es)/fee(s)',
    'catalogs.fees.new': 'New tax or fee',
    'catalogs.fees.edit': 'Edit tax or fee',
    'catalogs.fees.name': 'Name',
    'catalogs.fees.mode': 'Calculation type',
    'catalogs.fees.modePercent': 'Percentage (%)',
    'catalogs.fees.modeFixed': 'Fixed amount ($)',
    'catalogs.fees.value': 'Value',
    'catalogs.fees.valueHelp': 'With percentage, 15 means 15 % on (subtotal − discount). With fixed amount, the value is added as-is to the total.',
    'catalogs.fees.valueInvalid': 'The value must be a number greater than 0',
    'catalogs.fees.linePercent': '{value}%',
    'catalogs.fees.lineFixed': '${value}',
    'catalogs.fees.help': 'They are added to the rental order total calculated on (subtotal − discount). Active ones can be selected when creating an order. Suggested seeds: VAT 15 %, Service 5 %.',
    'catalogs.fees.seedsConfirmTitle': 'Load initial taxes',
    'catalogs.fees.seedsConfirmDesc': 'Missing initial taxes/fees will be created (VAT 15 % and Service 5 %). Existing ones are not modified.',
    'catalogs.fees.seedsAlreadyLoaded': 'Already loaded',
    'catalogs.products.admitsDiscount': 'Allows discount',
    'catalogs.products.admitsDiscountHelp': 'If "No", the discount on this line only applies when a supervisor approves the order (regardless of the %).',
    'catalogs.products.hasQr': 'Has QR code?',
    'catalogs.products.hasQrHelp': 'Yes = scanned on dispatches, counts and receptions. No = confirmed with signature/photo (asked when receiving or dispatching).',
    'catalogs.common.phonePrefix': 'Prefix',
    'catalogs.suppliers.paymentTermsOtherKind': 'Type',
    'catalogs.suppliers.paymentTermsOtherKindCredit': 'Credit at X days',
    'catalogs.suppliers.paymentTermsOtherKindAdvance': 'Advance %',
    'catalogs.suppliers.paymentTermsOtherValueCredit': 'Credit days',
    'catalogs.suppliers.paymentTermsOtherValueAdvance': 'Advance percentage',
    'catalogs.suppliers.paymentTermsOtherFrequency': 'Frequency (optional)',
    'catalogs.suppliers.paymentTermsFreqUnique': 'One-time',
    'catalogs.suppliers.paymentTermsFreqWeekly': 'Weekly',
    'catalogs.suppliers.paymentTermsFreqBiweekly': 'Biweekly',
    'catalogs.suppliers.paymentTermsFreqMonthly': 'Monthly',
    'catalogs.suppliers.paymentTermsOtherInvalid': 'Fill in the type and value of the payment terms',
    'catalogs.suppliers.paymentTermsOtherLegacy': 'Currently saved value (read-only)',
    'catalogs.suppliers.accountTypePlaceholder': 'Select the account type',
    'catalogs.suppliers.accountTypePersonalSavings': 'Personal Savings',
    'catalogs.suppliers.accountTypePersonalChecking': 'Personal Checking',
    'catalogs.suppliers.accountTypeBusinessSavings': 'Business Savings',
    'catalogs.suppliers.accountTypeBusinessChecking': 'Business Checking',
    'catalogs.suppliers.accountTypeInternational': 'International',
    'catalogs.suppliers.swift': 'SWIFT',
    'catalogs.suppliers.iban': 'IBAN',
    'catalogs.suppliers.extraCode': 'Other code (optional)',
    'catalogs.products.delete': 'Delete product',
    'catalogs.products.deleteTitle': 'Delete product',
    'catalogs.products.deleteConfirm': 'Delete "{name}" permanently? This action cannot be undone.',
    'catalogs.products.deleteBlocked': 'Has history: cannot be deleted',
    'catalogs.categories.title': 'Categories & units',
    'catalogs.categories.categories': 'Product categories',
    'catalogs.categories.units': 'Units of measure',
    'catalogs.categories.newCategory': 'New category',
    'catalogs.categories.editCategory': 'Edit category',
    'catalogs.categories.newUnit': 'New unit',
    'catalogs.categories.editUnit': 'Edit unit',
    'catalogs.categories.name': 'Name',
    'catalogs.categories.nameEn': 'Name (English)',
    'catalogs.categories.abbreviation': 'Abbreviation',
    'catalogs.categories.categoryCount': '{count} category(ies)',
    'catalogs.categories.unitCount': '{count} unit(s)',
    'catalogs.costCenters.title': 'Cost centers',
    'catalogs.costCenters.count': '{count} cost center(s)',
    'catalogs.costCenters.new': 'New cost center',
    'catalogs.costCenters.edit': 'Edit cost center',
    'catalogs.costCenters.name': 'Name',
    'catalogs.costCenters.department': 'Department',
    'catalogs.costCenters.noDepartment': 'No department',
    'catalogs.salesChannels.title': 'Sales channels',
    'catalogs.salesChannels.count': '{count} channel(s)',
    'catalogs.salesChannels.new': 'New sales channel',
    'catalogs.salesChannels.edit': 'Edit sales channel',
    'catalogs.salesChannels.name': 'Name',
    'catalogs.salesChannels.nameEn': 'Name (English)',
    'catalogs.clients.title': 'Clients',
    'catalogs.clients.count': '{count} client(s)',
    'catalogs.clients.new': 'New client',
    'catalogs.clients.edit': 'Edit client',
    'catalogs.clients.type': 'Client type',
    'catalogs.clients.typePersona': 'Person',
    'catalogs.clients.typeEmpresa': 'Company',
    'catalogs.clients.typeInterno': 'Internal',
    'catalogs.clients.identification': 'Identification',
    'catalogs.clients.name': 'Name',
    'catalogs.clients.contactName': 'Contact name',
    'catalogs.clients.email': 'Email',
    'catalogs.clients.phone': 'Phone',
    'catalogs.clients.billingData': 'Billing data',
    'catalogs.clients.businessName': 'Business name',
    'catalogs.clients.taxId': 'Tax ID',
    'catalogs.clients.address': 'Address',
    'catalogs.clients.department': 'Department',
    'catalogs.clients.selectDepartment': 'Select a department',
    'catalogs.clients.duplicate': 'An active client already exists with that data: "{name}"',
    'catalogs.clients.generateInternal': 'Generate internal clients',
    'catalogs.clients.internalGenerated': 'Internal clients: {created} created, {existing} already existed',
    'catalogs.clients.internalPrefix': 'Internal - ',
  },
});

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function toIso(value: any): string {
  if (value?.toDate) return value.toDate().toISOString();
  if (typeof value === 'string' && value) return value;
  return new Date().toISOString();
}

// Campos base de todo documento nuevo de catálogo
function basePayload(uid: string) {
  const now = new Date().toISOString();
  return {
    tenantId: getCurrentTenantId(),
    isActive: true,
    createdAt: now,
    createdBy: uid,
    updatedAt: now,
    updatedBy: uid,
  };
}

function touchPayload(uid: string) {
  return { updatedAt: new Date().toISOString(), updatedBy: uid };
}

function fmt(key: string, vars: Record<string, string | number>): string {
  let out = t(key);
  Object.entries(vars).forEach(([k, v]) => { out = out.replace(`{${k}}`, String(v)); });
  return out;
}

// Fecha legible para las tarjetas expandibles (ISO string -> locale)
function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// Toggle genérico para el Set de tarjetas expandidas (varias a la vez)
function toggleId(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

// ─── Teléfono con prefijo internacional (Ronda 6, punto 6) ───
// Shape guardado (uniforme): `phone` siempre compuesto "+prefijoNúmero" sin
// espacios ni guiones (ej. "+593991234567"), junto con `phonePrefix` y
// `phoneNumber` por separado para edición estructurada. Compatibilidad:
// teléfonos legacy sin "+" se precargan con prefijo por defecto y el número
// tal cual; si empieza con "+", se separa el prefijo (aunque no esté en la
// lista, se ofrece como opción extra en el selector).
const PHONE_PREFIXES = ['+593', '+1', '+34', '+52', '+57', '+51', '+56', '+598', '+502', '+506', '+507'];
const DEFAULT_PHONE_PREFIX = '+593';

function parsePhoneParts(phone?: string | null): { prefix: string; number: string } {
  const raw = (phone || '').trim();
  const m = raw.match(/^(\+\d{1,3})[\s-]?(.*)$/);
  if (m) return { prefix: m[1], number: m[2].replace(/[\s-]/g, '') };
  return { prefix: DEFAULT_PHONE_PREFIX, number: raw.replace(/[\s-]/g, '') };
}

function composePhone(prefix: string, number: string): string | null {
  const digits = number.replace(/\D/g, '');
  return digits ? `${prefix}${digits}` : null;
}

// ─── Condiciones de pago "Otro" estructurado (Ronda 6, punto 7) ───
// Se guarda UN solo string uniforme compuesto: "Crédito 45 días · mensual" /
// "Anticipo 30%". Nada de texto libre abierto. Valores viejos no estándar se
// parsean al abrir edición; si no se reconocen, se muestran solo lectura.
const PAYMENT_TERMS_FREQUENCIES = ['única', 'semanal', 'quincenal', 'mensual'];

interface ParsedOtherTerms {
  kind: 'credit' | 'advance' | '';
  value: string;
  frequency: string;
  legacy: string; // texto viejo no parseable (se conserva al guardar si no se rellena lo estructurado)
}

function parseOtherTerms(raw: string): ParsedOtherTerms {
  const text = (raw || '').trim();
  if (!text) return { kind: '', value: '', frequency: '', legacy: '' };
  const lower = text.toLowerCase();
  const frequency = PAYMENT_TERMS_FREQUENCIES.find((f) => f !== 'única' && lower.includes(f)) || '';
  let m = text.match(/cr[eé]dito\D+(\d+(?:[.,]\d+)?)/i) || text.match(/^(\d+(?:[.,]\d+)?)\s*d[ií]as?/i);
  if (m) return { kind: 'credit', value: m[1].replace(',', '.'), frequency, legacy: '' };
  m = text.match(/anticipo\D+(\d+(?:[.,]\d+)?)\s*%/i) || text.match(/^(\d+(?:[.,]\d+)?)\s*%/);
  if (m) return { kind: 'advance', value: m[1].replace(',', '.'), frequency, legacy: '' };
  return { kind: '', value: '', frequency: '', legacy: text };
}

function composeOtherTerms(kind: 'credit' | 'advance', value: string, frequency: string): string {
  const base = kind === 'credit' ? `Crédito ${value} días` : `Anticipo ${value}%`;
  return frequency && frequency !== 'única' ? `${base} · ${frequency}` : base;
}

// ─── Tipo de cuenta bancaria (Ronda 6, punto 8) ───
// Valores fijos guardados tal cual (shape uniforme en español). Las cuentas
// "Internacional" llevan swift/iban/extraCode opcionales. accountType libre de
// datos viejos se conserva y se muestra como opción extra del selector.
const ACCOUNT_TYPE_OPTIONS = ['Personal Ahorros', 'Personal Corriente', 'Empresarial Ahorros', 'Empresarial Corriente', 'Internacional'];
const ACCOUNT_TYPE_INTERNATIONAL = 'Internacional';
const ACCOUNT_TYPE_LABEL_KEYS: Record<string, string> = {
  'Personal Ahorros': 'catalogs.suppliers.accountTypePersonalSavings',
  'Personal Corriente': 'catalogs.suppliers.accountTypePersonalChecking',
  'Empresarial Ahorros': 'catalogs.suppliers.accountTypeBusinessSavings',
  'Empresarial Corriente': 'catalogs.suppliers.accountTypeBusinessChecking',
  'Internacional': 'catalogs.suppliers.accountTypeInternational',
};

function accountTypeLabel(value?: string): string {
  if (!value) return '';
  const key = ACCOUNT_TYPE_LABEL_KEYS[value];
  return key ? t(key) : value; // valor legacy libre: se muestra tal cual
}

// Fila de detalle: etiqueta gris + valor, para los paneles expandibles
function DetailItem({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#86868B]">{label}</p>
      <div className="mt-0.5 text-sm text-[#1D1D1F] break-words">{children ?? '—'}</div>
    </div>
  );
}

// Grid de detalle: 2 columnas en desktop, 1 en móvil
function DetailsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">{children}</div>;
}

// Hook genérico: escucha una colección de catálogo en tiempo real
function useCatalog<T extends CatalogBase & { name?: string }>(collectionName: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, collectionName),
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            isActive: data.isActive !== false,
            createdAt: toIso(data.createdAt),
            updatedAt: toIso(data.updatedAt),
          } as T;
        });
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.error(`[CatalogosTab] Error en ${collectionName}:`, err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [collectionName]);

  return { items, loading };
}

const SELECT_CLASS = 'w-full h-10 rounded-lg border border-[#E5E5E7] bg-white px-3 text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-corporate/20';

// Campo de teléfono compartido (punto 6): select de prefijo internacional +
// input numérico. El padre guarda prefijo y número por separado.
function PhoneField({ prefix, number, onPrefixChange, onNumberChange }: {
  prefix: string;
  number: string;
  onPrefixChange: (v: string) => void;
  onNumberChange: (v: string) => void;
}) {
  const options = PHONE_PREFIXES.includes(prefix) ? PHONE_PREFIXES : [...PHONE_PREFIXES, prefix];
  return (
    <div className="flex gap-2">
      <select
        value={prefix}
        onChange={(e) => onPrefixChange(e.target.value)}
        aria-label={t('catalogs.common.phonePrefix')}
        className={cn(SELECT_CLASS, 'w-auto shrink-0 pr-8')}
      >
        {options.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <Input
        value={number}
        onChange={(e) => onNumberChange(e.target.value.replace(/\D/g, ''))}
        inputMode="numeric"
        className="flex-1 min-w-0"
      />
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  canWrite: boolean;
  onNew?: () => void;
  newLabel?: string;
  extra?: React.ReactNode;
}

function SectionHeader({ title, subtitle, canWrite, onNew, newLabel, extra }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div>
        <h2 className="text-lg font-semibold text-[#1D1D1F]">{title}</h2>
        {subtitle && <p className="text-sm text-[#86868B]">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {extra}
        {canWrite && onNew && (
          <Button onClick={onNew} className="bg-corporate hover:bg-corporate/90 flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" /> {newLabel || t('catalogs.common.new')}
          </Button>
        )}
      </div>
    </div>
  );
}

interface EntityCardProps {
  name: string;
  lines?: string[];
  icon: React.ReactNode;
  isActive: boolean;
  canWrite: boolean;
  onEdit: () => void;
  onToggle: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  details?: React.ReactNode;
}

function EntityCard({ name, lines, icon, isActive, canWrite, onEdit, onToggle, expanded, onToggleExpand, details }: EntityCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-opacity',
        !isActive && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Encabezado clickeable: expande/colapsa el detalle */}
        <div
          onClick={onToggleExpand}
          className={cn('min-w-0 flex-1 flex items-start gap-4', onToggleExpand && 'cursor-pointer select-none')}
        >
          <div className="h-10 w-10 rounded-xl bg-[#F5F5F7] flex items-center justify-center shrink-0 text-[#86868B]">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-[#1D1D1F] truncate">{name}</h3>
              <span
                className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0',
                  isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-[#F5F5F7] text-[#86868B]'
                )}
              >
                {isActive ? t('catalogs.common.active') : t('catalogs.common.inactive')}
              </span>
            </div>
            {lines && lines.filter(Boolean).length > 0 && (
              <div className="mt-1 space-y-0.5">
                {lines.filter(Boolean).map((line, i) => (
                  <p key={i} className="text-xs text-[#86868B] truncate">{line}</p>
                ))}
              </div>
            )}
          </div>
          {onToggleExpand && (
            <span className="shrink-0 text-[#86868B] mt-0.5">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          )}
        </div>
        {/* Botones de acción: fuera del área clickeable */}
        {canWrite && (
          <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={onEdit} title={t('catalogs.common.edit')} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]">
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={onToggle}
              title={isActive ? t('catalogs.common.deactivate') : t('catalogs.common.activate')}
              className={cn('p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]', !isActive && 'hover:text-emerald-600')}
            >
              {isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
      {/* Detalle completo del registro */}
      {expanded && details && (
        <div className="mt-4 pt-4 border-t border-[#F5F5F7]">
          {details}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, onCreate, canWrite }: { icon: React.ReactNode; onCreate?: () => void; canWrite: boolean }) {
  return (
    <div className="bg-white rounded-2xl p-12 text-center text-[#86868B] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="mx-auto mb-3 h-12 w-12 opacity-30 flex items-center justify-center">{icon}</div>
      <p className="text-sm">{t('catalogs.common.empty')}</p>
      {canWrite && onCreate && (
        <button onClick={onCreate} className="mt-4 rounded-xl bg-corporate px-4 py-2 text-sm text-white hover:bg-corporate/90 transition">
          {t('catalogs.common.new')}
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

type SubTab = 'suppliers' | 'products' | 'categories' | 'costCenters' | 'salesChannels' | 'clients' | 'discounts' | 'orderStatuses' | 'fees';

const SUB_TABS: { key: SubTab; labelKey: string; icon: React.ReactNode }[] = [
  { key: 'suppliers', labelKey: 'catalogs.tabs.suppliers', icon: <Truck className="w-4 h-4" /> },
  { key: 'products', labelKey: 'catalogs.tabs.products', icon: <Package className="w-4 h-4" /> },
  { key: 'categories', labelKey: 'catalogs.tabs.categories', icon: <Layers className="w-4 h-4" /> },
  { key: 'costCenters', labelKey: 'catalogs.tabs.costCenters', icon: <Calculator className="w-4 h-4" /> },
  { key: 'salesChannels', labelKey: 'catalogs.tabs.salesChannels', icon: <Megaphone className="w-4 h-4" /> },
  { key: 'clients', labelKey: 'catalogs.tabs.clients', icon: <Users className="w-4 h-4" /> },
  { key: 'discounts', labelKey: 'catalogs.tabs.discounts', icon: <Percent className="w-4 h-4" /> },
  { key: 'orderStatuses', labelKey: 'catalogs.tabs.orderStatuses', icon: <ClipboardList className="w-4 h-4" /> },
  { key: 'fees', labelKey: 'catalogs.tabs.fees', icon: <Receipt className="w-4 h-4" /> },
];

export function CatalogosTab() {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>('suppliers');

  const canWrite = !!user && (user.role === Role.DIRECTOR_GENERAL || user.role === Role.RRHH);

  return (
    <div className="space-y-5">
      {/* Sub-pestañas internas (pills) */}
      <div className="flex flex-wrap gap-2">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all',
              subTab === tab.key
                ? 'bg-corporate text-white shadow-sm'
                : 'bg-white text-[#86868B] hover:text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
            )}
          >
            {tab.icon}
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Aviso de solo lectura */}
      {!canWrite && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">{t('catalogs.readonly.title')}</p>
            <p className="text-xs text-amber-700 mt-0.5">{t('catalogs.readonly.message')}</p>
          </div>
        </div>
      )}

      {subTab === 'suppliers' && <SuppliersSection canWrite={canWrite} />}
      {subTab === 'products' && <ProductsSection canWrite={canWrite} />}
      {subTab === 'categories' && <CategoriesSection canWrite={canWrite} />}
      {subTab === 'costCenters' && <CostCentersSection canWrite={canWrite} />}
      {subTab === 'salesChannels' && <SalesChannelsSection canWrite={canWrite} />}
      {subTab === 'clients' && <ClientsSection canWrite={canWrite} />}
      {subTab === 'discounts' && <RentalDiscountsSection canWrite={canWrite} />}
      {subTab === 'orderStatuses' && <RentalOrderStatusesSection canWrite={canWrite} />}
      {subTab === 'fees' && <RentalFeesSection canWrite={canWrite} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN: PROVEEDORES
// ═══════════════════════════════════════════════════════════════════

// Cuenta bancaria en edición (punto 8): extiende el tipo del catálogo con
// swift/iban/extraCode opcionales para cuentas internacionales.
interface SupplierBankAccountForm extends SupplierBankAccount {
  swift?: string;
  iban?: string;
  extraCode?: string;
}

interface SupplierFormState {
  identification: string;
  name: string;
  contactName: string;
  email: string;
  phonePrefix: string;
  phoneNumber: string;
  bankAccounts: SupplierBankAccountForm[];
  productCategoryIds: string[];
  costCenterIds: string[];
  paymentTerms: string; // opción fija elegida ('__other__' = estructurado)
  paymentTermsOtherKind: 'credit' | 'advance' | ''; // tipo cuando es "Otro"
  paymentTermsOtherValue: string; // días o % según el tipo
  paymentTermsOtherFrequency: string; // '' | 'única' | 'semanal' | 'quincenal' | 'mensual'
  paymentTermsOtherLegacy: string; // valor viejo no estándar no parseable (solo lectura)
  notes: string;
}

// Condiciones de pago: opciones fijas (spec) + "Otro" estructurado.
// Los valores ya guardados que no coincidan con una fija se precargan en
// "Otro" (parseados a lo estructuro o como texto legacy solo lectura).
const PAYMENT_TERMS_OPTIONS = ['Contado', 'Crédito 15', 'Crédito 30', 'Crédito 60', 'Anticipo 50%'];
const PAYMENT_TERMS_OTHER = '__other__';

const EMPTY_SUPPLIER: SupplierFormState = {
  identification: '', name: '', contactName: '', email: '', phonePrefix: DEFAULT_PHONE_PREFIX, phoneNumber: '',
  bankAccounts: [], productCategoryIds: [], costCenterIds: [], paymentTerms: '',
  paymentTermsOtherKind: '', paymentTermsOtherValue: '', paymentTermsOtherFrequency: '', paymentTermsOtherLegacy: '', notes: '',
};

function newAccountId(): string {
  return `acc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function SuppliersSection({ canWrite }: { canWrite: boolean }) {
  const { user } = useAuth();
  const { logAction } = useAudit();
  const { items: suppliers } = useCatalog<Supplier>('suppliers');
  const { items: products } = useCatalog<Product>('products');
  const { items: productCategories } = useCatalog<ProductCategory>('productCategories');
  const { items: costCenters } = useCatalog<CostCenter>('costCenters');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierFormState>(EMPTY_SUPPLIER);
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const activeCategories = useMemo(() => productCategories.filter((c) => c.isActive), [productCategories]);
  const activeCostCenters = useMemo(() => costCenters.filter((c) => c.isActive), [costCenters]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_SUPPLIER); setShowModal(true); };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    // Migración legacy: si no hay bankAccounts pero sí bankData, migrarlo como cuenta principal
    const existingAccounts: SupplierBankAccountForm[] =
      s.bankAccounts && s.bankAccounts.length > 0
        ? s.bankAccounts.map((a) => ({ ...a }))
        : s.bankData && (s.bankData.bank || s.bankData.accountType || s.bankData.accountNumber)
          ? [{
              id: newAccountId(),
              bank: s.bankData.bank || '',
              accountType: s.bankData.accountType || '',
              accountNumber: s.bankData.accountNumber || '',
              isPrimary: true,
            }]
          : [];
    const phoneParts = parsePhoneParts(s.phone);
    const otherTerms = s.paymentTerms && !PAYMENT_TERMS_OPTIONS.includes(s.paymentTerms)
      ? parseOtherTerms(s.paymentTerms)
      : { kind: '' as const, value: '', frequency: '', legacy: '' };
    setForm({
      identification: s.identification || '',
      name: s.name || '',
      contactName: s.contactName || '',
      email: s.email || '',
      phonePrefix: phoneParts.prefix,
      phoneNumber: phoneParts.number,
      bankAccounts: existingAccounts,
      productCategoryIds: s.productCategoryIds ? [...s.productCategoryIds] : [],
      costCenterIds: s.costCenterIds ? [...s.costCenterIds] : [],
      paymentTerms: s.paymentTerms && !PAYMENT_TERMS_OPTIONS.includes(s.paymentTerms) ? PAYMENT_TERMS_OTHER : (s.paymentTerms || ''),
      paymentTermsOtherKind: otherTerms.kind,
      paymentTermsOtherValue: otherTerms.value,
      paymentTermsOtherFrequency: otherTerms.frequency,
      paymentTermsOtherLegacy: otherTerms.legacy,
      notes: s.notes || '',
    });
    setShowModal(true);
  };

  const addAccount = () =>
    setForm((f) => ({
      ...f,
      bankAccounts: [
        ...f.bankAccounts,
        { id: newAccountId(), bank: '', accountType: '', accountNumber: '', isPrimary: f.bankAccounts.length === 0 },
      ],
    }));

  const updateAccount = (id: string, patch: Partial<SupplierBankAccountForm>) =>
    setForm((f) => ({ ...f, bankAccounts: f.bankAccounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));

  const removeAccount = (id: string) =>
    setForm((f) => ({ ...f, bankAccounts: f.bankAccounts.filter((a) => a.id !== id) }));

  // Solo una cuenta puede ser principal: al marcar una se desmarcan las demás
  const setPrimaryAccount = (id: string) =>
    setForm((f) => ({ ...f, bankAccounts: f.bankAccounts.map((a) => ({ ...a, isPrimary: a.id === id })) }));

  const toggleInList = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const accountsLine = (s: Supplier): string => {
    const accs = s.bankAccounts || [];
    if (accs.length === 0) return '';
    const primary = accs.find((a) => a.isPrimary) || accs[0];
    return fmt('catalogs.suppliers.accountsLine', {
      count: accs.length,
      primary: [primary.bank, primary.accountNumber].filter(Boolean).join(' · ') || '—',
    });
  };

  const categoryNamesFor = (ids?: string[]) =>
    (ids || []).map((id) => productCategories.find((c) => c.id === id)?.name).filter(Boolean) as string[];
  const costCenterNamesFor = (ids?: string[]) =>
    (ids || []).map((id) => costCenters.find((c) => c.id === id)?.name).filter(Boolean) as string[];
  const preferredProductsFor = (supplierId: string) =>
    products.filter((p) => p.preferredSupplierId === supplierId).map((p) => p.name).filter(Boolean);

  const handleSave = async () => {
    if (!user?.id) return;
    if (!form.identification.trim() || !form.name.trim()) {
      toast.error(t('catalogs.common.required'));
      return;
    }
    // Condiciones "Otro": validar tipo + valor antes de componer el dato uniforme
    let paymentTermsValue: string | null;
    if (form.paymentTerms === PAYMENT_TERMS_OTHER) {
      const value = form.paymentTermsOtherValue.trim();
      if (form.paymentTermsOtherKind && value) {
        const num = Number(value);
        if (!Number.isFinite(num) || num <= 0) {
          toast.error(t('catalogs.suppliers.paymentTermsOtherInvalid'));
          return;
        }
        paymentTermsValue = composeOtherTerms(form.paymentTermsOtherKind, value, form.paymentTermsOtherFrequency);
      } else if (form.paymentTermsOtherKind && !value) {
        toast.error(t('catalogs.suppliers.paymentTermsOtherInvalid'));
        return;
      } else {
        // Sin tipo estructurado: se conserva el valor legacy si existía
        paymentTermsValue = form.paymentTermsOtherLegacy.trim() || null;
      }
    } else {
      paymentTermsValue = form.paymentTerms.trim() || null;
    }
    const phone = composePhone(form.phonePrefix, form.phoneNumber);
    setSaving(true);
    const payload: Record<string, any> = {
      identification: form.identification.trim(),
      name: form.name.trim(),
      contactName: form.contactName.trim() || null,
      email: form.email.trim() || null,
      phone,
      phonePrefix: phone ? form.phonePrefix : null,
      phoneNumber: phone ? form.phoneNumber.replace(/\D/g, '') : null,
      bankAccounts: form.bankAccounts
        .filter((a) => (a.bank || '').trim() || (a.accountType || '').trim() || (a.accountNumber || '').trim())
        .map((a) => ({
          id: a.id,
          bank: (a.bank || '').trim() || null,
          accountType: (a.accountType || '').trim() || null,
          accountNumber: (a.accountNumber || '').trim() || null,
          isPrimary: !!a.isPrimary,
          // swift/iban/extraCode solo aplican a cuentas internacionales
          swift: a.accountType === ACCOUNT_TYPE_INTERNATIONAL ? (a.swift || '').trim() || null : null,
          iban: a.accountType === ACCOUNT_TYPE_INTERNATIONAL ? (a.iban || '').trim() || null : null,
          extraCode: a.accountType === ACCOUNT_TYPE_INTERNATIONAL ? (a.extraCode || '').trim() || null : null,
        })),
      bankData: null, // legacy migrado a bankAccounts
      productCategoryIds: [...form.productCategoryIds],
      costCenterIds: [...form.costCenterIds],
      paymentTerms: paymentTermsValue,
      notes: form.notes.trim() || null,
    };
    try {
      if (editing) {
        await updateDoc(doc(db, 'suppliers', editing.id), { ...payload, ...touchPayload(user.id) });
        await logAction({
          action: 'SUPPLIER_UPDATED' as AuditAction,
          targetType: 'supplier',
          targetId: editing.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Proveedor actualizado: ${payload.name}`,
        });
        toast.success(t('catalogs.common.update'));
      } else {
        const ref = await addDoc(collection(db, 'suppliers'), { ...payload, ...basePayload(user.id) });
        await logAction({
          action: 'SUPPLIER_CREATED' as AuditAction,
          targetType: 'supplier',
          targetId: ref.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Proveedor creado: ${payload.name}`,
        });
        toast.success(t('catalogs.common.create'));
      }
      setShowModal(false);
      setEditing(null);
      setForm(EMPTY_SUPPLIER);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (s: Supplier) => {
    if (!user?.id) return;
    const next = !s.isActive;
    const done = await executeWithConfirm({
      level: 'important',
      title: next ? t('catalogs.common.confirmActivateTitle') : t('catalogs.common.confirmDeactivateTitle'),
      message: fmt(next ? 'catalogs.common.confirmActivate' : 'catalogs.common.confirmDeactivate', { name: s.name }),
      action: async () => {
        await updateDoc(doc(db, 'suppliers', s.id), { isActive: next, ...touchPayload(user.id) });
      },
    });
    if (done !== null) {
      await logAction({
        action: (next ? 'SUPPLIER_ACTIVATED' : 'SUPPLIER_DEACTIVATED') as AuditAction,
        targetType: 'supplier',
        targetId: s.id,
        targetName: s.name,
        impactLevel: 'major',
        description: `Proveedor ${next ? 'activado' : 'desactivado'}: ${s.name}`,
      });
      toast.success(next ? t('catalogs.common.activate') : t('catalogs.common.deactivate'));
    }
  };

  const set = (k: keyof SupplierFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-5">
      <SectionHeader
        title={t('catalogs.suppliers.title')}
        subtitle={fmt('catalogs.suppliers.count', { count: suppliers.length })}
        canWrite={canWrite}
        onNew={openCreate}
        newLabel={t('catalogs.suppliers.new')}
      />
      {suppliers.length === 0 ? (
        <EmptyState icon={<Truck className="w-12 h-12" />} onCreate={openCreate} canWrite={canWrite} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-3">
          {suppliers.map((s) => {
            const accounts = s.bankAccounts || [];
            const suppliedCategories = categoryNamesFor(s.productCategoryIds);
            const frequentCostCenters = costCenterNamesFor(s.costCenterIds);
            const preferredProducts = preferredProductsFor(s.id);
            return (
              <EntityCard
                key={s.id}
                name={s.name}
                lines={[s.identification, [s.contactName, s.phone].filter(Boolean).join(' · '), s.email, accountsLine(s)]}
                icon={<Truck className="w-5 h-5" />}
                isActive={s.isActive}
                canWrite={canWrite}
                onEdit={() => openEdit(s)}
                onToggle={() => handleToggle(s)}
                expanded={expandedIds.has(s.id)}
                onToggleExpand={() => setExpandedIds((prev) => toggleId(prev, s.id))}
                details={
                  <DetailsGrid>
                    <DetailItem label={t('catalogs.suppliers.identification')}>{s.identification}</DetailItem>
                    <DetailItem label={t('catalogs.suppliers.contactName')}>{s.contactName}</DetailItem>
                    <DetailItem label={t('catalogs.suppliers.email')}>{s.email}</DetailItem>
                    <DetailItem label={t('catalogs.suppliers.phone')}>{s.phone}</DetailItem>
                    <DetailItem label={t('catalogs.suppliers.paymentTerms')}>{s.paymentTerms}</DetailItem>
                    <DetailItem label={t('catalogs.common.status')}>
                      {s.isActive ? t('catalogs.common.active') : t('catalogs.common.inactive')}
                    </DetailItem>
                    <div className="sm:col-span-2">
                      <DetailItem label={t('catalogs.suppliers.bankAccounts')}>
                        {accounts.length === 0 ? (
                          t('catalogs.suppliers.noAccounts')
                        ) : (
                          <div className="space-y-1.5">
                            {(accounts as SupplierBankAccountForm[]).map((acc) => (
                              <div key={acc.id}>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>{[acc.bank, accountTypeLabel(acc.accountType), acc.accountNumber].filter(Boolean).join(' · ') || '—'}</span>
                                  {!!acc.isPrimary && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-corporate/10 text-corporate">
                                      <Star className="w-3 h-3 fill-current" />
                                      {t('catalogs.suppliers.primary')}
                                    </span>
                                  )}
                                </div>
                                {acc.accountType === ACCOUNT_TYPE_INTERNATIONAL && (acc.swift || acc.iban || acc.extraCode) && (
                                  <p className="text-[11px] text-[#86868B]">
                                    {[acc.swift && `SWIFT: ${acc.swift}`, acc.iban && `IBAN: ${acc.iban}`, acc.extraCode && `${t('catalogs.suppliers.extraCode')}: ${acc.extraCode}`]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </DetailItem>
                    </div>
                    <div className="sm:col-span-2">
                      <DetailItem label={t('catalogs.suppliers.suppliedCategories')}>
                        {suppliedCategories.length > 0 ? suppliedCategories.join(' · ') : t('catalogs.common.none')}
                      </DetailItem>
                    </div>
                    <div className="sm:col-span-2">
                      <DetailItem label={t('catalogs.suppliers.frequentCostCenters')}>
                        {frequentCostCenters.length > 0 ? frequentCostCenters.join(' · ') : t('catalogs.common.none')}
                      </DetailItem>
                    </div>
                    <div className="sm:col-span-2">
                      <DetailItem label={t('catalogs.suppliers.preferredProducts')}>
                        {preferredProducts.length > 0 ? preferredProducts.join(' · ') : t('catalogs.suppliers.preferredProductsNone')}
                      </DetailItem>
                    </div>
                    {s.notes && (
                      <div className="sm:col-span-2">
                        <DetailItem label={t('catalogs.suppliers.notes')}>{s.notes}</DetailItem>
                      </div>
                    )}
                    <DetailItem label={t('catalogs.common.createdAt')}>{fmtDate(s.createdAt)}</DetailItem>
                    <DetailItem label={t('catalogs.common.updatedAt')}>{fmtDate(s.updatedAt)}</DetailItem>
                  </DetailsGrid>
                }
              />
            );
          })}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('catalogs.suppliers.edit') : t('catalogs.suppliers.new')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('catalogs.suppliers.identification')} *</Label>
                <Input value={form.identification} onChange={set('identification')} />
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.suppliers.name')} *</Label>
                <Input value={form.name} onChange={set('name')} />
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.suppliers.contactName')}</Label>
                <Input value={form.contactName} onChange={set('contactName')} />
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.suppliers.phone')}</Label>
                <PhoneField
                  prefix={form.phonePrefix}
                  number={form.phoneNumber}
                  onPrefixChange={(v) => setForm({ ...form, phonePrefix: v })}
                  onNumberChange={(v) => setForm({ ...form, phoneNumber: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.suppliers.email')}</Label>
                <Input type="email" value={form.email} onChange={set('email')} />
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.suppliers.paymentTerms')}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_TERMS_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, paymentTerms: opt }))}
                      className={cn(
                        'px-2.5 h-8 rounded-lg text-xs font-medium transition-colors border',
                        form.paymentTerms === opt
                          ? 'bg-corporate text-white border-corporate'
                          : 'bg-white border-[#E5E5E7] text-[#86868B] hover:text-[#1D1D1F]'
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, paymentTerms: PAYMENT_TERMS_OTHER }))}
                    className={cn(
                      'px-2.5 h-8 rounded-lg text-xs font-medium transition-colors border',
                      form.paymentTerms === PAYMENT_TERMS_OTHER
                        ? 'bg-corporate text-white border-corporate'
                        : 'bg-white border-[#E5E5E7] text-[#86868B] hover:text-[#1D1D1F]'
                    )}
                  >
                    {t('catalogs.suppliers.paymentTermsOther')}
                  </button>
                </div>
                {form.paymentTerms === PAYMENT_TERMS_OTHER && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(['credit', 'advance'] as const).map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              paymentTermsOtherKind: f.paymentTermsOtherKind === kind ? '' : kind,
                              paymentTermsOtherValue: f.paymentTermsOtherKind === kind ? '' : f.paymentTermsOtherValue,
                            }))
                          }
                          className={cn(
                            'px-2.5 h-8 rounded-lg text-xs font-medium transition-colors border',
                            form.paymentTermsOtherKind === kind
                              ? 'bg-corporate text-white border-corporate'
                              : 'bg-white border-[#E5E5E7] text-[#86868B] hover:text-[#1D1D1F]'
                          )}
                        >
                          {kind === 'credit'
                            ? t('catalogs.suppliers.paymentTermsOtherKindCredit')
                            : t('catalogs.suppliers.paymentTermsOtherKindAdvance')}
                        </button>
                      ))}
                    </div>
                    {form.paymentTermsOtherKind && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={form.paymentTermsOtherValue}
                          onChange={(e) => setForm({ ...form, paymentTermsOtherValue: e.target.value })}
                          placeholder={
                            form.paymentTermsOtherKind === 'credit'
                              ? t('catalogs.suppliers.paymentTermsOtherValueCredit')
                              : t('catalogs.suppliers.paymentTermsOtherValueAdvance')
                          }
                        />
                        <select
                          value={form.paymentTermsOtherFrequency}
                          onChange={(e) => setForm({ ...form, paymentTermsOtherFrequency: e.target.value })}
                          className={cn(SELECT_CLASS, 'sm:w-48 shrink-0')}
                        >
                          <option value="">{t('catalogs.suppliers.paymentTermsOtherFrequency')}</option>
                          {PAYMENT_TERMS_FREQUENCIES.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {form.paymentTermsOtherLegacy && (
                      <p className="text-[11px] text-[#86868B] bg-[#F5F5F7] rounded-lg p-2">
                        {t('catalogs.suppliers.paymentTermsOtherLegacy')}:{' '}
                        <span className="font-medium text-[#1D1D1F]">{form.paymentTermsOtherLegacy}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('catalogs.suppliers.bankAccounts')}</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAccount} className="flex items-center gap-1.5 h-8 text-xs">
                  <Plus className="w-3.5 h-3.5" /> {t('catalogs.suppliers.addAccount')}
                </Button>
              </div>
              {form.bankAccounts.length === 0 ? (
                <p className="text-xs text-[#86868B] bg-[#F5F5F7] rounded-xl p-3">{t('catalogs.suppliers.noAccounts')}</p>
              ) : (
                <div className="space-y-2">
                  {form.bankAccounts.map((acc) => (
                    <div key={acc.id} className="bg-[#F5F5F7] rounded-xl p-3 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <Input placeholder={t('catalogs.suppliers.bank')} value={acc.bank || ''} onChange={(e) => updateAccount(acc.id, { bank: e.target.value })} className="sm:flex-1" />
                        <select
                          value={acc.accountType || ''}
                          onChange={(e) => updateAccount(acc.id, { accountType: e.target.value })}
                          className={cn(SELECT_CLASS, 'sm:flex-1')}
                        >
                          <option value="">{t('catalogs.suppliers.accountTypePlaceholder')}</option>
                          {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{accountTypeLabel(opt)}</option>
                          ))}
                          {/* Compatibilidad: tipo libre de datos viejos se conserva tal cual */}
                          {acc.accountType && !ACCOUNT_TYPE_OPTIONS.includes(acc.accountType) && (
                            <option value={acc.accountType}>{acc.accountType}</option>
                          )}
                        </select>
                        <Input placeholder={t('catalogs.suppliers.accountNumber')} value={acc.accountNumber || ''} onChange={(e) => updateAccount(acc.id, { accountNumber: e.target.value })} className="sm:flex-1" />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPrimaryAccount(acc.id)}
                            title={t('catalogs.suppliers.primary')}
                            className={cn(
                              'flex items-center gap-1 px-2.5 h-9 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                              acc.isPrimary ? 'bg-corporate text-white' : 'bg-white border border-[#E5E5E7] text-[#86868B] hover:text-[#1D1D1F]'
                            )}
                          >
                            <Star className={cn('w-3.5 h-3.5', acc.isPrimary && 'fill-current')} />
                            {t('catalogs.suppliers.primary')}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAccount(acc.id)}
                            title={t('catalogs.suppliers.removeAccount')}
                            className="p-2 rounded-lg hover:bg-white text-[#86868B] hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {/* Cuenta internacional: campos adicionales */}
                      {acc.accountType === ACCOUNT_TYPE_INTERNATIONAL && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input placeholder={t('catalogs.suppliers.swift')} value={acc.swift || ''} onChange={(e) => updateAccount(acc.id, { swift: e.target.value.toUpperCase() })} className="sm:flex-1" />
                          <Input placeholder={t('catalogs.suppliers.iban')} value={acc.iban || ''} onChange={(e) => updateAccount(acc.id, { iban: e.target.value.toUpperCase() })} className="sm:flex-1" />
                          <Input placeholder={t('catalogs.suppliers.extraCode')} value={acc.extraCode || ''} onChange={(e) => updateAccount(acc.id, { extraCode: e.target.value })} className="sm:flex-1" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('catalogs.suppliers.suppliedCategories')}</Label>
              <div className="flex flex-wrap gap-1.5 bg-[#F5F5F7] rounded-xl p-3">
                {activeCategories.length === 0 && (
                  <p className="text-xs text-[#86868B]">{t('catalogs.suppliers.noCategories')}</p>
                )}
                {activeCategories.map((c) => {
                  const selected = form.productCategoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setForm({ ...form, productCategoryIds: toggleInList(form.productCategoryIds, c.id) })}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                        selected ? 'bg-corporate text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                      )}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('catalogs.suppliers.frequentCostCenters')}</Label>
              <div className="flex flex-wrap gap-1.5 bg-[#F5F5F7] rounded-xl p-3">
                {activeCostCenters.length === 0 && (
                  <p className="text-xs text-[#86868B]">{t('catalogs.suppliers.noCostCenters')}</p>
                )}
                {activeCostCenters.map((c) => {
                  const selected = form.costCenterIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setForm({ ...form, costCenterIds: toggleInList(form.costCenterIds, c.id) })}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                        selected ? 'bg-corporate text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                      )}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('catalogs.suppliers.notes')}</Label>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={2}
                className="w-full rounded-lg border border-[#E5E5E7] bg-white px-3 py-2 text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-corporate/20"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-corporate hover:bg-corporate/90">
                {editing ? t('catalogs.common.update') : t('catalogs.common.create')}
              </Button>
              <Button variant="outline" onClick={() => setShowModal(false)} className="w-full sm:w-auto">
                {t('catalogs.common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN: PRODUCTOS
// ═══════════════════════════════════════════════════════════════════

// Rango de precio escalonado en edición (strings hasta guardar)
interface PriceTierDraft {
  minQty: string;
  maxQty: string; // vacío = sin tope
  pricePerDay: string;
}

interface ProductFormState {
  name: string;
  nameEn: string;
  categoryId: string;
  unitId: string;
  sku: string;
  isRentable: boolean;
  isConsumable: boolean;
  preferredSupplierId: string;
  rentalPrice: string;
  depositPercent: string;
  priceTiers: PriceTierDraft[];
  admitsDiscount: boolean;
  hasQr: boolean;
}

const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: '', nameEn: '', categoryId: '', unitId: '', sku: '', isRentable: false,
  isConsumable: true, preferredSupplierId: '', rentalPrice: '', depositPercent: '', priceTiers: [],
  admitsDiscount: true, hasQr: true,
};

function tiersToDrafts(tiers: PriceTier[] | null | undefined): PriceTierDraft[] {
  return (tiers ?? []).map(t => ({
    minQty: String(t.minQty),
    maxQty: t.maxQty != null ? String(t.maxQty) : '',
    pricePerDay: String(t.pricePerDay),
  }));
}

// Valida y convierte los rangos editados; null si alguno es inválido
function draftsToTiers(drafts: PriceTierDraft[]): PriceTier[] | null {
  const tiers: PriceTier[] = [];
  for (const d of drafts) {
    if (!d.minQty.trim() && !d.maxQty.trim() && !d.pricePerDay.trim()) continue; // fila vacía
    const minQty = Number(d.minQty);
    const maxQty = d.maxQty.trim() === '' ? null : Number(d.maxQty);
    const pricePerDay = Number(d.pricePerDay);
    if (!Number.isInteger(minQty) || minQty < 1) return null;
    if (maxQty != null && (!Number.isInteger(maxQty) || maxQty < minQty)) return null;
    if (!Number.isFinite(pricePerDay) || pricePerDay <= 0) return null;
    tiers.push({ minQty, maxQty, pricePerDay });
  }
  return tiers.sort((a, b) => a.minQty - b.minQty);
}

// Shape mínimo de los docs que referencian productos (para saber si uno "se
// usó" y bloquear su eliminación): movimientos de inventario, seriales
// (rentalUnits) e ítems de órdenes de renta (rentalOrders items[].productId).
interface ProductUsageDoc extends CatalogBase {
  name?: string;
  productId?: string;
  items?: Array<{ productId?: string }>;
}

function ProductsSection({ canWrite }: { canWrite: boolean }) {
  const { user } = useAuth();
  const { logAction } = useAudit();
  const { items: products } = useCatalog<Product>('products');
  const { items: categories } = useCatalog<ProductCategory>('productCategories');
  const { items: units } = useCatalog<UnitOfMeasure>('unitsOfMeasure');
  const { items: suppliers } = useCatalog<Supplier>('suppliers');
  // Referencias de uso del producto: si existe alguna, no se puede eliminar
  const { items: inventoryMovements } = useCatalog<ProductUsageDoc>('inventoryMovements');
  const { items: rentalUnits } = useCatalog<ProductUsageDoc>('rentalUnits');
  const { items: rentalOrders } = useCatalog<ProductUsageDoc>('rentalOrders');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const { uploadImage, uploading } = useStorageUpload();
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Vista escalable: búsqueda, filtro, ordenamiento y agrupación (todo en memoria)
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'nameAsc' | 'nameDesc' | 'sku'>('nameAsc');
  const [groupByCategory, setGroupByCategory] = useState(true);

  const activeCategories = useMemo(() => categories.filter((c) => c.isActive), [categories]);
  const activeUnits = useMemo(() => units.filter((u) => u.isActive), [units]);
  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.isActive), [suppliers]);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || '';
  const unitName = (id: string) => units.find((u) => u.id === id)?.name || '';
  const supplierName = (id?: string) => (id ? suppliers.find((s) => s.id === id)?.name || '' : '');

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      if (q && !(p.name || '').toLowerCase().includes(q) && !(p.sku || '').toLowerCase().includes(q)) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sortBy === 'sku') return (a.sku || '').localeCompare(b.sku || '') || (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'nameDesc') return (b.name || '').localeCompare(a.name || '');
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [products, search, categoryFilter, sortBy]);

  const groupedProducts = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of visibleProducts) {
      const key = p.categoryId || '';
      const bucket = map.get(key);
      if (bucket) bucket.push(p);
      else map.set(key, [p]);
    }
    const labelFor = (id: string) => categoryName(id) || t('catalogs.products.noCategory');
    return [...map.entries()].sort((a, b) => labelFor(a[0]).localeCompare(labelFor(b[0])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleProducts, categories]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_PRODUCT_FORM);
    setPhotoUrl('');
    setPhotoFile(null);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name || '',
      nameEn: p.nameEn || '',
      categoryId: p.categoryId || '',
      unitId: p.unitId || '',
      sku: p.sku || '',
      isRentable: !!p.isRentable,
      isConsumable: !!p.isConsumable,
      preferredSupplierId: p.preferredSupplierId || '',
      rentalPrice: p.rentalPricePerDay != null ? String(p.rentalPricePerDay) : '',
      depositPercent: p.depositPercent != null ? String(p.depositPercent) : '',
      priceTiers: tiersToDrafts(p.priceTiers),
      admitsDiscount: p.admitsDiscount !== false,
      hasQr: p.hasQr !== false,
    });
    setPhotoUrl(p.photoUrl || '');
    setPhotoFile(null);
    setShowModal(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!form.name.trim() || !form.categoryId || !form.unitId) {
      toast.error(t('catalogs.common.required'));
      return;
    }
    // Rangos de precio solo para productos rentables; filas vacías se ignoran
    const tiers = form.isRentable ? draftsToTiers(form.priceTiers) : [];
    if (form.isRentable && tiers === null) {
      toast.error(t('catalogs.products.tierInvalid'));
      return;
    }
    setSaving(true);
    try {
      let finalPhotoUrl = editing?.photoUrl || '';
      if (photoFile) {
        finalPhotoUrl = await uploadImage(photoFile, 'products');
      }
      const payload: Record<string, any> = {
        name: form.name.trim(),
        nameEn: form.nameEn.trim() || null,
        categoryId: form.categoryId,
        unitId: form.unitId,
        sku: form.sku.trim() || null,
        isRentable: form.isRentable,
        isConsumable: form.isConsumable,
        preferredSupplierId: form.preferredSupplierId || null,
        rentalPricePerDay: form.rentalPrice.trim() === '' ? null : Number(form.rentalPrice),
        depositPercent: form.depositPercent.trim() === '' ? null : Number(form.depositPercent),
        priceTiers: form.isRentable && tiers && tiers.length > 0 ? tiers : null,
        // Solo aplica a rentables; los demás siempre admiten descuento
        admitsDiscount: form.isRentable ? form.admitsDiscount : true,
        // Default true (se guarda explícito); ausente en docs viejos = true
        hasQr: form.hasQr,
        photoUrl: finalPhotoUrl || null,
      };
      if (editing) {
        await updateDoc(doc(db, 'products', editing.id), { ...payload, ...touchPayload(user.id) });
        await logAction({
          action: 'PRODUCT_UPDATED' as AuditAction,
          targetType: 'product',
          targetId: editing.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Producto actualizado: ${payload.name}`,
        });
        toast.success(t('catalogs.common.update'));
      } else {
        const ref = await addDoc(collection(db, 'products'), { ...payload, ...basePayload(user.id) });
        await logAction({
          action: 'PRODUCT_CREATED' as AuditAction,
          targetType: 'product',
          targetId: ref.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Producto creado: ${payload.name}`,
        });
        toast.success(t('catalogs.common.create'));
      }
      setShowModal(false);
      setEditing(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p: Product) => {
    if (!user?.id) return;
    const next = !p.isActive;
    const done = await executeWithConfirm({
      level: 'important',
      title: next ? t('catalogs.common.confirmActivateTitle') : t('catalogs.common.confirmDeactivateTitle'),
      message: fmt(next ? 'catalogs.common.confirmActivate' : 'catalogs.common.confirmDeactivate', { name: p.name }),
      action: async () => {
        await updateDoc(doc(db, 'products', p.id), { isActive: next, ...touchPayload(user.id) });
      },
    });
    if (done !== null) {
      await logAction({
        action: (next ? 'PRODUCT_ACTIVATED' : 'PRODUCT_DEACTIVATED') as AuditAction,
        targetType: 'product',
        targetId: p.id,
        targetName: p.name,
        impactLevel: 'major',
        description: `Producto ${next ? 'activado' : 'desactivado'}: ${p.name}`,
      });
      toast.success(next ? t('catalogs.common.activate') : t('catalogs.common.deactivate'));
    }
  };

  // Un producto "se usó" si tiene movimientos de inventario, seriales
  // (rentalUnits) o ítems en órdenes de renta: en ese caso no es eliminable.
  const productHasUsage = (id: string) =>
    inventoryMovements.some((m) => m.productId === id) ||
    rentalUnits.some((u) => u.productId === id) ||
    rentalOrders.some((o) => (o.items ?? []).some((it) => it.productId === id));

  const handleDelete = async (p: Product) => {
    if (!user?.id) return;
    const done = await executeWithConfirm({
      level: 'critical',
      title: t('catalogs.products.deleteTitle'),
      message: fmt('catalogs.products.deleteConfirm', { name: p.name }),
      action: async () => {
        await deleteDoc(doc(db, 'products', p.id));
      },
    });
    if (done !== null) {
      await logAction({
        action: 'PRODUCT_DELETED' as AuditAction,
        targetType: 'product',
        targetId: p.id,
        targetName: p.name,
        impactLevel: 'critical',
        description: `Producto eliminado: ${p.name}`,
      });
      toast.success(t('catalogs.products.delete'));
    }
  };

  const renderProductCard = (p: Product) => (
    <div
      key={p.id}
      className={cn(
        'bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-opacity',
        !p.isActive && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Encabezado clickeable: expande/colapsa el detalle */}
        <div
          onClick={() => setExpandedIds((prev) => toggleId(prev, p.id))}
          className="min-w-0 flex-1 flex items-start gap-4 cursor-pointer select-none"
        >
          {p.photoUrl ? (
            <img src={p.photoUrl} alt={p.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-[#F5F5F7] flex items-center justify-center shrink-0 text-[#86868B]">
              <Package className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-[#1D1D1F] truncate">{p.name}</h3>
              <span
                className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0',
                  p.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-[#F5F5F7] text-[#86868B]'
                )}
              >
                {p.isActive ? t('catalogs.common.active') : t('catalogs.common.inactive')}
              </span>
            </div>
            <div className="mt-1 space-y-0.5">
              <p className="text-xs text-[#86868B] truncate">{[categoryName(p.categoryId), unitName(p.unitId)].filter(Boolean).join(' · ')}</p>
              {p.sku && <p className="text-xs text-[#86868B] truncate">SKU: {p.sku}</p>}
              {p.preferredSupplierId && supplierName(p.preferredSupplierId) && (
                <p className="text-xs text-[#86868B] truncate">
                  {t('catalogs.products.preferredSupplier')}: {supplierName(p.preferredSupplierId)}
                </p>
              )}
              <div className="flex gap-1.5 pt-1">
                {p.isRentable && (
                  <span className="text-[10px] bg-corporate/10 text-corporate px-2 py-0.5 rounded-full">{t('catalogs.products.rentableBadge')}</span>
                )}
                {p.isRentable && p.hasQr === false && (
                  <span className="text-[10px] bg-[#F5F5F7] text-[#86868B] px-2 py-0.5 rounded-full">{t('catalogs.products.hasQr')}: {t('catalogs.products.no')}</span>
                )}
                {p.isConsumable && (
                  <span className="text-[10px] bg-[#F5F5F7] text-[#86868B] px-2 py-0.5 rounded-full">{t('catalogs.products.isConsumable')}</span>
                )}
              </div>
            </div>
          </div>
          <span className="shrink-0 text-[#86868B] mt-0.5">
            {expandedIds.has(p.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </div>
      {/* Detalle completo del producto */}
      {expandedIds.has(p.id) && (
        <div className="mt-4 pt-4 border-t border-[#F5F5F7]">
          {p.photoUrl && (
            <a href={p.photoUrl} target="_blank" rel="noreferrer" title={t('catalogs.common.openImage')}>
              <img
                src={p.photoUrl}
                alt={p.name}
                className="h-32 w-32 rounded-xl object-cover mb-3 hover:opacity-90 transition-opacity"
              />
            </a>
          )}
          <DetailsGrid>
            <DetailItem label={t('catalogs.products.category')}>{categoryName(p.categoryId)}</DetailItem>
            <DetailItem label={t('catalogs.products.unit')}>{unitName(p.unitId)}</DetailItem>
            <DetailItem label={t('catalogs.products.sku')}>{p.sku}</DetailItem>
            <DetailItem label={t('catalogs.products.preferredSupplier')}>{supplierName(p.preferredSupplierId)}</DetailItem>
            <DetailItem label={t('catalogs.products.isRentable')}>{p.isRentable ? t('catalogs.products.yes') : t('catalogs.products.no')}</DetailItem>
            <DetailItem label={t('catalogs.products.isConsumable')}>{p.isConsumable ? t('catalogs.products.yes') : t('catalogs.products.no')}</DetailItem>
            <DetailItem label={t('catalogs.products.hasQr')}>
              {p.hasQr !== false ? t('catalogs.common.yes') : t('catalogs.common.no')}
            </DetailItem>
            {p.isRentable && p.rentalPricePerDay != null && (
              <DetailItem label={t('catalogs.products.rentalPrice')}>{p.rentalPricePerDay}</DetailItem>
            )}
            {p.isRentable && p.depositPercent != null && (
              <DetailItem label={t('catalogs.products.depositPercent')}>{p.depositPercent}%</DetailItem>
            )}
            {p.isRentable && (
              <DetailItem label={t('catalogs.products.admitsDiscount')}>
                {p.admitsDiscount !== false ? t('catalogs.common.yes') : t('catalogs.common.no')}
              </DetailItem>
            )}
            {p.isRentable && (p.priceTiers ?? []).length > 0 && (
              <DetailItem label={t('catalogs.products.priceTiers')}>
                <div className="space-y-0.5">
                  {(p.priceTiers ?? []).map((tier, i) => (
                    <p key={i} className="text-xs">
                      {tier.maxQty != null
                        ? fmt('catalogs.products.tierRange', { min: tier.minQty, max: tier.maxQty, price: tier.pricePerDay })
                        : fmt('catalogs.products.tierRangeOpen', { min: tier.minQty, price: tier.pricePerDay })}
                    </p>
                  ))}
                </div>
              </DetailItem>
            )}
            <DetailItem label={t('catalogs.common.status')}>
              {p.isActive ? t('catalogs.common.active') : t('catalogs.common.inactive')}
            </DetailItem>
            {p.nameEn && <DetailItem label={t('catalogs.products.nameEn')}>{p.nameEn}</DetailItem>}
            <DetailItem label={t('catalogs.common.createdAt')}>{fmtDate(p.createdAt)}</DetailItem>
            <DetailItem label={t('catalogs.common.updatedAt')}>{fmtDate(p.updatedAt)}</DetailItem>
          </DetailsGrid>
          {/* Acciones dentro del detalle expandido: el encabezado queda limpio
              para que se lea el nombre. Eliminar solo si el producto nunca se usó. */}
          {canWrite && (
            <div className="mt-4 pt-3 border-t border-[#F5F5F7] flex items-center justify-end gap-0.5">
              <button
                onClick={() => openEdit(p)}
                title={t('catalogs.common.edit')}
                className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleToggle(p)}
                title={p.isActive ? t('catalogs.common.deactivate') : t('catalogs.common.activate')}
                className={cn('p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]', !p.isActive && 'hover:text-emerald-600')}
              >
                {p.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {(() => {
                const hasUsage = productHasUsage(p.id);
                return (
                  <button
                    onClick={() => !hasUsage && handleDelete(p)}
                    disabled={hasUsage}
                    title={hasUsage ? t('catalogs.products.deleteBlocked') : t('catalogs.products.delete')}
                    className={cn(
                      'p-1.5 rounded-lg text-[#86868B]',
                      hasUsage ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#F5F5F7] hover:text-red-500'
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <SectionHeader
        title={t('catalogs.products.title')}
        subtitle={fmt('catalogs.products.count', { count: products.length })}
        canWrite={canWrite}
        onNew={openCreate}
        newLabel={t('catalogs.products.new')}
      />
      {products.length === 0 ? (
        <EmptyState icon={<Package className="w-12 h-12" />} onCreate={openCreate} canWrite={canWrite} />
      ) : (
        <>
          {/* Buscador, filtros y ordenamiento (en memoria) */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B] pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('catalogs.products.searchPlaceholder')}
                className="pl-9"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={cn(SELECT_CLASS, 'lg:w-48')}>
                <option value="">{t('catalogs.products.allCategories')}</option>
                {activeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-[#86868B] shrink-0" />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'nameAsc' | 'nameDesc' | 'sku')} className={cn(SELECT_CLASS, 'lg:w-36')}>
                  <option value="nameAsc">{t('catalogs.products.sortNameAsc')}</option>
                  <option value="nameDesc">{t('catalogs.products.sortNameDesc')}</option>
                  <option value="sku">{t('catalogs.products.sortSku')}</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => setGroupByCategory((v) => !v)}
                className={cn(
                  'flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                  groupByCategory ? 'bg-corporate text-white' : 'bg-white border border-[#E5E5E7] text-[#86868B] hover:text-[#1D1D1F]'
                )}
              >
                <Layers className="w-4 h-4" />
                {t('catalogs.products.groupByCategory')}
              </button>
            </div>
          </div>

          {visibleProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-sm text-[#86868B] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              {t('catalogs.products.noResults')}
            </div>
          ) : groupByCategory ? (
            <div className="space-y-6">
              {groupedProducts.map(([catId, items]) => (
                <div key={catId || 'none'} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <h3 className="text-sm font-semibold text-[#1D1D1F]">
                      {categoryName(catId) || t('catalogs.products.noCategory')}
                    </h3>
                    <span className="text-xs text-[#86868B]">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-3">
                    {items.map(renderProductCard)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-3">
              {visibleProducts.map(renderProductCard)}
            </div>
          )}
        </>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('catalogs.products.edit') : t('catalogs.products.new')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#86868B]">
                  <Package className="w-6 h-6" />
                </div>
              )}
              <div>
                <Label>{t('catalogs.products.photo')}</Label>
                <label className="mt-1 inline-flex items-center gap-2 cursor-pointer text-sm text-corporate hover:underline">
                  <Upload className="w-4 h-4" />
                  {uploading ? '...' : t('catalogs.products.uploadPhoto')}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploading} />
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('catalogs.products.name')} *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.products.nameEn')}</Label>
                <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.products.category')} *</Label>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={SELECT_CLASS}>
                  <option value="">{t('catalogs.products.selectCategory')}</option>
                  {activeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.products.unit')} *</Label>
                <select value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} className={SELECT_CLASS}>
                  <option value="">{t('catalogs.products.selectUnit')}</option>
                  {activeUnits.map((u) => <option key={u.id} value={u.id}>{u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.products.sku')}</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.products.preferredSupplier')}</Label>
                <select
                  value={form.preferredSupplierId}
                  onChange={(e) => setForm({ ...form, preferredSupplierId: e.target.value })}
                  className={SELECT_CLASS}
                >
                  <option value="">{t('catalogs.products.selectSupplier')}</option>
                  {activeSuppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('catalogs.products.isRentable')}</Label>
                  <select
                    value={form.isRentable ? 'yes' : 'no'}
                    onChange={(e) => setForm({ ...form, isRentable: e.target.value === 'yes' })}
                    className={SELECT_CLASS}
                  >
                    <option value="yes">{t('catalogs.products.yes')}</option>
                    <option value="no">{t('catalogs.products.no')}</option>
                  </select>
                  <p className="text-[11px] text-[#86868B] leading-relaxed">{t('catalogs.products.isRentableHelp')}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t('catalogs.products.isConsumable')}</Label>
                  <select
                    value={form.isConsumable ? 'yes' : 'no'}
                    onChange={(e) => setForm({ ...form, isConsumable: e.target.value === 'yes' })}
                    className={SELECT_CLASS}
                  >
                    <option value="yes">{t('catalogs.products.yes')}</option>
                    <option value="no">{t('catalogs.products.no')}</option>
                  </select>
                  <p className="text-[11px] text-[#86868B] leading-relaxed">{t('catalogs.products.isConsumableHelp')}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t('catalogs.products.hasQr')}</Label>
                  <select
                    value={form.hasQr ? 'yes' : 'no'}
                    onChange={(e) => setForm({ ...form, hasQr: e.target.value === 'yes' })}
                    className={SELECT_CLASS}
                  >
                    <option value="yes">{t('catalogs.products.yes')}</option>
                    <option value="no">{t('catalogs.products.no')}</option>
                  </select>
                  <p className="text-[11px] text-[#86868B] leading-relaxed">{t('catalogs.products.hasQrHelp')}</p>
                </div>
                {form.isRentable && (
                  <>
                    <div className="space-y-2">
                      <Label>{t('catalogs.products.rentalPrice')}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.rentalPrice}
                        onChange={(e) => setForm({ ...form, rentalPrice: e.target.value })}
                      />
                      <p className="text-[11px] text-[#86868B]">{t('catalogs.products.rentalPriceHelp')}</p>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('catalogs.products.depositPercent')}</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.depositPercent}
                        onChange={(e) => setForm({ ...form, depositPercent: e.target.value })}
                      />
                      <p className="text-[11px] text-[#86868B]">{t('catalogs.products.depositPercentHelp')}</p>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('catalogs.products.admitsDiscount')}</Label>
                      <select
                        value={form.admitsDiscount ? 'yes' : 'no'}
                        onChange={(e) => setForm({ ...form, admitsDiscount: e.target.value === 'yes' })}
                        className={SELECT_CLASS}
                      >
                        <option value="yes">{t('catalogs.products.yes')}</option>
                        <option value="no">{t('catalogs.products.no')}</option>
                      </select>
                      <p className="text-[11px] text-[#86868B] leading-relaxed">{t('catalogs.products.admitsDiscountHelp')}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Precios escalonados por cantidad (solo productos rentables) */}
              {form.isRentable && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t('catalogs.products.priceTiers')}</Label>
                  <p className="text-[11px] text-[#86868B] leading-relaxed">{t('catalogs.products.priceTiersHelp')}</p>
                  <div className="space-y-2">
                    {form.priceTiers.map((tier, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={tier.minQty}
                          placeholder={t('catalogs.products.tierMin')}
                          onChange={(e) => setForm({
                            ...form,
                            priceTiers: form.priceTiers.map((x, j) => (j === i ? { ...x, minQty: e.target.value } : x)),
                          })}
                          className="col-span-3"
                        />
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={tier.maxQty}
                          placeholder={t('catalogs.products.tierMax')}
                          onChange={(e) => setForm({
                            ...form,
                            priceTiers: form.priceTiers.map((x, j) => (j === i ? { ...x, maxQty: e.target.value } : x)),
                          })}
                          className="col-span-3"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.pricePerDay}
                          placeholder={t('catalogs.products.tierPrice')}
                          onChange={(e) => setForm({
                            ...form,
                            priceTiers: form.priceTiers.map((x, j) => (j === i ? { ...x, pricePerDay: e.target.value } : x)),
                          })}
                          className="col-span-4"
                        />
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, priceTiers: form.priceTiers.filter((_, j) => j !== i) })}
                          title={t('catalogs.suppliers.removeAccount')}
                          className="col-span-2 flex items-center justify-center h-9 rounded-lg text-[#86868B] hover:text-red-600 hover:bg-[#F5F5F7] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm({ ...form, priceTiers: [...form.priceTiers, { minQty: '', maxQty: '', pricePerDay: '' }] })}
                    className="gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t('catalogs.products.addTier')}
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving || uploading} className="flex-1 bg-corporate hover:bg-corporate/90">
                {editing ? t('catalogs.common.update') : t('catalogs.common.create')}
              </Button>
              <Button variant="outline" onClick={() => setShowModal(false)} className="w-full sm:w-auto">
                {t('catalogs.common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN: CATEGORÍAS Y UNIDADES
// ═══════════════════════════════════════════════════════════════════

function CategoriesSection({ canWrite }: { canWrite: boolean }) {
  const { user } = useAuth();
  const { logAction } = useAudit();
  const { items: categories } = useCatalog<ProductCategory>('productCategories');
  const { items: units } = useCatalog<UnitOfMeasure>('unitsOfMeasure');

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', nameEn: '' });

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitOfMeasure | null>(null);
  const [unitForm, setUnitForm] = useState({ name: '', abbreviation: '' });
  const [seeding, setSeeding] = useState(false);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set());
  const [expandedUnitIds, setExpandedUnitIds] = useState<Set<string>>(new Set());

  const openCreateCategory = () => { setEditingCategory(null); setCategoryForm({ name: '', nameEn: '' }); setShowCategoryModal(true); };
  const openEditCategory = (c: ProductCategory) => {
    setEditingCategory(c);
    setCategoryForm({ name: c.name || '', nameEn: c.nameEn || '' });
    setShowCategoryModal(true);
  };

  const openCreateUnit = () => { setEditingUnit(null); setUnitForm({ name: '', abbreviation: '' }); setShowUnitModal(true); };
  const openEditUnit = (u: UnitOfMeasure) => {
    setEditingUnit(u);
    setUnitForm({ name: u.name || '', abbreviation: u.abbreviation || '' });
    setShowUnitModal(true);
  };

  const handleSaveCategory = async () => {
    if (!user?.id) return;
    if (!categoryForm.name.trim()) { toast.error(t('catalogs.common.required')); return; }
    const payload = { name: categoryForm.name.trim(), nameEn: categoryForm.nameEn.trim() || null };
    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'productCategories', editingCategory.id), { ...payload, ...touchPayload(user.id) });
        await logAction({
          action: 'PRODUCT_CATEGORY_UPDATED' as AuditAction,
          targetType: 'product_category',
          targetId: editingCategory.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Categoría de producto actualizada: ${payload.name}`,
        });
        toast.success(t('catalogs.common.update'));
      } else {
        const ref = await addDoc(collection(db, 'productCategories'), { ...payload, ...basePayload(user.id) });
        await logAction({
          action: 'PRODUCT_CATEGORY_CREATED' as AuditAction,
          targetType: 'product_category',
          targetId: ref.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Categoría de producto creada: ${payload.name}`,
        });
        toast.success(t('catalogs.common.create'));
      }
      setShowCategoryModal(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveUnit = async () => {
    if (!user?.id) return;
    if (!unitForm.name.trim()) { toast.error(t('catalogs.common.required')); return; }
    const payload = { name: unitForm.name.trim(), abbreviation: unitForm.abbreviation.trim() || null };
    try {
      if (editingUnit) {
        await updateDoc(doc(db, 'unitsOfMeasure', editingUnit.id), { ...payload, ...touchPayload(user.id) });
        await logAction({
          action: 'UNIT_OF_MEASURE_UPDATED' as AuditAction,
          targetType: 'unit_of_measure',
          targetId: editingUnit.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Unidad de medida actualizada: ${payload.name}`,
        });
        toast.success(t('catalogs.common.update'));
      } else {
        const ref = await addDoc(collection(db, 'unitsOfMeasure'), { ...payload, ...basePayload(user.id) });
        await logAction({
          action: 'UNIT_OF_MEASURE_CREATED' as AuditAction,
          targetType: 'unit_of_measure',
          targetId: ref.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Unidad de medida creada: ${payload.name}`,
        });
        toast.success(t('catalogs.common.create'));
      }
      setShowUnitModal(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const makeToggle = (
    collectionName: string,
    item: CatalogBase,
    targetType: string,
    label: string
  ) => async () => {
    if (!user?.id) return;
    const next = !item.isActive;
    const done = await executeWithConfirm({
      level: 'major',
      title: next ? t('catalogs.common.confirmActivateTitle') : t('catalogs.common.confirmDeactivateTitle'),
      message: fmt(next ? 'catalogs.common.confirmActivate' : 'catalogs.common.confirmDeactivate', { name: label }),
      action: async () => {
        await updateDoc(doc(db, collectionName, item.id), { isActive: next, ...touchPayload(user.id) });
      },
    });
    if (done !== null) {
      await logAction({
        action: (next ? `${targetType.toUpperCase()}_ACTIVATED` : `${targetType.toUpperCase()}_DEACTIVATED`) as AuditAction,
        targetType,
        targetId: item.id,
        targetName: label,
        impactLevel: 'major',
        description: `${targetType} ${next ? 'activado' : 'desactivado'}: ${label}`,
      });
      toast.success(next ? t('catalogs.common.activate') : t('catalogs.common.deactivate'));
    }
  };

  // Semillas de unidades (idempotente: IDs deterministas con setDoc)
  const UNIT_SEEDS = [
    { id: 'unit_unidad', name: 'Unidad', abbreviation: 'und' },
    { id: 'unit_galon', name: 'Galón', abbreviation: 'gal' },
    { id: 'unit_litro', name: 'Litro', abbreviation: 'L' },
    { id: 'unit_caja', name: 'Caja', abbreviation: 'caja' },
  ];

  const handleSeedUnits = async () => {
    if (!user?.id) return;
    setSeeding(true);
    let created = 0;
    let existing = 0;
    try {
      for (const seed of UNIT_SEEDS) {
        const already = units.some((u) => u.id === seed.id);
        await setDoc(doc(db, 'unitsOfMeasure', seed.id), {
          name: seed.name,
          abbreviation: seed.abbreviation,
          ...(already ? { ...touchPayload(user.id) } : { ...basePayload(user.id) }),
        }, { merge: true });
        if (already) existing += 1; else created += 1;
      }
      await logAction({
        action: 'UNIT_OF_MEASURE_SEEDED' as AuditAction,
        targetType: 'unit_of_measure',
        targetId: 'seeds',
        targetName: 'Unidades iniciales',
        impactLevel: 'major',
        description: `Semillas de unidades cargadas: ${created} nuevas, ${existing} existentes`,
      });
      toast.success(fmt('catalogs.common.loadInitialDone', { created, existing }));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Categorías */}
        <div className="space-y-3">
          <SectionHeader
            title={t('catalogs.categories.categories')}
            subtitle={fmt('catalogs.categories.categoryCount', { count: categories.length })}
            canWrite={canWrite}
            onNew={openCreateCategory}
            newLabel={t('catalogs.categories.newCategory')}
          />
          {categories.length === 0 ? (
            <EmptyState icon={<Tags className="w-12 h-12" />} onCreate={openCreateCategory} canWrite={canWrite} />
          ) : (
            <div className="space-y-3">
              {categories.map((c) => (
                <EntityCard
                  key={c.id}
                  name={c.name}
                  lines={[c.nameEn]}
                  icon={<Tags className="w-5 h-5" />}
                  isActive={c.isActive}
                  canWrite={canWrite}
                  onEdit={() => openEditCategory(c)}
                  onToggle={makeToggle('productCategories', c, 'product_category', c.name)}
                  expanded={expandedCategoryIds.has(c.id)}
                  onToggleExpand={() => setExpandedCategoryIds((prev) => toggleId(prev, c.id))}
                  details={
                    <DetailsGrid>
                      <DetailItem label={t('catalogs.categories.nameEn')}>{c.nameEn}</DetailItem>
                      <DetailItem label={t('catalogs.common.status')}>
                        {c.isActive ? t('catalogs.common.active') : t('catalogs.common.inactive')}
                      </DetailItem>
                      <DetailItem label={t('catalogs.common.createdAt')}>{fmtDate(c.createdAt)}</DetailItem>
                      <DetailItem label={t('catalogs.common.updatedAt')}>{fmtDate(c.updatedAt)}</DetailItem>
                    </DetailsGrid>
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Unidades */}
        <div className="space-y-3">
          <SectionHeader
            title={t('catalogs.categories.units')}
            subtitle={fmt('catalogs.categories.unitCount', { count: units.length })}
            canWrite={canWrite}
            onNew={openCreateUnit}
            newLabel={t('catalogs.categories.newUnit')}
            extra={canWrite ? (
              <Button
                variant="outline"
                onClick={handleSeedUnits}
                disabled={seeding}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" /> {t('catalogs.common.loadInitial')}
              </Button>
            ) : undefined}
          />
          {units.length === 0 ? (
            <EmptyState icon={<Scale className="w-12 h-12" />} onCreate={openCreateUnit} canWrite={canWrite} />
          ) : (
            <div className="space-y-3">
              {units.map((u) => (
                <EntityCard
                  key={u.id}
                  name={u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name}
                  lines={[]}
                  icon={<Scale className="w-5 h-5" />}
                  isActive={u.isActive}
                  canWrite={canWrite}
                  onEdit={() => openEditUnit(u)}
                  onToggle={makeToggle('unitsOfMeasure', u, 'unit_of_measure', u.name)}
                  expanded={expandedUnitIds.has(u.id)}
                  onToggleExpand={() => setExpandedUnitIds((prev) => toggleId(prev, u.id))}
                  details={
                    <DetailsGrid>
                      <DetailItem label={t('catalogs.categories.abbreviation')}>{u.abbreviation}</DetailItem>
                      <DetailItem label={t('catalogs.common.status')}>
                        {u.isActive ? t('catalogs.common.active') : t('catalogs.common.inactive')}
                      </DetailItem>
                      <DetailItem label={t('catalogs.common.createdAt')}>{fmtDate(u.createdAt)}</DetailItem>
                      <DetailItem label={t('catalogs.common.updatedAt')}>{fmtDate(u.updatedAt)}</DetailItem>
                    </DetailsGrid>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal categoría */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? t('catalogs.categories.editCategory') : t('catalogs.categories.newCategory')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('catalogs.categories.name')} *</Label>
              <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('catalogs.categories.nameEn')}</Label>
              <Input value={categoryForm.nameEn} onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })} />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleSaveCategory} className="flex-1 bg-corporate hover:bg-corporate/90">
                {editingCategory ? t('catalogs.common.update') : t('catalogs.common.create')}
              </Button>
              <Button variant="outline" onClick={() => setShowCategoryModal(false)} className="w-full sm:w-auto">
                {t('catalogs.common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal unidad */}
      <Dialog open={showUnitModal} onOpenChange={setShowUnitModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUnit ? t('catalogs.categories.editUnit') : t('catalogs.categories.newUnit')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('catalogs.categories.name')} *</Label>
              <Input value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('catalogs.categories.abbreviation')}</Label>
              <Input value={unitForm.abbreviation} onChange={(e) => setUnitForm({ ...unitForm, abbreviation: e.target.value })} />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleSaveUnit} className="flex-1 bg-corporate hover:bg-corporate/90">
                {editingUnit ? t('catalogs.common.update') : t('catalogs.common.create')}
              </Button>
              <Button variant="outline" onClick={() => setShowUnitModal(false)} className="w-full sm:w-auto">
                {t('catalogs.common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN: CENTROS DE COSTO
// ═══════════════════════════════════════════════════════════════════

function CostCentersSection({ canWrite }: { canWrite: boolean }) {
  const { user } = useAuth();
  const { logAction } = useAudit();
  const { items: costCenters } = useCatalog<CostCenter>('costCenters');
  const { departments } = useDynamicDepartments();
  const activeDepartments = useMemo(() => departments.filter((d) => d.isActive), [departments]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CostCenter | null>(null);
  const [form, setForm] = useState({ name: '', departmentId: '' });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const deptName = (id: string) => activeDepartments.find((d) => d.id === id)?.name || '';

  const openCreate = () => { setEditing(null); setForm({ name: '', departmentId: '' }); setShowModal(true); };
  const openEdit = (c: CostCenter) => {
    setEditing(c);
    setForm({ name: c.name || '', departmentId: c.departmentId || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!form.name.trim()) { toast.error(t('catalogs.common.required')); return; }
    const payload = { name: form.name.trim(), departmentId: form.departmentId || null };
    try {
      if (editing) {
        await updateDoc(doc(db, 'costCenters', editing.id), { ...payload, ...touchPayload(user.id) });
        await logAction({
          action: 'COST_CENTER_UPDATED' as AuditAction,
          targetType: 'cost_center',
          targetId: editing.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Centro de costo actualizado: ${payload.name}`,
        });
        toast.success(t('catalogs.common.update'));
      } else {
        const ref = await addDoc(collection(db, 'costCenters'), { ...payload, ...basePayload(user.id) });
        await logAction({
          action: 'COST_CENTER_CREATED' as AuditAction,
          targetType: 'cost_center',
          targetId: ref.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Centro de costo creado: ${payload.name}`,
        });
        toast.success(t('catalogs.common.create'));
      }
      setShowModal(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggle = async (c: CostCenter) => {
    if (!user?.id) return;
    const next = !c.isActive;
    const done = await executeWithConfirm({
      level: 'major',
      title: next ? t('catalogs.common.confirmActivateTitle') : t('catalogs.common.confirmDeactivateTitle'),
      message: fmt(next ? 'catalogs.common.confirmActivate' : 'catalogs.common.confirmDeactivate', { name: c.name }),
      action: async () => {
        await updateDoc(doc(db, 'costCenters', c.id), { isActive: next, ...touchPayload(user.id) });
      },
    });
    if (done !== null) {
      await logAction({
        action: (next ? 'COST_CENTER_ACTIVATED' : 'COST_CENTER_DEACTIVATED') as AuditAction,
        targetType: 'cost_center',
        targetId: c.id,
        targetName: c.name,
        impactLevel: 'major',
        description: `Centro de costo ${next ? 'activado' : 'desactivado'}: ${c.name}`,
      });
      toast.success(next ? t('catalogs.common.activate') : t('catalogs.common.deactivate'));
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title={t('catalogs.costCenters.title')}
        subtitle={fmt('catalogs.costCenters.count', { count: costCenters.length })}
        canWrite={canWrite}
        onNew={openCreate}
        newLabel={t('catalogs.costCenters.new')}
      />
      {costCenters.length === 0 ? (
        <EmptyState icon={<Calculator className="w-12 h-12" />} onCreate={openCreate} canWrite={canWrite} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-3">
          {costCenters.map((c) => (
            <EntityCard
              key={c.id}
              name={c.name}
              lines={[c.departmentId ? deptName(c.departmentId) : t('catalogs.costCenters.noDepartment')]}
              icon={<Calculator className="w-5 h-5" />}
              isActive={c.isActive}
              canWrite={canWrite}
              onEdit={() => openEdit(c)}
              onToggle={() => handleToggle(c)}
              expanded={expandedIds.has(c.id)}
              onToggleExpand={() => setExpandedIds((prev) => toggleId(prev, c.id))}
              details={
                <DetailsGrid>
                  <DetailItem label={t('catalogs.costCenters.department')}>
                    {c.departmentId ? deptName(c.departmentId) : t('catalogs.costCenters.noDepartment')}
                  </DetailItem>
                  <DetailItem label={t('catalogs.common.status')}>
                    {c.isActive ? t('catalogs.common.active') : t('catalogs.common.inactive')}
                  </DetailItem>
                  <DetailItem label={t('catalogs.common.createdAt')}>{fmtDate(c.createdAt)}</DetailItem>
                  <DetailItem label={t('catalogs.common.updatedAt')}>{fmtDate(c.updatedAt)}</DetailItem>
                </DetailsGrid>
              }
            />
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('catalogs.costCenters.edit') : t('catalogs.costCenters.new')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('catalogs.costCenters.name')} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('catalogs.costCenters.department')}</Label>
              <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className={SELECT_CLASS}>
                <option value="">{t('catalogs.costCenters.noDepartment')}</option>
                {activeDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleSave} className="flex-1 bg-corporate hover:bg-corporate/90">
                {editing ? t('catalogs.common.update') : t('catalogs.common.create')}
              </Button>
              <Button variant="outline" onClick={() => setShowModal(false)} className="w-full sm:w-auto">
                {t('catalogs.common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN: CANALES DE VENTA
// ═══════════════════════════════════════════════════════════════════

function SalesChannelsSection({ canWrite }: { canWrite: boolean }) {
  const { user } = useAuth();
  const { logAction } = useAudit();
  const { items: channels } = useCatalog<SalesChannel>('salesChannels');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SalesChannel | null>(null);
  const [form, setForm] = useState({ name: '', nameEn: '' });
  const [seeding, setSeeding] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const openCreate = () => { setEditing(null); setForm({ name: '', nameEn: '' }); setShowModal(true); };
  const openEdit = (c: SalesChannel) => {
    setEditing(c);
    setForm({ name: c.name || '', nameEn: c.nameEn || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!form.name.trim()) { toast.error(t('catalogs.common.required')); return; }
    const payload = { name: form.name.trim(), nameEn: form.nameEn.trim() || null };
    try {
      if (editing) {
        await updateDoc(doc(db, 'salesChannels', editing.id), { ...payload, ...touchPayload(user.id) });
        await logAction({
          action: 'SALES_CHANNEL_UPDATED' as AuditAction,
          targetType: 'sales_channel',
          targetId: editing.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Canal de venta actualizado: ${payload.name}`,
        });
        toast.success(t('catalogs.common.update'));
      } else {
        const ref = await addDoc(collection(db, 'salesChannels'), { ...payload, ...basePayload(user.id) });
        await logAction({
          action: 'SALES_CHANNEL_CREATED' as AuditAction,
          targetType: 'sales_channel',
          targetId: ref.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Canal de venta creado: ${payload.name}`,
        });
        toast.success(t('catalogs.common.create'));
      }
      setShowModal(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggle = async (c: SalesChannel) => {
    if (!user?.id) return;
    const next = !c.isActive;
    const done = await executeWithConfirm({
      level: 'major',
      title: next ? t('catalogs.common.confirmActivateTitle') : t('catalogs.common.confirmDeactivateTitle'),
      message: fmt(next ? 'catalogs.common.confirmActivate' : 'catalogs.common.confirmDeactivate', { name: c.name }),
      action: async () => {
        await updateDoc(doc(db, 'salesChannels', c.id), { isActive: next, ...touchPayload(user.id) });
      },
    });
    if (done !== null) {
      await logAction({
        action: (next ? 'SALES_CHANNEL_ACTIVATED' : 'SALES_CHANNEL_DEACTIVATED') as AuditAction,
        targetType: 'sales_channel',
        targetId: c.id,
        targetName: c.name,
        impactLevel: 'major',
        description: `Canal de venta ${next ? 'activado' : 'desactivado'}: ${c.name}`,
      });
      toast.success(next ? t('catalogs.common.activate') : t('catalogs.common.deactivate'));
    }
  };

  // Semillas de canales de venta (idempotente: IDs deterministas con setDoc)
  const CHANNEL_SEEDS = [
    { id: 'channel_mostrador', name: 'Mostrador' },
    { id: 'channel_renta_externa', name: 'Renta Externa' },
    { id: 'channel_agencia', name: 'Agencia/Operador' },
    { id: 'channel_publico_general', name: 'Público General' },
  ];

  const handleSeedChannels = async () => {
    if (!user?.id) return;
    setSeeding(true);
    let created = 0;
    let existing = 0;
    try {
      for (const seed of CHANNEL_SEEDS) {
        const already = channels.some((c) => c.id === seed.id);
        await setDoc(doc(db, 'salesChannels', seed.id), {
          name: seed.name,
          ...(already ? { ...touchPayload(user.id) } : { ...basePayload(user.id) }),
        }, { merge: true });
        if (already) existing += 1; else created += 1;
      }
      await logAction({
        action: 'SALES_CHANNEL_SEEDED' as AuditAction,
        targetType: 'sales_channel',
        targetId: 'seeds',
        targetName: 'Canales de venta iniciales',
        impactLevel: 'major',
        description: `Semillas de canales cargadas: ${created} nuevos, ${existing} existentes`,
      });
      toast.success(fmt('catalogs.common.loadInitialDone', { created, existing }));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title={t('catalogs.salesChannels.title')}
        subtitle={fmt('catalogs.salesChannels.count', { count: channels.length })}
        canWrite={canWrite}
        onNew={openCreate}
        newLabel={t('catalogs.salesChannels.new')}
        extra={canWrite ? (
          <Button
            variant="outline"
            onClick={handleSeedChannels}
            disabled={seeding}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" /> {t('catalogs.common.loadInitial')}
          </Button>
        ) : undefined}
      />
      {channels.length === 0 ? (
        <EmptyState icon={<Megaphone className="w-12 h-12" />} onCreate={openCreate} canWrite={canWrite} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-3">
          {channels.map((c) => (
            <EntityCard
              key={c.id}
              name={c.name}
              lines={[c.nameEn]}
              icon={<Megaphone className="w-5 h-5" />}
              isActive={c.isActive}
              canWrite={canWrite}
              onEdit={() => openEdit(c)}
              onToggle={() => handleToggle(c)}
              expanded={expandedIds.has(c.id)}
              onToggleExpand={() => setExpandedIds((prev) => toggleId(prev, c.id))}
              details={
                <DetailsGrid>
                  <DetailItem label={t('catalogs.salesChannels.nameEn')}>{c.nameEn}</DetailItem>
                  <DetailItem label={t('catalogs.common.status')}>
                    {c.isActive ? t('catalogs.common.active') : t('catalogs.common.inactive')}
                  </DetailItem>
                  <DetailItem label={t('catalogs.common.createdAt')}>{fmtDate(c.createdAt)}</DetailItem>
                  <DetailItem label={t('catalogs.common.updatedAt')}>{fmtDate(c.updatedAt)}</DetailItem>
                </DetailsGrid>
              }
            />
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('catalogs.salesChannels.edit') : t('catalogs.salesChannels.new')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('catalogs.salesChannels.name')} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('catalogs.salesChannels.nameEn')}</Label>
              <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleSave} className="flex-1 bg-corporate hover:bg-corporate/90">
                {editing ? t('catalogs.common.update') : t('catalogs.common.create')}
              </Button>
              <Button variant="outline" onClick={() => setShowModal(false)} className="w-full sm:w-auto">
                {t('catalogs.common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN: DESCUENTOS DE RENTA (catálogo rentalDiscounts)
// Descuentos preconfigurados seleccionables en el formulario de orden de
// renta (Warehouse). percent positivo: 10 = -10 % sobre el total.
// ═══════════════════════════════════════════════════════════════════

function RentalDiscountsSection({ canWrite }: { canWrite: boolean }) {
  const { user } = useAuth();
  const { logAction } = useAudit();
  const { items: discounts } = useCatalog<RentalDiscount>('rentalDiscounts');
  const { items: products } = useCatalog<Product>('products');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RentalDiscount | null>(null);
  const [form, setForm] = useState({ name: '', percent: '', preAuthorized: false, productIds: [] as string[] });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Multi-select "Aplica a": solo productos rentables activos
  const rentableProducts = useMemo(
    () => products.filter((p) => p.isRentable && p.isActive),
    [products]
  );
  const productName = (id: string) => products.find((p) => p.id === id)?.name || '';

  const openCreate = () => { setEditing(null); setForm({ name: '', percent: '', preAuthorized: false, productIds: [] }); setShowModal(true); };
  const openEdit = (d: RentalDiscount) => {
    setEditing(d);
    setForm({
      name: d.name || '',
      percent: d.percent != null ? String(d.percent) : '',
      preAuthorized: d.preAuthorized === true,
      productIds: d.productIds ? [...d.productIds] : [],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!form.name.trim()) { toast.error(t('catalogs.common.required')); return; }
    const percent = Number(form.percent);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      toast.error(t('catalogs.discounts.percentInvalid'));
      return;
    }
    // productIds vacío/ausente = aplica a todos los productos
    const payload = {
      name: form.name.trim(),
      percent,
      preAuthorized: form.preAuthorized,
      productIds: form.productIds.length > 0 ? [...form.productIds] : null,
    };
    try {
      if (editing) {
        await updateDoc(doc(db, 'rentalDiscounts', editing.id), { ...payload, ...touchPayload(user.id) });
        await logAction({
          action: 'RENTAL_DISCOUNT_UPDATED' as AuditAction,
          targetType: 'rental_discount',
          targetId: editing.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Descuento de renta actualizado: ${payload.name} (-${percent}%)`,
        });
        toast.success(t('catalogs.common.update'));
      } else {
        const ref = await addDoc(collection(db, 'rentalDiscounts'), { ...payload, ...basePayload(user.id) });
        await logAction({
          action: 'RENTAL_DISCOUNT_CREATED' as AuditAction,
          targetType: 'rental_discount',
          targetId: ref.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Descuento de renta creado: ${payload.name} (-${percent}%)`,
        });
        toast.success(t('catalogs.common.create'));
      }
      setShowModal(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggle = async (d: RentalDiscount) => {
    if (!user?.id) return;
    const next = !d.isActive;
    const done = await executeWithConfirm({
      level: 'major',
      title: next ? t('catalogs.common.confirmActivateTitle') : t('catalogs.common.confirmDeactivateTitle'),
      message: fmt(next ? 'catalogs.common.confirmActivate' : 'catalogs.common.confirmDeactivate', { name: d.name }),
      action: async () => {
        await updateDoc(doc(db, 'rentalDiscounts', d.id), { isActive: next, ...touchPayload(user.id) });
      },
    });
    if (done !== null) {
      await logAction({
        action: (next ? 'RENTAL_DISCOUNT_ACTIVATED' : 'RENTAL_DISCOUNT_DEACTIVATED') as AuditAction,
        targetType: 'rental_discount',
        targetId: d.id,
        targetName: d.name,
        impactLevel: 'major',
        description: `Descuento de renta ${next ? 'activado' : 'desactivado'}: ${d.name}`,
      });
      toast.success(next ? t('catalogs.common.activate') : t('catalogs.common.deactivate'));
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title={t('catalogs.discounts.title')}
        subtitle={fmt('catalogs.discounts.count', { count: discounts.length })}
        canWrite={canWrite}
        onNew={openCreate}
        newLabel={t('catalogs.discounts.new')}
      />
      {discounts.length === 0 ? (
        <EmptyState icon={<Percent className="w-12 h-12" />} onCreate={openCreate} canWrite={canWrite} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-3">
          {discounts.map((d) => (
            <EntityCard
              key={d.id}
              name={d.name}
              lines={[
                `-${d.percent}%`,
                d.preAuthorized ? t('catalogs.discounts.badgePreAuthorized') : '',
                (d.productIds ?? []).length > 0
                  ? (d.productIds ?? []).map(productName).filter(Boolean).join(', ')
                  : t('catalogs.discounts.allProducts'),
              ]}
              icon={<Percent className="w-5 h-5" />}
              isActive={d.isActive}
              canWrite={canWrite}
              onEdit={() => openEdit(d)}
              onToggle={() => handleToggle(d)}
              expanded={expandedIds.has(d.id)}
              onToggleExpand={() => setExpandedIds((prev) => toggleId(prev, d.id))}
              details={
                <DetailsGrid>
                  <DetailItem label={t('catalogs.discounts.percent')}>-{d.percent}%</DetailItem>
                  <DetailItem label={t('catalogs.discounts.preAuthorized')}>
                    {d.preAuthorized ? t('catalogs.common.yes') : t('catalogs.common.no')}
                  </DetailItem>
                  <DetailItem label={t('catalogs.discounts.appliesTo')}>
                    {(d.productIds ?? []).length > 0
                      ? (d.productIds ?? []).map(productName).filter(Boolean).join(', ')
                      : t('catalogs.discounts.allProducts')}
                  </DetailItem>
                  <DetailItem label={t('catalogs.common.status')}>
                    {d.isActive ? t('catalogs.common.active') : t('catalogs.common.inactive')}
                  </DetailItem>
                  <DetailItem label={t('catalogs.common.createdAt')}>{fmtDate(d.createdAt)}</DetailItem>
                  <DetailItem label={t('catalogs.common.updatedAt')}>{fmtDate(d.updatedAt)}</DetailItem>
                </DetailsGrid>
              }
            />
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('catalogs.discounts.edit') : t('catalogs.discounts.new')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('catalogs.discounts.name')} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('catalogs.discounts.percent')} *</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.percent}
                onChange={(e) => setForm({ ...form, percent: e.target.value })}
              />
              <p className="text-[11px] text-[#86868B]">{t('catalogs.discounts.percentHelp')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('catalogs.discounts.preAuthorized')}</Label>
              <select
                value={form.preAuthorized ? 'yes' : 'no'}
                onChange={(e) => setForm({ ...form, preAuthorized: e.target.value === 'yes' })}
                className={SELECT_CLASS}
              >
                <option value="no">{t('catalogs.common.no')}</option>
                <option value="yes">{t('catalogs.common.yes')}</option>
              </select>
              <p className="text-[11px] text-[#86868B] leading-relaxed">{t('catalogs.discounts.preAuthorizedHelp')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('catalogs.discounts.appliesTo')}</Label>
              <div className="flex flex-wrap gap-1.5 bg-[#F5F5F7] rounded-xl p-3">
                {rentableProducts.length === 0 && (
                  <p className="text-xs text-[#86868B]">{t('catalogs.discounts.noRentableProducts')}</p>
                )}
                {rentableProducts.map((p) => {
                  const selected = form.productIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setForm({ ...form, productIds: toggleArrayId(form.productIds, p.id) })}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                        selected ? 'bg-corporate text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                      )}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[#86868B] leading-relaxed">{t('catalogs.discounts.appliesToHelp')}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleSave} className="flex-1 bg-corporate hover:bg-corporate/90">
                {editing ? t('catalogs.common.update') : t('catalogs.common.create')}
              </Button>
              <Button variant="outline" onClick={() => setShowModal(false)} className="w-full sm:w-auto">
                {t('catalogs.common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN: IMPUESTOS Y CARGOS DE RENTA (rentalFees)
// Configurables: percent (sobre subtotal − descuento) o fixed (monto fijo).
// Se suman al total de la orden; Warehouse los consume desde Firestore.
// ═══════════════════════════════════════════════════════════════════

// Semillas idempotentes (ids deterministas, nunca pisan renombres).
// Valores alineados al impuesto local real: IVA Ecuador 15 %.
const SEED_FEES: Array<{ id: string; name: string; mode: 'percent' | 'fixed'; value: number }> = [
  { id: 'iva', name: 'IVA', mode: 'percent', value: 15 },
  { id: 'servicio', name: 'Servicio', mode: 'percent', value: 5 },
];

function RentalFeesSection({ canWrite }: { canWrite: boolean }) {
  const { user } = useAuth();
  const { logAction } = useAudit();
  const { items: fees } = useCatalog<RentalFee>('rentalFees');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RentalFee | null>(null);
  const [form, setForm] = useState({ name: '', mode: 'percent' as 'percent' | 'fixed', value: '' });
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const openCreate = () => { setEditing(null); setForm({ name: '', mode: 'percent', value: '' }); setShowModal(true); };
  const openEdit = (f: RentalFee) => {
    setEditing(f);
    setForm({ name: f.name || '', mode: f.mode === 'fixed' ? 'fixed' : 'percent', value: f.value != null ? String(f.value) : '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!form.name.trim()) { toast.error(t('catalogs.common.required')); return; }
    const value = Number(form.value);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(t('catalogs.fees.valueInvalid'));
      return;
    }
    const payload = { name: form.name.trim(), mode: form.mode, value };
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, 'rentalFees', editing.id), { ...payload, ...touchPayload(user.id) });
        await logAction({
          action: 'RENTAL_FEE_UPDATED' as AuditAction,
          targetType: 'rental_fee',
          targetId: editing.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Impuesto/cargo de renta actualizado: ${payload.name} (${payload.mode === 'percent' ? payload.value + '%' : '$' + payload.value})`,
        });
        toast.success(t('catalogs.common.update'));
      } else {
        const ref = await addDoc(collection(db, 'rentalFees'), { ...payload, ...basePayload(user.id) });
        await logAction({
          action: 'RENTAL_FEE_CREATED' as AuditAction,
          targetType: 'rental_fee',
          targetId: ref.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Impuesto/cargo de renta creado: ${payload.name} (${payload.mode === 'percent' ? payload.value + '%' : '$' + payload.value})`,
        });
        toast.success(t('catalogs.common.create'));
      }
      setShowModal(false);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (f: RentalFee) => {
    if (!user?.id) return;
    const next = !f.isActive;
    const done = await executeWithConfirm({
      level: 'major',
      title: next ? t('catalogs.common.confirmActivateTitle') : t('catalogs.common.confirmDeactivateTitle'),
      message: fmt(next ? 'catalogs.common.confirmActivate' : 'catalogs.common.confirmDeactivate', { name: f.name }),
      action: async () => {
        await updateDoc(doc(db, 'rentalFees', f.id), { isActive: next, ...touchPayload(user.id) });
      },
    });
    if (done !== null) {
      await logAction({
        action: (next ? 'RENTAL_FEE_ACTIVATED' : 'RENTAL_FEE_DEACTIVATED') as AuditAction,
        targetType: 'rental_fee',
        targetId: f.id,
        targetName: f.name,
        impactLevel: 'major',
        description: `Impuesto/cargo de renta ${next ? 'activado' : 'desactivado'}: ${f.name}`,
      });
      toast.success(next ? t('catalogs.common.activate') : t('catalogs.common.deactivate'));
    }
  };

  // Seeds idempotentes: crea solo los que falten, con ids deterministas
  const loadSeeds = async () => {
    if (!user?.id) return;
    await executeWithConfirm(
      {
        level: 'important',
        title: t('catalogs.fees.seedsConfirmTitle'),
        message: t('catalogs.fees.seedsConfirmDesc'),
      },
      async () => {
        setSaving(true);
        try {
          let created = 0;
          let existing = 0;
          for (const seed of SEED_FEES) {
            const ref = doc(db, 'rentalFees', seed.id);
            const snap = await getDoc(ref);
            if (snap.exists()) { existing += 1; continue; }
            const now = new Date().toISOString();
            await setDoc(ref, {
              tenantId: getCurrentTenantId(),
              name: seed.name,
              mode: seed.mode,
              value: seed.value,
              isActive: true,
              createdAt: now,
              createdBy: user.id,
            });
            created += 1;
          }
          if (created === 0) {
            toast.info(t('catalogs.fees.seedsAlreadyLoaded'));
          } else {
            toast.success(fmt('catalogs.common.loadInitialDone', { created, existing }));
            await logAction({
              action: 'RENTAL_FEE_SEEDED' as AuditAction,
              targetType: 'rental_fee',
              targetId: 'seeds',
              targetName: t('catalogs.fees.title'),
              impactLevel: 'major',
              description: `Impuestos/cargos iniciales de renta cargados: ${created} nuevos, ${existing} ya existían`,
            });
          }
        } catch (err: any) { toast.error(err.message); }
        finally { setSaving(false); }
      }
    );
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title={t('catalogs.fees.title')}
        subtitle={fmt('catalogs.fees.count', { count: fees.length })}
        canWrite={canWrite}
        onNew={openCreate}
        newLabel={t('catalogs.fees.new')}
        extra={
          canWrite ? (
            <Button variant="outline" onClick={loadSeeds} disabled={saving} className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> {t('catalogs.common.loadInitial')}
            </Button>
          ) : undefined
        }
      />
      <div className="flex items-start gap-3 bg-[#F5F5F7] rounded-2xl p-4">
        <Info className="w-4 h-4 text-corporate shrink-0 mt-0.5" />
        <p className="text-xs text-[#86868B]">{t('catalogs.fees.help')}</p>
      </div>
      {fees.length === 0 ? (
        <EmptyState icon={<Receipt className="w-12 h-12" />} onCreate={openCreate} canWrite={canWrite} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-3">
          {fees.map((f) => (
            <EntityCard
              key={f.id}
              name={f.name}
              lines={[f.mode === 'percent' ? fmt('catalogs.fees.linePercent', { value: f.value }) : fmt('catalogs.fees.lineFixed', { value: f.value })]}
              icon={<Receipt className="w-5 h-5" />}
              isActive={f.isActive}
              canWrite={canWrite}
              onEdit={() => openEdit(f)}
              onToggle={() => handleToggle(f)}
              expanded={expandedIds.has(f.id)}
              onToggleExpand={() => setExpandedIds((prev) => toggleId(prev, f.id))}
              details={
                <DetailsGrid>
                  <DetailItem label={t('catalogs.fees.mode')}>
                    {f.mode === 'percent' ? t('catalogs.fees.modePercent') : t('catalogs.fees.modeFixed')}
                  </DetailItem>
                  <DetailItem label={t('catalogs.fees.value')}>
                    {f.mode === 'percent' ? fmt('catalogs.fees.linePercent', { value: f.value }) : fmt('catalogs.fees.lineFixed', { value: f.value })}
                  </DetailItem>
                  <DetailItem label={t('catalogs.common.status')}>
                    {f.isActive ? t('catalogs.common.active') : t('catalogs.common.inactive')}
                  </DetailItem>
                  <DetailItem label={t('catalogs.common.createdAt')}>{fmtDate(f.createdAt)}</DetailItem>
                  <DetailItem label={t('catalogs.common.updatedAt')}>{fmtDate(f.updatedAt)}</DetailItem>
                </DetailsGrid>
              }
            />
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('catalogs.fees.edit') : t('catalogs.fees.new')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('catalogs.fees.name')} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('catalogs.fees.mode')} *</Label>
              <select
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value === 'fixed' ? 'fixed' : 'percent' })}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] bg-white text-sm text-[#1D1D1F]"
              >
                <option value="percent">{t('catalogs.fees.modePercent')}</option>
                <option value="fixed">{t('catalogs.fees.modeFixed')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('catalogs.fees.value')} *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
              <p className="text-[11px] text-[#86868B]">{t('catalogs.fees.valueHelp')}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-corporate hover:bg-corporate/90">
                {editing ? t('catalogs.common.update') : t('catalogs.common.create')}
              </Button>
              <Button variant="outline" onClick={() => setShowModal(false)} className="w-full sm:w-auto">
                {t('catalogs.common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN: ESTADOS DE ORDEN DE RENTA
// (catálogo consumido por WarehouseModule; se administra aquí como
// catálogo maestro, igual que movementTypes/serialStatuses)
// ═══════════════════════════════════════════════════════════════════

// Semillas idempotentes (ids deterministas, nunca pisan renombres).
// Mismo orden del flujo canónico de renta.
const SEED_ORDER_STATUSES: Array<{
  id: string; name: string; nameEn: string; order: number;
  isFinalOk?: boolean; isFinalRepair?: boolean;
}> = [
  { id: 'recibido', name: 'Recibido', nameEn: 'Received', order: 1 },
  { id: 'en_preparacion', name: 'En preparación', nameEn: 'In preparation', order: 2 },
  { id: 'listo_despachar', name: 'Listo para despachar', nameEn: 'Ready to dispatch', order: 3 },
  { id: 'despachado', name: 'Despachado', nameEn: 'Dispatched', order: 4 },
  { id: 'entregado', name: 'Entregado', nameEn: 'Delivered', order: 5 },
  { id: 'devuelto', name: 'Devuelto', nameEn: 'Returned', order: 6 },
  { id: 'verificado', name: 'Verificado', nameEn: 'Verified', order: 7 },
  { id: 'almacenado', name: 'Almacenado', nameEn: 'Stored', order: 8, isFinalOk: true },
  { id: 'a_reparacion', name: 'A reparación', nameEn: 'To repair', order: 9, isFinalRepair: true },
];

function RentalOrderStatusesSection({ canWrite }: { canWrite: boolean }) {
  const { user } = useAuth();
  const { logAction } = useAudit();
  // Intersección con CatalogBase: el tipo RentalOrderStatus no declara los
  // timestamps, pero el hook genérico los expone si existen en Firestore.
  const { items: statuses } = useCatalog<RentalOrderStatus & CatalogBase>('rentalOrderStatuses');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<(RentalOrderStatus & CatalogBase) | null>(null);
  const [form, setForm] = useState({ name: '', nameEn: '', order: '' });
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Orden de secuencia (el campo `order` define el flujo, no el nombre)
  const sortedStatuses = useMemo(
    () => [...statuses].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [statuses]
  );

  const openCreate = () => { setEditing(null); setForm({ name: '', nameEn: '', order: '' }); setShowModal(true); };
  const openEdit = (s: RentalOrderStatus & CatalogBase) => {
    setEditing(s);
    setForm({ name: s.name || '', nameEn: s.nameEn || '', order: s.order != null ? String(s.order) : '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!form.name.trim()) { toast.error(t('catalogs.common.required')); return; }
    const order = Number(form.order);
    if (!Number.isInteger(order)) { toast.error(t('catalogs.orderStatuses.orderInvalid')); return; }
    const payload = { name: form.name.trim(), nameEn: form.nameEn.trim() || null, order };
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, 'rentalOrderStatuses', editing.id), { ...payload, ...touchPayload(user.id) });
        await logAction({
          action: 'RENTAL_ORDER_STATUS_UPDATED' as AuditAction,
          targetType: 'rental_order_status',
          targetId: editing.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Estado de orden de renta actualizado: ${payload.name} (orden ${order})`,
        });
        toast.success(t('catalogs.common.update'));
      } else {
        const ref = await addDoc(collection(db, 'rentalOrderStatuses'), { ...payload, ...basePayload(user.id) });
        await logAction({
          action: 'RENTAL_ORDER_STATUS_CREATED' as AuditAction,
          targetType: 'rental_order_status',
          targetId: ref.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Estado de orden de renta creado: ${payload.name} (orden ${order})`,
        });
        toast.success(t('catalogs.common.create'));
      }
      setShowModal(false);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (s: RentalOrderStatus & CatalogBase) => {
    if (!user?.id) return;
    const next = !s.isActive;
    const done = await executeWithConfirm({
      level: 'important',
      title: next ? t('catalogs.common.confirmActivateTitle') : t('catalogs.common.confirmDeactivateTitle'),
      message: fmt(next ? 'catalogs.common.confirmActivate' : 'catalogs.common.confirmDeactivate', { name: s.name }),
      action: async () => {
        await updateDoc(doc(db, 'rentalOrderStatuses', s.id), { isActive: next, ...touchPayload(user.id) });
      },
    });
    if (done !== null) {
      await logAction({
        action: (next ? 'RENTAL_ORDER_STATUS_ACTIVATED' : 'RENTAL_ORDER_STATUS_DEACTIVATED') as AuditAction,
        targetType: 'rental_order_status',
        targetId: s.id,
        targetName: s.name,
        impactLevel: 'major',
        description: `Estado de orden de renta ${next ? 'activado' : 'desactivado'}: ${s.name}`,
      });
      toast.success(next ? t('catalogs.common.activate') : t('catalogs.common.deactivate'));
    }
  };

  // Seeds idempotentes: crea solo los que falten, con ids deterministas
  const loadSeeds = async () => {
    if (!user?.id) return;
    await executeWithConfirm(
      {
        level: 'important',
        title: t('catalogs.orderStatuses.seedsConfirmTitle'),
        message: t('catalogs.orderStatuses.seedsConfirmDesc'),
      },
      async () => {
        setSaving(true);
        try {
          let created = 0;
          let existing = 0;
          for (const seed of SEED_ORDER_STATUSES) {
            const ref = doc(db, 'rentalOrderStatuses', seed.id);
            const snap = await getDoc(ref);
            if (snap.exists()) { existing += 1; continue; }
            const now = new Date().toISOString();
            await setDoc(ref, {
              tenantId: getCurrentTenantId(),
              name: seed.name,
              nameEn: seed.nameEn,
              order: seed.order,
              ...(seed.isFinalOk !== undefined ? { isFinalOk: seed.isFinalOk } : {}),
              ...(seed.isFinalRepair !== undefined ? { isFinalRepair: seed.isFinalRepair } : {}),
              isActive: true,
              createdAt: now,
              createdBy: user.id,
            });
            created += 1;
          }
          if (created === 0) {
            toast.info(t('catalogs.orderStatuses.seedsAlreadyLoaded'));
          } else {
            toast.success(fmt('catalogs.common.loadInitialDone', { created, existing }));
            await logAction({
              action: 'RENTAL_ORDER_STATUS_SEEDED' as AuditAction,
              targetType: 'rental_order_status',
              targetId: 'seeds',
              targetName: t('catalogs.orderStatuses.title'),
              impactLevel: 'major',
              description: `Estados iniciales de orden de renta cargados: ${created} nuevos, ${existing} ya existían`,
            });
          }
        } catch (err: any) { toast.error(err.message); }
        finally { setSaving(false); }
      }
    );
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title={t('catalogs.orderStatuses.title')}
        subtitle={fmt('catalogs.orderStatuses.count', { count: statuses.length })}
        canWrite={canWrite}
        onNew={openCreate}
        newLabel={t('catalogs.orderStatuses.new')}
        extra={
          canWrite ? (
            <Button variant="outline" onClick={loadSeeds} disabled={saving} className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> {t('catalogs.common.loadInitial')}
            </Button>
          ) : undefined
        }
      />
      <div className="flex items-start gap-3 bg-[#F5F5F7] rounded-2xl p-4">
        <Info className="w-4 h-4 text-corporate shrink-0 mt-0.5" />
        <div className="text-xs text-[#86868B] space-y-1">
          <p>{t('catalogs.orderStatuses.help')}</p>
          <p>{t('catalogs.orderStatuses.noDelete')}</p>
        </div>
      </div>
      {sortedStatuses.length === 0 ? (
        <EmptyState icon={<ClipboardList className="w-12 h-12" />} onCreate={openCreate} canWrite={canWrite} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-3">
          {sortedStatuses.map((s) => (
            <EntityCard
              key={s.id}
              name={getLanguage() === 'en' && s.nameEn ? s.nameEn : s.name}
              lines={[
                `${t('catalogs.orderStatuses.order')}: ${s.order ?? '—'}`,
                s.isFinalOk ? t('catalogs.orderStatuses.finalOk') : '',
                s.isFinalRepair ? t('catalogs.orderStatuses.finalRepair') : '',
              ]}
              icon={<ClipboardList className="w-5 h-5" />}
              isActive={s.isActive}
              canWrite={canWrite}
              onEdit={() => openEdit(s)}
              onToggle={() => handleToggle(s)}
              expanded={expandedIds.has(s.id)}
              onToggleExpand={() => setExpandedIds((prev) => toggleId(prev, s.id))}
              details={
                <DetailsGrid>
                  <DetailItem label={t('catalogs.orderStatuses.name')}>{s.name}</DetailItem>
                  <DetailItem label={t('catalogs.orderStatuses.nameEn')}>{s.nameEn || '—'}</DetailItem>
                  <DetailItem label={t('catalogs.orderStatuses.order')}>{s.order ?? '—'}</DetailItem>
                  <DetailItem label={t('catalogs.common.status')}>
                    {s.isActive ? t('catalogs.common.active') : t('catalogs.common.inactive')}
                  </DetailItem>
                  {s.isFinalOk && (
                    <DetailItem label={t('catalogs.orderStatuses.finalOk')}>{t('catalogs.common.yes')}</DetailItem>
                  )}
                  {s.isFinalRepair && (
                    <DetailItem label={t('catalogs.orderStatuses.finalRepair')}>{t('catalogs.common.yes')}</DetailItem>
                  )}
                  <DetailItem label={t('catalogs.common.createdAt')}>{fmtDate(s.createdAt)}</DetailItem>
                  <DetailItem label={t('catalogs.common.updatedAt')}>{fmtDate(s.updatedAt)}</DetailItem>
                </DetailsGrid>
              }
            />
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('catalogs.orderStatuses.edit') : t('catalogs.orderStatuses.new')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('catalogs.orderStatuses.name')} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('catalogs.orderStatuses.nameEn')}</Label>
              <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('catalogs.orderStatuses.order')} *</Label>
              <Input
                type="number"
                step="1"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: e.target.value })}
              />
              <p className="text-[11px] text-[#86868B]">{t('catalogs.orderStatuses.orderHelp')}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-corporate hover:bg-corporate/90">
                {editing ? t('catalogs.common.update') : t('catalogs.common.create')}
              </Button>
              <Button variant="outline" onClick={() => setShowModal(false)} className="w-full sm:w-auto">
                {t('catalogs.common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN: CLIENTES
// ═══════════════════════════════════════════════════════════════════

interface ClientFormState {
  type: ClientType;
  identification: string;
  name: string;
  contactName: string;
  email: string;
  phonePrefix: string;
  phoneNumber: string;
  businessName: string;
  taxId: string;
  address: string;
  departmentId: string;
}

const CLIENT_TYPE_OPTIONS: ClientType[] = ['persona', 'empresa', 'interno'];

function clientTypeLabel(type: ClientType): string {
  if (type === 'persona') return t('catalogs.clients.typePersona');
  if (type === 'empresa') return t('catalogs.clients.typeEmpresa');
  return t('catalogs.clients.typeInterno');
}

function ClientsSection({ canWrite }: { canWrite: boolean }) {
  const { user } = useAuth();
  const { logAction } = useAudit();
  const { items: clients } = useCatalog<Client>('clients');
  const { departments } = useDynamicDepartments();
  const activeDepartments = useMemo(() => departments.filter((d) => d.isActive), [departments]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormState>({
    type: 'persona', identification: '', name: '', contactName: '', email: '', phonePrefix: DEFAULT_PHONE_PREFIX, phoneNumber: '',
    businessName: '', taxId: '', address: '', departmentId: '',
  });
  const [generating, setGenerating] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const deptName = (id: string) => activeDepartments.find((d) => d.id === id)?.name || '';

  const openCreate = () => {
    setEditing(null);
    setForm({ type: 'persona', identification: '', name: '', contactName: '', email: '', phonePrefix: DEFAULT_PHONE_PREFIX, phoneNumber: '', businessName: '', taxId: '', address: '', departmentId: '' });
    setShowModal(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    const phoneParts = parsePhoneParts(c.phone);
    setForm({
      type: c.type || 'persona',
      identification: c.identification || '',
      name: c.name || '',
      contactName: c.contactName || '',
      email: c.email || '',
      phonePrefix: phoneParts.prefix,
      phoneNumber: phoneParts.number,
      businessName: c.billingData?.businessName || '',
      taxId: c.billingData?.taxId || '',
      address: c.billingData?.address || '',
      departmentId: c.departmentId || '',
    });
    setShowModal(true);
  };

  const findDuplicate = (identification: string, email: string, excludeId?: string): Client | null => {
    const idNorm = identification.trim().toLowerCase();
    const emailNorm = email.trim().toLowerCase();
    return (
      clients.find((c) => {
        if (!c.isActive || c.id === excludeId) return false;
        const cId = (c.identification || '').trim().toLowerCase();
        const cEmail = (c.email || '').trim().toLowerCase();
        if (idNorm && cId && cId === idNorm) return true;
        if (emailNorm && cEmail && cEmail === emailNorm) return true;
        return false;
      }) || null
    );
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!form.name.trim()) { toast.error(t('catalogs.common.required')); return; }
    const duplicate = findDuplicate(form.identification, form.email, editing?.id);
    if (duplicate) {
      toast.error(fmt('catalogs.clients.duplicate', { name: duplicate.name }));
      return;
    }
    const phone = composePhone(form.phonePrefix, form.phoneNumber);
    const payload: Record<string, any> = {
      type: form.type,
      identification: form.identification.trim() || null,
      name: form.name.trim(),
      contactName: form.contactName.trim() || null,
      email: form.email.trim() || null,
      phone,
      phonePrefix: phone ? form.phonePrefix : null,
      phoneNumber: phone ? form.phoneNumber.replace(/\D/g, '') : null,
      billingData: {
        businessName: form.businessName.trim() || null,
        taxId: form.taxId.trim() || null,
        address: form.address.trim() || null,
      },
      departmentId: form.type === 'interno' ? form.departmentId || null : null,
    };
    try {
      if (editing) {
        await updateDoc(doc(db, 'clients', editing.id), { ...payload, ...touchPayload(user.id) });
        await logAction({
          action: 'CLIENT_UPDATED' as AuditAction,
          targetType: 'client',
          targetId: editing.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Cliente actualizado: ${payload.name}`,
        });
        toast.success(t('catalogs.common.update'));
      } else {
        const ref = await addDoc(collection(db, 'clients'), { ...payload, ...basePayload(user.id) });
        await logAction({
          action: 'CLIENT_CREATED' as AuditAction,
          targetType: 'client',
          targetId: ref.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Cliente creado: ${payload.name}`,
        });
        toast.success(t('catalogs.common.create'));
      }
      setShowModal(false);
      setEditing(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggle = async (c: Client) => {
    if (!user?.id) return;
    const next = !c.isActive;
    const done = await executeWithConfirm({
      level: 'major',
      title: next ? t('catalogs.common.confirmActivateTitle') : t('catalogs.common.confirmDeactivateTitle'),
      message: fmt(next ? 'catalogs.common.confirmActivate' : 'catalogs.common.confirmDeactivate', { name: c.name }),
      action: async () => {
        await updateDoc(doc(db, 'clients', c.id), { isActive: next, ...touchPayload(user.id) });
      },
    });
    if (done !== null) {
      await logAction({
        action: (next ? 'CLIENT_ACTIVATED' : 'CLIENT_DEACTIVATED') as AuditAction,
        targetType: 'client',
        targetId: c.id,
        targetName: c.name,
        impactLevel: 'major',
        description: `Cliente ${next ? 'activado' : 'desactivado'}: ${c.name}`,
      });
      toast.success(next ? t('catalogs.common.activate') : t('catalogs.common.deactivate'));
    }
  };

  // Generar clientes internos por cada departamento activo (idempotente por departmentId)
  const handleGenerateInternal = async () => {
    if (!user?.id) return;
    setGenerating(true);
    let created = 0;
    let existing = 0;
    try {
      for (const dept of activeDepartments) {
        const already = clients.some((c) => c.type === 'interno' && c.departmentId === dept.id && c.isActive);
        if (already) { existing += 1; continue; }
        const name = `${t('catalogs.clients.internalPrefix')}${dept.name}`;
        const ref = await addDoc(collection(db, 'clients'), {
          type: 'interno',
          identification: null,
          name,
          contactName: null,
          email: null,
          phone: null,
          billingData: { businessName: null, taxId: null, address: null },
          departmentId: dept.id,
          ...basePayload(user.id),
        });
        await logAction({
          action: 'CLIENT_CREATED' as AuditAction,
          targetType: 'client',
          targetId: ref.id,
          targetName: name,
          impactLevel: 'major',
          description: `Cliente interno generado para departamento: ${dept.name}`,
        });
        created += 1;
      }
      toast.success(fmt('catalogs.clients.internalGenerated', { created, existing }));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title={t('catalogs.clients.title')}
        subtitle={fmt('catalogs.clients.count', { count: clients.length })}
        canWrite={canWrite}
        onNew={openCreate}
        newLabel={t('catalogs.clients.new')}
        extra={canWrite ? (
          <Button
            variant="outline"
            onClick={handleGenerateInternal}
            disabled={generating || activeDepartments.length === 0}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Building2 className="w-4 h-4" /> {t('catalogs.clients.generateInternal')}
          </Button>
        ) : undefined}
      />
      {clients.length === 0 ? (
        <EmptyState icon={<Users className="w-12 h-12" />} onCreate={openCreate} canWrite={canWrite} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-3">
          {clients.map((c) => (
            <EntityCard
              key={c.id}
              name={c.name}
              lines={[
                clientTypeLabel(c.type),
                [c.identification, c.email].filter(Boolean).join(' · '),
                c.departmentId ? deptName(c.departmentId) : '',
              ]}
              icon={<Users className="w-5 h-5" />}
              isActive={c.isActive}
              canWrite={canWrite}
              onEdit={() => openEdit(c)}
              onToggle={() => handleToggle(c)}
              expanded={expandedIds.has(c.id)}
              onToggleExpand={() => setExpandedIds((prev) => toggleId(prev, c.id))}
              details={
                <DetailsGrid>
                  <DetailItem label={t('catalogs.clients.type')}>{clientTypeLabel(c.type)}</DetailItem>
                  <DetailItem label={t('catalogs.clients.identification')}>{c.identification}</DetailItem>
                  <DetailItem label={t('catalogs.clients.contactName')}>{c.contactName}</DetailItem>
                  <DetailItem label={t('catalogs.clients.email')}>{c.email}</DetailItem>
                  <DetailItem label={t('catalogs.clients.phone')}>{c.phone}</DetailItem>
                  <DetailItem label={t('catalogs.common.status')}>
                    {c.isActive ? t('catalogs.common.active') : t('catalogs.common.inactive')}
                  </DetailItem>
                  {c.type === 'interno' && (
                    <DetailItem label={t('catalogs.clients.department')}>
                      {c.departmentId ? deptName(c.departmentId) : t('catalogs.clients.selectDepartment')}
                    </DetailItem>
                  )}
                  {c.billingData && (c.billingData.businessName || c.billingData.taxId || c.billingData.address) && (
                    <div className="sm:col-span-2">
                      <DetailItem label={t('catalogs.clients.billingData')}>
                        {[c.billingData.businessName, c.billingData.taxId, c.billingData.address].filter(Boolean).join(' · ')}
                      </DetailItem>
                    </div>
                  )}
                  <DetailItem label={t('catalogs.common.createdAt')}>{fmtDate(c.createdAt)}</DetailItem>
                  <DetailItem label={t('catalogs.common.updatedAt')}>{fmtDate(c.updatedAt)}</DetailItem>
                </DetailsGrid>
              }
            />
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('catalogs.clients.edit') : t('catalogs.clients.new')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('catalogs.clients.type')}</Label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as ClientType })}
                  className={SELECT_CLASS}
                >
                  {CLIENT_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{clientTypeLabel(opt)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.clients.name')} *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.clients.identification')}</Label>
                <Input value={form.identification} onChange={(e) => setForm({ ...form, identification: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.clients.contactName')}</Label>
                <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.clients.email')}</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.clients.phone')}</Label>
                <PhoneField
                  prefix={form.phonePrefix}
                  number={form.phoneNumber}
                  onPrefixChange={(v) => setForm({ ...form, phonePrefix: v })}
                  onNumberChange={(v) => setForm({ ...form, phoneNumber: v })}
                />
              </div>
            </div>

            {form.type === 'interno' && (
              <div className="space-y-2">
                <Label>{t('catalogs.clients.department')}</Label>
                <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className={SELECT_CLASS}>
                  <option value="">{t('catalogs.clients.selectDepartment')}</option>
                  {activeDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('catalogs.clients.billingData')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F5F5F7] rounded-xl p-3">
                <Input placeholder={t('catalogs.clients.businessName')} value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
                <Input placeholder={t('catalogs.clients.taxId')} value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
                <div className="sm:col-span-2">
                  <Input placeholder={t('catalogs.clients.address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleSave} className="flex-1 bg-corporate hover:bg-corporate/90">
                {editing ? t('catalogs.common.update') : t('catalogs.common.create')}
              </Button>
              <Button variant="outline" onClick={() => setShowModal(false)} className="w-full sm:w-auto">
                {t('catalogs.common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
