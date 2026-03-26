// ═══════════════════════════════════════════════════════════════════
// TASKS MODULE - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import {
  Plus,
  Target,
  AlertCircle,
  User,
  Users,
  LayoutGrid,
  AlertTriangle,
  Search,
  List,
  LayoutTemplate,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TimeFilter,
  IncidenciaStatus,
  Department,
} from '@/types';
import {
  cn,
  getStatusColor,
  getPriorityColor,
  getPriorityLabel,
  getIncidenciaStatusColor,
  getIncidenciaStatusLabel,
  formatDateShort,
  formatRelativeTime,
  getInitials,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

type ViewType = 'list' | 'grid';
type MainTab = 'my-tasks' | 'my-department' | 'all' | 'incidencias';

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export default function TasksModule() {
  const { user, hasPermission } = useAuth();
  const { tasks, incidencias, getIncidenciaCounts } = useTasks();

  // Estados
  const [mainTab, setMainTab] = useState<MainTab>('my-tasks');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(TimeFilter.TODAY);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | IncidenciaStatus | 'all'>('all');
  const [viewType, setViewType] = useState<ViewType>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<'extra' | 'specific' | 'incidencia'>('extra');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Todos los departamentos del enum
  const allDepartments = useMemo(() => {
    return Object.values(Department).sort();
  }, []);

  // Filtrar tareas por tab, tiempo y departamento (para contadores)
  const tasksByTabAndTime = useMemo(() => {
    let result = [...tasks];

    // Filtrar por tab principal
    if (mainTab === 'my-tasks' && user) {
      result = result.filter((t) => t.assignedTo.includes(user.id));
    } else if (mainTab === 'my-department' && user) {
      result = result.filter((t) => t.department === user.department);
    } else if (mainTab === 'all' && selectedDepartment !== 'all') {
      // Filtrar por departamento seleccionado en pestaña "Todas"
      result = result.filter((t) => t.department === selectedDepartment);
    }

    // Filtrar por tiempo
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    switch (timeFilter) {
      case TimeFilter.TODAY:
        result = result.filter((t) => t.dueDate === today);
        break;
      case TimeFilter.YESTERDAY:
        result = result.filter((t) => t.dueDate === yesterday);
        break;
      case TimeFilter.TOMORROW:
        result = result.filter((t) => t.dueDate === tomorrow);
        break;
      case TimeFilter.PAST_WEEKS:
        result = result.filter((t) => t.dueDate < today);
        break;
      case TimeFilter.UPCOMING:
        result = result.filter((t) => t.dueDate > tomorrow);
        break;
    }

    return result;
  }, [tasks, mainTab, user, timeFilter, selectedDepartment]);

  // Calcular contadores basados en tareas filtradas por tab y tiempo
  const filteredTaskCounts = useMemo(() => {
    const counts = {
      total: tasksByTabAndTime.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      verified: 0,
      blocked: 0,
      overdue: 0,
    };

    tasksByTabAndTime.forEach((task) => {
      switch (task.status) {
        case TaskStatus.PENDING:
          counts.pending++;
          break;
        case TaskStatus.IN_PROGRESS:
          counts.inProgress++;
          break;
        case TaskStatus.COMPLETED:
          counts.completed++;
          break;
        case TaskStatus.VERIFIED:
          counts.verified++;
          break;
        case TaskStatus.BLOCKED:
          counts.blocked++;
          break;
        case TaskStatus.OVERDUE:
          counts.overdue++;
          break;
      }
    });

    return counts;
  }, [tasksByTabAndTime]);

  // Contadores de incidencias (sin cambios)
  const incidenciaCounts = getIncidenciaCounts();

  // Filtrar tareas por estado y búsqueda (para mostrar)
  const filteredTasks = useMemo(() => {
    let result = [...tasksByTabAndTime];

    // Filtrar por estado
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
      );
    }

    // Ordenar: En Progreso → Atrasadas → Demás
    result.sort((a, b) => {
      const priorityOrder: Record<TaskStatus, number> = {
        [TaskStatus.IN_PROGRESS]: 0,
        [TaskStatus.OVERDUE]: 1,
        [TaskStatus.PENDING]: 2,
        [TaskStatus.BLOCKED]: 3,
        [TaskStatus.COMPLETED]: 4,
        [TaskStatus.VERIFIED]: 5,
      };
      const diff = priorityOrder[a.status] - priorityOrder[b.status];
      if (diff !== 0) return diff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return result;
  }, [tasksByTabAndTime, statusFilter, searchQuery]);

  // Filtrar incidencias
  const filteredIncidencias = useMemo(() => {
    let result = [...incidencias];

    // Filtrar por tiempo
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    switch (timeFilter) {
      case TimeFilter.TODAY:
        result = result.filter((i) => i.createdAt.startsWith(today));
        break;
      case TimeFilter.YESTERDAY:
        result = result.filter((i) => i.createdAt.startsWith(yesterday));
        break;
      case TimeFilter.PAST_WEEKS:
        result = result.filter((i) => i.createdAt < today);
        break;
    }

    // Filtrar por estado
    if (statusFilter !== 'all') {
      result = result.filter((i) => i.status === statusFilter);
    }

    // Ordenar
    result.sort((a, b) => {
      const priorityOrder: Record<IncidenciaStatus, number> = {
        [IncidenciaStatus.NEW]: 0,
        [IncidenciaStatus.REOPENED]: 1,
        [IncidenciaStatus.OPEN]: 2,
        [IncidenciaStatus.VERIFIED]: 3,
        [IncidenciaStatus.RESOLVED]: 4,
        [IncidenciaStatus.CLOSED]: 5,
      };
      return priorityOrder[a.status] - priorityOrder[b.status];
    });

    return result;
  }, [incidencias, timeFilter, statusFilter]);

  // Determinar si mostrar tareas o incidencias
  const isIncidenciasTab = mainTab === 'incidencias';
  const displayItems = isIncidenciasTab ? filteredIncidencias : filteredTasks;

  // Handlers
  const handleCreateTask = (type: 'extra' | 'specific' | 'incidencia') => {
    setCreateType(type);
    setIsCreateModalOpen(true);
  };

  return (
    <Layout title="Tasks" showDate={true}>
      <div className="space-y-4">
        {/* ═══════════════════════════════════════════════════════════════════
            HEADER
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#1D1D1F]">Tasks</h2>
            <p className="text-sm text-[#86868B]">Gestiona tareas e incidencias</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Tarea Extra */}
            <Button
              onClick={() => handleCreateTask('extra')}
              className="bg-corporate hover:bg-corporate/90 text-white rounded-lg gap-2"
            >
              <Plus className="w-4 h-4" />
              Tarea Extra
            </Button>

            {/* Tarea Específica */}
            {hasPermission('canCreateSpecificTask') && (
              <Button
                onClick={() => handleCreateTask('specific')}
                variant="outline"
                className="rounded-lg gap-2 border-corporate text-corporate hover:bg-corporate/5"
              >
                <Target className="w-4 h-4" />
                Tarea Específica
              </Button>
            )}

            {/* Incidencia */}
            <Button
              onClick={() => handleCreateTask('incidencia')}
              variant="outline"
              className="rounded-lg gap-2 border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/5"
            >
              <AlertCircle className="w-4 h-4" />
              Incidencia
            </Button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            MAIN TABS
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 w-fit">
          <button
            onClick={() => {
              setMainTab('my-tasks');
              setStatusFilter('all');
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              mainTab === 'my-tasks'
                ? 'bg-[#F5F5F7] text-[#1D1D1F]'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            )}
          >
            <User className="w-4 h-4" />
            Mis Tareas
          </button>
          <button
            onClick={() => {
              setMainTab('my-department');
              setStatusFilter('all');
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              mainTab === 'my-department'
                ? 'bg-[#F5F5F7] text-[#1D1D1F]'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            )}
          >
            <Users className="w-4 h-4" />
            Mi Departamento
          </button>
          {hasPermission('canViewAllDepartments') && (
            <button
              onClick={() => {
                setMainTab('all');
                setStatusFilter('all');
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                mainTab === 'all'
                  ? 'bg-[#F5F5F7] text-[#1D1D1F]'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Todas
            </button>
          )}
          <button
            onClick={() => {
              setMainTab('incidencias');
              setStatusFilter('all');
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              mainTab === 'incidencias'
                ? 'bg-[#F5F5F7] text-[#1D1D1F]'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            )}
          >
            <AlertTriangle className="w-4 h-4" />
            Incidencias
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            DEPARTMENT FILTER (solo en pestaña "Todas")
            ═══════════════════════════════════════════════════════════════════ */}
        {mainTab === 'all' && hasPermission('canViewAllDepartments') && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#86868B]">Departamento:</span>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[200px] h-9 rounded-lg border-[#E5E5E7]">
                <SelectValue placeholder="Seleccionar departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {allDepartments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TIME FILTERS
            ═══════════════════════════════════════════════════════════════════ */}
        {!isIncidenciasTab && (
          <div className="flex items-center gap-2">
            {[
              { id: TimeFilter.PAST_WEEKS, label: 'Semanas pasadas' },
              { id: TimeFilter.YESTERDAY, label: 'Ayer' },
              { id: TimeFilter.TODAY, label: 'Hoy' },
              { id: TimeFilter.TOMORROW, label: 'Mañana' },
              { id: TimeFilter.UPCOMING, label: 'Próximas' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setTimeFilter(filter.id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  timeFilter === filter.id
                    ? 'bg-corporate text-white'
                    : 'bg-white text-[#86868B] hover:text-[#1D1D1F] border border-[#E5E5E7]'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}

        {/* Time filters para incidencias (sin mañana ni próximas) */}
        {isIncidenciasTab && (
          <div className="flex items-center gap-2">
            {[
              { id: TimeFilter.PAST_WEEKS, label: 'Semanas pasadas' },
              { id: TimeFilter.YESTERDAY, label: 'Ayer' },
              { id: TimeFilter.TODAY, label: 'Hoy' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setTimeFilter(filter.id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  timeFilter === filter.id
                    ? 'bg-corporate text-white'
                    : 'bg-white text-[#86868B] hover:text-[#1D1D1F] border border-[#E5E5E7]'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STATUS FILTERS
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isIncidenciasTab ? (
            <>
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                  statusFilter === 'all'
                    ? 'bg-corporate text-white'
                    : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                )}
              >
                <span className="font-semibold">{filteredTaskCounts.total}</span>
                <span>Todas</span>
              </button>
              <button
                onClick={() => setStatusFilter(TaskStatus.PENDING)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                  statusFilter === TaskStatus.PENDING
                    ? 'bg-[#8E8E93] text-white'
                    : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                )}
              >
                <span className="font-semibold">{filteredTaskCounts.pending}</span>
                <span>Pendientes</span>
              </button>
              <button
                onClick={() => setStatusFilter(TaskStatus.IN_PROGRESS)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                  statusFilter === TaskStatus.IN_PROGRESS
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                )}
              >
                <span className="font-semibold">{filteredTaskCounts.inProgress}</span>
                <span>En Progreso</span>
              </button>
              <button
                onClick={() => setStatusFilter(TaskStatus.COMPLETED)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                  statusFilter === TaskStatus.COMPLETED
                    ? 'bg-[#34C759] text-white'
                    : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                )}
              >
                <span className="font-semibold">{filteredTaskCounts.completed}</span>
                <span>Completadas</span>
              </button>
              <button
                onClick={() => setStatusFilter(TaskStatus.VERIFIED)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                  statusFilter === TaskStatus.VERIFIED
                    ? 'bg-[#5856D6] text-white'
                    : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                )}
              >
                <span className="font-semibold">{filteredTaskCounts.verified}</span>
                <span>Verificadas</span>
              </button>
              <button
                onClick={() => setStatusFilter(TaskStatus.BLOCKED)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                  statusFilter === TaskStatus.BLOCKED
                    ? 'bg-[#FF9500] text-white'
                    : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                )}
              >
                <span className="font-semibold">{filteredTaskCounts.blocked}</span>
                <span>Bloqueadas</span>
              </button>
              <button
                onClick={() => setStatusFilter(TaskStatus.OVERDUE)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                  statusFilter === TaskStatus.OVERDUE
                    ? 'bg-[#FF3B30] text-white'
                    : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                )}
              >
                <span className="font-semibold">{filteredTaskCounts.overdue}</span>
                <span>Atrasadas</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                  statusFilter === 'all'
                    ? 'bg-corporate text-white'
                    : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                )}
              >
                <span className="font-semibold">{incidenciaCounts.total}</span>
                <span>Todas</span>
              </button>
              <button
                onClick={() => setStatusFilter(IncidenciaStatus.NEW)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                  statusFilter === IncidenciaStatus.NEW
                    ? 'bg-[#FF3B30] text-white'
                    : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                )}
              >
                <span className="font-semibold">{incidenciaCounts.new}</span>
                <span>Nuevas</span>
              </button>
              <button
                onClick={() => setStatusFilter(IncidenciaStatus.OPEN)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                  statusFilter === IncidenciaStatus.OPEN
                    ? 'bg-[#FF9500] text-white'
                    : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                )}
              >
                <span className="font-semibold">{incidenciaCounts.open}</span>
                <span>Abiertas</span>
              </button>
              <button
                onClick={() => setStatusFilter(IncidenciaStatus.VERIFIED)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                  statusFilter === IncidenciaStatus.VERIFIED
                    ? 'bg-[#5856D6] text-white'
                    : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                )}
              >
                <span className="font-semibold">{incidenciaCounts.verified}</span>
                <span>Verificadas</span>
              </button>
              <button
                onClick={() => setStatusFilter(IncidenciaStatus.RESOLVED)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                  statusFilter === IncidenciaStatus.RESOLVED
                    ? 'bg-[#34C759] text-white'
                    : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                )}
              >
                <span className="font-semibold">{incidenciaCounts.resolved}</span>
                <span>Resueltas</span>
              </button>
              <button
                onClick={() => setStatusFilter(IncidenciaStatus.CLOSED)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                  statusFilter === IncidenciaStatus.CLOSED
                    ? 'bg-[#8E8E93] text-white'
                    : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                )}
              >
                <span className="font-semibold">{incidenciaCounts.closed}</span>
                <span>Cerradas</span>
              </button>
              <button
                onClick={() => setStatusFilter(IncidenciaStatus.REOPENED)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                  statusFilter === IncidenciaStatus.REOPENED
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]'
                )}
              >
                <span className="font-semibold">{incidenciaCounts.reopened}</span>
                <span>Reabiertas</span>
              </button>
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TOOLBAR
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl border-[#E5E5E7] focus:border-corporate focus:ring-corporate"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-white rounded-lg border border-[#E5E5E7] p-1">
            <button
              onClick={() => setViewType('list')}
              className={cn(
                'p-2 rounded-md transition-all',
                viewType === 'list' ? 'bg-[#F5F5F7] text-[#1D1D1F]' : 'text-[#86868B]'
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewType('grid')}
              className={cn(
                'p-2 rounded-md transition-all',
                viewType === 'grid' ? 'bg-[#F5F5F7] text-[#1D1D1F]' : 'text-[#86868B]'
              )}
            >
              <LayoutTemplate className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            CONTENT
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="min-h-[400px]">
          {displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-[#F5F5F7] rounded-2xl flex items-center justify-center mb-4">
                {isIncidenciasTab ? (
                  <AlertTriangle className="w-8 h-8 text-[#C7C7CC]" />
                ) : (
                  <CheckCircle2 className="w-8 h-8 text-[#C7C7CC]" />
                )}
              </div>
              <p className="text-[#86868B]">
                {isIncidenciasTab ? 'No hay incidencias' : 'No hay tareas'}
              </p>
            </div>
          ) : (
            <div className={cn('space-y-3', viewType === 'grid' ? 'grid grid-cols-2 gap-3' : '')}>
              {displayItems.map((item) =>
                isIncidenciasTab ? (
                  <IncidenciaCard key={item.id} incidencia={item as any} />
                ) : (
                  <TaskCard key={item.id} task={item as Task} />
                )
              )}
            </div>
          )}
        </div>

        {/* Create Modal Placeholder */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {createType === 'extra' && 'Nueva Tarea Extra'}
                {createType === 'specific' && 'Nueva Tarea Específica'}
                {createType === 'incidencia' && 'Nueva Incidencia'}
              </DialogTitle>
            </DialogHeader>
            <div className="py-8 text-center text-[#86868B]">
              Modal en desarrollo...
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TASK CARD
// ═══════════════════════════════════════════════════════════════════

interface TaskCardProps {
  task: Task;
}

function TaskCard({ task }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = getStatusColor(task.status);
  const priorityColor = getPriorityColor(task.priority);

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-[#E5E5E7] overflow-hidden transition-all',
        expanded && 'shadow-lg'
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        {/* Status Indicator */}
        <div
          className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: statusColor }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-[#1D1D1F] truncate">{task.title}</h4>
            <Badge
              style={{ backgroundColor: priorityColor, color: '#fff' }}
              className="text-xs flex-shrink-0"
            >
              {getPriorityLabel(task.priority)}
            </Badge>
          </div>
          <p className="text-sm text-[#86868B] line-clamp-1 mt-1">{task.description}</p>

          {/* Meta */}
          <div className="flex items-center gap-4 mt-3">
            {/* Assignees */}
            <div className="flex -space-x-2">
              {task.assignedTo.slice(0, 3).map((userId, i) => (
                <Avatar key={i} className="w-6 h-6 border-2 border-white">
                  <AvatarFallback className="bg-corporate text-white text-[10px]">
                    {getInitials('User ' + userId)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {task.assignedTo.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-[#F5F5F7] border-2 border-white flex items-center justify-center text-[10px] text-[#86868B]">
                  +{task.assignedTo.length - 3}
                </div>
              )}
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-1 text-xs text-[#86868B]">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDateShort(task.dueDate)}</span>
            </div>

            {/* Subtasks */}
            {task.subtasks.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-[#86868B]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
                </span>
              </div>
            )}

            {/* Photos */}
            {task.requiresPhoto && (
              <div className="flex items-center gap-1 text-xs text-[#86868B]">
                <span>📷</span>
                <span>{task.photos.length}</span>
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#E5E5E7]">
          {/* Details */}
          <div className="py-4 space-y-3">
            {/* Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#86868B]">Creada por:</span>{' '}
                <span className="text-[#1D1D1F]">{task.createdBy}</span>
              </div>
              <div>
                <span className="text-[#86868B]">Departamento:</span>{' '}
                <span className="text-[#1D1D1F]">{task.department}</span>
              </div>
              {task.startTime && (
                <div>
                  <span className="text-[#86868B]">Hora inicio:</span>{' '}
                  <span className="text-[#1D1D1F]">{task.startTime}</span>
                </div>
              )}
              {task.estimatedMinutes && (
                <div>
                  <span className="text-[#86868B]">Tiempo estimado:</span>{' '}
                  <span className="text-[#1D1D1F]">{task.estimatedMinutes} min</span>
                </div>
              )}
            </div>

            {/* Subtasks */}
            {task.subtasks.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-[#1D1D1F]">Subtareas</h5>
                <div className="space-y-1">
                  {task.subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center',
                          subtask.completed
                            ? 'bg-[#34C759] border-[#34C759]'
                            : 'border-[#C7C7CC]'
                        )}
                      >
                        {subtask.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span
                        className={cn(
                          'text-sm',
                          subtask.completed ? 'text-[#86868B] line-through' : 'text-[#1D1D1F]'
                        )}
                      >
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {task.notes.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-[#1D1D1F]">Notas</h5>
                <div className="space-y-2">
                  {task.notes.map((note) => (
                    <div key={note.id} className="bg-[#F5F5F7] rounded-lg p-3 text-sm">
                      <p className="text-[#1D1D1F]">{note.content}</p>
                      <p className="text-xs text-[#86868B] mt-1">
                        {formatRelativeTime(note.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {task.history.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-[#1D1D1F]">Historial</h5>
                <div className="space-y-1 text-sm">
                  {task.history.slice(-3).map((h) => (
                    <div key={h.id} className="flex items-center gap-2 text-[#86868B]">
                      <span>•</span>
                      <span>{h.action}</span>
                      <span className="text-xs">{formatRelativeTime(h.performedAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-[#E5E5E7]">
            {task.status === TaskStatus.PENDING && (
              <Button size="sm" className="bg-[#007AFF] hover:bg-[#007AFF]/90 text-white">
                En Progreso
              </Button>
            )}
            {task.status === TaskStatus.IN_PROGRESS && (
              <Button size="sm" className="bg-[#34C759] hover:bg-[#34C759]/90 text-white">
                Completar
              </Button>
            )}
            {task.status === TaskStatus.COMPLETED && (
              <Button size="sm" className="bg-[#5856D6] hover:bg-[#5856D6]/90 text-white">
                Verificar
              </Button>
            )}
            <Button size="sm" variant="outline">
              Bloquear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// INCIDENCIA CARD
// ═══════════════════════════════════════════════════════════════════

interface IncidenciaCardProps {
  incidencia: {
    id: string;
    title: string;
    description: string;
    status: IncidenciaStatus;
    priority: TaskPriority;
    reportedBy: string;
    targetDepartment: string;
    createdAt: string;
  };
}

function IncidenciaCard({ incidencia }: IncidenciaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = getIncidenciaStatusColor(incidencia.status);
  const priorityColor = getPriorityColor(incidencia.priority);

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-[#E5E5E7] overflow-hidden transition-all',
        expanded && 'shadow-lg'
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        {/* Priority Badge */}
        <Badge
          style={{ backgroundColor: priorityColor, color: '#fff' }}
          className="text-xs flex-shrink-0"
        >
          {getPriorityLabel(incidencia.priority)}
        </Badge>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-[#1D1D1F] truncate">{incidencia.title}</h4>
            <Badge
              style={{ backgroundColor: statusColor, color: '#fff' }}
              className="text-xs flex-shrink-0"
            >
              {getIncidenciaStatusLabel(incidencia.status)}
            </Badge>
          </div>
          <p className="text-sm text-[#86868B] line-clamp-1 mt-1">{incidencia.description}</p>

          {/* Meta */}
          <div className="flex items-center gap-4 mt-3 text-xs text-[#86868B]">
            <span>Reportado por: {incidencia.reportedBy}</span>
            <span>•</span>
            <span>{incidencia.targetDepartment}</span>
            <span>•</span>
            <span>{formatRelativeTime(incidencia.createdAt)}</span>
          </div>
        </div>
      </button>
    </div>
  );
}
