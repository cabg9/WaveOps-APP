// ═══════════════════════════════════════════════════════════════════
// UBICACIONES TAB - Infraestructura transversal (Fase 0 del plano maestro)
// ═══════════════════════════════════════════════════════════════════
// Tipos, grupos y ubicaciones que usarán Inventario, Compras, etc.
// Cero datos hardcodeados en la UI: las semillas se cargan con un
// botón idempotente y quedan como registros normales editables.
// Nunca se borran documentos: baja lógica con isActive:false.

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase-config';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useAudit } from '@/hooks/useAudit';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useFirestoreUsers } from '@/hooks/firestore/useFirestoreUsers';
import { useDynamicDepartments } from '@/hooks/firestore/useDynamicDepartments';
import { getCurrentTenantId } from '@/lib/tenant';
import { registerI18nKeys, t } from '@/lib/i18n';
import { executeWithConfirm } from '@/lib/confirm-action';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Power, MapPin, Layers, Tag, Database, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Role } from '@/types';
import type { LocationType, LocationGroup, Location } from '@/types/catalogs';
import type { AuditAction } from '@/types/develops';

// ─── Conversión defensiva de timestamps (Firestore Timestamp | ISO string | Date) ───

function toISO(value: any): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  return new Date().toISOString();
}

// ─── Parsers defensivos de documentos ───

function parseType(id: string, data: any): LocationType {
  return {
    id,
    tenantId: data.tenantId || getCurrentTenantId(),
    isActive: data.isActive !== false,
    createdAt: toISO(data.createdAt),
    createdBy: data.createdBy || '',
    updatedAt: data.updatedAt ? toISO(data.updatedAt) : undefined,
    updatedBy: data.updatedBy || undefined,
    name: data.name || '',
    description: data.description || undefined,
    allowedModules: Array.isArray(data.allowedModules) ? data.allowedModules : [],
  };
}

function parseGroup(id: string, data: any): LocationGroup {
  return {
    id,
    tenantId: data.tenantId || getCurrentTenantId(),
    isActive: data.isActive !== false,
    createdAt: toISO(data.createdAt),
    createdBy: data.createdBy || '',
    updatedAt: data.updatedAt ? toISO(data.updatedAt) : undefined,
    updatedBy: data.updatedBy || undefined,
    name: data.name || '',
    description: data.description || undefined,
  };
}

function parseLocation(id: string, data: any): Location {
  return {
    id,
    tenantId: data.tenantId || getCurrentTenantId(),
    isActive: data.isActive !== false,
    createdAt: toISO(data.createdAt),
    createdBy: data.createdBy || '',
    updatedAt: data.updatedAt ? toISO(data.updatedAt) : undefined,
    updatedBy: data.updatedBy || undefined,
    name: data.name || '',
    typeId: data.typeId || '',
    groupId: data.groupId || '',
    country: data.country || undefined,
    city: data.city || undefined,
    province: data.province || undefined,
    address: data.address || undefined,
    responsibleUserId: data.responsibleUserId || undefined,
    responsibleDepartmentId: data.responsibleDepartmentId || undefined,
    relatedModules: Array.isArray(data.relatedModules) ? data.relatedModules : [],
    notes: data.notes || undefined,
  };
}

// ─── Semillas deterministas (ids fijos; si el doc existe no se pisa) ───

const SEED_TYPES = [
  { id: 'tipo_administrativa', name: 'Administrativa', description: 'Oficinas y sedes administrativas' },
  { id: 'tipo_almacenaje', name: 'Almacenaje', description: 'Bodegas y puntos de almacenamiento' },
  { id: 'tipo_operativa', name: 'Operativa', description: 'Puntos de operación en campo' },
  { id: 'tipo_externa', name: 'Externa', description: 'Ubicaciones de terceros o proveedores' },
];

const SEED_GROUPS = [
  { id: 'grupo_compras_pagos', name: 'Compras & Pagos', description: 'Gestión administrativa y financiera' },
  { id: 'grupo_almacenaje', name: 'Almacenaje', description: 'Custodia de inventario' },
  { id: 'grupo_operacion', name: 'Operación', description: 'Operación diaria' },
  { id: 'grupo_externos', name: 'Externos', description: 'Terceros y proveedores' },
];

const SEED_LOCATIONS = [
  { id: 'loc_quito', name: 'Quito', typeName: 'Administrativa', groupName: 'Compras & Pagos', country: 'Ecuador', city: 'Quito', province: 'Pichincha' },
  { id: 'loc_guayaquil', name: 'Guayaquil', typeName: 'Administrativa', groupName: 'Compras & Pagos', country: 'Ecuador', city: 'Guayaquil', province: 'Guayas' },
  { id: 'loc_the_warehouse', name: 'The Warehouse', typeName: 'Almacenaje', groupName: 'Almacenaje', country: 'Ecuador', city: 'Guayaquil', province: 'Guayas' },
  { id: 'loc_dive_shop', name: 'Dive Shop', typeName: 'Operativa', groupName: 'Operación', country: 'Ecuador', city: 'Puerto Ayora', province: 'Galápagos' },
  { id: 'loc_embarcaciones', name: 'Embarcaciones', typeName: 'Operativa', groupName: 'Operación', country: 'Ecuador', city: 'Puerto Ayora', province: 'Galápagos' },
  { id: 'loc_movilidad', name: 'Movilidad', typeName: 'Operativa', groupName: 'Operación', country: 'Ecuador' },
  { id: 'loc_proveedores_externos', name: 'Proveedores externos', typeName: 'Externa', groupName: 'Externos' },
];

type SubTab = 'types' | 'groups' | 'locations';

interface LocationFormState {
  name: string;
  typeId: string;
  groupId: string;
  country: string;
  city: string;
  province: string;
  address: string;
  responsibleUserId: string;
  responsibleDepartmentId: string;
  relatedModules: string[];
  notes: string;
}

