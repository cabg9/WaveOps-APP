// ═══════════════════════════════════════════════════════════════════
// DEVELOPS MODULE - Panel maestro de administracion
// ═══════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Users, Puzzle, UserCog, ClipboardList, Lock, Trash2,
  Activity, Settings, AlertTriangle, ToggleRight, LayoutDashboard,
  ChevronDown, ChevronUp, Pencil, Plus, X, Eye, EyeOff,
  Search, Filter, RefreshCw, CheckCircle, XCircle,
} from 'lucide-react';
import {
  collection, doc, updateDoc, addDoc, deleteDoc, onSnapshot,
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAudit } from '@/hooks/useAudit';
import { useFirestoreUsers } from '@/hooks/firestore/useFirestoreUsers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

type DevelopTab = 'general' | 'usuarios' | 'modulos' | 'roles' | 'auditoria' | 'seguridad' | 'papelera';

interface TabConfig {
  id: DevelopTab;
  label: string;
  icon: React.ElementType;
  description: string;
  impact: 'low' | 'medium' | 'high';
}

type SortField = 'name' | 'email' | 'role' | 'department' | 'isActive';
type SortDir = 'asc' | 'desc';

// ═══════════════════════════════════════════════════════════════════
// CONFIG TABS
// ═══════════════════════════════════════════════════════════════════

const TABS: TabConfig[] = [
  { id: 'general', label: 'General', icon: Settings, description: 'Configuracion general y feature flags', impact: 'medium' },
  { id: 'usuarios', label: 'Usuarios', icon: Users, description: 'Gestion de usuarios del sistema', impact: 'high' },
  { id: 'modulos', label: 'Modulos', icon: Puzzle, description: 'Activar/desactivar modulos', impact: 'high' },
  { id: 'roles', label: 'Roles', icon: UserCog, description: 'Plantillas de roles y permisos', impact: 'high' },
  { id: 'auditoria', label: 'Auditoria', icon: ClipboardList, description: 'Logs de actividad', impact: 'low' },
  { id: 'seguridad', label: 'Seguridad', icon: Lock, description: 'Politicas de seguridad', impact: 'high' },
  { id: 'papelera', label: 'Papelera', icon: Trash2, description: 'Elementos eliminados', impact: 'medium' },
];

// ═══════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-opacity-10", color.replace("text-", "bg-"))}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-[#1D1D1F] mb-1">{value}</p>
      <p className="text-sm text-[#86868B]">{title}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PESTANA: General — Feature Flags funcionales
// ═══════════════════════════════════════════════════════════════════

