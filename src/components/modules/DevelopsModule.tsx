// ═══════════════════════════════════════════════════════════════════
// DEVELOPS MODULE - Panel maestro de administracion
// ═══════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Users, Puzzle, UserCog, ClipboardList, Lock, Trash2, Building2,
  Activity, Settings, AlertTriangle, ToggleRight, LayoutDashboard,
  ChevronDown, ChevronUp, Pencil, Plus, X, Eye, EyeOff, Mail,
  Search, Filter, RefreshCw, CheckCircle, XCircle,
  LayoutGrid, CalendarClock, Save, Clock, HeartPulse,
} from 'lucide-react';
import {
  collection, doc, updateDoc, addDoc, deleteDoc, getDocs, query, where, onSnapshot,
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAudit } from '@/hooks/useAudit';
import { useFirestoreUsers } from '@/hooks/firestore/useFirestoreUsers';
import { useDynamicDepartments } from '@/hooks/firestore/useDynamicDepartments';
import { useInvitation } from '@/hooks/useInvitation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { executeWithConfirm, getImpactLevelForAction } from '@/lib/confirm-action';
import { DepartamentosTab } from './DepartamentosTab';
import { TurnosTab } from './TurnosTab';

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

type DevelopTab = 'general' | 'usuarios' | 'modulos' | 'departamentos' | 'roles' | 'auditoria' | 'seguridad' | 'papelera' | 'turnos';

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
  { id: 'departamentos', label: 'Departamentos', icon: Building2, description: 'Gestion de departamentos', impact: 'high' },
  { id: 'roles', label: 'Roles', icon: UserCog, description: 'Plantillas de roles y permisos', impact: 'high' },
  { id: 'auditoria', label: 'Auditoria', icon: ClipboardList, description: 'Logs de actividad', impact: 'low' },
  { id: 'seguridad', label: 'Seguridad', icon: Lock, description: 'Politicas de seguridad', impact: 'high' },
  { id: 'papelera', label: 'Papelera', icon: Trash2, description: 'Elementos eliminados', impact: 'medium' },
  { id: 'turnos', label: 'Turnos', icon: Clock, description: 'Gestion de turnos por departamento', impact: 'high' },
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

function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let pw = '';
  for (let i = 0; i < 10; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
  return pw;
}

