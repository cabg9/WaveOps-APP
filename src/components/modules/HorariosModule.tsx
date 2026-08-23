// Convertir Date a yyyy-MM-dd usando hora LOCAL (no UTC)
function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// HORARIOS MODULE - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  User,
  Users,
  CalendarDays,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Send,
  GripVertical,
  CheckCircle2,
  Building2,
  DollarSign,
  ShoppingCart,
  Megaphone,
  Waves,
  Compass,
  Car,
  Ship,
  Package,
  ChefHat,
  LayoutGrid,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  CheckSquare,
  HeartPulse,
  Sun,
  FileText,
  Activity,
  AlertTriangle,
  Stethoscope,
  UserX,
  History,
  Inbox,
  Check,
  X,
  Camera,
  Plus,
  Upload,
  FileImage,
  XCircle,
  Download,
  Pencil,
  Trash2,
  RotateCcw,
  ChevronDown,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useShifts } from '@/hooks/useShifts';
import { useTasks } from '@/hooks/useTasks';
import { useFirestoreIncapacidades, Incapacidad } from '@/hooks/firestore/useFirestoreIncapacidades';
import { useStorageUpload } from '@/hooks/firestore/useStorageUpload';
import { useFirestoreUsers } from '@/hooks/firestore/useFirestoreUsers';
import { useFirestoreShifts } from '@/hooks/firestore/useFirestoreShifts';
import { useDynamicDepartments } from '@/hooks/firestore/useDynamicDepartments';
import { useAppConfig } from '@/hooks/useAppConfig';
import { Shift, ShiftAssignment, AssignmentStatus, Role, NotificationType, Task } from '@/types';
import { sortShiftsByTime } from '@/lib/utils';

import {
  cn,
  formatWeekRange,
  addDays,
  addDaysToDate,
  format,
  getInitials,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { 
  collection, 
  query, 
  where,
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  addDoc,
  setDoc,
  serverTimestamp,
  arrayUnion 
} from 'firebase/firestore';
import { db } from '@/firebase-config';

// ═══════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════════════════


// Función para formatear fecha desde string YYYY-MM-DD sin problema de timezone
const formatDateFromString = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

// Función para generar días del mes para el calendario de incapacidad
// Retorna strings YYYY-MM-DD para evitar problemas de timezone
const generateIncapacityMonthDays = (year: number, month: number): string[] => {
  const days: string[] = [];
  const lastDay = new Date(year, month + 1, 0);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    // Crear string YYYY-MM-DD directamente sin usar Date para evitar timezone issues
    const dayStr = d.toString().padStart(2, '0');
    const monthStr = (month + 1).toString().padStart(2, '0');
    days.push(`${year}-${monthStr}-${dayStr}`);
  }
  return days;
};

// Función para obtener el día del mes desde string YYYY-MM-DD
const getDayFromString = (dateStr: string): number => {
  return parseInt(dateStr.split('-')[2], 10);
};

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

type TabType = 'mi-horario' | 'equipo' | 'asignar' | 'solicitudes' | 'incapacidades';

interface IncapacidadesTabProps {
  incapacityDates: { date: string; type: string; userId: string }[];
  setIncapacityDates: React.Dispatch<React.SetStateAction<{ date: string; type: string; userId: string }[]>>;
  getUsersByDepartment: (dept: string) => { id: string; name: string; department: string; isActive: boolean; position?: string; avatar?: string; initials?: string }[];
  activeSubTab: 'mias' | 'equipo';
  myFilter: 'enviadas' | 'registradas' | 'rechazadas' | 'historial';
  setMyFilter: (filter: 'enviadas' | 'registradas' | 'rechazadas' | 'historial') => void;
  selectedDepartment: string | 'ALL';
  onSelectedDepartmentChange: (dept: string | 'ALL') => void;
  statusFilter: 'todas' | 'pendiente' | 'verificada' | 'registrada' | 'rechazada';
  onStatusFilterChange: (filter: 'todas' | 'pendiente' | 'verificada' | 'registrada' | 'rechazada') => void;
  // Funciones de Firestore
  firestoreIncapacidades: Incapacidad[];
  verifyIncapacidad: (id: string, userId: string, userName: string) => Promise<void>;
  rejectIncapacidad: (id: string, reason: string, userId: string) => Promise<void>;
  registerIncapacidad: (id: string, userName: string, replacementData?: { replacementUserId: string; replacementUserName: string; replacementUserDept: string; isExternalSupport: boolean }) => Promise<void>;
  undoIncapacidad: (id: string, reason: string, userId: string) => Promise<void>;
  addNoteToIncapacidad: (id: string, text: string, user: string) => Promise<void>;
  addDocumentToIncapacidad: (id: string, docName: string) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export default function HorariosModule() {
  const { user } = useAuth();
  const { effectiveUser, hasPermission } = useAppConfig();
  const { departmentCodes, departmentOptions, departmentTreeOptions, defaultDepartment, getDeptName, getDeptShortName, getDeptCode, getVisibleDepartmentCodes, operationalDepartmentCodes } = useDynamicDepartments();
  const { users: firestoreUsers } = useFirestoreUsers();
  const [activeTab, setActiveTab] = useState<TabType>('mi-horario');
  const [selectedDepartment, setSelectedDepartment] = useState<string | 'ALL'>(user?.department || departmentCodes[0] || '');

  // Redirigir a Mi Horario si la pestaña activa ya no está permitida para el usuario
  useEffect(() => {
    const allowedTabs: TabType[] = ['mi-horario', 'solicitudes'];
    if (hasPermission('canViewTeam')) allowedTabs.push('equipo');
    if (hasPermission('canAssignShifts')) allowedTabs.push('asignar');
    if (hasPermission('canViewOwnIncapacidades') || hasPermission('canViewTeamIncapacidades')) allowedTabs.push('incapacidades');
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab('mi-horario');
    }
  }, [activeTab, hasPermission]);

  // Forzar departamento permitido en Equipo/Asignar según jerarquía departamental
  useEffect(() => {
    if (!effectiveUser) return;
    const allowed = getVisibleDepartmentCodes(effectiveUser);
    const canSelectAll = allowed.length > 1;
    if ((selectedDepartment === 'ALL' && !canSelectAll) || !allowed.includes(selectedDepartment)) {
      setSelectedDepartment(allowed.includes(effectiveUser.department) ? effectiveUser.department : allowed[0] || departmentCodes[0] || '');
    }
  }, [effectiveUser, selectedDepartment, departmentCodes, getVisibleDepartmentCodes]);

  // Opciones de departamento visibles para el usuario actual en Equipo/Asignar (jerarquía pura)
  const visibleDeptOptions = useMemo(() => {
    if (!effectiveUser) return departmentOptions;
    const allowed = getVisibleDepartmentCodes(effectiveUser);
    return departmentOptions.filter(d => allowed.includes(d.code));
  }, [departmentOptions, effectiveUser, getVisibleDepartmentCodes]);

  // Opciones jerárquicas visibles para selects
  const visibleDeptTreeOptions = useMemo(() => {
    if (!effectiveUser) return departmentTreeOptions;
    const allowed = getVisibleDepartmentCodes(effectiveUser);
    return departmentTreeOptions.filter(d => allowed.includes(d.code));
  }, [departmentTreeOptions, effectiveUser, getVisibleDepartmentCodes]);

  // Determina si se muestra la opción "Todos" en el selector de departamento
  const showAllDeptOption = useMemo(() => {
    if (!effectiveUser) return false;
    return visibleDeptOptions.length > 1;
  }, [effectiveUser, visibleDeptOptions]);

