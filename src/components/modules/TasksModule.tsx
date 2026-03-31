// ═══════════════════════════════════════════════════════════════════
// TASKS MODULE - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import {
  Plus, Target, AlertCircle, User, Users, LayoutGrid, AlertTriangle,
  Search, List, LayoutTemplate, Calendar, CheckCircle2, Camera,
  ChevronUp, ChevronDown, UserCircle, Building2, CheckSquare,
  Lock, Unlock, History, MessageSquare,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import {
  Task, TaskStatus, TaskPriority, TaskType, TimeFilter,
  IncidenciaStatus, Department, Role, Incidencia,
} from '@/types';
import {
  cn, getStatusColor, getPriorityColor, getPriorityLabel,
  getIncidenciaStatusColor, getIncidenciaStatusLabel,
  formatDateShort, formatRelativeTime, getInitials, generateId,
} from '@/lib/utils';
import { users } from '@/data/users';
import { shifts } from '@/data/shifts';
import { shiftAssignments } from '@/data/shiftAssignments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const getStatusLabel = (status: TaskStatus): string => {
  const labels: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: 'Pendiente',
    [TaskStatus.IN_PROGRESS]: 'En Progreso',
    [TaskStatus.COMPLETED]: 'Completada',
    [TaskStatus.VERIFIED]: 'Verificada',
    [TaskStatus.BLOCKED]: 'Bloqueada',
    [TaskStatus.OVERDUE]: 'Atrasada',
  };
  return labels[status];
};

type ViewType = 'list' | 'grid';
type MainTab = 'my-tasks' | 'my-department' | 'all' | 'incidencias';

