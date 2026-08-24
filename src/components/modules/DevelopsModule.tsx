// ═══════════════════════════════════════════════════════════════════
// DEVELOPS MODULE - Panel maestro de administracion
// ═══════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Users, Puzzle, UserCog, ClipboardList, Lock, Trash2, Building2,
  Activity, Settings, AlertTriangle, ToggleRight, LayoutDashboard,
  ChevronDown, ChevronUp, Pencil, Plus, X, Eye, EyeOff, Mail,
  Search, Filter, RefreshCw, CheckCircle, XCircle,
  LayoutGrid, CalendarClock, Save, Clock, HeartPulse, MessageSquare, Sun, Code2,
  Briefcase, User, Upload, List,
  Phone, MapPin, Calendar, Globe, Droplets, Pill, Award, CreditCard, Camera,
  Check, Heart, UserCircle, Flag, Droplet, BadgeCheck, IdCard, Edit3,
} from 'lucide-react';
import {
  collection, doc, updateDoc, addDoc, deleteDoc, getDocs, query, where, onSnapshot, orderBy,
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAudit } from '@/hooks/useAudit';
import { useFirestoreUsers } from '@/hooks/firestore/useFirestoreUsers';
import { useFirestorePositions } from '@/hooks/firestore/useFirestorePositions';
import { useDynamicDepartments } from '@/hooks/firestore/useDynamicDepartments';
import { useInvitation } from '@/hooks/useInvitation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/UserAvatar';
import { executeWithConfirm, getImpactLevelForAction } from '@/lib/confirm-action';
import { CORPORATE_COLORS } from '@/lib/colors';
import { ICON_OPTIONS, normalizeIconKey, getIconByValue } from '@/lib/icons';
import type { AppModule } from '@/types/develops';
import { Role } from '@/types';
import { DepartamentosTab } from './DepartamentosTab';
import { TurnosTab } from './TurnosTab';

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

type DevelopTab = 'general' | 'usuarios' | 'modulos' | 'departamentos' | 'roles' | 'posiciones' | 'auditoria' | 'seguridad' | 'papelera' | 'turnos' | 'feedback';

interface TabConfig {
  id: DevelopTab;
  label: string;
  icon: React.ElementType;
  description: string;
  impact: 'low' | 'medium' | 'high';
}

type SortField = 'name' | 'email' | 'role' | 'department' | 'isActive';
type SortDir = 'asc' | 'desc';

const LEVELS = [
  { value: 1, label: '1 - Director General' },
  { value: 2, label: '2 - Director' },
  { value: 3, label: '3 - RRHH' },
  { value: 4, label: '4 - Gerente Operaciones' },
  { value: 5, label: '5 - Gerente Departamento' },
  { value: 6, label: '6 - Supervisor' },
  { value: 7, label: '7 - Staff' },
];

// ═══════════════════════════════════════════════════════════════════
// CONFIG TABS
// ═══════════════════════════════════════════════════════════════════

const TABS: TabConfig[] = [
  { id: 'general', label: 'General', icon: Settings, description: 'Configuracion general y feature flags', impact: 'medium' },
  { id: 'usuarios', label: 'Usuarios', icon: Users, description: 'Gestion de usuarios del sistema', impact: 'high' },
  { id: 'modulos', label: 'Modulos', icon: Puzzle, description: 'Activar/desactivar modulos', impact: 'high' },
  { id: 'departamentos', label: 'Departamentos', icon: Building2, description: 'Gestion de departamentos', impact: 'high' },
  { id: 'roles', label: 'Roles', icon: UserCog, description: 'Plantillas de roles y permisos', impact: 'high' },
  { id: 'posiciones', label: 'Posiciones', icon: Briefcase, description: 'Catalogo de cargos del sistema', impact: 'high' },
  { id: 'auditoria', label: 'Auditoria', icon: ClipboardList, description: 'Logs de actividad', impact: 'low' },
  { id: 'seguridad', label: 'Seguridad', icon: Lock, description: 'Politicas de seguridad', impact: 'high' },
  { id: 'papelera', label: 'Papelera', icon: Trash2, description: 'Elementos eliminados', impact: 'medium' },
  { id: 'turnos', label: 'Turnos', icon: Clock, description: 'Gestion de turnos por departamento', impact: 'high' },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, description: 'Sugerencias y problemas reportados por usuarios', impact: 'low' },
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
      <p className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] mb-1">{value}</p>
      <p className="text-sm text-[#86868B]">{title}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PESTANA: General — Feature Flags funcionales
// ═══════════════════════════════════════════════════════════════════

const FEATURE_FLAG_META: Record<string, { name: string; on: string; off: string }> = {
  enableTasks: {
    name: 'Modulo de tareas',
    on: 'El modulo Tasks esta visible para los usuarios que tengan permiso.',
    off: 'El modulo Tasks esta oculto; nadie podra acceder a el.',
  },
  enableHorarios: {
    name: 'Modulo de horarios',
    on: 'El modulo Horarios esta visible y se pueden asignar turnos.',
    off: 'El modulo Horarios esta oculto; no se podra consultar ni editar la programacion.',
  },
  enableTaskPhotos: {
    name: 'Fotos en tareas',
    on: 'Los usuarios podran adjuntar fotos como evidencia al completar tareas.',
    off: 'No se permitira adjuntar fotos en las tareas.',
  },
  enableTaskSubtasks: {
    name: 'Subtareas',
    on: 'Las tareas podran contener pasos o subtareas obligatorias.',
    off: 'Las tareas no mostraran subtareas.',
  },
  enableTaskRating: {
    name: 'Calificacion de tareas',
    on: 'Si activas esto, los supervisores podran calificar la calidad de las tareas completadas.',
    off: 'Si lo desactivas, nadie podra calificar las tareas y la columna de calificacion desaparecera.',
  },
  enableShiftDraft: {
    name: 'Borradores de horarios',
    on: 'Los gestores podran guardar horarios como borrador antes de publicarlos.',
    off: 'Los cambios en horarios se aplicaran de inmediato sin etapa de borrador.',
  },
  enableIncapacidades: {
    name: 'Incapacidades',
    on: 'Se activa el registro y seguimiento de incapacidades del personal.',
    off: 'El modulo de incapacidades queda oculto.',
  },
  enableIncidencias: {
    name: 'Incidencias',
    on: 'Se activa el modulo de incidencias para reportar y resolver problemas operativos.',
    off: 'El modulo de incidencias queda oculto.',
  },
  enableBetaFeatures: {
    name: 'Funciones beta',
    on: 'Se muestran funciones experimentales en desarrollo (pueden ser inestables).',
    off: 'Solo se muestran las funciones probadas y estables.',
  },
  enableNewDashboard: {
    name: 'Nuevo Dashboard',
    on: 'Los usuarios veran el nuevo diseno del Dashboard.',
    off: 'Se conserva el Dashboard anterior mientras se completa la transicion.',
  },
  enableReportes: {
    name: 'Modulo de reportes',
    on: 'El modulo Reportes esta visible y se pueden consultar los reportes operativos.',
    off: 'El modulo Reportes esta oculto; nadie podra acceder a los reportes.',
  },
  enableOrdenesPago: {
    name: 'Modulo de ordenes de pago',
    on: 'El modulo Ordenes de Pago esta visible y se pueden gestionar pagos.',
    off: 'El modulo Ordenes de Pago esta oculto; no se podran consultar ni crear ordenes.',
  },
  enableDiveOps: {
    name: 'Modulo de DiveOps',
    on: 'El modulo DiveOps esta visible y se pueden gestionar las operaciones de buceo.',
    off: 'El modulo DiveOps esta oculto; nadie podra acceder a las operaciones de buceo.',
  },
  enableRequisiciones: {
    name: 'Modulo de requisiciones',
    on: 'El modulo Requisiciones esta visible y se pueden crear y aprobar requisiciones.',
    off: 'El modulo Requisiciones esta oculto; no se podran gestionar requisiciones.',
  },
  enableMovilidad: {
    name: 'Modulo de movilidad',
    on: 'El modulo Movilidad esta visible y se pueden gestionar vehiculos y traslados.',
    off: 'El modulo Movilidad esta oculto; no se podra consultar ni editar la movilidad.',
  },
  enableVessels: {
    name: 'Modulo de vessels',
    on: 'El modulo Vessels esta visible y se pueden gestionar embarcaciones.',
    off: 'El modulo Vessels esta oculto; no se podra consultar ni editar embarcaciones.',
  },
  enableDevelops: {
    name: 'Modulo de Develops',
    on: 'El modulo Develops (configuracion avanzada) esta visible para quienes tengan permiso.',
    off: 'El modulo Develops esta oculto; solo se podra acceder si se reactiva desde otro canal.',
  },
};