function GeneralTab() {
  const { settings, modules } = useAppConfig();
  const { logAction } = useAudit();
  const [saving, setSaving] = useState<string | null>(null);

  const toggleFlag = async (key: string, currentValue: boolean) => {
    setSaving(key);
    try {
      const newFlags = { ...settings.featureFlags, [key]: !currentValue };
      await updateDoc(doc(db, 'appSettings', 'global'), {
        featureFlags: newFlags,
        updatedAt: new Date().toISOString(),
      });
      await logAction({
        action: 'FEATURE_ENABLED',
        targetType: 'feature_flag',
        targetId: key,
        targetName: key,
        previousValue: { [key]: currentValue },
        newValue: { [key]: !currentValue },
        impactLevel: 'major',
        description: `Feature flag "${key}" cambiado a ${!currentValue}`,
      });
    } catch (err) {
      console.error('Error toggling flag:', err);
      alert('Error al cambiar feature flag');
    } finally {
      setSaving(null);
    }
  };

  const toggleModule = async (modId: string, currentActive: boolean) => {
    setSaving(modId);
    try {
      await updateDoc(doc(db, 'appModules', modId), {
        isActive: !currentActive,
        updatedAt: new Date().toISOString(),
      });
      await logAction({
        action: 'MODULE_ACTIVATED',
        targetType: 'module',
        targetId: modId,
        targetName: modId,
        previousValue: { isActive: currentActive },
        newValue: { isActive: !currentActive },
        impactLevel: 'sensitive',
        description: `Modulo "${modId}" ${!currentActive ? 'activado' : 'desactivado'}`,
      });
    } catch (err) {
      console.error('Error toggling module:', err);
      alert('Error al cambiar estado del modulo');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feature Flags */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-4">
          <ToggleRight className="w-5 h-5 text-corporate" />
          <h3 className="font-semibold text-[#1D1D1F]">Feature Flags</h3>
        </div>
        <div className="space-y-3">
          {Object.entries(settings.featureFlags).length === 0 ? (
            <p className="text-sm text-[#86868B]">No hay feature flags configurados</p>
          ) : (
            Object.entries(settings.featureFlags).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-[#E5E5E7] last:border-0">
                <div>
                  <p className="text-sm font-medium text-[#1D1D1F]">{key}</p>
                  <p className="text-xs text-[#86868B]">{value ? 'Activado' : 'Desactivado'}</p>
                </div>
                <button
                  onClick={() => toggleFlag(key, !!value)}
                  disabled={saving === key}
                  className={cn(
                    "w-12 h-7 rounded-full flex items-center px-1 transition-all duration-200",
                    value ? 'bg-corporate' : 'bg-[#E5E5E7]',
                    saving === key && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                    value ? 'translate-x-5' : 'translate-x-0'
                  )} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modulos activos con toggle */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-4">
          <Puzzle className="w-5 h-5 text-corporate" />
          <h3 className="font-semibold text-[#1D1D1F]">Modulos del sistema</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((mod) => (
            <div key={mod.id} className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-colors",
              mod.isActive ? 'border-[#E5E5E7]' : 'border-[#FF3B30]/30 bg-[#FF3B30]/5'
            )}>
              <button
                onClick={() => toggleModule(mod.id, mod.isActive)}
                disabled={saving === mod.id}
                className={cn(
                  "w-10 h-6 rounded-full flex items-center px-0.5 transition-all flex-shrink-0",
                  mod.isActive ? 'bg-corporate' : 'bg-[#E5E5E7]',
                  saving === mod.id && 'opacity-50'
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                  mod.isActive ? 'translate-x-4' : 'translate-x-0'
                )} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1D1D1F] truncate">{mod.name}</p>
                <p className="text-xs text-[#86868B]">{mod.isActive ? 'Activo' : 'Inactivo'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PESTANA: Usuarios — CRUD completo
// ═══════════════════════════════════════════════════════════════════

function UsuariosTab() {
  const { users, loading, createUser, updateUser, deactivateUser } = useFirestoreUsers();
  const { settings, roleTemplates } = useAppConfig();
  const { logAction } = useAudit();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', role: 'STAFF', department: 'DIVE_SHOP',
    position: '', level: 1, isActive: true, phone: '',
  });

  const roleLabels: Record<string, string> = {};
  roleTemplates.forEach((r) => { roleLabels[r.id] = r.name; });

  const filteredUsers = useMemo(() => {
    let list = [...users];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((u) =>
        u.name?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        u.role?.toLowerCase().includes(s)
      );
    }
    list.sort((a, b) => {
      const av = (a as any)[sortField] || '';
      const bv = (b as any)[sortField] || '';
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [users, search, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData as any);
        await logAction({
          action: 'USER_UPDATED', targetType: 'user', targetId: editingUser.id,
          targetName: formData.name, impactLevel: 'major',
          description: `Usuario "${formData.name}" actualizado`,
        });
      } else {
        const id = await createUser(formData as any);
        await logAction({
          action: 'USER_CREATED', targetType: 'user', targetId: id,
          targetName: formData.name, impactLevel: 'sensitive',
          description: `Usuario "${formData.name}" creado`,
        });
      }
      setShowForm(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', role: 'STAFF', department: 'DIVE_SHOP', position: '', level: 1, isActive: true, phone: '' });
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    }
  };

  const handleEdit = (u: any) => {
    setEditingUser(u);
    setFormData({
      name: u.name || '', email: u.email || '', role: u.role || 'STAFF',
      department: u.department || 'DIVE_SHOP', position: u.position || '',
      level: u.level || 1, isActive: u.isActive !== false, phone: u.phone || '',
    });
    setShowForm(true);
  };

  const handleToggleActive = async (u: any) => {
    try {
      await deactivateUser(u.id);
      await logAction({
        action: 'USER_DEACTIVATED', targetType: 'user', targetId: u.id,
        targetName: u.name, impactLevel: 'sensitive',
        description: `Usuario "${u.name}" desactivado`,
      });
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="inline-block w-4">
      {sortField === field && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
    </span>
  );

  if (loading) return <div className="text-center py-8 text-[#86868B]">Cargando usuarios...</div>;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o rol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20"
          />
        </div>
        <Button onClick={() => { setShowForm(true); setEditingUser(null); }} className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo usuario
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#1D1D1F]">{editingUser ? 'Editar usuario' : 'Nuevo usuario'}</h3>
            <button onClick={() => setShowForm(false)} className="text-[#86868B] hover:text-[#1D1D1F]">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">Nombre</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">Email</label>
              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">Rol</label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20">
                {roleTemplates.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">Departamento</label>
              <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20">
                <option value="DIVE_SHOP">Dive Shop</option>
                <option value="ADMINISTRATION">Administracion</option>
                <option value="MANAGEMENT">Management</option>
                <option value="MAINTENANCE">Mantenimiento</option>
                <option value="TRANSPORT">Transporte</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">Posicion</label>
              <input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">Nivel</label>
              <input type="number" min={1} max={10} value={formData.level} onChange={e => setFormData({...formData, level: Number(e.target.value)})}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20" />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})}
                className="w-4 h-4 rounded border-[#E5E5E7]" />
              <label className="text-sm text-[#1D1D1F]">Usuario activo</label>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit">{editingUser ? 'Guardar cambios' : 'Crear usuario'}</Button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E5E7]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#86868B] uppercase cursor-pointer" onClick={() => handleSort('name')}>
                  Nombre <SortIcon field="name" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#86868B] uppercase cursor-pointer" onClick={() => handleSort('email')}>
                  Email <SortIcon field="email" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#86868B] uppercase cursor-pointer" onClick={() => handleSort('role')}>
                  Rol <SortIcon field="role" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#86868B] uppercase cursor-pointer" onClick={() => handleSort('department')}>
                  Depto <SortIcon field="department" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#86868B] uppercase cursor-pointer" onClick={() => handleSort('isActive')}>
                  Estado <SortIcon field="isActive" />
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#86868B] uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-[#86868B]">No se encontraron usuarios</td></tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-[#E5E5E7] last:border-0 hover:bg-[#F5F5F7]/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-corporate/10 flex items-center justify-center text-xs font-semibold text-corporate">
                          {u.name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-[#1D1D1F]">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#86868B]">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-[#F5F5F7] text-[#1D1D1F]">
                        {roleLabels[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#86868B]">{u.department?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-1 rounded-full", u.isActive !== false ? "bg-apple-green/10 text-apple-green" : "bg-apple-red/10 text-apple-red")}>
                        {u.isActive !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(u)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B] hover:text-corporate" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleActive(u)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B] hover:text-apple-red" title={u.isActive !== false ? 'Desactivar' : 'Activar'}>
                          {u.isActive !== false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PESTANA: Modulos — Gestion completa
// ═══════════════════════════════════════════════════════════════════

function ModulosTab() {
  const { modules } = useAppConfig();
  const { logAction } = useAudit();
  const [saving, setSaving] = useState<string | null>(null);

  const toggleModule = async (modId: string, current: boolean) => {
    setSaving(modId);
    try {
      await updateDoc(doc(db, 'appModules', modId), { isActive: !current, updatedAt: new Date().toISOString() });
      await logAction({ action: 'MODULE_ACTIVATED', targetType: 'module', targetId: modId, targetName: modId, previousValue: { isActive: current }, newValue: { isActive: !current }, impactLevel: 'sensitive', description: `Modulo ${modId} ${!current ? 'activado' : 'desactivado'}` });
    } catch (err) { alert('Error: ' + (err as Error).message); }
    finally { setSaving(null); }
  };

  const toggleVisibility = async (modId: string, current: boolean) => {
    setSaving(modId + '_vis');
    try {
      await updateDoc(doc(db, 'appModules', modId), { isVisible: !current, updatedAt: new Date().toISOString() });
      await logAction({ action: 'SETTINGS_UPDATED', targetType: 'module', targetId: modId, targetName: modId, previousValue: { isVisible: current }, newValue: { isVisible: !current }, impactLevel: 'major', description: `Visibilidad de ${modId} cambiada` });
    } catch (err) { alert('Error: ' + (err as Error).message); }
    finally { setSaving(null); }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="space-y-3">
        {modules.map((mod) => (
          <div key={mod.id} className="flex items-center justify-between p-4 rounded-xl border border-[#E5E5E7]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: mod.color + '20' }}>
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: mod.color }} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1D1D1F]">{mod.name}</p>
                <p className="text-xs text-[#86868B]">{mod.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#86868B]">Visible</span>
                <button onClick={() => toggleVisibility(mod.id, mod.isVisible)} disabled={saving === mod.id + '_vis'}
                  className={cn("w-10 h-6 rounded-full flex items-center px-0.5 transition-all", mod.isVisible ? 'bg-corporate' : 'bg-[#E5E5E7]', saving === mod.id + '_vis' && 'opacity-50')}>
                  <div className={cn("w-5 h-5 rounded-full bg-white shadow-sm transition-transform", mod.isVisible ? 'translate-x-4' : 'translate-x-0')} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#86868B]">Activo</span>
                <button onClick={() => toggleModule(mod.id, mod.isActive)} disabled={saving === mod.id}
                  className={cn("w-10 h-6 rounded-full flex items-center px-0.5 transition-all", mod.isActive ? 'bg-corporate' : 'bg-[#E5E5E7]', saving === mod.id && 'opacity-50')}>
                  <div className={cn("w-5 h-5 rounded-full bg-white shadow-sm transition-transform", mod.isActive ? 'translate-x-4' : 'translate-x-0')} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PESTANA: Roles — Visualizacion
// ═══════════════════════════════════════════════════════════════════

function RolesTab() {
  const { roleTemplates } = useAppConfig();

  const levelColor = (level: number) => {
    if (level >= 6) return 'bg-apple-red/10 text-apple-red';
    if (level >= 4) return 'bg-apple-orange/10 text-apple-orange';
    if (level >= 2) return 'bg-apple-blue/10 text-apple-blue';
    return 'bg-apple-green/10 text-apple-green';
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="space-y-3">
        {roleTemplates.map((role) => (
          <div key={role.id} className="flex items-center justify-between p-4 rounded-xl border border-[#E5E5E7]">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", levelColor(role.level))}>
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1D1D1F]">{role.name}</p>
                <p className="text-xs text-[#86868B]">{role.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("text-xs px-2 py-1 rounded-full", levelColor(role.level))}>Nivel {role.level}</span>
              <span className="text-xs text-[#86868B]">{role.permissions?.length || 0} permisos</span>
            </div>
          </div>
        ))}
        {roleTemplates.length === 0 && <p className="text-center py-8 text-[#86868B]">No hay roles configurados</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PESTANA: Auditoria — Logs en tiempo real
// ═══════════════════════════════════════════════════════════════════

function AuditoriaTab() {
  const { logs, loading } = useAudit();
  const [filter, setFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const actions = useMemo(() => {
    const set = new Set(logs.map(l => l.action));
    return Array.from(set).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    let list = [...logs];
    if (filter) {
      const s = filter.toLowerCase();
      list = list.filter(l =>
        l.actorName?.toLowerCase().includes(s) ||
        l.targetName?.toLowerCase().includes(s) ||
        l.description?.toLowerCase().includes(s)
      );
    }
    if (actionFilter) list = list.filter(l => l.action === actionFilter);
    return list.slice(0, 100);
  }, [logs, filter, actionFilter]);

  const impactBadge = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-apple-red/10 text-apple-red';
      case 'high': return 'bg-apple-orange/10 text-apple-orange';
      case 'medium': return 'bg-apple-yellow/10 text-apple-yellow';
      default: return 'bg-apple-green/10 text-apple-green';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
          <input type="text" placeholder="Buscar en logs..." value={filter} onChange={e => setFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20" />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20">
          <option value="">Todas las acciones</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E5E7]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#86868B] uppercase">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#86868B] uppercase">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#86868B] uppercase">Accion</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#86868B] uppercase">Target</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#86868B] uppercase">Impacto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#86868B] uppercase">Descripcion</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-[#86868B]">Cargando logs...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-[#86868B]">No hay logs registrados</td></tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="border-b border-[#E5E5E7] last:border-0 hover:bg-[#F5F5F7]/50">
                    <td className="px-4 py-3 text-xs text-[#86868B] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('es-EC')}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#1D1D1F]">{log.actorName}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-[#F5F5F7] text-[#1D1D1F]">{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#86868B]">{log.targetName}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-1 rounded-full", impactBadge(log.impactLevel))}>{log.impactLevel}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#86868B] max-w-xs truncate">{log.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PESTANA: Seguridad — Visualizacion de politicas
// ═══════════════════════════════════════════════════════════════════

function SeguridadTab() {
  const { settings } = useAppConfig();
  const sec = settings.security;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <h3 className="font-semibold text-[#1D1D1F] mb-4">Politicas de seguridad</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-[#E5E5E7]">
          <p className="text-xs text-[#86868B] mb-1">Minimo de caracteres</p>
          <p className="text-lg font-semibold text-[#1D1D1F]">{sec.passwordMinLength}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#E5E5E7]">
          <p className="text-xs text-[#86868B] mb-1">Requiere mayusculas</p>
          <p className="text-lg font-semibold text-[#1D1D1F]">{sec.passwordRequireUppercase ? 'Si' : 'No'}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#E5E5E7]">
          <p className="text-xs text-[#86868B] mb-1">Requiere numeros</p>
          <p className="text-lg font-semibold text-[#1D1D1F]">{sec.passwordRequireNumbers ? 'Si' : 'No'}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#E5E5E7]">
          <p className="text-xs text-[#86868B] mb-1">Intentos maximos de login</p>
          <p className="text-lg font-semibold text-[#1D1D1F]">{sec.maxLoginAttempts}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#E5E5E7]">
          <p className="text-xs text-[#86868B] mb-1">Timeout de sesion (min)</p>
          <p className="text-lg font-semibold text-[#1D1D1F]">{sec.sessionTimeoutMinutes}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#E5E5E7]">
          <p className="text-xs text-[#86868B] mb-1">Retencion de logs (dias)</p>
          <p className="text-lg font-semibold text-[#1D1D1F]">{sec.auditLogRetentionDays}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PESTANA: Papelera — Placeholder
// ═══════════════════════════════════════════════════════════════════

function PapeleraTab() {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
      <Trash2 className="w-12 h-12 text-[#C7C7CC] mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">Papelera</h3>
      <p className="text-sm text-[#86868B] mb-4">Los elementos eliminados apareceran aqui</p>
      <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full inline-block">Proximamente</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export default function DevelopsModule() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { modules, settings, roleTemplates } = useAppConfig();
  const { logs } = useAudit();
  const [activeTab, setActiveTab] = useState<DevelopTab>('general');

  const tabComponents: Record<DevelopTab, React.ReactNode> = {
    general: <GeneralTab />,
    usuarios: <UsuariosTab />,
    modulos: <ModulosTab />,
    roles: <RolesTab />,
    auditoria: <AuditoriaTab />,
    seguridad: <SeguridadTab />,
    papelera: <PapeleraTab />,
  };

  return (
    <Layout title="Develops" showDate={false}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1D1D1F]">Panel de Administracion</h2>
          <p className="text-sm text-[#86868B]">{user?.name} — {user?.role?.replace(/_/g, ' ')}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Modulos" value={modules.length} icon={Puzzle} color="text-corporate" />
        <StatCard title="Roles" value={roleTemplates.length} icon={UserCog} color="text-apple-blue" />
        <StatCard title="Audit Logs" value={logs.length} icon={ClipboardList} color="text-apple-green" />
        <StatCard title="Usuarios DG" value={settings.developAccess.allowedUserIds.length} icon={Shield} color="text-apple-purple" />
      </div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                isActive
                  ? 'bg-[#1D1D1F] text-white'
                  : 'bg-white text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.impact === 'high' && <AlertTriangle className="w-3 h-3 text-[#FF9500]" />}
            </button>
          );
        })}
      </div>
      <div className="min-h-[400px]">
        {tabComponents[activeTab]}
      </div>
    </Layout>
  );
}
