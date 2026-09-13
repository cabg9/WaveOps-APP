// CATALOGOS TAB - Catálogos maestros (Fase 0 del plano maestro)
// Piso de los futuros módulos Inventario y Compras & Pagos.
// Cero datos hardcodeados: todo se crea desde la app.
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus, Pencil, Package, Truck, Layers, Calculator, Megaphone, Users,
  Eye, EyeOff, Upload, Sparkles, Building2, Info, Lock, Tags, Scale,
  Search, Trash2, ArrowUpDown, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useAudit } from '@/hooks/useAudit';
import { useDynamicDepartments } from '@/hooks/firestore/useDynamicDepartments';
import { useStorageUpload } from '@/hooks/firestore/useStorageUpload';
import { executeWithConfirm } from '@/lib/confirm-action';
import { getCurrentTenantId } from '@/lib/tenant';
import { registerI18nKeys, t } from '@/lib/i18n';
import { Role } from '@/types';
import type { AuditAction } from '@/types/develops';
import type {
  CatalogBase, Supplier, SupplierBankAccount, Product, ProductCategory, UnitOfMeasure,
  CostCenter, SalesChannel, Client, ClientType,
} from '@/types/catalogs';

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
    'catalogs.common.empty': 'No hay registros todavía',
    'catalogs.common.required': 'Completa los campos obligatorios',
    'catalogs.common.confirmActivateTitle': 'Activar registro',
    'catalogs.common.confirmActivate': '¿Activar "{name}"? Volverá a estar disponible en los módulos.',
    'catalogs.common.confirmDeactivateTitle': 'Desactivar registro',
    'catalogs.common.confirmDeactivate': '¿Desactivar "{name}"? Quedará oculto pero no se eliminará.',
    'catalogs.common.loadInitial': 'Cargar iniciales',
    'catalogs.common.loadInitialDone': 'Semillas cargadas: {created} nuevas, {existing} ya existían',
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
    'catalogs.suppliers.notes': 'Notas',
    'catalogs.products.title': 'Productos',
    'catalogs.products.count': '{count} producto(s)',
    'catalogs.products.new': 'Nuevo producto',
    'catalogs.products.edit': 'Editar producto',
    'catalogs.products.name': 'Nombre',
    'catalogs.products.nameEn': 'Nombre (inglés)',
    'catalogs.products.category': 'Categoría',
    'catalogs.products.unit': 'Unidad de medida',
    'catalogs.products.sku': 'SKU / Código',
    'catalogs.products.isRentable': 'Es rentable',
    'catalogs.products.isConsumable': 'Es consumible',
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
    'catalogs.common.empty': 'No records yet',
    'catalogs.common.required': 'Please fill in the required fields',
    'catalogs.common.confirmActivateTitle': 'Activate record',
    'catalogs.common.confirmActivate': 'Activate "{name}"? It will become available again in the modules.',
    'catalogs.common.confirmDeactivateTitle': 'Deactivate record',
    'catalogs.common.confirmDeactivate': 'Deactivate "{name}"? It will be hidden but not deleted.',
    'catalogs.common.loadInitial': 'Load initial data',
    'catalogs.common.loadInitialDone': 'Seeds loaded: {created} new, {existing} already existed',
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
    'catalogs.suppliers.notes': 'Notes',
    'catalogs.products.title': 'Products',
    'catalogs.products.count': '{count} product(s)',
    'catalogs.products.new': 'New product',
    'catalogs.products.edit': 'Edit product',
    'catalogs.products.name': 'Name',
    'catalogs.products.nameEn': 'Name (English)',
    'catalogs.products.category': 'Category',
    'catalogs.products.unit': 'Unit of measure',
    'catalogs.products.sku': 'SKU / Code',
    'catalogs.products.isRentable': 'Rentable',
    'catalogs.products.isConsumable': 'Consumable',
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
}