function UsuariosTab() {
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const { sendInvitation } = useInvitation();
  const [sendInvite, setSendInvite] = useState(true);
  const { users, loading, createUser, updateUser, softDeleteUser, restoreUser, trashedUsers } = useFirestoreUsers();
  const { departmentOptions } = useDynamicDepartments();
  const { settings, roleTemplates } = useAppConfig();
  const { logAction } = useAudit();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', lastName: '', email: '', role: '', department: '',
    joinDate: '',
    position: '', level: 0, isActive: true, phone: '', password: generateTempPassword(),
  });

  const roleLabels: Record<string, string> = {};
  roleTemplates.forEach((r) => { roleLabels[r.id] = r.name; });

  const filteredUsers = useMemo(() => {
    let list = users.filter((u) => (showInactive ? u.isActive === false : u.isActive !== false));
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
  }, [users, search, sortField, sortDir, showInactive]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {...formData, name: (formData.name + (formData.lastName ? " " + formData.lastName : "")).trim()} as any);
        await logAction({
          action: 'USER_UPDATED', targetType: 'user', targetId: editingUser.id,
          targetName: formData.name, impactLevel: 'major',
          description: `Usuario "${formData.name}" actualizado`,
        });
      } else {
        const userToCreate = sendInvite 
          ? { ...formData, password: undefined }  // No enviar password temporal
          : formData;
        const result = await createUser({...userToCreate, name: (userToCreate.name + (userToCreate.lastName ? " " + userToCreate.lastName : "")).trim()} as any);
        if (sendInvite) {
          try {
            const ir = await sendInvitation({email: formData.email, name: formData.name, role: formData.role, department: formData.department, userId: result.id});
            setCreatedPassword(ir.emailSent ? 'INVITACION_ENVIADA' : 'EMAIL_FALLIDO');
          } catch { setCreatedPassword('INVITACION_ERROR'); }
        } else { setCreatedPassword(result.password); }
        await logAction({action: 'USER_CREATED', targetType: 'user', targetId: result.id, targetName: formData.name, impactLevel: 'sensitive', description: sendInvite ? `Usuario "${formData.name}" invitado` : `Usuario "${formData.name}" creado`});
      }
      setShowForm(false);
      setEditingUser(null);
      setFormData({ name: '', lastName: '', email: '', role: '', department: '',
    joinDate: '', position: '', level: 0, isActive: true, phone: '', password: generateTempPassword() });
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    }
  };

  const handleNew = () => { setEditingUser(null); setSendInvite(false); setFormData({ name: '', lastName: '', email: '', role: '', department: '',
    joinDate: '', position: '', level: 0, isActive: true, phone: '', password: generateTempPassword() }); setCreatedPassword(null); setShowForm(true); };

  const handleEdit = (u: any) => {
    setEditingUser(u);
    setFormData({
      name: u.name?.split(' ')[0] || '', lastName: u.name?.split(' ').slice(1).join(' ') || '', email: u.email || '', role: u.role || 'STAFF',
      department: u.department || 'DIVE_SHOP', joinDate: u.joinDate || '', position: u.position || '',
      level: u.level || 0, isActive: u.isActive !== false, phone: u.phone || '', password: '',
    });
    setShowForm(true);
  };

  const handleToggleActive = async (u: any, makeActive: boolean) => {
    try {
      const actionLabel = makeActive ? 'activar' : 'desactivar';
      await executeWithConfirm({
        level: makeActive ? 'important' : 'sensitive',
        title: `${makeActive ? 'Activar' : 'Desactivar'} usuario`,
        description: `Desea ${actionLabel} a "${u.name}"?`,
        action: async () => {
          await updateUser(u.id, { isActive: makeActive });
          await logAction({
            action: makeActive ? 'USER_UPDATED' : 'USER_DEACTIVATED',
            targetType: 'user', targetId: u.id, targetName: u.name,
            impactLevel: makeActive ? 'major' : 'sensitive',
            description: `Usuario "${u.name}" ${makeActive ? 'activado' : 'desactivado'}`,
          });
        },
      });
    } catch {
      // Cancelado
    }
  };

  const handleResendInvitation = async (u: any) => {
    if (!u.email || !u.name) { alert('Faltan datos del usuario'); return; }
    setResendingId(u.id);
    try {
      const result = await sendInvitation({
        email: u.email, name: u.name, role: u.role || 'STAFF',
        department: u.department || 'DIVE_SHOP', userId: u.id
      });
      if (result.emailSent) {
        alert('Invitacion reenviada exitosamente a ' + u.email);
      } else {
        alert('Email no enviado. Error: ' + (result.error || 'Desconocido'));
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally { setResendingId(null); }
  };

  const handleDelete = async (u: any) => {
    const deps: string[] = [];
    try {
      const [tasksSnap, shiftsSnap, incapSnap, incidSnap] = await Promise.all([
        getDocs(query(collection(db, 'tasks'), where('assignedTo', 'array-contains', u.id))),
        getDocs(query(collection(db, 'shifts'), where('assignedTo', '==', u.id))),
        getDocs(query(collection(db, 'incapacidades'), where('userId', '==', u.id))),
        getDocs(query(collection(db, 'incidencias'), where('userId', '==', u.id))),
      ]);
      if (!tasksSnap.empty) deps.push(tasksSnap.size + ' tareas');
      if (!shiftsSnap.empty) deps.push(shiftsSnap.size + ' turnos');
      if (!incapSnap.empty) deps.push(incapSnap.size + ' incapacidades');
      if (!incidSnap.empty) deps.push(incidSnap.size + ' incidencias');
    } catch {
      // Si falla la verificacion, pedimos confirmacion extra
    }

    if (deps.length > 0) {
      alert('No se puede eliminar: el usuario tiene dependencias:\n- ' + deps.join('\n- '));
      return;
    }

    try {
      await executeWithConfirm({
        level: 'sensitive',
        title: 'Eliminar usuario',
        description: `Esta accion envia a la papelera a "${u.name}" y se puede restaurar desde la papelera.`,
        action: async () => {
          await softDeleteUser(u.id);
          await logAction({
            action: 'USER_DELETED', targetType: 'user', targetId: u.id,
            targetName: u.name, impactLevel: 'critical',
            description: `Usuario "${u.name}" eliminado permanentemente`,
          });
        },
      });
    } catch {
      // Cancelado por el usuario
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
      {/* Tabs + Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setShowInactive(false)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              !showInactive ? 'bg-[#1D1D1F] text-white' : 'bg-white text-[#86868B] hover:bg-[#F5F5F7]'
            )}
          >
            Activos
          </button>
          <button
            onClick={() => setShowInactive(true)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              showInactive ? 'bg-[#1D1D1F] text-white' : 'bg-white text-[#86868B] hover:bg-[#F5F5F7]'
            )}
          >
            Inactivos
          </button>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20"
            />
          </div>
          {!showInactive && (
            <Button onClick={() => { setShowForm(true); setEditingUser(null); }} className="gap-2">
              <Plus className="w-4 h-4" /> Nuevo
            </Button>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#1D1D1F]">{editingUser ? 'Editar usuario' : 'Nuevo usuario'}</h3>
            <button onClick={() => setShowForm(false)} className="text-[#86868B] hover:text-[#1D1D1F]"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">Nombre</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">Apellido</label>
              <input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">Email</label>
              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20" />
            </div>
            {!editingUser && !sendInvite && (
              <div>
                <label className="block text-xs font-medium text-[#86868B] mb-1">Contraseña temporal</label>
                <div className="flex gap-2">
                  <input type="text" value={formData.password} readOnly
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm bg-gray-50 text-gray-500" />
                  <button type="button" onClick={() => setFormData({...formData, password: generateTempPassword()})}
                    className="px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm hover:bg-gray-50" title="Generar nueva">↻</button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">El usuario debera cambiarla al primer inicio de sesion</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">Rol</label>
              <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20 ${formData.role ? 'border-[#E5E5E7]' : 'border-red-300 bg-red-50'}`}>
                <option value="" disabled>Seleccionar rol</option>
                {roleTemplates.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">Departamento</label>
              <select required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}
                className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20 ${formData.department ? 'border-[#E5E5E7]' : 'border-red-300 bg-red-50'}`}>
                <option value="" disabled>Seleccionar departamento</option>
                {departmentOptions.map(opt => (
                  <option key={opt.code} value={opt.code}>{opt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">Posicion</label>
              <input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">Fecha de ingreso</label>
              <input type="date" value={formData.joinDate || ''} onChange={e => setFormData({...formData, joinDate: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">Nivel</label>
              <select required value={formData.level || ''} onChange={e => setFormData({...formData, level: Number(e.target.value)})}
                className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20 ${formData.level ? 'border-[#E5E5E7]' : 'border-red-300 bg-red-50'}`}>
                <option value="" disabled>Seleccionar nivel</option>
                <option value={1}>1 - Director General</option>
                <option value={2}>2 - Director</option>
                <option value={3}>3 - RRHH / Alta Gerencia</option>
                <option value={4}>4 - Gerente</option>
                <option value={5}>5 - Gerente Departamento</option>
                <option value={6}>6 - Supervisor</option>
                <option value={7}>7 - Staff</option>
              </select>
            </div>
            {!editingUser && (
              <div className="md:col-span-2 flex items-center gap-2">
                <input type="checkbox" checked={sendInvite} onChange={e => setSendInvite(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E5E5E7]" />
                <label className="text-sm text-[#1D1D1F]">Enviar invitacion por email (el usuario creara su propia contrasena)</label>
              </div>
            )}
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
          {createdPassword && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-sm font-medium text-emerald-700 mb-1">Usuario creado exitosamente</div>
              {createdPassword === 'INVITACION_ENVIADA' ? (<><div className="text-xs text-emerald-600">Invitacion enviada por email.</div><div className="text-[10px] text-emerald-500 mt-1">El usuario recibira un email para configurar su cuenta.</div></>) : createdPassword === 'EMAIL_FALLIDO' || createdPassword === 'INVITACION_ERROR' ? (<><div className="text-xs text-amber-600">No se pudo enviar el email.</div><div className="text-[10px] text-amber-500 mt-1">Envia el enlace de invitacion manualmente.</div></>) : (<><div className="text-xs text-emerald-600">Contraseña temporal: <span className="font-mono font-bold">{createdPassword}</span></div><div className="text-[10px] text-emerald-500 mt-1">Guarde esta contraseña.</div></>)}
              <button onClick={() => setCreatedPassword(null)} className="mt-2 text-xs text-emerald-600 hover:text-emerald-800 underline">Cerrar</button>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E5E7]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#86868B] uppercase cursor-pointer" onClick={() => handleSort('name')}>Nombre <SortIcon field="name" /></th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#86868B] uppercase cursor-pointer" onClick={() => handleSort('email')}>Email <SortIcon field="email" /></th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#86868B] uppercase cursor-pointer" onClick={() => handleSort('role')}>Rol <SortIcon field="role" /></th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#86868B] uppercase cursor-pointer" onClick={() => handleSort('department')}>Depto <SortIcon field="department" /></th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#86868B] uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-[#86868B]">{showInactive ? 'No hay usuarios inactivos' : 'No se encontraron usuarios'}</td></tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-[#E5E5E7] last:border-0 hover:bg-[#F5F5F7]/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={u.name} photoUrl={u.photoURL || u.avatar} size="sm" fallbackClassName="bg-corporate/10 text-corporate text-xs" />
                        <span className="text-sm font-medium text-[#1D1D1F]">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#86868B]">{u.email}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-[#F5F5F7] text-[#1D1D1F]">{roleLabels[u.role] || u.role}</span></td>
                    <td className="px-4 py-3 text-sm text-[#86868B]">{u.department?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => window.location.href = "/perfil?userId=" + u.id} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B] hover:text-corporate" title="Ver perfil"><Eye className="w-4 h-4" /></button><button onClick={() => handleEdit(u)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B] hover:text-corporate" title="Editar"><Pencil className="w-4 h-4" /></button>
                        {/* @ts-ignore */}
                        {(u.invitationPending || (!u.authUid && u.isActive)) && !showInactive && (
                          <button onClick={() => handleResendInvitation(u)} disabled={resendingId === u.id} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B] hover:text-corporate disabled:opacity-50" title="Reenviar invitacion">
                            {resendingId === u.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                          </button>
                        )}
                        {showInactive ? (
                          <>
                            <button onClick={() => handleToggleActive(u, true)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B] hover:text-apple-green" title="Reactivar"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(u)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B] hover:text-apple-red" title="Eliminar permanentemente"><Trash2 className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <button onClick={() => handleToggleActive(u, false)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B] hover:text-apple-orange" title="Desactivar"><EyeOff className="w-4 h-4" /></button>
                        )}
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


const levelColor = (level: number) => {
  if (level <= 2) return "bg-gray-100 text-gray-500 border-gray-200";
  if (level <= 4) return "bg-gray-100 text-gray-600 border-gray-200";
  if (level <= 6) return "bg-gray-200 text-gray-700 border-gray-300";
  return "bg-gray-800 text-white border-gray-800";
};

interface PermDef { key: string; label: string; }
interface PermCat { key: string; label: string; icon: React.ReactNode; perms: PermDef[]; }

const PERMISSION_CATEGORIES: PermCat[] = [
  { key: "modules", label: "Modulos", icon: <LayoutGrid size={16} />, perms: [
    {key:"canViewDashboard",label:"Ver Dashboard"},{key:"canViewModuleTasks",label:"Ver Tasks"},
    {key:"canViewModuleHorarios",label:"Ver Horarios"},{key:"canViewModuleDiveOps",label:"Ver DiveOps"},
    {key:"canViewModuleVessels",label:"Ver Vessels"},{key:"canViewModuleMovilidad",label:"Ver Movilidad"},
    {key:"canViewModuleRequisiciones",label:"Ver Requisiciones"},{key:"canViewModuleOrdenesPago",label:"Ver Ordenes Pago"},
    {key:"canViewModuleReportes",label:"Ver Reportes"},{key:"canViewModuleDevelops",label:"Ver Develops"},
  ]},
  { key: "tasks", label: "Tasks", icon: <ClipboardList size={16} />, perms: [
    {key:"canCreateSpecificTask",label:"Crear tarea especifica"},{key:"canCreateExtraTask",label:"Crear tarea extra"},
    {key:"canEditOwnTasks",label:"Editar propias"},{key:"canDeleteOwnTasks",label:"Eliminar propias"},
    {key:"canEditAllTasks",label:"Editar todas"},{key:"canDeleteAllTasks",label:"Eliminar todas"},
    {key:"canVerifyTask",label:"Verificar"},{key:"canRateTask",label:"Calificar"},
    {key:"canBlockTask",label:"Bloquear"},{key:"canUnblockTask",label:"Desbloquear"},{key:"canReopenTask",label:"Reabrir"},
  ]},
  { key: "schedules", label: "Horarios y Turnos", icon: <CalendarClock size={16} />, perms: [
    {key:"canViewTeam",label:"Ver equipo"},{key:"canAssignShifts",label:"Asignar turnos"},
    {key:"canModifyShifts",label:"Modificar turnos"},{key:"canApproveChanges",label:"Aprobar cambios"},
    {key:"canRejectChanges",label:"Rechazar cambios"},{key:"canRequestChange",label:"Solicitar cambios"},
  ]},
  { key: "incapacidades", label: "Incapacidades", icon: <HeartPulse size={16} />, perms: [
    {key:"canViewOwnIncapacidades",label:"Ver propias"},{key:"canViewTeamIncapacidades",label:"Ver del equipo"},
    {key:"canVerifyIncapacidad",label:"Verificar incapacidad"},{key:"canRegisterIncapacidad",label:"Registrar incapacidad"},
    {key:"canRejectIncapacidad",label:"Rechazar incapacidad"},{key:"canRequestIncapacidadDocs",label:"Solicitar documentos"},
    {key:"canUploadIncapacidadDocs",label:"Subir documentos"},
  ]},
  { key: "incidents", label: "Incidencias", icon: <AlertTriangle size={16} />, perms: [
    {key:"canCreateIncidencia",label:"Crear incidencia"},{key:"canViewAllIncidencias",label:"Ver todas"},
    {key:"canViewOperationalIncidencias",label:"Ver operativas"},{key:"canViewOwnDepartmentIncidencias",label:"Ver mi departamento"},
    {key:"canConfirmIncidenciaAsManager",label:"Confirmar como gerente"},{key:"canConfirmIncidenciaAsSupervisor",label:"Confirmar como supervisor"},
    {key:"canResolveIncidencia",label:"Resolver"},{key:"canCloseIncidencia",label:"Cerrar"},{key:"canReopenIncidencia",label:"Reabrir"},
  ]},
  { key: "departments", label: "Departamentos", icon: <Users size={16} />, perms: [
    {key:"canViewAllDepartments",label:"Ver todos"},{key:"canViewOwnDepartment",label:"Ver el mio"},
  ]},
];

const PERM_DESCRIPTIONS: Record<string, string> = {
  "canViewDashboard":"ver el Dashboard","canViewModuleTasks":"ver Tasks","canViewModuleHorarios":"ver Horarios",
  "canViewModuleDiveOps":"ver DiveOps","canViewModuleVessels":"ver Vessels","canViewModuleMovilidad":"ver Movilidad",
  "canViewModuleRequisiciones":"ver Requisiciones","canViewModuleOrdenesPago":"ver Ordenes de Pago",
  "canViewModuleReportes":"ver Reportes","canViewModuleDevelops":"ver Develops",
  "canCreateSpecificTask":"crear tareas especificas","canCreateExtraTask":"crear tareas extra",
  "canEditOwnTasks":"editar tareas propias","canDeleteOwnTasks":"eliminar tareas propias",
  "canEditAllTasks":"editar todas las tareas","canDeleteAllTasks":"eliminar todas las tareas",
  "canVerifyTask":"verificar tareas","canRateTask":"calificar tareas","canBlockTask":"bloquear tareas",
  "canUnblockTask":"desbloquear tareas","canReopenTask":"reabrir tareas",
  "canViewTeam":"ver el equipo","canAssignShifts":"asignar turnos","canModifyShifts":"modificar turnos",
  "canApproveChanges":"aprobar cambios","canRejectChanges":"rechazar cambios","canRequestChange":"solicitar cambios",
  "canViewOwnIncapacidades":"ver incapacidades propias","canViewTeamIncapacidades":"ver incapacidades del equipo",
  "canVerifyIncapacidad":"verificar incapacidades","canRegisterIncapacidad":"registrar incapacidades",
  "canRejectIncapacidad":"rechazar incapacidades","canRequestIncapacidadDocs":"solicitar documentos de incapacidad",
  "canUploadIncapacidadDocs":"subir documentos de incapacidad",
  "canCreateIncidencia":"crear incidencias","canViewAllIncidencias":"ver todas las incidencias",
  "canViewOperationalIncidencias":"ver incidencias operativas","canViewOwnDepartmentIncidencias":"ver incidencias de mi departamento",
  "canConfirmIncidenciaAsManager":"confirmar incidencias como gerente","canConfirmIncidenciaAsSupervisor":"confirmar incidencias como supervisor",
  "canResolveIncidencia":"resolver incidencias","canCloseIncidencia":"cerrar incidencias","canReopenIncidencia":"reabrir incidencias",
  "canViewAllDepartments":"ver todos los departamentos","canViewOwnDepartment":"ver mi departamento",
};

function RoleIcon({ name }: { name: string }) {
  return <div className="h-10 w-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center text-sm font-semibold">{name.charAt(0).toUpperCase()}</div>;
}

function PermDescription({ permKey, checked }: { permKey: string; checked: boolean }) {
  const desc = PERM_DESCRIPTIONS[permKey] || permKey;
  return <span className="text-[10px] text-gray-400 mt-0.5 block leading-tight">{checked ? "Permite " : "Bloquea "}{desc}</span>;
}

function useRolePermissions(roleTemplates: any[]) {
  const [openRole, setOpenRole] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Set<string>>>({});
  const [dirtyRoles, setDirtyRoles] = useState<Set<string>>(new Set());

  const initDraft = useCallback((roleId: string, perms: string[]) => {
    setDrafts(prev => { if (prev[roleId]) return prev; return { ...prev, [roleId]: new Set(perms) }; });
  }, []);

  const toggleRole = useCallback((roleId: string, perms: string[]) => {
    setOpenRole(prev => { const n = prev === roleId ? null : roleId; if (n) initDraft(n, perms); return n; });
  }, [initDraft]);

  const togglePerm = useCallback((roleId: string, permKey: string) => {
    setDrafts(prev => { const d = new Set(prev[roleId]||[]); d.has(permKey) ? d.delete(permKey) : d.add(permKey); return {...prev,[roleId]:d}; });
    setDirtyRoles(prev => new Set(prev).add(roleId));
  }, []);

  const cancelRole = useCallback((roleId: string, originalPerms: string[]) => {
    setDrafts(prev => ({ ...prev, [roleId]: new Set(originalPerms) }));
    setDirtyRoles(prev => { const n = new Set(prev); n.delete(roleId); return n; });
  }, []);

  return { openRole, drafts, dirtyRoles, setDirtyRoles, toggleRole, togglePerm, cancelRole, initDraft };
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={e => { e.stopPropagation(); onChange(); }} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? "bg-gray-700" : "bg-gray-200"}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
    </button>
  );
}

function RolesTab() {
  const { roleTemplates } = useAppConfig();
  const { logAction } = useAudit();
  const { openRole, drafts, dirtyRoles, setDirtyRoles, toggleRole, togglePerm, cancelRole } = useRolePermissions(roleTemplates);

  const handleSave = useCallback(async (roleId: string, roleName: string) => {
    const perms = Array.from(drafts[roleId] || []).filter((p): p is string => typeof p === "string");
    await updateDoc(doc(db, "roleTemplates", roleId), { permissions: perms, updatedAt: new Date().toISOString() });
    await logAction({ action: "ROLE_UPDATED", targetType: "role", targetId: roleId, targetName: roleName, impactLevel: "major", description: `Permisos actualizados para rol "${roleName}"` });
    setDirtyRoles((prev: Set<string>) => { const n = new Set(prev); n.delete(roleId); return n; });
  }, [drafts, logAction]);

  const [savingRole, setSavingRole] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#1D1D1F]">Roles y Permisos</h3>
        <span className="text-sm text-[#86868B]">{roleTemplates.length} roles configurados</span>
      </div>
      <div className="space-y-3">
        {roleTemplates.map((role: any) => {
          const isOpen = openRole === role.id;
          const isDirty = dirtyRoles.has(role.id);
          const currentPerms = drafts[role.id] || new Set(role.permissions || []);
          return (
            <div key={role.id} className={`rounded-2xl border transition-all duration-300 ${isOpen ? "border-gray-300 shadow-[0_2px_12px_rgba(0,0,0,0.06)]" : "border-[#E5E5E7] shadow-[0_2px_8px_rgba(0,0,0,0.04)]"}`}>
              <button onClick={() => toggleRole(role.id, role.permissions || [])} className="flex w-full items-center justify-between p-5 text-left hover:bg-gray-50/50 transition-colors rounded-2xl">
                <div className="flex items-center gap-3">
                  <RoleIcon name={role.name} />
                  <div>
                    <div className="font-semibold text-[#1D1D1F] text-[15px]">{role.name}</div>
                    <div className="text-xs text-[#86868B] mt-0.5">{role.permissions?.length || 0} permisos asignados</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${levelColor(role.level || 1)}`}>Nivel {role.level || 1}</span>
                  {isDirty && <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Modificado</span>}
                  {isOpen ? <ChevronUp size={18} className="text-[#86868B]" /> : <ChevronDown size={18} className="text-[#86868B]" />}
                </div>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-1 border-t border-[#E5E5E7]">
                  {isDirty && (
                    <div className="flex items-center justify-end gap-2 mb-4 mt-3">
                      <button onClick={() => cancelRole(role.id, role.permissions || [])} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-[#86868B] hover:bg-gray-100 transition-colors"><X size={14} /> Cancelar</button>
                      <button onClick={async () => { setSavingRole(role.id); await handleSave(role.id, role.name); setSavingRole(null); }} disabled={savingRole === role.id} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#007AFF] hover:bg-[#0071E3] disabled:opacity-60 transition-colors">
                        {savingRole === role.id ? <><span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</> : <><Save size={14} /> Guardar cambios</>}
                      </button>
                    </div>
                  )}
                  <div className="space-y-3">
                    {PERMISSION_CATEGORIES.map((cat) => {
                      const permsList = cat.perms;
                      const activeInCat = permsList.filter((p) => currentPerms.has(p.key)).length;
                      return (
                        <div key={cat.key} className="rounded-xl border border-[#E5E5E7]">
                          <div className="flex items-center justify-between p-3.5">
                            <div className="flex items-center gap-3">
                              <span className="text-gray-400">{cat.icon}</span>
                              <span className="text-sm font-medium text-[#1D1D1F]">{cat.label}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${activeInCat === permsList.length ? "bg-gray-100 text-gray-500" : activeInCat > 0 ? "bg-gray-200 text-gray-600" : "bg-gray-100 text-gray-500"}`}>{activeInCat}/{permsList.length}</span>
                            </div>
                          </div>
                          <div className="px-3.5 pb-3.5 pt-1 border-t border-[#E5E5E7] bg-gray-50/30">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {permsList.map((perm) => {
                                const checked = currentPerms.has(perm.key);
                                return (
                                  <div key={perm.key} className={`p-2.5 rounded-lg border transition-all ${checked ? "border-gray-300 bg-gray-50" : "border-[#E5E5E7] bg-white hover:border-gray-300"}`}>
                                    <label className="flex items-center justify-between cursor-pointer">
                                      <span className={`text-xs font-medium ${checked ? "text-gray-700" : "text-[#3A3A3C]"}`}>{perm.label}</span>
                                      <Toggle checked={checked} onChange={() => togglePerm(role.id, perm.key)} />
                                    </label>
                                    <PermDescription permKey={perm.key} checked={checked} />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  const { settings, roleTemplates } = useAppConfig();
  const { users } = useFirestoreUsers();
  const { departmentOptions } = useDynamicDepartments();
  const { logAction } = useAudit();
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const sec = settings.security;
  const access = settings.developAccess;

  const dgUsers = useMemo(() => {
    return [...new Set(access.allowedUserIds)].map((email) => users.find((u) => u.email === email)).filter(Boolean) as typeof users;
  }, [users, access.allowedUserIds]);

  const handleAddByEmail = async () => {
    if (!email.trim()) return;
    setAdding(true);
    try {
      const target = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!target) { alert('Usuario no encontrado'); setAdding(false); return; }
      if (access.allowedUserIds.includes(target.email)) {
        alert('Ya tiene acceso'); setAdding(false); return;
      }
      const newIds = [...access.allowedUserIds, target.email];
      await updateDoc(doc(db, 'appSettings', 'global'), {
        'developAccess.allowedUserIds': newIds,
        updatedAt: new Date().toISOString(),
      });
      await logAction({
        action: 'DEVELOP_ACCESS_GRANTED', targetType: 'develop_access', targetId: target.email,
        targetName: target.name, impactLevel: 'sensitive',
        description: `Acceso a Develops otorgado a "${target.name}"`,
      });
      setEmail('');
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (target: any) => {
    try {
      await executeWithConfirm({
        level: 'sensitive',
        title: 'Remover acceso a Develops',
        description: `Desea remover el acceso de "${target.name}"?`,
        action: async () => {
          const newIds = access.allowedUserIds.filter((id: string) => id !== target.email);
          await updateDoc(doc(db, 'appSettings', 'global'), {
            'developAccess.allowedUserIds': newIds,
            updatedAt: new Date().toISOString(),
          });
          await logAction({
            action: 'DEVELOP_ACCESS_REVOKED', targetType: 'develop_access', targetId: target.email,
            targetName: target.name, impactLevel: 'sensitive',
            description: `Acceso a Develops revocado a "${target.name}"`,
          });
        },
      });
    } catch {
      // Cancelado
    }
  };

  return (
    <div className="space-y-6">
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

      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-corporate" />
          <h3 className="font-semibold text-[#1D1D1F]">Usuarios con acceso a Develops</h3>
        </div>
        <div className="flex gap-2 mb-4">
          <select value={email} onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20 bg-white">
            <option value="">Seleccionar usuario...</option>
            {users
              .filter((u) => u.isActive !== false && !access.allowedUserIds.includes(u.email) && u.email)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((u) => (
                <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
              ))}
          </select>
          <Button onClick={handleAddByEmail} disabled={adding || !email} className="gap-2">
            <Plus className="w-4 h-4" /> Agregar
          </Button>
        </div>
        <div className="space-y-2">
          {dgUsers.length === 0 ? (
            <p className="text-sm text-[#86868B] text-center py-4">No hay usuarios con acceso</p>
          ) : (
            dgUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-xl border border-[#E5E5E7]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-corporate/10 flex items-center justify-center text-xs font-semibold text-corporate">
                    {u.name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1D1D1F]">{u.name}</p>
                    <p className="text-xs text-[#86868B]">{u.email} &middot; {u.role}</p>
                  </div>
                </div>
                <button onClick={() => handleRemove(u)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B] hover:text-apple-red" title="Remover">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// // PESTANA: Papelera — Placeholder
// ═══════════════════════════════════════════════════════════════════

function PapeleraTab() {
  const { logAction } = useAudit();
  const { restoreUser: _restore, deleteUser: _delete, trashedUsers } = useFirestoreUsers();
  const { departmentOptions, getDeptName } = useDynamicDepartments();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [trashedShifts, setTrashedShifts] = useState<any[]>([]);
  const [trashedDepartments, setTrashedDepartments] = useState<any[]>([]);

  // Escuchar turnos eliminados
  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, 'shifts'), (snap) => {
      const deleted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((s: any) => s.isActive === false);
      setTrashedShifts(deleted);
    });
    return () => unsub();
  }, []);

  // Escuchar departamentos eliminados
  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, 'departments'), (snap) => {
      const deleted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((s: any) => s.isActive === false);
      setTrashedDepartments(deleted);
    });
    return () => unsub();
  }, []);

  const totalItems = trashedUsers.length + trashedShifts.length + trashedDepartments.length;

  const handleRestoreUser = async (u: any) => {
    setRestoringId(u.id);
    await _restore(u.id);
    await logAction({ action: "USER_RESTORED", targetType: "user", targetId: u.id, targetName: u.name, impactLevel: "major", description: `Usuario restaurado: "${u.name}"` });
    setRestoringId(null);
  };

  const handleRestoreShift = async (shift: any) => {
    try {
      await updateDoc(doc(db, 'shifts', shift._docId || shift.id), { isActive: true, deletedAt: null });
      await logAction({ action: "SHIFT_UPDATED", targetType: "shift", targetId: shift.id, targetName: shift.name, impactLevel: "major", description: `Turno restaurado: "${shift.name}"` });
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handlePermanentDeleteShift = async (shift: any) => {
    if (!confirm(`Eliminar permanentemente el turno "${shift.name}"? No se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, 'shifts', shift._docId || shift.id));
      await logAction({ action: "SHIFT_DELETED", targetType: "shift", targetId: shift.id, targetName: shift.name, impactLevel: "critical", description: `Turno eliminado permanentemente: "${shift.name}"` });
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleRestoreDepartment = async (dept: any) => {
    try {
      await updateDoc(doc(db, 'departments', dept._docId || dept.id), { isActive: true, deletedAt: null });
      await logAction({ action: "DEPARTMENT_UPDATED", targetType: "department", targetId: dept.id, targetName: dept.name, impactLevel: "major", description: `Departamento restaurado: "${dept.name}"` });
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handlePermanentDeleteDepartment = async (dept: any) => {
    if (!confirm(`Eliminar permanentemente el departamento "${dept.name}"? No se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, 'departments', dept._docId || dept.id));
      await logAction({ action: "DEPARTMENT_DELETED", targetType: "department", targetId: dept.id, targetName: dept.name, impactLevel: "critical", description: `Departamento eliminado permanentemente: "${dept.name}"` });
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handlePermanentDelete = async (u: any) => {
    try {
      await executeWithConfirm({
        level: 'critical',
        title: 'Eliminar permanentemente',
        description: `Esta accion eliminara a "${u.name}" de forma irreversible.`,
        action: async () => {
          await _delete(u);
          await logAction({ action: 'USER_DELETED', targetType: 'user', targetId: u.id, targetName: u.name, impactLevel: 'critical', description: `Usuario eliminado: "${u.name}"` });
        },
      });
    } catch { /* Cancelado */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#1D1D1F]">Papelera</h3>
        <span className="text-sm text-[#86868B]">{totalItems} elementos</span>
      </div>

      {/* Turnos eliminados */}
      {trashedShifts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[#86868B] uppercase tracking-wide">Turnos eliminados</h4>
          {trashedShifts.map((shift: any) => (
            <div key={shift.id} className="bg-white rounded-xl border border-[#E5E5E7] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: shift.color || '#8E8E93' }}>{(shift.name || "?").charAt(0).toUpperCase()}</div>
                <div>
                  <div className="font-medium text-[#1D1D1F] text-sm">{shift.name}</div>
                  <div className="text-xs text-[#86868B]">{getDeptName(shift.department)} &middot; {shift.startTime} - {shift.endTime}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleRestoreShift(shift)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"><RefreshCw size={14} /> Restaurar</button>
                <button onClick={() => handlePermanentDeleteShift(shift)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#86868B] hover:text-red-500" title="Eliminar permanentemente"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Departamentos eliminados */}
      {trashedDepartments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[#86868B] uppercase tracking-wide">Departamentos eliminados</h4>
          {trashedDepartments.map((dept: any) => (
            <div key={dept.id} className="bg-white rounded-xl border border-[#E5E5E7] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: dept.color || '#8E8E93' }}>{(dept.name || "?").charAt(0).toUpperCase()}</div>
                <div>
                  <div className="font-medium text-[#1D1D1F] text-sm">{dept.name}</div>
                  <div className="text-xs text-[#86868B]">{dept.email || dept.manager || 'Sin email'} &middot; Eliminado {dept.deletedAt ? new Date(dept.deletedAt).toLocaleDateString() : "recientemente"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleRestoreDepartment(dept)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"><RefreshCw size={14} /> Restaurar</button>
                <button onClick={() => handlePermanentDeleteDepartment(dept)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#86868B] hover:text-red-500" title="Eliminar permanentemente"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Usuarios eliminados */}
      {trashedUsers.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[#86868B] uppercase tracking-wide">Usuarios eliminados</h4>
          {trashedUsers.map((u: any) => (
            <div key={u.id} className="bg-white rounded-xl border border-[#E5E5E7] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-semibold">{(u.name || "?").charAt(0).toUpperCase()}</div>
                <div>
                  <div className="font-medium text-[#1D1D1F] text-sm">{u.name}</div>
                  <div className="text-xs text-[#86868B]">{u.email} &middot; Eliminado {u.deletedAt ? new Date(u.deletedAt).toLocaleDateString() : "recientemente"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleRestoreUser(u)} disabled={restoringId === u.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 transition-colors">{restoringId === u.id ? "Restaurando..." : <><RefreshCw size={14} /> Restaurar</>}</button>
                <button onClick={() => handlePermanentDelete(u)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#86868B] hover:text-red-500" title="Eliminar permanentemente"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalItems === 0 && (
        <div className="bg-white rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <Trash2 className="w-12 h-12 text-[#C7C7CC] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">Papelera vacia</h3>
          <p className="text-sm text-[#86868B]">Los elementos eliminados apareceran aqui</p>
        </div>
      )}
    </div>
  );
}

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
    departamentos: <DepartamentosTab />,
    roles: <RolesTab />,
    auditoria: <AuditoriaTab />,
    seguridad: <SeguridadTab />,
    papelera: <PapeleraTab />,
    turnos: <TurnosTab />,
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