  // Estado compartido para navegación de semana en Equipo (controlado desde header principal)
  const [equipoWeekOffset, setEquipoWeekOffset] = useState(0);
  const equipoWeekStart = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1 + equipoWeekOffset * 7);
    return start;
  }, [equipoWeekOffset]);
  const equipoWeekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(equipoWeekStart, i));
  }, [equipoWeekStart]);

  // Estado para sub-pestañas de incapacidades
  const [incapacidadesSubTab, setIncapacidadesSubTab] = useState<'mias' | 'equipo'>('mias');

  // Estado para filtros de incapacidades (controlados desde el header)
  const [incapacidadesStatusFilter, setIncapacidadesStatusFilter] = useState<'todas' | 'pendiente' | 'verificada' | 'registrada' | 'rechazada'>('todas');
  const [incapacidadesDeptFilter, setIncapacidadesDeptFilter] = useState<string | 'ALL'>(user?.department || departmentCodes[0] || '');
  
  // Hook de Firestore para incapacidades
  const { 
    incapacidades, 
    createIncapacidad,
    verifyIncapacidad,
    rejectIncapacidad,
    registerIncapacidad,
    undoIncapacidad,
    addNote,
    addDocument
  } = useFirestoreIncapacidades();
  
  // Hook de Storage para subir imágenes
  useStorageUpload();
  
  // Estado local de incapacityDates derivado de Firestore (sin persistencia local)
  const [incapacityDates, setIncapacityDates] = useState<{date: string, type: string, userId: string}[]>([]);

  // Sincronizar incapacityDates desde Firestore (solo incapacidades activas, no rechazadas)
  useEffect(() => {
    const dates: {date: string, type: string, userId: string}[] = [];
    incapacidades
      .filter(inc => inc.status !== 'rechazada') // Filtrar rechazadas
      .forEach(inc => {
        const start = new Date(inc.startDate + 'T00:00:00'); // Evitar timezone issues
        const end = new Date(inc.endDate + 'T00:00:00');
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push({
            date: d.toISOString().split('T')[0],
            type: inc.type,
            userId: inc.userId
          });
        }
      });
    setIncapacityDates(dates);
  }, [incapacidades]);
  
  const addIncapacity = async (dates: string[], type: string, userId: string, description?: string, userInfoOverride?: { name: string; department: string }) => {
    // Encontrar usuario en el array local o usar la info proporcionada
    let userInfo = firestoreUsers.find(u => u.id === userId);
    
    // Si no se encuentra en el array local pero se proporciona info override, usarla
    if (!userInfo && userInfoOverride) {
      userInfo = {
        id: userId,
        name: userInfoOverride.name,
        email: '',
        role: Role.STAFF,
        department: userInfoOverride.department as any,
        position: '',
        level: 7,
        isActive: true,
        avatar: '',
        photoURL: '',
      };
    }
    
    // Si aún no hay info de usuario, intentar usar el usuario actual
    if (!userInfo && user) {
      userInfo = {
        id: userId,
        name: user.name,
        email: user.email || '',
        role: user.role,
        department: user.department,
        position: user.position || '',
        level: user.level || 7,
        isActive: true,
        avatar: user.avatar || '',
        photoURL: user.photoURL || '',
      };
    }
    
    if (!userInfo) {
      console.error('No se pudo determinar la información del usuario para la incapacidad:', userId);
      toast.error('Error al registrar incapacidad: No se pudo determinar el usuario');
      return;
    }
    
    try {
      // Crear notas con la descripción si existe
      const notes = description?.trim() 
        ? [{ id: `note-${Date.now()}`, text: description.trim(), date: new Date().toISOString(), user: userInfo.name }]
        : [];
      
      // Crear en Firestore
      await createIncapacidad({
        userId,
        userName: userInfo.name,
        userAvatar: userInfo.photoURL || userInfo.avatar || '',
        userDepartment: userInfo.department,
        type,
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        description: description?.trim() || `Incapacidad registrada desde el calendario`,
        status: 'pendiente',
        history: [{
          date: new Date().toISOString(),
          action: 'Incapacidad registrada',
          user: user?.name || 'Sistema'
        }],
        notes: notes.length > 0 ? notes : [],
        documents: [],
        createdAt: new Date().toISOString()
      });

      // Notificar a supervisores/gerentes responsables
      const userDeptCode = getDeptCode(userInfo.department || '');
      const isOperational = operationalDepartmentCodes.includes(userDeptCode);
      const notifiedUserIds = new Set<string>();
      const notifyUser = async (targetUserId: string) => {
        if (!targetUserId || notifiedUserIds.has(targetUserId) || targetUserId === userId) return;
        notifiedUserIds.add(targetUserId);
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: targetUserId,
            type: NotificationType.INCAPACITY_REGISTERED,
            title: 'Incapacidad registrada',
            body: `${userInfo.name} registró una incapacidad (${type}) del ${dates[0]} al ${dates[dates.length - 1]}. Revisa el reemplazo.`,
            data: { link: '/horarios', incapacityUserId: userId },
            read: false,
            createdAt: serverTimestamp(),
            createdBy: user?.id || userId,
            priority: 'high',
          });
        } catch (err) {
          console.error('Error al notificar incapacidad a', targetUserId, err);
        }
      };

      // 1. Supervisores y gerentes del departamento
      const deptManagers = firestoreUsers.filter(u =>
        u.isActive !== false &&
        getDeptCode(u.department || '') === userDeptCode &&
        (u.role === Role.SUPERVISOR || u.role === Role.GERENTE_DEPARTAMENTO)
      );
      for (const u of deptManagers) await notifyUser(u.id);

      // 2. Si no hay responsables del departamento, gerente de operaciones (solo departamentos operativos)
      if (notifiedUserIds.size === 0 && isOperational) {
        const opsManager = firestoreUsers.find(u => u.role === Role.GERENTE_OPERACIONES && u.isActive !== false);
        if (opsManager) await notifyUser(opsManager.id);
      }

      // 3. Fallback RRHH / Director / Director General
      if (notifiedUserIds.size === 0) {
        const topManagers = firestoreUsers.filter(u =>
          u.isActive !== false &&
          (u.role === Role.RRHH || u.role === Role.DIRECTOR || u.role === Role.DIRECTOR_GENERAL)
        );
        for (const u of topManagers) await notifyUser(u.id);
      }

      toast.success(`Incapacidad registrada para ${userInfo.name}`, {
        description: `Del ${dates[0]} al ${dates[dates.length - 1]}`,
      });
    } catch (error) {
      console.error('Error al crear incapacidad:', error);
      toast.error('Error al registrar la incapacidad');
    }
  };
  
  const getIncapacityForDate = (date: string, userId: string) => {
    return incapacityDates.find(i => i.date === date && i.userId === userId);
  };
  
  // Estado para filtros de Mis Incapacidades
  const [myIncapacidadesFilter, setMyIncapacidadesFilter] = useState<'enviadas' | 'registradas' | 'rechazadas' | 'historial'>('enviadas');


  return (
    <Layout title="Horarios" showDate={true}>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-[#1D1D1F]">Horarios</h2>
          <p className="text-sm text-[#86868B]">Gestiona turnos y horarios del equipo</p>
        </div>

        {/* Tabs principales + sub-pestañas y filtros de incapacidades */}
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2">
          {/* Mobile: dropdown de pestaña principal + filtros */}
          <div className="md:hidden flex flex-wrap items-start gap-2">
            <Select value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
              <SelectTrigger className="h-10 px-4 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B]">
                <SelectValue placeholder="Seleccionar sección" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mi-horario">Mi Horario</SelectItem>
                {hasPermission('canViewTeam') && <SelectItem value="equipo">Equipo</SelectItem>}
                {hasPermission('canAssignShifts') && <SelectItem value="asignar">Asignar</SelectItem>}
                <SelectItem value="solicitudes">Solicitudes</SelectItem>
                {(hasPermission('canViewOwnIncapacidades') || hasPermission('canViewTeamIncapacidades')) && (
                  <SelectItem value="incapacidades">Incapacidades</SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Mobile: sub-pestañas de incapacidades */}
            {activeTab === 'incapacidades' && (
              <div className="flex items-center gap-1 bg-white rounded-xl p-1 w-fit">
                <button
                  onClick={() => setIncapacidadesSubTab('mias')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    incapacidadesSubTab === 'mias'
                      ? 'bg-[#F5F5F7] text-[#1D1D1F]'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  )}
                >
                  <User className="w-4 h-4" />
                  Mis Incapacidades
                </button>
                <button
                  onClick={() => setIncapacidadesSubTab('equipo')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    incapacidadesSubTab === 'equipo'
                      ? 'bg-[#F5F5F7] text-[#1D1D1F]'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  )}
                >
                  <Users className="w-4 h-4" />
                  Equipo
                </button>
              </div>
            )}

            {/* Mobile: filtro de departamento para Equipo/Asignar */}
            {(activeTab === 'equipo' || activeTab === 'asignar') && (
              visibleDeptOptions.length > 0 ? (
                <Select value={selectedDepartment} onValueChange={(v) => setSelectedDepartment(v as string | 'ALL')}>
                  <SelectTrigger className="h-10 px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B]">
                    <SelectValue>
                      {selectedDepartment === 'ALL' ? (
                        <div className="flex items-center gap-2 text-[#86868B]">
                          <LayoutGrid className="w-4 h-4" />
                          <span>Todos</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[#86868B]">
                          <DeptIcon department={selectedDepartment} className="w-4 h-4" />
                          <span className="truncate max-w-[100px]">{selectedDepartment.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {showAllDeptOption && (
                      <SelectItem value="ALL">
                        <div className="flex items-center gap-2">
                          <LayoutGrid className="w-4 h-4" />
                          <span>{visibleDeptOptions.every(d => operationalDepartmentCodes.includes(d.code)) ? 'Todos (operacionales)' : 'Todos'}</span>
                        </div>
                      </SelectItem>
                    )}
                    {visibleDeptTreeOptions.map((dept) => (
                      <SelectItem key={dept.code} value={dept.code}>
                        <div className="flex items-center gap-2">
                          <DeptIcon department={dept.code} className="w-4 h-4" />
                          <span style={{ paddingLeft: `${dept.level * 12}px` }}>{dept.level > 0 ? '└─ ' : ''}{dept.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-10 px-3 bg-[#F5F5F7] border border-[#E5E5E7] rounded-xl flex items-center gap-2 text-sm text-[#86868B]">
                  <DeptIcon department={visibleDeptTreeOptions[0]?.code || user?.department || ''} className="w-4 h-4" />
                  <span className="truncate max-w-[120px]">{getDeptName(visibleDeptTreeOptions[0]?.code || user?.department || '')}</span>
                </div>
              )
            )}

            {/* Mobile: filtros de incapacidades */}
            {activeTab === 'incapacidades' && (
              <div className="md:hidden flex flex-row items-start gap-2 w-full">
                {incapacidadesSubTab === 'mias' && (
                  <Select value={myIncapacidadesFilter} onValueChange={(v) => setMyIncapacidadesFilter(v as typeof myIncapacidadesFilter)}>
                    <SelectTrigger className="h-10 px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B] w-fit min-w-0">
                      <SelectValue>
                        {{
                          enviadas: 'Enviadas',
                          registradas: 'Registradas',
                          rechazadas: 'Rechazadas',
                          historial: 'Historial',
                        }[myIncapacidadesFilter]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-50">
                      <SelectItem value="enviadas">Enviadas</SelectItem>
                      <SelectItem value="registradas">Registradas</SelectItem>
                      <SelectItem value="rechazadas">Rechazadas</SelectItem>
                      <SelectItem value="historial">Historial</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {incapacidadesSubTab === 'equipo' && (
                  <>
                    <Select value={incapacidadesStatusFilter} onValueChange={(v) => setIncapacidadesStatusFilter(v as typeof incapacidadesStatusFilter)}>
                      <SelectTrigger className="h-10 px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B] w-fit min-w-0">
                        <SelectValue>
                          {{
                            todas: 'Todas',
                            pendiente: 'Pendientes',
                            verificada: 'Verificadas',
                            registrada: 'Registradas',
                            rechazada: 'Rechazadas',
                          }[incapacidadesStatusFilter]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-50">
                        <SelectItem value="todas">Todas</SelectItem>
                        <SelectItem value="pendiente">Pendientes</SelectItem>
                        <SelectItem value="verificada">Verificadas</SelectItem>
                        <SelectItem value="registrada">Registradas</SelectItem>
                        <SelectItem value="rechazada">Rechazadas</SelectItem>
                      </SelectContent>
                    </Select>
                    {visibleDeptTreeOptions.length > 1 && (
                      <Select value={incapacidadesDeptFilter} onValueChange={(v) => setIncapacidadesDeptFilter(v as string | 'ALL')}>
                        <SelectTrigger className="h-10 px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B] w-fit min-w-0">
                          <SelectValue>
                            {incapacidadesDeptFilter === 'ALL' ? (
                              <div className="flex items-center gap-2 text-[#86868B]">
                                <LayoutGrid className="w-4 h-4 flex-shrink-0" />
                                <span>Todos</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-[#86868B]">
                                <DeptIcon department={incapacidadesDeptFilter} className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate max-w-[100px]">{incapacidadesDeptFilter.replace(/_/g, ' ')}</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-50">
                          <SelectItem value="ALL">
                            <div className="flex items-center gap-2">
                              <LayoutGrid className="w-4 h-4" />
                              <span>Todos</span>
                            </div>
                          </SelectItem>
                          {visibleDeptTreeOptions.map((dept) => (
                            <SelectItem key={dept.code} value={dept.code}>
                              <div className="flex items-center gap-2">
                                <DeptIcon department={dept.code} className="w-4 h-4" />
                                <span style={{ paddingLeft: `${dept.level * 12}px` }}>{dept.level > 0 ? '└─ ' : ''}{dept.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Desktop: botones de pestaña principal */}
          <div className="hidden md:flex items-center gap-1 bg-white rounded-xl p-1 w-fit">
            <button
              onClick={() => setActiveTab('mi-horario')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'mi-horario'
                  ? 'bg-[#F5F5F7] text-[#1D1D1F]'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              )}
            >
              <User className="w-4 h-4" />
              Mi Horario
            </button>
            {hasPermission('canViewTeam') && (
              <button
                onClick={() => setActiveTab('equipo')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === 'equipo'
                    ? 'bg-[#F5F5F7] text-[#1D1D1F]'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                )}
              >
                <Users className="w-4 h-4" />
                Equipo
              </button>
            )}
            {hasPermission('canAssignShifts') && (
              <button
                onClick={() => setActiveTab('asignar')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === 'asignar'
                    ? 'bg-[#F5F5F7] text-[#1D1D1F]'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                )}
              >
                <CalendarDays className="w-4 h-4" />
                Asignar
              </button>
            )}
            <button
              onClick={() => setActiveTab('solicitudes')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'solicitudes'
                  ? 'bg-[#F5F5F7] text-[#1D1D1F]'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              )}
            >
              <ClipboardList className="w-4 h-4" />
              Solicitudes
            </button>
            {(hasPermission('canViewOwnIncapacidades') || hasPermission('canViewTeamIncapacidades')) && (
              <button
                onClick={() => setActiveTab('incapacidades')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === 'incapacidades'
                    ? 'bg-[#F5F5F7] text-[#1D1D1F]'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                )}
              >
                <HeartPulse className="w-4 h-4" />
                Incapacidades
              </button>
            )}

            {/* Desktop: selector de departamento para Equipo/Asignar al lado de las pestañas */}
            {(activeTab === 'equipo' || activeTab === 'asignar') && visibleDeptOptions.length > 0 && (
              <div className="hidden md:flex items-center">
                <div className="w-px h-6 bg-[#C7C7CC] mx-1 shrink-0" />
                {visibleDeptOptions.length > 1 ? (
                  <Select value={selectedDepartment} onValueChange={(v) => setSelectedDepartment(v as string | 'ALL')}>
                    <SelectTrigger className="h-10 px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B]">
                      <SelectValue>
                        {selectedDepartment === 'ALL' ? (
                          <div className="flex items-center gap-2 text-[#86868B]">
                            <LayoutGrid className="w-4 h-4" />
                            <span>{visibleDeptTreeOptions.every(d => operationalDepartmentCodes.includes(d.code)) ? 'Todos (operacionales)' : 'Todos'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[#86868B]">
                            <DeptIcon department={selectedDepartment} className="w-4 h-4" />
                            <span className="truncate max-w-[120px]">{selectedDepartment.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {showAllDeptOption && (
                        <SelectItem value="ALL">
                          <div className="flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4" />
                            <span>{visibleDeptTreeOptions.every(d => operationalDepartmentCodes.includes(d.code)) ? 'Todos (operacionales)' : 'Todos'}</span>
                          </div>
                        </SelectItem>
                      )}
                      {visibleDeptTreeOptions.map((dept) => (
                        <SelectItem key={dept.code} value={dept.code}>
                          <div className="flex items-center gap-2">
                            <DeptIcon department={dept.code} className="w-4 h-4" />
                            <span style={{ paddingLeft: `${dept.level * 12}px` }}>{dept.level > 0 ? '└─ ' : ''}{dept.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-10 px-3 bg-[#F5F5F7] border border-[#E5E5E7] rounded-xl flex items-center gap-2 text-sm text-[#86868B]">
                    <DeptIcon department={visibleDeptTreeOptions[0]?.code || user?.department || ''} className="w-4 h-4" />
                    <span className="truncate max-w-[120px]">{getDeptName(visibleDeptTreeOptions[0]?.code || user?.department || '')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Desktop: navegación de semana para Equipo al lado de las pestañas */}
            {activeTab === 'equipo' && (
              <div className="hidden md:flex items-center gap-1">
                <div className="w-px h-6 bg-[#C7C7CC] mx-1 shrink-0" />
                <button
                  onClick={() => setEquipoWeekOffset(prev => prev - 1)}
                  className="w-8 h-8 rounded-lg hover:bg-[#F5F5F7] flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEquipoWeekOffset(0)}
                  className="px-3 py-1.5 text-sm font-medium text-corporate hover:bg-corporate/5 rounded-lg"
                >
                  Hoy
                </button>
                <button
                  onClick={() => setEquipoWeekOffset(prev => prev + 1)}
                  className="w-8 h-8 rounded-lg hover:bg-[#F5F5F7] flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-sm text-[#86868B] whitespace-nowrap">
                  {formatWeekRange(equipoWeekStart, addDays(equipoWeekStart, 6))}
                </span>
              </div>
            )}
          </div>

          {/* Desktop: Fila 2 (Incapacidades): sub-pestañas + filtros */}
          {activeTab === 'incapacidades' && (
            <div className="hidden md:flex flex-wrap items-center gap-2 w-full">
              {/* Sub-pestañas */}
              <div className="flex items-center gap-1 bg-white rounded-xl p-1 w-fit">
                <button
                  onClick={() => setIncapacidadesSubTab('mias')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    incapacidadesSubTab === 'mias'
                      ? 'bg-[#F5F5F7] text-[#1D1D1F]'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  )}
                >
                  <User className="w-4 h-4" />
                  Mis Incapacidades
                </button>
                <button
                  onClick={() => setIncapacidadesSubTab('equipo')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    incapacidadesSubTab === 'equipo'
                      ? 'bg-[#F5F5F7] text-[#1D1D1F]'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  )}
                >
                  <Users className="w-4 h-4" />
                  Equipo
                </button>
              </div>

              {/* Filtros Mis Incapacidades */}
              {incapacidadesSubTab === 'mias' && (
                <div className="flex items-center gap-1 bg-white rounded-xl p-1 w-fit">
                  {[
                    { id: 'enviadas', label: 'Enviadas' },
                    { id: 'registradas', label: 'Registradas' },
                    { id: 'rechazadas', label: 'Rechazadas' },
                    { id: 'historial', label: 'Historial' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setMyIncapacidadesFilter(filter.id as typeof myIncapacidadesFilter)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                        myIncapacidadesFilter === filter.id
                          ? 'bg-[#F5F5F7] text-[#1D1D1F]'
                          : 'text-[#86868B] hover:text-[#1D1D1F]'
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Filtros Equipo */}
              {incapacidadesSubTab === 'equipo' && (
                <>
                  {visibleDeptTreeOptions.length > 1 && (
                    <Select value={incapacidadesDeptFilter} onValueChange={(v) => setIncapacidadesDeptFilter(v as string | 'ALL')}>
                      <SelectTrigger className="h-10 px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B] w-fit min-w-0">
                        <SelectValue>
                          {incapacidadesDeptFilter === 'ALL' ? (
                            <div className="flex items-center gap-2 text-[#86868B]">
                              <LayoutGrid className="w-4 h-4 flex-shrink-0" />
                              <span>Todos</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-[#86868B]">
                              <DeptIcon department={incapacidadesDeptFilter} className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate max-w-[120px]">{incapacidadesDeptFilter.replace(/_/g, ' ')}</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-50">
                        <SelectItem value="ALL">
                          <div className="flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4" />
                            <span>Todos</span>
                          </div>
                        </SelectItem>
                        {visibleDeptTreeOptions.map((dept) => (
                          <SelectItem key={dept.code} value={dept.code}>
                            <div className="flex items-center gap-2">
                              <DeptIcon department={dept.code} className="w-4 h-4" />
                              <span style={{ paddingLeft: `${dept.level * 12}px` }}>{dept.level > 0 ? '└─ ' : ''}{dept.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <div className="flex items-center gap-1 bg-white rounded-xl p-1 w-fit">
                    {[
                      { id: 'todas', label: 'Todas' },
                      { id: 'pendiente', label: 'Pendientes' },
                      { id: 'verificada', label: 'Verificadas' },
                      { id: 'registrada', label: 'Registradas' },
                      { id: 'rechazada', label: 'Rechazadas' },
                    ].map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setIncapacidadesStatusFilter(filter.id as typeof incapacidadesStatusFilter)}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                          incapacidadesStatusFilter === filter.id
                            ? 'bg-[#F5F5F7] text-[#1D1D1F]'
                            : 'text-[#86868B] hover:text-[#1D1D1F]'
                        )}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        {/* Content */}

        {activeTab === 'mi-horario' && <MiHorarioTab incapacityDates={incapacityDates} addIncapacity={addIncapacity} getIncapacityForDate={getIncapacityForDate} />}
        {activeTab === 'equipo' && <EquipoTab incapacityDates={incapacityDates} getIncapacityForDate={getIncapacityForDate} addIncapacity={addIncapacity} selectedDepartment={selectedDepartment} setSelectedDepartment={setSelectedDepartment} weekOffset={equipoWeekOffset} setWeekOffset={setEquipoWeekOffset} weekStart={equipoWeekStart} weekDays={equipoWeekDays} />}
        {activeTab === 'asignar' && <AsignarTab incapacityDates={incapacityDates} getIncapacityForDate={getIncapacityForDate} selectedDepartment={selectedDepartment} setSelectedDepartment={setSelectedDepartment} />}
        {activeTab === 'solicitudes' && <SolicitudesTab />}
        {activeTab === 'incapacidades' && (
          <IncapacidadesTab 
            incapacityDates={incapacityDates} 
            setIncapacityDates={setIncapacityDates} 
            getUsersByDepartment={useShifts().getUsersByDepartment} 
            activeSubTab={incapacidadesSubTab} 
            myFilter={myIncapacidadesFilter} 
            setMyFilter={setMyIncapacidadesFilter}
            selectedDepartment={incapacidadesDeptFilter}
            onSelectedDepartmentChange={setIncapacidadesDeptFilter}
            statusFilter={incapacidadesStatusFilter}
            onStatusFilterChange={setIncapacidadesStatusFilter}
            firestoreIncapacidades={incapacidades}
            verifyIncapacidad={verifyIncapacidad}
            rejectIncapacidad={rejectIncapacidad}
            registerIncapacidad={registerIncapacidad}
            undoIncapacidad={undoIncapacidad}
            addNoteToIncapacidad={addNote}
            addDocumentToIncapacidad={addDocument}
          />
        )}
      </div>
    </Layout>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MI HORARIO TAB
// ═══════════════════════════════════════════════════════════════════

interface MiHorarioTabProps {
  incapacityDates: {date: string, type: string, userId: string}[];
  addIncapacity: (dates: string[], type: string, userId: string, description?: string, userInfoOverride?: { name: string; department: string }) => Promise<void>;
  getIncapacityForDate: (date: string, userId: string) => {date: string, type: string, userId: string} | undefined;
}

function MiHorarioTab({ incapacityDates, addIncapacity, getIncapacityForDate: _getIncapacityForDate }: MiHorarioTabProps) {
  const { user } = useAuth();
  const { departmentCodes, departmentOptions, defaultDepartment, getDeptName, getDeptShortName, getDeptCode } = useDynamicDepartments();
  const { getUserShifts, getUsersByDepartment } = useShifts();
  const { users: firestoreUsers } = useFirestoreUsers();
  // Encontrar el usuario en Firestore por email para obtener su ID correcto
  const currentFirestoreUser = user ? firestoreUsers.find((u: any) => u.email === user.email) : null;
  const userIdForShifts = currentFirestoreUser?.id || user?.id || "";

  const { getTasksByUser } = useTasks();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [showIncapacityModal, setShowIncapacityModal] = useState(false);
  const [showFreeDaysModal, setShowFreeDaysModal] = useState(false);
  const [timeOffType, setTimeOffType] = useState<'vacaciones' | 'cita_medica' | 'dia_libre' | 'otro'>('dia_libre');
  const [timeOffStart, setTimeOffStart] = useState<string>('');
  const [timeOffEnd, setTimeOffEnd] = useState<string>('');
  const [timeOffMotivo, setTimeOffMotivo] = useState('');
  const [timeOffCalendarMonth, setTimeOffCalendarMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    return d;
  });

  const handleSubmitTimeOff = async () => {
    if (!timeOffStart) {
      toast.error('Selecciona al menos una fecha');
      return;
    }
    const endDate = timeOffEnd || timeOffStart;
    try {
      await addDoc(collection(db, 'timeOffRequests'), {
        userId: user?.id || user?.id || '',
        userName: user?.name || '',
        department: user?.department || '',
        type: timeOffType,
        startDate: timeOffStart,
        endDate: endDate,
        reason: timeOffMotivo,
        status: 'pendiente',
        createdAt: serverTimestamp(),
        reviewedBy: null,
        reviewedAt: null,
        response: null
      });
      toast.success('Solicitud enviada correctamente');
      setTimeOffStart('');
      setTimeOffEnd('');
      setTimeOffMotivo('');
      setTimeOffType('dia_libre');
      setShowFreeDaysModal(false);
    } catch (err) {
      console.error('Error al enviar solicitud:', err);
      toast.error('Error al enviar la solicitud');
    }
  };

  const getCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const handleDateClick = (day: number) => {
    const year = timeOffCalendarMonth.getFullYear();
    const month = timeOffCalendarMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!timeOffStart || (timeOffStart && timeOffEnd) || dateStr < timeOffStart) {
      setTimeOffStart(dateStr);
      setTimeOffEnd('');
    } else {
      setTimeOffEnd(dateStr);
    }
  };


  const [incapacityStartDate, setIncapacityStartDate] = useState('');
  const [incapacityEndDate, setIncapacityEndDate] = useState('');
  const [incapacityType, setIncapacityType] = useState('');
  const [incapacityDescription, setIncapacityDescription] = useState('');
  const [incapacityCalendarMonth, setIncapacityCalendarMonth] = useState(new Date());
  
  // Estados para modal de solicitar cambio
  const [showChangeShiftModal, setShowChangeShiftModal] = useState(false);
  const [selectedShiftForChange, setSelectedShiftForChange] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<'change' | 'swap'>('change');
  const [selectedTargetShift, setSelectedTargetShift] = useState<string | null>(null);
  const [selectedSwapUser, setSelectedSwapUser] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState('');

  // Solicitudes de tiempo libre aprobadas para el usuario actual
  const [approvedTimeOff, setApprovedTimeOff] = useState<TimeOffRequest[]>([]);
  useEffect(() => {
    if (!user?.id) return;
    const q = query(collection(db, 'timeOffRequests'), where('userId', '==', user.id));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reqs: TimeOffRequest[] = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              userId: data.userId || '',
              userName: data.userName || '',
              department: data.department || '',
              type: data.type || 'otro',
              startDate: data.startDate || '',
              endDate: data.endDate || '',
              reason: data.reason || '',
              status: data.status || 'pendiente',
              createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
              reviewedBy: data.reviewedBy || null,
              reviewedAt: data.reviewedAt?.toDate?.()?.toISOString?.() || null,
              response: data.response || null,
            } as TimeOffRequest;
          })
          .filter((r) => r.status === 'aprobada')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setApprovedTimeOff(reqs);
      },
      (error) => {
        console.error('Error al cargar timeOff aprobadas:', error);
      }
    );
    return () => unsubscribe();
  }, [user?.id]);

  const today = toLocalISODate(new Date());
  const todayShifts = user ? getUserShifts(userIdForShifts, today, user.email) : [];
  const todayIncapacity = incapacityDates.find(i => i.date === today && i.userId === user?.id);
  const todayTimeOff = todayIncapacity ? undefined : findTimeOffForDate(approvedTimeOff, today, user?.id);
  
  // Tasks pendientes ordenados cronológicamente
  const pendingTasks = user ? getTasksByUser(user.id)
    .filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) : [];
  
  // Calcular barra de estado de tasks
  const allTasks = user ? getTasksByUser(user.id) : [];
  const completedTasks = allTasks.filter(t => t.status === 'COMPLETED' || t.status === 'VERIFIED').length;
  const overdueTasks = allTasks.filter(t => t.status === 'OVERDUE' || (new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED' && t.status !== 'VERIFIED')).length;
  const pendingCount = allTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;
  const totalTasksCount = allTasks.length;
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasks / totalTasksCount) * 100) : 0;

  // Verificar si estamos en la segunda semana del mes (días 8-14)
  const currentDay = new Date().getDate();
  const isSecondWeek = currentDay >= 8 && currentDay <= 14;

  // Generar días del mes incluyendo días previos y siguientes para completar semanas (inicia en lunes)
  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Calcular días previos del mes anterior para empezar en lunes
    // getDay(): 0=Domingo, 1=Lunes, ..., 6=Sábado
    // Queremos que el primer día sea lunes (1)
    const firstDayOfWeek = firstDay.getDay(); // 0=Dom, 1=Lun, etc.
    const daysFromPrevMonth = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    // Agregar días del mes anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthLastDay - i));
    }

    // Días del mes actual
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    // Completar la última semana con días del mes siguiente (terminar en domingo)
    const lastDayOfWeek = lastDay.getDay(); // 0=Dom, 1=Lun, etc.
    const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
    
    for (let d = 1; d <= daysToAdd; d++) {
      days.push(new Date(year, month + 1, d));
    }

    return days;
  }, [currentMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Agrupar días en semanas para mantener la fila de números fija al expandir
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      result.push(monthDays.slice(i, i + 7));
    }
    return result;
  }, [monthDays]);

  // Datos del día expandido calculados una sola vez
  const expandedDayInfo = useMemo(() => {
    if (!expandedDate) return null;
    const date = new Date(expandedDate + 'T00:00:00');
    const dateStr = expandedDate;
    const dayShifts = user ? getUserShifts(userIdForShifts, dateStr, user.email) : [];
    const incapacityInfo = incapacityDates.find(i => i.date === dateStr && i.userId === user?.id);
    const hasIncapacity = !!incapacityInfo;
    const timeOffInfo = findTimeOffForDate(approvedTimeOff, dateStr, user?.id);
    const dayTasks = user ? getTasksByUser(user.id).filter(t => t.dueDate === dateStr) : [];
    return { date, dateStr, dayShifts, incapacityInfo, hasIncapacity, timeOffInfo, dayTasks };
  }, [expandedDate, user?.id, user?.email, userIdForShifts, incapacityDates, approvedTimeOff, getUserShifts, getTasksByUser]);

  return (
    <div className="space-y-6">
      {/* Hoy Card */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5 text-corporate" />
          <h3 className="font-semibold text-[#1D1D1F]">
            HOY - {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
          </h3>
        </div>

        <div className="space-y-4">
          {/* Layout de dos columnas: Turnos a la izquierda, Tasks a la derecha */}
          <div className="flex flex-col lg:flex-row lg:justify-between gap-4">
            {/* Columna izquierda: Turnos y Ubicación */}
            <div className="space-y-3 lg:flex-1">
              {/* Turnos asignados - Horizontal */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-[#86868B]">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Turnos:</span>
                </div>
                {todayShifts.length > 0 ? (
                  todayShifts.map((shift, i) => (
                    <div 
                      key={i} 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: `${shift.color}15` }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: shift.color }} />
                      <span className="text-sm font-medium" style={{ color: shift.color }}>{shift.name}</span>
                      <span className="text-xs text-[#86868B]">({shift.startTime}-{shift.endTime})</span>
                      {shift.swapRequestId && (
                        <span title="Turno cambiado" className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                          <RefreshCw className="w-3 h-3 mr-0.5" />Cambiado
                        </span>
                      )}
                      {shift.department !== user?.department && (
                        <DeptIcon department={shift.department} className="w-3 h-3 text-amber-500" />
                      )}
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-[#86868B]">Sin turnos asignados</span>
                )}
              </div>

              {/* Día libre / vacaciones aprobado para hoy */}
              {todayTimeOff && (
                <div className="flex items-center gap-2">
                  {(() => {
                    const style = TIME_OFF_VISUAL[todayTimeOff.type];
                    const Icon = style.icon;
                    return (
                      <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg border', style.bgColor, style.borderColor)}>
                        <Icon className={cn('w-4 h-4', style.color)} />
                        <span className={cn('text-sm font-medium', style.color)}>{TIME_OFF_LABELS[todayTimeOff.type]}</span>
                        <span className="text-xs text-[#86868B]">({formatTimeOffRange(todayTimeOff.startDate, todayTimeOff.endDate)})</span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Lugar/Departamento */}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#86868B]" />
                <span className="text-sm text-[#86868B]">Ubicación:</span>
                <span className="text-sm font-medium text-[#1D1D1F]">{getDeptName(user?.department || '')}</span>
              </div>

              {/* Botones de acción - Debajo de ubicación, más pequeños */}
              <div className="flex gap-2 pt-1">
                <button 
                  onClick={() => setShowIncapacityModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors"
                >
                  <HeartPulse className="w-3.5 h-3.5" />
                  Incapacidad
                </button>
                <button 
                  onClick={() => setShowFreeDaysModal(true)}
                  disabled={!isSecondWeek}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    isSecondWeek 
                      ? "bg-amber-50 hover:bg-amber-100 text-amber-600" 
                      : "bg-[#F5F5F7] text-[#C7C7CC] cursor-not-allowed"
                  )}
                  title={!isSecondWeek ? 'Solo disponible la segunda semana del mes (8-14)' : ''}
                >
                  <Sun className="w-3.5 h-3.5" />
                  Solicitar libre
                </button>
              </div>
              {!isSecondWeek && (
                <p className="text-[10px] text-[#86868B]">
                  Disponible del 8 al 14 de cada mes
                </p>
              )}
            </div>

            {/* Columna derecha: Tasks - Esquina superior derecha */}
            <div className="bg-[#F5F5F7] rounded-xl p-4 lg:w-80 lg:flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-corporate" />
                  <span className="text-sm font-medium text-[#1D1D1F]">Tasks</span>
                  <span className="text-xs bg-corporate/10 text-corporate px-2 py-0.5 rounded-full">{pendingTasks.length}</span>
                </div>
                <span className="text-xs font-medium text-green-600">{completionRate}%</span>
              </div>
              
              {/* Barra de estado compacta */}
              <div className="h-1.5 bg-[#E5E5E7] rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              
              {/* Contadores compactos */}
              <div className="flex gap-3 mb-3 text-[10px]">
                <span className="text-[#86868B]"><span className="text-green-600 font-medium">{completedTasks}</span> realizados</span>
                <span className="text-[#86868B]"><span className="text-amber-600 font-medium">{pendingCount}</span> pendientes</span>
                <span className="text-[#86868B]"><span className="text-red-600 font-medium">{overdueTasks}</span> atrasados</span>
              </div>
              
              {/* Lista de 3 tasks pendientes */}
              {pendingTasks.length > 0 && (
                <div className="space-y-1.5 border-t border-[#E5E5E7] pt-2">
                  {pendingTasks.slice(0, 3).map(task => (
                    <div key={task.id} className="flex items-center gap-2">
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full flex-shrink-0',
                        task.priority === 'HIGH' && 'bg-red-500',
                        task.priority === 'MEDIUM' && 'bg-amber-500',
                        task.priority === 'LOW' && 'bg-green-500'
                      )} />
                      <span className="text-xs text-[#1D1D1F] truncate flex-1">{task.title}</span>
                      <span className="text-[10px] text-[#86868B]">{new Date(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  ))}
                  {pendingTasks.length > 3 && (
                    <p className="text-[10px] text-corporate">+{pendingTasks.length - 3} más...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        {/* Header del calendario */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#1D1D1F] text-lg">
            {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex items-center gap-1 bg-[#F5F5F7] rounded-xl p-1">
            <button
              onClick={() => navigateMonth('prev')}
              className="w-8 h-8 rounded-lg bg-white shadow-sm hover:shadow flex items-center justify-center transition-all"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4 text-[#1D1D1F]" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-1.5 text-sm font-medium text-corporate bg-white rounded-lg shadow-sm hover:shadow transition-all"
            >
              Hoy
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="w-8 h-8 rounded-lg bg-white shadow-sm hover:shadow flex items-center justify-center transition-all"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4 text-[#1D1D1F]" />
            </button>
          </div>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-[#86868B] py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Grid de días por semanas */}
        <div className="space-y-1">
          {weeks.map((week, weekIndex) => {
            const weekHasExpanded = expandedDate && week.some(d => toLocalISODate(d) === expandedDate);
            return (
              <div key={weekIndex} className="space-y-1">
                <div className="grid grid-cols-7 gap-1">
                  {week.map((date, index) => {
                    const dateStr = toLocalISODate(date);
                    const isToday = dateStr === today;
                    const dayShifts = user ? getUserShifts(userIdForShifts, dateStr, user.email) : [];
                    const hasShifts = dayShifts.length > 0;
                    const isExpanded = expandedDate === dateStr;
                    const incapacityInfo = incapacityDates.find(i => i.date === dateStr && i.userId === user?.id);
                    const hasIncapacity = !!incapacityInfo;
                    const timeOffInfo = findTimeOffForDate(approvedTimeOff, dateStr, user?.id);
                    const hasTimeOff = !!timeOffInfo;

                    // Configuración de iconos y colores por tipo de incapacidad
                    const incapacityConfig: Record<string, { icon: React.ElementType, color: string, bgColor: string, label: string }> = {
                      enfermedad: { icon: Activity, color: 'text-red-500', bgColor: 'bg-red-100', label: 'Enfermedad' },
                      accidente: { icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-100', label: 'Accidente' },
                      cita_medica: { icon: Stethoscope, color: 'text-blue-500', bgColor: 'bg-blue-100', label: 'Cita médica' },
                      inasistencia: { icon: UserX, color: 'text-purple-500', bgColor: 'bg-purple-100', label: 'Inasistencia' },
                    };
                    const incapacityStyle = incapacityInfo ? incapacityConfig[incapacityInfo.type] : null;
                    const IncapacityIcon = incapacityStyle?.icon;
                    const timeOffStyle = timeOffInfo ? TIME_OFF_VISUAL[timeOffInfo.type] : null;
                    const TimeOffIcon = timeOffStyle?.icon;

                    return (
                      <div key={index} className="relative">
                        <button
                          onClick={() => setExpandedDate(isExpanded ? null : dateStr)}
                          className={cn(
                            'w-full h-[90px] sm:h-[110px] lg:h-[120px] rounded-xl p-2 flex flex-col items-center justify-start transition-all relative overflow-hidden',
                            isToday ? 'ring-2 ring-corporate bg-corporate/5' : 'hover:bg-[#F5F5F7]',
                            isExpanded && 'bg-[#F5F5F7]',
                            hasIncapacity && incapacityStyle?.bgColor.replace('100', '50'),
                            !hasIncapacity && hasTimeOff && timeOffStyle?.bgColor.replace('100', '50')
                          )}
                        >
                          {/* Icono según tipo de incapacidad / tiempo libre aprobado */}
                          {hasIncapacity && IncapacityIcon && (
                            <div className={cn("absolute top-1 right-1 w-3.5 h-3.5 sm:w-5 sm:h-5 flex items-center justify-center rounded", incapacityStyle?.bgColor)}>
                              <IncapacityIcon className={cn("w-1.5 h-1.5 sm:w-2.5 sm:h-2.5", incapacityStyle?.color)} />
                            </div>
                          )}
                          {!hasIncapacity && hasTimeOff && TimeOffIcon && (
                            <div className={cn("absolute top-1 right-1 w-3.5 h-3.5 sm:w-5 sm:h-5 flex items-center justify-center rounded", timeOffStyle?.bgColor)}>
                              <TimeOffIcon className={cn("w-1.5 h-1.5 sm:w-2.5 sm:h-2.5", timeOffStyle?.color)} />
                            </div>
                          )}
                          <span className={cn(
                            'text-sm sm:text-base font-semibold mt-2 sm:mt-0 mb-1',
                            isToday ? 'text-corporate' : 'text-[#1D1D1F]',
                            hasIncapacity && incapacityStyle?.color,
                            !hasIncapacity && hasTimeOff && timeOffStyle?.color
                          )}>
                            {date.getDate()}
                          </span>
                          {hasShifts && !hasIncapacity && !hasTimeOff && (
                            <div className="flex flex-col gap-1 w-full">
                              {dayShifts.slice(0, 3).map((shift, i) => (
                                <div
                                  key={i}
                                  className="text-[9px] px-1.5 py-1 rounded-md text-center font-medium leading-tight break-words whitespace-normal"
                                  style={{ backgroundColor: `${shift.color}20`, color: shift.color }}
                                >
                                  <span className="font-bold">{shift.name}</span>
                                  {shift.swapRequestId && <RefreshCw className="w-2.5 h-2.5 inline ml-0.5" />}
                                  <span className="opacity-80 ml-0.5">{shift.startTime}</span>
                                  <span className="opacity-60 ml-0.5">· {getDeptShortName(shift.department)}</span>
                                </div>
                              ))}
                              {dayShifts.length > 3 && (
                                <span className="text-[9px] text-[#86868B] text-center font-medium">+{dayShifts.length - 3}</span>
                              )}
                            </div>
                          )}
                          {hasIncapacity && incapacityInfo && incapacityStyle && (
                            <div className={cn(
                              "mt-1 text-[9px] sm:text-[10px] font-semibold leading-tight text-center w-full min-w-0",
                              incapacityStyle.label.includes(' ') ? 'break-words' : 'break-all',
                              incapacityStyle.color
                            )}>
                              {incapacityStyle.label}
                            </div>
                          )}
                          {!hasIncapacity && hasTimeOff && timeOffInfo && timeOffStyle && (
                            <div className={cn("mt-1 text-[10px] font-semibold", timeOffStyle.color)}>
                              {TIME_OFF_LABELS[timeOffInfo.type]}
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Expansión del día - DEBAJO de toda la fila de la semana */}
                {weekHasExpanded && expandedDayInfo && (
                  <div className="p-4 bg-[#F5F5F7] rounded-xl mt-2 mb-3">
                    {(() => {
                      const { date, dateStr, dayShifts, incapacityInfo, hasIncapacity, timeOffInfo, dayTasks } = expandedDayInfo;

                      const incapacityConfig: Record<string, { icon: React.ElementType, color: string, bgColor: string, label: string }> = {
                        enfermedad: { icon: Activity, color: 'text-red-500', bgColor: 'bg-red-100', label: 'Enfermedad' },
                        accidente: { icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-100', label: 'Accidente' },
                        cita_medica: { icon: Stethoscope, color: 'text-blue-500', bgColor: 'bg-blue-100', label: 'Cita médica' },
                        inasistencia: { icon: UserX, color: 'text-purple-500', bgColor: 'bg-purple-100', label: 'Inasistencia' },
                      };
                      const incapacityStyle = incapacityInfo ? incapacityConfig[incapacityInfo.type] : null;
                      const timeOffStyle = timeOffInfo ? TIME_OFF_VISUAL[timeOffInfo.type] : null;

                      return (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-[#1D1D1F]">
                              {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h4>
                            <button
                              onClick={() => {
                                setShowChangeShiftModal(true);
                                setSelectedShiftForChange(null);
                                setRequestType('change');
                                setSelectedTargetShift(null);
                                setSelectedSwapUser(null);
                                setChangeReason('');
                              }}
                              className="text-xs text-corporate hover:text-corporate/80 px-3 py-1.5 rounded-lg bg-corporate/10 hover:bg-corporate/20 transition-colors font-medium"
                            >
                              Solicitar cambio
                            </button>
                          </div>

                          {!hasIncapacity && timeOffInfo && timeOffStyle && (
                            <div className="mb-4">
                              <div className={cn('inline-flex items-center gap-2 px-3 py-2 rounded-lg border', timeOffStyle.bgColor, timeOffStyle.borderColor)}>
                                <timeOffStyle.icon className={cn('w-4 h-4', timeOffStyle.color)} />
                                <span className={cn('text-sm font-medium', timeOffStyle.color)}>{TIME_OFF_LABELS[timeOffInfo.type]}</span>
                                <span className="text-xs text-[#86868B]">{formatTimeOffRange(timeOffInfo.startDate, timeOffInfo.endDate)}</span>
                                {timeOffInfo.reason && (
                                  <span className="text-xs text-[#86868B]">· {timeOffInfo.reason}</span>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Turnos - Izquierda */}
                            <div>
                              <p className="text-xs text-[#86868B] mb-2 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> Turnos ({dayShifts.length})
                              </p>
                              {dayShifts.length > 0 ? (
                                <div className="space-y-2">
                                  {dayShifts.map((shift, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg"
                                    >
                                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: shift.color }} />
                                      <span className="text-sm font-medium" style={{ color: shift.color }}>{shift.name}</span>
                                      {shift.swapRequestId && (
                                        <span title="Turno cambiado" className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                                          <RefreshCw className="w-3 h-3 mr-0.5" />Cambiado
                                        </span>
                                      )}
                                      <span className="text-xs text-[#86868B]">{shift.startTime} - {shift.endTime}</span>
                                      <div className="flex items-center gap-1 ml-auto px-1.5 py-0.5 bg-[#F5F5F7] rounded">
                                        <DeptIcon department={shift.department} className="w-3 h-3 text-[#86868B]" />
                                        <span className="text-[10px] text-[#86868B]">{getDeptName(shift.department)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-[#86868B]">Sin turnos asignados</p>
                              )}
                            </div>

                            {/* Tasks - Derecha */}
                            <div>
                              <p className="text-xs text-[#86868B] mb-2 flex items-center gap-1.5">
                                <CheckSquare className="w-3.5 h-3.5" /> Tasks ({dayTasks.length})
                              </p>
                              {dayTasks.length > 0 ? (
                                <div className="space-y-2">
                                  {dayTasks.map((task, i) => (
                                    <div key={i} className="flex items-start gap-2 p-2.5 bg-white rounded-lg">
                                      <div className={cn(
                                        'w-2 h-2 rounded-full mt-1 flex-shrink-0',
                                        task.priority === 'HIGH' && 'bg-red-500',
                                        task.priority === 'MEDIUM' && 'bg-amber-500',
                                        task.priority === 'LOW' && 'bg-green-500'
                                      )} />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[#1D1D1F]">{task.title}</p>
                                        {task.description && (
                                          <p className="text-xs text-[#86868B] line-clamp-2 mt-0.5">{task.description}</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-[#86868B]">Sin tareas asignadas</p>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Reportar Incapacidad */}
      <Dialog open={showIncapacityModal} onOpenChange={setShowIncapacityModal}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">Reportar Incapacidad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Selector de rango de fechas */}
            <div>
              <label className="text-sm font-medium text-[#1D1D1F] mb-2 block">Selecciona el período</label>
              <div className="bg-[#F5F5F7] rounded-xl p-3">
                {/* Calendario mini para selección de rango */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2 px-2">
                    <button 
                      onClick={() => setIncapacityCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                      className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium capitalize">
                      {incapacityCalendarMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </span>
                    <button 
                      onClick={() => setIncapacityCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                      className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#86868B] mb-2">
                    <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 justify-items-center">
                    {generateIncapacityMonthDays(incapacityCalendarMonth.getFullYear(), incapacityCalendarMonth.getMonth()).map((dStr, i) => {
                      const isSelected = incapacityStartDate && incapacityEndDate && dStr >= incapacityStartDate && dStr <= incapacityEndDate;
                      const isStart = dStr === incapacityStartDate;
                      const isEnd = dStr === incapacityEndDate;
                      
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (!incapacityStartDate) {
                              // Primer clic: establecer inicio
                              setIncapacityStartDate(dStr);
                              setIncapacityEndDate('');
                            } else if (!incapacityEndDate) {
                              // Segundo clic: establecer fin
                              if (dStr < incapacityStartDate) {
                                // Si clickeó antes del inicio, invertir
                                setIncapacityEndDate(incapacityStartDate);
                                setIncapacityStartDate(dStr);
                              } else {
                                setIncapacityEndDate(dStr);
                              }
                            } else {
                              // Tercer clic: reiniciar con nueva fecha de inicio
                              setIncapacityStartDate(dStr);
                              setIncapacityEndDate('');
                            }
                          }}
                          className={cn(
                            'w-7 h-7 text-xs rounded-lg transition-colors',
                            isStart || isEnd ? 'bg-corporate text-white' : 
                            isSelected ? 'bg-corporate/20 text-corporate' : 
                            'hover:bg-white text-[#1D1D1F]'
                          )}
                        >
                          {getDayFromString(dStr)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Mostrar rango seleccionado */}
                {(incapacityStartDate || incapacityEndDate) && (
                  <div className="text-center text-sm bg-white rounded-lg py-2">
                    <span className="text-[#86868B]">Desde:</span>{' '}
                    <span className="font-medium text-corporate">
                      {incapacityStartDate ? formatDateFromString(incapacityStartDate) : '...'}
                    </span>
                    {' '}<span className="text-[#86868B]">hasta:</span>{' '}
                    <span className="font-medium text-corporate">
                      {incapacityEndDate ? formatDateFromString(incapacityEndDate) : '...'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tipo de incapacidad - Botones con iconos minimalistas */}
            <div>
              <label className="text-sm font-medium text-[#1D1D1F] mb-2 block">Tipo de incapacidad</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { 
                    id: 'enfermedad', 
                    label: 'Enfermedad', 
                    Icon: Activity,
                    color: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                  },
                  { 
                    id: 'accidente', 
                    label: 'Accidente', 
                    Icon: AlertTriangle,
                    color: 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' 
                  },
                  { 
                    id: 'cita_medica', 
                    label: 'Cita médica', 
                    Icon: Stethoscope,
                    color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
                  },
                  { 
                    id: 'inasistencia', 
                    label: 'Inasistencia', 
                    Icon: UserX,
                    color: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100' 
                  },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setIncapacityType(type.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                      type.color,
                      incapacityType === type.id && 'ring-2 ring-offset-1 ring-corporate'
                    )}
                  >
                    <type.Icon className="w-4 h-4" />
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="text-sm font-medium text-[#1D1D1F] mb-1 block">Descripción (opcional)</label>
              <textarea 
                className="w-full px-3 py-2 border border-[#E5E5E7] rounded-lg text-sm min-h-[60px] resize-none"
                placeholder="Añade detalles adicionales..."
                value={incapacityDescription}
                onChange={(e) => setIncapacityDescription(e.target.value)}
              />
            </div>

            {/* Botones */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowIncapacityModal(false)}>
                Cancelar
              </Button>
              <Button 
                className="flex-1 bg-corporate hover:bg-corporate/90"
                disabled={!incapacityStartDate || !incapacityEndDate || !incapacityType || !user}
                onClick={async () => {
                  if (!user) {
                    toast.error('Debes iniciar sesión para registrar una incapacidad');
                    return;
                  }
                  
                  // Generar array de fechas usando strings YYYY-MM-DD directamente (sin timezone issues)
                  const newDates: string[] = [];
                  const [startYear, startMonth, startDay] = incapacityStartDate.split('-').map(Number);
                  const [endYear, endMonth, endDay] = incapacityEndDate.split('-').map(Number);
                  
                  const start = new Date(startYear, startMonth - 1, startDay);
                  const end = new Date(endYear, endMonth - 1, endDay);
                  
                  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    newDates.push(`${year}-${month}-${day}`);
                  }
                  
                  await addIncapacity(
                    newDates, 
                    incapacityType, 
                    user.id, 
                    incapacityDescription,
                    { name: user.name, department: user.department }
                  );
                  
                  setIncapacityStartDate('');
                  setIncapacityEndDate('');
                  setIncapacityType('');
                  setIncapacityDescription('');
                  setShowIncapacityModal(false);
                }}
              >
                Enviar reporte
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Solicitar Días Libres */}
      <Dialog open={showFreeDaysModal} onOpenChange={(open) => {
        if (!open) {
          setTimeOffStart('');
          setTimeOffEnd('');
          setTimeOffMotivo('');
          setTimeOffType('dia_libre');
        }
        setShowFreeDaysModal(open);
      }}>
        <DialogContent className="sm:max-w-md max-w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitar Días Libres</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#1D1D1F] mb-2 block">Tipo de solicitud</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'vacaciones', label: 'Vacaciones', icon: Sun },
                  { key: 'cita_medica', label: 'Cita Médica', icon: HeartPulse },
                  { key: 'dia_libre', label: 'Día Libre', icon: CalendarDays },
                  { key: 'otro', label: 'Otro', icon: FileText },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setTimeOffType(opt.key as any);
                      setTimeOffStart('');
                      setTimeOffEnd('');
                      const d = new Date();
                      if (opt.key !== 'vacaciones') {
                        d.setMonth(d.getMonth() + 1);
                      } else {
                        d.setMonth(d.getMonth());
                      }
                      d.setDate(1);
                      setTimeOffCalendarMonth(d);
                    }}
                    className={`p-3 rounded-xl border-2 text-sm flex flex-col items-center gap-1 transition-all ${
                      timeOffType === opt.key
                        ? 'border-corporate bg-corporate/5 text-corporate'
                        : 'border-[#E5E5E7] hover:border-gray-300'
                    }`}
                  >
                    <opt.icon className="w-5 h-5" />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[#1D1D1F]">
                  {timeOffType === 'vacaciones' ? 'Selecciona fechas' : 'Selecciona fechas (próximo mes)'}
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(timeOffCalendarMonth);
                      d.setMonth(d.getMonth() - 1);
                      setTimeOffCalendarMonth(d);
                    }}
                    className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30"
                    disabled={timeOffType !== 'vacaciones' && timeOffCalendarMonth.getMonth() <= new Date().getMonth()}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium min-w-[120px] text-center">
                    {timeOffCalendarMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(timeOffCalendarMonth);
                      d.setMonth(d.getMonth() + 1);
                      setTimeOffCalendarMonth(d);
                    }}
                    className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30"
                    disabled={timeOffType !== 'vacaciones' ? 
                      timeOffCalendarMonth.getMonth() >= new Date().getMonth() + 1 :
                      timeOffCalendarMonth.getFullYear() >= 2027 && timeOffCalendarMonth.getMonth() >= 11
                    }
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {(timeOffStart || timeOffEnd) && (
                <div className="bg-corporate/5 rounded-lg p-2 mb-2 text-center">
                  <p className="text-sm text-corporate font-medium">
                    {timeOffStart === timeOffEnd || !timeOffEnd
                      ? `Día seleccionado: ${new Date(timeOffStart + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`
                      : `Del ${new Date(timeOffStart + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} al ${new Date(timeOffEnd + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    }
                  </p>
                </div>
              )}

              <div className="border border-[#E5E5E7] rounded-xl p-3">
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
                    <div key={d} className="text-xs text-[#86868B] py-1 font-medium">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const year = timeOffCalendarMonth.getFullYear();
                    const month = timeOffCalendarMonth.getMonth();
                    const days = getCalendarDays(year, month);
                    return days.map((day, idx) => {
                      if (!day) return <div key={idx} />;
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isStart = timeOffStart === dateStr;
                      const isEnd = timeOffEnd === dateStr;
                      const isInRange = timeOffStart && timeOffEnd && dateStr > timeOffStart && dateStr < timeOffEnd;
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleDateClick(day)}
                          className={`h-8 rounded-lg text-sm transition-all ${
                            isStart || isEnd
                              ? 'bg-corporate text-white font-semibold'
                              : isInRange
                                ? 'bg-corporate/20 text-corporate'
                                : 'hover:bg-gray-100 text-[#1D1D1F]'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
              <p className="text-xs text-[#86868B] mt-1 text-center">
                Primer clic: fecha inicio · Segundo clic: fecha fin · Clic en fecha anterior: reinicia inicio
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-[#1D1D1F] mb-1 block">Motivo adicional (opcional)</label>
              <textarea
                value={timeOffMotivo}
                onChange={(e) => setTimeOffMotivo(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5E5E7] rounded-lg text-sm min-h-[60px] resize-none"
                placeholder="Indica el motivo de tu solicitud..."
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setTimeOffStart('');
                setTimeOffEnd('');
                setTimeOffMotivo('');
                setTimeOffType('dia_libre');
                setShowFreeDaysModal(false);
              }}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-corporate hover:bg-corporate/90"
                onClick={handleSubmitTimeOff}
                disabled={!timeOffStart}
              >
                Enviar solicitud
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Solicitar Cambio de Turno */}
      <Dialog open={showChangeShiftModal} onOpenChange={setShowChangeShiftModal}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-corporate/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-corporate" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                </svg>
              </div>
              <div>
                <DialogTitle className="text-lg">Solicitar cambio de turno</DialogTitle>
                <p className="text-sm text-[#86868B]">
                  {expandedDate && new Date(expandedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </DialogHeader>
          
          {expandedDate && (() => {
            const dayShifts = user ? getUserShifts(userIdForShifts, expandedDate) : [];
            
            return (
              <div className="space-y-4 pt-2">
                {/* Paso 1: Tipo de solicitud */}
                <div>
                  <label className="text-sm font-medium text-[#1D1D1F] mb-2 block">1. Tipo de solicitud</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setRequestType('change');
                        setSelectedShiftForChange(null);
                        setSelectedTargetShift(null);
                        setSelectedSwapUser(null);
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition-all',
                        requestType === 'change'
                          ? 'border-corporate bg-corporate/5 text-corporate'
                          : 'border-[#E5E5E7] bg-white text-[#86868B] hover:border-[#C7C7CC]'
                      )}
                    >
                      <Clock className="w-5 h-5" />
                      <span className="text-sm font-medium">Cambiar turno</span>
                    </button>
                    <button
                      onClick={() => {
                        setRequestType('swap');
                        setSelectedShiftForChange(null);
                        setSelectedTargetShift(null);
                        setSelectedSwapUser(null);
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition-all',
                        requestType === 'swap'
                          ? 'border-corporate bg-corporate/5 text-corporate'
                          : 'border-[#E5E5E7] bg-white text-[#86868B] hover:border-[#C7C7CC]'
                      )}
                    >
                      <User className="w-5 h-5" />
                      <span className="text-sm font-medium">Intercambiar</span>
                    </button>
                  </div>
                </div>

                {/* Paso 2: Contenido según tipo de solicitud */}
                {requestType === 'change' ? (
                  <>
                    {/* Seleccionar turno a cambiar */}
                    <div>
                      <label className="text-sm font-medium text-[#1D1D1F] mb-2 block">2. Selecciona el turno que deseas cambiar</label>
                      <div className="flex flex-wrap gap-2">
                        {dayShifts.map((shift) => (
                          <button
                            key={shift.id}
                            onClick={() => setSelectedShiftForChange(selectedShiftForChange === shift.id ? null : shift.id)}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border-2',
                              selectedShiftForChange === shift.id
                                ? 'border-corporate'
                                : 'border-transparent hover:opacity-80'
                            )}
                            style={{ 
                              backgroundColor: `${shift.color}15`,
                              color: shift.color,
                              borderColor: selectedShiftForChange === shift.id ? shift.color : 'transparent'
                            }}
                          >
                            <span className="font-bold">{shift.name}</span>
                            <span className="opacity-70">({shift.startTime}-{shift.endTime})</span>
                            <span className="opacity-50">· {getDeptShortName(shift.department)}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedShiftForChange ? (
                  <>
                    {/* Selector de turno destino - Botones */}
                    <div>
                      <label className="text-sm font-medium text-[#1D1D1F] mb-2 block">Turno al que deseas cambiar</label>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const selectedShift = dayShifts.find(s => s.id === selectedShiftForChange);
                          if (!selectedShift) return null;
                          // Obtener turnos del mismo departamento excepto el seleccionado
                          const availableShifts = departmentCodes
                            .flatMap(dept => getUsersByDepartment(dept))
                            .flatMap(u => getUserShifts(u.id, expandedDate))
                            .filter(s => s.department === selectedShift.department && s.id !== selectedShift.id)
                            .filter((s, i, arr) => arr.findIndex(t => t.id === s.id) === i); // Unique
                          
                          return availableShifts.map(shift => (
                            <button
                              key={shift.id}
                              onClick={() => setSelectedTargetShift(selectedTargetShift === shift.id ? null : shift.id)}
                              className={cn(
                                'px-3 py-2 rounded-lg text-sm font-medium transition-all border-2',
                                selectedTargetShift === shift.id
                                  ? 'border-corporate'
                                  : 'border-transparent hover:opacity-80'
                              )}
                              style={{ 
                                backgroundColor: `${shift.color}15`,
                                color: shift.color,
                                borderColor: selectedTargetShift === shift.id ? shift.color : 'transparent'
                              }}
                            >
                              {shift.name} ({shift.startTime}-{shift.endTime})
                            </button>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Compañeros disponibles */}
                    {selectedTargetShift && (() => {
                      const targetShift = departmentCodes
                        .flatMap(dept => getUsersByDepartment(dept))
                        .flatMap(u => getUserShifts(u.id, expandedDate))
                        .find(s => s.id === selectedTargetShift);
                      
                      if (!targetShift) return null;
                      
                      // Usuarios que tienen este turno ese día
                      const availableUsers = departmentCodes
                        .flatMap(dept => getUsersByDepartment(dept))
                        .filter(u => u.id !== user?.id)
                        .filter(u => {
                          const userShifts = getUserShifts(u.id, expandedDate);
                          return userShifts.some(s => s.id === targetShift.id);
                        });
                      
                      return (
                        <div>
                          <label className="text-sm font-medium text-[#1D1D1F] mb-2 block">
                            Compañeros disponibles para cambio
                          </label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {availableUsers.map(u => (
                              <button
                                key={u.id}
                                onClick={() => setSelectedSwapUser(selectedSwapUser === u.id ? null : u.id)}
                                className={cn(
                                  'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                                  selectedSwapUser === u.id
                                    ? 'border-corporate bg-corporate/5'
                                    : 'border-[#E5E5E7] bg-white hover:border-[#C7C7CC]'
                                )}
                              >
                                <UserAvatar name={u.name} photoUrl={(u as any).photoURL || u.avatar} size="md" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-[#1D1D1F]">{u.name}</p>
                                  <p className="text-xs text-[#86868B]">{u.position}</p>
                                </div>
                              </button>
                            ))}
                            {availableUsers.length === 0 && (
                              <p className="text-sm text-[#86868B] text-center py-4">
                                No hay compañeros disponibles con este turno
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : null}
              </>
            ) : requestType === 'swap' ? (
                  <>
                    {/* Seleccionar compañero para intercambiar - todos los turnos del día */}
                    <div>
                      <label className="text-sm font-medium text-[#1D1D1F] mb-2 block">
                        2. Selecciona compañero para intercambiar
                      </label>
                      <div className="bg-[#F5F5F7] rounded-lg p-3 mb-3">
                        <p className="text-xs text-[#86868B]">
                          Se intercambiarán <span className="font-medium text-[#1D1D1F]">todos tus turnos</span> del {expandedDate && new Date(expandedDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}:
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {dayShifts.map(s => (
                            <span key={s.id} className="text-xs px-2 py-0.5 rounded bg-white" style={{ color: s.color }}>
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(() => {
                          // Usuarios del mismo departamento con turnos ese día
                          if (dayShifts.length === 0) return null;
                          const userDept = dayShifts[0]?.department;
                          
                          const swapUsers = departmentCodes
                            .flatMap(dept => getUsersByDepartment(dept))
                            .filter(u => u.id !== user?.id && u.department === userDept)
                            .filter(u => {
                              const userShifts = getUserShifts(u.id, expandedDate);
                              return userShifts.length > 0;
                            });
                          
                          return swapUsers.map(u => {
                            const userShifts = getUserShifts(u.id, expandedDate);
                            return (
                              <button
                                key={u.id}
                                onClick={() => setSelectedSwapUser(selectedSwapUser === u.id ? null : u.id)}
                                className={cn(
                                  'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                                  selectedSwapUser === u.id
                                    ? 'border-corporate bg-corporate/5'
                                    : 'border-[#E5E5E7] bg-white hover:border-[#C7C7CC]'
                                )}
                              >
                                <UserAvatar name={u.name} photoUrl={(u as any).photoURL || u.avatar} size="md" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-[#1D1D1F]">{u.name}</p>
                                  <p className="text-xs text-[#86868B]">{u.position}</p>
                                  <p className="text-xs text-green-600 mt-0.5">
                                    {userShifts.length} turno(s) el mismo día
                                  </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Vista previa del intercambio */}
                    {selectedSwapUser && (() => {
                      const swapUser = departmentCodes
                        .flatMap(dept => getUsersByDepartment(dept))
                        .find(u => u.id === selectedSwapUser);
                      const swapUserShifts = swapUser ? getUserShifts(swapUser.id, expandedDate) : [];
                      
                      return (
                        <div className="bg-[#F5F5F7] rounded-xl p-4">
                          <p className="text-sm font-medium text-[#1D1D1F] mb-3">
                            Turnos a intercambiar el {new Date(expandedDate!).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}:
                          </p>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#86868B]">Tú das:</span>
                              <div className="flex flex-wrap gap-1">
                                {dayShifts.map(s => (
                                  <span key={s.id} className="text-xs px-2 py-0.5 rounded bg-white" style={{ color: s.color }}>
                                    {s.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#86868B]">Recibes de {swapUser?.name.split(' ')[0]}:</span>
                              <div className="flex flex-wrap gap-1">
                                {swapUserShifts.map(s => (
                                  <span key={s.id} className="text-xs px-2 py-0.5 rounded bg-white" style={{ color: s.color }}>
                                    {s.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedSwapUser(null)}
                            className="mt-3 text-xs text-corporate hover:underline"
                          >
                            Cambiar compañero
                          </button>
                        </div>
                      );
                    })()}
                  </>
                ) : null}

                {/* Motivo */}
                <div>
                  <label className="text-sm font-medium text-[#1D1D1F] mb-1 block">Motivo (opcional)</label>
                  <textarea
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E5E7] rounded-lg text-sm min-h-[60px] resize-none"
                    placeholder="Explica el motivo de tu solicitud..."
                  />
                </div>

                {/* Botones */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => {
                      setShowChangeShiftModal(false);
                      setSelectedShiftForChange(null);
                      setSelectedTargetShift(null);
                      setSelectedSwapUser(null);
                      setChangeReason('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-corporate hover:bg-corporate/90"
                    disabled={requestType === 'change' 
                      ? (!selectedShiftForChange || !selectedTargetShift || !selectedSwapUser)
                      : (!selectedSwapUser || dayShifts.length === 0)}
                    onClick={() => {
                      const now = new Date().toISOString();
                      const swapUser = selectedSwapUser ? departmentCodes
                        .flatMap(dept => getUsersByDepartment(dept))
                        .find(u => u.id === selectedSwapUser) : null;
                      
                      const selectedShift = dayShifts.find(s => s.id === selectedShiftForChange);
                      const targetShift = selectedTargetShift ? departmentCodes
                        .flatMap(dept => getUsersByDepartment(dept))
                        .flatMap(u => getUserShifts(u.id, expandedDate))
                        .find(s => s.id === selectedTargetShift) : null;
                      
                      const swapUserShifts = swapUser ? getUserShifts(swapUser.id, expandedDate) : [];
                      
                      // Generar ID de Firestore desde el inicio para evitar duplicados y datos locales
                      const docRef = doc(collection(db, 'solicitudes'));
                      const firestoreId = docRef.id;

                      const nuevaSolicitud: Solicitud = {
                        id: firestoreId,
                        tipo: requestType === 'change' ? 'cambio' : 'intercambio',
                        deId: user?.id || 'unknown',
                        de: user?.name || 'Tú',
                        aId: swapUser?.id || 'unknown',
                        a: swapUser?.name || 'Usuario',
                        deCargo: user?.position || 'Voluntario',
                        aCargo: swapUser?.position || 'Voluntario',
                        deDept: getDeptCode(user?.department || departmentCodes[0] || ''),
                        aDept: getDeptCode(swapUser?.department || defaultDepartment),
                        // Turnos del usuario que solicita (de)
                        deTurnoActual: requestType === 'change' ? selectedShift?.name : dayShifts.map(s => s.name).join(', '),
                        deTurnoNuevo: requestType === 'change' ? targetShift?.name : swapUserShifts.map(s => s.name).join(', '),
                        deHorarioActual: requestType === 'change' ? `${selectedShift?.startTime}-${selectedShift?.endTime}` : dayShifts.map(s => `${s.startTime}-${s.endTime}`).join(', '),
                        deHorarioNuevo: requestType === 'change' ? `${targetShift?.startTime}-${targetShift?.endTime}` : swapUserShifts.map(s => `${s.startTime}-${s.endTime}`).join(', '),
                        // Turnos del usuario destinatario (a)
                        aTurnoActual: requestType === 'change' ? targetShift?.name : swapUserShifts.map(s => s.name).join(', '),
                        aTurnoNuevo: requestType === 'change' ? selectedShift?.name : dayShifts.map(s => s.name).join(', '),
                        aHorarioActual: requestType === 'change' ? `${targetShift?.startTime}-${targetShift?.endTime}` : swapUserShifts.map(s => `${s.startTime}-${s.endTime}`).join(', '),
                        aHorarioNuevo: requestType === 'change' ? `${selectedShift?.startTime}-${selectedShift?.endTime}` : dayShifts.map(s => `${s.startTime}-${s.endTime}`).join(', '),
                        // Legacy fields
                        turnoActual: requestType === 'change' ? selectedShift?.name : dayShifts.map(s => s.name).join(', '),
                        turnoSolicitado: requestType === 'change' ? targetShift?.name : swapUserShifts.map(s => s.name).join(', '),
                        horarioActual: requestType === 'change' ? `${selectedShift?.startTime}-${selectedShift?.endTime}` : dayShifts.map(s => `${s.startTime}-${s.endTime}`).join(', '),
                        horarioSolicitado: requestType === 'change' ? `${targetShift?.startTime}-${targetShift?.endTime}` : swapUserShifts.map(s => `${s.startTime}-${s.endTime}`).join(', '),
                        fecha: expandedDate || now.split('T')[0],
                        fechaSolicitud: now,
                        estado: 'pendiente',
                        motivo: changeReason || 'Sin motivo especificado',
                        avatar: user?.photoURL || user?.avatar || '',
                        historial: [
                          { fecha: now, accion: 'Solicitud creada', usuario: user?.name || 'Tú' }
                        ]
                      };

                      // Guardar únicamente en Firestore
                      const saveToFirestore = async () => {
                        try {
                          const solicitudData = {
                            tipo: nuevaSolicitud.tipo,
                            deId: nuevaSolicitud.deId,
                            de: nuevaSolicitud.de,
                            deCargo: nuevaSolicitud.deCargo,
                            deDept: nuevaSolicitud.deDept,
                            aId: nuevaSolicitud.aId,
                            a: nuevaSolicitud.a,
                            aCargo: nuevaSolicitud.aCargo,
                            aDept: nuevaSolicitud.aDept,
                            fecha: nuevaSolicitud.fecha,
                            deTurnoActual: nuevaSolicitud.deTurnoActual,
                            deTurnoNuevo: nuevaSolicitud.deTurnoNuevo,
                            deHorarioActual: nuevaSolicitud.deHorarioActual,
                            deHorarioNuevo: nuevaSolicitud.deHorarioNuevo,
                            aTurnoActual: nuevaSolicitud.aTurnoActual,
                            aTurnoNuevo: nuevaSolicitud.aTurnoNuevo,
                            aHorarioActual: nuevaSolicitud.aHorarioActual,
                            aHorarioNuevo: nuevaSolicitud.aHorarioNuevo,
                            turnoActual: nuevaSolicitud.turnoActual,
                            turnoSolicitado: nuevaSolicitud.turnoSolicitado,
                            horarioActual: nuevaSolicitud.horarioActual,
                            horarioSolicitado: nuevaSolicitud.horarioSolicitado,
                            motivo: nuevaSolicitud.motivo,
                            estado: nuevaSolicitud.estado,
                            fechaSolicitud: serverTimestamp(),
                            fechaRespuesta: null,
                            respuesta: null,
                            avatar: nuevaSolicitud.avatar,
                            historial: nuevaSolicitud.historial
                          };

                          await setDoc(docRef, solicitudData);
                          console.log('Solicitud guardada en Firestore con ID:', firestoreId);
                          toast.success('Solicitud enviada correctamente');
                        } catch (error) {
                          console.error('Error al guardar en Firestore:', error);
                          toast.error('No se pudo enviar la solicitud');
                        }
                      };

                      saveToFirestore();
                      
                      // Limpiar estados
                      setShowChangeShiftModal(false);
                      setSelectedShiftForChange(null);
                      setSelectedTargetShift(null);
                      setSelectedSwapUser(null);
                      setChangeReason('');
                    }}
                  >
                    <Send className="w-4 h-4 mr-1.5" />
                    Enviar solicitud
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EQUIPO TAB
// ═══════════════════════════════════════════════════════════════════

interface EquipoTabProps {
  incapacityDates: {date: string, type: string, userId: string}[];
  getIncapacityForDate: (date: string, userId: string) => {date: string, type: string, userId: string} | undefined;
  addIncapacity: (dates: string[], type: string, userId: string, description?: string, userInfoOverride?: { name: string; department: string }) => Promise<void>;
  selectedDepartment: string | 'ALL';
  setSelectedDepartment: (v: string | 'ALL') => void;
  weekOffset?: number;
  setWeekOffset?: (v: number | ((prev: number) => number)) => void;
  weekStart?: Date;
  weekDays?: Date[];
}

function EquipoTab({
  incapacityDates: _incapacityDates,
  getIncapacityForDate,
  addIncapacity,
  selectedDepartment,
  setSelectedDepartment,
  weekOffset: propWeekOffset,
  setWeekOffset: propSetWeekOffset,
  weekStart: propWeekStart,
  weekDays: propWeekDays,
}: EquipoTabProps) {
  const { user } = useAuth();
  const { effectiveUser, hasPermission } = useAppConfig();
  const { getUsersByDepartment, getWeekAssignments, getShiftById, getUserShifts } = useShifts();
  const { departmentCodes, departmentOptions, defaultDepartment, getDeptName, getVisibleDepartmentCodes, operationalDepartmentCodes } = useDynamicDepartments();
  const { users: firestoreUsers } = useFirestoreUsers();
  const users = firestoreUsers;
  const { getTasksByUser } = useTasks();

  // Navegación de semana: controlada desde HorariosModule o interna
  const [internalWeekOffset, setInternalWeekOffset] = useState(0);
  const isWeekControlled = propWeekOffset !== undefined && propSetWeekOffset !== undefined;
  const weekOffset = isWeekControlled ? propWeekOffset : internalWeekOffset;
  const setWeekOffset = isWeekControlled ? propSetWeekOffset : setInternalWeekOffset;

  const internalWeekStart = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);
    return start;
  }, [weekOffset]);
  const internalWeekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(internalWeekStart, i));
  }, [internalWeekStart]);
  const weekStart = propWeekStart ?? internalWeekStart;
  const weekDays = propWeekDays ?? internalWeekDays;

  // Departamentos visibles en Equipo según jerarquía pura
  const visibleDeptOptions = useMemo(() => {
    if (!effectiveUser) return departmentOptions;
    const allowed = getVisibleDepartmentCodes(effectiveUser);
    return departmentOptions.filter(d => allowed.includes(d.code));
  }, [departmentOptions, effectiveUser, getVisibleDepartmentCodes]);

  const visibleDeptNames = useMemo(() => visibleDeptOptions.map(d => d.name), [visibleDeptOptions]);

  const showAllDeptOption = useMemo(() => {
    if (!effectiveUser) return false;
    return visibleDeptOptions.length > 1;
  }, [effectiveUser, visibleDeptOptions]);

  // Modales
  const [selectedUser, setSelectedUser] = useState<typeof users[0] | null>(null);
  const [selectedDayInfo, setSelectedDayInfo] = useState<{user: typeof users[0], date: Date} | null>(null);
  const [expandedDayInCalendar, setExpandedDayInCalendar] = useState<Date | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showHeaderDayModal, setShowHeaderDayModal] = useState(false);
  const [selectedHeaderDay, setSelectedHeaderDay] = useState<Date | null>(null);
  const [userCalendarMonth, setUserCalendarMonth] = useState(new Date());
  
  // Modal para registrar incapacidad desde Equipo
  const [showRegisterIncapacityModal, setShowRegisterIncapacityModal] = useState(false);
  const [selectedUserForIncapacity, setSelectedUserForIncapacity] = useState<typeof users[0] | null>(null);
  const [selectedDateForIncapacity, setSelectedDateForIncapacity] = useState<Date | null>(null);
  const [incapacityType, setIncapacityType] = useState<'enfermedad' | 'accidente' | 'cita_medica' | 'inasistencia'>('enfermedad');
  const [incapacityDescription, setIncapacityDescription] = useState('');
  const [incapacityStartDate, setIncapacityStartDate] = useState('');
  const [incapacityEndDate, setIncapacityEndDate] = useState('');
  const [incapacityCalendarMonth, setIncapacityCalendarMonth] = useState(new Date());

  // Solicitudes de tiempo libre aprobadas para mostrar en el calendario de equipo
  const [approvedTimeOff, setApprovedTimeOff] = useState<TimeOffRequest[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'timeOffRequests'), where('status', '==', 'aprobada'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reqs: TimeOffRequest[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userId: data.userId || '',
            userName: data.userName || '',
            department: data.department || '',
            type: data.type || 'otro',
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            reason: data.reason || '',
            status: data.status || 'pendiente',
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            reviewedBy: data.reviewedBy || null,
            reviewedAt: data.reviewedAt?.toDate?.()?.toISOString?.() || null,
            response: data.response || null,
          } as TimeOffRequest;
        });
        setApprovedTimeOff(reqs);
      },
      (error) => console.error('Error al cargar timeOff aprobadas en Equipo:', error)
    );
    return () => unsubscribe();
  }, []);

  const getTimeOffForUserAndDay = (userId: string, date: Date): TimeOffRequest | undefined => {
    const dateStr = toLocalISODate(date);
    return approvedTimeOff.find((r) => r.userId === userId && isDateInRange(dateStr, r.startDate, r.endDate));
  };

  // Obtener usuarios según selección (respetando jerarquía de departamentos visibles)
  const deptUsers = useMemo(() => {
    if (selectedDepartment === 'ALL') {
      return Array.from(
        new Map(
          visibleDeptNames
            .flatMap(name => getUsersByDepartment(name))
            .map(u => [u.id, u])
        ).values()
      );
    }
    return getUsersByDepartment(selectedDepartment);
  }, [users, getUsersByDepartment, selectedDepartment, visibleDeptNames]);

  // Obtener asignaciones (solo departamentos visibles en modo ALL)
  const assignments = useMemo(() => {
    if (selectedDepartment === 'ALL') {
      const visibleDeptCodes = visibleDeptOptions.map(d => d.code);
      const allAssignments: ShiftAssignment[] = [];
      visibleDeptCodes.forEach(dept => {
        allAssignments.push(...getWeekAssignments(dept, weekStart));
      });
      return allAssignments;
    }
    return getWeekAssignments(selectedDepartment, weekStart);
  }, [getWeekAssignments, selectedDepartment, weekStart, visibleDeptOptions]);

  const getUserShiftsForDay = (userId: string, date: Date): Shift[] => {
    const dateStr = toLocalISODate(date);
    const userEmail = users.find(u => u.id === userId)?.email;
    const dayAssignments = assignments.filter(
      a => (a.userId === userId || a.userId === userEmail) && a.date === dateStr && (a.status === AssignmentStatus.PUBLICADO || a.status === 'BORRADOR')
    );
    return dayAssignments
      .map(a => getShiftById(a.shiftId))
      .filter((s): s is Shift => s !== undefined)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Handlers para modales
  const handleUserClick = (u: typeof users[0]) => {
    setSelectedUser(u);
    setUserCalendarMonth(new Date());
    setExpandedDayInCalendar(null);
    setShowUserModal(true);
  };

  const handleDayClick = (u: typeof users[0], date: Date) => {
    setSelectedDayInfo({ user: u, date });
    setShowDayModal(true);
    setExpandedDayInCalendar(null);
  };

  // Handler para abrir modal de registrar incapacidad
  const handleOpenRegisterIncapacity = (u: typeof users[0], date: Date) => {
    setSelectedUserForIncapacity(u);
    setSelectedDateForIncapacity(date);
    setIncapacityType('enfermedad');
    setIncapacityDescription('');
    // Inicializar fechas de incapacidad
    const dateStr = toLocalISODate(date);
    setIncapacityStartDate(dateStr);
    setIncapacityEndDate(dateStr);
    setIncapacityCalendarMonth(new Date(date));
    setShowRegisterIncapacityModal(true);
    setShowDayModal(false);
  };

  // Handler para confirmar registro de incapacidad
  const handleConfirmRegisterIncapacity = async () => {
    if (!selectedUserForIncapacity || !incapacityStartDate || !incapacityEndDate || !incapacityType) return;
    
    // Generar array de fechas entre inicio y fin (usando strings YYYY-MM-DD directamente)
    const dates: string[] = [];
    const [startYear, startMonth, startDay] = incapacityStartDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = incapacityEndDate.split('-').map(Number);
    
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    
    // Registrar la incapacidad en Firestore con la info del usuario seleccionado
    await addIncapacity(
      dates, 
      incapacityType, 
      selectedUserForIncapacity.id, 
      incapacityDescription,
      { name: selectedUserForIncapacity.name, department: selectedUserForIncapacity.department }
    );
    
    setShowRegisterIncapacityModal(false);
    setSelectedUserForIncapacity(null);
    setSelectedDateForIncapacity(null);
    setIncapacityStartDate('');
    setIncapacityEndDate('');
    setIncapacityType('enfermedad');
    setIncapacityDescription('');
  };

  // Generar días del mes para el calendario del usuario
  const generateMonthDays = (year: number, month: number) => {
    const days: Date[] = [];
    const lastDay = new Date(year, month + 1, 0);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  return (
    <div className="space-y-4">
      {/* Header móvil de Equipo: navegación de semana (el filtro de departamento va en el header principal) */}
      <div className="flex flex-row flex-wrap items-center justify-between gap-2 md:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="w-8 h-8 rounded-lg hover:bg-[#F5F5F7] flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-3 py-1.5 text-sm font-medium text-corporate hover:bg-corporate/5 rounded-lg"
          >
            Hoy
          </button>
          <button
            onClick={() => setWeekOffset(prev => prev + 1)}
            className="w-8 h-8 rounded-lg hover:bg-[#F5F5F7] flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Resumen de Tasks del departamento */}
      {(selectedDepartment || user?.department) && (
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {(() => {
            const referenceDate = toLocalISODate(new Date());
            const isAllDepartments = selectedDepartment === 'ALL';
            const targetDept = isAllDepartments ? undefined : (selectedDepartment || user?.department);
            const deptUsersList = isAllDepartments
              ? Array.from(
                  new Map(
                    visibleDeptNames
                      .flatMap(name => getUsersByDepartment(name))
                      .map(u => [u.id, u])
                  ).values()
                )
              : getUsersByDepartment(targetDept as string);
            const deptMemberIds = deptUsersList.map((u) => u.id);

            const belongsToTargetDept = (t: Task) => {
              if (isAllDepartments) return true;
              return t.department === targetDept;
            };

            const now = new Date();
            const isTaskOverdue = (t: Task) => {
              if (!t.dueDate || t.status === 'COMPLETED' || t.status === 'VERIFIED') return false;
              const due = new Date(`${t.dueDate}T${t.dueTime || '23:59'}`);
              return due < now;
            };

            const todayDeptTasks = deptMemberIds.flatMap((memberId) =>
              getTasksByUser(memberId).filter(
                (t) => belongsToTargetDept(t) && t.dueDate === referenceDate
              )
            );
            const uniqueTodayTasks = [...new Map(todayDeptTasks.map((t) => [t.id, t])).values()] as Task[];

            const overdueDeptTasks = deptMemberIds.flatMap((memberId) =>
              getTasksByUser(memberId).filter(
                (t) => belongsToTargetDept(t) && isTaskOverdue(t)
              )
            );
            const uniqueOverdueTasks = [...new Map(overdueDeptTasks.map((t) => [t.id, t])).values()] as Task[];
            const overduePreviousTasks = uniqueOverdueTasks.filter((t) => t.dueDate < referenceDate);

            const completedToday = uniqueTodayTasks.filter(
              (t) => t.status === 'COMPLETED' || t.status === 'VERIFIED'
            ).length;
            const pendingToday = uniqueTodayTasks.filter(
              (t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS'
            ).length;
            const totalTasks = uniqueTodayTasks.length + overduePreviousTasks.length;

            const memberProgress = deptMemberIds.map((memberId) => {
              const memberTasks = getTasksByUser(memberId).filter(
                (t) => belongsToTargetDept(t) && t.dueDate === referenceDate
              );
              const memberCompleted = memberTasks.filter(
                (t) => t.status === 'COMPLETED' || t.status === 'VERIFIED'
              ).length;
              return memberTasks.length > 0 ? memberCompleted / memberTasks.length : 1;
            });
            const teamProgress =
              memberProgress.length > 0
                ? Math.round(
                    (memberProgress.reduce((a, b) => a + b, 0) / memberProgress.length) * 100
                  )
                : 0;

            const title = isAllDepartments
              ? 'Tasks del equipo - Todos los departamentos'
              : `Tasks del equipo - ${getDeptName(targetDept as string)}`;

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-corporate" />
                    <span className="text-sm font-medium text-[#1D1D1F]">{title}</span>
                  </div>
                  <span className="text-xs font-medium text-green-600">{teamProgress}%</span>
                </div>
                <div className="h-1.5 bg-[#E5E5E7] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${teamProgress}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#F5F5F7] rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-[#1D1D1F]">{totalTasks}</p>
                    <p className="text-[10px] text-[#86868B]">Total</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-green-600">{completedToday}</p>
                    <p className="text-[10px] text-green-700">Completados</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-amber-600">{pendingToday}</p>
                    <p className="text-[10px] text-amber-700">Pendientes</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-red-600">{uniqueOverdueTasks.length}</p>
                    <p className="text-[10px] text-red-700">Atrasados</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Calendario */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] w-full max-w-full min-w-0">
        <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[12rem_1fr]">
          {/* Columna fija de colaboradores */}
          <div className="bg-white z-10 border-r border-[#E5E5E7]">
            <div className="h-14 sm:h-16 flex items-center p-1 sm:p-4 text-xs sm:text-sm font-medium text-[#86868B] border-b border-[#E5E5E7]">
              Colaborador
            </div>
            {deptUsers.map((u, rowIdx) => {
              const isLastRow = rowIdx === deptUsers.length - 1;
              return (
                <div key={u.id} className={cn("min-h-[72px] sm:min-h-[88px] flex items-center p-1 sm:p-4 border-b border-[#E5E5E7]", isLastRow && "border-b-0")}>
                  <button
                    onClick={() => handleUserClick(u)}
                    className="flex flex-col items-center gap-1 w-full text-left hover:bg-[#F5F5F7] rounded-lg p-1 -m-1 transition-colors sm:flex-row sm:items-center sm:gap-3"
                  >
                    <UserAvatar name={u.name} photoUrl={u.photoURL || u.avatar} size="sm" />
                    <div className="text-center sm:text-left min-w-0">
                      <p className="text-[10px] sm:text-sm font-medium text-[#1D1D1F] leading-tight truncate">{u.name.split(' ')[0]}</p>
                      <p className="hidden sm:block text-xs text-[#86868B] truncate">{u.position}</p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Área scrollable de días */}
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Header de días */}
              <div className="h-14 sm:h-16 grid grid-cols-7 border-b border-[#E5E5E7]">
                {weekDays.map((day, i) => (
                  <div key={i} className="text-center p-1 sm:p-2 text-xs sm:text-sm font-medium text-[#86868B] flex items-center justify-center">
                    <button
                      onClick={() => {
                        setSelectedHeaderDay(day);
                        setShowHeaderDayModal(true);
                      }}
                      className="w-full py-1 sm:py-2 rounded-lg hover:bg-[#F5F5F7] transition-colors"
                    >
                      <div className="hidden sm:block">{['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'][i]}</div>
                      <div className="sm:hidden">{['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'][i]}</div>
                      <div className="text-[10px] sm:text-xs text-[#C7C7CC]">{day.getDate()}</div>
                    </button>
                  </div>
                ))}
              </div>

              {/* Filas de días */}
              {deptUsers.map((u, rowIdx) => {
                const isLastRow = rowIdx === deptUsers.length - 1;
                return (
                  <div key={u.id} className={cn("min-h-[72px] sm:min-h-[88px] grid grid-cols-7 border-b border-[#E5E5E7]", isLastRow && "border-b-0")}>
                    {weekDays.map((day, i) => {
                      const dayShifts = getUserShiftsForDay(u.id, day);
                      const dateStr = toLocalISODate(day);
                      const incapacityInfo = getIncapacityForDate(dateStr, u.id);
                      const hasIncapacity = !!incapacityInfo;
                      const timeOffInfo = getTimeOffForUserAndDay(u.id, day);
                      const hasTimeOff = !!timeOffInfo;

                      // Configuración de colores por tipo de incapacidad
                      const incapacityConfig: Record<string, { color: string, bgColor: string, borderColor: string }> = {
                        enfermedad: { color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
                        accidente: { color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
                        cita_medica: { color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
                        inasistencia: { color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
                      };
                      const incapacityStyle = incapacityInfo ? incapacityConfig[incapacityInfo.type] : null;
                      const timeOffStyle = timeOffInfo ? TIME_OFF_VISUAL[timeOffInfo.type] : null;

                      return (
                        <div key={i} className={cn("p-1 sm:p-2 text-center align-middle min-w-0", isLastRow ? "" : "border-b border-[#E5E5E7]")}>
                          <button
                            onClick={() => handleDayClick(u, day)}
                            className="w-full min-w-0"
                          >
                            <div className="space-y-1 min-w-0">
                              {hasIncapacity && incapacityStyle ? (
                                <div className={cn(
                                  'px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium border min-w-0 break-words',
                                  incapacityStyle.bgColor,
                                  incapacityStyle.color,
                                  incapacityStyle.borderColor
                                )}>
                                  {incapacityInfo.type === 'enfermedad' && 'Enfermedad'}
                                  {incapacityInfo.type === 'accidente' && 'Accidente'}
                                  {incapacityInfo.type === 'cita_medica' && 'Cita méd.'}
                                  {incapacityInfo.type === 'inasistencia' && 'Inasist.'}
                                </div>
                              ) : hasTimeOff && timeOffStyle ? (
                                <div className={cn(
                                  'px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium border min-w-0 break-words',
                                  timeOffStyle.bgColor,
                                  timeOffStyle.color,
                                  timeOffStyle.borderColor
                                )}>
                                  {TIME_OFF_LABELS[timeOffInfo.type]}
                                </div>
                              ) : null}
                              {dayShifts.length > 0 && (
                                <div className="space-y-1">
                                  {dayShifts.map((shift, idx) => {
                                    const isCrossDept = shift.department !== u.department;
                                    return (
                                      <div
                                        key={idx}
                                        className={cn(
                                          'px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all hover:scale-105 min-w-0 break-words',
                                          isCrossDept && 'ring-1 ring-amber-400'
                                        )}
                                        style={{
                                          backgroundColor: `${shift.color}20`,
                                          color: shift.color,
                                        }}
                                        title={`${shift.name} (${shift.startTime} - ${shift.endTime})${isCrossDept ? ' - ' + shift.department.replace(/_/g, ' ') : ''}${shift.swapRequestId ? ' - Cambiado' : ''}`}
                                      >
                                        <div className="flex flex-wrap items-center justify-center gap-1">
                                          <span className="break-words leading-tight">{shift.name}</span>
                                          {shift.swapRequestId && (
                                            <RefreshCw className="w-3 h-3 flex-shrink-0 text-amber-600" />
                                          )}
                                          {isCrossDept && (
                                            <DeptIcon department={shift.department} className="w-3 h-3 flex-shrink-0" />
                                          )}
                                        </div>
                                        <div className="text-[9px] opacity-70">
                                          {shift.startTime}-{shift.endTime}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {!hasIncapacity && !hasTimeOff && dayShifts.length === 0 && (
                                <span className="text-[#C7C7CC] hover:bg-[#F5F5F7] rounded-lg px-3 py-2 block transition-colors">-</span>
                              )}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de información del usuario */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Información del colaborador</span>
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* Info principal */}
              <div className="flex items-center gap-4">
                <UserAvatar name={selectedUser.name} photoUrl={selectedUser.photoURL || selectedUser.avatar} size="xl" />
                <div>
                  <h3 className="text-lg font-semibold text-[#1D1D1F]">{selectedUser.name}</h3>
                  <p className="text-sm text-[#86868B]">{selectedUser.position}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <DeptIcon department={selectedUser.department} className="w-4 h-4 text-corporate" />
                    <span className="text-xs text-corporate">{selectedUser.department.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Detalles */}
              <div className="space-y-3 bg-[#F5F5F7] rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-[#86868B]" />
                  <div>
                    <p className="text-xs text-[#86868B]">Rol</p>
                    <p className="text-sm text-[#1D1D1F]">{selectedUser.role.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#86868B]" />
                  <div>
                    <p className="text-xs text-[#86868B]">Email</p>
                    <p className="text-sm text-[#1D1D1F]">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#86868B]" />
                  <div>
                    <p className="text-xs text-[#86868B]">Teléfono</p>
                    <p className="text-sm text-[#1D1D1F]">{selectedUser.phone || 'No registrado'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-[#86868B]" />
                  <div>
                    <p className="text-xs text-[#86868B]">Estado</p>
                    <p className="text-sm text-[#1D1D1F]">{selectedUser.isActive ? 'Activo' : 'Inactivo'}</p>
                  </div>
                </div>
              </div>

              {/* Estadísticas del mes */}
              {(() => {
                const year = userCalendarMonth.getFullYear();
                const month = userCalendarMonth.getMonth();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                let workingDays = 0;
                let freeDays = 0;
                let totalShifts = 0;
                let incapacityDays = 0;
                const todayStr = toLocalISODate(new Date());
                const todayShifts = getUserShifts(selectedUser.id, todayStr);
                
                for (let d = 1; d <= daysInMonth; d++) {
                  const date = new Date(year, month, d);
                  const dateStr = toLocalISODate(date);
                  const dayShifts = getUserShifts(selectedUser.id, dateStr);
                  const incapacityInfo = getIncapacityForDate(dateStr, selectedUser.id);
                  
                  if (incapacityInfo) {
                    incapacityDays++;
                  } else if (dayShifts.length > 0) {
                    workingDays++;
                    totalShifts += dayShifts.length;
                  } else {
                    freeDays++;
                  }
                }
                
                return (
                  <div>
                    <h4 className="text-sm font-medium text-[#1D1D1F] mb-3 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      Estadísticas de {userCalendarMonth.toLocaleDateString('es-ES', { month: 'long' })}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-green-50 rounded-xl p-3 text-center">
                        <p className="text-xl sm:text-2xl font-bold text-green-600">{workingDays}</p>
                        <p className="text-xs text-green-700">Días trabajados</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3 text-center">
                        <p className="text-xl sm:text-2xl font-bold text-blue-600">{freeDays}</p>
                        <p className="text-xs text-blue-700">Días libres</p>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-3 text-center">
                        <p className="text-xl sm:text-2xl font-bold text-purple-600">{totalShifts}</p>
                        <p className="text-xs text-purple-700">Total turnos</p>
                      </div>
                      <div className="bg-red-50 rounded-xl p-3 text-center">
                        <p className="text-xl sm:text-2xl font-bold text-red-600">{incapacityDays}</p>
                        <p className="text-xs text-red-700">Incapacidades</p>
                      </div>
                    </div>
                    
                    {/* Turnos de hoy */}
                    <div className="mt-3 bg-corporate/5 rounded-xl p-3">
                      <p className="text-xs text-corporate font-medium mb-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Turnos de hoy:
                      </p>
                      {todayShifts.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {todayShifts.map((shift, i) => (
                            <span 
                              key={i}
                              className="text-xs px-2 py-1 rounded-full font-medium"
                              style={{ backgroundColor: `${shift.color}30`, color: shift.color }}
                            >
                              {shift.name} ({shift.startTime}-{shift.endTime})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#86868B]">Sin turnos asignados hoy</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Calendario con navegación */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-[#1D1D1F] flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Calendario
                  </h4>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setUserCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                      className="w-7 h-7 rounded-lg hover:bg-[#F5F5F7] flex items-center justify-center"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-[#1D1D1F] min-w-[100px] text-center">
                      {userCalendarMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      onClick={() => setUserCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                      className="w-7 h-7 rounded-lg hover:bg-[#F5F5F7] flex items-center justify-center"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="bg-[#F5F5F7] rounded-xl p-4">
                  {/* Días de la semana */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
                      <div key={i} className="text-center text-xs text-[#86868B] py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Grid de días */}
                  <div className="grid grid-cols-7 gap-1">
                    {generateMonthDays(userCalendarMonth.getFullYear(), userCalendarMonth.getMonth()).map((date, index) => {
                      const dateStr = toLocalISODate(date);
                      const dayShifts = getUserShifts(selectedUser.id, dateStr);
                      const hasShifts = dayShifts.length > 0;
                      const dayTasks = getTasksByUser(selectedUser.id).filter(t => t.dueDate === dateStr);
                      const hasTasks = dayTasks.length > 0;
                      const isExpanded = expandedDayInCalendar?.toISOString().split('T')[0] === dateStr;
                      const isToday = dateStr === toLocalISODate(new Date());
                      const incapacityInfo = getIncapacityForDate(dateStr, selectedUser.id);
                      const hasIncapacity = !!incapacityInfo;
                      const timeOffInfo = getTimeOffForUserAndDay(selectedUser.id, date);
                      const hasTimeOff = !!timeOffInfo;
                      
                      // Configuración de iconos y colores por tipo de incapacidad
                      const incapacityConfig: Record<string, { color: string, bgColor: string }> = {
                        enfermedad: { color: 'text-red-500', bgColor: 'bg-red-100' },
                        accidente: { color: 'text-orange-500', bgColor: 'bg-orange-100' },
                        cita_medica: { color: 'text-blue-500', bgColor: 'bg-blue-100' },
                        inasistencia: { color: 'text-purple-500', bgColor: 'bg-purple-100' },
                      };
                      const incapacityStyle = incapacityInfo ? incapacityConfig[incapacityInfo.type] : null;
                      const timeOffStyle = timeOffInfo ? TIME_OFF_VISUAL[timeOffInfo.type] : null;
                      
                      return (
                        <div key={index} className="relative">
                          <button
                            onClick={() => setExpandedDayInCalendar(isExpanded ? null : date)}
                            className={cn(
                              'w-full aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all',
                              isToday ? 'ring-2 ring-corporate bg-corporate/10' : 'hover:bg-white',
                              hasShifts && 'font-medium',
                              hasIncapacity && incapacityStyle?.bgColor,
                              !hasIncapacity && hasTimeOff && timeOffStyle?.bgColor
                            )}
                            style={hasShifts && !hasIncapacity && !hasTimeOff ? { color: dayShifts[0]?.color } : {}}
                          >
                            <span className={cn(isToday ? 'text-corporate font-bold' : '', hasIncapacity && incapacityStyle?.color, !hasIncapacity && hasTimeOff && timeOffStyle?.color)}>{date.getDate()}</span>
                            {(hasShifts || hasTasks || hasIncapacity || hasTimeOff) && (
                              <div className="flex gap-0.5 mt-0.5">
                                {hasIncapacity && <span className={cn("w-1.5 h-1.5 rounded-full", incapacityStyle?.bgColor.replace('100', '500'))} />}
                                {!hasIncapacity && hasTimeOff && <span className={cn("w-1.5 h-1.5 rounded-full", timeOffStyle?.bgColor.replace('100', '500'))} />}
                                {hasShifts && !hasIncapacity && !hasTimeOff && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dayShifts[0]?.color }} />}
                                {hasTasks && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                              </div>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Expansión completa del día seleccionado */}
                {expandedDayInCalendar && (
                  <div className="mt-3 bg-white rounded-xl border border-[#E5E5E7] p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-[#1D1D1F]">
                        {expandedDayInCalendar.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <button 
                        onClick={() => setExpandedDayInCalendar(null)}
                        className="text-xs text-[#86868B] hover:text-[#1D1D1F] px-2 py-1 rounded-lg hover:bg-[#F5F5F7]"
                      >
                        Cerrar
                      </button>
                    </div>
                    {(() => {
                      const dateStr = expandedDayInCalendar.toISOString().split('T')[0];
                      const dayShifts = getUserShifts(selectedUser.id, dateStr);
                      const dayTasks = getTasksByUser(selectedUser.id).filter(t => t.dueDate === dateStr);
                      
                      const incapacityInfo = getIncapacityForDate(dateStr, selectedUser.id);
                      const hasIncapacity = !!incapacityInfo;
                      
                      // Configuración de iconos y colores por tipo de incapacidad
                      const incapacityConfig: Record<string, { icon: React.ElementType, color: string, bgColor: string, label: string }> = {
                        enfermedad: { icon: Activity, color: 'text-red-500', bgColor: 'bg-red-100', label: 'Enfermedad' },
                        accidente: { icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-100', label: 'Accidente' },
                        cita_medica: { icon: Stethoscope, color: 'text-blue-500', bgColor: 'bg-blue-100', label: 'Cita médica' },
                        inasistencia: { icon: UserX, color: 'text-purple-500', bgColor: 'bg-purple-100', label: 'Inasistencia' },
                      };
                      const incapacityStyle = incapacityInfo ? incapacityConfig[incapacityInfo.type] : null;
                      const IncapacityIcon = incapacityStyle?.icon;
                      
                      return (
                        <div className="space-y-3">
                          {/* Incapacidad */}
                          {hasIncapacity && incapacityStyle && IncapacityIcon && (
                            <div>
                              <p className="text-xs text-[#86868B] mb-2 flex items-center gap-1">
                                <HeartPulse className="w-3 h-3" /> Incapacidad:
                              </p>
                              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", incapacityStyle.bgColor)}>
                                <IncapacityIcon className={cn("w-4 h-4", incapacityStyle.color)} />
                                <span className={cn("text-sm font-medium", incapacityStyle.color)}>
                                  {incapacityStyle.label}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Tiempo libre aprobado */}
                          {(() => {
                            const dateStr = expandedDayInCalendar.toISOString().split('T')[0];
                            const hasIncapacity = !!getIncapacityForDate(dateStr, selectedUser.id);
                            const timeOffInfo = getTimeOffForUserAndDay(selectedUser.id, expandedDayInCalendar);
                            if (hasIncapacity || !timeOffInfo) return null;
                            const style = TIME_OFF_VISUAL[timeOffInfo.type];
                            const Icon = style.icon;
                            return (
                              <div>
                                <p className="text-xs text-[#86868B] mb-2 flex items-center gap-1">
                                  <Sun className="w-3 h-3" /> Tiempo libre:
                                </p>
                                <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border", style.bgColor, style.borderColor)}>
                                  <Icon className={cn("w-4 h-4", style.color)} />
                                  <span className={cn("text-sm font-medium", style.color)}>
                                    {TIME_OFF_LABELS[timeOffInfo.type]}
                                  </span>
                                  <span className="text-xs text-[#86868B]">
                                    {formatTimeOffRange(timeOffInfo.startDate, timeOffInfo.endDate)}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                          
                          {/* Turnos */}
                          <div>
                            <p className="text-xs text-[#86868B] mb-2 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Turnos ({dayShifts.length}):
                            </p>
                            {dayShifts.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {dayShifts.map((shift, i) => (
                                  <div 
                                    key={i} 
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                                    style={{ backgroundColor: `${shift.color}15` }}
                                  >
                                    <div 
                                      className="w-2 h-2 rounded-full" 
                                      style={{ backgroundColor: shift.color }}
                                    />
                                    <span className="text-sm font-medium" style={{ color: shift.color }}>
                                      {shift.name}
                                    </span>
                                    <span className="text-xs text-[#86868B]">
                                      {shift.startTime}-{shift.endTime}
                                    </span>
                                    {shift.department !== selectedUser.department && (
                                      <DeptIcon department={shift.department} className="w-3 h-3 text-amber-500" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-[#86868B]">Sin turnos asignados</p>
                            )}
                          </div>
                          
                          {/* Tareas */}
                          <div>
                            <p className="text-xs text-[#86868B] mb-2 flex items-center gap-1">
                              <CheckSquare className="w-3 h-3" /> Tareas ({dayTasks.length}):
                            </p>
                            {dayTasks.length > 0 ? (
                              <div className="space-y-2">
                                {dayTasks.map((task, i) => (
                                  <div key={i} className="flex items-start gap-2 p-2 bg-[#F5F5F7] rounded-lg">
                                    <div 
                                      className={cn(
                                        'w-2 h-2 rounded-full mt-1 flex-shrink-0',
                                        task.priority === 'HIGH' && 'bg-red-500',
                                        task.priority === 'MEDIUM' && 'bg-amber-500',
                                        task.priority === 'LOW' && 'bg-green-500'
                                      )}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-[#1D1D1F]">{task.title}</p>
                                      {task.description && (
                                        <p className="text-xs text-[#86868B] line-clamp-2">{task.description}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-[#86868B]">Sin tareas asignadas</p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de día seleccionado */}
      <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDayInfo && (
                <div className="flex items-center gap-3">
                  <UserAvatar name={selectedDayInfo.user.name} photoUrl={selectedDayInfo.user.photoURL || selectedDayInfo.user.avatar} size="md" />
                  <div>
                    <p className="text-lg">{selectedDayInfo.user.name}</p>
                    <p className="text-sm font-normal text-[#86868B]">
                      {selectedDayInfo.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedDayInfo && (
            <div className="space-y-4">
              {/* Información del usuario */}
              <div className="bg-[#F5F5F7] rounded-xl p-3">
                <div className="flex items-center gap-2 text-sm text-[#86868B]">
                  <Briefcase className="w-4 h-4" />
                  <span>{selectedDayInfo.user.position}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#86868B] mt-1">
                  <DeptIcon department={selectedDayInfo.user.department} className="w-4 h-4" />
                  <span>{selectedDayInfo.user.department.replace(/_/g, ' ')}</span>
                </div>
              </div>

              {/* Incapacidad - si existe */}
              {(() => {
                const dateStr = toLocalISODate(selectedDayInfo.date);
                const incapacityInfo = getIncapacityForDate(dateStr, selectedDayInfo.user.id);
                if (!incapacityInfo) return null;
                
                const incapacityConfig: Record<string, { icon: React.ElementType, color: string, bgColor: string, label: string }> = {
                  enfermedad: { icon: Activity, color: 'text-red-500', bgColor: 'bg-red-50', label: 'Enfermedad' },
                  accidente: { icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-50', label: 'Accidente' },
                  cita_medica: { icon: Stethoscope, color: 'text-blue-500', bgColor: 'bg-blue-50', label: 'Cita médica' },
                  inasistencia: { icon: UserX, color: 'text-purple-500', bgColor: 'bg-purple-50', label: 'Inasistencia' },
                };
                const config = incapacityConfig[incapacityInfo.type];
                const Icon = config?.icon;
                
                return (
                  <div>
                    <h4 className="text-sm font-medium text-[#1D1D1F] mb-2 flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-red-500" />
                      Incapacidad registrada
                    </h4>
                    <div className={cn("flex items-center gap-3 p-3 rounded-lg", config?.bgColor)}>
                      {Icon && <Icon className={cn("w-5 h-5", config?.color)} />}
                      <span className={cn("font-medium", config?.color)}>{config?.label}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Tiempo libre aprobado - si existe y no hay incapacidad */}
              {(() => {
                const dateStr = toLocalISODate(selectedDayInfo.date);
                const hasIncapacity = !!getIncapacityForDate(dateStr, selectedDayInfo.user.id);
                const timeOffInfo = getTimeOffForUserAndDay(selectedDayInfo.user.id, selectedDayInfo.date);
                if (hasIncapacity || !timeOffInfo) return null;
                const style = TIME_OFF_VISUAL[timeOffInfo.type];
                const Icon = style.icon;
                return (
                  <div>
                    <h4 className="text-sm font-medium text-[#1D1D1F] mb-2 flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      Tiempo libre aprobado
                    </h4>
                    <div className={cn("flex items-center gap-3 p-3 rounded-lg border", style.bgColor, style.borderColor)}>
                      <Icon className={cn("w-5 h-5", style.color)} />
                      <div>
                        <span className={cn("font-medium", style.color)}>{TIME_OFF_LABELS[timeOffInfo.type]}</span>
                        <p className="text-xs text-[#86868B]">{formatTimeOffRange(timeOffInfo.startDate, timeOffInfo.endDate)}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Turnos del día */}
              <div>
                <h4 className="text-sm font-medium text-[#1D1D1F] mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-corporate" />
                  Turnos asignados
                </h4>
                {(() => {
                  const dateStr = toLocalISODate(selectedDayInfo.date);
                  const dayShifts = getUserShifts(selectedDayInfo.user.id, dateStr);
                  return dayShifts.length > 0 ? (
                    <div className="space-y-2">
                      {dayShifts.map((shift, i) => {
                        const isCrossDept = shift.department !== selectedDayInfo.user.department;
                        return (
                          <div 
                            key={i}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-lg',
                              isCrossDept && 'ring-1 ring-amber-400'
                            )}
                            style={{ backgroundColor: `${shift.color}15` }}
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: shift.color }}
                              />
                              <span className="font-medium" style={{ color: shift.color }}>
                                {shift.name}
                              </span>
                              {isCrossDept && (
                                <DeptIcon department={shift.department} className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                            <span className="text-sm text-[#86868B]">
                              {shift.startTime} - {shift.endTime}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-[#86868B] bg-[#F5F5F7] rounded-lg p-3">
                      Sin turnos asignados
                    </p>
                  );
                })()}
              </div>

              {/* Tareas del día */}
              <div>
                <h4 className="text-sm font-medium text-[#1D1D1F] mb-2 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-corporate" />
                  Tareas asignadas
                </h4>
                {(() => {
                  const dateStr = toLocalISODate(selectedDayInfo.date);
                  const dayTasks = getTasksByUser(selectedDayInfo.user.id).filter(t => t.dueDate === dateStr);
                  return dayTasks.length > 0 ? (
                    <div className="space-y-2">
                      {dayTasks.map((task, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 bg-[#F5F5F7] rounded-lg">
                          <div 
                            className={cn(
                              'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                              task.priority === 'HIGH' && 'bg-red-500',
                              task.priority === 'MEDIUM' && 'bg-amber-500',
                              task.priority === 'LOW' && 'bg-green-500'
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1D1D1F] truncate">{task.title}</p>
                            <p className="text-xs text-[#86868B] line-clamp-2">{task.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#86868B] bg-[#F5F5F7] rounded-lg p-3">
                      Sin tareas asignadas
                    </p>
                  );
                })()}
              </div>

              {/* Botón para registrar incapacidad - solo si no hay incapacidad */}
              {(() => {
                const dateStr = toLocalISODate(selectedDayInfo.date);
                const hasIncapacity = !!getIncapacityForDate(dateStr, selectedDayInfo.user.id);
                if (hasIncapacity) return null;
                
                return (
                  <div className="pt-2 border-t border-[#E5E5E7]">
                    <button
                      onClick={() => handleOpenRegisterIncapacity(selectedDayInfo.user, selectedDayInfo.date)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      <HeartPulse className="w-4 h-4" />
                      Registrar incapacidad
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para registrar incapacidad desde Equipo */}
      <Dialog open={showRegisterIncapacityModal} onOpenChange={setShowRegisterIncapacityModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <HeartPulse className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-lg">Registrar Incapacidad</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedUserForIncapacity && selectedDateForIncapacity && (
            <div className="space-y-4">
              {/* Info del usuario seleccionado */}
              <div className="bg-[#F5F5F7] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <UserAvatar name={selectedUserForIncapacity.name} photoUrl={selectedUserForIncapacity.photoURL || selectedUserForIncapacity.avatar} size="lg" />
                  <div>
                    <p className="font-medium text-[#1D1D1F]">{selectedUserForIncapacity.name}</p>
                    <p className="text-sm text-[#86868B]">{selectedUserForIncapacity.position}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#86868B]">
                  <DeptIcon department={selectedUserForIncapacity.department} className="w-4 h-4" />
                  <span>{selectedUserForIncapacity.department.replace(/_/g, ' ')}</span>
                </div>
              </div>

              {/* Calendario de selección de fechas */}
              <div>
                <label className="text-sm font-medium text-[#1D1D1F] mb-2 block">Selecciona el rango de fechas</label>
                <div className="bg-[#F5F5F7] rounded-xl p-4">
                  {/* Navegación del mes */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setIncapacityCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                      className="w-7 h-7 rounded-lg bg-white hover:bg-corporate/10 flex items-center justify-center transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-[#1D1D1F]" />
                    </button>
                    <span className="text-sm font-medium text-[#1D1D1F]">
                      {incapacityCalendarMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      onClick={() => setIncapacityCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                      className="w-7 h-7 rounded-lg bg-white hover:bg-corporate/10 flex items-center justify-center transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-[#1D1D1F]" />
                    </button>
                  </div>
                  
                  {/* Días de la semana */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                      <div key={i} className="text-center text-[10px] font-medium text-[#86868B] py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Grid de días */}
                  <div className="grid grid-cols-7 gap-1">
                    {generateIncapacityMonthDays(incapacityCalendarMonth.getFullYear(), incapacityCalendarMonth.getMonth()).map((dStr, i) => {
                      const isSelected = incapacityStartDate && incapacityEndDate && dStr >= incapacityStartDate && dStr <= incapacityEndDate;
                      const isStart = dStr === incapacityStartDate;
                      const isEnd = dStr === incapacityEndDate;
                      
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (!incapacityStartDate) {
                              // Primer clic: establecer inicio
                              setIncapacityStartDate(dStr);
                              setIncapacityEndDate('');
                            } else if (!incapacityEndDate) {
                              // Segundo clic: establecer fin
                              if (dStr < incapacityStartDate) {
                                // Si clickeó antes del inicio, invertir
                                setIncapacityEndDate(incapacityStartDate);
                                setIncapacityStartDate(dStr);
                              } else {
                                setIncapacityEndDate(dStr);
                              }
                            } else {
                              // Tercer clic: reiniciar con nueva fecha de inicio
                              setIncapacityStartDate(dStr);
                              setIncapacityEndDate('');
                            }
                          }}
                          className={cn(
                            'w-8 h-8 text-xs rounded-lg transition-colors',
                            isStart || isEnd ? 'bg-corporate text-white' : 
                            isSelected ? 'bg-corporate/20 text-corporate' : 
                            'hover:bg-white text-[#1D1D1F]'
                          )}
                        >
                          {getDayFromString(dStr)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Mostrar rango seleccionado */}
                {(incapacityStartDate || incapacityEndDate) && (
                  <div className="text-center text-sm bg-white rounded-lg py-2 mt-2 border border-[#E5E5E7]">
                    <span className="text-[#86868B]">Desde:</span>{' '}
                    <span className="font-medium text-corporate">
                      {incapacityStartDate ? formatDateFromString(incapacityStartDate) : '...'}
                    </span>
                    {' '}<span className="text-[#86868B]">hasta:</span>{' '}
                    <span className="font-medium text-corporate">
                      {incapacityEndDate ? formatDateFromString(incapacityEndDate) : '...'}
                    </span>
                  </div>
                )}
              </div>

              {/* Tipo de incapacidad */}
              <div>
                <label className="text-sm font-medium text-[#1D1D1F] mb-2 block">Tipo de incapacidad</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'enfermedad', label: 'Enfermedad', icon: Activity, color: 'text-red-500', bgColor: 'bg-red-50' },
                    { id: 'accidente', label: 'Accidente', icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-50' },
                    { id: 'cita_medica', label: 'Cita médica', icon: Stethoscope, color: 'text-blue-500', bgColor: 'bg-blue-50' },
                    { id: 'inasistencia', label: 'Inasistencia', icon: UserX, color: 'text-purple-500', bgColor: 'bg-purple-50' },
                  ].map((type) => {
                    const TypeIcon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setIncapacityType(type.id as typeof incapacityType)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border',
                          incapacityType === type.id
                            ? cn(type.bgColor, type.color, 'border-current')
                            : 'bg-white text-[#86868B] border-[#E5E5E7] hover:border-[#C7C7CC]'
                        )}
                      >
                        <TypeIcon className="w-4 h-4" />
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-sm font-medium text-[#1D1D1F] mb-1 block">Descripción (opcional)</label>
                <textarea
                  value={incapacityDescription}
                  onChange={(e) => setIncapacityDescription(e.target.value)}
                  placeholder="Añade detalles sobre la incapacidad..."
                  className="w-full px-3 py-2 border border-[#E5E5E7] rounded-lg text-sm min-h-[80px] resize-none"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowRegisterIncapacityModal(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleConfirmRegisterIncapacity}
                  disabled={!incapacityStartDate || !incapacityEndDate || !incapacityType}
                >
                  <HeartPulse className="w-4 h-4 mr-1.5" />
                  Registrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de día del header - Información del departamento */}
      <Dialog open={showHeaderDayModal} onOpenChange={setShowHeaderDayModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedHeaderDay && (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-corporate/10 rounded-xl flex items-center justify-center">
                    <CalendarDays className="w-6 h-6 text-corporate" />
                  </div>
                  <div>
                    <p className="text-lg">
                      {selectedHeaderDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-sm font-normal text-[#86868B]">
                      {selectedDepartment === 'ALL' ? 'Todos los departamentos' : selectedDepartment.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedHeaderDay && (
            <div className="space-y-6">
              {(() => {
                const dateStr = toLocalISODate(selectedHeaderDay);
                
                // Obtener usuarios según el departamento seleccionado (jerarquía pura en ALL)
                const relevantUsers = selectedDepartment === 'ALL'
                  ? Array.from(
                      new Map(
                        visibleDeptNames
                          .flatMap(name => getUsersByDepartment(name))
                          .map(u => [u.id, u])
                      ).values()
                    )
                  : getUsersByDepartment(selectedDepartment);
                
                // Obtener turnos de cada usuario para este día
                const usersWithShifts = relevantUsers.map(u => ({
                  user: u,
                  shifts: getUserShifts(u.id, dateStr)
                }));
                
                // Agrupar por turno
                const shiftGroups: Record<string, typeof usersWithShifts> = {};
                const usersWithDifferentShifts: typeof usersWithShifts = [];
                const freeUsers: typeof usersWithShifts = [];
                
                usersWithShifts.forEach(uws => {
                  // Si tiene incapacidad, solo se muestra en la sección de incapacidades
                  if (getIncapacityForDate(dateStr, uws.user.id)) return;

                  if (uws.shifts.length === 0) {
                    freeUsers.push(uws);
                  } else if (uws.shifts.length === 1) {
                    const shiftName = uws.shifts[0].name;
                    if (!shiftGroups[shiftName]) shiftGroups[shiftName] = [];
                    shiftGroups[shiftName].push(uws);
                  } else {
                    usersWithDifferentShifts.push(uws);
                  }
                });
                
                // Encontrar responsables (gerente/supervisor) con turno ese día, excluyendo incapacitados
                const managersOnDuty = usersWithShifts.filter(uws => 
                  (uws.user.role === Role.GERENTE_DEPARTAMENTO || uws.user.role === Role.SUPERVISOR) &&
                  uws.shifts.length > 0 &&
                  !getIncapacityForDate(dateStr, uws.user.id)
                );
                
                // Tasks del departamento
                const deptTasks = selectedDepartment === 'ALL'
                  ? relevantUsers.flatMap(u => getTasksByUser(u.id).filter(t => t.dueDate === dateStr))
                  : relevantUsers.flatMap(u => getTasksByUser(u.id).filter(t => t.dueDate === dateStr));
                
                const tasksCompleted = deptTasks.filter(t => t.status === 'COMPLETED' || t.status === 'VERIFIED').length;
                const tasksOverdue = deptTasks.filter(t => t.status === 'OVERDUE' || (new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED' && t.status !== 'VERIFIED')).length;
                const tasksPending = deptTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;
                const totalTasks = deptTasks.length;
                const completionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;
                
                return (
                  <>
                    {/* Resumen de Tasks */}
                    <div className="bg-[#F5F5F7] rounded-xl p-4">
                      <h4 className="text-sm font-medium text-[#1D1D1F] mb-3 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-corporate" />
                        Estado de Tasks
                      </h4>
                      <div className="space-y-3">
                        {/* Barra de progreso */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#86868B] w-16">Progreso</span>
                          <div className="flex-1 h-2 bg-[#E5E5E7] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-[#1D1D1F] w-12 text-right">{completionRate}%</span>
                        </div>
                        {/* Contadores */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white rounded-lg p-3 text-center">
                            <p className="text-lg sm:text-xl font-bold text-[#1D1D1F]">{totalTasks}</p>
                            <p className="text-[10px] text-[#86868B]">Total</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3 text-center">
                            <p className="text-lg sm:text-xl font-bold text-green-600">{tasksCompleted}</p>
                            <p className="text-[10px] text-green-700">Realizados</p>
                          </div>
                          <div className="bg-amber-50 rounded-lg p-3 text-center">
                            <p className="text-lg sm:text-xl font-bold text-amber-600">{tasksPending}</p>
                            <p className="text-[10px] text-amber-700">Pendientes</p>
                          </div>
                          <div className="bg-red-50 rounded-lg p-3 text-center">
                            <p className="text-lg sm:text-xl font-bold text-red-600">{tasksOverdue}</p>
                            <p className="text-[10px] text-red-700">Atrasados</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Responsables del área */}
                    {managersOnDuty.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-[#1D1D1F] mb-3 flex items-center gap-2">
                          <User className="w-4 h-4 text-corporate" />
                          Responsables en turno
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {managersOnDuty.map(({ user, shifts }) => (
                            <div key={user.id} className="flex items-center gap-2 bg-corporate/5 rounded-lg px-3 py-2">
                              <UserAvatar name={user.name} photoUrl={user.photoURL || user.avatar} size="xs" fallbackClassName="bg-corporate text-[10px]" />
                              <div>
                                <p className="text-xs font-medium text-[#1D1D1F]">{user.name}</p>
                                <p className="text-[10px] text-[#86868B]">{user.role.replace(/_/g, ' ')}</p>
                              </div>
                              {shifts.map((s, i) => (
                                <span 
                                  key={i}
                                  className="text-[10px] px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: `${s.color}30`, color: s.color }}
                                >
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Usuarios con diferentes turnos */}
                    {usersWithDifferentShifts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-[#1D1D1F] mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-purple-500" />
                          Múltiples turnos ({usersWithDifferentShifts.length})
                        </h4>
                        <div className="space-y-2">
                          {usersWithDifferentShifts.map(({ user, shifts }) => (
                            <div key={user.id} className="flex items-center justify-between bg-purple-50 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <UserAvatar name={user.name} photoUrl={user.photoURL || user.avatar} size="sm" fallbackClassName="bg-purple-500 text-xs" />
                                <div>
                                  <p className="text-sm font-medium text-[#1D1D1F]">{user.name}</p>
                                  <p className="text-xs text-[#86868B]">{user.position}</p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                {shifts.map((s, i) => (
                                  <span 
                                    key={i}
                                    className="text-xs px-2 py-1 rounded-lg font-medium"
                                    style={{ backgroundColor: `${s.color}20`, color: s.color }}
                                  >
                                    {s.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Usuarios por turno */}
                    {Object.entries(shiftGroups).map(([shiftName, groupUsers]) => (
                      <div key={shiftName}>
                        <h4 className="text-sm font-medium text-[#1D1D1F] mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-500" />
                          Turno {shiftName} ({groupUsers.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {groupUsers.map(({ user, shifts }) => (
                            <div key={user.id} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                              <UserAvatar name={user.name} photoUrl={user.photoURL || user.avatar} size="xs" fallbackClassName="bg-blue-500 text-[10px]" />
                              <span className="text-xs font-medium text-[#1D1D1F]">{user.name}</span>
                              {shifts[0]?.department !== user.department && (
                                <DeptIcon department={shifts[0]!.department} className="w-3 h-3 text-amber-500" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Usuarios libres */}
                    {freeUsers.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-[#1D1D1F] mb-3 flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-[#E5E5E7] flex items-center justify-center">
                            <span className="text-[10px]">-</span>
                          </span>
                          Usuarios libres ({freeUsers.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {freeUsers.map(({ user }) => (
                            <div key={user.id} className="flex items-center gap-2 bg-[#F5F5F7] rounded-lg px-3 py-2">
                              <UserAvatar name={user.name} photoUrl={user.photoURL || user.avatar} size="xs" fallbackClassName="bg-[#C7C7CC] text-[10px]" />
                              <span className="text-xs text-[#86868B]">{user.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Usuarios con incapacidad */}
                    {(() => {
                      // Contar usuarios con incapacidad según el departamento seleccionado
                      const usersWithIncapacity = relevantUsers.filter((u) => {
                        const incapacityInfo = getIncapacityForDate(dateStr, u.id);
                        return !!incapacityInfo;
                      });
                      
                      return usersWithIncapacity.length > 0 ? (
                        <div>
                          <h4 className="text-sm font-medium text-[#1D1D1F] mb-3 flex items-center gap-2">
                            <HeartPulse className="w-4 h-4 text-red-500" />
                            Incapacidades ({usersWithIncapacity.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {usersWithIncapacity.map((u) => {
                              const incapacityInfo = getIncapacityForDate(dateStr, u.id);
                              const incapacityConfig: Record<string, { color: string, bgColor: string, label: string }> = {
                                enfermedad: { color: 'text-red-600', bgColor: 'bg-red-50', label: 'Enfermedad' },
                                accidente: { color: 'text-orange-600', bgColor: 'bg-orange-50', label: 'Accidente' },
                                cita_medica: { color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Cita médica' },
                                inasistencia: { color: 'text-purple-600', bgColor: 'bg-purple-50', label: 'Inasistencia' },
                              };
                              const style = incapacityInfo ? incapacityConfig[incapacityInfo.type] : null;
                              
                              return (
                                <div key={u.id} className={cn("flex items-center gap-2 rounded-lg px-3 py-2", style?.bgColor)}>
                                  <UserAvatar name={u.name} photoUrl={u.photoURL || u.avatar} size="xs" fallbackClassName="bg-red-500 text-[10px]" />
                                  <div>
                                    <span className={cn("text-xs font-medium", style?.color)}>{u.name}</span>
                                    <span className={cn("text-[10px] ml-1", style?.color)}>({style?.label})</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ASIGNAR TAB (Drag & Drop)
// ═══════════════════════════════════════════════════════════════════

interface AsignarTabProps {
  incapacityDates: {date: string, type: string, userId: string}[];
  getIncapacityForDate: (date: string, userId: string) => {date: string, type: string, userId: string} | undefined;
  selectedDepartment: string | 'ALL';
  setSelectedDepartment: (v: string | 'ALL') => void;
}

function AsignarTab({ incapacityDates: _incapacityDates, getIncapacityForDate: _getIncapacityForDate, selectedDepartment, setSelectedDepartment }: AsignarTabProps) {
  const { user } = useAuth();
  const { effectiveUser, hasPermission } = useAppConfig();
  const { 
    assignments: allAssignments,
    getShiftsByDepartment, 
    getUsersByDepartment, 
    assignShift, 
    getWeekAssignments,
    publishAssignments,
    getBorradorCount,
    getPendingChangesCount,
    removeShift,
    restoreShift,
    cleanupSpecificTasksForRemovedAssignment,
    shifts,
  } = useShifts();
  const { departmentCodes, departmentOptions, departmentTreeOptions, defaultDepartment, getDeptName, getDeptShortName, getVisibleDepartmentCodes, operationalDepartmentCodes } = useDynamicDepartments();
  const { users: firestoreUsers2 } = useFirestoreUsers();
  const users = firestoreUsers2;
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Departamentos visibles en el selector de Asignar según jerarquía pura
  const visibleDepartmentOptions = useMemo(() => {
    if (!effectiveUser) return departmentOptions;
    const allowed = getVisibleDepartmentCodes(effectiveUser);
    return departmentOptions.filter(d => allowed.includes(d.code));
  }, [departmentOptions, effectiveUser, getVisibleDepartmentCodes]);

  const visibleDepartmentTreeOptions = useMemo(() => {
    if (!effectiveUser) return departmentTreeOptions;
    const allowed = getVisibleDepartmentCodes(effectiveUser);
    return departmentTreeOptions.filter(d => allowed.includes(d.code));
  }, [departmentTreeOptions, effectiveUser, getVisibleDepartmentCodes]);

  const visibleDeptNames = useMemo(() => visibleDepartmentOptions.map(d => d.name), [visibleDepartmentOptions]);

  const showAllDeptOption = useMemo(() => {
    if (!effectiveUser) return false;
    return visibleDepartmentOptions.length > 1;
  }, [effectiveUser, visibleDepartmentOptions]);

  // Solicitudes de tiempo libre aprobadas para bloquear asignaciones
  const [approvedTimeOff, setApprovedTimeOff] = useState<TimeOffRequest[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'timeOffRequests'), where('status', '==', 'aprobada'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reqs: TimeOffRequest[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userId: data.userId || '',
            userName: data.userName || '',
            department: data.department || '',
            type: data.type || 'otro',
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            reason: data.reason || '',
            status: data.status || 'pendiente',
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            reviewedBy: data.reviewedBy || null,
            reviewedAt: data.reviewedAt?.toDate?.()?.toISOString?.() || null,
            response: data.response || null,
          } as TimeOffRequest;
        });
        setApprovedTimeOff(reqs);
      },
      (error) => console.error('Error al cargar timeOff aprobadas en Asignar:', error)
    );
    return () => unsubscribe();
  }, []);

  const isDayBlockedForUser = (userId: string, date: Date): boolean => {
    const dateStr = toLocalISODate(date);
    return approvedTimeOff.some((r) => r.userId === userId && isDateInRange(dateStr, r.startDate, r.endDate));
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const weekStart = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);
    return start;
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Ordenar turnos cronológicamente (solo departamentos visibles en modo ALL)
  const availableShifts = useMemo(() => {
    if (selectedDepartment === 'ALL') {
      return sortShiftsByTime(
        shifts.filter(s => s.name !== 'Libre' && visibleDeptNames.includes(s.department))
      );
    }
    return sortShiftsByTime(getShiftsByDepartment(selectedDepartment));
  }, [getShiftsByDepartment, selectedDepartment, shifts, visibleDeptNames]);

  // Obtener usuarios del departamento seleccionado (o departamentos visibles si es 'ALL')
  const deptUsers = useMemo(() => {
    if (selectedDepartment === 'ALL') {
      return Array.from(
        new Map(
          visibleDeptNames
            .flatMap(name => getUsersByDepartment(name))
            .map(u => [u.id, u])
        ).values()
      );
    }
    return getUsersByDepartment(selectedDepartment);
  }, [users, getUsersByDepartment, selectedDepartment, visibleDeptNames]);

  // Verificar si el usuario tiene permisos para ver usuarios de otros departamentos
  const allowedForCrossDept = effectiveUser ? getVisibleDepartmentCodes(effectiveUser) : [];
  const canViewCrossDepartment = showAllDeptOption || allowedForCrossDept.length > 1;
  
  // Obtener usuarios de otros departamentos que tienen turnos asignados aquí
  const crossDeptUsers = useMemo(() => {
    if (selectedDepartment === 'ALL') return []; // En modo ALL, todos ya están incluidos
    if (!canViewCrossDepartment) return [];
    
    const allAssignments = getWeekAssignments(selectedDepartment, weekStart);
    const crossDeptUserIds = new Set<string>();
    
    allAssignments.forEach(a => {
      const assignedUser = users.find(u => u.id === a.userId);
      if (assignedUser && assignedUser.department !== selectedDepartment) {
        crossDeptUserIds.add(a.userId);
      }
    });
    
    return users.filter(u => crossDeptUserIds.has(u.id));
  }, [canViewCrossDepartment, getWeekAssignments, selectedDepartment, weekStart]);
  
  // Combinar usuarios del departamento + usuarios de otros departamentos con turnos
  const allVisibleUsers = useMemo(() => {
    if (selectedDepartment === 'ALL') return deptUsers; // En modo ALL, ya tenemos todos
    const combined = [...deptUsers];
    crossDeptUsers.forEach(crossUser => {
      if (!combined.find(u => u.id === crossUser.id)) {
        combined.push(crossUser);
      }
    });
    return combined;
  }, [deptUsers, crossDeptUsers, selectedDepartment]);
  
  // Obtener asignaciones (solo departamentos visibles si es 'ALL')
  const assignments = useMemo(() => {
    if (selectedDepartment === 'ALL') {
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDaysToDate(weekStart, i);
        weekDates.push(format(date, 'yyyy-MM-dd'));
      }
      const visibleDeptCodes = visibleDepartmentOptions.map(d => d.code);
      return weekDates.flatMap(date =>
        visibleDeptCodes.flatMap(dept =>
          getWeekAssignments(dept, weekStart).filter(a => a.date === date)
        )
      );
    }
    return getWeekAssignments(selectedDepartment, weekStart);
  }, [getWeekAssignments, selectedDepartment, weekStart, visibleDepartmentOptions]);

  const getUserAssignmentsForDay = (userId: string, date: Date): ShiftAssignment[] => {
    const dateStr = toLocalISODate(date);
    const userEmail = users.find(u => u.id === userId)?.email;
    // Incluir ELIMINADO para mostrarlo como borrador de eliminación
    const userAssignments = assignments.filter(a => (a.userId === userId || a.userId === userEmail) && a.date === dateStr);
    // Ordenar: primero activos (BORRADOR/PUBLICADO) y luego ELIMINADO; dentro de cada grupo cronológicamente
    return userAssignments.sort((a, b) => {
      const isDeletedA = a.status === AssignmentStatus.ELIMINADO ? 1 : 0;
      const isDeletedB = b.status === AssignmentStatus.ELIMINADO ? 1 : 0;
      if (isDeletedA !== isDeletedB) return isDeletedA - isDeletedB;
      const shiftA = shifts.find(s => s.id === a.shiftId);
      const shiftB = shifts.find(s => s.id === b.shiftId);
      if (!shiftA || !shiftB) return 0;
      return shiftA.startTime.localeCompare(shiftB.startTime);
    });
  };
  

  
  // Contar cambios pendientes (borradores + eliminaciones)
  const pendingChanges = getPendingChangesCount(selectedDepartment, weekStart);
  const pendingBorradores = getBorradorCount(selectedDepartment, weekStart);
  const pendingDeletions = pendingChanges - pendingBorradores;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const shiftId = active.id as string;
    const dropData = over.id as string;
    const [userId, dateStr] = dropData.split('|');

    if (userId && dateStr && user) {
      const date = new Date(dateStr + 'T00:00:00');
      if (isDayBlockedForUser(userId, date)) {
        toast.error('No se puede asignar un turno en un día con tiempo libre aprobado');
        return;
      }
      assignShift(userId, shiftId, dateStr, user.id);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => setActiveDragId(active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Turnos disponibles - Sidebar sticky siempre */}
        <div className="sticky top-0 lg:top-4 z-20 w-full lg:w-72 flex-shrink-0 bg-white rounded-2xl p-4 lg:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h3 className="font-medium text-[#1D1D1F] text-sm">Turnos disponibles</h3>
          </div>
          
          {/* Desktop: filtro de departamento en sidebar */}
          <div className="mb-3 lg:mb-4 hidden lg:block">
            <Select value={selectedDepartment} onValueChange={(v) => setSelectedDepartment(v as string | 'ALL')}>
              <SelectTrigger className="w-full h-10 px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B]">
                <SelectValue>
                  {selectedDepartment === 'ALL' ? (
                    <div className="flex items-center gap-2 text-[#86868B]">
                      <LayoutGrid className="w-4 h-4" />
                      <span className="truncate">Todos los departamentos</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[#86868B]">
                      <DeptIcon department={selectedDepartment} className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{selectedDepartment.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {/* Opción Todos los departamentos - solo para usuarios con permiso */}
                {showAllDeptOption && (
                  <SelectItem value="ALL">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" />
                      <span>{visibleDepartmentTreeOptions.every(d => operationalDepartmentCodes.includes(d.code)) ? 'Todos (operacionales)' : 'Todos los departamentos'}</span>
                    </div>
                  </SelectItem>
                )}
                {visibleDepartmentTreeOptions.map(dept => (
                  <SelectItem key={dept.code} value={dept.code}>
                    <div className="flex items-center gap-2">
                      <DeptIcon department={dept.code} className="w-4 h-4" />
                      <span style={{ paddingLeft: `${dept.level * 12}px` }}>{dept.level > 0 ? '└─ ' : ''}{dept.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* En móvil: scroll horizontal de turnos. En desktop: columna */}
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {availableShifts.map((shift) => (
              <DraggableShift key={shift.id} shift={shift} />
            ))}
          </div>
        </div>

        {/* Asignación de turnos - Contenedor scrollable */}
        <div className="flex-1 w-full min-w-0 max-w-full bg-white rounded-2xl p-4 lg:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {/* Header: siempre horizontal */}
          <div className="flex flex-row flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-medium text-[#1D1D1F] text-sm">Asignación de turnos</h3>
              <p className="text-xs text-[#86868B]">{formatWeekRange(weekStart, addDays(weekStart, 6))}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-[#86868B] mr-1">
                <Users className="w-3.5 h-3.5" />
                <span>{allVisibleUsers.length}</span>
                {crossDeptUsers.length > 0 && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded">
                    +{crossDeptUsers.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWeekOffset(prev => prev - 1)}
                  className="w-8 h-8 rounded-lg hover:bg-[#F5F5F7] flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-3 py-1.5 text-sm font-medium text-corporate hover:bg-corporate/5 rounded-lg"
                >
                  Hoy
                </button>
                <button
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  className="w-8 h-8 rounded-lg hover:bg-[#F5F5F7] flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 pointer-events-auto">
                {pendingChanges > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {pendingBorradores > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                        {pendingBorradores} borrador{pendingBorradores > 1 ? 'es' : ''}
                      </span>
                    )}
                    {pendingDeletions > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                        {pendingDeletions} eliminaci{pendingDeletions > 1 ? 'ones' : 'ón'}
                      </span>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  disabled={pendingChanges === 0}
                  className="px-3 py-1.5 text-sm bg-corporate text-white rounded-lg hover:bg-corporate/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => {
                    if (user) {
                      try {
                        await publishAssignments(selectedDepartment, weekStart, user.id);
                        toast.success("Turnos publicados exitosamente");
                      } catch (err) {
                        console.error("Error publicando:", err);
                        toast.error("Error al publicar");
                      }
                    }
                  }}
                >
                  <Send className="w-4 h-4" />
                  Publicar
                </button>
              </div>
            </div>
          </div>

          {/* Calendario */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] w-full max-w-full min-w-0">
            <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[12rem_1fr]">
              {/* Columna fija de colaboradores */}
              <div className="bg-white z-10 border-r border-[#E5E5E7]">
                <div className="h-14 sm:h-16 flex items-center p-1 sm:p-4 text-xs sm:text-sm font-medium text-[#86868B] border-b border-[#E5E5E7]">
                  Colaborador
                </div>
                {allVisibleUsers.map((u, rowIdx) => {
                  const isCrossDept = selectedDepartment !== 'ALL' && u.department !== selectedDepartment;
                  const isLastRow = rowIdx === allVisibleUsers.length - 1;
                  const rowBg = isCrossDept ? 'bg-amber-50/50' : '';
                  return (
                    <div key={u.id} className={cn("min-h-[72px] sm:min-h-[88px] flex items-center p-1 sm:p-4 border-b border-[#E5E5E7]", isLastRow && "border-b-0", rowBg)}>
                      <div className="flex flex-col items-center gap-1 w-full sm:flex-row sm:items-center sm:gap-3">
                        <UserAvatar
                          name={u.name}
                          photoUrl={u.photoURL || u.avatar}
                          size="sm"
                          className={cn(isCrossDept && "ring-2 ring-amber-400")}
                          fallbackClassName={cn("text-xs", isCrossDept ? "bg-amber-500" : "bg-corporate")}
                        />
                        <div className="text-center sm:text-left min-w-0">
                          <div className="flex items-center justify-center sm:justify-start gap-1.5">
                            <p className="text-[10px] sm:text-sm font-medium text-[#1D1D1F] leading-tight truncate">{u.name.split(' ')[0]}</p>
                            {isCrossDept && (
                              <div 
                                className="p-0.5 rounded bg-amber-100" 
                                title={u.department.replace(/_/g, ' ')}
                              >
                                <DeptIcon department={u.department} className="w-3.5 h-3.5 text-amber-600" />
                              </div>
                            )}
                          </div>
                          <p className="hidden sm:block text-xs text-[#86868B] truncate">{u.position}</p>
                          {isCrossDept && (
                            <p className="text-[10px] text-amber-600 font-medium">
                              {getDeptShortName(u.department)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Área scrollable de días */}
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Header de días */}
                  <div className="h-14 sm:h-16 grid grid-cols-7 border-b border-[#E5E5E7]">
                    {weekDays.map((day, i) => (
                      <div key={i} className="text-center p-1 sm:p-4 text-xs sm:text-sm font-medium text-[#86868B] flex items-center justify-center">
                        <div>
                          <div className="hidden sm:block">{['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'][i]}</div>
                          <div className="sm:hidden">{['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'][i]}</div>
                          <div className="text-[10px] sm:text-xs text-[#C7C7CC]">{day.getDate()}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Filas de días */}
                  {allVisibleUsers.map((u, rowIdx) => {
                    const isCrossDept = selectedDepartment !== 'ALL' && u.department !== selectedDepartment;
                    const isLastRow = rowIdx === allVisibleUsers.length - 1;
                    const rowBg = isCrossDept ? 'bg-amber-50/50' : '';
                    return (
                      <div key={u.id} className={cn("min-h-[72px] sm:min-h-[88px] grid grid-cols-7 border-b border-[#E5E5E7]", isLastRow && "border-b-0", rowBg)}>
                        {weekDays.map((day, i) => {
                          const dayAssignments = getUserAssignmentsForDay(u.id, day);
                          const dropId = `${u.id}|${toLocalISODate(day)}`;
                          const dateStr = toLocalISODate(day);
                          const incapacityInfo = _getIncapacityForDate(dateStr, u.id);
                          const hasIncapacity = !!incapacityInfo;
                          const timeOffInfo = approvedTimeOff.find(
                            (r) => r.userId === u.id && isDateInRange(dateStr, r.startDate, r.endDate)
                          );
                          const hasTimeOff = !!timeOffInfo;
                          const isBlocked = hasTimeOff;

                          const incapacityConfig: Record<string, { color: string, bgColor: string, borderColor: string, label: string }> = {
                            enfermedad: { color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200', label: 'Enfermedad' },
                            accidente: { color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', label: 'Accidente' },
                            cita_medica: { color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', label: 'Cita méd.' },
                            inasistencia: { color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', label: 'Inasist.' },
                          };
                          const incapacityStyle = incapacityInfo ? incapacityConfig[incapacityInfo.type] : null;
                          const timeOffStyle = timeOffInfo ? TIME_OFF_VISUAL[timeOffInfo.type] : null;

                          return (
                            <div key={i} className={cn("h-full p-1 sm:p-2 text-center align-middle min-w-0", isLastRow ? "" : "border-b border-[#E5E5E7]")}>
                              <DroppableCell id={dropId} disabled={isBlocked} className="h-full flex flex-col justify-center">
                                <div className="space-y-1 w-full min-w-0">
                                  {hasTimeOff && timeOffStyle && (
                                    <div className={cn(
                                      'px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium border text-center min-w-0 break-words',
                                      timeOffStyle.bgColor,
                                      timeOffStyle.color,
                                      timeOffStyle.borderColor
                                    )}>
                                      {TIME_OFF_LABELS[timeOffInfo.type]}
                                    </div>
                                  )}
                                  {hasIncapacity && incapacityStyle && (
                                    <div className={cn(
                                      'px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium border text-center min-w-0 break-words',
                                      incapacityStyle.bgColor,
                                      incapacityStyle.color,
                                      incapacityStyle.borderColor
                                    )}>
                                      {incapacityStyle.label}
                                    </div>
                                  )}
                                  {dayAssignments.map((assignment, idx) => {
                                    const shift = shifts.find(s => s.id === assignment.shiftId);
                                    const isCrossDepartment = shift && shift.department !== selectedDepartment && selectedDepartment !== 'ALL';

                                    return shift ? (
                                      <div
                                        key={idx}
                                        onDoubleClick={() => {
                                          if (assignment.status === AssignmentStatus.ELIMINADO) {
                                            restoreShift(assignment.id);
                                          } else {
                                            if (assignment.status === AssignmentStatus.PUBLICADO) {
                                              cleanupSpecificTasksForRemovedAssignment({
                                                id: assignment.id,
                                                shiftId: assignment.shiftId,
                                                date: assignment.date,
                                                userId: assignment.userId,
                                              });
                                            }
                                            removeShift(assignment.id);
                                          }
                                        }}
                                        className={cn(
                                          'px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium text-center relative cursor-pointer select-none transition-all hover:scale-105 min-w-0 break-words',
                                          assignment.status === AssignmentStatus.ELIMINADO && 'line-through'
                                        )}
                                        style={{
                                          backgroundColor: assignment.status === AssignmentStatus.ELIMINADO
                                            ? '#F5F5F7'
                                            : assignment.status === AssignmentStatus.BORRADOR
                                              ? `${shift.color}20`
                                              : `${shift.color}30`,
                                          color: assignment.status === AssignmentStatus.ELIMINADO ? '#86868B' : shift.color,
                                          border: assignment.status === AssignmentStatus.BORRADOR
                                            ? `2px dashed ${shift.color}`
                                            : assignment.status === AssignmentStatus.ELIMINADO
                                              ? '2px dashed #C7C7CC'
                                              : 'none',
                                          opacity: assignment.status === AssignmentStatus.ELIMINADO || assignment.status === AssignmentStatus.BORRADOR ? 0.7 : 1,
                                        }}
                                        title={assignment.status === AssignmentStatus.ELIMINADO
                                          ? `${shift.name} (${shift.startTime}-${shift.endTime}) - ELIMINADO - Doble click para restaurar`
                                          : `${shift.name} (${shift.startTime}-${shift.endTime}) - ${shift.department.replace(/_/g, ' ')} - ${assignment.status === AssignmentStatus.BORRADOR ? 'BORRADOR' : 'PUBLICADO'} - Doble click para eliminar`}
                                      >
                                        <div className="flex flex-wrap items-center justify-center gap-1">
                                          {assignment.status === AssignmentStatus.ELIMINADO && (
                                            <Trash2 className="w-3 h-3 mr-0.5 flex-shrink-0" />
                                          )}
                                          {assignment.swapRequestId && (
                                            <span title="Turno cambiado"><RefreshCw className="w-3 h-3 mr-0.5 flex-shrink-0 text-amber-600" /></span>
                                          )}
                                          <span className="break-words leading-tight">{shift.name}</span>
                                          {(isCrossDepartment || selectedDepartment === 'ALL') && assignment.status !== AssignmentStatus.ELIMINADO && (
                                            <div 
                                              className="p-0.5 rounded bg-white/70 flex-shrink-0"
                                              title={shift.department.replace(/_/g, ' ')}
                                            >
                                              <DeptIcon department={shift.department} className="w-3 h-3" />
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-[9px] opacity-70">{shift.startTime}-{shift.endTime}</div>
                                        {assignment.status === AssignmentStatus.BORRADOR && (
                                          <span className="absolute -top-2 -right-2 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                                            <span className="text-[7px] text-white font-bold">B</span>
                                          </span>
                                        )}
                                        {assignment.status === AssignmentStatus.ELIMINADO && (
                                          <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                                            <span className="text-[7px] text-white font-bold">-</span>
                                          </span>
                                        )}
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              </DroppableCell>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragId ? (
          <div className="px-3 py-2 bg-white rounded-lg shadow-lg border border-corporate text-sm font-medium text-corporate">
            {shifts.find(s => s.id === activeDragId)?.name}
          </div>
        ) : null}
      </DragOverlay>



    </DndContext>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE DE ICONO DE DEPARTAMENTO
// ═══════════════════════════════════════════════════════════════════

function DeptIcon({ department, className = 'w-4 h-4' }: { department: string; className?: string }) {
  const { getDeptIcon } = useDynamicDepartments();
  const iconProps = { className };
  const icon = getDeptIcon(department);

  switch (icon) {
    case 'Building2': return <Building2 {...iconProps} />;
    case 'DollarSign': return <DollarSign {...iconProps} />;
    case 'ShoppingCart': return <ShoppingCart {...iconProps} />;
    case 'Megaphone': return <Megaphone {...iconProps} />;
    case 'Waves': return <Waves {...iconProps} />;
    case 'Compass': return <Compass {...iconProps} />;
    case 'Car': return <Car {...iconProps} />;
    case 'Ship': return <Ship {...iconProps} />;
    case 'Package': return <Package {...iconProps} />;
    case 'ChefHat': return <ChefHat {...iconProps} />;
    default: return <Building2 {...iconProps} />;
  }
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTES DND
// ═══════════════════════════════════════════════════════════════════

function DraggableShift({ shift }: { shift: Shift }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: shift.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all border',
        isDragging && 'opacity-50'
      )}
      style={{
        backgroundColor: `${shift.color}20`, // 20 = 12% opacidad
        color: shift.color,
        borderColor: `${shift.color}40`, // 40 = 25% opacidad
      }}
    >
      <GripVertical className="w-3 h-3 opacity-50 flex-shrink-0" />
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{shift.name}</span>
          {/* Icono del departamento */}
          <div 
            className="flex-shrink-0 p-0.5 rounded bg-white/50"
            title={shift.department.replace(/_/g, ' ')}
          >
            <DeptIcon department={shift.department} className="w-3.5 h-3.5" />
          </div>
        </div>
        <span className="text-xs opacity-70">{shift.startTime}-{shift.endTime}</span>
      </div>
    </div>
  );
}

function DroppableCell({ id, children, disabled, className }: { id: string; children: React.ReactNode; disabled?: boolean; className?: string }) {
  const { isOver, setNodeRef } = useDroppable({ id, disabled });

  if (disabled) {
    return (
      <div className={cn("min-h-[40px] rounded-lg bg-[#F5F5F7] border border-[#E5E5E7] p-1", className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[40px] rounded-lg transition-all',
        isOver && 'bg-corporate/10 ring-2 ring-corporate/30',
        className
      )}
    >
      {children}
    </div>
  );
}
function IncapacidadesTab({ 
  incapacityDates: _incapacityDates, 
  setIncapacityDates: _setIncapacityDates, 
  getUsersByDepartment, 
  activeSubTab, 
  myFilter, 
  setMyFilter,
  firestoreIncapacidades,
  verifyIncapacidad,
  rejectIncapacidad,
  registerIncapacidad,
  undoIncapacidad: _undoIncapacidad,
  addNoteToIncapacidad,
  addDocumentToIncapacidad,
  selectedDepartment,
  onSelectedDepartmentChange,
  statusFilter,
  onStatusFilterChange,
}: IncapacidadesTabProps) {
  const { user } = useAuth();
  const { departmentCodes, departmentOptions, defaultDepartment, getDeptName, getVisibleDepartmentCodes } = useDynamicDepartments();
  const { users: firestoreUsers2 } = useFirestoreUsers();
  const { effectiveUser, hasPermission } = useAppConfig();
  const users = firestoreUsers2;

  // Códigos de departamentos visibles según jerarquía y permisos del usuario
  const visibleDeptCodes = useMemo(() => {
    if (!effectiveUser) return [];
    return getVisibleDepartmentCodes(effectiveUser);
  }, [effectiveUser, getVisibleDepartmentCodes]);

  // Permisos de incapacidades (fallback a roles para compatibilidad con datos existentes)
  const canVerifyIncapacidad = hasPermission('canVerifyIncapacidad') ||
    user?.role === Role.SUPERVISOR || user?.role === Role.GERENTE_DEPARTAMENTO ||
    user?.role === Role.GERENTE_OPERACIONES || user?.role === Role.DIRECTOR ||
    user?.role === Role.DIRECTOR_GENERAL;
  const canRegisterIncapacidad = hasPermission('canRegisterIncapacidad') || canVerifyIncapacidad;
  const canRejectIncapacidad = hasPermission('canRejectIncapacidad') || canVerifyIncapacidad;
  const canRequestIncapacidadDocs = hasPermission('canRequestIncapacidadDocs') || canVerifyIncapacidad;

  // Hook de Storage para subir imágenes
  const { uploadMultipleImages, uploading: uploadingImages } = useStorageUpload();
  
  // Filtros controlados desde el header de HorariosModule
  
  const [expandedIncapacityId, setExpandedIncapacityId] = useState<string | null>(null);
  const [selectedIncapacity, setSelectedIncapacity] = useState<Incapacidad | null>(null);
  
  // Modales
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showChangeReplaceModal, setShowChangeReplaceModal] = useState(false);
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [selectedDocForUpload, setSelectedDocForUpload] = useState<string | null>(null);
  
  // Estados de formularios
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedReplacement, setSelectedReplacement] = useState<string>('');
  const [isExternalSupport, setIsExternalSupport] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newDocName, setNewDocName] = useState('');
  
  // Ref para input file
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para archivos seleccionados (reales) y sus previews
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFilePreviews, setSelectedFilePreviews] = useState<string[]>([]);
  
  // Estado para imagen expandida
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  
  // Usar incapacidades directamente desde Firestore
  const [incapacidades, setIncapacidades] = useState<Incapacidad[]>([]);
  
  useEffect(() => {
    setIncapacidades(firestoreIncapacidades);
  }, [firestoreIncapacidades]);
  
  // Configuración de tipos de incapacidad
  const incapacityTypeConfig: Record<string, { icon: React.ElementType, color: string, bgColor: string, borderColor: string, label: string }> = {
    enfermedad: { icon: Activity, color: 'text-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-200', label: 'Enfermedad' },
    accidente: { icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', label: 'Accidente' },
    cita_medica: { icon: Stethoscope, color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', label: 'Cita médica' },
    inasistencia: { icon: UserX, color: 'text-purple-500', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', label: 'Inasistencia' },
  };

  // Configuración de estados - MÁS VISIBLES
  const statusConfig: Record<string, { color: string, bgColor: string, borderColor: string, label: string, icon: React.ElementType }> = {
    pendiente: { color: 'text-amber-700', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', label: 'Pendiente', icon: Clock },
    verificada: { color: 'text-blue-700', bgColor: 'bg-blue-100', borderColor: 'border-blue-300', label: 'Verificada', icon: Check },
    registrada: { color: 'text-green-700', bgColor: 'bg-green-100', borderColor: 'border-green-300', label: 'Registrada', icon: CheckCircle2 },
    rechazada: { color: 'text-red-700', bgColor: 'bg-red-100', borderColor: 'border-red-300', label: 'Rechazada', icon: XCircle },
  };

  // Filtrar incapacidades
  const filteredIncapacidades = useMemo(() => {
    return incapacidades.filter(inc => {
      if (selectedDepartment !== 'ALL' && inc.userDepartment !== selectedDepartment) return false;
      if (selectedDepartment === 'ALL' && visibleDeptCodes.length > 0 && !visibleDeptCodes.includes(inc.userDepartment || '')) return false;
      if (statusFilter !== 'todas' && inc.status !== statusFilter) return false;
      return true;
    });
  }, [incapacidades, selectedDepartment, statusFilter, visibleDeptCodes]);

  // Contadores por estado - filtrados por departamento seleccionado
  const counts = useMemo(() => {
    // Filtrar incapacidades por departamento seleccionado (o visibles si es ALL)
    const filteredByDept = incapacidades.filter(i => {
      if (selectedDepartment !== 'ALL') return i.userDepartment === selectedDepartment;
      return visibleDeptCodes.length === 0 || visibleDeptCodes.includes(i.userDepartment || '');
    });
    
    return {
      todas: filteredByDept.length,
      pendiente: filteredByDept.filter(i => i.status === 'pendiente').length,
      verificada: filteredByDept.filter(i => i.status === 'verificada').length,
      registrada: filteredByDept.filter(i => i.status === 'registrada').length,
      rechazada: filteredByDept.filter(i => i.status === 'rechazada').length,
    };
  }, [incapacidades, selectedDepartment, visibleDeptCodes]);

  // Obtener usuarios disponibles para reemplazo (mismo departamento u otros)
  const getReplacementUsers = (incapacity: Incapacidad, external: boolean = false) => {
    if (external) {
      // Obtener usuarios de OTROS departamentos
      return departmentCodes
        .flatMap(dept => dept !== incapacity.userDepartment ? getUsersByDepartment(dept) : [])
        .filter(u => u.id !== incapacity.userId && u.isActive);
    }
    // Usuarios del mismo departamento
    const deptUsers = selectedDepartment === 'ALL' 
      ? getUsersByDepartment(incapacity.userDepartment)
      : getUsersByDepartment(selectedDepartment);
    return deptUsers.filter(u => u.id !== incapacity.userId && u.isActive);
  };

  // Toggle expansión de tarjeta
  const toggleExpand = (id: string) => {
    setExpandedIncapacityId(prev => prev === id ? null : id);
  };

  // Abrir modal de registro con selección de reemplazo
  const handleRegister = (incapacity: Incapacidad) => {
    setSelectedIncapacity(incapacity);
    setSelectedReplacement('');
    setIsExternalSupport(false);
    setShowRegisterModal(true);
  };

  // Abrir modal de rechazo
  const handleReject = (incapacity: Incapacidad) => {
    setSelectedIncapacity(incapacity);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  // Verificar incapacidad (Supervisor o Gerente) - usando Firestore
  const handleVerify = async (incapacity: Incapacidad) => {
    try {
      if (!user || !user.id) {
        console.error('Usuario no disponible para verificar');
        return;
      }
      
      await verifyIncapacidad(incapacity.id!, user.id, user.name || 'Supervisor');
      
      // Cambiar filtro a 'todas' para que la incapacidad siga visible
      onStatusFilterChange('todas');
    } catch (error) {
      console.error('Error al verificar incapacidad:', error);
      alert('Error al verificar la incapacidad');
    }
  };

  // Confirmar registro con reemplazo - usando Firestore
  const confirmRegister = async () => {
    if (!selectedIncapacity) return;
    
    try {
      let replacementData = undefined;
      
      if (selectedReplacement) {
        const replacementUser = getReplacementUsers(selectedIncapacity, isExternalSupport).find(u => u.id === selectedReplacement);
        if (replacementUser) {
          replacementData = {
            replacementUserId: selectedReplacement,
            replacementUserName: replacementUser.name,
            replacementUserDept: replacementUser.department,
            isExternalSupport: isExternalSupport
          };
        }
      }
      
      await registerIncapacidad(selectedIncapacity.id!, user?.name || 'Supervisor', replacementData);
      
      setShowRegisterModal(false);
      setSelectedIncapacity(null);
      setSelectedReplacement('');
      setIsExternalSupport(false);
      
      // Cambiar filtro a 'todas' para que la incapacidad siga visible
      onStatusFilterChange('todas');
    } catch (error) {
      console.error('Error al registrar incapacidad:', error);
      alert('Error al registrar la incapacidad');
    }
  };

  // Confirmar rechazo - usando Firestore
  const confirmReject = async () => {
    if (!selectedIncapacity || !rejectionReason.trim()) return;
    
    try {
      await rejectIncapacidad(selectedIncapacity.id!, user?.name || 'Supervisor', rejectionReason);
      
      setShowRejectModal(false);
      setSelectedIncapacity(null);
      setRejectionReason('');
      
      // Cambiar filtro a 'todas' para que la incapacidad siga visible
      onStatusFilterChange('todas');
    } catch (error) {
      console.error('Error al rechazar incapacidad:', error);
      alert('Error al rechazar la incapacidad');
    }
  };

  // Cambiar reemplazo
  const handleChangeReplacement = (incapacity: Incapacidad) => {
    setSelectedIncapacity(incapacity);
    setSelectedReplacement(incapacity.replacementUserId || '');
    setIsExternalSupport(incapacity.isExternalSupport || false);
    setShowChangeReplaceModal(true);
  };

  // Confirmar cambio de reemplazo
  const confirmChangeReplacement = () => {
    if (!selectedIncapacity) return;
    
    let replacementName = '';
    let replacementDept = undefined;
    
    if (selectedReplacement) {
      const replacementUser = getReplacementUsers(selectedIncapacity, isExternalSupport).find(u => u.id === selectedReplacement);
      if (replacementUser) {
        replacementName = replacementUser.name;
        replacementDept = replacementUser.department;
      }
    }
    
    setIncapacidades(prev => prev.map(inc => {
      if (inc.id === selectedIncapacity.id) {
        return {
          ...inc,
          replacementUserId: selectedReplacement || undefined,
          replacementUserName: replacementName || undefined,
          replacementUserDept: replacementDept,
          isExternalSupport: isExternalSupport || undefined,
          history: [
            ...inc.history,
            { date: new Date().toISOString(), action: `Reemplazo cambiado a: ${replacementName}${isExternalSupport ? ' (apoyo externo)' : ''}`, user: user?.name || 'Supervisor' }
          ]
        };
      }
      return inc;
    }));
    setShowChangeReplaceModal(false);
    setSelectedIncapacity(null);
    setSelectedReplacement('');
    setIsExternalSupport(false);
  };

  // Agregar nota - usando Firestore
  const addNoteLocal = async (incapacityId: string) => {
    if (!newNote.trim()) return;
    
    try {
      await addNoteToIncapacidad(incapacityId, newNote.trim(), user?.name || 'Supervisor');
      setNewNote('');
    } catch (error) {
      console.error('Error al agregar nota:', error);
      alert('Error al agregar la nota');
    }
  };

  // Solicitar nuevo documento - usando Firestore
  const requestDocument = async (incapacityId: string) => {
    if (!newDocName.trim()) return;
    
    try {
      await addDocumentToIncapacidad(incapacityId, newDocName.trim());
      setNewDocName('');
    } catch (error) {
      console.error('Error al solicitar documento:', error);
      alert('Error al solicitar el documento');
    }
  };

  // Subir fotos de documento a Firebase Storage
  const uploadDocumentPhotoWithFile = async (incapacityId: string, docId: string, files: File[]) => {
    if (!files || files.length === 0) {
      alert('No hay archivos seleccionados');
      return;
    }
    
    console.log('uploadDocumentPhotoWithFile called', { incapacityId, docId, filesCount: files.length });
    
    try {
      console.log('=== INICIANDO SUBIDA ===');
      console.log('Archivos a subir:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
      
      // Subir archivos a Storage
      const downloadUrls = await uploadMultipleImages(
        files, 
        `incapacidades/${incapacityId}/documentos`
      );
      
      console.log('=== URLs OBTENIDAS ===', downloadUrls);
      
      if (downloadUrls.length === 0) {
        throw new Error('No se obtuvieron URLs de descarga');
      }
      
      // Usar firestore importado estáticamente
      
      // Leer el documento actual
      const docRef = doc(db, 'incapacidades', incapacityId);
      const snap = await getDoc(docRef);
      
      if (!snap.exists()) {
        throw new Error('Incapacidad no encontrada');
      }
      
      const data = snap.data();
      const currentDocs = data.documents || [];
      
      // Actualizar el documento específico con las URLs reales
      const updatedDocs = currentDocs.map((d: any) => 
        d.id === docId 
          ? { ...d, uploaded: true, fileUrls: downloadUrls }
          : d
      );
      
      // Guardar el array completo actualizado
      await updateDoc(docRef, {
        documents: updatedDocs,
        history: [...(data.history || []), {
          date: new Date().toISOString(),
          action: `Documento subido: ${downloadUrls.length} archivo(s)`,
          user: user?.name || 'Usuario'
        }]
      });
      
      console.log('=== GUARDADO EXITOSO ===');
      
      // Limpiar estados
      setShowUploadDocModal(false);
      setSelectedDocForUpload(null);
      setSelectedFiles([]);
      setSelectedFilePreviews([]);
      alert('Documento subido correctamente a Firebase Storage.');
    } catch (error) {
      console.error('=== ERROR ===', error);
      alert('Error al subir el documento: ' + (error as Error).message);
    }
  };

  // Filtrar incapacidades del usuario actual para pestaña "Mías"
  const myIncapacidades = useMemo(() => {
    return incapacidades.filter(inc => inc.userId === user?.id);
  }, [incapacidades, user?.id]);

  // Filtrar incapacidades para "Mías" según el filtro seleccionado
  const filteredMyIncapacidades = useMemo(() => {
    if (myFilter === 'enviadas') return myIncapacidades.filter(i => i.status === 'pendiente');
    if (myFilter === 'registradas') return myIncapacidades.filter(i => i.status === 'registrada');
    if (myFilter === 'rechazadas') return myIncapacidades.filter(i => i.status === 'rechazada');
    return myIncapacidades; // historial - todas
  }, [myIncapacidades, myFilter]);

  // Estadísticas mensual y anual para "Mías" (todas las incapacidades, no solo registradas)
  const myStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevYear = currentYear - 1;

    const daysFor = (items: typeof myIncapacidades) => items.reduce((total, inc) => {
      const [startYear, startMonth, startDay] = inc.startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = inc.endDate.split('-').map(Number);
      const start = new Date(startYear, startMonth - 1, startDay);
      const end = new Date(endYear, endMonth - 1, endDay);
      return total + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }, 0);

    const incapacidadesMes = myIncapacidades.filter(inc => {
      const [year, month] = inc.startDate.split('-').map(Number);
      return month - 1 === currentMonth && year === currentYear;
    });
    const incapacidadesMesAnterior = myIncapacidades.filter(inc => {
      const [year, month] = inc.startDate.split('-').map(Number);
      return month - 1 === prevMonth && year === prevMonthYear;
    });
    const incapacidadesAnio = myIncapacidades.filter(inc => {
      const year = parseInt(inc.startDate.split('-')[0]);
      return year === currentYear;
    });
    const incapacidadesAnioAnterior = myIncapacidades.filter(inc => {
      const year = parseInt(inc.startDate.split('-')[0]);
      return year === prevYear;
    });

    return {
      diasMes: daysFor(incapacidadesMes),
      diasMesAnterior: daysFor(incapacidadesMesAnterior),
      diasAnio: daysFor(incapacidadesAnio),
      diasAnioAnterior: daysFor(incapacidadesAnioAnterior),
    };
  }, [myIncapacidades]);

  // Estadísticas del departamento para "Equipo" (todas las incapacidades)
  const deptStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevYear = currentYear - 1;

    const daysFor = (items: typeof deptIncapacidades) => items.reduce((total, inc) => {
      const [startYear, startMonth, startDay] = inc.startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = inc.endDate.split('-').map(Number);
      const start = new Date(startYear, startMonth - 1, startDay);
      const end = new Date(endYear, endMonth - 1, endDay);
      return total + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }, 0);

    const deptIncapacidades = incapacidades.filter(inc => {
      if (selectedDepartment !== 'ALL' && inc.userDepartment !== selectedDepartment) return false;
      return true; // Todas las incapacidades, no solo registradas
    });

    const inMonth = (inc: typeof deptIncapacidades[0]) => {
      const [year, month] = inc.startDate.split('-').map(Number);
      return month - 1 === currentMonth && year === currentYear;
    };
    const inPrevMonth = (inc: typeof deptIncapacidades[0]) => {
      const [year, month] = inc.startDate.split('-').map(Number);
      return month - 1 === prevMonth && year === prevMonthYear;
    };
    const inYear = (inc: typeof deptIncapacidades[0]) => parseInt(inc.startDate.split('-')[0]) === currentYear;
    const inPrevYear = (inc: typeof deptIncapacidades[0]) => parseInt(inc.startDate.split('-')[0]) === prevYear;

    // Personas incapacitadas en el mes y año (únicas)
    const personasMes = new Set(deptIncapacidades.filter(inMonth).map(inc => inc.userId)).size;
    const personasMesAnterior = new Set(deptIncapacidades.filter(inPrevMonth).map(inc => inc.userId)).size;
    const personasAnio = new Set(deptIncapacidades.filter(inYear).map(inc => inc.userId)).size;
    const diasMes = daysFor(deptIncapacidades.filter(inMonth));
    const diasMesAnterior = daysFor(deptIncapacidades.filter(inPrevMonth));
    const diasAnio = daysFor(deptIncapacidades.filter(inYear));
    const diasAnioAnterior = daysFor(deptIncapacidades.filter(inPrevYear));

    return { personasMes, personasMesAnterior, personasAnio, diasMes, diasMesAnterior, diasAnio, diasAnioAnterior };
  }, [incapacidades, selectedDepartment]);

  const StatCard = ({
    icon: Icon,
    title,
    value,
    unit,
    prevLabel,
    prevValue,
    accent,
    extra,
  }: {
    icon: React.ElementType;
    title: string;
    value: number;
    unit: string;
    prevLabel: string;
    prevValue: number;
    accent: 'blue' | 'green';
    extra?: string;
  }) => {
    const isBlue = accent === 'blue';
    return (
      <div
        className={cn(
          'rounded-2xl border p-3 flex flex-col justify-between min-h-[120px] sm:min-h-[132px] flex-1 sm:w-44 sm:flex-none',
          isBlue ? 'bg-[#F0F7FF] border-[#D1E3F6]' : 'bg-[#F0FFF4] border-[#C6F6D5]'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-[#1D1D1F] leading-tight">{title}</p>
          <Icon className={cn('w-5 h-5 shrink-0', isBlue ? 'text-corporate' : 'text-green-600')} />
        </div>
        <div>
          <p className="text-2xl sm:text-3xl font-bold text-[#1D1D1F]">{value}</p>
          <p className="text-xs text-[#86868B]">{unit}</p>
        </div>
        <div className={cn('pt-2 border-t space-y-0.5', isBlue ? 'border-[#D1E3F6]' : 'border-[#C6F6D5]')}>
          <p className="text-xs text-[#86868B]">
            {prevLabel}: {prevValue}
          </p>
          {extra && (
            <p className={cn('text-xs font-medium', isBlue ? 'text-corporate' : 'text-green-600')}>{extra}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Estadísticas */}
      <div className="flex gap-3">
        {activeSubTab === 'mias' ? (
          <>
            <StatCard
              icon={Calendar}
              title="Este mes"
              value={myStats.diasMes}
              unit="días"
              prevLabel="Mes anterior"
              prevValue={myStats.diasMesAnterior}
              accent="blue"
              extra={
                myStats.diasMesAnterior === 0
                  ? 'vs anterior: N/A'
                  : `vs anterior: ${((myStats.diasMes - myStats.diasMesAnterior) / myStats.diasMesAnterior * 100).toFixed(0)}%`
              }
            />
            <StatCard
              icon={CalendarDays}
              title="Este año"
              value={myStats.diasAnio}
              unit="días"
              prevLabel="Año anterior"
              prevValue={myStats.diasAnioAnterior}
              accent="green"
              extra={
                myStats.diasAnioAnterior === 0
                  ? 'vs anterior: N/A'
                  : `vs anterior: ${((myStats.diasAnio - myStats.diasAnioAnterior) / myStats.diasAnioAnterior * 100).toFixed(0)}%`
              }
            />
          </>
        ) : (
          <>
            <StatCard
              icon={Users}
              title="Personas este mes"
              value={deptStats.personasMes}
              unit="personas"
              prevLabel="Mes anterior"
              prevValue={deptStats.personasMesAnterior}
              accent="blue"
              extra={
                deptStats.personasMes === 0
                  ? 'Promedio: 0 días/persona'
                  : `Promedio: ${(deptStats.diasMes / deptStats.personasMes).toFixed(1)} días/persona`
              }
            />
            <StatCard
              icon={CalendarDays}
              title="Días este año"
              value={deptStats.diasAnio}
              unit="días"
              prevLabel="Año anterior"
              prevValue={deptStats.diasAnioAnterior}
              accent="green"
              extra={
                deptStats.personasAnio === 0
                  ? 'Promedio: 0 días/persona'
                  : `Promedio: ${(deptStats.diasAnio / deptStats.personasAnio).toFixed(1)} días/persona`
              }
            />
          </>
        )}
      </div>

      {/* Lista de incapacidades */}
      <div className="space-y-3">
        {(activeSubTab === 'mias' ? filteredMyIncapacidades : filteredIncapacidades).length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="w-16 h-16 bg-[#F5F5F7] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HeartPulse className="w-8 h-8 text-[#C7C7CC]" />
            </div>
            <p className="text-[#86868B]">
              {activeSubTab === 'mias' 
                ? `No hay incapacidades ${myFilter !== 'historial' ? myFilter : ''}`
                : `No hay incapacidades ${statusFilter !== 'todas' ? statusConfig[statusFilter].label.toLowerCase() + 's' : ''}`
              }
            </p>
          </div>
        ) : (
          (activeSubTab === 'mias' ? filteredMyIncapacidades : filteredIncapacidades).map((incapacidad) => {
            const typeConfig = incapacityTypeConfig[incapacidad.type] || { icon: HeartPulse, color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', label: incapacidad.type };
            const statusCfg = statusConfig[incapacidad.status] || { color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', label: incapacidad.status, icon: Clock };
            const TypeIcon = typeConfig.icon;
            const StatusIcon = statusCfg.icon;
            // Parsear fechas sin timezone issues
            const [startYear, startMonth, startDay] = incapacidad.startDate.split('-').map(Number);
            const [endYear, endMonth, endDay] = incapacidad.endDate.split('-').map(Number);
            const startDate = new Date(startYear, startMonth - 1, startDay);
            const endDate = new Date(endYear, endMonth - 1, endDay);
            const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const isExpanded = expandedIncapacityId === incapacidad.id;
            
            return (
              <div
                key={incapacidad.id}
                className={cn(
                  "bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all overflow-hidden",
                  isExpanded ? "shadow-[0_4px_16px_rgba(0,0,0,0.12)]" : "hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                )}
              >
                {/* Cabecera de la tarjeta - CLICABLE */}
                <button
                  onClick={() => incapacidad.id && toggleExpand(incapacidad.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    {(() => {
                      const incUser = users.find(
                        (u) =>
                          u.id === incapacidad.userId ||
                          u.email === incapacidad.userId ||
                          u.name === incapacidad.userName
                      );
                      return (
                        <UserAvatar
                          name={incapacidad.userName}
                          photoUrl={incUser?.photoURL || incUser?.avatar}
                          size="lg"
                          fallbackClassName="bg-corporate/10 text-corporate text-lg"
                        />
                      );
                    })()}

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      {/* Fila superior: Nombre y Estado (MÁS VISIBLE) */}
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <p className="text-sm font-medium text-[#1D1D1F]">{incapacidad.userName}</p>
                        {/* ESTADO MÁS VISIBLE - Badge grande con borde */}
                        <span className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border-2",
                          statusCfg.bgColor,
                          statusCfg.color,
                          statusCfg.borderColor
                        )}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusCfg.label}
                        </span>
                      </div>
                      
                      <p className="text-xs text-[#86868B]">
                        {incapacidad.userDepartment.replace(/_/g, ' ')}
                      </p>
                      
                      {/* Tipo y fechas */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg border", typeConfig.bgColor, typeConfig.borderColor)}>
                          <TypeIcon className={cn("w-3.5 h-3.5", typeConfig.color)} />
                          <span className={cn("text-xs font-medium", typeConfig.color)}>{typeConfig.label}</span>
                        </div>
                        <span className="text-xs text-[#86868B]">
                          {startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          {' '}({daysCount} {daysCount === 1 ? 'día' : 'días'})
                        </span>
                      </div>
                      
                      {incapacidad.description && (
                        <p className="text-xs text-[#86868B] mt-2 line-clamp-1">{incapacidad.description}</p>
                      )}
                      
                      {/* Reemplazo asignado (vista previa) */}
                      {incapacidad.replacementUserName && (
                        <div className={cn(
                          "flex items-center gap-1.5 mt-2 text-xs",
                          incapacidad.isExternalSupport ? "text-amber-600" : "text-green-600"
                        )}>
                          <User className="w-3.5 h-3.5" />
                          <span>
                            Reemplazo: {incapacidad.replacementUserName}
                            {incapacidad.isExternalSupport && (
                              <span className="ml-1 px-1.5 py-0.5 bg-amber-100 rounded text-[10px]">Apoyo externo</span>
                            )}
                          </span>
                        </div>
                      )}
                      
                      {/* Motivo de rechazo (vista previa) */}
                      {incapacidad.rejectionReason && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
                          <X className="w-3.5 h-3.5" />
                          <span>Motivo: {incapacidad.rejectionReason}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Icono de expansión */}
                    <div className="flex-shrink-0">
                      <ChevronRight className={cn(
                        "w-5 h-5 text-[#C7C7CC] transition-transform",
                        isExpanded && "rotate-90"
                      )} />
                    </div>
                  </div>
                </button>
                
                {/* CONTENIDO EXPANDIDO */}
                {isExpanded && (
                  <div className="border-t border-[#E5E5E7] p-4 bg-[#FAFAFA]">
                    {/* Botones de acción - SOLO en Equipo */}
                    {activeSubTab === 'equipo' && (
                      <div className="flex gap-2 mb-4 flex-wrap">
                        {/* Botón Verificar */}
                        {incapacidad.status === 'pendiente' && canVerifyIncapacidad && (
                          <button
                            onClick={() => handleVerify(incapacidad)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            Verificar
                          </button>
                        )}

                        {/* Botón Registrar */}
                        {(incapacidad.status === 'pendiente' || incapacidad.status === 'verificada') && canRegisterIncapacidad && (
                          <button
                            onClick={() => handleRegister(incapacidad)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            Registrar
                          </button>
                        )}

                        {/* Botón Rechazar */}
                        {(incapacidad.status === 'pendiente' || incapacidad.status === 'verificada') && canRejectIncapacidad && (
                          <button
                            onClick={() => handleReject(incapacidad)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors ml-auto"
                          >
                            <X className="w-4 h-4" />
                            Rechazar
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Información del reemplazo con botón para cambiar */}
                    {incapacidad.status === 'registrada' && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-[#1D1D1F]">Reemplazo asignado</p>
                          <button
                            onClick={() => handleChangeReplacement(incapacidad)}
                            className="text-xs text-corporate hover:underline"
                          >
                            Cambiar reemplazo
                          </button>
                        </div>
                        {incapacidad.replacementUserName ? (
                          <div className={cn(
                            "flex items-center gap-3 rounded-xl p-3 border",
                            incapacidad.isExternalSupport 
                              ? "bg-amber-50 border-amber-200" 
                              : "bg-green-50 border-green-200"
                          )}>
                            {(() => {
                              const replacementUser = incapacidad.replacementUserId
                                ? users.find(
                                    (u) =>
                                      u.id === incapacidad.replacementUserId ||
                                      u.email === incapacidad.replacementUserId ||
                                      u.name === incapacidad.replacementUserName
                                  )
                                : undefined;
                              return (
                                <UserAvatar
                                  name={incapacidad.replacementUserName || ''}
                                  photoUrl={replacementUser?.photoURL || replacementUser?.avatar}
                                  size="md"
                                  fallbackClassName={cn(
                                    "text-sm",
                                    incapacidad.isExternalSupport ? "bg-amber-500" : "bg-green-500"
                                  )}
                                />
                              );
                            })()}
                            <div>
                              <p className={cn(
                                "text-sm font-medium",
                                incapacidad.isExternalSupport ? "text-amber-700" : "text-green-700"
                              )}>
                                {incapacidad.replacementUserName}
                              </p>
                              {incapacidad.isExternalSupport && incapacidad.replacementUserDept && (
                                <p className="text-xs text-amber-600">
                                  Apoyo de: {incapacidad.replacementUserDept.replace(/_/g, ' ')}
                                </p>
                              )}
                            </div>
                            {incapacidad.isExternalSupport && (
                              <span className="ml-auto px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-medium rounded">
                                Apoyo externo
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="bg-[#F5F5F7] rounded-xl p-4 text-center">
                            <p className="text-sm text-[#86868B] mb-2">No hay reemplazo asignado</p>
                            <button
                              onClick={() => handleChangeReplacement(incapacidad)}
                              className="text-sm text-corporate hover:underline"
                            >
                              + Asignar reemplazo
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Documentos */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-[#1D1D1F] flex items-center gap-2">
                          <ClipboardList className="w-4 h-4" /> Documentos
                        </p>
                      </div>
                      {(incapacidad.documents?.length || 0) > 0 ? (
                        <div className="space-y-2">
                          {incapacidad.documents.map(doc => (
                            <div key={doc.id} className="bg-white rounded-xl p-3 border border-[#E5E5E7]">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <ClipboardList className="w-4 h-4 text-[#86868B]" />
                                  <span className="text-sm">{doc.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {doc.uploaded ? (
                                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded-full">
                                      Subido ({doc.fileUrls?.length || 0})
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full">
                                      Pendiente
                                    </span>
                                  )}
                                  {/* Botón para subir foto (solo para el usuario que cargó la incapacidad) */}
                                  {user?.id === incapacidad.userId && (
                                    <button
                                      onClick={() => {
                                        setSelectedIncapacity(incapacidad);
                                        setSelectedDocForUpload(doc.id);
                                        setShowUploadDocModal(true);
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 bg-corporate/10 text-corporate rounded text-xs hover:bg-corporate/20"
                                    >
                                      <Camera className="w-3 h-3" />
                                      {doc.uploaded ? 'Agregar' : 'Subir'}
                                    </button>
                                  )}
                                </div>
                              </div>
                              {/* Mostrar fotos subidas - orientación vertical */}
                              {doc.fileUrls && doc.fileUrls.length > 0 && (
                                <div className="flex flex-wrap gap-3 mt-3">
                                  {doc.fileUrls.map((url, idx) => (
                                    <div key={idx} className="relative group">
                                      {url.startsWith('http') || url.startsWith('data:') ? (
                                        <>
                                          <img 
                                            src={url} 
                                            alt={`${doc.name} ${idx + 1}`}
                                            className="h-32 w-24 object-contain rounded-lg border border-[#E5E5E7] cursor-pointer hover:border-corporate transition-colors bg-[#F5F5F7]"
                                            onClick={() => setExpandedImage(url)}
                                          />
                                          <a
                                            href={url}
                                            download={`${doc.name}-${idx + 1}.jpg`}
                                            className="absolute top-1 right-1 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Download className="w-3.5 h-3.5 text-corporate" />
                                          </a>
                                        </>
                                      ) : (
                                        <div className="h-32 w-24 flex flex-col items-center justify-center rounded-lg border border-green-200 bg-green-50 p-2">
                                          <Check className="w-8 h-8 text-green-500 mb-1" />
                                          <span className="text-xs text-green-600 text-center">Documento subido</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#86868B]">No hay documentos solicitados</p>
                      )}
                      
                      {/* Solicitar nuevo documento - SOLO en Equipo con permiso */}
                      {activeSubTab === 'equipo' && canRequestIncapacidadDocs && (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={newDocName}
                            onChange={(e) => setNewDocName(e.target.value)}
                            className="flex-1 px-3 py-2 border border-[#E5E5E7] rounded-lg text-sm"
                            placeholder="Solicitar nuevo documento..."
                          />
                          <Button 
                            size="sm"
                            disabled={!newDocName.trim()}
                            onClick={() => incapacidad.id && requestDocument(incapacidad.id)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Historial */}
                    <div className="mb-4">
                      <p className="text-sm font-medium text-[#1D1D1F] mb-2 flex items-center gap-2">
                        <History className="w-4 h-4" /> Historial de acciones
                      </p>
                      <div className="space-y-2 max-h-40 overflow-y-auto bg-white rounded-xl p-3 border border-[#E5E5E7]">
                        {(incapacidad.history || []).map((h, i) => (
                          <div key={i} className="flex items-start gap-3 text-sm">
                            <div className="w-2 h-2 bg-corporate rounded-full mt-1.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-[#1D1D1F]">{h.action}</p>
                              <p className="text-xs text-[#86868B]">{h.user} • {new Date(h.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Notas */}
                    <div>
                      <p className="text-sm font-medium text-[#1D1D1F] mb-2">Notas</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                        {(incapacidad.notes?.length || 0) > 0 ? (
                          incapacidad.notes!.map((note, i) => {
                            // Manejar tanto string como Timestamp de Firestore
                            const noteDate = typeof note.date === 'string' ? new Date(note.date) : new Date();
                            const isValidDate = !isNaN(noteDate.getTime());
                            return (
                              <div key={i} className="bg-white rounded-xl p-3 border border-[#E5E5E7]">
                                <p className="text-sm text-[#1D1D1F]">{note.text}</p>
                                <p className="text-xs text-[#86868B] mt-1">
                                  {note.user} • {isValidDate ? noteDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Fecha no disponible'}
                                </p>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-[#86868B]">Sin notas</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          className="flex-1 px-3 py-2 border border-[#E5E5E7] rounded-lg text-sm"
                          placeholder="Añadir nota..."
                        />
                        <Button 
                          size="sm"
                          disabled={!newNote.trim()}
                          onClick={() => addNoteLocal(incapacidad.id!)}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Registrar Incapacidad - CON SELECCIÓN DE REEMPLAZO */}
      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              Registrar Incapacidad
            </DialogTitle>
          </DialogHeader>
          {selectedIncapacity && (
            <div className="space-y-4">
              {/* Info de la incapacidad */}
              <div className="bg-[#F5F5F7] rounded-xl p-4">
                <p className="text-sm font-medium text-[#1D1D1F]">{selectedIncapacity.userName}</p>
                <p className="text-xs text-[#86868B]">{selectedIncapacity.userDepartment.replace(/_/g, ' ')}</p>
                <div className="flex items-center gap-2 mt-2">
                  {(() => {
                    const config = incapacityTypeConfig[selectedIncapacity.type];
                    const Icon = config.icon;
                    return (
                      <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg", config.bgColor)}>
                        <Icon className={cn("w-3.5 h-3.5", config.color)} />
                        <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
                      </div>
                    );
                  })()}
                  <span className="text-xs text-[#86868B]">
                    {new Date(selectedIncapacity.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {new Date(selectedIncapacity.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
              
              {/* Selección de reemplazo */}
              <div>
                <p className="text-sm font-medium text-[#1D1D1F] mb-2">Seleccionar reemplazo (opcional)</p>
                
                {/* Toggle para apoyo externo */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => {
                      setIsExternalSupport(false);
                      setSelectedReplacement('');
                    }}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      !isExternalSupport 
                        ? "bg-corporate text-white" 
                        : "bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5E7]"
                    )}
                  >
                    Mismo departamento
                  </button>
                  <button
                    onClick={() => {
                      setIsExternalSupport(true);
                      setSelectedReplacement('');
                    }}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1",
                      isExternalSupport 
                        ? "bg-amber-500 text-white" 
                        : "bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5E7]"
                    )}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Apoyo externo
                  </button>
                </div>
                
                {/* Lista de usuarios */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getReplacementUsers(selectedIncapacity, isExternalSupport).map(u => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedReplacement(u.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                        selectedReplacement === u.id
                          ? 'border-corporate bg-corporate/5'
                          : 'border-[#E5E5E7] bg-white hover:border-[#C7C7CC]'
                      )}
                    >
                      <UserAvatar name={u.name} photoUrl={(u as any).photoURL || u.avatar} size="md" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#1D1D1F]">{u.name}</p>
                        <p className="text-xs text-[#86868B]">{u.position}</p>
                        {isExternalSupport && (
                          <p className="text-xs text-amber-600">{u.department.replace(/_/g, ' ')}</p>
                        )}
                      </div>
                    </button>
                  ))}
                  {getReplacementUsers(selectedIncapacity, isExternalSupport).length === 0 && (
                    <p className="text-sm text-[#86868B] text-center py-4">
                      No hay usuarios disponibles para reemplazo
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowRegisterModal(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={confirmRegister}
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Confirmar Registro
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Rechazar Incapacidad */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <X className="w-4 h-4 text-red-600" />
              </div>
              Rechazar Incapacidad
            </DialogTitle>
          </DialogHeader>
          {selectedIncapacity && (
            <div className="space-y-4">
              <div className="bg-[#F5F5F7] rounded-xl p-4">
                <p className="text-sm font-medium text-[#1D1D1F]">{selectedIncapacity.userName}</p>
                <p className="text-xs text-[#86868B]">{selectedIncapacity.userDepartment.replace(/_/g, ' ')}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-[#1D1D1F] mb-1 block">Motivo del rechazo *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E5E7] rounded-lg text-sm min-h-[80px] resize-none"
                  placeholder="Indica el motivo del rechazo..."
                />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowRejectModal(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={!rejectionReason.trim()}
                  onClick={confirmReject}
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Rechazar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Cambiar Reemplazo */}
      <Dialog open={showChangeReplaceModal} onOpenChange={setShowChangeReplaceModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              Cambiar Reemplazo
            </DialogTitle>
          </DialogHeader>
          {selectedIncapacity && (
            <div className="space-y-4">
              <div className="bg-[#F5F5F7] rounded-xl p-4">
                <p className="text-sm font-medium text-[#1D1D1F]">{selectedIncapacity.userName}</p>
                <p className="text-xs text-[#86868B]">{selectedIncapacity.userDepartment.replace(/_/g, ' ')}</p>
              </div>
              
              {/* Toggle para apoyo externo */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => {
                    setIsExternalSupport(false);
                    setSelectedReplacement('');
                  }}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    !isExternalSupport 
                      ? "bg-corporate text-white" 
                      : "bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5E7]"
                  )}
                >
                  Mismo departamento
                </button>
                <button
                  onClick={() => {
                    setIsExternalSupport(true);
                    setSelectedReplacement('');
                  }}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1",
                    isExternalSupport 
                      ? "bg-amber-500 text-white" 
                      : "bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5E7]"
                  )}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Apoyo externo
                </button>
              </div>
              
              {/* Lista de usuarios */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {getReplacementUsers(selectedIncapacity, isExternalSupport).map(u => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedReplacement(u.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                      selectedReplacement === u.id
                        ? 'border-corporate bg-corporate/5'
                        : 'border-[#E5E5E7] bg-white hover:border-[#C7C7CC]'
                    )}
                  >
                    <UserAvatar name={u.name} photoUrl={(u as any).photoURL || u.avatar} size="md" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#1D1D1F]">{u.name}</p>
                      <p className="text-xs text-[#86868B]">{u.position}</p>
                      {isExternalSupport && (
                        <p className="text-xs text-amber-600">{u.department.replace(/_/g, ' ')}</p>
                      )}
                    </div>
                  </button>
                ))}
                {getReplacementUsers(selectedIncapacity, isExternalSupport).length === 0 && (
                  <p className="text-sm text-[#86868B] text-center py-4">
                    No hay usuarios disponibles para reemplazo
                  </p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowChangeReplaceModal(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 bg-corporate hover:bg-corporate/90"
                  disabled={!selectedReplacement}
                  onClick={confirmChangeReplacement}
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Cambiar Reemplazo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Subir Documento */}
      <Dialog open={showUploadDocModal} onOpenChange={(open) => {
        setShowUploadDocModal(open);
        if (!open) {
          setSelectedFilePreviews([]);
          setSelectedFiles([]);
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-corporate/10 rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 text-corporate" />
              </div>
              Subir Documento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview de imágenes seleccionadas */}
            {selectedFilePreviews.length > 0 ? (
              <div className="bg-[#F5F5F7] rounded-xl p-4">
                <p className="text-sm text-[#86868B] mb-3 text-center">
                  {selectedFilePreviews.length} archivo(s) seleccionado(s):
                </p>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {selectedFilePreviews.map((preview, idx) => (
                    <div key={idx} className="relative">
                      <img 
                        src={preview} 
                        alt={`Preview ${idx + 1}`} 
                        className="h-20 w-full object-cover rounded-lg border border-[#E5E5E7]"
                      />
                      <button
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                        onClick={() => {
                          setSelectedFilePreviews(prev => prev.filter((_, i) => i !== idx));
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-[#F5F5F7] rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-corporate/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-8 h-8 text-corporate" />
                </div>
                <p className="text-sm text-[#86868B] mb-4">
                  Toma fotos o selecciona archivos para subir
                </p>
              </div>
            )}
            
            {/* Input file oculto - múltiples archivos */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) {
                  // Guardar archivos reales
                  setSelectedFiles(prev => [...prev, ...files]);
                  // Crear previews
                  const newUrls = files.map(file => URL.createObjectURL(file));
                  setSelectedFilePreviews(prev => [...prev, ...newUrls]);
                }
              }}
            />
            
            {/* Botones Cámara/Galería - siempre visibles para agregar más */}
            <div className="flex gap-2">
              <button 
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-corporate text-white rounded-lg text-sm font-medium hover:bg-corporate/90 transition-colors"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                  }
                }}
              >
                <Camera className="w-4 h-4" />
                Cámara
              </button>
              <button 
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#F5F5F7] text-[#1D1D1F] rounded-lg text-sm font-medium border border-[#E5E5E7] hover:bg-[#E5E5E7] transition-colors"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }
                }}
              >
                <FileImage className="w-4 h-4" />
                Galería
              </button>
            </div>
            
            {/* Botones Cancelar / Confirmar */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => {
                  setSelectedFilePreviews([]);
                  setShowUploadDocModal(false);
                }}
              >
                Cancelar
              </Button>
              {selectedFilePreviews.length > 0 && (
                <Button 
                  className="flex-1 bg-corporate hover:bg-corporate/90"
                  disabled={uploadingImages}
                  onClick={() => {
                    console.log('Confirmar clicked', {
                      previewsCount: selectedFilePreviews.length,
                      incapacity: selectedIncapacity,
                      docId: selectedDocForUpload,
                      condition: selectedFilePreviews.length > 0 && !!selectedIncapacity && !!selectedDocForUpload
                    });
                    if (selectedFilePreviews.length > 0 && selectedFiles.length > 0 && selectedIncapacity?.id && selectedDocForUpload) {
                      uploadDocumentPhotoWithFile(selectedIncapacity.id, selectedDocForUpload, selectedFiles);
                    } else {
                      console.log('Condición falló - no se ejecuta uploadDocumentPhotoWithFile', { 
                        previews: selectedFilePreviews.length, 
                        files: selectedFiles.length,
                        incapacity: !!selectedIncapacity,
                        docId: !!selectedDocForUpload 
                      });
                    }
                  }}
                >
                  {uploadingImages ? (
                    <>
                      <div className="w-4 h-4 mr-1.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1.5" />
                      Confirmar ({selectedFilePreviews.length})
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de imagen expandida */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90">
          {expandedImage && (
            <div className="relative">
              <img 
                src={expandedImage} 
                alt="Documento ampliado"
                className="w-full max-h-[80vh] object-contain"
              />
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <a
                href={expandedImage}
                download="documento.jpg"
                className="absolute bottom-4 right-4 px-4 py-2 bg-corporate text-white rounded-lg flex items-center gap-2 hover:bg-corporate/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SOLICITUDES TAB - INTERFACES
// ═══════════════════════════════════════════════════════════════════

interface HistorialItem {
  fecha: string;
  accion: string;
  usuario: string;
  motivo?: string;
}

interface Solicitud {
  id: number | string;
  tipo: 'cambio' | 'intercambio';
  de: string;
  deId?: string;
  a: string;
  aId?: string;
  deCargo?: string;
  aCargo?: string;
  deDept?: string;
  aDept?: string;
  motivo?: string;
  // Turnos del usuario que solicita (de)
  deTurnoActual?: string;
  deTurnoNuevo?: string;
  deHorarioActual?: string;
  deHorarioNuevo?: string;
  // Turnos del usuario que recibe (a)
  aTurnoActual?: string;
  aTurnoNuevo?: string;
  aHorarioActual?: string;
  aHorarioNuevo?: string;
  // Campos legacy para compatibilidad
  turnoActual?: string;
  turnoSolicitado?: string;
  horarioActual?: string;
  horarioSolicitado?: string;
  fecha: string;
  fechaSolicitud: string;
  fechaRespuesta?: string | null;
  respuesta?: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada' | 'deshecha';
  avatar: string;
  historial?: HistorialItem[];
  firestoreId?: string;
}

interface TimeOffRequest {
  id: string;
  userId: string;
  userName: string;
  department: string;
  type: 'vacaciones' | 'cita_medica' | 'dia_libre' | 'otro';
  startDate: string;
  endDate: string;
  reason?: string;
  status: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';
  createdAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  response?: string | null;
  history?: { action: string; by: string; at: string; note?: string }[];
}

const TIME_OFF_LABELS: Record<TimeOffRequest['type'], string> = {
  vacaciones: 'Vacaciones',
  cita_medica: 'Cita médica',
  dia_libre: 'Día libre',
  otro: 'Otro',
};

function formatTimeOffRange(startDate: string, endDate: string) {
  if (startDate === endDate) return formatDateFromString(startDate);
  return `${formatDateFromString(startDate)} - ${formatDateFromString(endDate)}`;
}

function isDateInRange(dateStr: string, startDate: string, endDate: string) {
  return dateStr >= startDate && dateStr <= endDate;
}

function findTimeOffForDate(
  requests: TimeOffRequest[],
  dateStr: string,
  userId?: string
): TimeOffRequest | undefined {
  return requests.find(
    (r) =>
      r.status === 'aprobada' &&
      (!userId || r.userId === userId) &&
      isDateInRange(dateStr, r.startDate, r.endDate)
  );
}

const TIME_OFF_VISUAL: Record<
  TimeOffRequest['type'],
  { icon: React.ElementType; color: string; bgColor: string; borderColor: string }
> = {
  vacaciones: { icon: Sun, color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-200' },
  dia_libre: { icon: Sun, color: 'text-amber-600', bgColor: 'bg-amber-100', borderColor: 'border-amber-200' },
  cita_medica: { icon: Stethoscope, color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-200' },
  otro: { icon: FileText, color: 'text-[#86868B]', bgColor: 'bg-[#F5F5F7]', borderColor: 'border-[#E5E5E7]' },
};

function TimeOffStatusBadge({ status }: { status: TimeOffRequest['status'] }) {
  const config = {
    pendiente: { class: 'bg-amber-100 text-amber-700', label: 'Pendiente' },
    aprobada: { class: 'bg-green-100 text-green-700', label: 'Aprobada' },
    rechazada: { class: 'bg-red-100 text-red-700', label: 'Rechazada' },
    cancelada: { class: 'bg-gray-100 text-gray-700', label: 'Cancelada' },
  };
  const { class: className, label } = config[status];
  return <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', className)}>{label}</span>;
}

interface TimeOffRequestsPanelProps {
  myRequests: TimeOffRequest[];
  teamRequests: TimeOffRequest[];
  canApprove: boolean;
  users: { id: string; name: string; avatar?: string; photoURL?: string }[];
  onApprove: (req: TimeOffRequest) => void;
  onReject: (req: TimeOffRequest) => void;
  onEdit: (req: TimeOffRequest, data: { type: TimeOffRequest['type']; startDate: string; endDate: string }) => void;
  onCancel: (req: TimeOffRequest) => void;
  onDelete: (req: TimeOffRequest) => void;
  view?: 'mias' | 'equipo';
  onViewChange?: (view: 'mias' | 'equipo') => void;
  filter?: 'todas' | TimeOffRequest['status'];
  onFilterChange?: (filter: 'todas' | TimeOffRequest['status']) => void;
  deptFilter?: string | 'ALL';
  onDeptFilterChange?: (dept: string | 'ALL') => void;
}

function TimeOffRequestsPanel({
  myRequests,
  teamRequests,
  canApprove,
  users,
  onApprove,
  onReject,
  onEdit,
  onCancel,
  onDelete,
  view: controlledView,
  onViewChange,
  filter: controlledFilter,
  onFilterChange,
  deptFilter: controlledDeptFilter,
  onDeptFilterChange,
}: TimeOffRequestsPanelProps) {
  const { user } = useAuth();
  const { departmentOptions, departmentTreeOptions } = useDynamicDepartments();
  const [internalView, setInternalView] = useState<'mias' | 'equipo'>('mias');
  const [internalFilter, setInternalFilter] = useState<'todas' | TimeOffRequest['status']>('todas');
  const [internalDeptFilter, setInternalDeptFilter] = useState<string | 'ALL'>('ALL');

  const view = controlledView ?? internalView;
  const setView = onViewChange ?? setInternalView;
  const filter = controlledFilter ?? internalFilter;
  const setFilter = onFilterChange ?? setInternalFilter;
  const deptFilter = controlledDeptFilter ?? internalDeptFilter;
  const setDeptFilter = onDeptFilterChange ?? setInternalDeptFilter;

  // Modal de edición
  const [editingRequest, setEditingRequest] = useState<TimeOffRequest | null>(null);
  const [editType, setEditType] = useState<TimeOffRequest['type']>('dia_libre');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  // Modal de eliminación
  const [deletingRequest, setDeletingRequest] = useState<TimeOffRequest | null>(null);

  const activeView = canApprove ? view : 'mias';
  const requests = activeView === 'mias' ? myRequests : teamRequests;
  const deptFiltered = deptFilter === 'ALL' ? requests : requests.filter((r) => r.department === deptFilter);
  const filtered = deptFiltered.filter((r) => filter === 'todas' || r.status === filter);

  const showDeptFilter = activeView === 'equipo' && departmentOptions.length > 1;

  const filterButtons: { id: typeof filter; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'pendiente', label: 'Pendientes' },
    { id: 'aprobada', label: 'Aprobadas' },
    { id: 'rechazada', label: 'Rechazadas' },
    { id: 'cancelada', label: 'Canceladas' },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="w-16 h-16 bg-[#F5F5F7] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sun className="w-8 h-8 text-[#C7C7CC]" />
            </div>
            <p className="text-[#86868B]">
              {activeView === 'mias' ? 'No tienes solicitudes de tiempo libre' : 'No hay solicitudes del equipo'}
            </p>
          </div>
        ) : (
          filtered.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {(() => {
                    const reqUser = users.find((u) => u.id === req.userId);
                    return (
                      <UserAvatar
                        name={req.userName}
                        photoUrl={reqUser?.photoURL || reqUser?.avatar}
                        size="md"
                        fallbackClassName="bg-corporate text-sm"
                      />
                    );
                  })()}
                  <div>
                    <p className="text-sm font-medium text-[#1D1D1F]">{req.userName}</p>
                    <p className="text-xs text-[#86868B]">{req.department.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <TimeOffStatusBadge status={req.status} />
              </div>

              <div className="mt-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5E7]">
                  <Sun className="w-3 h-3 mr-1.5" />
                  {TIME_OFF_LABELS[req.type]}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm text-[#1D1D1F]">
                <Calendar className="w-4 h-4 text-[#86868B]" />
                <span className="text-[#86868B]">Fechas:</span>
                <span className="font-medium">{formatTimeOffRange(req.startDate, req.endDate)}</span>
              </div>

              {req.reason && (
                <div className="mt-2 flex items-start gap-2 text-sm text-[#1D1D1F]">
                  <FileText className="w-4 h-4 text-[#86868B] mt-0.5" />
                  <span className="text-[#86868B]">Motivo:</span>
                  <span className="font-medium">{req.reason}</span>
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-[#E5E5E7] flex items-center justify-between text-xs text-[#86868B]">
                <span>
                  Solicitado: {new Date(req.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}{' '}
                  {new Date(req.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {req.reviewedAt && (
                  <span>
                    Revisado: {new Date(req.reviewedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}{' '}
                    {new Date(req.reviewedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {/* Historial: solo visible para aprobadores */}
              {canApprove && (req.history || []).length > 0 && (
                <div className="mt-3 pt-2 border-t border-[#E5E5E7]">
                  <p className="text-xs font-medium text-[#86868B] mb-1.5">Historial:</p>
                  <div className="space-y-1">
                    {req.history!.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <span className="text-[#86868B] whitespace-nowrap">
                          {new Date(item.at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}{' '}
                          {new Date(item.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[#1D1D1F]">- {item.action}</span>
                        {item.note && <span className="text-[#86868B] italic">({item.note})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {canApprove && req.status === 'pendiente' && (
                <div className="mt-3 flex gap-2 justify-end">
                  <button
                    onClick={() => onApprove(req)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => onReject(req)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-500 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Rechazar
                  </button>
                </div>
              )}

              <div className="mt-2 flex gap-2 justify-end">
                {canApprove && req.status !== 'cancelada' && (
                  <button
                    onClick={() => {
                      setEditingRequest(req);
                      setEditType(req.type);
                      setEditStartDate(req.startDate);
                      setEditEndDate(req.endDate);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5E7] rounded-lg text-sm font-medium hover:bg-white transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                )}
                {req.userId === user?.id && req.status !== 'cancelada' && (
                  <button
                    onClick={() => req.status === 'pendiente' && onCancel(req)}
                    disabled={req.status !== 'pendiente'}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancelar
                  </button>
                )}
                {(canApprove || (req.userId === user?.id && req.status !== 'aprobada')) && (
                  <button
                    onClick={() => setDeletingRequest(req)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-500 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de edición de solicitud */}
      <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-[#1D1D1F] mb-2 block">Tipo</label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as TimeOffRequest['type'])}
                className="w-full px-3 py-2 border border-[#E5E5E7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20 bg-white"
              >
                <option value="vacaciones">Vacaciones</option>
                <option value="cita_medica">Cita médica</option>
                <option value="dia_libre">Día libre</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-[#1D1D1F] mb-2 block">Desde</label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E5E7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1D1D1F] mb-2 block">Hasta</label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E5E7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corporate/20"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setEditingRequest(null)}
              className="flex-1 px-4 py-2 bg-[#F5F5F7] text-[#86868B] rounded-lg text-sm font-medium hover:bg-[#E5E5E7] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!editingRequest) return;
                onEdit(editingRequest, {
                  type: editType,
                  startDate: editStartDate,
                  endDate: editEndDate,
                });
                setEditingRequest(null);
              }}
              disabled={!editStartDate || !editEndDate || editEndDate < editStartDate}
              className="flex-1 px-4 py-2 bg-corporate text-white rounded-lg text-sm font-medium hover:bg-corporate/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Guardar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para eliminar solicitud */}
      <Dialog open={!!deletingRequest} onOpenChange={(open) => !open && setDeletingRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar solicitud</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-[#1D1D1F]">
              ¿Estás seguro de que querés eliminar la solicitud de{' '}
              <span className="font-medium">{TIME_OFF_LABELS[deletingRequest?.type || 'dia_libre']}</span>{' '}
              de <span className="font-medium">{deletingRequest?.userName}</span>?
            </p>
            <p className="text-xs text-[#86868B] mt-2">
              Esta acción no se puede deshacer y el historial se perderá.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDeletingRequest(null)}
              className="flex-1 px-4 py-2 bg-[#F5F5F7] text-[#86868B] rounded-lg text-sm font-medium hover:bg-[#E5E5E7] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!deletingRequest) return;
                onDelete(deletingRequest);
                setDeletingRequest(null);
              }}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SOLICITUDES TAB
// ═══════════════════════════════════════════════════════════════════

function SolicitudesTab() {
  const { user } = useAuth();
  const { effectiveUser } = useAppConfig();
  const { departmentCodes, departmentOptions, departmentTreeOptions, defaultDepartment, getDeptName, getDeptCode, getVisibleDepartmentCodes, operationalDepartmentCodes } = useDynamicDepartments();
  const { users: firestoreUsers2 } = useFirestoreUsers();
  const { executeShiftSwap } = useFirestoreShifts();
  const users = firestoreUsers2;

  // Departamentos visibles según jerarquía y permisos del usuario
  const visibleDeptCodes = useMemo(() => {
    if (!effectiveUser) return [];
    return getVisibleDepartmentCodes(effectiveUser);
  }, [effectiveUser, getVisibleDepartmentCodes]);

  const visibleDeptOptions = useMemo(() => {
    return departmentOptions.filter(d => visibleDeptCodes.includes(d.code));
  }, [departmentOptions, visibleDeptCodes]);

  const visibleDeptTreeOptions = useMemo(() => {
    return departmentTreeOptions.filter(d => visibleDeptCodes.includes(d.code));
  }, [departmentTreeOptions, visibleDeptCodes]);

  const canViewAllDepartments = useMemo(() => {
    return visibleDeptCodes.length === departmentCodes.length && departmentCodes.length > 0;
  }, [visibleDeptCodes, departmentCodes]);

  const [activeSubTab, setActiveSubTab] = useState<'mis-cambios' | 'mis-solicitudes' | 'equipo'>('mis-cambios');
  const [misCambiosFilter, setMisCambiosFilter] = useState<'recibidas' | 'enviadas' | 'historial' | 'equipo'>('recibidas');
  const [equipoFilter, setEquipoFilter] = useState<'todas' | 'aceptadas' | 'rechazadas' | 'deshechas'>('todas');
  const [equipoDeptFilter, setEquipoDeptFilter] = useState<string | 'ALL'>('ALL');

  // Estado para filtros de solicitudes de tiempo libre (controlados desde el header)
  const [timeOffView, setTimeOffView] = useState<'mias' | 'equipo'>('mias');
  const [timeOffFilter, setTimeOffFilter] = useState<'todas' | TimeOffRequest['status']>('todas');
  const [timeOffDeptFilter, setTimeOffDeptFilter] = useState<string | 'ALL'>('ALL');
  
  // Estado para solicitudes de tiempo libre (timeOffRequests)
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  
  // Estado para modal de deshacer cambio
  const [showUndoModal, setShowUndoModal] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
  const [undoReason, setUndoReason] = useState('');
  
  // Estado de solicitudes de cambio de turno (solo en memoria, fuente de verdad: Firestore)
  const [todasSolicitudes, setTodasSolicitudes] = useState<Solicitud[]>([]);
  
  // Inicializar solicitudes desde Firestore en tiempo real
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupFirestoreListener = async () => {
      try {
        
        const q = query(collection(db, 'solicitudes'), orderBy('fechaSolicitud', 'desc'));
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          const firestoreSolicitudes: Solicitud[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            firestoreSolicitudes.push({
              id: doc.id,
              tipo: data.tipo,
              deId: data.deId,
              de: data.de,
              deCargo: data.deCargo,
              deDept: data.deDept,
              aId: data.aId,
              a: data.a,
              aCargo: data.aCargo,
              aDept: data.aDept,
              fecha: data.fecha,
              deTurnoActual: data.deTurnoActual,
              deTurnoNuevo: data.deTurnoNuevo,
              deHorarioActual: data.deHorarioActual,
              deHorarioNuevo: data.deHorarioNuevo,
              aTurnoActual: data.aTurnoActual,
              aTurnoNuevo: data.aTurnoNuevo,
              aHorarioActual: data.aHorarioActual,
              aHorarioNuevo: data.aHorarioNuevo,
              turnoActual: data.turnoActual,
              turnoSolicitado: data.turnoSolicitado,
              horarioActual: data.horarioActual,
              horarioSolicitado: data.horarioSolicitado,
              motivo: data.motivo,
              estado: data.estado,
              fechaSolicitud: data.fechaSolicitud?.toDate?.() ? data.fechaSolicitud.toDate().toISOString() : new Date().toISOString(),
              fechaRespuesta: data.fechaRespuesta?.toDate?.() ? data.fechaRespuesta.toDate().toISOString() : null,
              respuesta: data.respuesta,
              avatar: data.avatar,
              historial: data.historial || []
            });
          });
          
          setTodasSolicitudes(firestoreSolicitudes);

          console.log('Solicitudes cargadas desde Firestore:', firestoreSolicitudes.length);
        }, (error) => {
          console.error('Error al escuchar Firestore:', error);
          toast.error('Error al cargar solicitudes de cambio de turno');
        });
      } catch (error) {
        console.error('Error al configurar listener de Firestore:', error);
        toast.error('Error al configurar solicitudes de cambio de turno');
      }
    };
    
    setupFirestoreListener();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);
  
  // Escuchar timeOffRequests desde Firestore en tiempo real
  useEffect(() => {
    const q = query(collection(db, 'timeOffRequests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reqs: TimeOffRequest[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userId: data.userId || '',
            userName: data.userName || '',
            department: data.department || '',
            type: data.type || 'otro',
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            reason: data.reason || '',
            status: data.status || 'pendiente',
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            reviewedBy: data.reviewedBy || null,
            reviewedAt: data.reviewedAt?.toDate?.()?.toISOString?.() || null,
            response: data.response || null,
            history: (data.history || []).map((h: any) => ({
              action: h.action || '',
              by: h.by || '',
              at: h.at?.toDate?.()?.toISOString?.() || h.at || new Date().toISOString(),
              note: h.note || '',
            })),
          } as TimeOffRequest;
        });
        setTimeOffRequests(reqs);
      },
      (error) => {
        console.error('Error al escuchar timeOffRequests:', error);
        toast.error('No se pudieron cargar las solicitudes de tiempo libre');
      }
    );
    return () => unsubscribe();
  }, []);

  // Permisos para aprobar/rechazar solicitudes de tiempo libre
  // Se incluye level <= 6 como fallback robusto por si el rol string no coincide exactamente
  const canApproveTimeOff =
    user?.role === Role.SUPERVISOR ||
    user?.role === Role.GERENTE_DEPARTAMENTO ||
    user?.role === Role.GERENTE_OPERACIONES ||
    user?.role === Role.RRHH ||
    user?.role === Role.DIRECTOR ||
    user?.role === Role.DIRECTOR_GENERAL ||
    (typeof user?.level === 'number' && user.level <= 6);

  const canViewAllTimeOff =
    user?.role === Role.RRHH ||
    user?.role === Role.DIRECTOR ||
    user?.role === Role.DIRECTOR_GENERAL ||
    user?.role === Role.GERENTE_OPERACIONES ||
    (typeof user?.level === 'number' && user.level <= 4);

  const myTimeOffRequests = useMemo(
    () => timeOffRequests.filter((r) => r.userId === user?.id),
    [timeOffRequests, user?.id]
  );

  const teamTimeOffRequests = useMemo(() => {
    if (!canApproveTimeOff) return [];
    // Filtrar por los departamentos visibles según jerarquía/permisos del usuario
    return timeOffRequests.filter((r) => visibleDeptCodes.includes(r.department));
  }, [timeOffRequests, canApproveTimeOff, visibleDeptCodes]);

  const handleApproveTimeOff = async (req: TimeOffRequest) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'timeOffRequests', req.id), {
        status: 'aprobada',
        reviewedBy: user.name || user.id,
        reviewedAt: serverTimestamp(),
        history: arrayUnion({
          action: 'Solicitud aprobada',
          by: user.name || user.id,
          at: new Date().toISOString(),
        }),
      });
      await addDoc(collection(db, 'notifications'), {
        userId: req.userId,
        type: NotificationType.VACATION_APPROVED,
        title: 'Solicitud aprobada',
        body: `Tu solicitud de ${TIME_OFF_LABELS[req.type]} del ${formatTimeOffRange(req.startDate, req.endDate)} fue aprobada.`,
        data: { link: '/horarios' },
        read: false,
        createdAt: serverTimestamp(),
        createdBy: user.id,
        priority: 'normal',
      });
      toast.success('Solicitud aprobada');
    } catch (error) {
      console.error('Error al aprobar solicitud:', error);
      toast.error('No se pudo aprobar la solicitud');
    }
  };

  const handleRejectTimeOff = async (req: TimeOffRequest) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'timeOffRequests', req.id), {
        status: 'rechazada',
        reviewedBy: user.name || user.id,
        reviewedAt: serverTimestamp(),
        history: arrayUnion({
          action: 'Solicitud rechazada',
          by: user.name || user.id,
          at: new Date().toISOString(),
        }),
      });
      await addDoc(collection(db, 'notifications'), {
        userId: req.userId,
        type: NotificationType.VACATION_REJECTED,
        title: 'Solicitud rechazada',
        body: `Tu solicitud de ${TIME_OFF_LABELS[req.type]} del ${formatTimeOffRange(req.startDate, req.endDate)} fue rechazada.`,
        data: { link: '/horarios' },
        read: false,
        createdAt: serverTimestamp(),
        createdBy: user.id,
        priority: 'normal',
      });
      toast.success('Solicitud rechazada');
    } catch (error) {
      console.error('Error al rechazar solicitud:', error);
      toast.error('No se pudo rechazar la solicitud');
    }
  };

  const handleEditTimeOff = async (
    req: TimeOffRequest,
    data: { type: TimeOffRequest['type']; startDate: string; endDate: string }
  ) => {
    if (!user) return;
    try {
      const changes: string[] = [];
      if (data.type !== req.type) changes.push(`tipo: ${TIME_OFF_LABELS[req.type]} → ${TIME_OFF_LABELS[data.type]}`);
      if (data.startDate !== req.startDate) changes.push(`inicio: ${formatTimeOffRange(req.startDate, req.startDate)} → ${formatTimeOffRange(data.startDate, data.startDate)}`);
      if (data.endDate !== req.endDate) changes.push(`fin: ${formatTimeOffRange(req.endDate, req.endDate)} → ${formatTimeOffRange(data.endDate, data.endDate)}`);
      await updateDoc(doc(db, 'timeOffRequests', req.id), {
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        updatedBy: user.name || user.id,
        updatedAt: serverTimestamp(),
        history: arrayUnion({
          action: changes.length > 0 ? `Solicitud editada (${changes.join(', ')})` : 'Solicitud editada',
          by: user.name || user.id,
          at: new Date().toISOString(),
        }),
      });
      toast.success('Solicitud actualizada');
    } catch (error) {
      console.error('Error al editar solicitud:', error);
      toast.error('No se pudo editar la solicitud');
    }
  };

  const handleCancelTimeOff = async (req: TimeOffRequest) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'timeOffRequests', req.id), {
        status: 'cancelada',
        cancelledBy: user.name || user.id,
        cancelledAt: serverTimestamp(),
        history: arrayUnion({
          action: 'Solicitud cancelada por el solicitante',
          by: user.name || user.id,
          at: new Date().toISOString(),
        }),
      });
      toast.success('Solicitud cancelada');
    } catch (error) {
      console.error('Error al cancelar solicitud:', error);
      toast.error('No se pudo cancelar la solicitud');
    }
  };

  const handleDeleteTimeOff = async (req: TimeOffRequest) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'timeOffRequests', req.id));
      if (req.userId !== user.id) {
        await addDoc(collection(db, 'notifications'), {
          userId: req.userId,
          type: NotificationType.VACATION_REJECTED,
          title: 'Solicitud eliminada',
          body: `Tu solicitud de ${TIME_OFF_LABELS[req.type]} del ${formatTimeOffRange(req.startDate, req.endDate)} fue eliminada.`,
          data: { link: '/horarios' },
          read: false,
          createdAt: serverTimestamp(),
          createdBy: user.id,
          priority: 'normal',
        });
      }
      toast.success('Solicitud eliminada');
    } catch (error) {
      console.error('Error al eliminar solicitud:', error);
      toast.error('No se pudo eliminar la solicitud');
    }
  };

  // Verificar si el usuario puede ver solicitudes de equipo (Supervisores y roles superiores)
  const canViewEquipo = true; // Temporalmente habilitado para todos, ajustar según permisos reales
  
  // Verificar si el usuario puede deshacer cambios (Supervisor+)
  const canUndoChanges = user?.role === Role.SUPERVISOR || 
                         user?.role === Role.GERENTE_DEPARTAMENTO || 
                         user?.role === Role.GERENTE_OPERACIONES || 
                         user?.role === Role.DIRECTOR || 
                         user?.role === Role.DIRECTOR_GENERAL;
  
  // Función para deshacer cambio
  const handleUndoChange = async () => {
    if (!selectedSolicitud || !undoReason.trim()) return;

    const now = new Date().toISOString();
    const userName = user?.name || 'Supervisor';
    const newHistorialItem = {
      fecha: now,
      accion: 'Cambio deshecho por supervisor',
      usuario: userName,
      motivo: undoReason.trim()
    };

    const updatedSolicitud: Solicitud = {
      ...selectedSolicitud,
      estado: 'deshecha',
      historial: [...(selectedSolicitud.historial || []), newHistorialItem]
    };

    // Persistir en Firestore
    try {
      await updateDoc(doc(db, 'solicitudes', selectedSolicitud.id as string), {
        estado: 'deshecha',
        historial: updatedSolicitud.historial
      });
    } catch (error) {
      console.error('Error al deshacer cambio en Firestore:', error);
      toast.error('No se pudo deshacer el cambio');
      return;
    }

    // Actualizar estado global
    setTodasSolicitudes(prev => prev.map(sol => sol.id === selectedSolicitud.id ? updatedSolicitud : sol));

    // Cerrar modal y limpiar
    setShowUndoModal(false);
    setSelectedSolicitud(null);
    setUndoReason('');
  };

  // Solicitudes (solo Firestore)
  const getFilteredEquipo = () => {
    const currentUser = user?.name || 'Usuario';
    const currentUserId = user?.id || 'current-user';

    let filtered = todasSolicitudes.filter(s =>
      s.de !== currentUser && s.a !== currentUser &&
      s.de !== currentUserId && s.a !== currentUserId &&
      s.de !== 'Tú' && s.a !== 'Tú'
    );

    // Filtrar por departamento: visibleDeptCodes respeta jerarquía y permisos
    if (equipoDeptFilter !== 'ALL') {
      filtered = filtered.filter(s => getDeptCode(s.deDept || '') === equipoDeptFilter || getDeptCode(s.aDept || '') === equipoDeptFilter);
    } else if (visibleDeptCodes.length > 0) {
      filtered = filtered.filter(s => visibleDeptCodes.includes(getDeptCode(s.deDept || '')) || visibleDeptCodes.includes(getDeptCode(s.aDept || '')));
    }

    // Filtrar por estado
    if (equipoFilter === 'aceptadas') filtered = filtered.filter(s => s.estado === 'aceptada');
    if (equipoFilter === 'rechazadas') filtered = filtered.filter(s => s.estado === 'rechazada');
    if (equipoFilter === 'deshechas') filtered = filtered.filter(s => s.estado === 'deshecha');

    return filtered;
  };

  const getFilteredMisCambios = () => {
    const currentUser = user?.name || 'Usuario';
    const currentUserId = user?.id || 'current-user';

    let result: Solicitud[] = [];

    if (misCambiosFilter === 'recibidas') {
      // Solicitudes donde OTROS usuarios envían AL usuario actual (a === usuario actual) y están pendientes
      result = todasSolicitudes.filter(s =>
        (s.a === 'Tú' || s.a === currentUser || s.a === currentUserId) &&
        (s.de !== 'Tú' && s.de !== currentUser && s.de !== currentUserId) &&
        s.estado === 'pendiente'
      );
    } else if (misCambiosFilter === 'enviadas') {
      // Solicitudes donde el usuario actual envía A OTROS (de === usuario actual) y están pendientes
      result = todasSolicitudes.filter(s =>
        (s.de === 'Tú' || s.de === currentUser || s.de === currentUserId) &&
        (s.a !== 'Tú' && s.a !== currentUser && s.a !== currentUserId) &&
        s.estado === 'pendiente'
      );
    } else {
      // Historial - todas las solicitudes donde el usuario participó (aceptadas, rechazadas, deshechas)
      result = todasSolicitudes.filter(s =>
        (s.de === 'Tú' || s.a === 'Tú' || s.de === currentUser || s.a === currentUser || s.de === currentUserId || s.a === currentUserId) &&
        (s.estado === 'aceptada' || s.estado === 'rechazada' || s.estado === 'deshecha')
      );
    }

    // Ordenar cronológicamente de más nueva a más antigua (por fecha de solicitud)
    return result.sort((a, b) => new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime());
  };
  
  // Función para aceptar solicitud
  const handleAcceptSolicitud = async (solicitud: Solicitud) => {
    const now = new Date().toISOString();
    const userName = user?.name || 'Usuario';

    const updatedSolicitud: Solicitud = {
      ...solicitud,
      estado: 'aceptada',
      fechaRespuesta: now,
      historial: [...(solicitud.historial || []), { fecha: now, accion: 'Solicitud aceptada', usuario: userName }]
    };

    // Persistir en Firestore
    try {
      await updateDoc(doc(db, 'solicitudes', solicitud.id as string), {
        estado: 'aceptada',
        fechaRespuesta: now,
        historial: updatedSolicitud.historial
      });

      // Ejecutar el cambio real de turnos en las asignaciones
      await executeShiftSwap({
        requestId: solicitud.id as string,
        type: solicitud.tipo,
        deId: solicitud.deId || '',
        aId: solicitud.aId || '',
        date: solicitud.fecha || '',
        deTurnoActual: solicitud.deTurnoActual,
        deTurnoNuevo: solicitud.deTurnoNuevo,
        deHorarioActual: solicitud.deHorarioActual,
        deHorarioNuevo: solicitud.deHorarioNuevo,
      });

      toast.success('Cambio de turno aplicado');
    } catch (error) {
      console.error('Error al aceptar solicitud en Firestore:', error);
      toast.error('No se pudo aceptar la solicitud');
      return;
    }

    // Actualizar estado global (el listener de Firestore lo refrescará, pero esto mejora la reactividad inmediata)
    setTodasSolicitudes(prev => prev.map(s => s.id === solicitud.id ? updatedSolicitud : s));
  };

  // Función para rechazar solicitud
  const handleRejectSolicitud = async (solicitud: Solicitud) => {
    const now = new Date().toISOString();
    const userName = user?.name || 'Usuario';

    const updatedSolicitud: Solicitud = {
      ...solicitud,
      estado: 'rechazada',
      fechaRespuesta: now,
      historial: [...(solicitud.historial || []), { fecha: now, accion: 'Solicitud rechazada', usuario: userName }]
    };

    // Persistir en Firestore
    try {
      await updateDoc(doc(db, 'solicitudes', solicitud.id as string), {
        estado: 'rechazada',
        fechaRespuesta: now,
        historial: updatedSolicitud.historial
      });
    } catch (error) {
      console.error('Error al rechazar solicitud en Firestore:', error);
      toast.error('No se pudo rechazar la solicitud');
      return;
    }

    // Actualizar estado global
    setTodasSolicitudes(prev => prev.map(s => s.id === solicitud.id ? updatedSolicitud : s));
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Pendiente</span>;
      case 'aceptada':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">Aceptada</span>;
      case 'rechazada':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Rechazada</span>;
      case 'deshecha':
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Deshecha</span>;
      default:
        return null;
    }
  };

  const currentUser = user?.name || 'Usuario';
  const currentUserId = user?.id || 'current-user';
  const userDept = user?.department;

  const misCambiosCounts = useMemo(() => {
    const recibidas = todasSolicitudes.filter(s =>
      (s.a === 'Tú' || s.a === currentUser || s.a === currentUserId) &&
      (s.de !== 'Tú' && s.de !== currentUser && s.de !== currentUserId) &&
      s.estado === 'pendiente'
    ).length;
    const enviadas = todasSolicitudes.filter(s =>
      (s.de === 'Tú' || s.de === currentUser || s.de === currentUserId) &&
      (s.a !== 'Tú' && s.a !== currentUser && s.a !== currentUserId) &&
      s.estado === 'pendiente'
    ).length;
    const historialCount = todasSolicitudes.filter(s =>
      (s.de === 'Tú' || s.a === 'Tú' || s.de === currentUser || s.a === currentUser || s.de === currentUserId || s.a === currentUserId) &&
      (s.estado === 'aceptada' || s.estado === 'rechazada' || s.estado === 'deshecha')
    ).length;
    return { recibidas, enviadas, historialCount };
  }, [todasSolicitudes, currentUser, currentUserId]);

  const equipoCounts = useMemo(() => {
    let filtered = todasSolicitudes.filter(s =>
      s.de !== currentUser && s.a !== currentUser &&
      s.de !== currentUserId && s.a !== currentUserId &&
      s.de !== 'Tú' && s.a !== 'Tú'
    );
    if (equipoDeptFilter !== 'ALL') {
      filtered = filtered.filter(s => s.deDept === equipoDeptFilter || s.aDept === equipoDeptFilter);
    } else if (visibleDeptCodes.length > 0) {
      filtered = filtered.filter(s => visibleDeptCodes.includes(s.deDept || '') || visibleDeptCodes.includes(s.aDept || ''));
    }
    return {
      todas: filtered.length,
      aceptadas: filtered.filter(s => s.estado === 'aceptada').length,
      rechazadas: filtered.filter(s => s.estado === 'rechazada').length,
      deshechas: filtered.filter(s => s.estado === 'deshecha').length,
    };
  }, [todasSolicitudes, currentUser, currentUserId, equipoDeptFilter, visibleDeptCodes]);

  return (
    <div className="space-y-4">
      {/* Header con pestañas y filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[#1D1D1F]">Solicitudes</h3>
          <p className="text-sm text-[#86868B]">Gestiona cambios de turno y solicitudes de tiempo libre</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-1">
          {/* Pestañas principales: Cambios | Solicitudes */}
          <div className="flex gap-2 p-1 bg-[#F5F5F7] rounded-xl w-fit">
            <button
              onClick={() => setActiveSubTab('mis-cambios')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                activeSubTab === 'mis-cambios'
                  ? 'bg-white text-corporate shadow-sm'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              )}
            >
              <User className="w-4 h-4" />
              Cambios
            </button>
            <button
              onClick={() => setActiveSubTab('mis-solicitudes')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                activeSubTab === 'mis-solicitudes'
                  ? 'bg-white text-corporate shadow-sm'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              )}
            >
              <Sun className="w-4 h-4" />
              Solicitudes
            </button>
          </div>

          {activeSubTab === 'mis-cambios' && (
            <>
              {/* Desktop: botones Recibidas/Enviadas/Historial/Equipo */}
              <div className="hidden md:flex gap-2">
                {[
                  { id: 'recibidas', label: 'Recibidas', icon: Inbox, count: misCambiosCounts.recibidas },
                  { id: 'enviadas', label: 'Enviadas', icon: Send, count: misCambiosCounts.enviadas },
                  { id: 'historial', label: 'Historial', icon: History, count: misCambiosCounts.historialCount },
                  { id: 'equipo', label: 'Equipo', icon: Users, count: equipoCounts.todas },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setMisCambiosFilter(filter.id as typeof misCambiosFilter)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap',
                      misCambiosFilter === filter.id
                        ? 'bg-corporate text-white'
                        : 'bg-white text-[#86868B] hover:bg-[#F5F5F7] border border-[#E5E5E7]'
                    )}
                  >
                    <filter.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{filter.label}</span>
                    {filter.count > 0 && (
                      <span className={cn(
                        'px-1.5 py-0.5 text-[10px] sm:text-xs rounded-full',
                        misCambiosFilter === filter.id ? 'bg-white/20' : 'bg-corporate/10 text-corporate'
                      )}>
                        {filter.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Mobile: dropdown Recibidas/Enviadas/Historial + botón Equipo */}
              <div className="md:hidden flex items-center gap-2 w-full min-w-0">
                <Select value={misCambiosFilter === 'equipo' ? 'recibidas' : misCambiosFilter} onValueChange={(v) => setMisCambiosFilter(v as typeof misCambiosFilter)}>
                  <SelectTrigger className="h-10 px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B] w-fit min-w-0">
                    {(() => {
                      const active = [
                        { id: 'recibidas', label: 'Recibidas', icon: Inbox, count: misCambiosCounts.recibidas },
                        { id: 'enviadas', label: 'Enviadas', icon: Send, count: misCambiosCounts.enviadas },
                        { id: 'historial', label: 'Historial', icon: History, count: misCambiosCounts.historialCount },
                      ].find((f) => f.id === (misCambiosFilter === 'equipo' ? 'recibidas' : misCambiosFilter));
                      const ActiveIcon = active?.icon || Inbox;
                      return (
                        <span className="flex items-center gap-2 text-[#86868B] truncate">
                          <ActiveIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{active?.label}</span>
                          {active && active.count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-corporate/10 text-corporate flex-shrink-0">{active.count}</span>}
                        </span>
                      );
                    })()}
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-50">
                    {[
                      { id: 'recibidas', label: 'Recibidas', icon: Inbox, count: misCambiosCounts.recibidas },
                      { id: 'enviadas', label: 'Enviadas', icon: Send, count: misCambiosCounts.enviadas },
                      { id: 'historial', label: 'Historial', icon: History, count: misCambiosCounts.historialCount },
                    ].map((filter) => {
                      const FilterIcon = filter.icon;
                      return (
                        <SelectItem key={filter.id} value={filter.id}>
                          <span className="flex items-center gap-2">
                            <FilterIcon className="w-4 h-4" />
                            <span>{filter.label}</span>
                            {filter.count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-corporate/10 text-corporate">{filter.count}</span>}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <button
                  onClick={() => setMisCambiosFilter('equipo')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 h-10 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0',
                    misCambiosFilter === 'equipo'
                      ? 'bg-corporate text-white'
                      : 'bg-white text-[#86868B] hover:bg-[#F5F5F7] border border-[#E5E5E7]'
                  )}
                >
                  <Users className="w-4 h-4" />
                  <span>Equipo</span>
                  {equipoCounts.todas > 0 && (
                    <span className={cn(
                      'px-1.5 py-0.5 text-[10px] rounded-full',
                      misCambiosFilter === 'equipo' ? 'bg-white/20' : 'bg-corporate/10 text-corporate'
                    )}>
                      {equipoCounts.todas}
                    </span>
                  )}
                </button>
              </div>

              {misCambiosFilter === 'equipo' && (
                <>
                  {visibleDeptTreeOptions.length > 1 && (
                    <Select value={equipoDeptFilter} onValueChange={(v) => setEquipoDeptFilter(v as string | 'ALL')}>
                      <SelectTrigger className="h-10 px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors shrink-0 text-[#86868B] w-fit min-w-0">
                        <Building2 className="w-4 h-4 text-[#86868B] mr-1" />
                        <SelectValue placeholder="Departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos</SelectItem>
                        {visibleDeptTreeOptions.map((opt) => (
                          <SelectItem key={opt.code} value={opt.code}>
                            <span style={{ paddingLeft: `${opt.level * 12}px` }}>{opt.level > 0 ? '└─ ' : ''}{opt.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Mobile: dropdown de estado del equipo */}
                  <div className="md:hidden min-w-0">
                    <Select value={equipoFilter} onValueChange={(v) => setEquipoFilter(v as typeof equipoFilter)}>
                      <SelectTrigger className="h-10 px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B] w-fit min-w-0">
                        <SelectValue>
                          {(() => {
                            const active = [
                              { id: 'todas', label: 'Todas', icon: LayoutGrid },
                              { id: 'aceptadas', label: 'Aceptadas', icon: CheckCircle2 },
                              { id: 'rechazadas', label: 'Rechazadas', icon: XCircle },
                              { id: 'deshechas', label: 'Revertidas', icon: History },
                            ].find((f) => f.id === equipoFilter);
                            const ActiveIcon = active?.icon || LayoutGrid;
                            return (
                              <span className="flex items-center gap-2 text-[#86868B]">
                                <ActiveIcon className="w-4 h-4" />
                                <span>{active?.label}</span>
                              </span>
                            );
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { id: 'todas', label: 'Todas', icon: LayoutGrid, count: equipoCounts.todas },
                          { id: 'aceptadas', label: 'Aceptadas', icon: CheckCircle2, count: equipoCounts.aceptadas },
                          { id: 'rechazadas', label: 'Rechazadas', icon: XCircle, count: equipoCounts.rechazadas },
                          { id: 'deshechas', label: 'Revertidas', icon: History, count: equipoCounts.deshechas },
                        ].map((filter) => {
                          const FilterIcon = filter.icon;
                          return (
                            <SelectItem key={filter.id} value={filter.id}>
                              <span className="flex items-center gap-2">
                                <FilterIcon className="w-4 h-4" />
                                <span>{filter.label}</span>
                                {filter.count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-corporate/10 text-corporate">{filter.count}</span>}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Desktop: botones de estado del equipo */}
                  <div className="hidden md:flex gap-2">
                    {[
                      { id: 'todas', label: 'Todas', icon: LayoutGrid, count: equipoCounts.todas },
                      { id: 'aceptadas', label: 'Aceptadas', icon: CheckCircle2, count: equipoCounts.aceptadas },
                      { id: 'rechazadas', label: 'Rechazadas', icon: XCircle, count: equipoCounts.rechazadas },
                      { id: 'deshechas', label: 'Revertidas', icon: History, count: equipoCounts.deshechas },
                    ].map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setEquipoFilter(filter.id as typeof equipoFilter)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                          equipoFilter === filter.id
                            ? 'bg-corporate text-white'
                            : 'bg-white text-[#86868B] hover:bg-[#F5F5F7] border border-[#E5E5E7]'
                        )}
                      >
                        <filter.icon className="w-4 h-4" />
                        {filter.label}
                        {filter.count > 0 && (
                          <span className={cn(
                            'px-1.5 py-0.5 text-xs rounded-full',
                            equipoFilter === filter.id ? 'bg-white/20' : 'bg-corporate/10 text-corporate'
                          )}>
                            {filter.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {activeSubTab === 'mis-solicitudes' && (
            <>
              <>
                {/* Desktop: botones Mis solicitudes/Equipo */}
                <div className="hidden md:flex gap-2 p-1 bg-[#F5F5F7] rounded-xl w-fit">
                  <button
                    onClick={() => setTimeOffView('mias')}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                      timeOffView === 'mias'
                        ? 'bg-white text-corporate shadow-sm'
                        : 'text-[#86868B] hover:text-[#1D1D1F]'
                    )}
                  >
                    <User className="w-4 h-4" />
                    Mis solicitudes
                  </button>
                  {canApproveTimeOff && (
                    <button
                      onClick={() => setTimeOffView('equipo')}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        timeOffView === 'equipo'
                          ? 'bg-white text-corporate shadow-sm'
                          : 'text-[#86868B] hover:text-[#1D1D1F]'
                      )}
                    >
                      <Users className="w-4 h-4" />
                      Equipo
                    </button>
                  )}
                </div>

                {/* Mobile: dropdown Mis solicitudes/Equipo */}
                <div className="md:hidden min-w-0">
                  <Select value={canApproveTimeOff ? timeOffView : 'mias'} onValueChange={(v) => canApproveTimeOff && setTimeOffView(v as 'mias' | 'equipo')}>
                    <SelectTrigger className="h-10 px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B] w-fit min-w-0">
                      <span className="flex items-center gap-2 text-[#86868B] truncate">
                        {timeOffView === 'mias' ? <User className="w-4 h-4 flex-shrink-0" /> : <Users className="w-4 h-4 flex-shrink-0" />}
                        <span className="truncate">{timeOffView === 'mias' ? 'Mis solicitudes' : 'Equipo'}</span>
                      </span>
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-50">
                      <SelectItem value="mias">
                        <span className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>Mis solicitudes</span>
                        </span>
                      </SelectItem>
                      {canApproveTimeOff && (
                        <SelectItem value="equipo">
                          <span className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>Equipo</span>
                          </span>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </>

              {timeOffView === 'equipo' && canApproveTimeOff && visibleDeptTreeOptions.length > 1 && (
                <Select value={timeOffDeptFilter} onValueChange={(v) => setTimeOffDeptFilter(v as string | 'ALL')}>
                  <SelectTrigger className="h-10 px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors shrink-0 text-[#86868B] w-fit min-w-0">
                    <Building2 className="w-4 h-4 text-[#86868B] mr-1 flex-shrink-0" />
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-50">
                    <SelectItem value="ALL">Todos</SelectItem>
                    {visibleDeptTreeOptions.map((opt) => (
                      <SelectItem key={opt.code} value={opt.code}>
                        <span style={{ paddingLeft: `${opt.level * 12}px` }}>{opt.level > 0 ? '└─ ' : ''}{opt.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Filtro de estado: dropdown en móvil, botones en desktop */}
              {(() => {
                const effectiveView = canApproveTimeOff ? timeOffView : 'mias';
                const requests = effectiveView === 'mias' ? myTimeOffRequests : teamTimeOffRequests;
                const deptFilteredRequests = timeOffDeptFilter === 'ALL' ? requests : requests.filter((r) => r.department === timeOffDeptFilter);
                const filterButtons = [
                  { id: 'todas' as const, label: 'Todas' },
                  { id: 'pendiente' as const, label: 'Pendientes' },
                  { id: 'aprobada' as const, label: 'Aprobadas' },
                  { id: 'rechazada' as const, label: 'Rechazadas' },
                  { id: 'cancelada' as const, label: 'Canceladas' },
                ];
                return (
                  <>
                    <div className="md:hidden min-w-0">
                      <Select value={timeOffFilter} onValueChange={(v) => setTimeOffFilter(v as typeof timeOffFilter)}>
                        <SelectTrigger className="h-10 px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B] w-fit min-w-0">
                          <SelectValue>
                            {(() => {
                              const active = filterButtons.find((f) => f.id === timeOffFilter);
                              const count = deptFilteredRequests.filter((r) => timeOffFilter === 'todas' || r.status === timeOffFilter).length;
                              return (
                                <span className="flex items-center gap-2 text-[#86868B] truncate">
                                  <span className="truncate">{active?.label || 'Estado'}</span>
                                  {count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-corporate/10 text-corporate flex-shrink-0">{count}</span>}
                                </span>
                              );
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-50">
                          {filterButtons.map((f) => {
                            const count = deptFilteredRequests.filter((r) => f.id === 'todas' || r.status === f.id).length;
                            return (
                              <SelectItem key={f.id} value={f.id}>
                                <span className="flex items-center gap-2">
                                  <span>{f.label}</span>
                                  {count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-corporate/10 text-corporate">{count}</span>}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                      {filterButtons.map((f) => {
                        const count = deptFilteredRequests.filter((r) => f.id === 'todas' || r.status === f.id).length;
                        return (
                          <button
                            key={f.id}
                            onClick={() => setTimeOffFilter(f.id)}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                              timeOffFilter === f.id ? 'bg-corporate text-white' : 'bg-white text-[#86868B] hover:bg-[#F5F5F7] border border-[#E5E5E7]'
                            )}
                          >
                            {f.label}
                            {count > 0 && (
                              <span className={cn(
                                'px-1.5 py-0.5 text-xs rounded-full',
                                timeOffFilter === f.id ? 'bg-white/20' : 'bg-corporate/10 text-corporate'
                              )}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Contenido según pestaña activa */}

      {activeSubTab === 'mis-solicitudes' ? (
        <TimeOffRequestsPanel
          myRequests={myTimeOffRequests}
          teamRequests={teamTimeOffRequests}
          canApprove={canApproveTimeOff}
          users={users}
          onApprove={handleApproveTimeOff}
          onReject={handleRejectTimeOff}
          onEdit={handleEditTimeOff}
          onCancel={handleCancelTimeOff}
          onDelete={handleDeleteTimeOff}
          view={timeOffView}
          onViewChange={setTimeOffView}
          filter={timeOffFilter}
          onFilterChange={setTimeOffFilter}
          deptFilter={timeOffDeptFilter}
          onDeptFilterChange={setTimeOffDeptFilter}
        />
      ) : (
        <div className="space-y-4">
          {misCambiosFilter !== 'equipo' ? (
            <div className="space-y-3">
              {getFilteredMisCambios().length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="w-16 h-16 bg-[#F5F5F7] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="w-8 h-8 text-[#C7C7CC]" />
                </div>
                <p className="text-[#86868B]">No hay solicitudes {misCambiosFilter}</p>
              </div>
            ) : (
              getFilteredMisCambios().map((solicitud) => {
                // Determinar el nombre y cargo a mostrar según el filtro
                const displayName = misCambiosFilter === 'recibidas' ? solicitud.de : 
                                   misCambiosFilter === 'enviadas' ? solicitud.a : solicitud.de;
                const displayCargo = misCambiosFilter === 'recibidas' ? solicitud.deCargo : 
                                    misCambiosFilter === 'enviadas' ? solicitud.aCargo : solicitud.deCargo;
                const displayDept = misCambiosFilter === 'recibidas' ? solicitud.deDept : 
                                   misCambiosFilter === 'enviadas' ? solicitud.aDept : solicitud.deDept;
                
                return (
                  <div
                    key={solicitud.id}
                    className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow"
                  >
                    {/* Header: Avatar + Nombre + Cargo + Estado */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {(() => {
                          const displayUserId = misCambiosFilter === 'enviadas' ? solicitud.aId : solicitud.deId;
                          const displayUser = users.find((u) => u.id === displayUserId);
                          return (
                            <UserAvatar
                              name={displayName}
                              photoUrl={displayUser?.photoURL || displayUser?.avatar}
                              size="md"
                              fallbackClassName="bg-corporate text-sm"
                            />
                          );
                        })()}
                        <div>
                          <p className="text-sm font-medium text-[#1D1D1F]">{displayName}</p>
                          <p className="text-xs text-[#86868B]">{displayCargo || 'Voluntario'} • {displayDept || 'Dive Shop'}</p>
                        </div>
                      </div>
                      {getStatusBadge(solicitud.estado)}
                    </div>

                    {/* Quién envía y quién recibe */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="text-[#86868B]">De:</span>
                      <span className="font-medium text-[#1D1D1F]">{solicitud.deCargo || 'Usuario'}</span>
                      <span className="text-[#86868B]">—</span>
                      <span className="font-medium text-[#1D1D1F]">{solicitud.de}</span>
                      <ArrowRight className="w-4 h-4 text-[#C7C7CC]" />
                      <span className="text-[#86868B]">Para:</span>
                      <span className="font-medium text-[#1D1D1F]">{solicitud.aCargo || 'Usuario'}</span>
                      <span className="text-[#86868B]">—</span>
                      <span className="font-medium text-[#1D1D1F]">{solicitud.a}</span>
                    </div>

                    {/* Tipo de solicitud */}
                    <div className="mt-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5E7]">
                        {solicitud.tipo === 'cambio' ? 'Cambio de turno' : 'Intercambio'}
                      </span>
                    </div>
                    
                    {/* Fecha del cambio */}
                    <div className="mt-3 flex items-center gap-2 text-sm text-[#1D1D1F]">
                      <Calendar className="w-4 h-4 text-[#86868B]" />
                      <span className="text-[#86868B]">Fecha del cambio:</span>
                      <span className="font-medium">
                        {new Date(solicitud.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    
                    {/* Grid de turnos - ANTES vs DESPUÉS - AMBOS USUARIOS */}
                    {solicitud.tipo === 'cambio' ? (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Columna ANTES */}
                        <div className="bg-[#F5F5F7] rounded-lg p-3">
                          <p className="text-xs font-medium text-[#86868B] mb-2 uppercase tracking-wide">Antes del cambio</p>
                          <div className="space-y-2">
                            {/* Usuario que solicita (DE) */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[#86868B]">{solicitud.de.split(' ')[0]}:</span>
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                  {solicitud.deTurnoActual || solicitud.turnoActual || '-'}
                                </span>
                                <span className="text-xs text-[#86868B]">({solicitud.deHorarioActual || solicitud.horarioActual || '--:--'})</span>
                              </div>
                            </div>
                            {/* Usuario destinatario (A) */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[#86868B]">{solicitud.a.split(' ')[0]}:</span>
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                  {solicitud.aTurnoActual || '-'}
                                </span>
                                <span className="text-xs text-[#86868B]">({solicitud.aHorarioActual || '--:--'})</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Columna DESPUÉS */}
                        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                          <p className="text-xs font-medium text-green-600 mb-2 uppercase tracking-wide">Después del cambio</p>
                          <div className="space-y-2">
                            {/* Usuario que solicita (DE) */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[#86868B]">{solicitud.de.split(' ')[0]}:</span>
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                  {solicitud.deTurnoNuevo || solicitud.turnoSolicitado || '-'}
                                </span>
                                <span className="text-xs text-[#86868B]">({solicitud.deHorarioNuevo || solicitud.horarioSolicitado || '--:--'})</span>
                              </div>
                            </div>
                            {/* Usuario destinatario (A) */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[#86868B]">{solicitud.a.split(' ')[0]}:</span>
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                  {solicitud.aTurnoNuevo || '-'}
                                </span>
                                <span className="text-xs text-[#86868B]">({solicitud.aHorarioNuevo || '--:--'})</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : solicitud.tipo === 'intercambio' ? (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Columna ANTES */}
                        <div className="bg-[#F5F5F7] rounded-lg p-3">
                          <p className="text-xs font-medium text-[#86868B] mb-2 uppercase tracking-wide">Antes del cambio</p>
                          <div className="space-y-2">
                            {/* Usuario A */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[#86868B]">{solicitud.de.split(' ')[0]}:</span>
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                  {solicitud.deTurnoActual || 'AM'}
                                </span>
                                <span className="text-xs text-[#86868B]">({solicitud.deHorarioActual || '09:00-13:00'})</span>
                              </div>
                            </div>
                            {/* Usuario B */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[#86868B]">{solicitud.a.split(' ')[0]}:</span>
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                  {solicitud.aTurnoActual || 'PM'}
                                </span>
                                <span className="text-xs text-[#86868B]">({solicitud.aHorarioActual || '12:30-20:30'})</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Columna DESPUÉS */}
                        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                          <p className="text-xs font-medium text-green-600 mb-2 uppercase tracking-wide">Después del cambio</p>
                          <div className="space-y-2">
                            {/* Usuario A */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[#86868B]">{solicitud.de.split(' ')[0]}:</span>
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                  {solicitud.deTurnoNuevo || solicitud.aTurnoActual || 'PM'}
                                </span>
                                <span className="text-xs text-[#86868B]">({solicitud.deHorarioNuevo || solicitud.aHorarioActual || '12:30-20:30'})</span>
                              </div>
                            </div>
                            {/* Usuario B */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[#86868B]">{solicitud.a.split(' ')[0]}:</span>
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                  {solicitud.aTurnoNuevo || solicitud.deTurnoActual || 'AM'}
                                </span>
                                <span className="text-xs text-[#86868B]">({solicitud.aHorarioNuevo || solicitud.deHorarioActual || '09:00-13:00'})</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    
                    {/* Footer: Historial completo del cambio */}
                    <div className="mt-3 pt-2 border-t border-[#E5E5E7]">
                      <p className="text-xs font-medium text-[#86868B] mb-1.5">Historial:</p>
                      <div className="space-y-1">
                        {(solicitud.historial || []).map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <span className="text-[#86868B] whitespace-nowrap">
                              {new Date(item.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} {new Date(item.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[#1D1D1F]">- {item.accion}</span>
                            {item.motivo && (
                              <span className="text-[#86868B] italic">({item.motivo})</span>
                            )}
                          </div>
                        ))}
                        {/* Fallback si no hay historial */}
                        {(!solicitud.historial || solicitud.historial.length === 0) && (
                          <div className="flex items-center justify-between text-xs text-[#86868B]">
                            <span>Solicitado: {new Date(solicitud.fechaSolicitud).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} {new Date(solicitud.fechaSolicitud).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                            {solicitud.fechaRespuesta && (
                              <span>{solicitud.estado === 'aceptada' ? 'Aceptado:' : 'Rechazado:'} {new Date(solicitud.fechaRespuesta).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} {new Date(solicitud.fechaRespuesta).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Botones de acción para recibidas pendientes - MÁS CORTOS */}
                    {solicitud.estado === 'pendiente' && misCambiosFilter === 'recibidas' && (
                      <div className="mt-3 flex gap-2 justify-end">
                        <button
                          onClick={async () => { await handleAcceptSolicitud(solicitud); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          Aceptar
                        </button>
                        <button
                          onClick={async () => { await handleRejectSolicitud(solicitud); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-500 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
      ) : (
        <div className="space-y-4">
          {/* Lista de solicitudes del equipo */}
          <div className="space-y-3">
            {getFilteredEquipo().length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="w-16 h-16 bg-[#F5F5F7] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-[#C7C7CC]" />
                </div>
                <p className="text-[#86868B]">No hay solicitudes del equipo</p>
              </div>
            ) : (
              getFilteredEquipo().map((solicitud) => (
                <div
                  key={solicitud.id}
                  className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow"
                >
                  {/* Header: Avatar + Nombre + Cargo + Estado */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {(() => {
                        const displayUser = users.find((u) => u.id === solicitud.deId);
                        return (
                          <UserAvatar
                            name={solicitud.de}
                            photoUrl={displayUser?.photoURL || displayUser?.avatar}
                            size="md"
                            fallbackClassName="bg-corporate text-sm"
                          />
                        );
                      })()}
                      <div>
                        <p className="text-sm font-medium text-[#1D1D1F]">{solicitud.deCargo || 'Usuario'} — {solicitud.de}</p>
                        <p className="text-xs text-[#86868B]">{solicitud.deDept || 'Dive Shop'}</p>
                      </div>
                    </div>
                    {getStatusBadge(solicitud.estado)}
                  </div>
                  
                  {/* Tipo de solicitud */}
                  <div className="mt-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5E7]">
                      {solicitud.tipo === 'cambio' ? 'Cambio de turno' : 'Intercambio'}
                    </span>
                  </div>
                  
                  {/* Fecha del cambio */}
                  <div className="mt-3 flex items-center gap-2 text-sm text-[#1D1D1F]">
                    <Calendar className="w-4 h-4 text-[#86868B]" />
                    <span className="text-[#86868B]">Fecha del cambio:</span>
                    <span className="font-medium">
                      {new Date(solicitud.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  
                  {/* Grid de turnos - ANTES vs DESPUÉS - AMBOS USUARIOS */}
                  {solicitud.tipo === 'cambio' ? (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Columna ANTES */}
                      <div className="bg-[#F5F5F7] rounded-lg p-3">
                        <p className="text-xs font-medium text-[#86868B] mb-2 uppercase tracking-wide">Antes del cambio</p>
                        <div className="space-y-2">
                          {/* Usuario que solicita (DE) */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[#86868B] shrink-0">{solicitud.deCargo || 'Usuario'}: <span className="font-medium text-[#1D1D1F]">{solicitud.de}</span></span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                {solicitud.deTurnoActual || solicitud.turnoActual || '-'}
                              </span>
                              <span className="text-xs text-[#86868B]">({solicitud.deHorarioActual || solicitud.horarioActual || '--:--'})</span>
                            </div>
                          </div>
                          {/* Usuario destinatario (A) */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[#86868B] shrink-0">{solicitud.aCargo || 'Usuario'}: <span className="font-medium text-[#1D1D1F]">{solicitud.a}</span></span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                {solicitud.aTurnoActual || '-'}
                              </span>
                              <span className="text-xs text-[#86868B]">({solicitud.aHorarioActual || '--:--'})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Columna DESPUÉS */}
                      <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                        <p className="text-xs font-medium text-green-600 mb-2 uppercase tracking-wide">Después del cambio</p>
                        <div className="space-y-2">
                          {/* Usuario que solicita (DE) */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[#86868B] shrink-0">{solicitud.deCargo || 'Usuario'}: <span className="font-medium text-[#1D1D1F]">{solicitud.de}</span></span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                {solicitud.deTurnoNuevo || solicitud.turnoSolicitado || '-'}
                              </span>
                              <span className="text-xs text-[#86868B]">({solicitud.deHorarioNuevo || solicitud.horarioSolicitado || '--:--'})</span>
                            </div>
                          </div>
                          {/* Usuario destinatario (A) */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[#86868B] shrink-0">{solicitud.aCargo || 'Usuario'}: <span className="font-medium text-[#1D1D1F]">{solicitud.a}</span></span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                {solicitud.aTurnoNuevo || '-'}
                              </span>
                              <span className="text-xs text-[#86868B]">({solicitud.aHorarioNuevo || '--:--'})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : solicitud.tipo === 'intercambio' ? (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Columna ANTES */}
                      <div className="bg-[#F5F5F7] rounded-lg p-3">
                        <p className="text-xs font-medium text-[#86868B] mb-2 uppercase tracking-wide">Antes del cambio</p>
                        <div className="space-y-2">
                          {/* Usuario A */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[#86868B] shrink-0">{solicitud.deCargo || 'Usuario'}: <span className="font-medium text-[#1D1D1F]">{solicitud.de}</span></span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                {solicitud.deTurnoActual || 'AM'}
                              </span>
                              <span className="text-xs text-[#86868B]">({solicitud.deHorarioActual || '09:00-13:00'})</span>
                            </div>
                          </div>
                          {/* Usuario B */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[#86868B] shrink-0">{solicitud.aCargo || 'Usuario'}: <span className="font-medium text-[#1D1D1F]">{solicitud.a}</span></span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                {solicitud.aTurnoActual || 'PM'}
                              </span>
                              <span className="text-xs text-[#86868B]">({solicitud.aHorarioActual || '12:30-20:30'})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Columna DESPUÉS */}
                      <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                        <p className="text-xs font-medium text-green-600 mb-2 uppercase tracking-wide">Después del cambio</p>
                        <div className="space-y-2">
                          {/* Usuario A */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[#86868B] shrink-0">{solicitud.deCargo || 'Usuario'}: <span className="font-medium text-[#1D1D1F]">{solicitud.de}</span></span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                {solicitud.deTurnoNuevo || solicitud.aTurnoActual || 'PM'}
                              </span>
                              <span className="text-xs text-[#86868B]">({solicitud.deHorarioNuevo || solicitud.aHorarioActual || '12:30-20:30'})</span>
                            </div>
                          </div>
                          {/* Usuario B */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[#86868B] shrink-0">{solicitud.aCargo || 'Usuario'}: <span className="font-medium text-[#1D1D1F]">{solicitud.a}</span></span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                {solicitud.aTurnoNuevo || solicitud.deTurnoActual || 'AM'}
                              </span>
                              <span className="text-xs text-[#86868B]">({solicitud.aHorarioNuevo || solicitud.deHorarioActual || '09:00-13:00'})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  
                  {/* Footer: Historial completo del cambio */}
                  <div className="mt-3 pt-2 border-t border-[#E5E5E7]">
                    <p className="text-xs font-medium text-[#86868B] mb-1.5">Historial:</p>
                    <div className="space-y-1">
                      {(solicitud.historial || []).map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <span className="text-[#86868B] whitespace-nowrap">
                            {new Date(item.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} {new Date(item.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[#1D1D1F]">- {item.accion}</span>
                          {item.motivo && (
                            <span className="text-[#86868B] italic">({item.motivo})</span>
                          )}
                        </div>
                      ))}
                      {/* Fallback si no hay historial */}
                      {(!solicitud.historial || solicitud.historial.length === 0) && (
                        <div className="flex items-center justify-between text-xs text-[#86868B]">
                          <span>Solicitado: {new Date(solicitud.fechaSolicitud).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} {new Date(solicitud.fechaSolicitud).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                          {solicitud.fechaRespuesta && (
                            <span>{solicitud.estado === 'aceptada' ? 'Aceptado:' : 'Rechazado:'} {new Date(solicitud.fechaRespuesta).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} {new Date(solicitud.fechaRespuesta).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Botón Deshacer cambio - solo para solicitudes aceptadas y usuarios con permisos */}
                  {solicitud.estado === 'aceptada' && canUndoChanges && (
                    <div className="mt-3 flex justify-end">
                      <button 
                        onClick={() => {
                          setSelectedSolicitud(solicitud);
                          setShowUndoModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
                      >
                        <History className="w-4 h-4" />
                        Deshacer cambio
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )}
      
      {/* Modal para deshacer cambio */}
      <Dialog open={showUndoModal} onOpenChange={setShowUndoModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deshacer cambio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-[#86868B]">
              Estás a punto de deshacer el cambio de turno entre <strong>{selectedSolicitud?.de}</strong> y <strong>{selectedSolicitud?.a}</strong>.
            </p>
            <div>
              <label className="text-sm font-medium text-[#1D1D1F] mb-2 block">Motivo</label>
              <textarea
                value={undoReason}
                onChange={(e) => setUndoReason(e.target.value)}
                placeholder="Indica el motivo por el que deshaces este cambio..."
                className="w-full px-3 py-2 border border-[#E5E5E7] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-corporate/20"
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowUndoModal(false);
                setSelectedSolicitud(null);
                setUndoReason('');
              }}
              className="flex-1 px-4 py-2 bg-[#F5F5F7] text-[#86868B] rounded-lg text-sm font-medium hover:bg-[#E5E5E7] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={async () => { await handleUndoChange(); }}
              disabled={!undoReason.trim()}
              className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