function GeneralTab() {
  const { settings } = useAppConfig();
  const { logAction } = useAudit();
  const [saving, setSaving] = useState<string | null>(null);
  const [branding, setBranding] = useState(settings.branding);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(settings.branding.logoUrl);

  useEffect(() => {
    setBranding(settings.branding);
    setLogoPreview(settings.branding.logoUrl);
    setLogoFile(null);
  }, [settings.branding]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    // Nota: en produccion este archivo debe subirse a Firebase Storage y guardar la URL publica.
    setBranding((prev) => ({ ...prev, logoUrl: url }));
  };

  const toggleFlag = async (key: string, currentValue: boolean) => {
    setSaving(key);
    try {
      const newFlags = { ...settings.featureFlags, [key]: !currentValue };
      await updateDoc(doc(db, 'appSettings', 'global'), {
        featureFlags: newFlags,
        updatedAt: new Date().toISOString(),
      });
      await logAction({
        action: currentValue ? 'FEATURE_DISABLED' : 'FEATURE_ENABLED',
        targetType: 'feature_flag',
        targetId: key,
        targetName: FEATURE_FLAG_META[key]?.name || key,
        previousValue: { [key]: currentValue },
        newValue: { [key]: !currentValue },
        impactLevel: 'major',
        description: `Feature flag "${FEATURE_FLAG_META[key]?.name || key}" cambiado a ${!currentValue}`,
      });
    } catch (err) {
      console.error('Error toggling flag:', err);
      alert('Error al cambiar feature flag');
    } finally {
      setSaving(null);
    }
  };

  const saveBranding = async () => {
    setSaving('branding');
    try {
      await updateDoc(doc(db, 'appSettings', 'global'), {
        branding,
        updatedAt: new Date().toISOString(),
      });
      await logAction({
        action: 'SETTINGS_UPDATED',
        targetType: 'settings',
        targetId: 'global',
        targetName: 'Branding',
        impactLevel: 'major',
        description: 'Datos de branding actualizados',
      });
    } catch (err) {
      console.error('Error saving branding:', err);
      alert('Error al guardar branding');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <p className="text-sm text-[#1D1D1F] leading-relaxed">
          En esta pestana configuras la identidad visual de la aplicacion y los interruptores (feature flags) que activan o desactivan funcionalidades. Los cambios se reflejan de inmediato en toda la plataforma, asi que verifica el impacto antes de guardar.
        </p>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-corporate" />
          <h3 className="font-semibold text-[#1D1D1F]">Configuracion general</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#86868B] mb-1">Nombre de la app</label>
            <input value={branding.appName} disabled className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] bg-[#F5F5F7] text-sm text-[#86868B] cursor-not-allowed" />
            <p className="text-[11px] text-[#86868B] mt-1">El nombre de la aplicacion es fijo y no se puede modificar.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#86868B] mb-1">Nombre de la empresa</label>
            <input value={branding.companyName} onChange={(e) => setBranding({ ...branding, companyName: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#86868B] mb-1">Color principal de marca</label>
            <div className="flex items-center gap-2">
              <input type="color" value={branding.primaryColor} onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })} className="h-9 w-9 rounded border border-[#E5E5E7] p-0.5" />
              <span className="text-sm text-[#86868B]">{branding.primaryColor}</span>
            </div>
            <p className="text-[11px] text-[#86868B] mt-1">Este color representa la marca de la empresa a la que se le presta el servicio y se usa en botones, iconos y acentos.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#86868B] mb-1">Logo de la empresa</label>
            <div className="flex items-center gap-3">
              {(logoPreview || branding.logoUrl) && (
                <img src={logoPreview || branding.logoUrl} alt="Logo preview" className="h-10 w-10 object-contain rounded-lg border border-[#E5E5E7]" />
              )}
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm text-[#1D1D1F] hover:bg-[#F5F5F7] cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-[#86868B]" />
                <span>{logoFile ? logoFile.name : 'Cargar logo'}</span>
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
            </div>
            <p className="text-[11px] text-[#86868B] mt-1">
              Selecciona una imagen desde tu dispositivo. En produccion el archivo debe subirse a Firebase Storage; por ahora se muestra solo la vista previa local.
            </p>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={saveBranding} disabled={saving === 'branding'} className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-corporate hover:bg-corporate/90 disabled:opacity-50 transition-colors">
            {saving === 'branding' ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

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
            Object.entries(settings.featureFlags).map(([key, value]) => {
              const meta = FEATURE_FLAG_META[key] || { name: key, on: 'Funcionalidad controlada por feature flag.', off: 'Funcionalidad controlada por feature flag.' };
              return (
                <div key={key} className="flex items-start justify-between py-3 border-b border-[#E5E5E7] last:border-0">
                  <div className="pr-4">
                    <p className="text-sm font-medium text-[#1D1D1F]">{meta.name}</p>
                    <p className="text-xs text-[#86868B] mt-0.5">{value ? meta.on : meta.off}</p>
                    <p className={cn('text-[10px] mt-0.5 font-medium', value ? 'text-[#34C759]' : 'text-[#FF3B30]')}>{value ? 'Activado' : 'Desactivado'}</p>
                  </div>
                  <button
                    onClick={() => toggleFlag(key, !!value)}
                    disabled={saving === key}
                    className={cn(
                      "w-12 h-7 rounded-full flex items-center px-1 transition-all duration-200 shrink-0 mt-0.5",
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
              );
            })
          )}
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
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const { sendInvitation } = useInvitation();
  const [sendInvite, setSendInvite] = useState(true);
  const { users, loading, createUser, updateUser, softDeleteUser, restoreUser, trashedUsers } = useFirestoreUsers();
  const { departmentOptions, departmentTreeOptions } = useDynamicDepartments();
  const { settings, roleTemplates } = useAppConfig();
  const { logAction } = useAudit();
  const { positions, createPosition } = useFirestorePositions();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editingExpandedUserId, setEditingExpandedUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', lastName: '', email: '', role: '', department: '',
    joinDate: '',
    position: '', level: 0, isActive: true, phone: '', password: generateTempPassword(),
  });
  const [profileFormData, setProfileFormData] = useState({
    name: '', displayName: '', email: '', phone: '', phoneCountry: '+593', nationality: '',
    birthDate: '', cedula: '', passport: '', address: '', bloodType: '', allergies: '',
    medications: '', emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
    certificationNumber: '', certificationExpiry: '', apneaCert: '', bankCountry: '', bankName: '',
    accountType: '', accountNumber: '', routingNumber: '', photoURL: '', role: '', department: '',
    position: '', level: 7, joinDate: '', isActive: true,
  });

  const roleLabels: Record<string, string> = {};
  roleTemplates.forEach((r) => { roleLabels[r.id] = r.name; });

  const counts = useMemo(() => ({
    directorGeneral: users.filter((u) => u.role === 'DIRECTOR_GENERAL').length,
    rrhh: users.filter((u) => u.role === 'RRHH').length,
    gerenteOperaciones: users.filter((u) => u.role === 'GERENTE_OPERACIONES').length,
    active: users.filter((u) => u.isActive !== false).length,
    inactive: users.filter((u) => u.isActive === false).length,
    pending: users.filter((u) => u.invitationPending === true && u.isActive !== false).length,
  }), [users]);

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

  const toggleExpanded = (id: string) => {
    setExpandedUserId((prev) => (prev === id ? null : id));
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
          ? { ...formData, password: undefined }
          : formData;
        const result = await createUser({...userToCreate, name: (userToCreate.name + (userToCreate.lastName ? " " + userToCreate.lastName : "")).trim()} as any);
        if (sendInvite) {
          try {
            const ir = await sendInvitation({email: formData.email, name: formData.name, role: formData.role, department: formData.department, userId: result.id});
            setCreatedPassword(ir.emailSent ? 'INVITACION_ENVIADA' : 'EMAIL_FALLIDO');
            setInvitationLink(ir.link || null);
          } catch { setCreatedPassword('INVITACION_ERROR'); setInvitationLink(null); }
        } else { setCreatedPassword(result.password); setInvitationLink(null); }
        await logAction({action: 'USER_CREATED', targetType: 'user', targetId: result.id, targetName: formData.name, impactLevel: 'sensitive', description: sendInvite ? `Usuario "${formData.name}" invitado` : `Usuario "${formData.name}" creado`});
      }
      setShowForm(false);
      setEditingUser(null);
      setExpandedUserId(null);
      setFormData({ name: '', lastName: '', email: '', role: '', department: '',
    joinDate: '', position: '', level: 0, isActive: true, phone: '', password: generateTempPassword() });
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    }
  };

  const handleNew = () => { setEditingUser(null); setSendInvite(false); setFormData({ name: '', lastName: '', email: '', role: '', department: '',
    joinDate: '', position: '', level: 0, isActive: true, phone: '', password: generateTempPassword() }); setCreatedPassword(null); setInvitationLink(null); setShowForm(true); };

  const loadProfileFormData = (u: any) => {
    setProfileFormData({
      name: u.name || '',
      displayName: u.displayName || '',
      email: u.email || '',
      phone: u.phone || '',
      phoneCountry: u.phone?.split(' ')[0] || '+593',
      nationality: u.nationality || '',
      birthDate: u.birthDate || '',
      cedula: u.cedula || '',
      passport: u.passport || '',
      address: u.address || '',
      bloodType: u.bloodType || '',
      allergies: u.allergies || '',
      medications: u.medications || '',
      emergencyContactName: u.emergencyContactName || '',
      emergencyContactPhone: u.emergencyContactPhone || '',
      emergencyContactRelation: u.emergencyContactRelation || '',
      certificationNumber: u.certificationNumber || '',
      certificationExpiry: u.certificationExpiry || '',
      apneaCert: u.apneaCert || '',
      bankCountry: u.bankCountry || '',
      bankName: u.bankName || '',
      accountType: u.accountType || '',
      accountNumber: u.accountNumber || '',
      routingNumber: u.routingNumber || '',
      photoURL: u.photoURL || u.avatar || '',
      role: u.role || '',
      department: u.department || '',
      position: u.position || '',
      level: u.level || 7,
      joinDate: u.joinDate || '',
      isActive: u.isActive !== false,
    });
  };

  const openProfile = (u: any) => {
    setExpandedUserId(u.id);
    setEditingExpandedUserId(null);
    loadProfileFormData(u);
  };

  const startInlineEdit = (u: any) => {
    setExpandedUserId(u.id);
    setEditingExpandedUserId(u.id);
    loadProfileFormData(u);
  };

  const cancelInlineEdit = () => {
    setEditingExpandedUserId(null);
    const u = users.find((x) => x.id === expandedUserId);
    if (u) loadProfileFormData(u);
  };

  const handleProfileSave = async (u: any) => {
    try {
      const updates: any = {
        name: profileFormData.name,
        displayName: profileFormData.displayName,
        email: profileFormData.email,
        phone: profileFormData.phone,
        nationality: profileFormData.nationality,
        birthDate: profileFormData.birthDate,
        cedula: profileFormData.cedula,
        passport: profileFormData.passport,
        address: profileFormData.address,
        bloodType: profileFormData.bloodType,
        allergies: profileFormData.allergies,
        medications: profileFormData.medications,
        emergencyContactName: profileFormData.emergencyContactName,
        emergencyContactPhone: profileFormData.emergencyContactPhone,
        emergencyContactRelation: profileFormData.emergencyContactRelation,
        certificationNumber: profileFormData.certificationNumber,
        certificationExpiry: profileFormData.certificationExpiry,
        apneaCert: profileFormData.apneaCert,
        bankCountry: profileFormData.bankCountry,
        bankName: profileFormData.bankName,
        accountType: profileFormData.accountType,
        accountNumber: profileFormData.accountNumber,
        routingNumber: profileFormData.routingNumber,
        photoURL: profileFormData.photoURL,
        position: profileFormData.position,
        updatedAt: new Date().toISOString(),
      };
      if (user?.role === Role.DIRECTOR_GENERAL) {
        updates.role = profileFormData.role;
        updates.department = profileFormData.department;
        updates.level = Number(profileFormData.level);
        updates.joinDate = profileFormData.joinDate;
        updates.isActive = profileFormData.isActive;
      }
      await updateUser(u.id, updates);
      await logAction({
        action: 'USER_UPDATED', targetType: 'user', targetId: u.id,
        targetName: profileFormData.name, impactLevel: 'major',
        description: `Usuario "${profileFormData.name}" actualizado desde Develops`,
      });
      setEditingExpandedUserId(null);
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    }
  };

  const canEditPersonal = (u: any) => {
    return user?.id === u.id || user?.role === Role.DIRECTOR_GENERAL || user?.role === Role.DIRECTOR;
  };

  const handleEdit = (u: any) => {
    startInlineEdit(u);
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
      if (u.isActive === false || u.deletedAt) {
        await updateUser(u.id, {
          isActive: true,
          deletedAt: null,
          invitationPending: true,
          invitedAt: new Date().toISOString(),
        });
      }
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

  const BLOOD_TYPE_COLORS: Record<string, string> = {
    'A+': 'bg-red-100 text-red-700', 'A-': 'bg-red-50 text-red-600',
    'B+': 'bg-blue-100 text-blue-700', 'B-': 'bg-blue-50 text-blue-600',
    'AB+': 'bg-purple-100 text-purple-700', 'AB-': 'bg-purple-50 text-purple-600',
    'O+': 'bg-green-100 text-green-700', 'O-': 'bg-green-50 text-green-600',
  };

  const getAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const InfoRow = ({ icon: Icon, label, value, missing = 'No registrado' }: any) => (
    <div className="flex items-start gap-3 py-2">
      <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#86868B]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#86868B]">{label}</p>
        <p className="text-sm font-medium text-[#1D1D1F] truncate">{value || missing}</p>
      </div>
    </div>
  );

  const Section = ({ title, icon: Icon, children, color = 'bg-corporate' }: any) => (
    <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className={`h-1 ${color}`} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] flex items-center justify-center">
            <Icon className="w-4 h-4 text-corporate" />
          </div>
          <h3 className="font-semibold text-[#1D1D1F]">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );

  const EditableField = ({ label, field, type = 'text', placeholder = '', selectOptions = null }: any) => {
    const rawValue = profileFormData[field as keyof typeof profileFormData];
    const value = rawValue === undefined || rawValue === null ? '' : String(rawValue);
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-[#86868B]">{label}</Label>
        {selectOptions ? (
          <select
            value={value}
            onChange={e => setProfileFormData(prev => ({ ...prev, [field]: e.target.value }))}
            className="w-full h-10 rounded-xl border border-[#E5E5E7] px-3 text-sm bg-white text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-corporate/20"
          >
            {selectOptions.map((opt: any) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <Input
            type={type}
            value={value}
            onChange={e => setProfileFormData(prev => ({ ...prev, [field]: e.target.value }))}
            placeholder={placeholder}
            className="h-10 rounded-xl border-[#E5E5E7] text-[#1D1D1F] focus:ring-corporate/20"
          />
        )}
      </div>
    );
  };

  if (loading) return <div className="text-center py-8 text-[#86868B]">Cargando usuarios...</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-[#86868B] mb-1">Director General</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{counts.directorGeneral}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-[#86868B] mb-1">RRHH</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{counts.rrhh}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-[#86868B] mb-1">Gerente de Operaciones</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{counts.gerenteOperaciones}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-[#86868B] mb-1">Usuarios activos</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{counts.active}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-[#86868B] mb-1">Usuarios inactivos</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{counts.inactive}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-[#86868B] mb-1">Invitaciones pendientes</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{counts.pending}</p>
        </div>
      </div>

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
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
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
                {departmentTreeOptions.map(opt => (
                  <option key={opt.code} value={opt.code}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">Posicion</label>
              <select
                value={formData.position}
                onChange={async (e) => {
                  const value = e.target.value;
                  if (value === '__create__') {
                    const name = window.prompt('Nombre de la nueva posicion:');
                    if (!name || !name.trim()) {
                      setFormData((prev) => ({ ...prev, position: '' }));
                      return;
                    }
                    const id = await createPosition(
                      { name: name.trim(), level: formData.level || 7, department: formData.department || null, isActive: true },
                      user?.id || 'system'
                    );
                    if (id) {
                      setFormData((prev) => ({ ...prev, position: name.trim() }));
                    } else {
                      alert('Error al crear la posicion');
                      setFormData((prev) => ({ ...prev, position: '' }));
                    }
                  } else {
                    setFormData((prev) => ({ ...prev, position: value }));
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20"
              >
                <option value="">Seleccionar posicion</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
                <option value="__create__">+ Crear nueva posicion</option>
              </select>
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
            <div className={`mt-4 p-4 rounded-xl border ${createdPassword === 'INVITACION_ENVIADA' ? 'bg-emerald-50 border-emerald-200' : createdPassword === 'EMAIL_FALLIDO' || createdPassword === 'INVITACION_ERROR' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className={`text-sm font-medium mb-1 ${createdPassword === 'INVITACION_ENVIADA' ? 'text-emerald-700' : createdPassword === 'EMAIL_FALLIDO' || createdPassword === 'INVITACION_ERROR' ? 'text-amber-700' : 'text-emerald-700'}`}>Usuario creado exitosamente</div>
              {createdPassword === 'INVITACION_ENVIADA' ? (
                <>
                  <div className="text-xs text-emerald-600">Invitacion enviada por email.</div>
                  <div className="text-[10px] text-emerald-500 mt-1">El usuario recibira un email para configurar su cuenta. El envio puede tardar unos minutos.</div>
                </>
              ) : createdPassword === 'EMAIL_FALLIDO' || createdPassword === 'INVITACION_ERROR' ? (
                <>
                  <div className="text-xs text-amber-600">No se pudo enviar el email automaticamente.</div>
                  <div className="text-[10px] text-amber-500 mt-1">Copia el enlace de invitacion y envialo manualmente.</div>
                  {invitationLink && (
                    <div className="mt-2 flex items-center gap-2">
                      <input type="text" value={invitationLink} readOnly className="flex-1 px-2 py-1.5 rounded-lg border border-amber-200 bg-white text-[10px] text-amber-700" />
                      <button type="button" onClick={() => { navigator.clipboard.writeText(invitationLink); alert('Enlace copiado'); }} className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200">Copiar</button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-xs text-emerald-600">Contraseña temporal: <span className="font-mono font-bold">{createdPassword}</span></div>
                  <div className="text-[10px] text-emerald-500 mt-1">Guarde esta contraseña.</div>
                </>
              )}
              <button onClick={() => { setCreatedPassword(null); setInvitationLink(null); }} className={`mt-2 text-xs underline ${createdPassword === 'EMAIL_FALLIDO' || createdPassword === 'INVITACION_ERROR' ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'}`}>Cerrar</button>
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
                  <React.Fragment key={u.id}>
                    <tr
                      className="border-b border-[#E5E5E7] last:border-0 hover:bg-[#F5F5F7]/50 cursor-pointer"
                      onClick={() => toggleExpanded(u.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={u.name} photoUrl={u.photoURL || u.avatar} size="sm" fallbackClassName="bg-corporate/10 text-corporate text-xs" />
                          <span className="text-sm font-medium text-[#1D1D1F]">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#86868B] break-all max-w-[200px]">{u.email}</td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-[#F5F5F7] text-[#1D1D1F]">{roleLabels[u.role] || u.role}</span></td>
                      <td className="px-4 py-3 text-sm text-[#86868B]">{u.department?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openProfile(u)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B] hover:text-corporate" title="Ver perfil"><User className="w-4 h-4" /></button>
                          <button onClick={() => handleEdit(u)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B] hover:text-corporate" title="Editar"><Pencil className="w-4 h-4" /></button>
                          {(showInactive || u.invitationPending || (!u.authUid && u.isActive)) && (
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
                    {expandedUserId === u.id && (
                      <tr className="border-b border-[#E5E5E7] bg-[#F5F5F7]/30">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 mb-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                              <UserAvatar name={u.name} photoUrl={u.photoURL || u.avatar} size="lg" fallbackClassName="bg-corporate/10 text-corporate text-lg" />
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-[#1D1D1F]">{u.name}</h3>
                                <p className="text-sm text-[#86868B]">{roleLabels[u.role] || u.role}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5F5F7] text-xs text-[#86868B]">
                                    <Building2 className="w-3 h-3" /> {u.department?.replace(/_/g, ' ') || 'Sin departamento'}
                                  </span>
                                  {u.bloodType && (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${BLOOD_TYPE_COLORS[u.bloodType] || 'bg-gray-100 text-gray-700'}`}>
                                      <Droplet className="w-3 h-3" /> {u.bloodType}
                                    </span>
                                  )}
                                  {getAge(u.birthDate) !== null && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5F5F7] text-xs text-[#86868B]">
                                      <Calendar className="w-3 h-3" /> {getAge(u.birthDate)} años
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {editingExpandedUserId === u.id ? (
                                  <>
                                    <Button variant="outline" size="sm" onClick={cancelInlineEdit}><X className="w-3.5 h-3.5 mr-1" /> Cancelar</Button>
                                    <Button size="sm" onClick={() => handleProfileSave(u)}><Save className="w-3.5 h-3.5 mr-1" /> Guardar cambios</Button>
                                  </>
                                ) : (
                                  canEditPersonal(u) && (
                                    <Button variant="outline" size="sm" onClick={() => startInlineEdit(u)}><Edit3 className="w-3.5 h-3.5 mr-1" /> Editar</Button>
                                  )
                                )}
                              </div>
                            </div>
                          </div>

                          {editingExpandedUserId === u.id ? (
                            <div className="space-y-4">
                              <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
                                <h4 className="font-semibold text-[#1D1D1F] mb-4">Información Personal</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <EditableField label="Nombre completo" field="name" />
                                  <EditableField label="Nombre para mostrar" field="displayName" placeholder="Como le gusta que le llamen" />
                                  <EditableField label="Nacionalidad" field="nationality" placeholder="Ej: Ecuatoriana" />
                                  <EditableField label="Fecha de nacimiento" field="birthDate" type="date" />
                                  <EditableField label="Cedula / ID" field="cedula" placeholder="1712345678" />
                                  <EditableField label="Pasaporte" field="passport" placeholder="PA123456" />
                                  <div className="md:col-span-2">
                                    <EditableField label="Direccion" field="address" placeholder="Av. Charles Darwin, Puerto Ayora" />
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
                                <h4 className="font-semibold text-[#1D1D1F] mb-4">Contacto</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <EditableField label="Telefono" field="phone" placeholder="+593 987654321" />
                                  <EditableField label="Email" field="email" type="email" />
                                </div>
                              </div>

                              {user?.role === Role.DIRECTOR_GENERAL && (
                                <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
                                  <h4 className="font-semibold text-[#1D1D1F] mb-4">Información laboral</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <EditableField
                                      label="Rol"
                                      field="role"
                                      selectOptions={[
                                        { value: '', label: 'Seleccionar' },
                                        { value: Role.DIRECTOR_GENERAL, label: 'Director General' },
                                        { value: Role.DIRECTOR, label: 'Director' },
                                        { value: Role.RRHH, label: 'RRHH' },
                                        { value: Role.GERENTE_OPERACIONES, label: 'Gerente de Operaciones' },
                                        { value: Role.GERENTE_DEPARTAMENTO, label: 'Gerente de Departamento' },
                                        { value: Role.SUPERVISOR, label: 'Supervisor' },
                                        { value: Role.STAFF, label: 'Staff' },
                                      ]}
                                    />
                                    <EditableField
                                      label="Departamento"
                                      field="department"
                                      selectOptions={[
                                        { value: '', label: 'Seleccionar' },
                                        ...departmentTreeOptions.map((d) => ({ value: d.code, label: d.name })),
                                      ]}
                                    />
                                    <EditableField
                                      label="Posicion"
                                      field="position"
                                      selectOptions={[
                                        { value: '', label: 'Seleccionar' },
                                        ...positions.map((p) => ({ value: p.name, label: p.name })),
                                      ]}
                                    />
                                    <EditableField label="Fecha de ingreso" field="joinDate" type="date" />
                                    <EditableField
                                      label="Nivel"
                                      field="level"
                                      selectOptions={[
                                        { value: 1, label: '1 - Director General' },
                                        { value: 2, label: '2 - Director' },
                                        { value: 3, label: '3 - RRHH' },
                                        { value: 4, label: '4 - Gerente de Operaciones' },
                                        { value: 5, label: '5 - Gerente de Departamento' },
                                        { value: 6, label: '6 - Supervisor' },
                                        { value: 7, label: '7 - Staff' },
                                      ]}
                                    />
                                    <div className="flex items-center gap-2 md:col-span-2">
                                      <input
                                        type="checkbox"
                                        id={`isActive-${u.id}`}
                                        checked={profileFormData.isActive}
                                        onChange={(e) => setProfileFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                        className="rounded border-[#E5E5E7]"
                                      />
                                      <Label htmlFor={`isActive-${u.id}`} className="text-sm text-[#1D1D1F]">Usuario activo</Label>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
                                <h4 className="font-semibold text-[#1D1D1F] mb-4">Salud</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <EditableField
                                    label="Tipo de sangre"
                                    field="bloodType"
                                    selectOptions={[
                                      { value: '', label: 'Seleccionar' },
                                      { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
                                      { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
                                      { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
                                      { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
                                    ]}
                                  />
                                  <EditableField label="Alergias" field="allergies" placeholder="Ninguna" />
                                  <div className="md:col-span-2">
                                    <EditableField label="Medicamentos" field="medications" placeholder="Ninguno" />
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
                                <h4 className="font-semibold text-[#1D1D1F] mb-4">Contacto de Emergencia</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <EditableField label="Nombre" field="emergencyContactName" placeholder="Nombre completo" />
                                  <EditableField label="Telefono" field="emergencyContactPhone" placeholder="+593 987654321" />
                                  <EditableField
                                    label="Relacion"
                                    field="emergencyContactRelation"
                                    selectOptions={[
                                      { value: '', label: 'Seleccionar' },
                                      { value: 'Esposo/a', label: 'Esposo/a' },
                                      { value: 'Padre', label: 'Padre' },
                                      { value: 'Madre', label: 'Madre' },
                                      { value: 'Hijo/a', label: 'Hijo/a' },
                                      { value: 'Hermano/a', label: 'Hermano/a' },
                                      { value: 'Tio/a', label: 'Tio/a' },
                                      { value: 'Primo/a', label: 'Primo/a' },
                                      { value: 'Amigo/a', label: 'Amigo/a' },
                                      { value: 'Otro', label: 'Otro' },
                                    ]}
                                  />
                                </div>
                              </div>

                              <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
                                <h4 className="font-semibold text-[#1D1D1F] mb-4">Certificaciones</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <EditableField label="Certificación de buceo" field="certificationNumber" placeholder="PADI #123456" />
                                  <EditableField label="Vencimiento" field="certificationExpiry" type="date" />
                                  <EditableField label="Certificación apnea" field="apneaCert" placeholder="AIDA #123456" />
                                </div>
                              </div>

                              <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
                                <h4 className="font-semibold text-[#1D1D1F] mb-4">Datos Bancarios</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <EditableField
                                    label="Pais del banco"
                                    field="bankCountry"
                                    selectOptions={[
                                      { value: '', label: 'Seleccionar' },
                                      { value: 'EC', label: 'Ecuador' },
                                      { value: 'US', label: 'USA' },
                                      { value: 'PA', label: 'Panama' },
                                      { value: 'CO', label: 'Colombia' },
                                      { value: 'PE', label: 'Peru' },
                                      { value: 'CL', label: 'Chile' },
                                      { value: 'AR', label: 'Argentina' },
                                      { value: 'BR', label: 'Brasil' },
                                      { value: 'MX', label: 'Mexico' },
                                      { value: 'ES', label: 'España' },
                                      { value: 'GB', label: 'Reino Unido' },
                                      { value: 'DE', label: 'Alemania' },
                                    ]}
                                  />
                                  <EditableField label="Nombre del banco" field="bankName" placeholder="Banco Pichincha" />
                                  <EditableField
                                    label="Tipo de cuenta"
                                    field="accountType"
                                    selectOptions={[
                                      { value: '', label: 'Seleccionar' },
                                      { value: 'ahorros', label: 'Ahorros / Savings' },
                                      { value: 'corriente', label: 'Corriente / Checking' },
                                    ]}
                                  />
                                  <EditableField label="Numero de cuenta" field="accountNumber" placeholder="1234567890" />
                                  {profileFormData.bankCountry === 'US' && (
                                    <EditableField label="Routing Number" field="routingNumber" placeholder="021000021" />
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Section title="Información Personal" icon={User} color="bg-corporate">
                                <InfoRow icon={User} label="Nombre completo" value={u.name} />
                                {u.displayName && <InfoRow icon={UserCircle} label="Le llaman" value={`"${u.displayName}"`} />}
                                <InfoRow icon={Flag} label="Nacionalidad" value={u.nationality} />
                                <InfoRow icon={Calendar} label="Fecha de nacimiento" value={u.birthDate ? `${u.birthDate} (${getAge(u.birthDate)} años)` : ''} />
                                <InfoRow icon={IdCard} label="Cedula" value={u.cedula} />
                                <InfoRow icon={Globe} label="Pasaporte" value={u.passport} />
                                <InfoRow icon={MapPin} label="Direccion" value={u.address} />
                              </Section>

                              <Section title="Contacto" icon={Phone} color="bg-blue-500">
                                <InfoRow icon={Phone} label="Telefono" value={u.phone} />
                                <InfoRow icon={Mail} label="Email" value={u.email} />
                              </Section>

                              <Section title="Información laboral" icon={Briefcase} color="bg-indigo-500">
                                <InfoRow icon={Shield} label="Rol" value={u.role?.replace(/_/g, ' ') || ''} />
                                <InfoRow icon={Building2} label="Departamento" value={u.department?.replace(/_/g, ' ') || ''} />
                                <InfoRow icon={Award} label="Posicion" value={u.position || ''} />
                                <InfoRow icon={Calendar} label="Fecha de ingreso" value={u.joinDate || ''} />
                                <InfoRow icon={User} label="Nivel" value={u.level ? String(u.level) : ''} />
                                <InfoRow icon={BadgeCheck} label="Estado" value={u.isActive !== false ? 'Activo' : 'Inactivo'} />
                              </Section>

                              <Section title="Salud" icon={Heart} color="bg-red-500">
                                <InfoRow icon={Droplet} label="Tipo de sangre" value={u.bloodType} missing="No registrado" />
                                <InfoRow icon={AlertTriangle} label="Alergias" value={u.allergies} missing="Ninguna" />
                                <InfoRow icon={Pill} label="Medicamentos" value={u.medications} missing="Ninguno" />
                              </Section>

                              <Section title="Contacto de Emergencia" icon={Shield} color="bg-orange-500">
                                <InfoRow icon={User} label="Nombre" value={u.emergencyContactName} />
                                <InfoRow icon={Phone} label="Telefono" value={u.emergencyContactPhone} />
                                <InfoRow icon={Heart} label="Relacion" value={u.emergencyContactRelation} />
                              </Section>

                              <Section title="Certificaciones" icon={Award} color="bg-purple-500">
                                <InfoRow icon={BadgeCheck} label="Buceo" value={u.certificationNumber} />
                                <InfoRow icon={Calendar} label="Vencimiento" value={u.certificationExpiry} />
                                <InfoRow icon={BadgeCheck} label="Apnea" value={u.apneaCert} />
                              </Section>

                              <Section title="Datos Bancarios" icon={CreditCard} color="bg-emerald-500">
                                <InfoRow icon={Flag} label="Pais" value={u.bankCountry} />
                                <InfoRow icon={Building2} label="Banco" value={u.bankName} />
                                <InfoRow icon={CreditCard} label="Tipo" value={u.accountType} />
                                <InfoRow icon={IdCard} label="Cuenta" value={u.accountNumber} />
                                {u.bankCountry === 'US' && (
                                  <InfoRow icon={IdCard} label="Routing" value={u.routingNumber} />
                                )}
                              </Section>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
  const [editingMod, setEditingMod] = useState<AppModule | null>(null);
  const [form, setForm] = useState({ name: '', description: '', icon: '', color: '' });

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

  const setStatus = async (modId: string, status: 'live' | 'development') => {
    setSaving(modId + '_status');
    try {
      await updateDoc(doc(db, 'appModules', modId), { status, updatedAt: new Date().toISOString() });
      await logAction({ action: 'SETTINGS_UPDATED', targetType: 'module', targetId: modId, targetName: modId, previousValue: { status: 'unknown' }, newValue: { status }, impactLevel: 'major', description: `Estado de ${modId} cambiado a ${status}` });
    } catch (err) { alert('Error: ' + (err as Error).message); }
    finally { setSaving(null); }
  };

  const openEdit = (mod: AppModule) => {
    setEditingMod(mod);
    setForm({ name: mod.name, description: mod.description, icon: mod.icon, color: mod.color });
  };

  const closeEdit = () => {
    setEditingMod(null);
    setForm({ name: '', description: '', icon: '', color: '' });
  };

  const handleSave = async () => {
    if (!editingMod) return;
    if (!form.name.trim()) { alert('El nombre es obligatorio'); return; }
    setSaving(editingMod.id + '_edit');
    try {
      const iconKey = form.icon.trim();
      const normalizedIcon = normalizeIconKey(iconKey);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        icon: normalizedIcon,
        color: form.color.trim(),
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'appModules', editingMod.id), payload);
      await logAction({
        action: 'SETTINGS_UPDATED',
        targetType: 'module',
        targetId: editingMod.id,
        targetName: editingMod.id,
        previousValue: { name: editingMod.name, description: editingMod.description, icon: editingMod.icon, color: editingMod.color },
        newValue: payload,
        impactLevel: 'major',
        description: `Modulo ${editingMod.id} editado`,
      });
      closeEdit();
    } catch (err) { alert('Error: ' + (err as Error).message); }
    finally { setSaving(null); }
  };

  const statusBadge = (status?: string) => {
    const s = status || 'live';
    const styles: Record<string, string> = {
      live: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      development: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    const labels: Record<string, string> = { live: 'En vivo', development: 'En desarrollo' };
    return <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium border uppercase tracking-wide', styles[s])}>{labels[s]}</span>;
  };

  const selectedIcon = useMemo(() => {
    return getIconByValue(form.icon) || getIconByValue(normalizeIconKey(form.icon)) || Puzzle;
  }, [form.icon]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="mb-4 p-4 rounded-xl bg-corporate/5 border border-corporate/10">
        <p className="text-sm text-[#1D1D1F] leading-relaxed">
          Desde aqui administras los modulos disponibles en WaveOps. Cada modulo puede estar <strong>En vivo</strong> (visible para quienes tengan permiso),
          <strong> En desarrollo</strong> (solo visible para quienes tienen acceso a Develops) o <strong>desactivado</strong>.
          Tambien puedes controlar su visibilidad en el menu y encenderlo/apagarlo sin perder la configuracion.
          Los cambios se aplican de inmediato, asi que revisa el impacto antes de desactivar un modulo que el equipo este usando.
        </p>
      </div>
      <div className="space-y-3">
        {modules.map((mod) => {
          const ModIcon = getIconByValue(mod.icon) || getIconByValue(normalizeIconKey(mod.icon)) || Puzzle;
          return (
            <div key={mod.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-[#E5E5E7] gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: mod.color + '20' }}>
                  <ModIcon className="h-5 w-5" style={{ color: mod.color }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[#1D1D1F] truncate">{mod.name}</p>
                    {statusBadge(mod.status)}
                  </div>
                  <p className="text-xs text-[#86868B] truncate">{mod.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <button onClick={() => openEdit(mod)} className="rounded-lg p-1.5 text-[#86868B] hover:bg-[#F5F5F7] hover:text-corporate transition" title="Editar modulo"><Pencil className="h-4 w-4" /></button>
                <select
                  value={mod.status || 'live'}
                  disabled={saving === mod.id + '_status'}
                  onChange={(e) => setStatus(mod.id, e.target.value as any)}
                  className="text-xs border border-[#E5E5E7] rounded-lg px-2 py-1.5 bg-white text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-corporate/20"
                >
                  <option value="live">En vivo</option>
                  <option value="development">En desarrollo</option>
                </select>
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
          );
        })}
      </div>

      {editingMod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}>
          <div className="w-full max-w-lg rounded-2xl border border-[#E5E5E7] bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1D1D1F]">Editar modulo</h3>
              <button onClick={closeEdit} className="rounded-lg p-1.5 text-[#86868B] hover:bg-[#F5F5F7]"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-[#1D1D1F]">Nombre visible *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Tareas" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-[#1D1D1F]">Descripcion</Label>
                <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Breve descripcion del modulo" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-[#1D1D1F]">Color</Label>
                <div className="flex flex-wrap gap-1.5">
                  {CORPORATE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setForm(f => ({ ...f, color: c.value }))}
                      title={c.label}
                      className={`h-7 w-7 rounded-full border-2 transition ${form.color === c.value ? "border-[#1D1D1F] scale-110" : "border-transparent hover:scale-105"}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-[#1D1D1F]">Icono</Label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-48 overflow-y-auto rounded-xl border border-[#E5E5E7] bg-[#F5F5F7] p-2">
                  {ICON_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = normalizeIconKey(form.icon) === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        title={opt.label}
                        onClick={() => setForm(f => ({ ...f, icon: opt.value }))}
                        className={`flex h-8 w-8 items-center justify-center rounded-md border transition ${isSelected ? 'border-corporate bg-corporate/10 text-corporate' : 'border-[#E5E5E7] bg-white text-[#86868B] hover:bg-[#F5F5F7]'}`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-[#86868B]">Vista previa:</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: form.color + '20' }}>
                    {(() => {
                      const Icon = selectedIcon;
                      return <Icon className="h-4 w-4" style={{ color: form.color }} />;
                    })()}
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-[#F5F5F7] p-3 space-y-1">
                <p className="text-xs text-[#86868B]"><strong>ID:</strong> {editingMod.id}</p>
                <p className="text-xs text-[#86868B]"><strong>Ruta:</strong> {editingMod.route}</p>
                <p className="text-xs text-[#86868B]"><strong>Permiso requerido:</strong> {editingMod.requiredPermission}</p>
                <p className="text-[11px] text-[#86868B]">Estos valores no se pueden editar porque estan ligados al codigo de la aplicacion.</p>
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <Button variant="ghost" onClick={closeEdit}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving === editingMod.id + '_edit'} className="bg-corporate hover:bg-corporate/90">Guardar cambios</Button>
            </div>
          </div>
        </div>
      )}
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
    {key:"canViewTeam",label:"Ver equipo"},{key:"canViewAllDepartmentsInTeam",label:"Ver todos los deptos. en Equipo"},
    {key:"canAssignShifts",label:"Asignar turnos"},{key:"canModifyShifts",label:"Modificar turnos"},
    {key:"canApproveChanges",label:"Aprobar cambios"},{key:"canRejectChanges",label:"Rechazar cambios"},
    {key:"canRequestChange",label:"Solicitar cambios"},
  ]},
  { key: "timeoff", label: "Días libres", icon: <Sun size={16} />, perms: [
    {key:"canRequestTimeOff",label:"Solicitar días libres"},
    {key:"canViewTeamTimeOff",label:"Ver solicitudes del equipo"},
    {key:"canApproveTimeOff",label:"Aprobar días libres"},
    {key:"canRejectTimeOff",label:"Rechazar días libres"},
    {key:"canEditTimeOff",label:"Editar días libres"},
    {key:"canDeleteTimeOff",label:"Eliminar días libres"},
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

const PERM_DESCRIPTIONS: Record<string, { on: string; off: string }> = {
  // Modulos
  "canViewDashboard": {
    on: "Activado: el usuario puede entrar al Dashboard y ver los resumenes de su equipo y sus tareas del dia.",
    off: "Desactivado: el usuario NO ve el icono ni puede entrar al Dashboard."
  },
  "canViewModuleTasks": {
    on: "Activado: el usuario ve el modulo Tasks en el menu y puede trabajar con tareas.",
    off: "Desactivado: el modulo Tasks esta oculto para este usuario."
  },
  "canViewModuleHorarios": {
    on: "Activado: el usuario ve el modulo Horarios en el menu.",
    off: "Desactivado: el modulo Horarios esta oculto."
  },
  "canViewModuleDiveOps": {
    on: "Activado: el usuario ve el modulo DiveOps en el menu.",
    off: "Desactivado: el modulo DiveOps esta oculto."
  },
  "canViewModuleVessels": {
    on: "Activado: el usuario ve el modulo Vessels en el menu.",
    off: "Desactivado: el modulo Vessels esta oculto."
  },
  "canViewModuleMovilidad": {
    on: "Activado: el usuario ve el modulo Movilidad en el menu.",
    off: "Desactivado: el modulo Movilidad esta oculto."
  },
  "canViewModuleRequisiciones": {
    on: "Activado: el usuario ve el modulo Requisiciones en el menu.",
    off: "Desactivado: el modulo Requisiciones esta oculto."
  },
  "canViewModuleOrdenesPago": {
    on: "Activado: el usuario ve el modulo Ordenes de Pago en el menu.",
    off: "Desactivado: el modulo Ordenes de Pago esta oculto."
  },
  "canViewModuleReportes": {
    on: "Activado: el usuario ve el modulo Reportes en el menu.",
    off: "Desactivado: el modulo Reportes esta oculto."
  },
  "canViewModuleDevelops": {
    on: "Activado: el usuario ve el modulo Develops (configuracion avanzada) en el menu.",
    off: "Desactivado: el modulo Develops esta oculto."
  },
  // Tasks
  "canCreateSpecificTask": {
    on: "Activado: puede crear tareas especificas ligadas a turnos y departamentos.",
    off: "Desactivado: NO puede crear tareas especificas."
  },
  "canCreateExtraTask": {
    on: "Activado: puede crear tareas extra para usuarios o departamentos.",
    off: "Desactivado: NO puede crear tareas extra."
  },
  "canEditOwnTasks": {
    on: "Activado: puede editar las tareas que el mismo creo.",
    off: "Desactivado: NO puede editar sus propias tareas."
  },
  "canDeleteOwnTasks": {
    on: "Activado: puede eliminar las tareas que el mismo creo.",
    off: "Desactivado: NO puede eliminar sus propias tareas."
  },
  "canEditAllTasks": {
    on: "Activado: puede editar CUALQUIER tarea, aunque la haya creado otro usuario.",
    off: "Desactivado: solo puede editar tareas propias (si tiene ese permiso)."
  },
  "canDeleteAllTasks": {
    on: "Activado: puede eliminar CUALQUIER tarea, aunque la haya creado otro usuario.",
    off: "Desactivado: NO puede eliminar tareas de otros usuarios."
  },
  "canVerifyTask": {
    on: "Activado: puede verificar que una tarea completada fue hecha correctamente.",
    off: "Desactivado: NO puede verificar tareas."
  },
  "canRateTask": {
    on: "Activado: puede calificar la calidad de una tarea finalizada.",
    off: "Desactivado: NO puede calificar tareas."
  },
  "canBlockTask": {
    on: "Activado: puede bloquear una tarea para que nadie la complete hasta que se desbloquee.",
    off: "Desactivado: NO puede bloquear tareas."
  },
  "canUnblockTask": {
    on: "Activado: puede desbloquear tareas que esten bloqueadas.",
    off: "Desactivado: NO puede desbloquear tareas."
  },
  "canReopenTask": {
    on: "Activado: puede reabrir tareas ya finalizadas o cerradas.",
    off: "Desactivado: NO puede reabrir tareas finalizadas."
  },
  // Horarios
  "canViewTeam": {
    on: "Activado: en Horarios ve la pestana Equipo con los turnos del equipo.",
    off: "Desactivado: NO ve la pestana Equipo en Horarios."
  },
  "canViewAllDepartmentsInTeam": {
    on: "Activado: en Equipo puede ver usuarios de todos los departamentos que su rol le permite ver.",
    off: "Desactivado: en Equipo solo ve usuarios de su propio departamento y sus sub-departamentos."
  },
  "canAssignShifts": {
    on: "Activado: puede arrastrar y asignar turnos a usuarios en Horarios → Asignar.",
    off: "Desactivado: NO puede asignar turnos."
  },
  "canModifyShifts": {
    on: "Activado: puede modificar turnos ya publicados en el calendario.",
    off: "Desactivado: NO puede modificar turnos ya publicados."
  },
  "canApproveChanges": {
    on: "Activado: puede aprobar solicitudes de cambio de turno entre usuarios.",
    off: "Desactivado: NO puede aprobar cambios de turno."
  },
  "canRejectChanges": {
    on: "Activado: puede rechazar solicitudes de cambio de turno entre usuarios.",
    off: "Desactivado: NO puede rechazar cambios de turno."
  },
  "canRequestChange": {
    on: "Activado: puede solicitar un cambio de turno con otro usuario.",
    off: "Desactivado: NO puede solicitar cambios de turno."
  },
  // Días libres
  "canRequestTimeOff": {
    on: "Activado: puede crear solicitudes de días libres, vacaciones o citas médicas.",
    off: "Desactivado: NO puede solicitar días libres."
  },
  "canViewTeamTimeOff": {
    on: "Activado: puede ver las solicitudes de tiempo libre de su equipo.",
    off: "Desactivado: NO ve las solicitudes de tiempo libre del equipo."
  },
  "canApproveTimeOff": {
    on: "Activado: puede aprobar solicitudes de días libres según la jerarquía.",
    off: "Desactivado: NO puede aprobar días libres."
  },
  "canRejectTimeOff": {
    on: "Activado: puede rechazar solicitudes de días libres según la jerarquía.",
    off: "Desactivado: NO puede rechazar días libres."
  },
  "canEditTimeOff": {
    on: "Activado: puede editar fechas, tipo o motivo de una solicitud de tiempo libre.",
    off: "Desactivado: NO puede editar solicitudes de tiempo libre."
  },
  "canDeleteTimeOff": {
    on: "Activado: puede marcar como eliminada una solicitud de tiempo libre.",
    off: "Desactivado: NO puede eliminar solicitudes de tiempo libre."
  },
  // Incapacidades
  "canViewOwnIncapacidades": {
    on: "Activado: puede ver las incapacidades que el mismo ha registrado.",
    off: "Desactivado: NO puede ver sus propias incapacidades."
  },
  "canViewTeamIncapacidades": {
    on: "Activado: puede ver las incapacidades de los usuarios de su equipo.",
    off: "Desactivado: NO puede ver incapacidades del equipo."
  },
  "canVerifyIncapacidad": {
    on: "Activado: puede verificar/confirmar incapacidades registradas.",
    off: "Desactivado: NO puede verificar incapacidades."
  },
  "canRegisterIncapacidad": {
    on: "Activado: puede registrar una incapacidad para si mismo o para otro usuario.",
    off: "Desactivado: NO puede registrar incapacidades."
  },
  "canRejectIncapacidad": {
    on: "Activado: puede rechazar una incapacidad registrada.",
    off: "Desactivado: NO puede rechazar incapacidades."
  },
  "canRequestIncapacidadDocs": {
    on: "Activado: puede pedir documentos de soporte (foto, pdf) para una incapacidad.",
    off: "Desactivado: NO puede solicitar documentos de incapacidad."
  },
  "canUploadIncapacidadDocs": {
    on: "Activado: puede subir documentos de soporte a una incapacidad.",
    off: "Desactivado: NO puede subir documentos de incapacidad."
  },
  // Incidencias
  "canCreateIncidencia": {
    on: "Activado: puede crear nuevas incidencias/reportes.",
    off: "Desactivado: NO puede crear incidencias."
  },
  "canViewAllIncidencias": {
    on: "Activado: puede ver incidencias de TODOS los departamentos.",
    off: "Desactivado: solo ve incidencias de su propio departamento y sub-departamentos."
  },
  "canViewOperationalIncidencias": {
    on: "Activado: puede ver incidencias de los departamentos operativos (Dive Shop, Guias, Botes, etc.).",
    off: "Desactivado: NO ve incidencias operativas adicionales."
  },
  "canViewOwnDepartmentIncidencias": {
    on: "Activado: puede ver las incidencias de su propio departamento.",
    off: "Desactivado: NO ve incidencias de su departamento."
  },
  "canConfirmIncidenciaAsManager": {
    on: "Activado: puede confirmar/verificar incidencias actuando como gerente de departamento.",
    off: "Desactivado: NO puede confirmar incidencias como gerente."
  },
  "canConfirmIncidenciaAsSupervisor": {
    on: "Activado: puede confirmar/verificar incidencias actuando como supervisor.",
    off: "Desactivado: NO puede confirmar incidencias como supervisor."
  },
  "canResolveIncidencia": {
    on: "Activado: puede marcar una incidencia como resuelta.",
    off: "Desactivado: NO puede resolver incidencias."
  },
  "canCloseIncidencia": {
    on: "Activado: puede cerrar una incidencia definitivamente.",
    off: "Desactivado: NO puede cerrar incidencias."
  },
  "canReopenIncidencia": {
    on: "Activado: puede reabrir incidencias que ya esten cerradas.",
    off: "Desactivado: NO puede reabrir incidencias cerradas."
  },
  // Departamentos
  "canViewAllDepartments": {
    on: "Activado: puede ver TODOS los departamentos en Tasks, Horarios y Dashboard, sin importar cual sea su departamento.",
    off: "Desactivado: solo ve su departamento y los departamentos que esten bajo el en la jerarquia (hijos y nietos)."
  },
  "canViewOwnDepartment": {
    on: "Activado: puede ver informacion filtrada por su propio departamento.",
    off: "Desactivado: NO puede ver informacion de departamentos."
  },
};

function RoleIcon({ name }: { name: string }) {
  return <div className="h-10 w-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center text-sm font-semibold">{name.charAt(0).toUpperCase()}</div>;
}

function PermDescription({ permKey, checked }: { permKey: string; checked: boolean }) {
  const desc = PERM_DESCRIPTIONS[permKey];
  if (!desc) return null;
  return <span className="text-[10px] text-gray-400 mt-0.5 block leading-tight">{checked ? desc.on : desc.off}</span>;
}

function RolesTab() {
  const { roleTemplates } = useAppConfig();
  const { logAction } = useAudit();
  const [openRole, setOpenRole] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const togglePermission = async (role: any, permKey: string, currentPerms: Set<string>) => {
    const isAdding = !currentPerms.has(permKey);
    const newPerms = isAdding
      ? [...Array.from(currentPerms), permKey]
      : Array.from(currentPerms).filter((p) => p !== permKey);
    setSaving(`${role.id}:${permKey}`);
    try {
      await updateDoc(doc(db, 'roleTemplates', role.id), {
        permissions: newPerms,
        updatedAt: new Date().toISOString(),
      });
      await logAction({
        action: isAdding ? 'ROLE_PERMISSION_GRANTED' : 'ROLE_PERMISSION_REVOKED',
        targetType: 'role',
        targetId: role.id,
        targetName: role.name,
        impactLevel: 'sensitive',
        previousValue: { permissions: Array.from(currentPerms) },
        newValue: { permissions: newPerms },
        description: `Permiso "${permKey}" ${isAdding ? 'activado' : 'desactivado'} para el rol "${role.name}"`,
      });
    } catch (err) {
      console.error('Error updating role permission:', err);
      alert('Error al actualizar el permiso: ' + (err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <p className="text-sm text-[#1D1D1F] leading-relaxed">
          Desde aqui puedes activar o desactivar los permisos de cada rol. Los cambios se guardan directamente en la plantilla del rol y <strong>afectan de inmediato</strong> a todos los usuarios que tengan ese rol asignado.
        </p>
      </div>
      <div className="space-y-3">
        {roleTemplates.map((role: any) => {
          const isOpen = openRole === role.id;
          const currentPerms = new Set<string>(role.permissions || []);
          return (
            <div key={role.id} className={`rounded-2xl border transition-all duration-300 ${isOpen ? "border-[#E5E5E7] shadow-[0_2px_12px_rgba(0,0,0,0.06)]" : "border-[#E5E5E7] shadow-[0_2px_8px_rgba(0,0,0,0.04)]"}`}>
              <button onClick={() => setOpenRole((prev) => (prev === role.id ? null : role.id))} className="flex w-full flex-col sm:flex-row sm:items-center justify-between p-5 text-left hover:bg-[#F5F5F7]/50 transition-colors rounded-2xl gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <RoleIcon name={role.name} />
                  <div className="min-w-0 text-left">
                    <div className="font-semibold text-[#1D1D1F] text-[15px] truncate">{role.name}</div>
                    <div className="text-xs text-[#86868B] mt-0.5">{role.permissions?.length || 0} permisos asignados · Rol base {role.baseRole || role.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${levelColor(role.level || 1)}`}>Nivel {role.level || 1}</span>
                  {isOpen ? <ChevronUp size={18} className="text-[#86868B]" /> : <ChevronDown size={18} className="text-[#86868B]" />}
                </div>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-1 border-t border-[#E5E5E7]">
                  <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                    <p className="text-xs text-amber-700 leading-relaxed">
                      <strong>Importante:</strong> los cambios en los permisos de este rol se aplican inmediatamente a todos los usuarios con el rol <strong>{role.name}</strong>. Verifica el impacto antes de desactivar un permiso que el equipo este usando.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {PERMISSION_CATEGORIES.map((cat) => {
                      const permsList = cat.perms;
                      const activeInCat = permsList.filter((p) => currentPerms.has(p.key)).length;
                      return (
                        <div key={cat.key} className="rounded-xl border border-[#E5E5E7]">
                          <div className="flex items-center p-3.5">
                            <div className="flex items-center gap-3">
                              <span className="text-[#86868B]">{cat.icon}</span>
                              <span className="text-sm font-medium text-[#1D1D1F]">{cat.label}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${activeInCat === permsList.length ? "bg-corporate/10 text-corporate border-corporate/20" : activeInCat > 0 ? "bg-[#F5F5F7] text-[#1D1D1F] border-[#E5E5E7]" : "bg-[#F5F5F7] text-[#86868B] border-[#E5E5E7]"}`}>{activeInCat}/{permsList.length}</span>
                            </div>
                          </div>
                          <div className="px-3.5 pb-3.5 pt-1 border-t border-[#E5E5E7] bg-[#F5F5F7]/30">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {permsList.map((perm) => {
                                const checked = currentPerms.has(perm.key);
                                const isSaving = saving === `${role.id}:${perm.key}`;
                                return (
                                  <button
                                    key={perm.key}
                                    disabled={isSaving}
                                    onClick={() => togglePermission(role, perm.key, currentPerms)}
                                    className={`text-left p-2.5 rounded-lg border transition-colors ${checked ? "border-corporate/20 bg-corporate/5" : "border-[#E5E5E7] bg-white opacity-60 hover:opacity-100"} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className={cn("w-8 h-4 rounded-full flex items-center px-0.5 transition-all shrink-0", checked ? 'bg-corporate' : 'bg-[#E5E5E7]')}>
                                        <span className={cn("w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform", checked ? 'translate-x-3.5' : 'translate-x-0')} />
                                      </span>
                                      <span className="text-xs font-medium text-[#1D1D1F]">{perm.label}</span>
                                    </div>
                                    <PermDescription permKey={perm.key} checked={checked} />
                                  </button>
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

// ═══════════════════════════════════════════════════════════════════
// PESTANA: Posiciones — Catalogo de cargos
// ═══════════════════════════════════════════════════════════════════

function PosicionesTab() {
  const { positions, loading, createPosition, updatePosition, deletePosition } = useFirestorePositions();
  const { users } = useFirestoreUsers();
  const { departments } = useDynamicDepartments();
  const { user: currentUser } = useAuth();
  const { logAction } = useAudit();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', level: 7, department: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');

  const usageCount = useCallback((positionName: string) => {
    return users.filter((u: any) => u.position === positionName && u.isActive !== false).length;
  }, [users]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', level: 7, department: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = (pos: any) => {
    setEditingId(pos.id);
    setForm({ name: pos.name, level: pos.level, department: pos.department || '', isActive: pos.isActive !== false });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ name: '', level: 7, department: '', isActive: true });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { alert('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      if (editingId) {
        const previous = positions.find((p) => p.id === editingId);
        await updatePosition(editingId, {
          name: form.name.trim(),
          level: Number(form.level),
          department: form.department || null,
          isActive: form.isActive,
        });
        await logAction({
          action: 'POSITION_UPDATED',
          targetType: 'position',
          targetId: editingId,
          targetName: form.name.trim(),
          impactLevel: 'major',
          previousValue: previous ? { name: previous.name, level: previous.level, department: previous.department, isActive: previous.isActive } : undefined,
          newValue: { name: form.name.trim(), level: Number(form.level), department: form.department || null, isActive: form.isActive },
          description: `Posicion actualizada: ${form.name.trim()}`,
        });
      } else {
        const id = await createPosition(
          {
            name: form.name.trim(),
            level: Number(form.level),
            department: form.department || null,
            isActive: true,
          },
          currentUser?.id || 'system'
        );
        if (id) {
          await logAction({
            action: 'POSITION_CREATED',
            targetType: 'position',
            targetId: id,
            targetName: form.name.trim(),
            impactLevel: 'major',
            description: `Posicion creada: ${form.name.trim()}`,
          });
        }
      }
      closeModal();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pos: any) => {
    const count = usageCount(pos.name);
    if (count > 0) {
      alert(`No se puede eliminar "${pos.name}" porque esta asignada a ${count} usuario(s).`);
      return;
    }
    if (!window.confirm(`¿Marcar "${pos.name}" como inactiva?`)) return;
    try {
      await deletePosition(pos.id);
      await logAction({
        action: 'POSITION_DELETED',
        targetType: 'position',
        targetId: pos.id,
        targetName: pos.name,
        impactLevel: 'major',
        description: `Posicion eliminada: ${pos.name}`,
      });
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const filteredPositions = useMemo(() => {
    return positions
      .filter((p) => showInactive || p.isActive !== false)
      .filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()) || (p.department || '').toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [positions, filter, showInactive]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#1D1D1F]">Posiciones</h3>
            <p className="text-sm text-[#86868B]">{positions.filter((p) => p.isActive !== false).length} activas · {positions.length} total</p>
          </div>
          <Button onClick={openCreate} className="bg-corporate hover:bg-corporate/90"><Plus className="mr-1.5 h-4 w-4" />Crear posicion</Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#86868B]" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar posicion o departamento..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E5E7] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-[#86868B] cursor-pointer">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded border-[#E5E5E7]" />
              Mostrar inactivas
            </label>
            <div className="flex items-center bg-[#F5F5F7] rounded-xl p-1">
              <button
                onClick={() => setViewMode('list')}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all', viewMode === 'list' ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#86868B] hover:text-[#1D1D1F]')}
              >
                <List className="w-4 h-4" /> Lista
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all', viewMode === 'cards' ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#86868B] hover:text-[#1D1D1F]')}
              >
                <LayoutGrid className="w-4 h-4" /> Tarjetas
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-corporate/20 border-t-corporate" /></div>
        ) : filteredPositions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E5E5E7] p-10 text-center text-[#86868B]">
            <Briefcase className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">No hay posiciones registradas.</p>
            <button onClick={openCreate} className="mt-3 rounded-lg bg-corporate px-4 py-2 text-sm text-white hover:bg-corporate/90 transition">Crear primera posicion</button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="border border-[#E5E5E7] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F5F7] text-[#86868B]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium">Nivel</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Departamento</th>
                  <th className="text-left px-4 py-3 font-medium">Usuarios</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-right px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E7]">
                {filteredPositions.map((pos) => {
                  const count = usageCount(pos.name);
                  return (
                    <tr key={pos.id} className="hover:bg-[#F5F5F7]/50">
                      <td className="px-4 py-3 font-medium text-[#1D1D1F]">{pos.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-corporate/5 px-2 py-0.5 border border-corporate/10 text-xs">
                          Nivel {pos.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#86868B] hidden sm:table-cell">{pos.department || 'Transversal'}</td>
                      <td className="px-4 py-3 text-[#86868B]">{count}</td>
                      <td className="px-4 py-3">
                        {pos.isActive === false ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Inactiva</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Activa</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(pos)} className="rounded p-1.5 text-[#86868B] hover:bg-[#F5F5F7] hover:text-corporate transition"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(pos)} className="rounded p-1.5 text-[#86868B] hover:bg-red-50 hover:text-[#FF3B30] transition"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredPositions.map((pos) => {
              const count = usageCount(pos.name);
              return (
                <div key={pos.id} className="rounded-xl border border-[#E5E5E7] p-4 hover:shadow-sm transition bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-[#1D1D1F] truncate">{pos.name}</p>
                        {pos.isActive === false && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Inactiva</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[#86868B]">
                        <span className="inline-flex items-center gap-1 rounded-full bg-corporate/5 px-2 py-0.5 border border-corporate/10">
                          Nivel {pos.level}
                        </span>
                        {pos.department && <span>· {pos.department}</span>}
                      </div>
                      <p className="mt-2 text-xs text-[#86868B]">{count} usuario{count !== 1 ? 's' : ''} asignado{count !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => openEdit(pos)} className="rounded p-1.5 text-[#86868B] hover:bg-[#F5F5F7] hover:text-corporate transition"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(pos)} className="rounded p-1.5 text-[#86868B] hover:bg-red-50 hover:text-[#FF3B30] transition"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="w-full max-w-md rounded-2xl border border-[#E5E5E7] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1D1D1F]">{editingId ? 'Editar posicion' : 'Nueva posicion'}</h3>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-[#86868B] hover:bg-[#F5F5F7]"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-[#1D1D1F]">Nombre *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Gerente de Operaciones" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-[#1D1D1F]">Nivel jerarquico</Label>
                <select value={form.level} onChange={(e) => setForm(f => ({ ...f, level: Number(e.target.value) }))} className="w-full rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20">
                  {LEVELS.map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-[#1D1D1F]">Departamento asociado (opcional)</Label>
                <select value={form.department} onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))} className="w-full rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20">
                  <option value="">Ninguno (transversal)</option>
                  {departments.map((d: any) => (<option key={d.id} value={d.code || d.name}>{d.name}</option>))}
                </select>
              </div>
              {editingId && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="posActive" checked={form.isActive} onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-[#E5E5E7]" />
                  <Label htmlFor="posActive" className="text-sm text-[#1D1D1F]">Activa</Label>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-corporate hover:bg-corporate/90">{editingId ? 'Guardar cambios' : 'Crear posicion'}</Button>
            </div>
          </div>
        </div>
      )}
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

  const impactCounts = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, major: 0, sensitive: 0, minor: 0 };
    logs.forEach((l) => { counts[l.impactLevel] = (counts[l.impactLevel] || 0) + 1; });
    return counts;
  }, [logs]);

  const deletedDepartments = useMemo(() => logs.filter((l) => l.action === 'DEPARTMENT_DELETED').length, [logs]);
  const deletedUsers = useMemo(() => logs.filter((l) => l.action === 'USER_DELETED').length, [logs]);

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
      <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <p className="text-sm font-semibold text-[#1D1D1F] mb-3">Resumen de auditoría</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="rounded-xl border border-[#E5E5E7] p-3">
            <p className="text-[10px] text-[#86868B]">Críticas</p>
            <p className="text-lg font-semibold text-[#1D1D1F]">{impactCounts.critical}</p>
          </div>
          <div className="rounded-xl border border-[#E5E5E7] p-3">
            <p className="text-[10px] text-[#86868B]">Mayores</p>
            <p className="text-lg font-semibold text-[#1D1D1F]">{impactCounts.major}</p>
          </div>
          <div className="rounded-xl border border-[#E5E5E7] p-3">
            <p className="text-[10px] text-[#86868B]">Sensibles</p>
            <p className="text-lg font-semibold text-[#1D1D1F]">{impactCounts.sensitive}</p>
          </div>
          <div className="rounded-xl border border-[#E5E5E7] p-3">
            <p className="text-[10px] text-[#86868B]">Menores</p>
            <p className="text-lg font-semibold text-[#1D1D1F]">{impactCounts.minor}</p>
          </div>
          <div className="rounded-xl border border-[#E5E5E7] p-3">
            <p className="text-[10px] text-[#86868B]">Departamentos eliminados</p>
            <p className="text-lg font-semibold text-[#1D1D1F]">{deletedDepartments}</p>
          </div>
          <div className="rounded-xl border border-[#E5E5E7] p-3">
            <p className="text-[10px] text-[#86868B]">Usuarios eliminados</p>
            <p className="text-lg font-semibold text-[#1D1D1F]">{deletedUsers}</p>
          </div>
        </div>
      </div>

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
  const { users } = useFirestoreUsers();
  const { logAction } = useAudit();
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const sec = settings.security;
  const access = settings.developAccess;
  const [draft, setDraft] = useState(sec);

  useEffect(() => { setDraft(sec); }, [sec]);

  // NOTA: A agosto 2026 ninguna de estas politicas se lee realmente en el flujo de la app.
  // - Las reglas de contraseña estan hardcodeadas en ChangePasswordModal, LoginScreen e InvitationPage.
  // - La reautenticacion en acciones sensibles esta hardcodeada a partir de nivel "sensible" en confirm-action.ts.
  // - maxLoginAttempts, sessionTimeoutMinutes y auditLogRetentionDays no tienen implementacion.
  // Por eso todas se muestran como no editables hasta que se conecten en una fase posterior.
  const NOT_APPLIED_MESSAGE = 'Esta politica aun no se aplica en el flujo de la app. Se programara en una proxima fase.';

  const policyDefinitions: { key: keyof typeof sec; label: string; description: string; editable: boolean; type: 'number' | 'boolean' }[] = [
    {
      key: 'passwordMinLength',
      label: 'Longitud minima de contraseña',
      description: NOT_APPLIED_MESSAGE,
      editable: false,
      type: 'number',
    },
    {
      key: 'passwordRequireUppercase',
      label: 'Requerir mayusculas',
      description: NOT_APPLIED_MESSAGE,
      editable: false,
      type: 'boolean',
    },
    {
      key: 'passwordRequireNumbers',
      label: 'Requerir numeros',
      description: NOT_APPLIED_MESSAGE,
      editable: false,
      type: 'boolean',
    },
    {
      key: 'requirePasswordForSensitiveActions',
      label: 'Pedir contraseña en acciones sensibles',
      description: NOT_APPLIED_MESSAGE,
      editable: false,
      type: 'boolean',
    },
    {
      key: 'maxLoginAttempts',
      label: 'Intentos maximos de inicio de sesion',
      description: NOT_APPLIED_MESSAGE,
      editable: false,
      type: 'number',
    },
    {
      key: 'sessionTimeoutMinutes',
      label: 'Timeout de sesion (minutos)',
      description: NOT_APPLIED_MESSAGE,
      editable: false,
      type: 'number',
    },
    {
      key: 'auditLogRetentionDays',
      label: 'Retencion de logs (dias)',
      description: NOT_APPLIED_MESSAGE,
      editable: false,
      type: 'number',
    },
  ];

  const dgUsers = useMemo(() => {
    return [...new Set(access.allowedUserIds)].map((email) => users.find((u) => u.email === email)).filter(Boolean) as typeof users;
  }, [users, access.allowedUserIds]);

  const handleSavePolicies = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'appSettings', 'global'), {
        security: draft,
        updatedAt: new Date().toISOString(),
      });
      await logAction({
        action: 'SECURITY_POLICY_CHANGED',
        targetType: 'settings',
        targetId: 'global',
        targetName: 'Seguridad',
        impactLevel: 'sensitive',
        description: 'Politicas de seguridad actualizadas',
      });
    } catch (err) {
      alert('Error al guardar politicas: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

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
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#1D1D1F]">Politicas de seguridad</h3>
          <Button onClick={handleSavePolicies} disabled={saving || JSON.stringify(draft) === JSON.stringify(sec)} className="bg-corporate hover:bg-corporate/90">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
        <p className="text-sm text-[#86868B] mb-4 leading-relaxed">
          Estas politicas estan definidas en la configuracion, pero aun no estan conectadas con el flujo de la aplicacion.
          Los valores editables se habilitaran a medida que cada politica se implemente en su modulo correspondiente.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policyDefinitions.map((policy) => {
            const value = draft[policy.key];
            return (
              <div key={policy.key} className={cn('p-4 rounded-xl border', policy.editable ? 'border-[#E5E5E7]' : 'border-[#E5E5E7] bg-[#F5F5F7]/50')}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-[#1D1D1F]">{policy.label}</p>
                  {!policy.editable && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E5E5E7] text-[#86868B]">No modificable</span>}
                </div>
                <p className="text-xs text-[#86868B] mb-3">{policy.description}</p>
                {policy.type === 'boolean' ? (
                  <button
                    disabled={!policy.editable}
                    onClick={() => policy.editable && setDraft((prev) => ({ ...prev, [policy.key]: !prev[policy.key] }))}
                    className={cn(
                      "w-12 h-7 rounded-full flex items-center px-1 transition-all duration-200",
                      value ? 'bg-corporate' : 'bg-[#E5E5E7]',
                      !policy.editable && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <div className={cn("w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200", value ? 'translate-x-5' : 'translate-x-0')} />
                  </button>
                ) : (
                  <input
                    type="number"
                    disabled={!policy.editable}
                    value={Number(value)}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [policy.key]: Number(e.target.value) }))}
                    className="w-24 px-3 py-2 rounded-xl border border-[#E5E5E7] text-sm disabled:bg-[#F5F5F7] disabled:text-[#86868B] disabled:cursor-not-allowed"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-corporate" />
          <h3 className="font-semibold text-[#1D1D1F]">Usuarios con acceso a Develops</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <select value={email} onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20 bg-white min-w-0">
            <option value="">Seleccionar usuario...</option>
            {users
              .filter((u) => u.isActive !== false && !access.allowedUserIds.includes(u.email) && u.email)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((u) => (
                <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
              ))}
          </select>
          <Button onClick={handleAddByEmail} disabled={adding || !email} className="gap-2 w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4" /> Agregar
          </Button>
        </div>
        <div className="space-y-2">
          {dgUsers.length === 0 ? (
            <p className="text-sm text-[#86868B] text-center py-4">No hay usuarios con acceso</p>
          ) : (
            dgUsers.map((u) => (
              <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-[#E5E5E7] gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar name={u.name} photoUrl={u.photoURL || u.avatar} size="sm" fallbackClassName="bg-corporate/10 text-corporate text-xs" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1D1D1F] truncate">{u.name}</p>
                    <p className="text-xs text-[#86868B] truncate">{u.email} &middot; {u.role}</p>
                  </div>
                </div>
                <button onClick={() => handleRemove(u)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B] hover:text-apple-red self-end sm:self-auto" title="Remover">
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
      <h3 className="text-lg font-semibold text-[#1D1D1F]">Papelera</h3>

      {/* Turnos eliminados */}
      {trashedShifts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[#86868B] uppercase tracking-wide">Turnos eliminados</h4>
          {trashedShifts.map((shift: any) => (
            <div key={shift.id} className="bg-white rounded-xl border border-[#E5E5E7] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: shift.color || '#8E8E93' }}>{(shift.name || "?").charAt(0).toUpperCase()}</div>
                <div>
                  <div className="font-medium text-[#1D1D1F] text-sm">{shift.name}</div>
                  <div className="text-xs text-[#86868B]">{getDeptName(shift.department)} &middot; {shift.startTime} - {shift.endTime}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
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
            <div key={dept.id} className="bg-white rounded-xl border border-[#E5E5E7] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: dept.color || '#8E8E93' }}>{(dept.name || "?").charAt(0).toUpperCase()}</div>
                <div>
                  <div className="font-medium text-[#1D1D1F] text-sm">{dept.name}</div>
                  <div className="text-xs text-[#86868B]">{dept.email || dept.manager || 'Sin email'} &middot; Eliminado {dept.deletedAt ? new Date(dept.deletedAt).toLocaleDateString() : "recientemente"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
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
            <div key={u.id} className="bg-white rounded-xl border border-[#E5E5E7] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <UserAvatar name={u.name} photoUrl={u.photoURL || u.avatar} size="sm" fallbackClassName="bg-gray-100 text-gray-400 text-xs" />
                <div>
                  <div className="font-medium text-[#1D1D1F] text-sm">{u.name}</div>
                  <div className="text-xs text-[#86868B]">{u.email} &middot; Eliminado {u.deletedAt ? new Date(u.deletedAt).toLocaleDateString() : "recientemente"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
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

// ═══════════════════════════════════════════════════════════════════
// PESTANA: Feedback — Sugerencias y problemas reportados
// ═══════════════════════════════════════════════════════════════════

interface FeedbackItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  location: string;
  fullPath: string;
  type: 'sugerencia' | 'problema';
  message: string;
  status: 'nuevo' | 'en_revision' | 'resuelto' | 'descartado';
  createdAt: string;
}

function FeedbackTab() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todos' | 'sugerencia' | 'problema'>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | FeedbackItem['status']>('todos');

  useEffect(() => {
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            userId: d.userId || '',
            userName: d.userName || '',
            userEmail: d.userEmail || '',
            userRole: d.userRole || '',
            location: d.location || '',
            fullPath: d.fullPath || '',
            type: d.type || 'sugerencia',
            message: d.message || '',
            status: d.status || 'nuevo',
            createdAt: d.createdAt?.toDate?.()?.toISOString?.() || d.createdAt || new Date().toISOString(),
          } as FeedbackItem;
        });
        setItems(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error al cargar feedback:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const updateStatus = async (id: string, status: FeedbackItem['status']) => {
    try {
      await updateDoc(doc(db, 'feedback', id), { status, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.error('Error actualizando feedback:', err);
      alert('Error al actualizar el estado');
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesType = filter === 'todos' || item.type === filter;
      const matchesStatus = statusFilter === 'todos' || item.status === statusFilter;
      return matchesType && matchesStatus;
    });
  }, [items, filter, statusFilter]);

  const counts = useMemo(() => ({
    total: items.length,
    sugerencias: items.filter((i) => i.type === 'sugerencia').length,
    problemas: items.filter((i) => i.type === 'problema').length,
    nuevos: items.filter((i) => i.status === 'nuevo').length,
  }), [items]);

  const statusLabel = (status: FeedbackItem['status']) => {
    const labels: Record<FeedbackItem['status'], string> = {
      nuevo: 'Nuevo',
      en_revision: 'En revisión',
      resuelto: 'Resuelto',
      descartado: 'Descartado',
    };
    return labels[status];
  };

  const statusColor = (status: FeedbackItem['status']) => {
    switch (status) {
      case 'nuevo': return 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/20';
      case 'en_revision': return 'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20';
      case 'resuelto': return 'bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20';
      case 'descartado': return 'bg-[#8E8E93]/10 text-[#8E8E93] border-[#8E8E93]/20';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
        <RefreshCw className="w-8 h-8 text-corporate animate-spin mx-auto mb-4" />
        <p className="text-sm text-[#86868B]">Cargando feedback...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="Sugerencias" value={counts.sugerencias} icon={CheckCircle} color="text-apple-blue" />
        <StatCard title="Problemas" value={counts.problemas} icon={AlertTriangle} color="text-apple-red" />
        <StatCard title="Nuevos" value={counts.nuevos} icon={Clock} color="text-apple-orange" />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#86868B]" />
          <span className="text-sm font-medium text-[#1D1D1F]">Tipo:</span>
        </div>
        {(['todos', 'sugerencia', 'problema'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
              filter === f ? 'border-corporate text-corporate bg-corporate/5' : 'border-[#E5E5E7] text-[#86868B] hover:bg-[#F5F5F7]'
            )}
          >
            {f === 'todos' ? 'Todos' : f === 'sugerencia' ? 'Sugerencias' : 'Problemas'}
          </button>
        ))}
        <div className="w-px h-6 bg-[#E5E5E7] mx-1 hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#1D1D1F]">Estado:</span>
        </div>
        {(['todos', 'nuevo', 'en_revision', 'resuelto', 'descartado'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
              statusFilter === s ? 'border-corporate text-corporate bg-corporate/5' : 'border-[#E5E5E7] text-[#86868B] hover:bg-[#F5F5F7]'
            )}
          >
            {s === 'todos' ? 'Todos' : statusLabel(s)}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <MessageSquare className="w-12 h-12 text-[#C7C7CC] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">No hay feedback</h3>
          <p className="text-sm text-[#86868B]">Los reportes y sugerencias de los usuarios aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', item.type === 'sugerencia' ? 'bg-apple-blue/10' : 'bg-apple-red/10')}>
                    {item.type === 'sugerencia' ? <CheckCircle className="w-5 h-5 text-apple-blue" /> : <AlertTriangle className="w-5 h-5 text-apple-red" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1D1D1F]">{item.userName || 'Usuario desconocido'}</p>
                    <p className="text-xs text-[#86868B]">{item.userEmail} • {item.userRole.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border', statusColor(item.status))}>{statusLabel(item.status)}</span>
                  <span className="text-xs text-[#86868B]">{new Date(item.createdAt).toLocaleString('es-ES')}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-[#86868B]">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Ubicación: <span className="font-medium text-[#1D1D1F]">{item.location}</span></span>
                </div>
                {item.fullPath && (
                  <div className="flex items-center gap-2 text-xs text-[#86868B]">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Ruta: <span className="font-medium text-[#1D1D1F]">{item.fullPath}</span></span>
                  </div>
                )}
              </div>

              <p className="text-sm text-[#1D1D1F] bg-[#F5F5F7] rounded-xl p-3">{item.message}</p>

              <div className="flex flex-wrap gap-2 pt-1">
                {item.status !== 'en_revision' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, 'en_revision')}>Marcar en revisión</Button>
                )}
                {item.status !== 'resuelto' && (
                  <Button size="sm" variant="outline" className="text-[#34C759] border-[#34C759]/30 hover:bg-[#34C759]/10" onClick={() => updateStatus(item.id, 'resuelto')}>Resuelto</Button>
                )}
                {item.status !== 'descartado' && (
                  <Button size="sm" variant="outline" className="text-[#8E8E93] border-[#8E8E93]/30 hover:bg-[#8E8E93]/10" onClick={() => updateStatus(item.id, 'descartado')}>Descartar</Button>
                )}
                {item.status !== 'nuevo' && (
                  <Button size="sm" variant="outline" className="text-[#FF3B30] border-[#FF3B30]/30 hover:bg-[#FF3B30]/10" onClick={() => updateStatus(item.id, 'nuevo')}>Reabrir</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const MOBILE_ONLY_TABS: DevelopTab[] = ['usuarios', 'departamentos', 'roles', 'turnos', 'feedback'];

export default function DevelopsModule() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { modules, settings, roleTemplates } = useAppConfig();
  const { logs } = useAudit();
  const { positions } = useFirestorePositions();
  const [activeTab, setActiveTab] = useState<DevelopTab>('general');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const visibleTabs = useMemo(() => {
    return isMobile ? TABS.filter((t) => MOBILE_ONLY_TABS.includes(t.id)) : TABS;
  }, [isMobile]);

  // Si la pestaña activa no está disponible en móvil, forzar la primera visible
  useEffect(() => {
    if (isMobile && !MOBILE_ONLY_TABS.includes(activeTab)) {
      setActiveTab(MOBILE_ONLY_TABS[0]);
    }
  }, [isMobile, activeTab]);

  const tabComponents: Record<DevelopTab, React.ReactNode> = {
    general: <GeneralTab />,
    usuarios: <UsuariosTab />,
    modulos: <ModulosTab />,
    departamentos: <DepartamentosTab />,
    roles: <RolesTab />,
    posiciones: <PosicionesTab />,
    auditoria: <AuditoriaTab />,
    seguridad: <SeguridadTab />,
    papelera: <PapeleraTab />,
    turnos: <TurnosTab />,
    feedback: <FeedbackTab />,
  };

  const activeTabConfig = TABS.find((t) => t.id === activeTab) || TABS[0];

  const headerStats = useMemo(() => {
    // Las tarjetas resumen se muestran dentro de cada pestana para mantener el contexto.
    return [];
  }, [activeTab]);

  return (
    <Layout title="Develops" showDate={false}>
      <div className="flex flex-col lg:flex-row gap-6 min-h-[70vh]">
        {/* Sidebar - desktop */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] sticky top-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#86868B] mb-3 px-2">Secciones</p>
            <nav className="space-y-1">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                      isActive
                        ? 'bg-[#1D1D1F] text-white'
                        : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.impact === 'high' && <AlertTriangle className="w-3 h-3 text-[#FF9500] ml-auto" />}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Tabs - mobile */}
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
          {visibleTabs.map((tab) => {
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
              </button>
            );
          })}
        </div>

        {/* Contenido */}
        <main className="flex-1 min-w-0">
          {/* Header dinamico */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#1D1D1F]">{activeTabConfig.label}</h2>
                <p className="text-sm text-[#86868B]">{activeTabConfig.description}</p>
              </div>
              <div className="text-xs text-[#86868B] bg-white px-3 py-1.5 rounded-lg border border-[#E5E5E7]">
                {user?.name} · {user?.role?.replace(/_/g, ' ')}
              </div>
            </div>
            {headerStats.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {headerStats.map((stat) => (
                  <StatCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
                ))}
              </div>
            )}
          </div>

          <div className="min-h-[400px]">
            {tabComponents[activeTab]}
          </div>
        </main>
      </div>
    </Layout>
  );
}
