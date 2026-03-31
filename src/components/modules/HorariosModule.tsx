// ═══════════════════════════════════════════════════════════════════
// HORARIOS MODULE - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import {
  User,
  Users,
  CalendarDays,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Save,
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
  Activity,
  AlertTriangle,
  Stethoscope,
  FileText,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useShifts } from '@/hooks/useShifts';
import { useTasks } from '@/hooks/useTasks';
import { Department, Shift, ShiftAssignment, AssignmentStatus, Role } from '@/types';
import { DEPT_ICON_KEYS, DEPT_SHORT_NAMES, sortShiftsByTime } from '@/data/shifts';
import { users } from '@/data/users';
import {
  cn,
  formatWeekRange,
  addDays,
  addDaysToDate,
  format,
  getInitials,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

type TabType = 'mi-horario' | 'equipo' | 'asignar' | 'solicitudes';

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export default function HorariosModule() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('mi-horario');
  
  // Estado global de incapacidades compartido entre tabs
  const [incapacityDates, setIncapacityDates] = useState<{date: string, type: string}[]>([]);
  
  const addIncapacity = (dates: string[], type: string) => {
    setIncapacityDates(prev => [...prev, ...dates.map(d => ({ date: d, type }))]);
  };
  
  const getIncapacityForDate = (date: string) => {
    return incapacityDates.find(i => i.date === date);
  };

  return (
    <Layout title="Horarios" showDate={true}>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-[#1D1D1F]">Horarios</h2>
          <p className="text-sm text-[#86868B]">Gestiona turnos y horarios del equipo</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 w-fit">
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
        </div>

        {/* Content */}
        {activeTab === 'mi-horario' && <MiHorarioTab incapacityDates={incapacityDates} addIncapacity={addIncapacity} getIncapacityForDate={getIncapacityForDate} />}
        {activeTab === 'equipo' && <EquipoTab incapacityDates={incapacityDates} getIncapacityForDate={getIncapacityForDate} />}
        {activeTab === 'asignar' && <AsignarTab incapacityDates={incapacityDates} getIncapacityForDate={getIncapacityForDate} />}
        {activeTab === 'solicitudes' && <SolicitudesTab />}
      </div>
    </Layout>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MI HORARIO TAB
// ═══════════════════════════════════════════════════════════════════

interface MiHorarioTabProps {
  incapacityDates: {date: string, type: string}[];
  addIncapacity: (dates: string[], type: string) => void;
  getIncapacityForDate: (date: string) => {date: string, type: string} | undefined;
}

function MiHorarioTab({ incapacityDates, addIncapacity, getIncapacityForDate: _getIncapacityForDate }: MiHorarioTabProps) {
  const { user } = useAuth();
  const { getUserShifts, getUsersByDepartment } = useShifts();
  const { getTasksByUser } = useTasks();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [showIncapacityModal, setShowIncapacityModal] = useState(false);
  const [showFreeDaysModal, setShowFreeDaysModal] = useState(false);
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

  const today = new Date().toISOString().split('T')[0];
  const todayShifts = user ? getUserShifts(user.id, today) : [];
  
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

  // Función para generar días del mes
  const generateMonthDays = (year: number, month: number): Date[] => {
    const days: Date[] = [];
    const lastDay = new Date(year, month + 1, 0);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

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
                      {shift.department !== user?.department && (
                        <DeptIcon department={shift.department} className="w-3 h-3 text-amber-500" />
                      )}
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-[#86868B]">Sin turnos asignados</span>
                )}
              </div>

              {/* Lugar/Departamento */}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#86868B]" />
                <span className="text-sm text-[#86868B]">Ubicación:</span>
                <span className="text-sm font-medium text-[#1D1D1F]">{user?.department?.replace(/_/g, ' ')}</span>
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

        {/* Grid de días */}
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((date, index) => {
            const dateStr = date.toISOString().split('T')[0];
            const isToday = dateStr === today;
            const dayShifts = user ? getUserShifts(user.id, dateStr) : [];
            const hasShifts = dayShifts.length > 0;
            const isExpanded = expandedDate === dateStr;
            const incapacityInfo = incapacityDates.find(i => i.date === dateStr);
            const hasIncapacity = !!incapacityInfo;
            const dayTasks = user ? getTasksByUser(user.id).filter(t => t.dueDate === dateStr) : [];
            
            // Configuración de iconos y colores por tipo de incapacidad
            const incapacityConfig: Record<string, { icon: React.ElementType, color: string, bgColor: string }> = {
              enfermedad: { icon: Activity, color: 'text-red-500', bgColor: 'bg-red-100' },
              accidente: { icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-100' },
              cita_medica: { icon: Stethoscope, color: 'text-blue-500', bgColor: 'bg-blue-100' },
              otro: { icon: FileText, color: 'text-gray-500', bgColor: 'bg-gray-100' },
            };
            const incapacityStyle = incapacityInfo ? incapacityConfig[incapacityInfo.type] : null;
            const IncapacityIcon = incapacityStyle?.icon;

            return (
              <div key={index} className={cn("contents", isExpanded && "col-span-7")}>
                {/* Celda del día */}
                <div className="relative">
                  <button
                    onClick={() => setExpandedDate(isExpanded ? null : dateStr)}
                    className={cn(
                      'w-full h-[120px] rounded-xl p-2 flex flex-col items-center justify-start transition-all relative overflow-hidden',
                      isToday ? 'ring-2 ring-corporate bg-corporate/5' : 'hover:bg-[#F5F5F7]',
                      hasIncapacity && incapacityStyle?.bgColor.replace('100', '50')
                    )}
                  >
                    {/* Icono según tipo de incapacidad */}
                    {hasIncapacity && IncapacityIcon && (
                      <div className={cn("absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-md", incapacityStyle?.bgColor)}>
                        <IncapacityIcon className={cn("w-3 h-3", incapacityStyle?.color)} />
                      </div>
                    )}
                    <span className={cn(
                      'text-base font-semibold mb-1',
                      isToday ? 'text-corporate' : 'text-[#1D1D1F]',
                      hasIncapacity && incapacityStyle?.color
                    )}>
                      {date.getDate()}
                    </span>
                    {hasShifts && !hasIncapacity && (
                      <div className="flex flex-col gap-1 w-full">
                        {dayShifts.slice(0, 3).map((shift, i) => (
                          <div
                            key={i}
                            className="text-[9px] px-1.5 py-1 rounded-md truncate text-center font-medium leading-tight"
                            style={{ backgroundColor: `${shift.color}20`, color: shift.color }}
                          >
                            <span className="font-bold">{shift.name}</span>
                            <span className="opacity-80 ml-0.5">{shift.startTime}</span>
                            <span className="opacity-60 ml-0.5">· {DEPT_SHORT_NAMES[shift.department]}</span>
                          </div>
                        ))}
                        {dayShifts.length > 3 && (
                          <span className="text-[9px] text-[#86868B] text-center font-medium">+{dayShifts.length - 3}</span>
                        )}
                      </div>
                    )}
                    {hasIncapacity && incapacityInfo && (
                      <div className={cn("mt-1 text-[10px] font-semibold", incapacityStyle?.color)}>
                        {incapacityInfo.type === 'enfermedad' && 'Enfermedad'}
                        {incapacityInfo.type === 'accidente' && 'Accidente'}
                        {incapacityInfo.type === 'cita_medica' && 'Cita médica'}
                        {incapacityInfo.type === 'otro' && 'Otro'}
                      </div>
                    )}
                  </button>
                </div>

                {/* Expansión del día - DEBAJO del día presionado */}
                {isExpanded && (
                  <div className="col-span-7 mt-2 mb-3 p-4 bg-[#F5F5F7] rounded-xl">
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
                                <span className="text-xs text-[#86868B]">{shift.startTime} - {shift.endTime}</span>
                                <div className="flex items-center gap-1 ml-auto px-1.5 py-0.5 bg-[#F5F5F7] rounded">
                                  <DeptIcon department={shift.department} className="w-3 h-3 text-[#86868B]" />
                                  <span className="text-[10px] text-[#86868B]">{shift.department.replace(/_/g, ' ')}</span>
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
                    {generateMonthDays(incapacityCalendarMonth.getFullYear(), incapacityCalendarMonth.getMonth()).map((d, i) => {
                      const dStr = d.toISOString().split('T')[0];
                      const isSelected = incapacityStartDate && incapacityEndDate && dStr >= incapacityStartDate && dStr <= incapacityEndDate;
                      const isStart = dStr === incapacityStartDate;
                      const isEnd = dStr === incapacityEndDate;
                      
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (!incapacityStartDate || (incapacityStartDate && incapacityEndDate)) {
                              setIncapacityStartDate(dStr);
                              setIncapacityEndDate('');
                            } else if (dStr < incapacityStartDate) {
                              setIncapacityStartDate(dStr);
                            } else {
                              setIncapacityEndDate(dStr);
                            }
                          }}
                          className={cn(
                            'w-7 h-7 text-xs rounded-lg transition-colors',
                            isStart || isEnd ? 'bg-corporate text-white' : 
                            isSelected ? 'bg-corporate/20 text-corporate' : 
                            'hover:bg-white text-[#1D1D1F]'
                          )}
                        >
                          {d.getDate()}
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
                      {incapacityStartDate ? new Date(incapacityStartDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '...'}
                    </span>
                    {' '}<span className="text-[#86868B]">hasta:</span>{' '}
                    <span className="font-medium text-corporate">
                      {incapacityEndDate ? new Date(incapacityEndDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '...'}
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
                    id: 'otro', 
                    label: 'Otro', 
                    Icon: FileText,
                    color: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100' 
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
                disabled={!incapacityStartDate || !incapacityEndDate || !incapacityType}
                onClick={() => {
                  const start = new Date(incapacityStartDate);
                  const end = new Date(incapacityEndDate);
                  const newDates: string[] = [];
                  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    newDates.push(d.toISOString().split('T')[0]);
                  }
                  addIncapacity(newDates, incapacityType);
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
      <Dialog open={showFreeDaysModal} onOpenChange={setShowFreeDaysModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Días Libres</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                Estás solicitando días libres para el mes siguiente. 
                Las solicitudes se procesarán según disponibilidad.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-[#1D1D1F] mb-1 block">Mes solicitado</label>
              <div className="px-3 py-2 bg-[#F5F5F7] rounded-lg text-sm text-[#86868B]">
                {new Date(new Date().getFullYear(), new Date().getMonth() + 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#1D1D1F] mb-1 block">Fecha de inicio</label>
              <input type="date" className="w-full px-3 py-2 border border-[#E5E5E7] rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1D1D1F] mb-1 block">Fecha de fin</label>
              <input type="date" className="w-full px-3 py-2 border border-[#E5E5E7] rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1D1D1F] mb-1 block">Motivo (opcional)</label>
              <textarea 
                className="w-full px-3 py-2 border border-[#E5E5E7] rounded-lg text-sm min-h-[60px] resize-none"
                placeholder="Indica el motivo de tu solicitud..."
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowFreeDaysModal(false)}>
                Cancelar
              </Button>
              <Button 
                className="flex-1 bg-corporate hover:bg-corporate/90"
                onClick={() => {
                  setShowFreeDaysModal(false);
                  alert('Solicitud enviada correctamente');
                }}
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
            const dayShifts = user ? getUserShifts(user.id, expandedDate) : [];
            
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
                            <span className="opacity-50">· {DEPT_SHORT_NAMES[shift.department]}</span>
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
                          const availableShifts = Object.values(Department)
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
                      const targetShift = Object.values(Department)
                        .flatMap(dept => getUsersByDepartment(dept))
                        .flatMap(u => getUserShifts(u.id, expandedDate))
                        .find(s => s.id === selectedTargetShift);
                      
                      if (!targetShift) return null;
                      
                      // Usuarios que tienen este turno ese día
                      const availableUsers = Object.values(Department)
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
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback className="bg-corporate text-white text-sm">
                                    {getInitials(u.name)}
                                  </AvatarFallback>
                                </Avatar>
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
                          
                          const swapUsers = Object.values(Department)
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
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback className="bg-corporate text-white text-sm">
                                    {getInitials(u.name)}
                                  </AvatarFallback>
                                </Avatar>
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
                      const swapUser = Object.values(Department)
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
                      setShowChangeShiftModal(false);
                      setSelectedShiftForChange(null);
                      setSelectedTargetShift(null);
                      setSelectedSwapUser(null);
                      setChangeReason('');
                      alert('Solicitud enviada correctamente');
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
  incapacityDates: {date: string, type: string}[];
  getIncapacityForDate: (date: string) => {date: string, type: string} | undefined;
}

function EquipoTab({ incapacityDates: _incapacityDates, getIncapacityForDate: _getIncapacityForDate }: EquipoTabProps) {
  const { user } = useAuth();
  const { getUsersByDepartment, getWeekAssignments, getShiftById, getUserShifts } = useShifts();
  const { getTasksByUser } = useTasks();
  const [selectedDepartment, setSelectedDepartment] = useState<Department | 'ALL'>(user?.department || Department.DIVE_SHOP);
  const [weekOffset, setWeekOffset] = useState(0);
  
  // Modales
  const [selectedUser, setSelectedUser] = useState<typeof users[0] | null>(null);
  const [selectedDayInfo, setSelectedDayInfo] = useState<{user: typeof users[0], date: Date} | null>(null);
  const [expandedDayInCalendar, setExpandedDayInCalendar] = useState<Date | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showHeaderDayModal, setShowHeaderDayModal] = useState(false);
  const [selectedHeaderDay, setSelectedHeaderDay] = useState<Date | null>(null);
  const [userCalendarMonth, setUserCalendarMonth] = useState(new Date());

  const weekStart = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7); // Lunes
    return start;
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Obtener usuarios según selección
  const deptUsers = useMemo(() => {
    if (selectedDepartment === 'ALL') {
      return users.filter(u => u.isActive);
    }
    return getUsersByDepartment(selectedDepartment);
  }, [getUsersByDepartment, selectedDepartment]);
  
  // Obtener asignaciones
  const assignments = useMemo(() => {
    if (selectedDepartment === 'ALL') {
      const allAssignments: ShiftAssignment[] = [];
      Object.values(Department).forEach(dept => {
        allAssignments.push(...getWeekAssignments(dept, weekStart));
      });
      return allAssignments;
    }
    return getWeekAssignments(selectedDepartment, weekStart);
  }, [getWeekAssignments, selectedDepartment, weekStart]);

  const getUserShiftsForDay = (userId: string, date: Date): Shift[] => {
    const dateStr = date.toISOString().split('T')[0];
    const dayAssignments = assignments.filter(
      a => a.userId === userId && a.date === dateStr && a.status !== AssignmentStatus.ELIMINADO
    );
    return dayAssignments
      .map(a => getShiftById(a.shiftId))
      .filter((s): s is Shift => s !== undefined)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const departments = Object.values(Department);
  
  const canViewAllDepartments = user?.role === Role.DIRECTOR_GENERAL || 
                                user?.role === Role.DIRECTOR || 
                                user?.role === Role.GERENTE_OPERACIONES;

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Select value={selectedDepartment} onValueChange={(v) => setSelectedDepartment(v as Department | 'ALL')}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue>
              {selectedDepartment === 'ALL' ? (
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  <span>Todos los departamentos</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <DeptIcon department={selectedDepartment} className="w-4 h-4" />
                  <span>{selectedDepartment.replace(/_/g, ' ')}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {canViewAllDepartments && (
              <SelectItem value="ALL">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  <span>Todos los departamentos</span>
                </div>
              </SelectItem>
            )}
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>
                <div className="flex items-center gap-2">
                  <DeptIcon department={dept} className="w-4 h-4" />
                  <span>{dept.replace(/_/g, ' ')}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center justify-between sm:justify-end gap-4">
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

          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-2 text-[#1D1D1F]">
              <Users className="w-4 h-4" />
              <span className="font-medium">Turnos de equipo</span>
            </div>
            <p className="text-xs text-[#86868B]">{formatWeekRange(weekStart, addDays(weekStart, 6))}</p>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E5E7]">
                <th className="text-left p-4 text-sm font-medium text-[#86868B] w-48">Usuario</th>
                {weekDays.map((day, i) => (
                  <th key={i} className="text-center p-2 text-sm font-medium text-[#86868B] min-w-[100px]">
                    <button
                      onClick={() => {
                        setSelectedHeaderDay(day);
                        setShowHeaderDayModal(true);
                      }}
                      className="w-full py-2 rounded-lg hover:bg-[#F5F5F7] transition-colors"
                    >
                      <div>{['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'][i]}</div>
                      <div className="text-xs text-[#C7C7CC]">{day.getDate()}</div>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deptUsers.map((u) => (
                <tr key={u.id} className="border-b border-[#E5E5E7] last:border-0">
                  <td className="p-4">
                    <button 
                      onClick={() => handleUserClick(u)}
                      className="flex items-center gap-3 w-full text-left hover:bg-[#F5F5F7] rounded-lg p-1 -m-1 transition-colors"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-corporate text-white text-xs">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-[#1D1D1F]">{u.name}</p>
                        <p className="text-xs text-[#86868B]">{u.position}</p>
                      </div>
                    </button>
                  </td>
                  {weekDays.map((day, i) => {
                    const dayShifts = getUserShiftsForDay(u.id, day);
                    return (
                      <td key={i} className="p-2 text-center">
                        <button
                          onClick={() => handleDayClick(u, day)}
                          className="w-full"
                        >
                          {dayShifts.length > 0 ? (
                            <div className="space-y-1">
                              {dayShifts.map((shift, idx) => {
                                const isCrossDept = shift.department !== u.department;
                                return (
                                  <div
                                    key={idx}
                                    className={cn(
                                      'px-2 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105',
                                      isCrossDept && 'ring-1 ring-amber-400'
                                    )}
                                    style={{
                                      backgroundColor: `${shift.color}20`,
                                      color: shift.color,
                                    }}
                                    title={`${shift.name} (${shift.startTime} - ${shift.endTime})${isCrossDept ? ' - ' + shift.department.replace(/_/g, ' ') : ''}`}
                                  >
                                    <div className="flex items-center justify-center gap-1">
                                      {shift.name}
                                      {isCrossDept && (
                                        <DeptIcon department={shift.department} className="w-3 h-3" />
                                      )}
                                    </div>
                                    <div className="text-[9px] opacity-70">
                                      {shift.startTime}-{shift.endTime}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-[#C7C7CC] hover:bg-[#F5F5F7] rounded-lg px-3 py-2 block transition-colors">-</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de información del usuario */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Información del colaborador</span>
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* Info principal */}
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-corporate text-white text-xl">
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
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
                const todayStr = new Date().toISOString().split('T')[0];
                const todayShifts = getUserShifts(selectedUser.id, todayStr);
                
                for (let d = 1; d <= daysInMonth; d++) {
                  const date = new Date(year, month, d);
                  const dateStr = date.toISOString().split('T')[0];
                  const dayShifts = getUserShifts(selectedUser.id, dateStr);
                  if (dayShifts.length > 0) {
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
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-green-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-green-600">{workingDays}</p>
                        <p className="text-xs text-green-700">Días trabajados</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600">{freeDays}</p>
                        <p className="text-xs text-blue-700">Días libres</p>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-purple-600">{totalShifts}</p>
                        <p className="text-xs text-purple-700">Total turnos</p>
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
                      const dateStr = date.toISOString().split('T')[0];
                      const dayShifts = getUserShifts(selectedUser.id, dateStr);
                      const hasShifts = dayShifts.length > 0;
                      const dayTasks = getTasksByUser(selectedUser.id).filter(t => t.dueDate === dateStr);
                      const hasTasks = dayTasks.length > 0;
                      const isExpanded = expandedDayInCalendar?.toISOString().split('T')[0] === dateStr;
                      const isToday = dateStr === new Date().toISOString().split('T')[0];
                      
                      return (
                        <div key={index} className="relative">
                          <button
                            onClick={() => setExpandedDayInCalendar(isExpanded ? null : date)}
                            className={cn(
                              'w-full aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all',
                              isToday ? 'ring-2 ring-corporate bg-corporate/10' : 'hover:bg-white',
                              hasShifts && 'font-medium'
                            )}
                            style={hasShifts ? { color: dayShifts[0]?.color } : {}}
                          >
                            <span className={isToday ? 'text-corporate font-bold' : ''}>{date.getDate()}</span>
                            {(hasShifts || hasTasks) && (
                              <div className="flex gap-0.5 mt-0.5">
                                {hasShifts && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dayShifts[0]?.color }} />}
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
                      
                      return (
                        <div className="space-y-3">
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDayInfo && (
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-corporate text-white text-sm">
                      {getInitials(selectedDayInfo.user.name)}
                    </AvatarFallback>
                  </Avatar>
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
              {/* Turnos del día */}
              <div>
                <h4 className="text-sm font-medium text-[#1D1D1F] mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-corporate" />
                  Turnos asignados
                </h4>
                {(() => {
                  const dateStr = selectedDayInfo.date.toISOString().split('T')[0];
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
                  const dateStr = selectedDayInfo.date.toISOString().split('T')[0];
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de día del header - Información del departamento */}
      <Dialog open={showHeaderDayModal} onOpenChange={setShowHeaderDayModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                const dateStr = selectedHeaderDay.toISOString().split('T')[0];
                
                // Obtener usuarios según el departamento seleccionado
                const relevantUsers = selectedDepartment === 'ALL' 
                  ? users.filter(u => u.isActive)
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
                
                // Encontrar responsables (gerente/supervisor) con turno ese día
                const managersOnDuty = usersWithShifts.filter(uws => 
                  (uws.user.role === Role.GERENTE_DEPARTAMENTO || uws.user.role === Role.SUPERVISOR) &&
                  uws.shifts.length > 0
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
                        <div className="grid grid-cols-4 gap-3">
                          <div className="bg-white rounded-lg p-3 text-center">
                            <p className="text-xl font-bold text-[#1D1D1F]">{totalTasks}</p>
                            <p className="text-[10px] text-[#86868B]">Total</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3 text-center">
                            <p className="text-xl font-bold text-green-600">{tasksCompleted}</p>
                            <p className="text-[10px] text-green-700">Realizados</p>
                          </div>
                          <div className="bg-amber-50 rounded-lg p-3 text-center">
                            <p className="text-xl font-bold text-amber-600">{tasksPending}</p>
                            <p className="text-[10px] text-amber-700">Pendientes</p>
                          </div>
                          <div className="bg-red-50 rounded-lg p-3 text-center">
                            <p className="text-xl font-bold text-red-600">{tasksOverdue}</p>
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
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="bg-corporate text-white text-[10px]">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
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
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-purple-500 text-white text-xs">
                                    {getInitials(user.name)}
                                  </AvatarFallback>
                                </Avatar>
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
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="bg-blue-500 text-white text-[10px]">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
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
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="bg-[#C7C7CC] text-white text-[10px]">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-[#86868B]">{user.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Usuarios enfermos/faltantes - Placeholder */}
                    <div className="opacity-50">
                      <h4 className="text-sm font-medium text-[#1D1D1F] mb-3 flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center">
                          <span className="text-[10px] text-red-500">!</span>
                        </span>
                        Enfermos / Faltantes (0)
                      </h4>
                      <p className="text-xs text-[#86868B] bg-[#F5F5F7] rounded-lg p-3">
                        No hay registros de ausencias para este día
                      </p>
                    </div>
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
  incapacityDates: {date: string, type: string}[];
  getIncapacityForDate: (date: string) => {date: string, type: string} | undefined;
}

function AsignarTab({ incapacityDates: _incapacityDates, getIncapacityForDate: _getIncapacityForDate }: AsignarTabProps) {
  const { user } = useAuth();
  const { 
    shifts, 
    getShiftsByDepartment, 
    getUsersByDepartment, 
    assignShift, 
    getWeekAssignments,
    publishAssignments,
    getBorradorCount,
    removeShift,
  } = useShifts();
  // Permitir 'ALL' para ver todos los departamentos (según permisos)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | 'ALL'>(user?.department || Department.DIVE_SHOP);
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

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

  // Ordenar turnos cronológicamente
  const availableShifts = useMemo(() => {
    if (selectedDepartment === 'ALL') {
      // Mostrar todos los turnos de todos los departamentos
      return sortShiftsByTime(shifts.filter(s => s.name !== 'Libre'));
    }
    return sortShiftsByTime(getShiftsByDepartment(selectedDepartment));
  }, [getShiftsByDepartment, selectedDepartment, shifts]);
  
  // Obtener usuarios del departamento seleccionado (o todos si es 'ALL')
  const deptUsers = useMemo(() => {
    if (selectedDepartment === 'ALL') {
      // Cuando es 'ALL', mostrar todos los usuarios activos
      return users.filter(u => u.isActive);
    }
    return getUsersByDepartment(selectedDepartment);
  }, [getUsersByDepartment, selectedDepartment]);
  
  // Verificar si el usuario tiene permisos para ver usuarios de otros departamentos
  const canViewCrossDepartment = user?.role === Role.DIRECTOR_GENERAL || 
                                  user?.role === Role.GERENTE_OPERACIONES ||
                                  user?.role === Role.DIRECTOR;
  
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
  
  // Obtener asignaciones (de todos los departamentos si es 'ALL')
  const assignments = useMemo(() => {
    if (selectedDepartment === 'ALL') {
      // En modo ALL, obtener todas las asignaciones de la semana
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDaysToDate(weekStart, i);
        weekDates.push(format(date, 'yyyy-MM-dd'));
      }
      return weekDates.flatMap(date => 
        Object.values(Department).flatMap(dept => 
          getWeekAssignments(dept, weekStart).filter(a => a.date === date)
        )
      );
    }
    return getWeekAssignments(selectedDepartment, weekStart);
  }, [getWeekAssignments, selectedDepartment, weekStart]);

  const getUserAssignmentsForDay = (userId: string, date: Date): ShiftAssignment[] => {
    const dateStr = date.toISOString().split('T')[0];
    // No mostrar las asignaciones marcadas como ELIMINADO
    const userAssignments = assignments.filter(a => a.userId === userId && a.date === dateStr && a.status !== AssignmentStatus.ELIMINADO);
    // Ordenar cronológicamente por hora de inicio del turno
    return userAssignments.sort((a, b) => {
      const shiftA = shifts.find(s => s.id === a.shiftId);
      const shiftB = shifts.find(s => s.id === b.shiftId);
      if (!shiftA || !shiftB) return 0;
      return shiftA.startTime.localeCompare(shiftB.startTime);
    });
  };
  

  
  // Contar eliminaciones pendientes
  const getPendingDeletionsCount = (dept: Department | 'ALL', weekStart: Date): number => {
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDaysToDate(weekStart, i);
      weekDates.push(format(date, 'yyyy-MM-dd'));
    }
    
    if (dept === 'ALL') {
      // En modo ALL, contar todas las eliminaciones de la semana
      return assignments.filter(
        a => weekDates.includes(a.date) && 
             a.status === AssignmentStatus.ELIMINADO
      ).length;
    }
    
    const deptUserIds = users
      .filter(u => u.department === dept && u.isActive)
      .map(u => u.id);
    
    return assignments.filter(
      a => weekDates.includes(a.date) && 
           deptUserIds.includes(a.userId) && 
           a.status === AssignmentStatus.ELIMINADO
    ).length;
  };
  
  const pendingDeletions = getPendingDeletionsCount(selectedDepartment, weekStart);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const shiftId = active.id as string;
    const dropData = over.id as string;
    const [userId, dateStr] = dropData.split('|');

    if (userId && dateStr && user) {
      assignShift(userId, shiftId, dateStr, user.id);
    }
  };

  const departments = Object.values(Department);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => setActiveDragId(active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Turnos disponibles - Sidebar sticky en desktop, apilado en móvil */}
        <div className="lg:sticky lg:top-4 w-full lg:w-72 flex-shrink-0 bg-white rounded-2xl p-4 lg:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h3 className="font-medium text-[#1D1D1F] text-sm">Turnos disponibles</h3>
          </div>
          
          <div className="mb-3 lg:mb-4">
            <Select value={selectedDepartment} onValueChange={(v) => setSelectedDepartment(v as Department | 'ALL')}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {selectedDepartment === 'ALL' ? (
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" />
                      <span className="truncate">Todos los departamentos</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <DeptIcon department={selectedDepartment} className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{selectedDepartment.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {/* Opción Todos los departamentos - solo para usuarios con permisos */}
                {(user?.role === Role.DIRECTOR_GENERAL || 
                  user?.role === Role.DIRECTOR || 
                  user?.role === Role.GERENTE_OPERACIONES) && (
                  <SelectItem value="ALL">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" />
                      <span>Todos los departamentos</span>
                    </div>
                  </SelectItem>
                )}
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>
                    <div className="flex items-center gap-2">
                      <DeptIcon department={dept} className="w-4 h-4" />
                      <span>{dept.replace(/_/g, ' ')}</span>
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
        <div className="flex-1 w-full bg-white rounded-2xl p-4 lg:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {/* Header */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-4">
            <div>
              <h3 className="font-medium text-[#1D1D1F]">Asignación de turnos</h3>
              <p className="text-xs text-[#86868B]">{formatWeekRange(weekStart, addDays(weekStart, 6))}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-[#86868B]">
                <Users className="w-4 h-4" />
                <span>{allVisibleUsers.length} colaboradores</span>
                {crossDeptUsers.length > 0 && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                    +{crossDeptUsers.length} de otros deptos
                  </span>
                )}
              </div>

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

              <div className="flex items-center gap-2">
                {(getBorradorCount(selectedDepartment, weekStart) > 0 || pendingDeletions > 0) && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    {getBorradorCount(selectedDepartment, weekStart)} cambios sin publicar
                    {pendingDeletions > 0 && ` (${pendingDeletions} eliminaciones)`}
                  </span>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  disabled={getBorradorCount(selectedDepartment, weekStart) === 0 && pendingDeletions === 0}
                  onClick={() => {
                    // Simular guardado (en una app real, aquí se guardaría en backend)
                    setShowSaveSuccess(true);
                    setTimeout(() => setShowSaveSuccess(false), 2000);
                  }}
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Guardar borrador</span>
                  <span className="sm:hidden">Guardar</span>
                </Button>
                <Button 
                  size="sm" 
                  className="gap-2 bg-corporate hover:bg-corporate/90"
                  onClick={() => setShowPublishConfirm(true)}
                  disabled={getBorradorCount(selectedDepartment, weekStart) === 0 && pendingDeletions === 0}
                >
                  <Send className="w-4 h-4" />
                  Publicar
                </Button>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E5E7]">
                  <th className="text-left p-4 text-sm font-medium text-[#86868B] w-48">Colaborador</th>
                  {weekDays.map((day, i) => (
                    <th key={i} className="text-center p-4 text-sm font-medium text-[#86868B] min-w-[100px]">
                      <div>{['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'][i]}</div>
                      <div className="text-xs text-[#C7C7CC]">{day.getDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allVisibleUsers.map((u) => {
                  const isCrossDept = selectedDepartment !== 'ALL' && u.department !== selectedDepartment;
                  return (
                  <tr key={u.id} className={cn(
                    "border-b border-[#E5E5E7] last:border-0",
                    isCrossDept && "bg-amber-50/50"
                  )}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className={cn("w-8 h-8", isCrossDept && "ring-2 ring-amber-400")}>
                          <AvatarFallback className={cn(
                            "text-white text-xs",
                            isCrossDept ? "bg-amber-500" : "bg-corporate"
                          )}>
                            {getInitials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-[#1D1D1F]">{u.name}</p>
                            {/* Icono de departamento para usuarios de otros deptos */}
                            {isCrossDept && (
                              <div 
                                className="p-0.5 rounded bg-amber-100" 
                                title={u.department.replace(/_/g, ' ')}
                              >
                                <DeptIcon department={u.department} className="w-3.5 h-3.5 text-amber-600" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-[#86868B]">{u.position}</p>
                          {isCrossDept && (
                            <p className="text-[10px] text-amber-600 font-medium">
                              {DEPT_SHORT_NAMES[u.department]}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {weekDays.map((day, i) => {
                      const dayAssignments = getUserAssignmentsForDay(u.id, day);
                      const dropId = `${u.id}|${day.toISOString().split('T')[0]}`;
                      return (
                        <td key={i} className="p-2">
                          <DroppableCell id={dropId}>
                            <div className="space-y-1">
                              {dayAssignments.map((assignment, idx) => {
                                const shift = shifts.find(s => s.id === assignment.shiftId);
                                // Verificar si el turno es de otro departamento
                                const isCrossDepartment = shift && shift.department !== selectedDepartment && selectedDepartment !== 'ALL';
                                
                                return shift ? (
                                  <div
                                    key={idx}
                                    onDoubleClick={() => removeShift(assignment.id)}
                                    className={cn(
                                      'px-2 py-1 rounded-lg text-xs font-medium text-center relative cursor-pointer select-none transition-all hover:scale-105'
                                    )}
                                    style={{
                                      backgroundColor: assignment.status === AssignmentStatus.BORRADOR 
                                        ? `${shift.color}20` // 20 = 12% opacidad en hex
                                        : `${shift.color}30`, // 30 = 18% opacidad
                                      color: shift.color,
                                      border: assignment.status === AssignmentStatus.BORRADOR 
                                        ? `2px dashed ${shift.color}` 
                                        : 'none',
                                      opacity: assignment.status === AssignmentStatus.BORRADOR ? 0.7 : 1,
                                    }}
                                    title={`${shift.name} (${shift.startTime}-${shift.endTime}) - ${shift.department.replace(/_/g, ' ')} - ${assignment.status === AssignmentStatus.BORRADOR ? 'BORRADOR' : 'PUBLICADO'} - Doble click para eliminar`}
                                  >
                                    <div className="flex items-center justify-center gap-1">
                                      {shift.name}
                                      {/* Mostrar icono de departamento si es de otro departamento o modo ALL */}
                                      {(isCrossDepartment || selectedDepartment === 'ALL') && (
                                        <div 
                                          className="p-0.5 rounded bg-white/70"
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
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </DroppableCell>
                        </td>
                      );
                    })}
                  </tr>
                );})}
              </tbody>
            </table>
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

      {/* Modal de confirmación de guardado */}
      {showSaveSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSaveSuccess(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">¡Guardado!</h3>
            <p className="text-sm text-slate-600">
              Los cambios han sido guardados correctamente.
            </p>
          </div>
        </div>
      )}

      {/* Modal de confirmación para publicar */}
      {showPublishConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Publicar cambios</h3>
            <p className="text-sm text-slate-600 mb-4">
              Estás a punto de publicar los siguientes cambios:
            </p>
            
            <div className="space-y-2 mb-4">
              {getBorradorCount(selectedDepartment, weekStart) > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                  <span>{getBorradorCount(selectedDepartment, weekStart)} asignación(es) nueva(s)</span>
                </div>
              )}
              {pendingDeletions > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  <span>{pendingDeletions} asignación(es) serán eliminada(s)</span>
                </div>
              )}
            </div>
            
            <p className="text-sm text-slate-500 mb-4">
              Una vez publicados, estos cambios serán oficiales y visibles para todo el equipo.
            </p>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPublishConfirm(false)}>
                Cancelar
              </Button>
              <Button 
                className="bg-corporate hover:bg-corporate/90"
                onClick={() => {
                  if (user) {
                    publishAssignments(selectedDepartment, weekStart, user.id);
                    setShowPublishConfirm(false);
                  }
                }}
              >
                Confirmar publicación
              </Button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE DE ICONO DE DEPARTAMENTO
// ═══════════════════════════════════════════════════════════════════

function DeptIcon({ department, className = 'w-4 h-4' }: { department: Department; className?: string }) {
  const iconProps = { className };
  
  switch (DEPT_ICON_KEYS[department]) {
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

function DroppableCell({ id, children }: { id: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[40px] rounded-lg transition-all',
        isOver && 'bg-corporate/10 ring-2 ring-corporate/30'
      )}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SOLICITUDES TAB
// ═══════════════════════════════════════════════════════════════════

function SolicitudesTab() {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
      <div className="w-16 h-16 bg-[#F5F5F7] rounded-2xl flex items-center justify-center mx-auto mb-4">
        <ClipboardList className="w-8 h-8 text-[#C7C7CC]" />
      </div>
      <h3 className="text-lg font-medium text-[#1D1D1F] mb-2">Solicitudes</h3>
      <p className="text-[#86868B]">No hay solicitudes de cambio de turno</p>
    </div>
  );
}
