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
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useShifts } from '@/hooks/useShifts';
import { useTasks } from '@/hooks/useTasks';
import { Department, Shift, ShiftAssignment } from '@/types';
import {
  cn,
  formatWeekRange,
  addDays,
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
        {activeTab === 'mi-horario' && <MiHorarioTab />}
        {activeTab === 'equipo' && <EquipoTab />}
        {activeTab === 'asignar' && <AsignarTab />}
        {activeTab === 'solicitudes' && <SolicitudesTab />}
      </div>
    </Layout>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MI HORARIO TAB
// ═══════════════════════════════════════════════════════════════════

function MiHorarioTab() {
  const { user } = useAuth();
  const { getUserShifts } = useShifts();
  const { getTasksByUser } = useTasks();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const todayShifts = user ? getUserShifts(user.id, today) : [];
  const todayTasks = user ? getTasksByUser(user.id).filter(t => t.dueDate === today) : [];

  // Generar días del mes
  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
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

        <div className="space-y-3">
          {todayShifts.length > 0 ? (
            todayShifts.map((shift, i) => (
              <div key={i} className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#86868B]" />
                <span className="text-[#1D1D1F]">
                  Turno asignado: <span className="font-medium">{shift.name}</span> ({shift.startTime} - {shift.endTime})
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 text-[#86868B]">
              <Clock className="w-4 h-4" />
              <span>Sin turno asignado</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#86868B]" />
            <span className="text-[#1D1D1F]">
              Departamento: <span className="font-medium">{user?.department?.replace(/_/g, ' ')}</span>
            </span>
          </div>

          {/* Tasks de hoy */}
          {todayTasks.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#E5E5E7]">
              <h4 className="text-sm font-medium text-[#1D1D1F] mb-2">Tasks de hoy:</h4>
              <ul className="space-y-1">
                {todayTasks.slice(0, 3).map(task => (
                  <li key={task.id} className="text-sm text-[#86868B] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-corporate" />
                    {task.title}
                  </li>
                ))}
                {todayTasks.length > 3 && (
                  <li className="text-sm text-corporate">+{todayTasks.length - 3} más...</li>
                )}
              </ul>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-[#E5E5E7]">
            <Button variant="outline" size="sm" className="rounded-lg">
              Cambiar con compañero
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg">
              Solicitar persona libre
            </Button>
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        {/* Header del calendario */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#1D1D1F]">
            {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="w-8 h-8 rounded-lg hover:bg-[#F5F5F7] flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-corporate hover:bg-corporate/5 rounded-lg transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="w-8 h-8 rounded-lg hover:bg-[#F5F5F7] flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs text-[#86868B] py-2">
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

            return (
              <div key={index}>
                <button
                  onClick={() => setExpandedDate(isExpanded ? null : dateStr)}
                  className={cn(
                    'w-full aspect-square rounded-xl p-2 flex flex-col items-center justify-start transition-all',
                    isToday ? 'ring-2 ring-corporate bg-corporate/5' : 'hover:bg-[#F5F5F7]'
                  )}
                >
                  <span className={cn(
                    'text-sm font-medium',
                    isToday ? 'text-corporate' : 'text-[#1D1D1F]'
                  )}>
                    {date.getDate()}
                  </span>
                  {hasShifts && (
                    <div className="mt-1 flex flex-col gap-0.5">
                      {dayShifts.slice(0, 2).map((shift, i) => (
                        <span
                          key={i}
                          className="text-[8px] px-1 py-0.5 rounded bg-corporate/10 text-corporate truncate max-w-full"
                        >
                          {shift.name}
                        </span>
                      ))}
                      {dayShifts.length > 2 && (
                        <span className="text-[8px] text-[#86868B]">+{dayShifts.length - 2}</span>
                      )}
                    </div>
                  )}
                </button>

                {/* Expansión del día */}
                {isExpanded && (
                  <div className="col-span-7 mt-2 p-4 bg-[#F5F5F7] rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-[#1D1D1F]">
                        {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                      </h4>
                      <button
                        onClick={() => setExpandedDate(null)}
                        className="text-sm text-[#86868B] hover:text-[#1D1D1F]"
                      >
                        Cerrar
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-[#86868B]">Turnos:</span>
                        {dayShifts.length > 0 ? (
                          dayShifts.map((shift, i) => (
                            <span key={i} className="ml-2 text-sm text-[#1D1D1F]">
                              {shift.name} ({shift.startTime} - {shift.endTime})
                            </span>
                          ))
                        ) : (
                          <span className="ml-2 text-sm text-[#86868B]">Sin turno asignado</span>
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EQUIPO TAB
// ═══════════════════════════════════════════════════════════════════

function EquipoTab() {
  const { user } = useAuth();
  const { getUsersByDepartment, getWeekAssignments, getShiftById } = useShifts();
  const [selectedDepartment, setSelectedDepartment] = useState<Department>(user?.department || Department.DIVE_SHOP);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7); // Lunes
    return start;
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const users = getUsersByDepartment(selectedDepartment);
  const assignments = getWeekAssignments(selectedDepartment, weekStart);

  const getUserShiftForDay = (userId: string, date: Date): Shift | null => {
    const dateStr = date.toISOString().split('T')[0];
    const assignment = assignments.find(
      a => a.userId === userId && a.date === dateStr
    );
    return assignment ? getShiftById(assignment.shiftId) || null : null;
  };

  const departments = Object.values(Department);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Select value={selectedDepartment} onValueChange={(v) => setSelectedDepartment(v as Department)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>
                {dept.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        <div className="text-right">
          <div className="flex items-center gap-2 text-[#1D1D1F]">
            <Users className="w-4 h-4" />
            <span className="font-medium">Turnos de equipo</span>
          </div>
          <p className="text-xs text-[#86868B]">{formatWeekRange(weekStart, addDays(weekStart, 6))}</p>
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
                  <th key={i} className="text-center p-4 text-sm font-medium text-[#86868B] min-w-[100px]">
                    <div>{['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'][i]}</div>
                    <div className="text-xs text-[#C7C7CC]">{day.getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[#E5E5E7] last:border-0">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-corporate text-white text-xs">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-[#1D1D1F]">{u.name}</p>
                        <p className="text-xs text-[#86868B]">{u.position}</p>
                      </div>
                    </div>
                  </td>
                  {weekDays.map((day, i) => {
                    const shift = getUserShiftForDay(u.id, day);
                    return (
                      <td key={i} className="p-2 text-center">
                        {shift ? (
                          <div
                            className={cn(
                              'px-2 py-1 rounded-lg text-xs font-medium',
                              shift.name === 'Despacho' && 'bg-[#FFCC00]/20 text-[#FF9500]',
                              shift.name === 'AM' && 'bg-[#007AFF]/20 text-[#007AFF]',
                              shift.name === 'PM' && 'bg-[#5856D6]/20 text-[#5856D6]',
                              shift.name === 'Libre' && 'bg-[#8E8E93]/20 text-[#8E8E93]'
                            )}
                          >
                            {shift.name}
                          </div>
                        ) : (
                          <span className="text-[#C7C7CC]">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ASIGNAR TAB (Drag & Drop)
// ═══════════════════════════════════════════════════════════════════

function AsignarTab() {
  const { user } = useAuth();
  const { shifts, getShiftsByDepartment, getUsersByDepartment, assignShift, getWeekAssignments } = useShifts();
  const [selectedDepartment, setSelectedDepartment] = useState<Department>(user?.department || Department.DIVE_SHOP);
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

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

  const availableShifts = getShiftsByDepartment(selectedDepartment);
  const users = getUsersByDepartment(selectedDepartment);
  const assignments = getWeekAssignments(selectedDepartment, weekStart);

  const getUserAssignmentsForDay = (userId: string, date: Date): ShiftAssignment[] => {
    const dateStr = date.toISOString().split('T')[0];
    return assignments.filter(a => a.userId === userId && a.date === dateStr);
  };

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
      <div className="space-y-4">
        {/* Turnos disponibles */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[#1D1D1F]">Turnos disponibles (arrastra)</h3>
            <Select value={selectedDepartment} onValueChange={(v) => setSelectedDepartment(v as Department)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>
                    {dept.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            {availableShifts.map((shift) => (
              <DraggableShift key={shift.id} shift={shift} />
            ))}
          </div>
        </div>

        {/* Asignación de turnos */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-[#1D1D1F]">Asignación de turnos</h3>
              <p className="text-xs text-[#86868B]">{formatWeekRange(weekStart, addDays(weekStart, 6))}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-[#86868B]">
                <Users className="w-4 h-4" />
                <span>{users.length} colaboradores</span>
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
                <Button variant="outline" size="sm" className="gap-2">
                  <Save className="w-4 h-4" />
                  Guardar
                </Button>
                <Button size="sm" className="gap-2 bg-corporate hover:bg-corporate/90">
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
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[#E5E5E7] last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-corporate text-white text-xs">
                            {getInitials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-[#1D1D1F]">{u.name}</p>
                          <p className="text-xs text-[#86868B]">{u.position}</p>
                          {u.department !== selectedDepartment && (
                            <p className="text-[10px] text-corporate">{u.department.replace(/_/g, ' ')}</p>
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
                                return shift ? (
                                  <div
                                    key={idx}
                                    className={cn(
                                      'px-2 py-1 rounded-lg text-xs font-medium text-center',
                                      shift.name === 'Despacho' && 'bg-[#FFCC00]/20 text-[#FF9500]',
                                      shift.name === 'AM' && 'bg-[#007AFF]/20 text-[#007AFF]',
                                      shift.name === 'PM' && 'bg-[#5856D6]/20 text-[#5856D6]',
                                      shift.name === 'Libre' && 'bg-[#8E8E93]/20 text-[#8E8E93]'
                                    )}
                                  >
                                    {shift.name}
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </DroppableCell>
                        </td>
                      );
                    })}
                  </tr>
                ))}
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
    </DndContext>
  );
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
        'flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all',
        shift.name === 'Despacho' && 'bg-[#FFCC00]/20 text-[#FF9500] border border-[#FFCC00]/30',
        shift.name === 'AM' && 'bg-[#007AFF]/20 text-[#007AFF] border border-[#007AFF]/30',
        shift.name === 'PM' && 'bg-[#5856D6]/20 text-[#5856D6] border border-[#5856D6]/30',
        shift.name === 'Libre' && 'bg-[#8E8E93]/20 text-[#8E8E93] border border-[#8E8E93]/30',
        isDragging && 'opacity-50'
      )}
    >
      <GripVertical className="w-3 h-3 opacity-50" />
      <span className="text-sm font-medium">{shift.name}</span>
      <span className="text-xs opacity-70">({shift.startTime}-{shift.endTime})</span>
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