function EntityCard({ name, lines, icon, isActive, canWrite, onEdit, onToggle }: EntityCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-start gap-4 transition-opacity',
        !isActive && 'opacity-60'
      )}
    >
      <div className="h-10 w-10 rounded-xl bg-[#F5F5F7] flex items-center justify-center shrink-0 text-[#86868B]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-[#1D1D1F] truncate">{name}</h3>
          <span
            className={cn(
              'text-[10px] font-medium px-2 py-0.5 rounded-full',
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
      {canWrite && (
        <div className="flex gap-0.5 shrink-0">
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

type SubTab = 'suppliers' | 'products' | 'categories' | 'costCenters' | 'salesChannels' | 'clients';

const SUB_TABS: { key: SubTab; labelKey: string; icon: React.ReactNode }[] = [
  { key: 'suppliers', labelKey: 'catalogs.tabs.suppliers', icon: <Truck className="w-4 h-4" /> },
  { key: 'products', labelKey: 'catalogs.tabs.products', icon: <Package className="w-4 h-4" /> },
  { key: 'categories', labelKey: 'catalogs.tabs.categories', icon: <Layers className="w-4 h-4" /> },
  { key: 'costCenters', labelKey: 'catalogs.tabs.costCenters', icon: <Calculator className="w-4 h-4" /> },
  { key: 'salesChannels', labelKey: 'catalogs.tabs.salesChannels', icon: <Megaphone className="w-4 h-4" /> },
  { key: 'clients', labelKey: 'catalogs.tabs.clients', icon: <Users className="w-4 h-4" /> },
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN: PROVEEDORES
// ═══════════════════════════════════════════════════════════════════

interface SupplierFormState {
  identification: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  bankAccounts: SupplierBankAccount[];
  productCategoryIds: string[];
  costCenterIds: string[];
  paymentTerms: string;
  notes: string;
}

const EMPTY_SUPPLIER: SupplierFormState = {
  identification: '', name: '', contactName: '', email: '', phone: '',
  bankAccounts: [], productCategoryIds: [], costCenterIds: [], paymentTerms: '', notes: '',
};

function newAccountId(): string {
  return `acc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function SuppliersSection({ canWrite }: { canWrite: boolean }) {
  const { user } = useAuth();
  const { logAction } = useAudit();
  const { items: suppliers } = useCatalog<Supplier>('suppliers');
  const { items: productCategories } = useCatalog<ProductCategory>('productCategories');
  const { items: costCenters } = useCatalog<CostCenter>('costCenters');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierFormState>(EMPTY_SUPPLIER);
  const [saving, setSaving] = useState(false);

  const activeCategories = useMemo(() => productCategories.filter((c) => c.isActive), [productCategories]);
  const activeCostCenters = useMemo(() => costCenters.filter((c) => c.isActive), [costCenters]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_SUPPLIER); setShowModal(true); };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    // Migración legacy: si no hay bankAccounts pero sí bankData, migrarlo como cuenta principal
    const existingAccounts: SupplierBankAccount[] =
      s.bankAccounts && s.bankAccounts.length > 0
        ? s.bankAccounts
        : s.bankData && (s.bankData.bank || s.bankData.accountType || s.bankData.accountNumber)
          ? [{
              id: newAccountId(),
              bank: s.bankData.bank || '',
              accountType: s.bankData.accountType || '',
              accountNumber: s.bankData.accountNumber || '',
              isPrimary: true,
            }]
          : [];
    setForm({
      identification: s.identification || '',
      name: s.name || '',
      contactName: s.contactName || '',
      email: s.email || '',
      phone: s.phone || '',
      bankAccounts: existingAccounts,
      productCategoryIds: s.productCategoryIds ? [...s.productCategoryIds] : [],
      costCenterIds: s.costCenterIds ? [...s.costCenterIds] : [],
      paymentTerms: s.paymentTerms || '',
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

  const updateAccount = (id: string, patch: Partial<SupplierBankAccount>) =>
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

  const handleSave = async () => {
    if (!user?.id) return;
    if (!form.identification.trim() || !form.name.trim()) {
      toast.error(t('catalogs.common.required'));
      return;
    }
    setSaving(true);
    const payload: Record<string, any> = {
      identification: form.identification.trim(),
      name: form.name.trim(),
      contactName: form.contactName.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      bankAccounts: form.bankAccounts
        .filter((a) => (a.bank || '').trim() || (a.accountType || '').trim() || (a.accountNumber || '').trim())
        .map((a) => ({
          id: a.id,
          bank: (a.bank || '').trim() || null,
          accountType: (a.accountType || '').trim() || null,
          accountNumber: (a.accountNumber || '').trim() || null,
          isPrimary: !!a.isPrimary,
        })),
      bankData: null, // legacy migrado a bankAccounts
      productCategoryIds: [...form.productCategoryIds],
      costCenterIds: [...form.costCenterIds],
      paymentTerms: form.paymentTerms.trim() || null,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {suppliers.map((s) => (
            <EntityCard
              key={s.id}
              name={s.name}
              lines={[s.identification, [s.contactName, s.phone].filter(Boolean).join(' · '), s.email, accountsLine(s)]}
              icon={<Truck className="w-5 h-5" />}
              isActive={s.isActive}
              canWrite={canWrite}
              onEdit={() => openEdit(s)}
              onToggle={() => handleToggle(s)}
            />
          ))}
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
                <Input value={form.phone} onChange={set('phone')} />
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.suppliers.email')}</Label>
                <Input type="email" value={form.email} onChange={set('email')} />
              </div>
              <div className="space-y-2">
                <Label>{t('catalogs.suppliers.paymentTerms')}</Label>
                <Input value={form.paymentTerms} onChange={set('paymentTerms')} />
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
                    <div key={acc.id} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-[#F5F5F7] rounded-xl p-3">
                      <Input placeholder={t('catalogs.suppliers.bank')} value={acc.bank || ''} onChange={(e) => updateAccount(acc.id, { bank: e.target.value })} className="sm:flex-1" />
                      <Input placeholder={t('catalogs.suppliers.accountType')} value={acc.accountType || ''} onChange={(e) => updateAccount(acc.id, { accountType: e.target.value })} className="sm:flex-1" />
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

interface ProductFormState {
  name: string;
  nameEn: string;
  categoryId: string;
  unitId: string;
  sku: string;
  isRentable: boolean;
  isConsumable: boolean;
  preferredSupplierId: string;
}

function ProductsSection({ canWrite }: { canWrite: boolean }) {
  const { user } = useAuth();
  const { logAction } = useAudit();
  const { items: products } = useCatalog<Product>('products');
  const { items: categories } = useCatalog<ProductCategory>('productCategories');
  const { items: units } = useCatalog<UnitOfMeasure>('unitsOfMeasure');
  const { items: suppliers } = useCatalog<Supplier>('suppliers');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>({ name: '', nameEn: '', categoryId: '', unitId: '', sku: '', isRentable: false, isConsumable: true, preferredSupplierId: '' });
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const { uploadImage, uploading } = useStorageUpload();
  const [saving, setSaving] = useState(false);

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
    setForm({ name: '', nameEn: '', categoryId: '', unitId: '', sku: '', isRentable: false, isConsumable: true, preferredSupplierId: '' });
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

  const renderProductCard = (p: Product) => (
    <div
      key={p.id}
      className={cn(
        'bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-start gap-4 transition-opacity',
        !p.isActive && 'opacity-60'
      )}
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
              'text-[10px] font-medium px-2 py-0.5 rounded-full',
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
              <span className="text-[10px] bg-corporate/10 text-corporate px-2 py-0.5 rounded-full">{t('catalogs.products.isRentable')}</span>
            )}
            {p.isConsumable && (
              <span className="text-[10px] bg-[#F5F5F7] text-[#86868B] px-2 py-0.5 rounded-full">{t('catalogs.products.isConsumable')}</span>
            )}
          </div>
        </div>
      </div>
      {canWrite && (
        <div className="flex gap-0.5 shrink-0">
          <button onClick={() => openEdit(p)} title={t('catalogs.common.edit')} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]">
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggle(p)}
            title={p.isActive ? t('catalogs.common.deactivate') : t('catalogs.common.activate')}
            className={cn('p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]', !p.isActive && 'hover:text-emerald-600')}
          >
            {p.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map(renderProductCard)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                </div>
              </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
// SECCIÓN: CLIENTES
// ═══════════════════════════════════════════════════════════════════

interface ClientFormState {
  type: ClientType;
  identification: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
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
    type: 'persona', identification: '', name: '', contactName: '', email: '', phone: '',
    businessName: '', taxId: '', address: '', departmentId: '',
  });
  const [generating, setGenerating] = useState(false);

  const deptName = (id: string) => activeDepartments.find((d) => d.id === id)?.name || '';

  const openCreate = () => {
    setEditing(null);
    setForm({ type: 'persona', identification: '', name: '', contactName: '', email: '', phone: '', businessName: '', taxId: '', address: '', departmentId: '' });
    setShowModal(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({
      type: c.type || 'persona',
      identification: c.identification || '',
      name: c.name || '',
      contactName: c.contactName || '',
      email: c.email || '',
      phone: c.phone || '',
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
    const payload: Record<string, any> = {
      type: form.type,
      identification: form.identification.trim() || null,
      name: form.name.trim(),
      contactName: form.contactName.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