const EMPTY_LOCATION_FORM: LocationFormState = {
  name: '',
  typeId: '',
  groupId: '',
  country: '',
  city: '',
  province: '',
  address: '',
  responsibleUserId: '',
  responsibleDepartmentId: '',
  relatedModules: [],
  notes: '',
};

// Crea un documento con ID determinista solo si no existe (idempotente)
async function createSeedDoc(collectionName: string, id: string, data: Record<string, any>): Promise<boolean> {
  const ref = doc(db, collectionName, id);
  const snap = await getDoc(ref);
  if (snap.exists()) return false;
  await setDoc(ref, data);
  return true;
}

export function UbicacionesTab() {
  const { user } = useAuth();
  const { logAction } = useAudit();
  const { modules } = useAppConfig();
  const { users } = useFirestoreUsers();
  const { departmentOptions } = useDynamicDepartments();

  const [types, setTypes] = useState<LocationType[]>([]);
  const [groups, setGroups] = useState<LocationGroup[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>('locations');

  // Modales y formularios
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<LocationType | null>(null);
  const [typeForm, setTypeForm] = useState({ name: '', description: '', allowedModules: [] as string[] });

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LocationGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locForm, setLocForm] = useState<LocationFormState>(EMPTY_LOCATION_FORM);
  // Tarjetas expandibles al clic: varias pueden estar expandidas a la vez (tipos, grupos y ubicaciones)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [seeding, setSeeding] = useState(false);

  // ─── Listeners en tiempo real (onSnapshot + conversión defensiva) ───

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'locationTypes'), (snap) => {
      const items = snap.docs.map((d) => parseType(d.id, d.data()));
      items.sort((a, b) => a.name.localeCompare(b.name));
      setTypes(items);
      setLoading(false);
    }, (err) => {
      console.error('[UbicacionesTab] Error cargando locationTypes:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'locationGroups'), (snap) => {
      const items = snap.docs.map((d) => parseGroup(d.id, d.data()));
      items.sort((a, b) => a.name.localeCompare(b.name));
      setGroups(items);
      setLoading(false);
    }, (err) => {
      console.error('[UbicacionesTab] Error cargando locationGroups:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'locations'), (snap) => {
      const items = snap.docs.map((d) => parseLocation(d.id, d.data()));
      items.sort((a, b) => a.name.localeCompare(b.name));
      setLocations(items);
      setLoading(false);
    }, (err) => {
      console.error('[UbicacionesTab] Error cargando locations:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Seguridad UI: solo DIRECTOR_GENERAL y RRHH gestionan ───

  const canManage = !!user && (user.role === Role.DIRECTOR_GENERAL || user.role === Role.RRHH);

  // ─── Datos derivados ───

  const activeModules = useMemo(() => modules.filter((m) => m.isActive !== false), [modules]);
  const activeTypes = useMemo(() => types.filter((x) => x.isActive), [types]);
  const activeGroups = useMemo(() => groups.filter((x) => x.isActive), [groups]);
  const activeUsers = useMemo(() => users.filter((u) => u.isActive !== false), [users]);

  const typeName = (id: string) => types.find((x) => x.id === id)?.name || '';
  const groupName = (id: string) => groups.find((x) => x.id === id)?.name || '';
  const userName = (id: string) => users.find((u) => u.id === id)?.name || '';

  const moduleLabel = (id: string) => activeModules.find((m) => m.id === id)?.nameEs || activeModules.find((m) => m.id === id)?.name || id;

  const toggleModule = (list: string[], id: string) =>
    list.includes(id) ? list.filter((m) => m !== id) : [...list, id];

  // ─── Abrir modales ───

  const openCreateType = () => {
    setEditingType(null);
    setTypeForm({ name: '', description: '', allowedModules: [] });
    setShowTypeModal(true);
  };

  const openEditType = (item: LocationType) => {
    setEditingType(item);
    setTypeForm({ name: item.name, description: item.description || '', allowedModules: [...item.allowedModules] });
    setShowTypeModal(true);
  };

  const openCreateGroup = () => {
    setEditingGroup(null);
    setGroupForm({ name: '', description: '' });
    setShowGroupModal(true);
  };

  const openEditGroup = (item: LocationGroup) => {
    setEditingGroup(item);
    setGroupForm({ name: item.name, description: item.description || '' });
    setShowGroupModal(true);
  };

  const openCreateLocation = () => {
    setEditingLocation(null);
    setLocForm({ ...EMPTY_LOCATION_FORM, typeId: activeTypes[0]?.id || '', groupId: activeGroups[0]?.id || '' });
    setShowLocationModal(true);
  };

  const openEditLocation = (item: Location) => {
    setEditingLocation(item);
    setLocForm({
      name: item.name,
      typeId: item.typeId,
      groupId: item.groupId,
      country: item.country || '',
      city: item.city || '',
      province: item.province || '',
      address: item.address || '',
      responsibleUserId: item.responsibleUserId || '',
      responsibleDepartmentId: item.responsibleDepartmentId || '',
      relatedModules: [...item.relatedModules],
      notes: item.notes || '',
    });
    setShowLocationModal(true);
  };

  // ─── Guardar: Tipos ───

  const handleSaveType = async () => {
    if (!canManage || !user) return;
    if (!typeForm.name.trim()) {
      toast.error(t('loc.toastNameRequired'));
      return;
    }
    const now = new Date().toISOString();
    try {
      const payload = {
        name: typeForm.name.trim(),
        description: typeForm.description.trim() || undefined,
        allowedModules: typeForm.allowedModules,
        tenantId: getCurrentTenantId(),
        updatedAt: now,
        updatedBy: user.id,
      };
      if (editingType) {
        const prev = { ...editingType };
        await updateDoc(doc(db, 'locationTypes', editingType.id), payload);
        await logAction({
          action: 'LOCATION_TYPE_UPDATED' as AuditAction,
          targetType: 'location_type',
          targetId: editingType.id,
          targetName: payload.name,
          previousValue: prev as unknown as Record<string, any>,
          newValue: payload,
          impactLevel: 'major',
          description: `${t('loc.audit.updateAction')} ${t('loc.audit.typeLabel')} "${payload.name}"`,
        });
        toast.success(t('loc.toastUpdated'));
      } else {
        const ref = await addDoc(collection(db, 'locationTypes'), {
          ...payload,
          isActive: true,
          createdAt: now,
          createdBy: user.id,
        });
        await logAction({
          action: 'LOCATION_TYPE_CREATED' as AuditAction,
          targetType: 'location_type',
          targetId: ref.id,
          targetName: payload.name,
          newValue: payload,
          impactLevel: 'major',
          description: `${t('loc.audit.createAction')} ${t('loc.audit.typeLabel')} "${payload.name}"`,
        });
        toast.success(t('loc.toastCreated'));
      }
      setShowTypeModal(false);
    } catch (err: any) {
      toast.error(t('loc.toastErrorPrefix') + err.message);
    }
  };

  // ─── Guardar: Grupos ───

  const handleSaveGroup = async () => {
    if (!canManage || !user) return;
    if (!groupForm.name.trim()) {
      toast.error(t('loc.toastNameRequired'));
      return;
    }
    const now = new Date().toISOString();
    try {
      const payload = {
        name: groupForm.name.trim(),
        description: groupForm.description.trim() || undefined,
        tenantId: getCurrentTenantId(),
        updatedAt: now,
        updatedBy: user.id,
      };
      if (editingGroup) {
        const prev = { ...editingGroup };
        await updateDoc(doc(db, 'locationGroups', editingGroup.id), payload);
        await logAction({
          action: 'LOCATION_GROUP_UPDATED' as AuditAction,
          targetType: 'location_group',
          targetId: editingGroup.id,
          targetName: payload.name,
          previousValue: prev as unknown as Record<string, any>,
          newValue: payload,
          impactLevel: 'major',
          description: `${t('loc.audit.updateAction')} ${t('loc.audit.groupLabel')} "${payload.name}"`,
        });
        toast.success(t('loc.toastUpdated'));
      } else {
        const ref = await addDoc(collection(db, 'locationGroups'), {
          ...payload,
          isActive: true,
          createdAt: now,
          createdBy: user.id,
        });
        await logAction({
          action: 'LOCATION_GROUP_CREATED' as AuditAction,
          targetType: 'location_group',
          targetId: ref.id,
          targetName: payload.name,
          newValue: payload,
          impactLevel: 'major',
          description: `${t('loc.audit.createAction')} ${t('loc.audit.groupLabel')} "${payload.name}"`,
        });
        toast.success(t('loc.toastCreated'));
      }
      setShowGroupModal(false);
    } catch (err: any) {
      toast.error(t('loc.toastErrorPrefix') + err.message);
    }
  };

  // ─── Guardar: Ubicaciones ───

  const handleSaveLocation = async () => {
    if (!canManage || !user) return;
    if (!locForm.name.trim()) {
      toast.error(t('loc.toastNameRequired'));
      return;
    }
    if (!locForm.typeId || !locForm.groupId) {
      toast.error(t('loc.toastTypeGroupRequired'));
      return;
    }
    const now = new Date().toISOString();
    try {
      const payload = {
        name: locForm.name.trim(),
        typeId: locForm.typeId,
        groupId: locForm.groupId,
        country: locForm.country.trim() || undefined,
        city: locForm.city.trim() || undefined,
        province: locForm.province.trim() || undefined,
        address: locForm.address.trim() || undefined,
        responsibleUserId: locForm.responsibleUserId || undefined,
        responsibleDepartmentId: locForm.responsibleDepartmentId || undefined,
        relatedModules: locForm.relatedModules,
        notes: locForm.notes.trim() || undefined,
        tenantId: getCurrentTenantId(),
        updatedAt: now,
        updatedBy: user.id,
      };
      if (editingLocation) {
        const prev = { ...editingLocation };
        await updateDoc(doc(db, 'locations', editingLocation.id), payload);
        await logAction({
          action: 'LOCATION_UPDATED' as AuditAction,
          targetType: 'location',
          targetId: editingLocation.id,
          targetName: payload.name,
          previousValue: prev as unknown as Record<string, any>,
          newValue: payload,
          impactLevel: 'major',
          description: `${t('loc.audit.updateAction')} ${t('loc.audit.locationLabel')} "${payload.name}"`,
        });
        toast.success(t('loc.toastUpdated'));
      } else {
        const ref = await addDoc(collection(db, 'locations'), {
          ...payload,
          isActive: true,
          createdAt: now,
          createdBy: user.id,
        });
        await logAction({
          action: 'LOCATION_CREATED' as AuditAction,
          targetType: 'location',
          targetId: ref.id,
          targetName: payload.name,
          newValue: payload,
          impactLevel: 'major',
          description: `${t('loc.audit.createAction')} ${t('loc.audit.locationLabel')} "${payload.name}"`,
        });
        toast.success(t('loc.toastCreated'));
      }
      setShowLocationModal(false);
    } catch (err: any) {
      toast.error(t('loc.toastErrorPrefix') + err.message);
    }
  };

  // ─── Activar / Desactivar (soft delete: nunca se borra historial) ───

  const handleToggleActive = async (
    collectionName: 'locationTypes' | 'locationGroups' | 'locations',
    item: { id: string; name: string; isActive: boolean },
    targetType: 'location' | 'location_type' | 'location_group',
    auditAction: string,
  ) => {
    if (!canManage || !user) return;
    const deactivating = item.isActive;
    await executeWithConfirm({
      level: 'major',
      title: deactivating ? t('loc.confirmDeactivateTitle') : t('loc.confirmActivateTitle'),
      message: deactivating ? t('loc.confirmDeactivateMsg') : t('loc.confirmActivateMsg'),
    }, async () => {
      const now = new Date().toISOString();
      await updateDoc(doc(db, collectionName, item.id), {
        isActive: !deactivating,
        updatedAt: now,
        updatedBy: user.id,
      });
      await logAction({
        action: auditAction as AuditAction,
        targetType,
        targetId: item.id,
        targetName: item.name,
        newValue: { isActive: !deactivating },
        impactLevel: 'major',
        description: `${deactivating ? t('loc.audit.deactivateAction') : t('loc.audit.activateAction')} "${item.name}"`,
      });
      toast.success(deactivating ? t('loc.toastToggledInactive') : t('loc.toastToggledActive'));
    });
  };

  // ─── Cargar semillas iniciales (idempotente) ───

  const handleLoadSeeds = async () => {
    if (!canManage || !user || seeding) return;
    await executeWithConfirm({
      level: 'major',
      title: t('loc.confirmSeedTitle'),
      message: t('loc.confirmSeedMsg'),
    }, loadSeeds);
  };

  const loadSeeds = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const tenantId = getCurrentTenantId();
      const now = new Date().toISOString();
      const uid = user.id;
      const base = { tenantId, isActive: true, createdAt: now, createdBy: uid, updatedAt: now, updatedBy: uid };
      let created = 0;

      // 1. Tipos
      for (const seed of SEED_TYPES) {
        if (await createSeedDoc('locationTypes', seed.id, {
          ...base,
          name: seed.name,
          description: seed.description,
          allowedModules: [],
        })) created++;
      }

      // 2. Grupos
      for (const seed of SEED_GROUPS) {
        if (await createSeedDoc('locationGroups', seed.id, {
          ...base,
          name: seed.name,
          description: seed.description,
        })) created++;
      }

      // 3. Ubicaciones: resuelve typeId/groupId buscando por nombre en lo ya cargado;
      //    si no existe, usa el ID determinista del doc semilla (ya creado arriba).
      for (const seed of SEED_LOCATIONS) {
        const ref = doc(db, 'locations', seed.id);
        const snap = await getDoc(ref);
        if (snap.exists()) continue;

        let typeId = types.find((x) => x.name === seed.typeName)?.id;
        if (!typeId) {
          const seedType = SEED_TYPES.find((x) => x.name === seed.typeName);
          typeId = seedType?.id || '';
        }
        let groupId = groups.find((x) => x.name === seed.groupName)?.id;
        if (!groupId) {
          const seedGroup = SEED_GROUPS.find((x) => x.name === seed.groupName);
          groupId = seedGroup?.id || '';
        }
        if (!typeId || !groupId) continue;

        await setDoc(ref, {
          ...base,
          name: seed.name,
          typeId,
          groupId,
          country: seed.country,
          city: seed.city,
          province: seed.province,
          relatedModules: [],
        });
        created++;
      }

      await logAction({
        action: 'LOCATION_SEEDS_LOADED' as AuditAction,
        targetType: 'location',
        targetId: 'seeds',
        targetName: t('loc.audit.seedsTarget'),
        newValue: { created },
        impactLevel: 'major',
        description: t('loc.audit.seedsAction'),
      });

      toast.success(created > 0 ? t('loc.toastSeedsDone') : t('loc.toastSeedsNone'));
    } catch (err: any) {
      toast.error(t('loc.toastErrorPrefix') + err.message);
    } finally {
      setSeeding(false);
    }
  };

  // ─── Render ───

  if (loading) {
    return <div className="p-8 text-center text-[#86868B]">{t('loc.loading')}</div>;
  }

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'types', label: t('loc.tabTypes') },
    { key: 'groups', label: t('loc.tabGroups') },
    { key: 'locations', label: t('loc.tabLocations') },
  ];

  const newButtonLabel =
    subTab === 'types' ? t('loc.btnNewType') : subTab === 'groups' ? t('loc.btnNewGroup') : t('loc.btnNewLocation');

  const openCreate = () => {
    if (subTab === 'types') openCreateType();
    else if (subTab === 'groups') openCreateGroup();
    else openCreateLocation();
  };

  // Fila de detalle para la tarjeta expandible de ubicaciones
  const detailRow = (label: string, value: string | undefined) => (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-[#86868B]">{label}</p>
      <p className="text-xs text-[#1D1D1F] mt-0.5 break-words">{value?.trim() ? value : t('loc.noOption')}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Aviso de solo lectura */}
      {!canManage && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">{t('loc.readonlyNotice')}</p>
        </div>
      )}

      {/* Header con sub-pestañas y acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center bg-[#F5F5F7] rounded-xl p-1">
          {subTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                subTab === tab.key ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#86868B] hover:text-[#1D1D1F]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleLoadSeeds}
              disabled={seeding}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Database className="w-4 h-4" /> {seeding ? t('loc.seeding') : t('loc.btnLoadSeeds')}
            </Button>
            <Button onClick={openCreate} className="bg-corporate hover:bg-corporate/90 flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" /> {newButtonLabel}
            </Button>
          </div>
        )}
      </div>

      {/* ─── SUB-PESTAÑA: TIPOS ─── */}
      {subTab === 'types' && (
        <>
        <div>
          <h2 className="text-base font-semibold text-[#1D1D1F]">{t('loc.tabTypes')}</h2>
          <p className="text-sm text-[#86868B] mt-0.5">{t('loc.helpTypes')}</p>
        </div>
        {types.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-[#86868B] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <Tag className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm">{t('loc.emptyTypes')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
            {types.map((item) => {
              const isExpanded = expandedIds.has(item.id);
              return (
              <div key={item.id} className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => toggleExpanded(item.id)} className="flex items-center gap-3 min-w-0 text-left flex-1">
                    <div className="w-10 h-10 rounded-xl bg-corporate/10 flex items-center justify-center shrink-0">
                      <Tag className="w-5 h-5 text-corporate" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-[#1D1D1F] truncate">{item.name}</h3>
                      <p className="text-xs text-[#86868B] mt-1 line-clamp-2">{item.description || t('loc.noDescription')}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      'text-[11px] font-medium px-2 py-0.5 rounded-full',
                      item.isActive ? 'bg-green-50 text-green-600' : 'bg-[#F5F5F7] text-[#86868B]',
                    )}>
                      {item.isActive ? t('loc.statusActive') : t('loc.statusInactive')}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#86868B]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#86868B]" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F5F5F7]">
                  <span className="text-xs text-[#86868B]">
                    {item.allowedModules.length} {t('loc.modules')}
                  </span>
                  {canManage && (
                    <div className="flex gap-0.5">
                      <button onClick={() => openEditType(item)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]"><Pencil className="w-4 h-4" /></button>
                      <button
                        onClick={() => handleToggleActive('locationTypes', item, 'location_type', item.isActive ? 'LOCATION_TYPE_DEACTIVATED' : 'LOCATION_TYPE_ACTIVATED')}
                        className={cn('p-1.5 rounded-lg text-[#86868B]', item.isActive ? 'hover:bg-red-50 hover:text-red-500' : 'hover:bg-green-50 hover:text-green-600')}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-[#F5F5F7] grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-left">
                    {detailRow(t('loc.fieldName'), item.name)}
                    {detailRow(t('loc.fieldDescription'), item.description)}
                    {detailRow(t('loc.statusLabel'), item.isActive ? t('loc.statusActive') : t('loc.statusInactive'))}
                    {detailRow(t('loc.fieldCreatedAt'), new Date(item.createdAt).toLocaleString('es-EC'))}
                    {item.updatedAt && detailRow(t('loc.fieldUpdatedAt'), new Date(item.updatedAt).toLocaleString('es-EC'))}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )
        }
        </>
      )}

      {/* ─── SUB-PESTAÑA: GRUPOS ─── */}
      {subTab === 'groups' && (
        <>
        <div>
          <h2 className="text-base font-semibold text-[#1D1D1F]">{t('loc.tabGroups')}</h2>
          <p className="text-sm text-[#86868B] mt-0.5">{t('loc.helpGroups')}</p>
        </div>
        {groups.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-[#86868B] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <Layers className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm">{t('loc.emptyGroups')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
            {groups.map((item) => {
              const isExpanded = expandedIds.has(item.id);
              return (
              <div key={item.id} className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => toggleExpanded(item.id)} className="flex items-center gap-3 min-w-0 text-left flex-1">
                    <div className="w-10 h-10 rounded-xl bg-corporate/10 flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5 text-corporate" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-[#1D1D1F] truncate">{item.name}</h3>
                      <p className="text-xs text-[#86868B] mt-1 line-clamp-2">{item.description || t('loc.noDescription')}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      'text-[11px] font-medium px-2 py-0.5 rounded-full',
                      item.isActive ? 'bg-green-50 text-green-600' : 'bg-[#F5F5F7] text-[#86868B]',
                    )}>
                      {item.isActive ? t('loc.statusActive') : t('loc.statusInactive')}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#86868B]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#86868B]" />
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex justify-end gap-0.5 mt-4 pt-3 border-t border-[#F5F5F7]">
                    <button onClick={() => openEditGroup(item)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]"><Pencil className="w-4 h-4" /></button>
                    <button
                      onClick={() => handleToggleActive('locationGroups', item, 'location_group', item.isActive ? 'LOCATION_GROUP_DEACTIVATED' : 'LOCATION_GROUP_ACTIVATED')}
                      className={cn('p-1.5 rounded-lg text-[#86868B]', item.isActive ? 'hover:bg-red-50 hover:text-red-500' : 'hover:bg-green-50 hover:text-green-600')}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-[#F5F5F7] grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-left">
                    {detailRow(t('loc.fieldName'), item.name)}
                    {detailRow(t('loc.fieldDescription'), item.description)}
                    {detailRow(t('loc.statusLabel'), item.isActive ? t('loc.statusActive') : t('loc.statusInactive'))}
                    {detailRow(t('loc.fieldCreatedAt'), new Date(item.createdAt).toLocaleString('es-EC'))}
                    {item.updatedAt && detailRow(t('loc.fieldUpdatedAt'), new Date(item.updatedAt).toLocaleString('es-EC'))}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )
        }
        </>
      )}

      {/* ─── SUB-PESTAÑA: UBICACIONES ─── */}
      {subTab === 'locations' && (
        <>
        <div>
          <h2 className="text-base font-semibold text-[#1D1D1F]">{t('loc.tabLocations')}</h2>
          <p className="text-sm text-[#86868B] mt-0.5">{t('loc.helpLocations')}</p>
        </div>
        {locations.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-[#86868B] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <MapPin className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm">{t('loc.emptyLocations')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
            {locations.map((item) => {
              const isExpanded = expandedIds.has(item.id);
              const responsibleDeptName = departmentOptions.find((d) => d.code === item.responsibleDepartmentId)?.name || '';
              const relatedModuleNames = item.relatedModules.map((m) => moduleLabel(m)).filter(Boolean).join(', ');
              return (
                <div key={item.id} className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className="flex items-center gap-3 min-w-0 text-left flex-1"
                    >
                      <div className="w-10 h-10 rounded-xl bg-corporate/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-corporate" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-[#1D1D1F] truncate">{item.name}</h3>
                        {(item.city || item.country) && (
                          <p className="text-xs text-[#86868B] truncate">
                            {[item.city, item.country].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        'text-[11px] font-medium px-2 py-0.5 rounded-full',
                        item.isActive ? 'bg-green-50 text-green-600' : 'bg-[#F5F5F7] text-[#86868B]',
                      )}>
                        {item.isActive ? t('loc.statusActive') : t('loc.statusInactive')}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#86868B]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#86868B]" />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F5F5F7] text-xs text-[#1D1D1F]">
                      <Tag className="w-3 h-3 text-corporate" /> {typeName(item.typeId) || t('loc.noOption')}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F5F5F7] text-xs text-[#1D1D1F]">
                      <Layers className="w-3 h-3 text-corporate" /> {groupName(item.groupId) || t('loc.noOption')}
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-[#F5F5F7] grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-left">
                      {detailRow(t('loc.fieldType'), typeName(item.typeId))}
                      {detailRow(t('loc.fieldGroup'), groupName(item.groupId))}
                      {detailRow(t('loc.fieldCountry'), item.country)}
                      {detailRow(t('loc.fieldCity'), item.city)}
                      {detailRow(t('loc.fieldProvince'), item.province)}
                      {detailRow(t('loc.fieldAddress'), item.address)}
                      {detailRow(t('loc.fieldResponsibleUser'), item.responsibleUserId ? userName(item.responsibleUserId) : undefined)}
                      {detailRow(t('loc.fieldResponsibleDepartment'), responsibleDeptName)}
                      {detailRow(t('loc.fieldRelatedModules'), relatedModuleNames)}
                      {detailRow(t('loc.fieldNotes'), item.notes)}
                      {detailRow(t('loc.fieldCreatedAt'), new Date(item.createdAt).toLocaleString('es-EC'))}
                      {item.updatedAt && detailRow(t('loc.fieldUpdatedAt'), new Date(item.updatedAt).toLocaleString('es-EC'))}
                    </div>
                  )}
                  {canManage && (
                    <div className="flex justify-end gap-0.5 mt-4 pt-3 border-t border-[#F5F5F7]">
                      <button onClick={() => openEditLocation(item)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]"><Pencil className="w-4 h-4" /></button>
                      <button
                        onClick={() => handleToggleActive('locations', item, 'location', item.isActive ? 'LOCATION_DEACTIVATED' : 'LOCATION_ACTIVATED')}
                        className={cn('p-1.5 rounded-lg text-[#86868B]', item.isActive ? 'hover:bg-red-50 hover:text-red-500' : 'hover:bg-green-50 hover:text-green-600')}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
        }
        </>
      )}

      {/* ─── MODAL: TIPO ─── */}
      <Dialog open={showTypeModal} onOpenChange={setShowTypeModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingType ? t('loc.modalEditType') : t('loc.modalNewType')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('loc.fieldName')}</Label>
              <Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} placeholder={t('loc.fieldName')} />
            </div>
            <div className="space-y-2">
              <Label>{t('loc.fieldDescription')}</Label>
              <Input value={typeForm.description} onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })} placeholder={t('loc.fieldDescription')} />
            </div>
            <div className="space-y-2">
              <Label>{t('loc.fieldAllowedModules')}</Label>
              {activeModules.length === 0 ? (
                <p className="text-sm text-[#86868B]">{t('loc.emptyModules')}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {activeModules.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm text-[#1D1D1F] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={typeForm.allowedModules.includes(m.id)}
                        onChange={() => setTypeForm({ ...typeForm, allowedModules: toggleModule(typeForm.allowedModules, m.id) })}
                        className="rounded border-[#E5E5E7] accent-corporate"
                      />
                      <span className="truncate">{m.nameEs || m.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleSaveType} className="flex-1 bg-corporate hover:bg-corporate/90">
                {editingType ? t('loc.actionUpdate') : t('loc.actionCreate')}
              </Button>
              <Button variant="outline" onClick={() => setShowTypeModal(false)} className="w-full sm:w-auto">
                {t('loc.actionCancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: GRUPO ─── */}
      <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGroup ? t('loc.modalEditGroup') : t('loc.modalNewGroup')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('loc.fieldName')}</Label>
              <Input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder={t('loc.fieldName')} />
            </div>
            <div className="space-y-2">
              <Label>{t('loc.fieldDescription')}</Label>
              <Input value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} placeholder={t('loc.fieldDescription')} />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleSaveGroup} className="flex-1 bg-corporate hover:bg-corporate/90">
                {editingGroup ? t('loc.actionUpdate') : t('loc.actionCreate')}
              </Button>
              <Button variant="outline" onClick={() => setShowGroupModal(false)} className="w-full sm:w-auto">
                {t('loc.actionCancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: UBICACIÓN ─── */}
      <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLocation ? t('loc.modalEditLocation') : t('loc.modalNewLocation')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('loc.fieldName')}</Label>
                <Input value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} placeholder={t('loc.fieldName')} />
              </div>
              <div className="space-y-2">
                <Label>{t('loc.fieldType')}</Label>
                <select
                  value={locForm.typeId}
                  onChange={(e) => setLocForm({ ...locForm, typeId: e.target.value })}
                  className="w-full h-10 rounded-lg border border-[#E5E5E7] bg-white px-3 text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-corporate/20"
                >
                  <option value="">{t('loc.selectType')}</option>
                  {activeTypes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('loc.fieldGroup')}</Label>
                <select
                  value={locForm.groupId}
                  onChange={(e) => setLocForm({ ...locForm, groupId: e.target.value })}
                  className="w-full h-10 rounded-lg border border-[#E5E5E7] bg-white px-3 text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-corporate/20"
                >
                  <option value="">{t('loc.selectGroup')}</option>
                  {activeGroups.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('loc.fieldResponsibleUser')}</Label>
                <select
                  value={locForm.responsibleUserId}
                  onChange={(e) => setLocForm({ ...locForm, responsibleUserId: e.target.value })}
                  className="w-full h-10 rounded-lg border border-[#E5E5E7] bg-white px-3 text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-corporate/20"
                >
                  <option value="">{t('loc.noOption')}</option>
                  {activeUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('loc.fieldCountry')}</Label>
                <Input value={locForm.country} onChange={(e) => setLocForm({ ...locForm, country: e.target.value })} placeholder={t('loc.fieldCountry')} />
              </div>
              <div className="space-y-2">
                <Label>{t('loc.fieldCity')}</Label>
                <Input value={locForm.city} onChange={(e) => setLocForm({ ...locForm, city: e.target.value })} placeholder={t('loc.fieldCity')} />
              </div>
              <div className="space-y-2">
                <Label>{t('loc.fieldProvince')}</Label>
                <Input value={locForm.province} onChange={(e) => setLocForm({ ...locForm, province: e.target.value })} placeholder={t('loc.fieldProvince')} />
              </div>
              <div className="space-y-2">
                <Label>{t('loc.fieldAddress')}</Label>
                <Input value={locForm.address} onChange={(e) => setLocForm({ ...locForm, address: e.target.value })} placeholder={t('loc.fieldAddress')} />
              </div>
              <div className="space-y-2">
                <Label>{t('loc.fieldResponsibleDepartment')}</Label>
                <select
                  value={locForm.responsibleDepartmentId}
                  onChange={(e) => setLocForm({ ...locForm, responsibleDepartmentId: e.target.value })}
                  className="w-full h-10 rounded-lg border border-[#E5E5E7] bg-white px-3 text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-corporate/20"
                >
                  <option value="">{t('loc.noOption')}</option>
                  {departmentOptions.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('loc.fieldRelatedModules')}</Label>
              <p className="text-xs text-[#86868B]">{t('loc.relatedModulesHelp')}</p>
              {activeModules.length === 0 ? (
                <p className="text-sm text-[#86868B]">{t('loc.emptyModules')}</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeModules.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm text-[#1D1D1F] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={locForm.relatedModules.includes(m.id)}
                        onChange={() => setLocForm({ ...locForm, relatedModules: toggleModule(locForm.relatedModules, m.id) })}
                        className="rounded border-[#E5E5E7] accent-corporate"
                      />
                      <span className="truncate">{m.nameEs || m.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('loc.fieldNotes')}</Label>
              <Input value={locForm.notes} onChange={(e) => setLocForm({ ...locForm, notes: e.target.value })} placeholder={t('loc.fieldNotes')} />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleSaveLocation} className="flex-1 bg-corporate hover:bg-corporate/90">
                {editingLocation ? t('loc.actionUpdate') : t('loc.actionCreate')}
              </Button>
              <Button variant="outline" onClick={() => setShowLocationModal(false)} className="w-full sm:w-auto">
                {t('loc.actionCancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// I18N - Todas las claves de la pestaña (es / en con misma estructura)
// ═══════════════════════════════════════════════════════════════════

registerI18nKeys({
  es: {
    'loc.tabTypes': 'Tipos',
    'loc.tabGroups': 'Grupos',
    'loc.tabLocations': 'Ubicaciones',
    'loc.helpTypes': 'Qué clase de lugar es: oficina administrativa, bodega, punto de operación o externo. El tipo define para qué se usa el lugar.',
    'loc.helpGroups': 'Colecciones de lugares para organizarlos y filtrarlos (ej: "Compras & Pagos" agrupa Quito y Guayaquil; "Almacenaje" agrupa todas las bodegas).',
    'loc.helpLocations': 'Los lugares concretos de la empresa. Cada uno es de un Tipo y pertenece a un Grupo.',
    'loc.btnNewType': 'Nuevo tipo',
    'loc.btnNewGroup': 'Nuevo grupo',
    'loc.btnNewLocation': 'Nueva ubicación',
    'loc.btnLoadSeeds': 'Cargar iniciales',
    'loc.seeding': 'Cargando registros...',
    'loc.readonlyNotice': 'Solo Director General y RRHH pueden gestionar tipos, grupos y ubicaciones. Tienes acceso de solo lectura.',
    'loc.loading': 'Cargando ubicaciones...',
    'loc.emptyTypes': 'No hay tipos de ubicación configurados',
    'loc.emptyGroups': 'No hay grupos de ubicaciones configurados',
    'loc.emptyLocations': 'No hay ubicaciones configuradas',
    'loc.emptyModules': 'No hay módulos disponibles',
    'loc.noDescription': 'Sin descripción',
    'loc.noOption': 'Sin asignar',
    'loc.modules': 'módulos',
    'loc.statusActive': 'Activo',
    'loc.statusInactive': 'Inactivo',
    'loc.statusLabel': 'Estado',
    'loc.fieldName': 'Nombre',
    'loc.fieldDescription': 'Descripción',
    'loc.fieldAllowedModules': 'Módulos permitidos',
    'loc.fieldRelatedModules': 'Módulos relacionados',
    'loc.relatedModulesHelp': 'Selecciona qué módulos podrán usar esta ubicación. Por ejemplo: Inventario para bodegas, Compras & Pagos para oficinas.',
    'loc.fieldType': 'Tipo',
    'loc.fieldGroup': 'Grupo',
    'loc.fieldCountry': 'País',
    'loc.fieldCity': 'Ciudad',
    'loc.fieldProvince': 'Provincia',
    'loc.fieldAddress': 'Dirección',
    'loc.fieldResponsibleUser': 'Responsable',
    'loc.fieldResponsibleDepartment': 'Departamento responsable',
    'loc.fieldNotes': 'Notas',
    'loc.fieldCreatedAt': 'Fecha de creación',
    'loc.fieldUpdatedAt': 'Última edición',
    'loc.selectType': 'Selecciona un tipo',
    'loc.selectGroup': 'Selecciona un grupo',
    'loc.modalNewType': 'Nuevo tipo de ubicación',
    'loc.modalEditType': 'Editar tipo de ubicación',
    'loc.modalNewGroup': 'Nuevo grupo de ubicaciones',
    'loc.modalEditGroup': 'Editar grupo',
    'loc.modalNewLocation': 'Nueva ubicación',
    'loc.modalEditLocation': 'Editar ubicación',
    'loc.actionCreate': 'Crear',
    'loc.actionUpdate': 'Actualizar',
    'loc.actionCancel': 'Cancelar',
    'loc.toastNameRequired': 'El nombre es obligatorio',
    'loc.toastTypeGroupRequired': 'Debes seleccionar un tipo y un grupo',
    'loc.toastCreated': 'Registro creado',
    'loc.toastUpdated': 'Registro actualizado',
    'loc.toastToggledActive': 'Registro activado',
    'loc.toastToggledInactive': 'Registro desactivado',
    'loc.toastSeedsDone': 'Registros iniciales cargados',
    'loc.toastSeedsNone': 'Los registros iniciales ya existen',
    'loc.toastErrorPrefix': 'Error: ',
    'loc.confirmSeedTitle': 'Cargar registros iniciales',
    'loc.confirmSeedMsg': 'Se crearán los tipos, grupos y ubicaciones iniciales que falten. Los registros existentes no se modificarán.',
    'loc.confirmDeactivateTitle': 'Desactivar registro',
    'loc.confirmDeactivateMsg': 'El registro se marcará como inactivo. No se elimina el historial y puede reactivarse después.',
    'loc.confirmActivateTitle': 'Activar registro',
    'loc.confirmActivateMsg': 'El registro volverá a estar activo.',
    'loc.audit.createAction': 'Creación de',
    'loc.audit.updateAction': 'Edición de',
    'loc.audit.deactivateAction': 'Desactivación de',
    'loc.audit.activateAction': 'Activación de',
    'loc.audit.seedsAction': 'Carga de registros iniciales de la infraestructura de ubicaciones',
    'loc.audit.seedsTarget': 'Infraestructura de ubicaciones',
    'loc.audit.typeLabel': 'tipo de ubicación',
    'loc.audit.groupLabel': 'grupo de ubicaciones',
    'loc.audit.locationLabel': 'ubicación',
  },
  en: {
    'loc.tabTypes': 'Types',
    'loc.tabGroups': 'Groups',
    'loc.tabLocations': 'Locations',
    'loc.helpTypes': 'What kind of place it is: administrative office, warehouse, operation point or external. The type defines what the place is used for.',
    'loc.helpGroups': 'Collections of places to organize and filter them (e.g. "Purchases & Payments" groups Quito and Guayaquil; "Storage" groups all warehouses).',
    'loc.helpLocations': 'The concrete places of the company. Each one has a Type and belongs to a Group.',
    'loc.btnNewType': 'New type',
    'loc.btnNewGroup': 'New group',
    'loc.btnNewLocation': 'New location',
    'loc.btnLoadSeeds': 'Load initial data',
    'loc.seeding': 'Loading records...',
    'loc.readonlyNotice': 'Only General Director and HR can manage types, groups and locations. You have read-only access.',
    'loc.loading': 'Loading locations...',
    'loc.emptyTypes': 'No location types configured',
    'loc.emptyGroups': 'No location groups configured',
    'loc.emptyLocations': 'No locations configured',
    'loc.emptyModules': 'No modules available',
    'loc.noDescription': 'No description',
    'loc.noOption': 'Unassigned',
    'loc.modules': 'modules',
    'loc.statusActive': 'Active',
    'loc.statusInactive': 'Inactive',
    'loc.statusLabel': 'Status',
    'loc.fieldName': 'Name',
    'loc.fieldDescription': 'Description',
    'loc.fieldAllowedModules': 'Allowed modules',
    'loc.fieldRelatedModules': 'Related modules',
    'loc.relatedModulesHelp': 'Select which modules will be able to use this location. For example: Inventory for warehouses, Purchases & Payments for offices.',
    'loc.fieldType': 'Type',
    'loc.fieldGroup': 'Group',
    'loc.fieldCountry': 'Country',
    'loc.fieldCity': 'City',
    'loc.fieldProvince': 'Province / State',
    'loc.fieldAddress': 'Address',
    'loc.fieldResponsibleUser': 'Responsible person',
    'loc.fieldResponsibleDepartment': 'Responsible department',
    'loc.fieldNotes': 'Notes',
    'loc.fieldCreatedAt': 'Creation date',
    'loc.fieldUpdatedAt': 'Last updated',
    'loc.selectType': 'Select a type',
    'loc.selectGroup': 'Select a group',
    'loc.modalNewType': 'New location type',
    'loc.modalEditType': 'Edit location type',
    'loc.modalNewGroup': 'New location group',
    'loc.modalEditGroup': 'Edit group',
    'loc.modalNewLocation': 'New location',
    'loc.modalEditLocation': 'Edit location',
    'loc.actionCreate': 'Create',
    'loc.actionUpdate': 'Update',
    'loc.actionCancel': 'Cancel',
    'loc.toastNameRequired': 'Name is required',
    'loc.toastTypeGroupRequired': 'You must select a type and a group',
    'loc.toastCreated': 'Record created',
    'loc.toastUpdated': 'Record updated',
    'loc.toastToggledActive': 'Record activated',
    'loc.toastToggledInactive': 'Record deactivated',
    'loc.toastSeedsDone': 'Initial records loaded',
    'loc.toastSeedsNone': 'Initial records already exist',
    'loc.toastErrorPrefix': 'Error: ',
    'loc.confirmSeedTitle': 'Load initial records',
    'loc.confirmSeedMsg': 'Missing initial types, groups and locations will be created. Existing records will not be modified.',
    'loc.confirmDeactivateTitle': 'Deactivate record',
    'loc.confirmDeactivateMsg': 'The record will be marked as inactive. History is kept and it can be reactivated later.',
    'loc.confirmActivateTitle': 'Activate record',
    'loc.confirmActivateMsg': 'The record will be active again.',
    'loc.audit.createAction': 'Creation of',
    'loc.audit.updateAction': 'Edit of',
    'loc.audit.deactivateAction': 'Deactivation of',
    'loc.audit.activateAction': 'Activation of',
    'loc.audit.seedsAction': 'Load of initial location infrastructure records',
    'loc.audit.seedsTarget': 'Location infrastructure',
    'loc.audit.typeLabel': 'location type',
    'loc.audit.groupLabel': 'location group',
    'loc.audit.locationLabel': 'location',
  },
});