export default function TasksModule() {
  const { user, hasPermission } = useAuth();
  const { tasks, incidencias, getIncidenciaCounts, createTask, createIncidencia, changeTaskStatus, reopenTask, addNote, addIncidenciaNote, confirmIncidencia, resolveIncidencia, closeIncidencia, reopenIncidencia } = useTasks();

  const [mainTab, setMainTab] = useState<MainTab>('my-tasks');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(TimeFilter.TODAY);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | IncidenciaStatus | 'all'>('all');
  const [viewType, setViewType] = useState<ViewType>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<'extra' | 'specific' | 'incidencia'>('extra');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const allDepartments = useMemo(() => Object.values(Department).sort(), []);

  const [taskForm, setTaskForm] = useState({
    title: '', description: '', department: Department.ADMINISTRATIVO,
    priority: TaskPriority.MEDIUM, startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00', estimatedHours: 60, supervisor: '', assignedTo: [] as string[],
    requiresPhoto: false, subtasks: [] as { id: string; title: string; completed: boolean }[],
    selectedShifts: [] as string[], supportDepartment: '' as Department | '',
    supportUsers: [] as string[],
  });
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const supervisorsByDepartment = useMemo(() => {
    return users.filter((u) => u.department === taskForm.department && 
      (u.role === 'GERENTE_DEPARTAMENTO' || u.role === 'SUPERVISOR' || u.role === 'GERENTE_OPERACIONES'))
      .map((u) => ({ id: u.id, name: u.name, position: u.position, role: u.role }));
  }, [taskForm.department]);

  const calculatedDueDateTime = useMemo(() => {
    try {
      const start = new Date(`${taskForm.startDate}T${taskForm.startTime}`);
      const end = new Date(start.getTime() + taskForm.estimatedHours * 60 * 1000);
      return { date: end.toISOString().split('T')[0], time: end.toTimeString().slice(0, 5) };
    } catch {
      return { date: taskForm.startDate, time: taskForm.startTime };
    }
  }, [taskForm.startDate, taskForm.startTime, taskForm.estimatedHours]);

  const [incidenciaForm, setIncidenciaForm] = useState({
    title: '', description: '', department: Department.ADMINISTRATIVO, priority: TaskPriority.HIGH,
  });

  const handleOpenModal = (type: 'extra' | 'specific' | 'incidencia') => {
    setCreateType(type);
    setTaskForm({
      title: '', description: '', department: Department.ADMINISTRATIVO,
      priority: TaskPriority.MEDIUM, startDate: new Date().toISOString().split('T')[0],
      startTime: '09:00', estimatedHours: 60, supervisor: '', assignedTo: [],
      requiresPhoto: false, subtasks: [], selectedShifts: [], supportDepartment: '', supportUsers: [],
    });
    setIncidenciaForm({ title: '', description: '', department: Department.ADMINISTRATIVO, priority: TaskPriority.HIGH });
    setIsCreateModalOpen(true);
  };

  const tasksByTabAndTime = useMemo(() => {
    let result = [...tasks];
    if (mainTab === 'my-tasks' && user) result = result.filter((t) => t.assignedTo.includes(user.id));
    else if (mainTab === 'my-department' && user) result = result.filter((t) => t.department === user.department);
    else if (mainTab === 'all' && selectedDepartment !== 'all') result = result.filter((t) => t.department === selectedDepartment);

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    switch (timeFilter) {
      case TimeFilter.TODAY:
        result = result.filter((t) => t.dueDate === today || (t.dueDate < today && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.VERIFIED));
        break;
      case TimeFilter.YESTERDAY: result = result.filter((t) => t.dueDate === yesterday); break;
      case TimeFilter.TOMORROW: result = result.filter((t) => t.dueDate === tomorrow); break;
      case TimeFilter.PAST_WEEKS: result = result.filter((t) => t.dueDate < today); break;
      case TimeFilter.UPCOMING: result = result.filter((t) => t.dueDate > tomorrow); break;
    }
    return result;
  }, [tasks, mainTab, user, timeFilter, selectedDepartment]);

  const filteredTaskCounts = useMemo(() => {
    const counts = { total: tasksByTabAndTime.length, pending: 0, inProgress: 0, completed: 0, verified: 0, blocked: 0, overdue: 0 };
    tasksByTabAndTime.forEach((task) => {
      switch (task.status) {
        case TaskStatus.PENDING: counts.pending++; break;
        case TaskStatus.IN_PROGRESS: counts.inProgress++; break;
        case TaskStatus.COMPLETED: counts.completed++; break;
        case TaskStatus.VERIFIED: counts.verified++; break;
        case TaskStatus.BLOCKED: counts.blocked++; break;
        case TaskStatus.OVERDUE: counts.overdue++; break;
      }
    });
    return counts;
  }, [tasksByTabAndTime]);

  const incidenciaCounts = getIncidenciaCounts();

  const filteredTasks = useMemo(() => {
    let result = [...tasksByTabAndTime];
    if (statusFilter !== 'all') result = result.filter((t) => t.status === statusFilter);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(query) || t.description.toLowerCase().includes(query));
    }
    result.sort((a, b) => {
      const statusOrder: Record<TaskStatus, number> = { [TaskStatus.OVERDUE]: 0, [TaskStatus.IN_PROGRESS]: 1, [TaskStatus.PENDING]: 2, [TaskStatus.BLOCKED]: 3, [TaskStatus.COMPLETED]: 4, [TaskStatus.VERIFIED]: 5 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      const priorityOrder: Record<TaskPriority, number> = { [TaskPriority.CRITICAL]: 0, [TaskPriority.HIGH]: 1, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
    return result;
  }, [tasksByTabAndTime, statusFilter, searchQuery]);

  const filteredIncidencias = useMemo(() => {
    let result = [...incidencias];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    switch (timeFilter) {
      case TimeFilter.TODAY: result = result.filter((i) => i.createdAt.startsWith(today)); break;
      case TimeFilter.YESTERDAY: result = result.filter((i) => i.createdAt.startsWith(yesterday)); break;
      case TimeFilter.PAST_WEEKS: result = result.filter((i) => i.createdAt < today); break;
    }
    if (statusFilter !== 'all') result = result.filter((i) => i.status === statusFilter);
    result.sort((a, b) => {
      const priorityOrder: Record<IncidenciaStatus, number> = { [IncidenciaStatus.NEW]: 0, [IncidenciaStatus.REOPENED]: 1, [IncidenciaStatus.OPEN]: 2, [IncidenciaStatus.VERIFIED]: 3, [IncidenciaStatus.RESOLVED]: 4, [IncidenciaStatus.CLOSED]: 5 };
      return priorityOrder[a.status] - priorityOrder[b.status];
    });
    return result;
  }, [incidencias, timeFilter, statusFilter]);

  const isIncidenciasTab = mainTab === 'incidencias';
  const displayItems = isIncidenciasTab ? filteredIncidencias : filteredTasks;

  return (
    <Layout title="Tasks" showDate={true}>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#1D1D1F]">Tasks</h2>
            <p className="text-sm text-[#86868B]">Gestiona tareas e incidencias</p>
          </div>
          <div className="flex items-center gap-2">
            {hasPermission('canCreateExtraTask') && (
              <Button onClick={() => handleOpenModal('extra')} className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg gap-2">
                <Plus className="w-4 h-4" />Tarea Extra
              </Button>
            )}
            {hasPermission('canCreateSpecificTask') && (
              <Button onClick={() => handleOpenModal('specific')} variant="outline" className="rounded-lg gap-2 border-corporate text-corporate hover:bg-corporate/5">
                <Target className="w-4 h-4" />Tarea Específica
              </Button>
            )}
            <Button onClick={() => handleOpenModal('incidencia')} variant="outline" className="rounded-lg gap-2 border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/5">
              <AlertCircle className="w-4 h-4" />Incidencia
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white rounded-xl p-1 w-fit">
          <button onClick={() => { setMainTab('my-tasks'); setStatusFilter('all'); }} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', mainTab === 'my-tasks' ? 'bg-[#F5F5F7] text-[#1D1D1F]' : 'text-[#86868B] hover:text-[#1D1D1F]')}><User className="w-4 h-4" />Mis Tareas</button>
          <button onClick={() => { setMainTab('my-department'); setStatusFilter('all'); }} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', mainTab === 'my-department' ? 'bg-[#F5F5F7] text-[#1D1D1F]' : 'text-[#86868B] hover:text-[#1D1D1F]')}><Users className="w-4 h-4" />Mi Departamento</button>
          {hasPermission('canViewAllDepartments') && (
            <button onClick={() => { setMainTab('all'); setStatusFilter('all'); }} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', mainTab === 'all' ? 'bg-[#F5F5F7] text-[#1D1D1F]' : 'text-[#86868B] hover:text-[#1D1D1F]')}><LayoutGrid className="w-4 h-4" />Todas</button>
          )}
          <button onClick={() => { setMainTab('incidencias'); setStatusFilter('all'); }} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', mainTab === 'incidencias' ? 'bg-[#F5F5F7] text-[#1D1D1F]' : 'text-[#86868B] hover:text-[#1D1D1F]')}><AlertTriangle className="w-4 h-4" />Incidencias</button>
        </div>

        {mainTab === 'all' && hasPermission('canViewAllDepartments') && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#86868B]">Departamento:</span>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[200px] h-9 rounded-lg border-[#E5E5E7]"><SelectValue placeholder="Seleccionar departamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {allDepartments.map((dept) => (<SelectItem key={dept} value={dept}>{dept.replace(/_/g, ' ')}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!isIncidenciasTab && (
          <div className="flex items-center gap-2">
            {[{ id: TimeFilter.PAST_WEEKS, label: 'Semanas pasadas' }, { id: TimeFilter.YESTERDAY, label: 'Ayer' }, { id: TimeFilter.TODAY, label: 'Hoy' }, { id: TimeFilter.TOMORROW, label: 'Mañana' }, { id: TimeFilter.UPCOMING, label: 'Próximas' }].map((filter) => (
              <button key={filter.id} onClick={() => setTimeFilter(filter.id)} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', timeFilter === filter.id ? 'bg-corporate text-white' : 'bg-white text-[#86868B] hover:text-[#1D1D1F] border border-[#E5E5E7]')}>{filter.label}</button>
            ))}
          </div>
        )}

        {isIncidenciasTab && (
          <div className="flex items-center gap-2">
            {[{ id: TimeFilter.PAST_WEEKS, label: 'Semanas pasadas' }, { id: TimeFilter.YESTERDAY, label: 'Ayer' }, { id: TimeFilter.TODAY, label: 'Hoy' }].map((filter) => (
              <button key={filter.id} onClick={() => setTimeFilter(filter.id)} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', timeFilter === filter.id ? 'bg-corporate text-white' : 'bg-white text-[#86868B] hover:text-[#1D1D1F] border border-[#E5E5E7]')}>{filter.label}</button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {!isIncidenciasTab ? (
            <>
              <button onClick={() => setStatusFilter('all')} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === 'all' ? 'bg-corporate text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.total}</span><span>Todas</span></button>
              <button onClick={() => setStatusFilter(TaskStatus.PENDING)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.PENDING ? 'bg-[#8E8E93] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.pending}</span><span>Pendientes</span></button>
              <button onClick={() => setStatusFilter(TaskStatus.IN_PROGRESS)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.IN_PROGRESS ? 'bg-[#007AFF] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.inProgress}</span><span>En Progreso</span></button>
              <button onClick={() => setStatusFilter(TaskStatus.COMPLETED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.COMPLETED ? 'bg-[#34C759] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.completed}</span><span>Completadas</span></button>
              <button onClick={() => setStatusFilter(TaskStatus.VERIFIED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.VERIFIED ? 'bg-[#5856D6] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.verified}</span><span>Verificadas</span></button>
              <button onClick={() => setStatusFilter(TaskStatus.BLOCKED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.BLOCKED ? 'bg-[#FF9500] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.blocked}</span><span>Bloqueadas</span></button>
              <button onClick={() => setStatusFilter(TaskStatus.OVERDUE)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.OVERDUE ? 'bg-[#FF3B30] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.overdue}</span><span>Atrasadas</span></button>
            </>
          ) : (
            <>
              <button onClick={() => setStatusFilter('all')} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === 'all' ? 'bg-corporate text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{incidenciaCounts.total}</span><span>Todas</span></button>
              <button onClick={() => setStatusFilter(IncidenciaStatus.NEW)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === IncidenciaStatus.NEW ? 'bg-[#FF3B30] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{incidenciaCounts.new}</span><span>Nuevas</span></button>
              <button onClick={() => setStatusFilter(IncidenciaStatus.OPEN)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === IncidenciaStatus.OPEN ? 'bg-[#FF9500] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{incidenciaCounts.open}</span><span>Abiertas</span></button>
              <button onClick={() => setStatusFilter(IncidenciaStatus.VERIFIED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === IncidenciaStatus.VERIFIED ? 'bg-[#5856D6] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{incidenciaCounts.verified}</span><span>Verificadas</span></button>
              <button onClick={() => setStatusFilter(IncidenciaStatus.RESOLVED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === IncidenciaStatus.RESOLVED ? 'bg-[#34C759] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{incidenciaCounts.resolved}</span><span>Resueltas</span></button>
              <button onClick={() => setStatusFilter(IncidenciaStatus.CLOSED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === IncidenciaStatus.CLOSED ? 'bg-[#8E8E93] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{incidenciaCounts.closed}</span><span>Cerradas</span></button>
              <button onClick={() => setStatusFilter(IncidenciaStatus.REOPENED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === IncidenciaStatus.REOPENED ? 'bg-[#007AFF] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{incidenciaCounts.reopened}</span><span>Reabiertas</span></button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
            <Input placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10 rounded-xl border-[#E5E5E7] focus:border-corporate focus:ring-corporate" />
          </div>
          <div className="flex items-center bg-white rounded-lg border border-[#E5E5E7] p-1">
            <button onClick={() => setViewType('list')} className={cn('p-2 rounded-md transition-all', viewType === 'list' ? 'bg-[#F5F5F7] text-[#1D1D1F]' : 'text-[#86868B]')}><List className="w-4 h-4" /></button>
            <button onClick={() => setViewType('grid')} className={cn('p-2 rounded-md transition-all', viewType === 'grid' ? 'bg-[#F5F5F7] text-[#1D1D1F]' : 'text-[#86868B]')}><LayoutTemplate className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="min-h-[400px]">
          {displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-[#F5F5F7] rounded-2xl flex items-center justify-center mb-4">
                {isIncidenciasTab ? <AlertTriangle className="w-8 h-8 text-[#C7C7CC]" /> : <CheckCircle2 className="w-8 h-8 text-[#C7C7CC]" />}
              </div>
              <p className="text-[#86868B]">{isIncidenciasTab ? 'No hay incidencias' : 'No hay tareas'}</p>
            </div>
          ) : (
            <div className={cn('space-y-3', viewType === 'grid' ? 'grid grid-cols-2 gap-3' : '')}>
              {displayItems.map((item) => isIncidenciasTab ? (
                <IncidenciaCard key={item.id} incidencia={item as Incidencia} currentUserId={user?.id} currentUser={user} onConfirmIncidencia={confirmIncidencia} onResolveIncidencia={resolveIncidencia} onCloseIncidencia={closeIncidencia} onReopenIncidencia={reopenIncidencia} onAddNote={addIncidenciaNote} />
              ) : (
                <TaskCard key={item.id} task={item as Task} onStatusChange={(taskId, status, reason) => changeTaskStatus(taskId, status, reason, user?.id)} onComplete={(taskId) => changeTaskStatus(taskId, TaskStatus.COMPLETED, 'Tarea completada', user?.id)} onReopen={(taskId) => reopenTask(taskId, user?.id || '')} onAddNote={addNote} canReopen={hasPermission('canReopenTask')} canUnblock={hasPermission('canUnblockTask')} currentUserId={user?.id} currentUser={user} />
              ))}
            </div>
          )}
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className={createType === 'incidencia' ? 'text-red-500' : ''}>
                {createType === 'extra' ? 'Nueva Tarea Extra' : createType === 'specific' ? 'Nueva Tarea Específica' : 'Nueva Incidencia'}
              </DialogTitle>
            </DialogHeader>

            {createType === 'incidencia' ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Título *</Label><Input placeholder="Resumen de la incidencia" value={incidenciaForm.title} onChange={(e) => setIncidenciaForm({ ...incidenciaForm, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>Descripción detallada *</Label><Textarea placeholder="Describe el problema..." value={incidenciaForm.description} onChange={(e) => setIncidenciaForm({ ...incidenciaForm, description: e.target.value })} rows={4} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Departamento</Label><Select value={incidenciaForm.department} onValueChange={(v) => setIncidenciaForm({ ...incidenciaForm, department: v as Department })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allDepartments.map((dept) => (<SelectItem key={dept} value={dept}>{dept.replace(/_/g, ' ')}</SelectItem>))}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Prioridad</Label><Select value={incidenciaForm.priority} onValueChange={(v) => setIncidenciaForm({ ...incidenciaForm, priority: v as TaskPriority })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={TaskPriority.LOW}>Baja</SelectItem><SelectItem value={TaskPriority.MEDIUM}>Media</SelectItem><SelectItem value={TaskPriority.HIGH}>Alta</SelectItem><SelectItem value={TaskPriority.CRITICAL}>Crítica</SelectItem></SelectContent></Select></div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                  <Button className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white" onClick={() => { if (user) { createIncidencia({ title: incidenciaForm.title, description: incidenciaForm.description, targetDepartment: incidenciaForm.department, priority: incidenciaForm.priority, reportedBy: user.id }); } setIsCreateModalOpen(false); }} disabled={!incidenciaForm.title || !incidenciaForm.description}>Reportar Incidencia</Button>
                </div>
              </div>
            ) : (
              <TaskFormModal createType={createType} taskForm={taskForm} setTaskForm={setTaskForm} newSubtaskTitle={newSubtaskTitle} setNewSubtaskTitle={setNewSubtaskTitle} allDepartments={allDepartments} supervisorsByDepartment={supervisorsByDepartment} calculatedDueDate={calculatedDueDateTime.date} calculatedDueTime={calculatedDueDateTime.time} onCancel={() => setIsCreateModalOpen(false)} currentUserId={user?.id} onSubmit={() => { if (user) { createTask({ title: taskForm.title, description: taskForm.description, department: taskForm.department, priority: taskForm.priority, dueDate: calculatedDueDateTime.date, dueTime: calculatedDueDateTime.time, assignedTo: taskForm.assignedTo.length > 0 ? taskForm.assignedTo : [user.id], createdBy: user.id, status: TaskStatus.PENDING, type: createType === 'extra' ? TaskType.EXTRA : TaskType.SPECIFIC, supervisorId: taskForm.supervisor || undefined, requiresPhoto: taskForm.requiresPhoto, startTime: taskForm.startTime, estimatedMinutes: taskForm.estimatedHours, subtasks: taskForm.subtasks, shiftIds: taskForm.selectedShifts, supportUserIds: taskForm.supportUsers }); } setIsCreateModalOpen(false); }} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

interface TaskFormModalProps {
  createType: 'extra' | 'specific';
  taskForm: { title: string; description: string; department: Department; priority: TaskPriority; startDate: string; startTime: string; estimatedHours: number; supervisor: string; assignedTo: string[]; requiresPhoto: boolean; subtasks: { id: string; title: string; completed: boolean }[]; selectedShifts: string[]; supportDepartment: Department | ''; supportUsers: string[]; };
  setTaskForm: React.Dispatch<React.SetStateAction<TaskFormModalProps['taskForm']>>;
  newSubtaskTitle: string;
  setNewSubtaskTitle: React.Dispatch<React.SetStateAction<string>>;
  allDepartments: Department[];
  supervisorsByDepartment: { id: string; name: string; position: string; role: string }[];
  calculatedDueDate: string;
  calculatedDueTime: string;
  onCancel: () => void;
  onSubmit: () => void;
  currentUserId?: string;
}

function TaskFormModal({ createType, taskForm, setTaskForm, newSubtaskTitle, setNewSubtaskTitle, allDepartments, supervisorsByDepartment, calculatedDueDate, calculatedDueTime, onCancel, onSubmit, currentUserId }: TaskFormModalProps) {
  const availableSupervisors = useMemo(() => {
    let filtered = supervisorsByDepartment.filter((s) => s.id !== currentUserId);
    const currentUser = users.find((u) => u.id === currentUserId);
    if (currentUser?.role === 'GERENTE_OPERACIONES') filtered = supervisorsByDepartment;
    return filtered;
  }, [supervisorsByDepartment, currentUserId]);

  const usersByDepartment = useMemo(() => users.filter((u) => u.department === taskForm.department && u.isActive && u.id !== currentUserId), [taskForm.department, currentUserId]);

  return (
    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-2"><Label>Título *</Label><Input placeholder="Nombre de la tarea" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} /></div>
      <div className="space-y-2"><Label>Descripción</Label><Textarea placeholder="Describe la tarea..." value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={3} /></div>
      <div className="space-y-2"><Label>Departamento</Label><select value={taskForm.department} onChange={(e) => setTaskForm({ ...taskForm, department: e.target.value as Department })} className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white">{allDepartments.map((dept) => (<option key={dept} value={dept}>{dept.replace(/_/g, ' ')}</option>))}</select></div>
      <div className="space-y-2"><Label>Prioridad</Label><div className="grid grid-cols-4 gap-2">{[{ value: TaskPriority.LOW, label: 'Baja', color: 'bg-green-500' }, { value: TaskPriority.MEDIUM, label: 'Media', color: 'bg-blue-500' }, { value: TaskPriority.HIGH, label: 'Alta', color: 'bg-orange-500' }, { value: TaskPriority.CRITICAL, label: 'Crítica', color: 'bg-red-500' }].map((p) => (<button key={p.value} type="button" onClick={() => setTaskForm({ ...taskForm, priority: p.value })} className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-all', taskForm.priority === p.value ? `${p.color} text-white` : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{p.label}</button>))}</div></div>
      <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Fecha de inicio</Label><Input type="date" value={taskForm.startDate} onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })} /></div><div className="space-y-2"><Label>Hora de inicio (24h)</Label><Input type="time" value={taskForm.startTime} onChange={(e) => setTaskForm({ ...taskForm, startTime: e.target.value })} /></div></div>
      <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Tiempo estimado (minutos)</Label><Input type="number" min={5} max={10080} step={5} value={taskForm.estimatedHours} onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: parseInt(e.target.value) || 5 })} /><div className="text-xs text-slate-500">{Math.floor(taskForm.estimatedHours / 60)}h {taskForm.estimatedHours % 60}min</div></div><div className="space-y-2"><Label>Fecha límite (calculada)</Label><div className="flex items-center gap-2 bg-slate-100 rounded-md px-3 py-2 border border-slate-200"><span className="text-slate-700">{calculatedDueDate}</span><span className="text-slate-400">•</span><span className="text-slate-700">{calculatedDueTime}</span></div></div></div>
      <div className="space-y-2"><Label>Supervisor</Label><div className="space-y-2"><button type="button" onClick={() => setTaskForm({ ...taskForm, supervisor: '' })} className={cn('w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-all', taskForm.supervisor === '' ? 'bg-corporate text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>Sin supervisor</button>{availableSupervisors.length > 0 ? availableSupervisors.map((supervisor) => (<button key={supervisor.id} type="button" onClick={() => setTaskForm({ ...taskForm, supervisor: supervisor.id })} className={cn('w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-all flex items-center justify-between', taskForm.supervisor === supervisor.id ? 'bg-corporate text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}><span>{supervisor.name}</span><span className="text-xs opacity-75">{supervisor.position}</span></button>)) : <p className="text-sm text-slate-500 p-2">No hay supervisores disponibles para este departamento</p>}</div><p className="text-xs text-slate-400">Nota: Un supervisor/gerente no puede supervisarse a sí mismo. El gerente de operaciones supervisa a los demás.</p></div>
      <div className="space-y-2"><Label>Asignar a (Usuarios del departamento)</Label><div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">{usersByDepartment.length > 0 ? usersByDepartment.map((user) => (<label key={user.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"><input type="checkbox" checked={taskForm.assignedTo.includes(user.id)} onChange={(e) => { if (e.target.checked) { setTaskForm({ ...taskForm, assignedTo: [...taskForm.assignedTo, user.id] }); } else { setTaskForm({ ...taskForm, assignedTo: taskForm.assignedTo.filter((id) => id !== user.id) }); } }} className="w-4 h-4 rounded border-slate-300" /><div className="flex-1"><div className="font-medium text-sm">{user.name}</div><div className="text-xs text-slate-500">{user.position} - {user.role.replace(/_/g, ' ')}</div></div></label>)) : <p className="text-sm text-slate-500 p-2">No hay usuarios disponibles en este departamento</p>}</div></div>
      <div className="space-y-2"><Label>Asignar a (Turnos, responsabilidades y usuarios)</Label><div className="space-y-3 max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-2">{shifts.filter((s) => s.department === taskForm.department && s.name !== 'Libre').map((shift) => (<div key={shift.id} className="border-b border-slate-100 last:border-0 pb-2 last:pb-0"><div className="font-medium text-sm text-slate-700 mb-1">{shift.name} ({shift.startTime} - {shift.endTime})</div>{shift.requirements && shift.requirements.length > 0 && (<div className="space-y-2 pl-2">{shift.requirements.map((req, idx) => { const assignedUsers = shiftAssignments.filter((a) => a.shiftId === shift.id && a.role === req.role); return (<div key={idx} className="space-y-1"><div className="text-xs font-medium text-slate-500">{req.count} {req.role.replace(/_/g, ' ').toLowerCase()}:</div>{assignedUsers.length > 0 ? (<div className="space-y-1 pl-2">{assignedUsers.map((assignment) => { const user = users.find((u) => u.id === assignment.userId); const roleKey = `${shift.id}-${req.role}-${assignment.userId}`; const isSelected = taskForm.selectedShifts.includes(roleKey); return user ? (<label key={assignment.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer"><input type="checkbox" checked={isSelected} onChange={(e) => { if (e.target.checked) { setTaskForm({ ...taskForm, selectedShifts: [...taskForm.selectedShifts, roleKey] }); } else { setTaskForm({ ...taskForm, selectedShifts: taskForm.selectedShifts.filter((id) => id !== roleKey) }); } }} className="w-4 h-4 rounded border-slate-300" /><span className="text-sm">{user.name} - {user.position}</span></label>) : null; })}</div>) : (<p className="text-xs text-slate-400 pl-2">Sin usuarios asignados</p>)}</div>); })}</div>)}{(!shift.requirements || shift.requirements.length === 0) && (<p className="text-xs text-slate-400 pl-2">Sin requisitos definidos</p>)}</div>))}{shifts.filter((s) => s.department === taskForm.department && s.name !== 'Libre').length === 0 && (<p className="text-sm text-slate-500 p-2">No hay turnos disponibles para este departamento</p>)}</div></div>
      <div className="space-y-2"><Label>Solicitar apoyo (Otros departamentos)</Label><select value={taskForm.supportDepartment} onChange={(e) => setTaskForm({ ...taskForm, supportDepartment: e.target.value as Department | '', supportUsers: [] })} className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white"><option value="">Seleccionar departamento...</option>{allDepartments.filter((d) => d !== taskForm.department).map((dept) => (<option key={dept} value={dept}>{dept.replace(/_/g, ' ')}</option>))}</select>{taskForm.supportDepartment && (<div className="space-y-2 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 mt-2"><div className="text-xs font-medium text-slate-500 mb-1">Usuarios disponibles:</div>{users.filter((u) => u.department === taskForm.supportDepartment && u.isActive).map((user) => (<label key={user.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"><input type="checkbox" checked={taskForm.supportUsers.includes(user.id)} onChange={(e) => { if (e.target.checked) { setTaskForm({ ...taskForm, supportUsers: [...taskForm.supportUsers, user.id] }); } else { setTaskForm({ ...taskForm, supportUsers: taskForm.supportUsers.filter((id) => id !== user.id) }); } }} className="w-4 h-4 rounded border-slate-300" /><div className="flex-1"><div className="font-medium text-sm">{user.name}</div><div className="text-xs text-slate-500">{user.position} - {user.role.replace(/_/g, ' ')}</div></div></label>))}{users.filter((u) => u.department === taskForm.supportDepartment && u.isActive).length === 0 && (<p className="text-sm text-slate-500 p-2">No hay usuarios disponibles</p>)}</div>)}</div>
      <div className="flex items-center gap-2"><input type="checkbox" id="requiresPhoto" checked={taskForm.requiresPhoto} onChange={(e) => setTaskForm({ ...taskForm, requiresPhoto: e.target.checked })} className="w-4 h-4 rounded border-slate-300" /><Label htmlFor="requiresPhoto" className="cursor-pointer text-sm">Requiere foto para completar</Label></div>
      <div className="space-y-2"><Label>Subtareas</Label><div className="flex gap-2"><Input placeholder="Nueva subtarea..." value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newSubtaskTitle.trim()) { setTaskForm({ ...taskForm, subtasks: [...taskForm.subtasks, { id: generateId(), title: newSubtaskTitle.trim(), completed: false }] }); setNewSubtaskTitle(''); } }} /><Button type="button" variant="outline" onClick={() => { if (newSubtaskTitle.trim()) { setTaskForm({ ...taskForm, subtasks: [...taskForm.subtasks, { id: generateId(), title: newSubtaskTitle.trim(), completed: false }] }); setNewSubtaskTitle(''); } }}><Plus className="w-4 h-4" /></Button></div>{taskForm.subtasks.length > 0 && (<div className="space-y-2 mt-2">{taskForm.subtasks.map((subtask) => (<div key={subtask.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded"><input type="checkbox" checked={subtask.completed} onChange={() => { setTaskForm({ ...taskForm, subtasks: taskForm.subtasks.map((s) => s.id === subtask.id ? { ...s, completed: !s.completed } : s) }); }} className="w-4 h-4" /><span className={cn('text-sm flex-1', subtask.completed && 'line-through text-slate-400')}>{subtask.title}</span><button type="button" onClick={() => { setTaskForm({ ...taskForm, subtasks: taskForm.subtasks.filter((s) => s.id !== subtask.id) }); }} className="text-red-500 hover:text-red-700 px-2">×</button></div>))}</div>)}</div>
      <div className="flex justify-end gap-3 pt-4"><Button variant="outline" onClick={onCancel}>Cancelar</Button><Button className={createType === 'extra' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'} onClick={onSubmit} disabled={!taskForm.title}>Crear Tarea</Button></div>
    </div>
  );
}


interface TaskCardProps {
  task: Task;
  onStatusChange?: (taskId: string, status: TaskStatus, reason?: string) => void;
  onComplete?: (taskId: string) => void;
  onReopen?: (taskId: string) => void;
  onAddNote?: (taskId: string, content: string, userId: string) => void;
  canReopen?: boolean;
  canUnblock?: boolean;
  currentUserId?: string;
  currentUser?: { id: string; name: string; role: Role; department: Department } | null;
}

function TaskCard({ task, onStatusChange, onComplete, onReopen, onAddNote, canReopen, canUnblock, currentUserId, currentUser }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [unblockReason, setUnblockReason] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [localSubtasks, setLocalSubtasks] = useState(task.subtasks);
  const statusColor = getStatusColor(task.status);
  const priorityColor = getPriorityColor(task.priority);
  
  const creator = users.find((u) => u.id === task.createdBy);
  const creatorName = creator?.name || task.createdBy;
  const supervisor = task.supervisorId ? users.find((u) => u.id === task.supervisorId) : null;
  const supervisorName = supervisor?.name || 'Sin supervisor';
  const assignees = task.assignedTo.map((id) => { const user = users.find((u) => u.id === id); return user?.name || id; });
  const assignedShifts = task.shiftIds?.map((id) => shifts.find((s) => s.id === id)).filter(Boolean) || [];
  const canComplete = currentUserId && task.assignedTo.includes(currentUserId);
  const canVerify = currentUserId && (task.supervisorId === currentUserId || currentUser?.role === Role.GERENTE_DEPARTAMENTO || currentUser?.role === Role.SUPERVISOR || currentUser?.role === Role.GERENTE_OPERACIONES || currentUser?.role === Role.RRHH || currentUser?.role === Role.DIRECTOR || currentUser?.role === Role.DIRECTOR_GENERAL);
  const toggleSubtask = (subtaskId: string) => { setLocalSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? { ...s, completed: !s.completed } : s))); };

  return (
    <div className={cn('bg-white rounded-xl border border-[#E5E5E7] overflow-hidden transition-all', expanded && 'shadow-lg')}>
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 flex items-start gap-3 text-left">
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColor }} />
          <span className="text-[10px] font-medium text-[#86868B] whitespace-nowrap">{getStatusLabel(task.status)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-[#1D1D1F] truncate">{task.title}</h4>
            <Badge style={{ backgroundColor: priorityColor, color: '#fff' }} className="text-xs flex-shrink-0">{getPriorityLabel(task.priority)}</Badge>
          </div>
          <p className="text-sm text-[#86868B] mt-1 line-clamp-2">{task.description}</p>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <div className="flex -space-x-2">
              {task.assignedTo.slice(0, 10).map((userId, i) => {
                const assignedUser = users.find((u) => u.id === userId);
                return (<Avatar key={i} className="w-6 h-6 border-2 border-white" title={assignedUser?.name || userId}><AvatarFallback className="bg-corporate text-white text-[10px]">{assignedUser ? getInitials(assignedUser.name) : '?'}</AvatarFallback></Avatar>);
              })}
              {task.assignedTo.length > 10 && (<div className="w-6 h-6 rounded-full bg-[#F5F5F7] border-2 border-white flex items-center justify-center text-[10px] text-[#86868B]">+{task.assignedTo.length - 10}</div>)}
            </div>
            <div className="flex items-center gap-1 text-xs text-[#86868B]"><Calendar className="w-3.5 h-3.5" /><span>{formatDateShort(task.dueDate)}</span>{task.dueTime && <span>• {task.dueTime}</span>}{task.status === TaskStatus.OVERDUE && (<Badge variant="outline" className="text-[10px] border-[#FF3B30] text-[#FF3B30] ml-1">ATRASADA</Badge>)}</div>
            {task.subtasks.length > 0 && (<div className="flex items-center gap-1 text-xs text-[#86868B]"><CheckCircle2 className="w-3.5 h-3.5" /><span>{task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}</span></div>)}
            {task.requiresPhoto && (<div className="flex items-center gap-1 text-xs text-[#86868B]"><span>📷</span><span>{task.photos.length}</span></div>)}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#E5E5E7]">
          <div className="py-4 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-[#86868B]">Creada por:</span> <span className="text-[#1D1D1F] font-medium">{creatorName}</span>{creator && <span className="text-[#86868B] text-xs ml-1">({creator.department.replace(/_/g, ' ')})</span>}</div>
              <div><span className="text-[#86868B]">Departamento:</span> <span className="text-[#1D1D1F]">{task.department.replace(/_/g, ' ')}</span></div>
              {task.startTime && (<div><span className="text-[#86868B]">Hora inicio:</span> <span className="text-[#1D1D1F]">{task.startTime}</span></div>)}
              {task.estimatedMinutes && (<div><span className="text-[#86868B]">Tiempo estimado:</span> <span className="text-[#1D1D1F]">{Math.floor(task.estimatedMinutes / 60)}h {task.estimatedMinutes % 60}min</span></div>)}
              <div><span className="text-[#86868B]">Fecha límite:</span> <span className="text-[#1D1D1F]">{formatDateShort(task.dueDate)}</span>{task.dueTime && <span className="text-[#1D1D1F]"> • {task.dueTime}</span>}</div>
            </div>
            <div className="text-sm bg-blue-50 rounded-lg p-2"><span className="text-blue-600 font-medium">Supervisor:</span> <span className="text-[#1D1D1F]">{supervisorName}</span>{supervisor && <span className="text-[#86868B] text-xs ml-1">({supervisor.position})</span>}</div>
            {assignees.length > 0 && (<div className="text-sm"><span className="text-[#86868B]">Asignados:</span> <span className="text-[#1D1D1F] font-medium">{assignees.join(', ')}</span></div>)}
            {assignedShifts.length > 0 && (<div className="text-sm"><span className="text-[#86868B]">Turnos:</span> <span className="text-[#1D1D1F]">{assignedShifts.map((s) => `${s?.name} (${s?.startTime}-${s?.endTime})`).join(', ')}</span></div>)}
            <div className="bg-[#F5F5F7] rounded-lg p-3"><h5 className="text-sm font-medium text-[#1D1D1F] mb-2">Descripción</h5><p className="text-sm text-[#1D1D1F] whitespace-pre-wrap">{task.description || 'Sin descripción'}</p></div>
            {localSubtasks.length > 0 && (<div className="space-y-2"><h5 className="text-sm font-medium text-[#1D1D1F]">Subtareas</h5><div className="space-y-1">{localSubtasks.map((subtask) => (<div key={subtask.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded" onClick={() => toggleSubtask(subtask.id)}><div className={cn('w-4 h-4 rounded border flex items-center justify-center', subtask.completed ? 'bg-[#34C759] border-[#34C759]' : 'border-[#C7C7CC]')}>{subtask.completed && <CheckCircle2 className="w-3 h-3 text-white" />}</div><span className={cn('text-sm', subtask.completed ? 'text-[#86868B] line-through' : 'text-[#1D1D1F]')}>{subtask.title}</span></div>))}</div></div>)}
            <div className="space-y-2"><h5 className="text-sm font-medium text-[#1D1D1F]">Fotos</h5>{task.photos.length > 0 ? (<div className="flex flex-wrap gap-2">{task.photos.map((photo, idx) => (<div key={idx} className="w-20 h-20 rounded-lg bg-[#F5F5F7] flex items-center justify-center border border-[#E5E5E7] overflow-hidden">{photo.startsWith('http') ? <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-[#86868B]" />}</div>))}</div>) : <p className="text-sm text-[#86868B]">No hay fotos</p>}</div>
            {task.history.length > 0 && (<div className="space-y-2"><h5 className="text-sm font-medium text-[#1D1D1F]">Historial</h5><div className="space-y-1 text-sm max-h-40 overflow-y-auto bg-[#F5F5F7] rounded-lg p-3">{task.history.map((h) => (<div key={h.id} className="flex items-start gap-2 text-[#86868B]"><span>•</span><div className="flex-1"><span>{h.action}</span>{h.note && <span className="text-xs block text-[#1D1D1F]">{h.note}</span>}</div><span className="text-xs whitespace-nowrap">{formatRelativeTime(h.performedAt)}</span></div>))}</div></div>)}
            <div className="space-y-2 pt-2 border-t border-[#E5E5E7]">
              <div className="flex items-center justify-between"><h5 className="text-sm font-medium text-[#1D1D1F]">Notas</h5><button onClick={() => setShowNoteInput(!showNoteInput)} className="text-xs text-blue-600 hover:text-blue-700">{showNoteInput ? 'Cancelar' : 'Agregar nota'}</button></div>
              {showNoteInput && (<div className="flex gap-2"><Input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Escribe una nota..." className="flex-1 text-sm" /><Button size="sm" onClick={() => { if (newNote.trim() && currentUserId) { onAddNote?.(task.id, newNote, currentUserId); setNewNote(''); setShowNoteInput(false); } }} disabled={!newNote.trim()}>Guardar</Button></div>)}
              <div className="space-y-2 max-h-40 overflow-y-auto">{task.notes.length > 0 ? (task.notes.map((note) => { const noteAuthor = users.find((u) => u.id === note.createdBy); return (<div key={note.id} className="bg-[#F5F5F7] rounded-lg p-3 text-sm"><p className="text-[#1D1D1F] whitespace-pre-wrap">{note.content}</p><p className="text-xs text-[#86868B] mt-1">{noteAuthor?.name || note.createdBy} • {formatRelativeTime(note.createdAt)}</p></div>); })) : (<p className="text-sm text-[#86868B] italic">No hay notas</p>)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-[#E5E5E7] flex-wrap">
            {task.status === TaskStatus.PENDING && canComplete && (<Button size="sm" className="bg-[#007AFF] hover:bg-[#007AFF]/90 text-white" onClick={() => onStatusChange?.(task.id, TaskStatus.IN_PROGRESS)}>En Progreso</Button>)}
            {task.status === TaskStatus.IN_PROGRESS && canComplete && (<Button size="sm" className="bg-[#34C759] hover:bg-[#34C759]/90 text-white" onClick={() => setShowCompleteConfirm(true)}>Completar</Button>)}
            {task.status === TaskStatus.COMPLETED && canVerify && (<><Button size="sm" className="bg-[#5856D6] hover:bg-[#5856D6]/90 text-white" onClick={() => onStatusChange?.(task.id, TaskStatus.VERIFIED)}>Verificar</Button>{canReopen && (<Button size="sm" variant="outline" onClick={() => setShowReopenModal(true)}>Marcar como Pendiente</Button>)}</>)}
            {task.status === TaskStatus.BLOCKED && canUnblock && (<Button size="sm" className="bg-[#FF9500] hover:bg-[#FF9500]/90 text-white" onClick={() => setShowUnblockModal(true)}>Desbloquear</Button>)}
            {(task.status === TaskStatus.PENDING || task.status === TaskStatus.IN_PROGRESS) && canComplete && (<Button size="sm" variant="outline" onClick={() => onStatusChange?.(task.id, TaskStatus.BLOCKED, 'Tarea bloqueada por el usuario')}>Bloquear</Button>)}
          </div>

          {showCompleteConfirm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4"><h3 className="text-lg font-semibold mb-2">¿Completar tarea?</h3><p className="text-sm text-slate-600 mb-4">¿Confirmas que la tarea "{task.title}" fue completada correctamente?</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCompleteConfirm(false)}>Cancelar</Button><Button className="bg-[#34C759] hover:bg-[#34C759]/90 text-white" onClick={() => { onComplete?.(task.id); setShowCompleteConfirm(false); }}>Sí, completar</Button></div></div></div>)}
          {showReopenModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4"><h3 className="text-lg font-semibold mb-2">Marcar como Pendiente</h3><p className="text-sm text-slate-600 mb-4">Indica el motivo por el cual la tarea debe volver a pendiente:</p><textarea value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="Escribe el motivo..." className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-sm" rows={3} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowReopenModal(false)}>Cancelar</Button><Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => { if (reopenReason.trim()) { onReopen?.(task.id); setShowReopenModal(false); setReopenReason(''); } }} disabled={!reopenReason.trim()}>Marcar como Pendiente</Button></div></div></div>)}
          {showUnblockModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4"><h3 className="text-lg font-semibold mb-2">Desbloquear Tarea</h3><p className="text-sm text-slate-600 mb-4">Indica el motivo por el cual se desbloquea la tarea:</p><textarea value={unblockReason} onChange={(e) => setUnblockReason(e.target.value)} placeholder="Escribe el motivo del desbloqueo..." className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-sm" rows={3} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowUnblockModal(false)}>Cancelar</Button><Button className="bg-[#FF9500] hover:bg-[#FF9500]/90 text-white" onClick={() => { if (unblockReason.trim()) { onStatusChange?.(task.id, TaskStatus.PENDING, unblockReason); setShowUnblockModal(false); setUnblockReason(''); } }} disabled={!unblockReason.trim()}>Desbloquear</Button></div></div></div>)}
        </div>
      )}
    </div>
  );
}


interface IncidenciaCardProps {
  incidencia: Incidencia;
  currentUserId?: string;
  currentUser?: { id: string; name: string; role: Role } | null;
  onConfirmIncidencia?: (id: string, userId: string) => void;
  onResolveIncidencia?: (id: string, userId: string, resolution?: string) => void;
  onCloseIncidencia?: (id: string, userId: string, reason?: string) => void;
  onReopenIncidencia?: (id: string, userId: string, reason?: string) => void;
  onAddNote?: (id: string, content: string, userId: string) => void;
}

function IncidenciaCard({ incidencia, currentUserId, currentUser, onConfirmIncidencia, onResolveIncidencia, onCloseIncidencia, onReopenIncidencia, onAddNote }: IncidenciaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [resolution, setResolution] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  
  const statusColor = getIncidenciaStatusColor(incidencia.status);
  const priorityColor = getPriorityColor(incidencia.priority);
  const reporter = users.find((u) => u.id === incidencia.reportedBy);
  
  const canConfirm = currentUser && (currentUser.role === Role.GERENTE_DEPARTAMENTO || currentUser.role === Role.SUPERVISOR || currentUser.role === Role.GERENTE_OPERACIONES || currentUser.role === Role.RRHH || currentUser.role === Role.DIRECTOR || currentUser.role === Role.DIRECTOR_GENERAL);
  const canResolve = currentUser && incidencia.status === IncidenciaStatus.VERIFIED && (currentUser.role === Role.GERENTE_DEPARTAMENTO || currentUser.role === Role.SUPERVISOR || currentUser.role === Role.GERENTE_OPERACIONES || currentUser.role === Role.RRHH || currentUser.role === Role.DIRECTOR || currentUser.role === Role.DIRECTOR_GENERAL);
  const canClose = currentUser && incidencia.status === IncidenciaStatus.RESOLVED && (currentUser.role === Role.GERENTE_DEPARTAMENTO || currentUser.role === Role.SUPERVISOR || currentUser.role === Role.GERENTE_OPERACIONES || currentUser.role === Role.RRHH || currentUser.role === Role.DIRECTOR || currentUser.role === Role.DIRECTOR_GENERAL);

  return (
    <>
      <div className={cn('bg-white rounded-xl border border-[#E5E5E7] overflow-hidden transition-all', expanded && 'shadow-lg')}>
        <button onClick={() => setExpanded(!expanded)} className="w-full p-4 flex items-start gap-3 text-left">
          <Badge style={{ backgroundColor: priorityColor, color: '#fff' }} className="text-xs flex-shrink-0">{getPriorityLabel(incidencia.priority)}</Badge>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-[#1D1D1F] truncate">{incidencia.title}</h4>
              <Badge style={{ backgroundColor: statusColor, color: '#fff' }} className="text-xs flex-shrink-0">{getIncidenciaStatusLabel(incidencia.status)}</Badge>
            </div>
            <p className="text-sm text-[#86868B] line-clamp-2 mt-1">{incidencia.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-[#86868B]">
              <span>Reportado por: {reporter?.name || incidencia.reportedBy}</span><span>•</span><span>{incidencia.targetDepartment}</span><span>•</span><span>{formatRelativeTime(incidencia.createdAt)}</span>
            </div>
          </div>
          <div className="text-[#86868B]">{expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 border-t border-[#E5E5E7]">
            <div className="py-4 space-y-4">
              <div className="bg-[#F5F5F7] rounded-lg p-3"><p className="text-sm text-[#1D1D1F] whitespace-pre-wrap">{incidencia.description}</p></div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2"><UserCircle className="w-4 h-4 text-[#86868B]" /><span className="text-[#86868B]">Reportado por:</span><span className="text-[#1D1D1F] font-medium">{reporter?.name || incidencia.reportedBy}</span></div>
                <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-[#86868B]" /><span className="text-[#86868B]">Departamento:</span><span className="text-[#1D1D1F] font-medium">{incidencia.targetDepartment}</span></div>
                {incidencia.confirmedBy && (<div className="flex items-center gap-2"><CheckSquare className="w-4 h-4 text-[#5856D6]" /><span className="text-[#86868B]">Verificado por:</span><span className="text-[#1D1D1F] font-medium">{users.find(u => u.id === incidencia.confirmedBy)?.name || incidencia.confirmedBy}</span></div>)}
                {incidencia.resolvedBy && (<div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#34C759]" /><span className="text-[#86868B]">Resuelto por:</span><span className="text-[#1D1D1F] font-medium">{users.find(u => u.id === incidencia.resolvedBy)?.name || incidencia.resolvedBy}</span></div>)}
                {incidencia.closedBy && (<div className="flex items-center gap-2"><Lock className="w-4 h-4 text-[#8E8E93]" /><span className="text-[#86868B]">Cerrado por:</span><span className="text-[#1D1D1F] font-medium">{users.find(u => u.id === incidencia.closedBy)?.name || incidencia.closedBy}</span></div>)}
                {incidencia.reopenedBy && (<div className="flex items-center gap-2"><Unlock className="w-4 h-4 text-[#007AFF]" /><span className="text-[#86868B]">Reabierto por:</span><span className="text-[#1D1D1F] font-medium">{users.find(u => u.id === incidencia.reopenedBy)?.name || incidencia.reopenedBy}</span></div>)}
                {incidencia.reopenReason && (<div className="w-full bg-[#007AFF]/10 rounded-lg p-2 text-xs"><span className="text-[#007AFF] font-medium">Motivo de reapertura:</span><span className="text-[#1D1D1F] ml-1">{incidencia.reopenReason}</span></div>)}
              </div>
              {incidencia.history.length > 0 && (<div className="space-y-2"><div className="flex items-center gap-2"><History className="w-4 h-4 text-[#86868B]" /><h5 className="text-sm font-medium text-[#1D1D1F]">Historial</h5></div><div className="space-y-1 text-sm max-h-40 overflow-y-auto bg-[#F5F5F7] rounded-lg p-3">{incidencia.history.map((h) => (<div key={h.id} className="flex items-start gap-2 text-[#86868B]"><span>•</span><div className="flex-1"><span>{h.action}</span>{h.note && <span className="text-xs block text-[#1D1D1F]">{h.note}</span>}</div><span className="text-xs whitespace-nowrap">{formatRelativeTime(h.performedAt)}</span></div>))}</div></div>)}
              <div className="space-y-2"><div className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-[#86868B]" /><h5 className="text-sm font-medium text-[#1D1D1F]">Notas</h5></div>{incidencia.notes.length > 0 ? (<div className="space-y-2">{incidencia.notes.map((note) => { const noteAuthor = users.find((u) => u.id === note.createdBy); return (<div key={note.id} className="bg-[#F5F5F7] rounded-lg p-3"><p className="text-sm text-[#1D1D1F] whitespace-pre-wrap">{note.content}</p><div className="flex items-center gap-2 mt-2 text-xs text-[#86868B]"><span>{noteAuthor?.name || note.createdBy}</span><span>•</span><span>{formatRelativeTime(note.createdAt)}</span></div></div>); })}</div>) : (<p className="text-sm text-[#86868B] italic">No hay notas aún</p>)}{currentUserId && (<>{!showNoteInput ? (<Button size="sm" variant="outline" onClick={() => setShowNoteInput(true)} className="w-full"><Plus className="w-4 h-4 mr-1" />Agregar nota</Button>) : (<div className="flex gap-2"><Input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Escribe una nota..." className="flex-1" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (newNote.trim() && currentUserId) { onAddNote?.(incidencia.id, newNote, currentUserId); setNewNote(''); setShowNoteInput(false); } } }} /><Button size="sm" onClick={() => { if (newNote.trim() && currentUserId) { onAddNote?.(incidencia.id, newNote, currentUserId); setNewNote(''); setShowNoteInput(false); } }} disabled={!newNote.trim()}>Guardar</Button><Button size="sm" variant="outline" onClick={() => { setShowNoteInput(false); setNewNote(''); }}>Cancelar</Button></div>)}</>)}</div>
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-[#E5E5E7] flex-wrap">
              {(incidencia.status === IncidenciaStatus.NEW || incidencia.status === IncidenciaStatus.OPEN || incidencia.status === IncidenciaStatus.REOPENED) && canConfirm && (<Button size="sm" onClick={() => setShowConfirmModal(true)} className="bg-[#5856D6] hover:bg-[#5856D6]/90 text-white gap-1"><CheckSquare className="w-3.5 h-3.5" />Verificar</Button>)}
              {incidencia.status === IncidenciaStatus.VERIFIED && canResolve && (<Button size="sm" onClick={() => setShowResolveModal(true)} className="bg-[#34C759] hover:bg-[#34C759]/90 text-white gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Resolver</Button>)}
              {incidencia.status === IncidenciaStatus.RESOLVED && canClose && (<Button size="sm" onClick={() => setShowCloseModal(true)} className="bg-[#8E8E93] hover:bg-[#8E8E93]/90 text-white gap-1"><Lock className="w-3.5 h-3.5" />Cerrar</Button>)}
              {incidencia.status !== IncidenciaStatus.NEW && incidencia.status !== IncidenciaStatus.REOPENED && (<Button size="sm" variant="outline" onClick={() => setShowReopenModal(true)} className="gap-1 border-[#007AFF] text-[#007AFF] hover:bg-[#007AFF]/5"><Unlock className="w-3.5 h-3.5" />Reabrir</Button>)}
            </div>
          </div>
        )}
      </div>

      {showConfirmModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4"><h3 className="text-lg font-semibold mb-2">Confirmar Incidencia</h3><p className="text-sm text-slate-600 mb-4">¿Estás seguro de que deseas verificar esta incidencia?</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancelar</Button><Button className="bg-[#5856D6] hover:bg-[#5856D6]/90 text-white" onClick={() => { if (currentUserId) { onConfirmIncidencia?.(incidencia.id, currentUserId); setShowConfirmModal(false); } }}>Verificar</Button></div></div></div>)}
      {showResolveModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4"><h3 className="text-lg font-semibold mb-2">Resolver Incidencia</h3><p className="text-sm text-slate-600 mb-4">Describe cómo se resolvió la incidencia:</p><textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Escribe la resolución..." className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-sm" rows={4} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowResolveModal(false)}>Cancelar</Button><Button className="bg-[#34C759] hover:bg-[#34C759]/90 text-white" onClick={() => { if (currentUserId) { onResolveIncidencia?.(incidencia.id, currentUserId, resolution); setShowResolveModal(false); setResolution(''); } }} disabled={!resolution.trim()}>Resolver</Button></div></div></div>)}
      {showCloseModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4"><h3 className="text-lg font-semibold mb-2">Cerrar Incidencia</h3><p className="text-sm text-slate-600 mb-4">Escribe el motivo del cierre:</p><textarea value={closeReason} onChange={(e) => setCloseReason(e.target.value)} placeholder="Escribe el motivo..." className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-sm" rows={4} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCloseModal(false)}>Cancelar</Button><Button className="bg-[#8E8E93] hover:bg-[#8E8E93]/90 text-white" onClick={() => { if (currentUserId) { onCloseIncidencia?.(incidencia.id, currentUserId, closeReason); setShowCloseModal(false); setCloseReason(''); } }} disabled={!closeReason.trim()}>Cerrar</Button></div></div></div>)}
      {showReopenModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4"><h3 className="text-lg font-semibold mb-2">Reabrir Incidencia</h3><p className="text-sm text-slate-600 mb-4">Escribe el motivo de la reapertura:</p><textarea value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="Escribe el motivo..." className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-sm" rows={4} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowReopenModal(false)}>Cancelar</Button><Button className="bg-[#007AFF] hover:bg-[#007AFF]/90 text-white" onClick={() => { if (currentUserId) { onReopenIncidencia?.(incidencia.id, currentUserId, reopenReason); setShowReopenModal(false); setReopenReason(''); } }} disabled={!reopenReason.trim()}>Reabrir</Button></div></div></div>)}
    </>
  );
}
