// ═══════════════════════════════════════════════════════════════════
// TASKS MODULE - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Target, AlertCircle, User, Users, LayoutGrid, AlertTriangle,
  Search, List, LayoutTemplate, Calendar, CheckCircle2, Camera,
  ChevronUp, ChevronDown, UserCircle, Building2, CheckSquare,
  Lock, Unlock, History, MessageSquare, X, Image as ImageIcon,
  ThumbsDown, Clock, FileText, Zap,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { CameraCapture } from '@/components/CameraCapture';
import { EditTaskModal } from '@/components/EditTaskModal';
import { SpecificTaskForm } from '@/components/SpecificTaskForm';

import { useAuth } from '@/hooks/useFirestoreAuth';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useTasks } from '@/hooks/useTasks';
import {
  Task, TaskStatus, TaskPriority, TaskType, TimeFilter,
  IncidenciaStatus, Role, Incidencia, TaskRecurrence, TaskVigencia,
} from '@/types';
import {
  cn, getStatusColor, getPriorityColor, getPriorityLabel,
  getIncidenciaStatusColor, getIncidenciaStatusLabel,
  formatDateShort, formatDateWithYear, formatRelativeTime, formatHistoryDateTime, generateId,
} from '@/lib/utils';
import { useStorageUpload } from '@/hooks/firestore/useStorageUpload';
import { useFirestoreUsers } from '@/hooks/firestore/useFirestoreUsers';
import { useDynamicDepartments, normalizeDeptCode } from '@/hooks/firestore/useDynamicDepartments';
import { useFirestoreShifts } from '@/hooks/firestore/useFirestoreShifts';
import { useSpecificTaskTemplates } from '@/hooks/firestore/useSpecificTaskTemplates';
import { db } from '@/firebase-config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
  const getLocalDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const getLocalDateFromISO = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/UserAvatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Section } from '@/components/ui/Section';
import { toast } from 'sonner';


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
  const { user } = useAuth();
  const { effectiveUser, hasPermission } = useAppConfig();
  const { departmentCodes, departmentNames, departmentOptions, departmentTreeOptions, defaultDepartment, operationalDepartmentCodes, isOperationalDepartment, getDeptName, getDeptCode, getVisibleDepartmentCodes } = useDynamicDepartments();
  const { tasks, incidencias, getIncidenciaCounts, createTask, rateTask, createIncidencia, changeTaskStatus, reopenTask, addNote, addIncidenciaNote, addIncidenciaViewer, addIncidenciaPhoto, confirmIncidencia, resolveIncidencia, closeIncidencia, reopenIncidencia, toggleSubtask, addPhoto, deleteTask, updateTask } = useTasks();
  const { users } = useFirestoreUsers();
  const { shifts, assignments: shiftAssignments } = useFirestoreShifts();
  const { createTemplate, updateTemplate } = useSpecificTaskTemplates();

  const [mainTab, setMainTab] = useState<MainTab>('my-tasks');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(TimeFilter.TODAY);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | IncidenciaStatus | 'all'>(TaskStatus.PENDING);
  const [viewType, setViewType] = useState<ViewType>('list');
  const [incidenciaDepartmentFilter, setIncidenciaDepartmentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<'extra' | 'specific' | 'incidencia'>('extra');
  const [pendingReminderId, setPendingReminderId] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const allDepartments = departmentOptions;

  // Opciones jerárquicas de departamento disponibles en Tasks según rol/jerarquía
  const visibleTaskDeptTreeOptions = useMemo(() => {
    if (!effectiveUser) return departmentTreeOptions;
    const allowed = getVisibleDepartmentCodes(effectiveUser);
    return departmentTreeOptions.filter(d => allowed.includes(d.code));
  }, [departmentTreeOptions, effectiveUser, getVisibleDepartmentCodes]);

  // Opciones jerárquicas para el dropdown de incidencias
  const incidenciaDeptOptions = useMemo(() => {
    if (!effectiveUser) return departmentTreeOptions;
    let allowed = getVisibleDepartmentCodes(effectiveUser);
    // Fallback robusto para Gerente de Operaciones: si la jerarquía no devuelve nada, usar operacionales
    if (allowed.length === 0 && effectiveUser.role === Role.GERENTE_OPERACIONES && operationalDepartmentCodes.length > 0) {
      allowed = operationalDepartmentCodes;
    }
    return departmentTreeOptions.filter(d => allowed.includes(d.code));
  }, [departmentTreeOptions, effectiveUser, getVisibleDepartmentCodes, operationalDepartmentCodes]);

  const [taskForm, setTaskForm] = useState({
    title: '', description: '', department: defaultDepartment,
    priority: TaskPriority.MEDIUM, startDate: getLocalDate(),
    startTime: '09:00', estimatedHours: 60, supervisor: '', assignedTo: [] as string[],
    requiresPhoto: false, subtasks: [] as { id: string; title: string; completed: boolean }[],
    selectedShifts: [] as string[], supportDepartment: '' as string | '',
    supportUsers: [] as string[],
    recurrence: TaskRecurrence.NONE,
    photos: [] as string[],
  });
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const [specificTaskForm, setSpecificTaskForm] = useState({
    title: '',
    description: '',
    department: defaultDepartment,
    shiftIds: [] as string[],
    startTime: '08:00',
    estimatedMinutes: 60,
    priority: TaskPriority.MEDIUM,
    requiresPhoto: false,
    vigenciaDays: TaskVigencia.INDEFINIDO,
    subtasks: [] as { id: string; title: string; completed: boolean }[],
  });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const { users: firestoreUsersForSupervisors } = useFirestoreUsers();
  const supervisorsByDepartment = useMemo(() => {
    return firestoreUsersForSupervisors
      .filter((u) => normalizeDeptCode(u.department || '') === normalizeDeptCode(taskForm.department || '') &&
        (u.role === 'GERENTE_DEPARTAMENTO' || u.role === 'SUPERVISOR' || u.role === 'GERENTE_OPERACIONES'))
      .map((u) => ({ id: u.email || u.id, name: u.name, position: u.position, role: u.role }));
  }, [taskForm.department, firestoreUsersForSupervisors]);

  const calculatedDueDateTime = useMemo(() => {
    try {
      const start = new Date(`${taskForm.startDate}T${taskForm.startTime}`);
      const end = new Date(start.getTime() + taskForm.estimatedHours * 60 * 1000);
      // Usar hora local (no toISOString que devuelve UTC)
      const yr = end.getFullYear();
      const mo = String(end.getMonth() + 1).padStart(2, '0');
      const da = String(end.getDate()).padStart(2, '0');
      const hh = String(end.getHours()).padStart(2, '0');
      const mm = String(end.getMinutes()).padStart(2, '0');
      return { date: `${yr}-${mo}-${da}`, time: `${hh}:${mm}` };
    } catch (e) {
      return { date: taskForm.startDate, time: taskForm.startTime };
    }
  }, [taskForm.startDate, taskForm.startTime, taskForm.estimatedHours]);

  // Supervisor automático para tarea específica:
  // 1. Supervisor del dept que tenga el turno seleccionado asignado (publicado)
  // 2. Cualquier supervisor del dept
  // 3. Gerente del departamento
  // 4. Gerente de Operaciones (si el dept es operativo), RRHH, Director o Director General
  const specificTaskSupervisor = useMemo(() => {
    const deptCode = normalizeDeptCode(specificTaskForm.department || '');
    const deptUsers = users.filter((u) => normalizeDeptCode(u.department || '') === deptCode && u.isActive !== false);
    const selectedShiftIds = specificTaskForm.shiftIds || [];
    if (selectedShiftIds.length > 0) {
      const supervisorsWithShift = deptUsers.filter(
        (u) => u.role === Role.SUPERVISOR && shiftAssignments.some((a) => selectedShiftIds.includes(a.shiftId) && a.userId === u.id && a.status === 'PUBLICADO')
      );
      if (supervisorsWithShift.length > 0) return supervisorsWithShift[0].id;
    }
    const supervisor = deptUsers.find((u) => u.role === Role.SUPERVISOR);
    if (supervisor) return supervisor.id;
    const gerente = deptUsers.find((u) => u.role === Role.GERENTE_DEPARTAMENTO);
    if (gerente) return gerente.id;
    // Fallback a superiores
    const isOperational = isOperationalDepartment(specificTaskForm.department);
    const superior = users.find(
      (u) => u.isActive !== false && (
        u.role === Role.RRHH ||
        u.role === Role.DIRECTOR ||
        u.role === Role.DIRECTOR_GENERAL ||
        (isOperational && u.role === Role.GERENTE_OPERACIONES)
      )
    );
    return superior?.id || '';
  }, [users, specificTaskForm.department, specificTaskForm.shiftIds, shiftAssignments, isOperationalDepartment]);

  // Observadores de control para tarea específica: RRHH y Gerente de Operaciones
  const specificTaskNotifyOnDelay = useMemo(() => {
    return users
      .filter((u) => u.role === Role.RRHH || u.role === Role.GERENTE_OPERACIONES)
      .map((u) => u.id);
  }, [users]);

  // Turnos disponibles para el departamento seleccionado en tarea específica
  const shiftsForSpecificTask = useMemo(() => {
    return shifts.filter((s) => normalizeDeptCode(s.department || '') === normalizeDeptCode(specificTaskForm.department || '') && s.isActive !== false);
  }, [shifts, specificTaskForm.department]);

  // Hora límite calculada para tarea específica (solo informativa en el formulario)
  const specificTaskDueTime = useMemo(() => {
    try {
      const [hours, minutes] = specificTaskForm.startTime.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes + specificTaskForm.estimatedMinutes, 0, 0);
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch (e) {
      return specificTaskForm.startTime;
    }
  }, [specificTaskForm.startTime, specificTaskForm.estimatedMinutes]);

  // Nombre y rol del supervisor automático para mostrar en el formulario
  const specificTaskSupervisorName = useMemo(() => {
    const s = users.find((u) => u.id === specificTaskSupervisor);
    return s ? `${s.name} (${s.role.replace(/_/g, ' ')})` : '';
  }, [users, specificTaskSupervisor]);

  // Observadores de control (RRHH y Gerente de Operaciones) con nombre y rol
  const specificTaskObservers = useMemo(() => {
    return users
      .filter((u) => specificTaskNotifyOnDelay.includes(u.id))
      .map((u) => ({ name: u.name, role: u.role }));
  }, [users, specificTaskNotifyOnDelay]);

  
  const { uploadImage } = useStorageUpload();

  const handlePhotoCapture = async (file: File) => {
    try { const url = await uploadImage(file, 'incidencias/new'); setIncidenciaPhotos(prev => [...prev, url]); }
    catch (err) { console.error('Error:', err); }
  };
  const [incidenciaPhotos, setIncidenciaPhotos] = useState<string[]>([]);
  const [incidenciaForm, setIncidenciaForm] = useState<{ title: string; description: string; department: string; targetDepartments: string[]; priority: TaskPriority }>({
    title: '', description: '', department: defaultDepartment, targetDepartments: [] as string[], priority: TaskPriority.HIGH,
  });

  const markReminderConverted = async (reminderId: string, convertedId: string) => {
    if (!user?.id || !reminderId) return;
    try {
      await updateDoc(doc(db, 'notes', reminderId), {
        status: 'converted',
        convertedToTaskId: convertedId,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Recordatorio convertido en tarea');
    } catch (err) {
      console.error('Error al marcar recordatorio convertido:', err);
      toast.error('No se pudo actualizar el recordatorio');
    }
  };

  interface ReminderPrefill {
    title: string;
    description: string;
    subtasks: { id: string; title: string; completed: boolean }[];
    startDate?: string;
    priority: TaskPriority;
    imageUrl?: string;
  }

  const handleOpenModal = (type: 'extra' | 'specific' | 'incidencia', prefill?: ReminderPrefill) => {
    setCreateType(type);
    setTaskForm({
      title: prefill?.title || '',
      description: prefill?.description || '',
      department: defaultDepartment,
      priority: prefill?.priority || TaskPriority.MEDIUM,
      startDate: prefill?.startDate || getLocalDate(),
      startTime: '09:00', estimatedHours: 60, supervisor: '', assignedTo: [],
      requiresPhoto: false, subtasks: prefill?.subtasks || [], selectedShifts: [], supportDepartment: '', supportUsers: [],
      recurrence: TaskRecurrence.NONE,
      photos: prefill?.imageUrl ? [prefill.imageUrl] : [],
    });
    setSpecificTaskForm({
      title: prefill?.title || '',
      description: prefill?.description || '',
      department: defaultDepartment,
      shiftIds: [] as string[],
      startTime: '08:00',
      estimatedMinutes: 60,
      priority: prefill?.priority || TaskPriority.MEDIUM,
      requiresPhoto: false,
      vigenciaDays: TaskVigencia.INDEFINIDO,
      subtasks: prefill?.subtasks || [],
    });
    setEditingTemplateId(null);
    setIncidenciaForm({ title: '', description: '', department: defaultDepartment, targetDepartments: [], priority: TaskPriority.HIGH });
    setIsCreateModalOpen(true);
  };

  // Resetear reminder pendiente si se cierra el modal sin convertir
  useEffect(() => {
    if (!isCreateModalOpen && pendingReminderId) {
      setPendingReminderId(null);
    }
  }, [isCreateModalOpen]);

  // Abrir modal de creación desde query param (FAB global)
  useEffect(() => {
    const create = searchParams.get('create');
    const reminderId = searchParams.get('reminderId');
    if (create === 'extra' || create === 'specific' || create === 'incidencia') {
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      next.delete('reminderId');
      setSearchParams(next, { replace: true });

      if (reminderId) {
        setPendingReminderId(reminderId);
        getDoc(doc(db, 'notes', reminderId)).then((snap) => {
          if (!snap.exists()) {
            handleOpenModal(create);
            return;
          }
          const data = snap.data();
          const items = (data.items || []).map((item: any) => ({
            id: item.id || Math.random().toString(36).substr(2, 9),
            title: item.text || '',
            completed: !!item.completed,
          }));
          const description = data.notes || '';
          const dueDate = data.dueDate || getLocalDate();
          const isUrgent = !!data.isUrgent;
          const priority = isUrgent ? TaskPriority.HIGH : TaskPriority.MEDIUM;

          handleOpenModal(create, {
            title: data.title || '',
            description,
            subtasks: items,
            startDate: dueDate,
            priority,
            imageUrl: data.imageUrl || '',
          });
        }).catch((err) => {
          console.error('Error al precargar recordatorio:', err);
          handleOpenModal(create);
        });
      } else {
        handleOpenModal(create);
      }
    }
  }, [searchParams]);

  const handleSubmitSpecificTask = async () => {
    if (!user?.id) return;
    if (!specificTaskForm.title.trim() || specificTaskForm.shiftIds.length === 0) {
      toast.error('Completa el título y selecciona al menos un turno');
      return;
    }
    if (!specificTaskSupervisor) {
      toast.error('No se encontró un supervisor o gerente para el departamento seleccionado');
      return;
    }
    try {
      if (editingTemplateId) {
        await updateTemplate(editingTemplateId, {
          title: specificTaskForm.title.trim(),
          description: specificTaskForm.description.trim(),
          department: specificTaskForm.department,
          shiftIds: specificTaskForm.shiftIds,
          startTime: specificTaskForm.startTime,
          estimatedMinutes: specificTaskForm.estimatedMinutes,
          priority: specificTaskForm.priority,
          supervisorId: specificTaskSupervisor,
          notifyOnDelay: specificTaskNotifyOnDelay,
          requiresPhoto: specificTaskForm.requiresPhoto,
          vigenciaDays: specificTaskForm.vigenciaDays === TaskVigencia.INDEFINIDO ? null : specificTaskForm.vigenciaDays,
          subtasks: specificTaskForm.subtasks,
        });
        toast.success('Plantilla de tarea específica actualizada.');
      } else {
        const templateId = await createTemplate({
          title: specificTaskForm.title.trim(),
          description: specificTaskForm.description.trim(),
          department: specificTaskForm.department,
          shiftIds: specificTaskForm.shiftIds,
          startTime: specificTaskForm.startTime,
          estimatedMinutes: specificTaskForm.estimatedMinutes,
          priority: specificTaskForm.priority,
          supervisorId: specificTaskSupervisor,
          notifyOnDelay: specificTaskNotifyOnDelay,
          requiresPhoto: specificTaskForm.requiresPhoto,
          vigenciaDays: specificTaskForm.vigenciaDays === TaskVigencia.INDEFINIDO ? null : specificTaskForm.vigenciaDays,
          subtasks: specificTaskForm.subtasks,
          createdBy: user.id,
        });
        toast.success('Tarea específica creada. Se generará automáticamente al asignar el turno.');
        if (pendingReminderId) {
          await markReminderConverted(pendingReminderId, templateId);
          setPendingReminderId(null);
        }
      }
      setIsCreateModalOpen(false);
      setEditingTemplateId(null);
      setSpecificTaskForm({
        title: '',
        description: '',
        department: defaultDepartment,
        shiftIds: [] as string[],
        startTime: '08:00',
        estimatedMinutes: 60,
        priority: TaskPriority.MEDIUM,
        requiresPhoto: false,
        vigenciaDays: TaskVigencia.INDEFINIDO,
        subtasks: [],
      });
    } catch (err) {
      console.error('Error al guardar tarea específica:', err);
      toast.error('Error al guardar la tarea específica');
    }
  };

  const tasksByTabAndTime = useMemo(() => {
    let result = [...tasks];
    if (mainTab === 'my-tasks' && user) result = result.filter((t) => (t.assignedTo && t.assignedTo.includes(user.id)) || (t.supportUserIds && t.supportUserIds.includes(user.id)) || (t.supervisorId === user.id && (t.status === TaskStatus.COMPLETED || t.status === TaskStatus.VERIFIED)) || (!t.supervisorId && t.createdBy === user.id && t.status === TaskStatus.COMPLETED));
    else if (mainTab === 'my-department' && user) {
      // Mi Depto = solo el departamento propio del usuario
      result = result.filter((t) => normalizeDeptCode(t.department || '') === normalizeDeptCode(user.department || ''));
    }
    else if (mainTab === 'all' && user) {
      // Todas: respeta lo que el usuario puede ver (jerarquía + permisos)
      const canViewAll = hasPermission('canViewAllDepartments');
      const allowed = (canViewAll ? departmentCodes : getVisibleDepartmentCodes(effectiveUser)).map(normalizeDeptCode);
      if (selectedDepartment !== 'all') {
        result = result.filter((t) => normalizeDeptCode(t.department || '') === normalizeDeptCode(selectedDepartment || ''));
      } else {
        result = result.filter((t) => allowed.includes(normalizeDeptCode(t.department || '')));
      }
    }

    const today = getLocalDate();
    const yesterday = new Date(Date.now() - 86400000); const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    switch (timeFilter) {
      case TimeFilter.TODAY:
        result = result.filter((t) => t.dueDate === today || (t.dueDate < today && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.VERIFIED) || (user && t.supervisorId === user.id && t.status === TaskStatus.COMPLETED));
        break;
      case TimeFilter.YESTERDAY: result = result.filter((t) => t.dueDate === yesterdayStr); break;
      case TimeFilter.TOMORROW: result = result.filter((t) => t.dueDate === tomorrow); break;
      case TimeFilter.PAST_WEEKS: result = result.filter((t) => t.dueDate < today); break;
      case TimeFilter.UPCOMING: result = result.filter((t) => t.dueDate > tomorrow); break;
    }
    return result;
  }, [tasks, mainTab, user, timeFilter, selectedDepartment]);

  const filteredTaskCounts = useMemo(() => {
    const counts = { total: tasksByTabAndTime.length, pending: 0, inProgress: 0, completed: 0, verified: 0, blocked: 0, overdue: 0 };
    tasksByTabAndTime.forEach((task) => {
      const isOverdue = new Date(task.dueDate + 'T' + (task.dueTime || '23:59')) < new Date() && task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.VERIFIED;
      const isPendingVerification = user && (task.supervisorId === user.id || (!task.supervisorId && task.createdBy === user.id)) && task.status === TaskStatus.COMPLETED;
      switch (task.status) {
        case TaskStatus.PENDING: counts.pending++; break;
        case TaskStatus.IN_PROGRESS: counts.inProgress++; counts.pending++; break;
        case TaskStatus.COMPLETED:
          if (isPendingVerification) { counts.pending++; counts.completed++; }
          else counts.completed++;
          break;
        case TaskStatus.VERIFIED: counts.completed++; counts.verified++; break;
        case TaskStatus.BLOCKED: counts.blocked++; counts.pending++; break;
      }
      if (isOverdue) counts.overdue++;
    });
    return counts;
  }, [tasksByTabAndTime, user]);

  // Contadores se calculan después de filteredIncidencias

  const filteredTasks = useMemo(() => {
    let result = [...tasksByTabAndTime];
    if (statusFilter === TaskStatus.COMPLETED) result = result.filter((t) => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.VERIFIED);
    else if (statusFilter === TaskStatus.OVERDUE) result = result.filter((t) => (new Date(t.dueDate + 'T' + (t.dueTime || '23:59')) < new Date() && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.VERIFIED) || (user && (t.supervisorId === user.id || (!t.supervisorId && t.createdBy === user.id)) && t.status === TaskStatus.COMPLETED));
    else if (statusFilter === TaskStatus.PENDING) result = result.filter((t) => t.status === TaskStatus.PENDING || t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.BLOCKED || (user && (t.supervisorId === user.id || (!t.supervisorId && t.createdBy === user.id)) && t.status === TaskStatus.COMPLETED));
    else if (statusFilter === TaskStatus.IN_PROGRESS) result = result.filter((t) => t.status === TaskStatus.IN_PROGRESS || (user && (t.supervisorId === user.id || (!t.supervisorId && t.createdBy === user.id)) && t.status === TaskStatus.COMPLETED));
    else if (statusFilter === TaskStatus.BLOCKED) result = result.filter((t) => t.status === TaskStatus.BLOCKED);
    else if (statusFilter === TaskStatus.VERIFIED) result = result.filter((t) => t.status === TaskStatus.VERIFIED);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(query) || t.description.toLowerCase().includes(query));
    }
    result.sort((a, b) => {
      const statusOrder: Record<TaskStatus, number> = { [TaskStatus.OVERDUE]: 0, [TaskStatus.IN_PROGRESS]: 1, [TaskStatus.PENDING]: 2, [TaskStatus.BLOCKED]: 3, [TaskStatus.COMPLETED]: 4, [TaskStatus.VERIFIED]: 6 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      const priorityOrder: Record<TaskPriority, number> = { [TaskPriority.CRITICAL]: 0, [TaskPriority.HIGH]: 1, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
    return result;
  }, [tasksByTabAndTime, statusFilter, searchQuery, user]);

  // PASO 1: Filtrar por departamento según jerarquía pura
  const incidenciasByDept = useMemo(() => {
    if (!effectiveUser) return incidencias;
    let allowed = getVisibleDepartmentCodes(effectiveUser);
    // Fallback robusto para Gerente de Operaciones
    if (allowed.length === 0 && effectiveUser.role === Role.GERENTE_OPERACIONES && operationalDepartmentCodes.length > 0) {
      allowed = operationalDepartmentCodes;
    }
    if (incidenciaDepartmentFilter === 'all') {
      return incidencias.filter((i) =>
        allowed.some((d) => i.targetDepartments?.includes(d) || i.targetDepartment === d)
      );
    }
    return incidencias.filter((i) =>
      i.targetDepartments?.includes(incidenciaDepartmentFilter) || i.targetDepartment === incidenciaDepartmentFilter
    );
  }, [incidencias, effectiveUser, incidenciaDepartmentFilter, getVisibleDepartmentCodes, operationalDepartmentCodes]);

  // PASO 2: Filtrar por tiempo (base para contadores Y tarjetas)
  const incidenciasByTime = useMemo(() => {
    let result = [...incidenciasByDept];
    const today = getLocalDate();
    const yesterday = new Date(Date.now() - 86400000); const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
    switch (timeFilter) {
      case TimeFilter.TODAY:
        result = result.filter((i) => getLocalDateFromISO(i.createdAt) === today || (i.status !== IncidenciaStatus.RESOLVED && i.status !== IncidenciaStatus.CLOSED));
        break;
      case TimeFilter.YESTERDAY: result = result.filter((i) => getLocalDateFromISO(i.createdAt) === yesterdayStr); break;
      case TimeFilter.PAST_WEEKS: result = result.filter((i) => getLocalDateFromISO(i.createdAt) < yesterdayStr); break;
    }
    return result;
  }, [incidenciasByDept, timeFilter]);

  // PASO 3: Contadores personales (sobre incidenciasByTime)
  const incidenciaCounts = useMemo(() => {
    const base = incidenciasByTime;
    const uid = user?.id || '';
    return {
      total: base.length,
      new: base.filter((i) => getLocalDateFromISO(i.createdAt) === getLocalDate()).length,
      open: base.filter((i) => i.viewers?.some((v) => v.userId === uid)).length,
      verified: base.filter((i) => i.verifiedByList?.includes(uid) && i.status === IncidenciaStatus.VERIFIED).length,
      resolved: base.filter((i) => i.status === IncidenciaStatus.RESOLVED).length,
      closed: base.filter((i) => i.status === IncidenciaStatus.CLOSED).length,
      reopened: base.filter((i) => i.status === IncidenciaStatus.REOPENED).length,
    };
  }, [incidenciasByTime, user?.id]);

  // PASO 4: Tarjetas personales (incidenciasByTime + statusFilter)
  const filteredIncidencias = useMemo(() => {
    let result = [...incidenciasByTime];
    const uid = user?.id || '';
    const prOrd = { [TaskPriority.CRITICAL]: 0, [TaskPriority.HIGH]: 1, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 3 };
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case IncidenciaStatus.NEW:
          result = result.filter((i) => getLocalDateFromISO(i.createdAt) === getLocalDate());
          break;
        case IncidenciaStatus.OPEN:
          result = result.filter((i) => i.viewers?.some((v) => v.userId === uid));
          break;
        case IncidenciaStatus.VERIFIED:
          result = result.filter((i) => i.verifiedByList?.includes(uid) && i.status === IncidenciaStatus.VERIFIED);
          break;
        default:
          result = result.filter((i) => i.status === statusFilter);
      }
    }
    // Orden especifico por filtro
    if (statusFilter === 'all' || statusFilter === IncidenciaStatus.NEW) {
      // TODAS/NUEVAS: no resueltas/cerradas primero, resueltas/cerradas al final. Antiguas a nuevas. Prioridad critica primero.
      const isDone = (i) => i.status === IncidenciaStatus.RESOLVED || i.status === IncidenciaStatus.CLOSED;
      const notDone = result.filter(i => !isDone(i));
      const done = result.filter(i => isDone(i));
      const sortFn = (a, b) => { const pd = prOrd[a.priority] - prOrd[b.priority]; return pd !== 0 ? pd : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); };
      notDone.sort(sortFn); done.sort(sortFn);
      result = [...notDone, ...done];
    } else if (statusFilter === IncidenciaStatus.OPEN) {
      // VISUALIZADAS: antiguas a nuevas. Prioridad critica primero.
      result.sort((a, b) => { const pd = prOrd[a.priority] - prOrd[b.priority]; return pd !== 0 ? pd : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); });
    } else if (statusFilter === IncidenciaStatus.RESOLVED || statusFilter === IncidenciaStatus.CLOSED) {
      // RESUELTAS/CERRADAS: recientes a antiguas. Prioridad critica primero.
      result.sort((a, b) => { const pd = prOrd[a.priority] - prOrd[b.priority]; return pd !== 0 ? pd : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
    } else if (statusFilter === IncidenciaStatus.REOPENED) {
      // REABIERTAS: antiguas a nuevas. Prioridad critica primero.
      result.sort((a, b) => { const pd = prOrd[a.priority] - prOrd[b.priority]; return pd !== 0 ? pd : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); });
    } else {
      // VERIFICADAS y otros: antiguas a nuevas. Prioridad critica primero.
      result.sort((a, b) => { const pd = prOrd[a.priority] - prOrd[b.priority]; return pd !== 0 ? pd : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); });
    }
    // Deduplicar por si acaso hay documentos repetidos en Firestore
    result = result.filter((item, index, self) => self.findIndex((i) => i.id === item.id) === index);
    return result;
  }, [incidenciasByTime, timeFilter, statusFilter, user?.id]);

  const isIncidenciasTab = mainTab === 'incidencias';
  const displayItems = isIncidenciasTab ? filteredIncidencias : filteredTasks;

  return (
    <Layout title="Tasks" showDate={true}>
      <div className="space-y-4 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#1D1D1F]">Tasks</h2>
            <p className="text-sm text-[#86868B]">Gestiona tareas e incidencias</p>
          </div>
        </div>

        {/* MÓVIL: tres dropdowns en una sola fila */}
        <div className="lg:hidden flex items-center gap-2 w-full max-w-full overflow-hidden">
          <div className="flex-1 min-w-0">
            <Select value={mainTab} onValueChange={(v) => {
              const tab = v as MainTab;
              setMainTab(tab);
              if (tab === 'all') { setTimeFilter(TimeFilter.TODAY); setStatusFilter('all'); }
              else if (tab === 'incidencias') { setTimeFilter(TimeFilter.TODAY); setStatusFilter(IncidenciaStatus.NEW); }
              else { setTimeFilter(TimeFilter.TODAY); setStatusFilter(TaskStatus.PENDING); }
            }}>
              <SelectTrigger className="h-9 sm:h-10 px-2 sm:px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B] w-full min-w-0">
                <SelectValue placeholder="Vista" className="truncate text-xs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="my-tasks">Mis Tareas</SelectItem>
                <SelectItem value="my-department">Mi Depto</SelectItem>
                {(hasPermission('canViewAllDepartments') || visibleTaskDeptTreeOptions.length > 1) && (
                  <SelectItem value="all">Todas</SelectItem>
                )}
                <SelectItem value="incidencias">Incidencias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-0">
            <Select value={timeFilter} onValueChange={(v) => {
              const tf = v as TimeFilter;
              setTimeFilter(tf);
              if (isIncidenciasTab) {
                if (tf === TimeFilter.TODAY) setStatusFilter(IncidenciaStatus.NEW); else setStatusFilter('all');
              } else {
                if (tf === TimeFilter.TODAY || tf === TimeFilter.TOMORROW) setStatusFilter(TaskStatus.PENDING); else setStatusFilter('all');
              }
            }}>
              <SelectTrigger className="h-9 sm:h-10 px-2 sm:px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B] w-full min-w-0">
                <SelectValue placeholder="Periodo" className="truncate text-xs" />
              </SelectTrigger>
              <SelectContent>
                {!isIncidenciasTab ? (
                  <>
                    <SelectItem value={TimeFilter.PAST_WEEKS}>Anteriores</SelectItem>
                    <SelectItem value={TimeFilter.YESTERDAY}>Ayer</SelectItem>
                    <SelectItem value={TimeFilter.TODAY}>Hoy</SelectItem>
                    <SelectItem value={TimeFilter.TOMORROW}>Mañana</SelectItem>
                    <SelectItem value={TimeFilter.UPCOMING}>Próximas</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value={TimeFilter.PAST_WEEKS}>Anteriores</SelectItem>
                    <SelectItem value={TimeFilter.YESTERDAY}>Ayer</SelectItem>
                    <SelectItem value={TimeFilter.TODAY}>Hoy</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-0">
            <Select value={String(statusFilter)} onValueChange={(v) => {
              if (!isIncidenciasTab) {
                if (v === 'all') setStatusFilter('all');
                else setStatusFilter(v as TaskStatus);
              } else {
                if (v === 'all') setStatusFilter('all');
                else setStatusFilter(v as IncidenciaStatus);
              }
            }}>
              <SelectTrigger className="h-9 sm:h-10 px-2 sm:px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B] w-full min-w-0">
                <SelectValue placeholder="Estado" className="truncate text-xs" />
              </SelectTrigger>
              <SelectContent>
                {!isIncidenciasTab ? (
                  <>
                    <SelectItem value="all">Todas ({filteredTaskCounts.total})</SelectItem>
                    <SelectItem value={TaskStatus.PENDING}>Pendientes ({filteredTaskCounts.pending})</SelectItem>
                    <SelectItem value={TaskStatus.IN_PROGRESS}>En Progreso ({filteredTaskCounts.inProgress})</SelectItem>
                    {timeFilter !== TimeFilter.TOMORROW && timeFilter !== TimeFilter.UPCOMING && (
                      <>
                        <SelectItem value={TaskStatus.COMPLETED}>Completadas ({filteredTaskCounts.completed})</SelectItem>
                        <SelectItem value={TaskStatus.VERIFIED}>Verificadas ({filteredTaskCounts.verified})</SelectItem>
                      </>
                    )}
                    <SelectItem value={TaskStatus.BLOCKED}>Bloqueadas ({filteredTaskCounts.blocked})</SelectItem>
                    {timeFilter !== TimeFilter.TOMORROW && timeFilter !== TimeFilter.UPCOMING && (
                      <SelectItem value={TaskStatus.OVERDUE}>Atrasadas ({filteredTaskCounts.overdue})</SelectItem>
                    )}
                  </>
                ) : (
                  <>
                    <SelectItem value="all">Todas ({incidenciaCounts.total})</SelectItem>
                    {timeFilter === TimeFilter.TODAY && <SelectItem value={IncidenciaStatus.NEW}>Nuevas ({incidenciaCounts.new})</SelectItem>}
                    <SelectItem value={IncidenciaStatus.OPEN}>Visualizadas ({incidenciaCounts.open})</SelectItem>
                    <SelectItem value={IncidenciaStatus.VERIFIED}>Verificadas ({incidenciaCounts.verified})</SelectItem>
                    <SelectItem value={IncidenciaStatus.RESOLVED}>Resueltas ({incidenciaCounts.resolved})</SelectItem>
                    <SelectItem value={IncidenciaStatus.CLOSED}>Cerradas ({incidenciaCounts.closed})</SelectItem>
                    <SelectItem value={IncidenciaStatus.REOPENED}>Reabiertas ({incidenciaCounts.reopened})</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* DESKTOP: tres filas */}
        <div className="hidden lg:block space-y-3">
          {/* Fila 1: pestañas + tiempo */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-white rounded-xl p-1 w-fit">
              <button onClick={() => { setMainTab('my-tasks'); setTimeFilter(TimeFilter.TODAY); setStatusFilter(TaskStatus.PENDING); }} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap', mainTab === 'my-tasks' ? 'bg-[#F5F5F7] text-[#1D1D1F]' : 'text-[#86868B] hover:text-[#1D1D1F]')}><User className="w-4 h-4" />Mis Tareas</button>
              <button onClick={() => { setMainTab('my-department'); setTimeFilter(TimeFilter.TODAY); setStatusFilter(TaskStatus.PENDING); }} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap', mainTab === 'my-department' ? 'bg-[#F5F5F7] text-[#1D1D1F]' : 'text-[#86868B] hover:text-[#1D1D1F]')}><Users className="w-4 h-4" />Mi Depto</button>
              {(hasPermission('canViewAllDepartments') || visibleTaskDeptTreeOptions.length > 1) && (
                <button onClick={() => { setMainTab('all'); setTimeFilter(TimeFilter.TODAY); setStatusFilter('all'); }} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap', mainTab === 'all' ? 'bg-[#F5F5F7] text-[#1D1D1F]' : 'text-[#86868B] hover:text-[#1D1D1F]')}><LayoutGrid className="w-4 h-4" />Todas</button>
              )}
              <div className="w-px h-6 bg-[#C7C7CC] mx-1 shrink-0" />
              <button onClick={() => { setMainTab('incidencias'); setTimeFilter(TimeFilter.TODAY); setStatusFilter(IncidenciaStatus.NEW); }} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap', mainTab === 'incidencias' ? 'bg-[#F5F5F7] text-[#1D1D1F]' : 'text-[#86868B] hover:text-[#1D1D1F]')}><AlertTriangle className="w-4 h-4" />Incidencias</button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {!isIncidenciasTab ? (
                <>
                  {[{ id: TimeFilter.PAST_WEEKS, label: 'Anteriores' }, { id: TimeFilter.YESTERDAY, label: 'Ayer' }, { id: TimeFilter.TODAY, label: 'Hoy' }, { id: TimeFilter.TOMORROW, label: 'Mañana' }, { id: TimeFilter.UPCOMING, label: 'Próximas' }].map((filter) => (
                    <button key={filter.id} onClick={() => { setTimeFilter(filter.id); if (filter.id === TimeFilter.TODAY || filter.id === TimeFilter.TOMORROW) { setStatusFilter(TaskStatus.PENDING); } else { setStatusFilter('all'); } }} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap', timeFilter === filter.id ? 'border border-corporate text-corporate bg-white' : 'bg-white text-[#86868B] hover:text-[#1D1D1F] border border-[#E5E5E7]')}>{filter.label}</button>
                  ))}
                  {mainTab === 'all' && visibleTaskDeptTreeOptions.length > 1 && (
                    <div className="hidden lg:flex">
                      <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger className="w-[180px] h-9 rounded-lg border-[#E5E5E7] text-sm shrink-0 bg-white"><SelectValue placeholder="Departamento" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{hasPermission('canViewAllDepartments') ? 'Todos los departamentos' : 'Todos'}</SelectItem>
                          {visibleTaskDeptTreeOptions.map((dept) => (
                            <SelectItem key={dept.code} value={dept.code} className={dept.name === user?.department ? 'text-[#5856D6] font-medium' : ''}>
                              <span>{dept.name}{dept.name === user?.department ? ' (tú)' : ''}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {[{ id: TimeFilter.PAST_WEEKS, label: 'Anteriores' }, { id: TimeFilter.YESTERDAY, label: 'Ayer' }, { id: TimeFilter.TODAY, label: 'Hoy' }].map((filter) => (
                    <button key={filter.id} onClick={() => { setTimeFilter(filter.id); if (filter.id === TimeFilter.TODAY) { setStatusFilter(IncidenciaStatus.NEW); } else { setStatusFilter('all'); } }} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap', timeFilter === filter.id ? 'border border-corporate text-corporate bg-white' : 'bg-white text-[#86868B] hover:text-[#1D1D1F] border border-[#E5E5E7]')}>{filter.label}</button>
                  ))}
                  {user && incidenciaDeptOptions.length > 1 && (
                    <div className="hidden lg:flex">
                      <Select value={incidenciaDepartmentFilter} onValueChange={setIncidenciaDepartmentFilter}>
                        <SelectTrigger className="w-[180px] h-9 rounded-lg border-[#E5E5E7] text-sm shrink-0 bg-white"><SelectValue placeholder="Departamento" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{incidenciaDeptOptions.every(d => operationalDepartmentCodes.includes(d.code)) ? 'Todos (operacionales)' : 'Todos'}</SelectItem>
                          {incidenciaDeptOptions.map((dept) => (
                            <SelectItem key={dept.code} value={dept.code} className={dept.name === user?.department ? 'text-[#5856D6] font-medium' : ''}>
                              <span>{dept.name}{dept.name === user?.department ? ' (tú)' : ''}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Fila 2: estados */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isIncidenciasTab ? (
              <>
                <button onClick={() => setStatusFilter('all')} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === 'all' ? 'border border-corporate text-corporate bg-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.total}</span><span>Todas</span></button>
                <button onClick={() => setStatusFilter(TaskStatus.PENDING)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.PENDING ? 'border border-[#8E8E93] text-[#8E8E93] bg-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.pending}</span><span>Pendientes</span></button>
                <button onClick={() => setStatusFilter(TaskStatus.IN_PROGRESS)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.IN_PROGRESS ? 'border border-[#007AFF] text-[#007AFF] bg-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.inProgress}</span><span>En Progreso</span></button>
                {timeFilter !== TimeFilter.TOMORROW && timeFilter !== TimeFilter.UPCOMING && (<>
                  <button onClick={() => setStatusFilter(TaskStatus.COMPLETED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.COMPLETED ? 'border border-[#34C759] text-[#34C759] bg-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.completed}</span><span>Completadas</span></button>
                  <button onClick={() => setStatusFilter(TaskStatus.VERIFIED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.VERIFIED ? 'border border-[#5856D6] text-[#5856D6] bg-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.verified}</span><span>Verificadas</span></button>
                </>)}
                <button onClick={() => setStatusFilter(TaskStatus.BLOCKED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.BLOCKED ? 'border border-[#FF9500] text-[#FF9500] bg-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.blocked}</span><span>Bloqueadas</span></button>
                {timeFilter !== TimeFilter.TOMORROW && timeFilter !== TimeFilter.UPCOMING && (
                  <button onClick={() => setStatusFilter(TaskStatus.OVERDUE)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.OVERDUE ? 'border border-[#FF3B30] text-[#FF3B30] bg-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.overdue}</span><span>Atrasadas</span></button>
                )}
              </>
            ) : (
              <>
                <button onClick={() => setStatusFilter('all')} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === 'all' ? 'border border-corporate text-corporate bg-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{incidenciaCounts.total}</span><span>Todas</span></button>
                {timeFilter === TimeFilter.TODAY && <button onClick={() => setStatusFilter(IncidenciaStatus.NEW)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === IncidenciaStatus.NEW ? 'border border-[#FF3B30] text-[#FF3B30] bg-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{incidenciaCounts.new}</span><span>Nuevas</span></button>}
                <button onClick={() => setStatusFilter(IncidenciaStatus.OPEN)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === IncidenciaStatus.OPEN ? 'border border-[#34C759] text-[#34C759] bg-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{incidenciaCounts.open}</span><span>Visualizadas</span></button>
                <button onClick={() => setStatusFilter(IncidenciaStatus.VERIFIED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === IncidenciaStatus.VERIFIED ? 'border border-[#5856D6] text-[#5856D6] bg-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{incidenciaCounts.verified}</span><span>Verificadas</span></button>
                <button onClick={() => setStatusFilter(IncidenciaStatus.RESOLVED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === IncidenciaStatus.RESOLVED ? 'border border-[#34C759] text-[#34C759] bg-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{incidenciaCounts.resolved}</span><span>Resueltas</span></button>
                <button onClick={() => setStatusFilter(IncidenciaStatus.CLOSED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === IncidenciaStatus.CLOSED ? 'border border-[#8E8E93] text-[#8E8E93] bg-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{incidenciaCounts.closed}</span><span>Cerradas</span></button>
                <button onClick={() => setStatusFilter(IncidenciaStatus.REOPENED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === IncidenciaStatus.REOPENED ? 'border border-[#007AFF] text-[#007AFF] bg-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{incidenciaCounts.reopened}</span><span>Reabiertas</span></button>
              </>
            )}
          </div>

          {/* Fila 3: buscador */}
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
        </div>

        {/* Buscador móvil */}
        <div className="lg:hidden w-full max-w-full space-y-3 overflow-hidden">
          {/* Selector de departamento en tablet (md a lg) */}
          {!isIncidenciasTab && mainTab === 'all' && user && visibleTaskDeptTreeOptions.length > 1 && (
            <div className="hidden md:flex lg:hidden w-full max-w-full">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="h-9 sm:h-10 px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B] w-full max-w-full">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{hasPermission('canViewAllDepartments') ? 'Todos los departamentos' : 'Todos'}</SelectItem>
                  {visibleTaskDeptTreeOptions.map((dept) => (
                    <SelectItem key={dept.code} value={dept.code} className={dept.name === user?.department ? 'text-[#5856D6] font-medium' : ''}>
                      <span>{dept.name}{dept.name === user?.department ? ' (tú)' : ''}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {isIncidenciasTab && user && incidenciaDeptOptions.length > 1 && (
            <div className="hidden md:flex lg:hidden w-full max-w-full">
              <Select value={incidenciaDepartmentFilter} onValueChange={setIncidenciaDepartmentFilter}>
                <SelectTrigger className="h-9 sm:h-10 px-3 bg-white border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#86868B] w-full max-w-full">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{incidenciaDeptOptions.every(d => operationalDepartmentCodes.includes(d.code)) ? 'Todos (operacionales)' : 'Todos los departamentos'}</SelectItem>
                  {incidenciaDeptOptions.map((dept) => (
                    <SelectItem key={dept.code} value={dept.code} className={dept.name === user?.department ? 'text-[#5856D6] font-medium' : ''}>
                      <span>{dept.name}{dept.name === user?.department ? ' (tú)' : ''}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Buscador + toggles */}
          <div className="flex items-center gap-3 w-full max-w-full">
            <div className="relative flex-1 min-w-0 max-w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
              <Input placeholder="Buscar" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 sm:pl-10 h-9 sm:h-10 rounded-xl border-[#E5E5E7] focus:border-corporate focus:ring-corporate w-full max-w-full min-w-0" />
            </div>
            <div className="flex items-center bg-white rounded-lg border border-[#E5E5E7] p-1 shrink-0">
              <button onClick={() => setViewType('list')} className={cn('p-2 rounded-md transition-all', viewType === 'list' ? 'bg-[#F5F5F7] text-[#1D1D1F]' : 'text-[#86868B]')}><List className="w-4 h-4" /></button>
              <button onClick={() => setViewType('grid')} className={cn('p-2 rounded-md transition-all', viewType === 'grid' ? 'bg-[#F5F5F7] text-[#1D1D1F]' : 'text-[#86868B]')}><LayoutTemplate className="w-4 h-4" /></button>
            </div>
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
            <div className={cn('space-y-3 min-w-0 max-w-full', viewType === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-hidden' : '')}>
              {displayItems.map((item) => isIncidenciasTab ? (
                <IncidenciaCard key={item.id} incidencia={item as Incidencia} currentUserId={user?.id} currentUser={user} onConfirmIncidencia={confirmIncidencia} onResolveIncidencia={resolveIncidencia} onCloseIncidencia={closeIncidencia} onReopenIncidencia={reopenIncidencia} onAddNote={addIncidenciaNote} onAddPhoto={addIncidenciaPhoto} onAddViewer={addIncidenciaViewer} />
              ) : (
                <TaskCard key={item.id} task={item as Task} onStatusChange={(taskId, status, reason) => changeTaskStatus(taskId, status, reason, user?.id)} onComplete={(taskId) => changeTaskStatus(taskId, TaskStatus.COMPLETED, 'Tarea completada', user?.id)} onReopen={(taskId) => reopenTask(taskId, user?.id || '')} onAddNote={addNote} onToggleSubtask={(taskId, subtaskId) => toggleSubtask(taskId, subtaskId)} onAddPhoto={addPhoto} onDelete={async (taskId) => { if (confirm('¿Eliminar esta tarea permanentemente?')) { try { await deleteTask(taskId); toast.success('Tarea eliminada'); } catch (err) { console.error('Error al eliminar tarea:', err); toast.error('No se pudo eliminar la tarea'); } } }} onEdit={(task) => { setEditingTask(task); setIsEditModalOpen(true); }} onRateTask={(taskId, rating, note, userId) => rateTask(taskId, rating, note, userId)} canReopen={hasPermission('canReopenTask')} canUnblock={hasPermission('canUnblockTask')} currentUserId={user?.id} currentUser={user} />
              ))}
            </div>
          )}
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden">
            <div className="p-6 pb-2 border-b">
              <DialogHeader>
                <DialogTitle className="mt-8 pb-2">
                  <span className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold w-full justify-center',
                    createType === 'extra' && 'bg-amber-500 text-white',
                    createType === 'specific' && 'border-2 border-corporate text-corporate bg-corporate/5',
                    createType === 'incidencia' && 'border-2 border-[#FF3B30] text-[#FF3B30] bg-[#FF3B30]/5'
                  )}>
                    {createType === 'extra' && <Plus className="w-4 h-4" />}
                    {createType === 'specific' && <Target className="w-4 h-4" />}
                    {createType === 'incidencia' && <AlertCircle className="w-4 h-4" />}
                    {createType === 'extra' ? 'Nueva Tarea Extra' : createType === 'specific' ? 'Nueva Tarea Específica' : 'Nueva Incidencia'}
                  </span>
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="overflow-y-auto px-6 pb-6" style={{ maxHeight: 'calc(90vh - 100px)' }}>
            {createType === 'incidencia' ? (
              <div className="space-y-4 py-2 px-2 pb-6" style={{ maxHeight: 'calc(90vh - 100px)' }}>
                {(() => (
                    <>
                      {/* SECCIÓN 1: Información */}
                      <Section title="Información" icon={FileText}>
                        <div className="bg-[#F5F5F7] rounded-xl p-3">
                          <span className="text-xs text-[#86868B]">Departamento que envía</span>
                          <p className="text-sm font-medium text-[#1D1D1F]">{user?.department?.replace(/_/g, ' ') || 'ADMINISTRATIVO'}</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Título *</Label>
                          <Input placeholder="Título de la incidencia..." value={incidenciaForm.title} onChange={(e) => setIncidenciaForm({ ...incidenciaForm, title: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Descripción detallada *</Label>
                          <Textarea placeholder="Describe la incidencia..." value={incidenciaForm.description} onChange={(e) => setIncidenciaForm({ ...incidenciaForm, description: e.target.value })} rows={4} />
                        </div>
                      </Section>

                      {/* SECCIÓN 2: Departamentos reportados */}
                      <Section title="Departamentos reportados *" icon={Users}>
                        <div className="flex flex-wrap gap-2">
                          {allDepartments.map((dept) => (
                            <button
                              key={dept.code}
                              type="button"
                              onClick={() => setIncidenciaForm(prev => ({ ...prev, targetDepartments: prev.targetDepartments.includes(dept.code) ? prev.targetDepartments.filter(d => d !== dept.code) : [...prev.targetDepartments, dept.code] }))}
                              className={cn('px-3 py-2 rounded-xl text-sm font-medium transition-all border', incidenciaForm.targetDepartments.includes(dept.code) ? 'border-corporate text-corporate bg-corporate/5' : 'border-[#E5E5E7] text-[#86868B] hover:bg-[#F5F5F7]')}
                            >
                              {dept.name}
                            </button>
                          ))}
                        </div>
                      </Section>

                      {/* SECCIÓN 3: Prioridad */}
                      <Section title="Prioridad" icon={AlertCircle}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[{ value: TaskPriority.CRITICAL, label: 'Crítica', color: '#FF3B30' }, { value: TaskPriority.HIGH, label: 'Alta', color: '#FF9500' }, { value: TaskPriority.MEDIUM, label: 'Media', color: '#007AFF' }, { value: TaskPriority.LOW, label: 'Baja', color: '#8E8E93' }].map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => setIncidenciaForm({ ...incidenciaForm, priority: p.value })}
                              className={cn('px-2 py-2 rounded-xl text-sm font-medium transition-all border', incidenciaForm.priority === p.value ? 'text-white border-transparent' : 'bg-white text-[#86868B] border-[#E5E5E7] hover:text-[#1D1D1F]')}
                              style={incidenciaForm.priority === p.value ? { backgroundColor: p.color } : undefined}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </Section>

                      {/* SECCIÓN 4: Evidencia fotográfica */}
                      <Section title="Evidencia fotográfica" icon={Camera}>
                        <CameraCapture onCapture={handlePhotoCapture} hidePreview />
                        {incidenciaPhotos.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {incidenciaPhotos.map((url, idx) => (
                              <div key={idx} className="relative w-16 h-16 rounded-lg bg-[#F5F5F7] border border-[#E5E5E7] overflow-hidden">
                                <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </Section>

                      {/* Botones */}
                      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 pb-10 mb-8">
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
                        <Button
                          className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white w-full sm:w-auto"
                          onClick={() => {
                            if (!user || incidenciaForm.targetDepartments.length === 0) return;
                            const normalizedTarget = getDeptCode(user.department || defaultDepartment);
                            const normalizedTargets = Array.from(new Set([...incidenciaForm.targetDepartments.map(getDeptCode), normalizedTarget].filter(Boolean)));
                            createIncidencia({
                              title: incidenciaForm.title,
                              description: incidenciaForm.description,
                              targetDepartment: normalizedTarget,
                              targetDepartments: normalizedTargets,
                              priority: incidenciaForm.priority,
                              reportedBy: user.id,
                              photos: incidenciaPhotos.map(url => ({ url, uploadedBy: user?.id || '', uploadedAt: new Date().toISOString() }))
                            }).then((id) => {
                              console.log('Incidencia creada:', id);
                              setIsCreateModalOpen(false);
                              setIncidenciaForm({ title: '', description: '', department: defaultDepartment, targetDepartments: [] as string[], priority: TaskPriority.HIGH });
                            }).catch((err) => { console.error('Error:', err); alert('Error: ' + err.message); });
                          }}
                          disabled={!incidenciaForm.title || !incidenciaForm.description || incidenciaForm.targetDepartments.length === 0}
                        >
                          Reportar Incidencia
                        </Button>
                      </div>
                    </>
                ))()}
              </div>
            ) : createType === 'specific' ? (
              <SpecificTaskForm
                form={specificTaskForm}
                setForm={setSpecificTaskForm}
                departments={allDepartments}
                shifts={shiftsForSpecificTask}
                supervisorName={specificTaskSupervisorName}
                observers={specificTaskObservers}
                dueTime={specificTaskDueTime}
                onCancel={() => setIsCreateModalOpen(false)}
                onSubmit={handleSubmitSpecificTask}
                disabled={false}
                isEditing={!!editingTemplateId}
              />
            ) : createType === 'extra' ? (
              <TaskFormModal createType={createType} taskForm={taskForm} setTaskForm={setTaskForm} newSubtaskTitle={newSubtaskTitle} setNewSubtaskTitle={setNewSubtaskTitle} allDepartments={allDepartments} supervisorsByDepartment={supervisorsByDepartment} calculatedDueDate={calculatedDueDateTime.date} calculatedDueTime={calculatedDueDateTime.time} onCancel={() => setIsCreateModalOpen(false)} currentUserId={user?.id} onSubmit={() => { if (user) { createTask({ title: taskForm.title, description: taskForm.description, department: taskForm.department, priority: taskForm.priority, dueDate: calculatedDueDateTime.date, dueTime: calculatedDueDateTime.time, assignedTo: taskForm.assignedTo && taskForm.assignedTo.length > 0 ? taskForm.assignedTo : [user.id], createdBy: user.id, status: TaskStatus.PENDING, type: TaskType.EXTRA, supervisorId: taskForm.supervisor || user.id, requiresPhoto: taskForm.requiresPhoto, startTime: taskForm.startTime, estimatedMinutes: taskForm.estimatedHours, subtasks: taskForm.subtasks, shiftIds: taskForm.selectedShifts, supportUserIds: taskForm.supportUsers, photos: taskForm.photos }).then(async (id) => { console.log('Tarea creada:', id); if (pendingReminderId) { await markReminderConverted(pendingReminderId, id); setPendingReminderId(null); } setIsCreateModalOpen(false); }).catch((err) => { console.error('Error creando tarea:', err); alert('Error al crear tarea: ' + err.message); }); } }} />
            ) : null}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Task Modal */}
        <EditTaskModal
          task={editingTask}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onSave={(taskId, taskUpdates) => updateTask(taskId, taskUpdates)}
          canEditAll={!!(editingTask && user && (hasPermission('canEditAllTasks') || editingTask.createdBy === user.id))}
        />
      </div>
    </Layout>
  );
}


interface TaskFormModalProps {
  createType: 'extra' | 'specific';
  taskForm: { title: string; description: string; department: string; priority: TaskPriority; startDate: string; startTime: string; estimatedHours: number; supervisor: string; assignedTo: string[]; requiresPhoto: boolean; subtasks: { id: string; title: string; completed: boolean }[]; selectedShifts: string[]; supportDepartment: string; supportUsers: string[]; recurrence: TaskRecurrence; photos: string[]; };
  setTaskForm: React.Dispatch<React.SetStateAction<TaskFormModalProps['taskForm']>>;
  newSubtaskTitle: string;
  setNewSubtaskTitle: React.Dispatch<React.SetStateAction<string>>;
  allDepartments: { code: string; name: string }[];
  supervisorsByDepartment: { id: string; name: string; position: string; role: string }[];
  calculatedDueDate: string;
  calculatedDueTime: string;
  onCancel: () => void;
  onSubmit: () => void;
  currentUserId?: string;
}

function TaskFormModal({ createType, taskForm, setTaskForm, newSubtaskTitle, setNewSubtaskTitle, allDepartments, supervisorsByDepartment, calculatedDueDate, calculatedDueTime, onCancel, onSubmit, currentUserId }: TaskFormModalProps) {
  const { users: firestoreUsersForModal } = useFirestoreUsers();

  const availableSupervisors = useMemo(() => {
    let filtered = supervisorsByDepartment.filter((s) => s.id !== currentUserId);
    const currentUser = firestoreUsersForModal.find((u) => u.id === currentUserId);
    if (currentUser?.role === 'GERENTE_OPERACIONES') filtered = supervisorsByDepartment;
    return filtered;
  }, [supervisorsByDepartment, currentUserId, firestoreUsersForModal]);

  const usersByDepartment = useMemo(() => {
    return firestoreUsersForModal.filter((u) => normalizeDeptCode(u.department || '') === normalizeDeptCode(taskForm.department || '') && u.isActive && u.id !== currentUserId);
  }, [taskForm.department, currentUserId, firestoreUsersForModal]);

  // Opciones de recurrencia para tareas específicas
  const recurrenceOptions = [
    { value: TaskRecurrence.DAILY, label: 'Diaria' },
    { value: TaskRecurrence.WEEKLY, label: 'Semanal' },
    { value: TaskRecurrence.MONTHLY, label: 'Mensual' },
    { value: TaskRecurrence.YEARLY, label: 'Anual' },
  ];

  const [showApoyo, setShowApoyo] = useState(!!taskForm.supportDepartment);

  const [startHour, startMinute] = taskForm.startTime.split(':').map((v) => v || '09');
  const setStartTime = (hour: string, minute: string) => {
    setTaskForm({ ...taskForm, startTime: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}` });
  };

  const minuteOptions = [5, 10, 15, 20, 30, 40, 50, 60];
  const isCustomTime = !minuteOptions.includes(taskForm.estimatedHours);

  return (
    <div className="space-y-4 py-2 px-2 pb-6 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(90vh - 120px)' }}>
      {/* SECCIÓN 1: Información de la tarea */}
      <Section title="Información de la tarea" icon={FileText}>
        <div className="space-y-2">
          <Label>Título *</Label>
          <Input placeholder="Nombre de la tarea" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
        </div>

        <div className="space-y-2">
          <Label>Prioridad</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[{ value: TaskPriority.LOW, label: 'Baja', color: '#8E8E93' }, { value: TaskPriority.MEDIUM, label: 'Media', color: '#007AFF' }, { value: TaskPriority.HIGH, label: 'Alta', color: '#FF9500' }, { value: TaskPriority.CRITICAL, label: 'Crítica', color: '#FF3B30' }].map((p) => (
              <button key={p.value} type="button" onClick={() => setTaskForm({ ...taskForm, priority: p.value })} className={cn('px-2 py-2 rounded-xl text-sm font-medium transition-all border', taskForm.priority === p.value ? 'text-white border-transparent' : 'bg-white text-[#86868B] border-[#E5E5E7] hover:text-[#1D1D1F]')} style={taskForm.priority === p.value ? { backgroundColor: p.color } : undefined}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Descripción</Label>
          <Textarea placeholder="Describe la tarea..." value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={3} />
        </div>

        {taskForm.photos && taskForm.photos.length > 0 && (
          <div className="space-y-2">
            <Label>Fotos adjuntas</Label>
            <div className="flex flex-wrap gap-2">
              {taskForm.photos.map((photo, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-lg bg-[#F5F5F7] border border-[#E5E5E7] overflow-hidden group">
                  <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setTaskForm({ ...taskForm, photos: taskForm.photos.filter((_, i) => i !== idx) })}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#FF3B30] text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Subtareas</Label>
          <div className="flex gap-2">
            <Input placeholder="Nueva subtarea..." value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newSubtaskTitle.trim()) { setTaskForm({ ...taskForm, subtasks: [...taskForm.subtasks, { id: generateId(), title: newSubtaskTitle.trim(), completed: false }] }); setNewSubtaskTitle(''); } }} />
            <Button type="button" variant="outline" onClick={() => { if (newSubtaskTitle.trim()) { setTaskForm({ ...taskForm, subtasks: [...taskForm.subtasks, { id: generateId(), title: newSubtaskTitle.trim(), completed: false }] }); setNewSubtaskTitle(''); } }}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {taskForm.subtasks && taskForm.subtasks.length > 0 && (
            <div className="space-y-2 mt-2">
              {taskForm.subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2 p-2 bg-[#F5F5F7] rounded-lg group">
                  <input type="checkbox" checked={subtask.completed} onChange={() => { setTaskForm({ ...taskForm, subtasks: taskForm.subtasks.map((s) => s.id === subtask.id ? { ...s, completed: !s.completed } : s) }); }} className="w-4 h-4 rounded border-[#E5E5E7]" />
                  <span className={cn('text-sm flex-1', subtask.completed && 'line-through text-[#86868B]')}>{subtask.title}</span>
                  <button type="button" onClick={() => { setTaskForm({ ...taskForm, subtasks: taskForm.subtasks.filter((s) => s.id !== subtask.id) }); }} className="text-[#FF3B30] hover:text-[#FF3B30]/80 px-2 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* SECCIÓN 2: Responsable y Supervisor */}
      <Section title="Responsable y Supervisor" icon={Users}>
        <div className="space-y-2">
          <Label>Departamento</Label>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const currentUser = firestoreUsersForModal.find((u) => u.id === currentUserId);
              let depts = allDepartments.map(d => d.code);
              if (currentUser && (currentUser.role === 'GERENTE_DEPARTAMENTO' || currentUser.role === 'SUPERVISOR')) {
                depts = [currentUser.department];
              }
              return allDepartments.filter(d => depts.includes(d.code)).map((dept) => (
                <button key={dept.code} type="button" onClick={() => setTaskForm({ ...taskForm, department: dept.code, supervisor: '' })} className={cn('px-3 py-2 rounded-xl text-sm font-medium transition-all border capitalize', taskForm.department === dept.code ? 'border-corporate text-corporate bg-corporate/5' : 'border-[#E5E5E7] text-[#86868B] hover:bg-[#F5F5F7]')}>
                  {dept.name.toLowerCase()}
                </button>
              ));
            })()}
          </div>
        </div>

        {createType === 'extra' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Asignar a</Label>
              {taskForm.assignedTo.length === 0 && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Se asignará a ti</span>
              )}
            </div>
            <div className="space-y-2">
              {usersByDepartment.length > 0 ? usersByDepartment.map((user) => {
                const isSelected = taskForm.assignedTo.includes(user.id);
                return (
                  <button key={user.id} type="button" onClick={() => { if (isSelected) { setTaskForm({ ...taskForm, assignedTo: taskForm.assignedTo.filter((id) => id !== user.id) }); } else { setTaskForm({ ...taskForm, assignedTo: [...taskForm.assignedTo, user.id] }); } }} className={cn('w-full px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all flex items-center justify-between gap-2 border', isSelected ? 'border-corporate text-corporate bg-corporate/5' : 'border-[#E5E5E7] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]')}>
                    <span className="truncate">{user.name}</span>
                    <span className="text-xs text-[#86868B] flex-shrink-0 hidden sm:inline">{user.position}</span>
                  </button>
                );
              }) : <p className="text-sm text-[#86868B] p-2">No hay usuarios disponibles en este departamento</p>}
            </div>
            {taskForm.assignedTo.length > 0 && (
              <p className="text-xs text-[#86868B]">
                {taskForm.assignedTo.length} responsable{taskForm.assignedTo.length > 1 ? 'es' : ''} seleccionado{taskForm.assignedTo.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Supervisor</Label>
          <div className="space-y-2">
            <button type="button" onClick={() => setTaskForm({ ...taskForm, supervisor: currentUserId || '' })} className={cn('w-full px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all border', taskForm.supervisor === currentUserId ? 'border-[#8B5CF6] bg-[#8B5CF6]/5 text-[#8B5CF6]' : 'border-[#E5E5E7] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]')}>
              Yo (seré el supervisor)
            </button>
            {availableSupervisors.length > 0 ? availableSupervisors.map((supervisor) => (
              <button key={supervisor.id} type="button" onClick={() => setTaskForm({ ...taskForm, supervisor: supervisor.id })} className={cn('w-full px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all flex items-center justify-between gap-2 border', taskForm.supervisor === supervisor.id ? 'border-[#8B5CF6] bg-[#8B5CF6]/5 text-[#8B5CF6]' : 'border-[#E5E5E7] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]')}>
                <span className="truncate">{supervisor.name}</span>
                <span className="text-xs text-[#86868B] flex-shrink-0 hidden sm:inline">{supervisor.position}</span>
              </button>
            )) : <p className="text-sm text-[#86868B] p-2">No hay supervisores disponibles para este departamento</p>}
          </div>
          <p className="text-xs text-[#86868B]">Nota: Un supervisor/gerente no puede supervisarse a sí mismo. El gerente de operaciones supervisa a los demás.</p>
        </div>
      </Section>

      {/* SECCIÓN 3: Programación */}
      <Section title="Programación" icon={Clock}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fecha inicio</Label>
            <Input type="date" value={taskForm.startDate} onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })} className="h-10" />
          </div>
          <div className="space-y-2">
            <Label>Hora inicio *</Label>
            <div className="flex items-center gap-2">
              <Select value={startHour} onValueChange={(h) => setStartTime(h, startMinute)}>
                <SelectTrigger className="w-20 h-10 text-center"><SelectValue placeholder="HH" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-[#86868B] font-medium">:</span>
              <Select value={startMinute} onValueChange={(m) => setStartTime(startHour, m)}>
                <SelectTrigger className="w-20 h-10 text-center"><SelectValue placeholder="MM" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => { const ms = String(m).padStart(2, '0'); return <SelectItem key={ms} value={ms}>{ms}</SelectItem>; })}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-[#86868B]">Formato 24 horas</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tiempo estimado</Label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {minuteOptions.map((m) => (
              <button key={m} type="button" onClick={() => setTaskForm({ ...taskForm, estimatedHours: m })} className={cn('px-2 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all border', taskForm.estimatedHours === m ? 'border-corporate text-corporate bg-white' : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5E7]')}>
                {m}m
              </button>
            ))}
            <button type="button" onClick={() => setTaskForm({ ...taskForm, estimatedHours: isCustomTime ? taskForm.estimatedHours : 90 })} className={cn('px-2 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all border', isCustomTime ? 'border-corporate text-corporate bg-white' : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5E7]')}>
              Otro
            </button>
          </div>
          {isCustomTime && (
            <div className="flex items-center gap-2 pt-1">
              <Input type="number" min={5} max={10080} step={5} value={taskForm.estimatedHours} onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: parseInt(e.target.value) || 5 })} className="w-32 h-9" />
              <span className="text-sm text-[#86868B]">min = {Math.floor(taskForm.estimatedHours / 60)}h {taskForm.estimatedHours % 60}min</span>
            </div>
          )}
        </div>

        <div className="bg-corporate/5 rounded-xl p-3 flex items-center gap-2 border border-corporate/20">
          <Clock className="w-4 h-4 text-corporate" />
          <span className="text-sm text-[#1D1D1F]">Fecha límite calculada</span>
          <span className="text-sm font-semibold text-corporate ml-auto">{calculatedDueDate} • {calculatedDueTime}</span>
        </div>
      </Section>

      {/* SECCIÓN 4: Requisitos */}
      <Section title="Requisitos" icon={Camera}>
        <div className="flex items-center gap-3 p-3 bg-[#F5F5F7] rounded-xl">
          <input type="checkbox" id="requiresPhoto" checked={taskForm.requiresPhoto} onChange={(e) => setTaskForm({ ...taskForm, requiresPhoto: e.target.checked })} className="w-4 h-4 rounded border-[#E5E5E7] text-corporate focus:ring-corporate" />
          <Label htmlFor="requiresPhoto" className="text-sm font-medium text-[#1D1D1F] mb-0 cursor-pointer">Requiere foto para completar</Label>
        </div>
      </Section>

      {/* SECCIÓN 5: Solicitar Apoyo */}
      {createType === 'extra' && (() => { const cu = firestoreUsersForModal.find((u) => u.id === currentUserId); return cu && (cu.role === Role.GERENTE_DEPARTAMENTO || cu.role === Role.GERENTE_OPERACIONES || cu.role === Role.DIRECTOR || cu.role === Role.DIRECTOR_GENERAL || cu.role === Role.RRHH); })() && (
        <Section title="Solicitar Apoyo" icon={Zap}>
          <div className="flex items-center gap-3 p-3 bg-[#F5F5F7] rounded-xl">
            <input type="checkbox" id="solicitarApoyo" checked={showApoyo} onChange={(e) => { if (!e.target.checked) { setShowApoyo(false); setTaskForm({ ...taskForm, supportDepartment: '', supportUsers: [] }); } else { setShowApoyo(true); } }} className="w-4 h-4 rounded border-[#E5E5E7] text-corporate focus:ring-corporate" />
            <Label htmlFor="solicitarApoyo" className="text-sm font-medium text-[#1D1D1F] mb-0 cursor-pointer">Solicitar apoyo de otros departamentos</Label>
          </div>

          {showApoyo && (
            <div className="space-y-3 pl-2 border-l-2 border-corporate/30">
              <div className="space-y-2">
                <Label>Departamento de apoyo</Label>
                <div className="flex flex-wrap gap-2">
                  {allDepartments.filter((d) => d.code !== taskForm.department).map((dept) => (
                    <button key={dept.code} type="button" onClick={() => setTaskForm({ ...taskForm, supportDepartment: dept.code, supportUsers: [] })} className={cn('px-3 py-2 rounded-xl text-sm font-medium transition-all border capitalize', taskForm.supportDepartment === dept.code ? 'border-corporate text-corporate bg-corporate/5' : 'border-[#E5E5E7] text-[#86868B] hover:bg-[#F5F5F7]')}>
                      {dept.name.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
              {taskForm.supportDepartment && (
                <div className="space-y-2">
                  <Label>Usuarios de apoyo</Label>
                  {firestoreUsersForModal.filter((u) => normalizeDeptCode(u.department || '') === normalizeDeptCode(taskForm.supportDepartment || '') && u.isActive).map((user) => {
                    const isSupSelected = taskForm.supportUsers.includes(user.id);
                    return (
                      <button key={user.id} type="button" onClick={() => { if (isSupSelected) { setTaskForm({ ...taskForm, supportUsers: taskForm.supportUsers.filter((id) => id !== user.id) }); } else { setTaskForm({ ...taskForm, supportUsers: [...taskForm.supportUsers, user.id] }); } }} className={cn('w-full px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all flex items-center justify-between gap-2 border', isSupSelected ? 'border-corporate text-corporate bg-corporate/5' : 'border-[#E5E5E7] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]')}>
                        <span className="truncate">{user.name}</span>
                        <span className="text-xs text-[#86868B] flex-shrink-0 hidden sm:inline">{user.position}</span>
                      </button>
                    );
                  })}
                  {firestoreUsersForModal.filter((u) => normalizeDeptCode(u.department || '') === normalizeDeptCode(taskForm.supportDepartment || '') && u.isActive).length === 0 && (<p className="text-sm text-[#86868B] p-2">No hay usuarios disponibles</p>)}
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      {/* Botones de acción */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 pb-2">
        <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">Cancelar</Button>
        <Button className={cn('text-white w-full sm:w-auto', createType === 'extra' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700')} onClick={onSubmit} disabled={!taskForm.title}>
          Crear Tarea
        </Button>
      </div>
    </div>
  );
}


interface TaskCardProps {
  task: Task;
  onStatusChange?: (taskId: string, status: TaskStatus, reason?: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onAddPhoto?: (taskId: string, photoUrl: string) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  onRateTask?: (taskId: string, rating: 'good' | 'bad', note: string, userId: string) => void;
  onComplete?: (taskId: string) => void;
  onReopen?: (taskId: string) => void;
  onAddNote?: (taskId: string, content: string, userId: string) => void;
  canReopen?: boolean;
  canUnblock?: boolean;
  currentUserId?: string;
  currentUser?: { id: string; name: string; role: Role; department: string; email?: string; level?: number } | null;
}

function TaskCard({ task, onStatusChange, onComplete, onReopen, onAddNote, canReopen, canUnblock, onToggleSubtask, onAddPhoto, onDelete, onEdit, onRateTask, currentUserId, currentUser }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [maximizedPhoto, setMaximizedPhoto] = useState<string | null>(null);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [unblockReason, setUnblockReason] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateNote, setRateNote] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [localSubtasks, setLocalSubtasks] = useState(task.subtasks || []);
  useEffect(() => { setLocalSubtasks(task.subtasks || []); }, [task.subtasks]);
  useEffect(() => { setLocalPhotos(task.photos ?? []); }, [task.photos]);
  const [localPhotos, setLocalPhotos] = useState(task.photos ?? []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUploaders, setPhotoUploaders] = useState<Record<string, string>>({});
  const { uploadImage } = useStorageUpload();
  const { users: firestoreUsers } = useFirestoreUsers();
  const allUsers = firestoreUsers;
  const { shifts } = useFirestoreShifts();
  const getUserName = (userId?: string) => {
    if (!userId) return 'Usuario desconocido';
    const user = allUsers.find((u) => u.id === userId);
    if (user) return user.name;
    const byEmail = allUsers.find((u) => u.email === userId);
    if (byEmail) return byEmail.name;
    return userId;
  };
  const statusColor = getStatusColor(task.status);
  const priorityColor = getPriorityColor(task.priority);
  
  const creatorName = getUserName(task.createdBy);
  const supervisorName = task.supervisorId ? getUserName(task.supervisorId) : `${creatorName} (Creador)`;
  const assignees = (task.assignedTo || []).map((id) => getUserName(id));
  const assignedShifts = task.shiftIds?.map((id) => shifts.find((s) => s.id === id)).filter(Boolean) || [];
  const allSubtasksCompleted = !task.subtasks || task.subtasks.length === 0 || task.subtasks.every((s) => s.completed);
  const hasRequiredPhotos = !task.requiresPhoto || (task.photos && task.photos.length > 0) || (localPhotos && localPhotos.length > 0);
  const canComplete = currentUserId && ((task.assignedTo || []).includes(currentUserId) || (task.supportUserIds || []).includes(currentUserId));
  const canDelete = currentUserId && (task.createdBy === currentUserId || currentUser?.role === Role.DIRECTOR_GENERAL);
  const canVerify = currentUserId && ((task.supervisorId === currentUserId) || (!task.supervisorId && (task.createdBy === currentUserId)) || currentUser?.role === Role.GERENTE_DEPARTAMENTO || currentUser?.role === Role.SUPERVISOR || currentUser?.role === Role.GERENTE_OPERACIONES || currentUser?.role === Role.RRHH || currentUser?.role === Role.DIRECTOR || currentUser?.role === Role.DIRECTOR_GENERAL);
  const canRate = currentUserId && (task.status === TaskStatus.VERIFIED) && !task.rating && ((task.supervisorId === currentUserId) || (!task.supervisorId && (task.createdBy === currentUserId)) || currentUser?.role === Role.GERENTE_DEPARTAMENTO || currentUser?.role === Role.SUPERVISOR || currentUser?.role === Role.GERENTE_OPERACIONES || currentUser?.role === Role.RRHH || currentUser?.role === Role.DIRECTOR || currentUser?.role === Role.DIRECTOR_GENERAL);
  const canSeeRating = currentUser && (currentUser.level <= 6 || task.createdBy === currentUserId || task.ratedBy === currentUserId);
  const toggleSubtask = (subtaskId: string) => {
    const target = localSubtasks.find(s => s.id === subtaskId);
    if ((task.status === TaskStatus.COMPLETED || task.status === TaskStatus.VERIFIED) && target?.completed) {
      return; // No desmarcar subtareas completadas en tareas finalizadas
    }
    setLocalSubtasks((prev) => {
      const updated = prev.map((s) => (s.id === subtaskId ? { ...s, completed: !s.completed } : s));
      const allCompleted = updated.every((s) => s.completed);
      const noneCompleted = updated.every((s) => !s.completed);
      if (task.status === TaskStatus.PENDING && (allCompleted || updated.some((s) => s.completed))) {
        onStatusChange?.(task.id, TaskStatus.IN_PROGRESS);
      }
      if (task.status === TaskStatus.IN_PROGRESS && noneCompleted) {
        onStatusChange?.(task.id, TaskStatus.PENDING);
      }
      onToggleSubtask?.(task.id, subtaskId);
      return updated;
    });
  };
  
  const handleAddPhoto = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const url = await uploadImage(file, `tasks/${task.id}`);
      setLocalPhotos(prev => [...prev, url]);
      setPhotoUploaders(prev => ({ ...prev, [url]: currentUserId || '' }));
      onAddPhoto?.(task.id, url);
    } catch (err) {
      console.error('Error subiendo foto:', err);
      alert('Error al subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (photoUrl: string) => {
    if (!window.confirm('Eliminar esta foto?')) return;
    setLocalPhotos(prev => prev.filter(p => p !== photoUrl));
    setPhotoUploaders(prev => { const copy = { ...prev }; delete copy[photoUrl]; return copy; });
  };

  const handleNoteSubmit = () => {
    if (!newNote.trim() || !currentUserId) return;
    onAddNote?.(task.id, newNote.trim(), currentUserId);
    setNewNote('');
    setShowNoteInput(false);
  };

  return (
    <div className={cn('bg-white rounded-xl border overflow-hidden transition-all max-w-full', task.type === 'EXTRA' ? 'border-amber-300' : 'border-[#E5E5E7]', task.status === TaskStatus.COMPLETED && currentUserId && ((task.supervisorId === currentUserId) || (!task.supervisorId && (task.createdBy === currentUserId))) && 'border-[#5856D6]', expanded && 'shadow-lg')}>
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 py-5 sm:p-4 flex items-start gap-3 text-left">
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="relative"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColor }} />{task.status === TaskStatus.VERIFIED && (<div className="absolute -top-1 -right-1 w-2 h-2 bg-[#34C759] rounded-full border border-white" title="Verificada" />)}</div>
          <span className="text-[10px] font-medium text-[#86868B] whitespace-nowrap">{getStatusLabel(task.status)}</span>
          <span className="text-[10px] text-[#C7C7CC] whitespace-nowrap">{task.type === 'EXTRA' ? 'Tarea Extra' : 'Tarea Especifica'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 min-w-0">
            <h4 className="font-medium text-[#1D1D1F] truncate min-w-0 flex-1">{task.title}</h4>
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end max-w-[50%] min-w-0">{task.status === TaskStatus.COMPLETED && (<Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 border-[#5856D6] text-[#5856D6] animate-pulse max-w-full">Por verificar: <span className="truncate max-w-[60px] sm:max-w-[120px] inline-block align-bottom">{supervisorName}</span></Badge>)}
            {task.status === TaskStatus.VERIFIED && (<Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 border-[#5856D6] text-[#5856D6]">Verificada</Badge>)}
            {task.rating === 'bad' && task.ratingNote && canSeeRating && (<Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 border-[#FF3B30] text-[#FF3B30]"><ThumbsDown className="w-3 h-3 inline" /></Badge>)}
            <Badge style={{ borderColor: priorityColor, color: priorityColor, backgroundColor: 'transparent' }} className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5">{getPriorityLabel(task.priority)}</Badge></div>
          </div>
          <p className="text-sm text-[#86868B] mt-2 sm:mt-1 line-clamp-4 sm:line-clamp-2 break-words">{task.description}</p>
          <div className="flex items-center gap-4 mt-3 flex-wrap min-w-0">
            <div className="flex -space-x-2 min-w-0">
              {(task.assignedTo || []).slice(0, 5).map((userId, i) => {
                const assignedUser = allUsers.find((u) => u.id === userId || u.email === userId);
                return (<UserAvatar key={i} name={assignedUser?.name || userId} photoUrl={assignedUser?.photoURL || assignedUser?.avatar} size="xs" className="border-2 border-white" title={assignedUser?.name || userId} />);
              })}
              {(task.supportUserIds || []).slice(0, 3).map((userId, i) => {
                const supportUser = allUsers.find((u) => u.id === userId || u.email === userId);
                return (<UserAvatar key={`s-${i}`} name={supportUser?.name || userId} photoUrl={supportUser?.photoURL || supportUser?.avatar} size="xs" className="border-2 border-dashed border-blue-400" fallbackClassName="bg-blue-500 text-[10px]" title={`Apoyo: ${supportUser?.name || userId}`} />);
              })}
              {task.assignedTo && task.assignedTo.length > 5 && (<div className="w-6 h-6 rounded-full bg-[#F5F5F7] border-2 border-white flex items-center justify-center text-[10px] text-[#86868B]">+{task.assignedTo.length - 5}</div>)}
            </div>
            {(() => {
              const isOverdue = new Date(task.dueDate + 'T' + (task.dueTime || '23:59')) < new Date() && task.status !== TaskStatus.VERIFIED && task.status !== TaskStatus.COMPLETED;
              return (
              <div className="flex items-center gap-1 text-xs text-[#86868B] min-w-0"><Calendar className="w-3.5 h-3.5 shrink-0" /><span className={isOverdue ? 'text-[#FF3B30] font-medium' : ''}>{formatDateWithYear(task.dueDate)}</span><span>•</span><span className={isOverdue ? 'text-[#FF3B30] font-medium' : ''}>{task.dueTime || '23:59'}</span>{isOverdue && (<Badge variant="outline" className="text-[10px] border-[#FF3B30] text-[#FF3B30] ml-1 animate-pulse shrink-0">ATRASADA</Badge>)}</div>
              );
            })()}
            {task.subtasks?.length > 0 && (<div className="flex items-center gap-1 text-xs text-[#86868B] min-w-0"><CheckCircle2 className="w-3.5 h-3.5" /><span>{task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}</span></div>)}
            {task.requiresPhoto && (<div className="flex items-center gap-1 text-xs text-[#86868B] min-w-0"><Camera className="w-3.5 h-3.5" /><span>{task.photos ? task.photos.length : 0}</span></div>)}
            {task.status === TaskStatus.COMPLETED && (<div className="flex items-center gap-1 text-xs text-[#5856D6] font-medium min-w-0"><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /><span className="truncate max-w-[120px] sm:max-w-[200px]">Por verificar: {supervisorName}</span></div>)}
            {task.status === TaskStatus.VERIFIED && (() => { const vEntry = task.history?.find((h) => h.action?.includes('VERIFIED')); const verifier = vEntry ? getUserName(vEntry.performedBy) : '—'; return (<div className="flex items-center gap-1 text-xs text-[#5856D6] font-medium min-w-0"><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /><span className="truncate max-w-[120px] sm:max-w-[200px]">Verificada por: {verifier}</span></div>); })()}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#E5E5E7]">
          <div className="py-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><span className="text-[#86868B]">Creada por:</span> <span className="text-[#1D1D1F] font-medium">{creatorName}</span></div>
              <div><span className="text-[#86868B]">Departamento:</span> <span className="text-[#1D1D1F]">{task.department.replace(/_/g, ' ')}</span></div>
              {task.startTime && (<div><span className="text-[#86868B]">Hora inicio:</span> <span className="text-[#1D1D1F]">{task.startTime}</span></div>)}
              {task.estimatedMinutes && (<div><span className="text-[#86868B]">Tiempo estimado:</span> <span className="text-[#1D1D1F]">{Math.floor(task.estimatedMinutes / 60)}h {task.estimatedMinutes % 60}min</span></div>)}
              <div><span className="text-[#86868B]">Fecha límite:</span> <span className="text-[#1D1D1F]">{formatDateWithYear(task.dueDate)}</span>{task.dueTime && <span className="text-[#1D1D1F]"> • {task.dueTime}</span>}</div>
            </div>
            <div className="text-sm bg-blue-50 rounded-lg p-2"><span className="text-blue-600 font-medium">Supervisor:</span> <span className="text-[#1D1D1F]">{supervisorName}</span></div>

            {task.rating === 'bad' && task.ratingNote && canSeeRating && (
              <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-2">
                <div className="flex items-center gap-1 text-red-600 font-medium">
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>Calificacion negativa</span>
                </div>
                <p className="text-[#1D1D1F] mt-1">{task.ratingNote}</p>
                {(() => { const rEntry = task.history?.find((h) => h.action?.includes('calificada') || h.action?.includes('Calificada')); const rater = rEntry ? getUserName(rEntry.performedBy) : '—'; const rDate = rEntry?.performedAt ? formatRelativeTime(rEntry.performedAt) : ''; return <p className="text-xs text-[#86868B] mt-1">Por: {rater}{rDate && <span> · {rDate}</span>}</p>; })()}
              </div>
            )}
            {assignees.length > 0 && (<div className="text-sm"><span className="text-[#86868B]">Asignados:</span> <span className="text-[#1D1D1F] font-medium">{assignees.join(', ')}</span></div>)}
            {task.supportUserIds && task.supportUserIds.length > 0 && (<div className="text-sm"><span className="text-[#86868B]">Apoyo:</span> <span className="text-[#1D1D1F] font-medium">{task.supportUserIds.map((id) => getUserName(id)).join(', ')}</span></div>)}
            {assignedShifts.length > 0 && (<div className="text-sm"><span className="text-[#86868B]">Turnos:</span> <span className="text-[#1D1D1F]">{assignedShifts.map((s) => `${s?.name} (${s?.startTime}-${s?.endTime})`).join(', ')}</span></div>)}
            <div className="bg-[#F5F5F7] rounded-lg p-3 max-w-full"><h5 className="text-sm font-medium text-[#1D1D1F] mb-2">Descripción</h5><p className="text-base text-[#1D1D1F] whitespace-pre-wrap break-words leading-relaxed max-w-full">{task.description || 'Sin descripción'}</p></div>
            {localSubtasks && localSubtasks.length > 0 && (<div className="space-y-2"><h5 className="text-sm font-medium text-[#1D1D1F]">Subtareas</h5><div className="space-y-1">{localSubtasks.map((subtask) => (<div key={subtask.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded" onClick={() => toggleSubtask(subtask.id)}><div className={cn('w-4 h-4 rounded border flex items-center justify-center', subtask.completed ? 'bg-[#34C759] border-[#34C759]' : 'border-[#C7C7CC]')}>{subtask.completed && <CheckCircle2 className="w-3 h-3 text-white" />}</div><span className={cn('text-sm', subtask.completed ? 'text-[#86868B] line-through' : 'text-[#1D1D1F]')}>{subtask.title}</span></div>))}</div></div>)}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium text-[#1D1D1F]">Fotos</h5>
                {canComplete && (
                  <CameraCapture onCapture={handleAddPhoto} taskRequiresPhoto={task.requiresPhoto} hidePreview />
                )}
              </div>
              {uploadingPhoto && <div className="text-xs text-[#007AFF] mb-1 flex items-center gap-1"><div className="w-3 h-3 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin"></div>Subiendo foto...</div>}
              {localPhotos && localPhotos.length > 0 ? (
                <div className="flex flex-wrap gap-2">{localPhotos.map((photo, idx) => {
                  const isUploaded = photo.startsWith('http') || photo.startsWith('data:image');
                  const uploader = photoUploaders[photo];
                  const showDelete = isUploaded && (canDelete || uploader === currentUserId);
                  return (<div key={idx} className="relative w-20 h-20 rounded-lg bg-[#F5F5F7] flex items-center justify-center border border-[#E5E5E7] overflow-hidden group">{isUploaded ? <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => setMaximizedPhoto(photo)} /> : <Camera className="w-6 h-6 text-[#86868B]" />}{showDelete && (<button onClick={(e) => { e.stopPropagation(); handleRemovePhoto(photo); }} className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">&times;</button>)}</div>);
                })}</div>
              ) : <p className="text-sm text-[#86868B]">No hay fotos</p>}
            </div>
            {task.history && task.history.length > 0 && (<div className="space-y-2"><h5 className="text-sm font-medium text-[#1D1D1F]">Historial</h5><div className="space-y-1 text-sm max-h-40 overflow-y-auto bg-[#F5F5F7] rounded-lg p-3">{task.history.filter((h) => canSeeRating || !(h.action?.toLowerCase().includes('calificada') || h.action?.toLowerCase().includes('calificacion'))).map((h) => { const performer = allUsers.find((u) => u.id === h.performedBy || u.email === h.performedBy); const performerName = performer?.name || h.performedBy; return (<div key={h.id || Math.random()} className="flex items-start gap-2 text-[#86868B]"><span>•</span><div className="flex-1"><span>{h.action}</span>{h.note && <span className="text-xs block text-[#1D1D1F]">{h.note}</span>}<span className="text-xs block">Por: {performerName} • {formatHistoryDateTime(h.performedAt)}</span></div></div>); })}</div></div>)}
            

<div className="space-y-2 pt-2 border-t border-[#E5E5E7]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#86868B]" />
                <h5 className="text-sm font-medium text-[#1D1D1F]">Notas</h5>
              </div>
              {task.notes && task.notes.length > 0 ? (
                <div className="space-y-2">
                  {task.notes.map((note) => {
                    const noteAuthor = allUsers.find((u) => u.id === note.createdBy || u.email === note.createdBy);
                    return (
                      <div key={note.id} className="bg-[#F5F5F7] rounded-lg p-3">
                        <p className="text-sm text-[#1D1D1F] whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-[#86868B]">
                          <span>{noteAuthor?.name || note.createdBy}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(note.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[#86868B] italic">No hay notas aún</p>
              )}
              {currentUserId && (
                <>
                  {!showNoteInput ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowNoteInput(true)} className="w-full">
                      <Plus className="w-4 h-4 mr-1" /> Agregar nota
                    </Button>
                  ) : (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleNoteSubmit(); }}
                      className="flex flex-col gap-2"
                    >
                      <Input
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Escribe una nota y presiona Enter..."
                        className="flex-1 min-w-0"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNoteSubmit(); }
                          if (e.key === 'Escape') { setShowNoteInput(false); setNewNote(''); }
                        }}
                        autoFocus
                      />
                      <p className="text-xs text-[#86868B]">Presiona Enter para guardar, Escape para cancelar.</p>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-[#E5E5E7] flex-wrap">
            {task.status === TaskStatus.PENDING && canComplete && (<Button size="sm" className="bg-[#007AFF] hover:bg-[#007AFF]/90 text-white" onClick={() => onStatusChange?.(task.id, TaskStatus.IN_PROGRESS)}>En Progreso</Button>)}
            {task.status === TaskStatus.IN_PROGRESS && canComplete && (
              <>
                {!allSubtasksCompleted ? (
                  <Button size="sm" variant="outline" className="border-amber-500 text-amber-600" disabled title="Completa todas las subtareas primero">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Completa subtareas
                  </Button>
                ) : !hasRequiredPhotos ? (
                  <CameraCapture onCapture={handleAddPhoto} taskRequiresPhoto={task.requiresPhoto} hidePreview />
                ) : (
                  <Button size="sm" className="bg-[#34C759] hover:bg-[#34C759]/90 text-white" onClick={() => setShowCompleteConfirm(true)}>Completar</Button>
                )}
                <Button size="sm" variant="outline" className="border-[#8E8E93] text-[#8E8E93]" onClick={() => onStatusChange?.(task.id, TaskStatus.PENDING, 'Tarea marcada como Pendiente')}>Marcar como Pendiente</Button>
              </>
            )}
            {task.status === TaskStatus.COMPLETED && (canVerify || task.createdBy === currentUserId) && (<><Button size="sm" className="bg-[#5856D6] hover:bg-[#5856D6]/90 text-white" onClick={() => onStatusChange?.(task.id, TaskStatus.VERIFIED)}>Verificar</Button><Button size="sm" variant="outline" onClick={() => setShowReopenModal(true)}>Marcar como Pendiente</Button></>)}
            {task.status === TaskStatus.VERIFIED && (
              <>
                {canRate && (<Button size="sm" variant="outline" className="border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/10 gap-1" onClick={() => setShowRateModal(true)}><ThumbsDown className="w-4 h-4" />Calificar</Button>)}
                <Button size="sm" variant="outline" onClick={() => setShowReopenModal(true)}>Marcar como Pendiente</Button>
                {task.rating === 'bad' && task.ratingNote && canRate && (
                  <div className="w-full bg-red-50 border border-red-200 rounded-lg p-2 mt-1">
                    <p className="text-xs text-red-600 font-medium">Calificacion negativa:</p>
                    <p className="text-sm text-red-700">{task.ratingNote}</p>
                  </div>
                )}
              </>
            )}
            {task.status === TaskStatus.BLOCKED && canUnblock && (<Button size="sm" className="bg-[#FF9500] hover:bg-[#FF9500]/90 text-white" onClick={() => setShowUnblockModal(true)}>Desbloquear</Button>)}
            {(task.status === TaskStatus.PENDING || task.status === TaskStatus.IN_PROGRESS) && canComplete && (<Button size="sm" variant="outline" onClick={() => setShowBlockModal(true)}>Bloquear</Button>)}
            {task.status !== TaskStatus.VERIFIED && (task.createdBy === currentUserId || task.createdBy === currentUser?.email || currentUser?.role === Role.DIRECTOR_GENERAL) && (<Button size="sm" variant="outline" className="border-[#FF3B30] text-[#FF3B30]" onClick={async () => { if (window.confirm('¿Eliminar esta tarea permanentemente?')) { try { await onDelete?.(task.id); } catch { /* error handled by parent */ } } }}>Eliminar</Button>)}
            {task.type === TaskType.EXTRA && (task.createdBy === currentUserId || task.createdBy === currentUser?.email || currentUser?.role === Role.DIRECTOR_GENERAL) && (<Button size="sm" variant="outline" className="border-[#007AFF] text-[#007AFF]" onClick={() => onEdit?.(task)}>Editar</Button>)}
          </div>

          {showCompleteConfirm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4"><h3 className="text-lg font-semibold mb-2">¿Completar tarea?</h3><p className="text-sm text-slate-600 mb-4">¿Confirmas que la tarea "{task.title}" fue completada correctamente?</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCompleteConfirm(false)}>Cancelar</Button><Button className="bg-[#34C759] hover:bg-[#34C759]/90 text-white" onClick={() => { onComplete?.(task.id); setShowCompleteConfirm(false); }}>Sí, completar</Button></div></div></div>)}
          {showReopenModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4"><h3 className="text-lg font-semibold mb-2">Marcar como Pendiente</h3><p className="text-sm text-slate-600 mb-4">Indica el motivo por el cual la tarea debe volver a pendiente:</p><textarea value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="Escribe el motivo..." className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-sm" rows={3} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowReopenModal(false)}>Cancelar</Button><Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => { if (reopenReason.trim()) { onReopen?.(task.id); setShowReopenModal(false); setReopenReason(''); } }} disabled={!reopenReason.trim()}>Marcar como Pendiente</Button></div></div></div>)}
          {showUnblockModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4"><h3 className="text-lg font-semibold mb-2">Desbloquear Tarea</h3><p className="text-sm text-slate-600 mb-4">Indica el motivo por el cual se desbloquea la tarea:</p><textarea value={unblockReason} onChange={(e) => setUnblockReason(e.target.value)} placeholder="Escribe el motivo del desbloqueo..." className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-sm" rows={3} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowUnblockModal(false)}>Cancelar</Button><Button className="bg-[#FF9500] hover:bg-[#FF9500]/90 text-white" onClick={() => { if (unblockReason.trim()) { onStatusChange?.(task.id, TaskStatus.PENDING, unblockReason); setShowUnblockModal(false); setUnblockReason(''); } }} disabled={!unblockReason.trim()}>Desbloquear</Button></div></div></div>)}
          {showBlockModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4"><h3 className="text-lg font-semibold mb-2">Bloquear Tarea</h3><p className="text-sm text-slate-600 mb-4">Indica el motivo por el cual se bloquea la tarea:</p><textarea value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Escribe el motivo del bloqueo..." className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-sm" rows={3} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowBlockModal(false)}>Cancelar</Button><Button className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white" onClick={() => { if (blockReason.trim()) { onStatusChange?.(task.id, TaskStatus.BLOCKED, blockReason); setShowBlockModal(false); setBlockReason(''); } }} disabled={!blockReason.trim()}>Bloquear</Button></div></div></div>)}
          {showRateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  Calificacion Negativa
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Indica el motivo por el cual calificas negativamente esta tarea.
                </p>
                <textarea
                  value={rateNote}
                  onChange={(e) => setRateNote(e.target.value)}
                  placeholder="Escribe el motivo..."
                  className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-sm"
                  rows={4}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowRateModal(false)}>Cancelar</Button>
                  <Button
                    className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white gap-1"
                    onClick={() => {
                      if (rateNote.trim() && currentUserId) {
                        onRateTask?.(task.id, 'bad', rateNote, currentUserId);
                        setShowRateModal(false);
                        setRateNote('');
                      }
                    }}
                    disabled={!rateNote.trim()}
                  >
                    Calificar Negativamente
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          
        </div>
      )}
      {maximizedPhoto && (<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setMaximizedPhoto(null)}><img src={maximizedPhoto} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" alt="Foto maximizada" /><button className="absolute top-4 right-4 text-white text-2xl">&times;</button></div>)}
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
  onAddViewer?: (id: string, userId: string) => void;
  onAddPhoto?: (id: string, photoUrl: string, userId: string) => void;
}

function IncidenciaCard({ incidencia, currentUserId, currentUser, onConfirmIncidencia, onResolveIncidencia, onCloseIncidencia, onReopenIncidencia, onAddNote, onAddViewer, onAddPhoto }: IncidenciaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { getDeptName, isOperationalDepartment } = useDynamicDepartments();
  const [maximizedPhoto, setMaximizedPhoto] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [resolution, setResolution] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [viewers, setViewers] = useState<string[]>([]);
  const { users: firestoreUsers } = useFirestoreUsers();

  const handleNoteSubmit = () => {
    if (!newNote.trim() || !currentUserId) return;
    onAddNote?.(incidencia.id, newNote.trim(), currentUserId);
    setNewNote('');
    setShowNoteInput(false);
  };

  const statusColor = getIncidenciaStatusColor(incidencia.status);
  const priorityColor = getPriorityColor(incidencia.priority);

  const getUserName = (userId?: string) => {
    if (!userId) return 'Usuario desconocido';
    const byId = firestoreUsers.find((u) => u.id === userId);
    if (byId) return byId.name;
    const byEmail = firestoreUsers.find((u) => u.email === userId);
    if (byEmail) return byEmail.name;
    return userId;
  };

  const reporter = firestoreUsers.find((u) => u.id === incidencia.reportedBy || u.email === incidencia.reportedBy);
  
  // Verificar si el usuario actual ya vio la incidencia
  const hasViewed = currentUserId && incidencia.viewers?.some((v) => v.userId === currentUserId);
  
  // Registrar visualización cuando se expande (persiste en Firestore)
  const handleExpand = () => {
    if (!expanded && currentUserId && !hasViewed) {
      onAddViewer?.(incidencia.id, currentUserId);
    }
    setExpanded(!expanded);
  };

  // Verificadores requeridos: GDs + supervisores de deptos involucrados + superiores
  const deptosInvolucrados = incidencia.targetDepartments || [incidencia.targetDepartment];

  // Para cada departamento involucrado, deben verificar obligatoriamente el gerente Y el supervisor.
  // Si el departamento no tiene uno de esos roles, un superior (RRHH, Director, Director General o Gerente de Operaciones si es operativo) puede cubrirlo.
  const todosVerificaron = deptosInvolucrados.every((dept) => {
    const deptCode = normalizeDeptCode(dept || '');
    const verifiers = (incidencia.verifiedByList || []).map((v) => firestoreUsers.find((u) => u.id === v || u.email === v)).filter(Boolean);
    const deptVerifiers = verifiers.filter((v) => normalizeDeptCode(v?.department || '') === deptCode);
    const hasManager = deptVerifiers.some((v) => v?.role === Role.GERENTE_DEPARTAMENTO);
    const hasSupervisor = deptVerifiers.some((v) => v?.role === Role.SUPERVISOR);

    if (hasManager && hasSupervisor) return true;

    const isOperational = isOperationalDepartment(deptCode);
    const hasSuperior = verifiers.some((v) =>
      v?.role === Role.RRHH ||
      v?.role === Role.DIRECTOR ||
      v?.role === Role.DIRECTOR_GENERAL ||
      (isOperational && v?.role === Role.GERENTE_OPERACIONES)
    );

    const deptHasManager = firestoreUsers.some((u) => normalizeDeptCode(u.department || '') === deptCode && u.role === Role.GERENTE_DEPARTAMENTO);
    const deptHasSupervisor = firestoreUsers.some((u) => normalizeDeptCode(u.department || '') === deptCode && u.role === Role.SUPERVISOR);

    const managerOk = hasManager || (!deptHasManager && hasSuperior);
    const supervisorOk = hasSupervisor || (!deptHasSupervisor && hasSuperior);

    return managerOk && supervisorOk;
  });
  const yaVerifico = currentUserId && (incidencia.verifiedByList || []).includes(currentUserId);
  
  const canConfirm = currentUser && (currentUser.role === Role.GERENTE_DEPARTAMENTO || currentUser.role === Role.SUPERVISOR || currentUser.role === Role.GERENTE_OPERACIONES || currentUser.role === Role.RRHH || currentUser.role === Role.DIRECTOR || currentUser.role === Role.DIRECTOR_GENERAL);
  const canResolve = currentUser && incidencia.status === IncidenciaStatus.VERIFIED && todosVerificaron && (currentUser.role === Role.GERENTE_DEPARTAMENTO || currentUser.role === Role.SUPERVISOR || currentUser.role === Role.GERENTE_OPERACIONES || currentUser.role === Role.RRHH || currentUser.role === Role.DIRECTOR || currentUser.role === Role.DIRECTOR_GENERAL);
  const canClose = currentUser && (currentUser.role === Role.GERENTE_DEPARTAMENTO || currentUser.role === Role.SUPERVISOR || currentUser.role === Role.GERENTE_OPERACIONES || currentUser.role === Role.RRHH || currentUser.role === Role.DIRECTOR || currentUser.role === Role.DIRECTOR_GENERAL);

  return (
    <>
      <div className={cn('bg-white rounded-xl border border-[#E5E5E7] overflow-hidden transition-all', expanded && 'shadow-lg')}>
        <button onClick={handleExpand} className="w-full p-4 flex items-start gap-3 text-left">
          <Badge style={{ borderColor: priorityColor, color: priorityColor, backgroundColor: 'transparent' }} className="text-xs flex-shrink-0">{getPriorityLabel(incidencia.priority)}</Badge>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-[#1D1D1F] truncate">{incidencia.title}</h4>
              <Badge style={{ backgroundColor: statusColor, color: '#fff' }} className="text-xs flex-shrink-0">{getIncidenciaStatusLabel(incidencia.status)}</Badge>
            </div>
            <p className="text-sm text-[#86868B] line-clamp-2 mt-1">{incidencia.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-[#86868B]">
              <div className="flex flex-row flex-wrap gap-x-3 gap-y-1 mt-2 text-xs items-center">



                {(incidencia.verifiedByList || []).length > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <CheckCircle2 className="w-3 h-3 text-[#5856D6]" />
                    <span className="text-[#86868B]">Verificada por:</span>
                    {incidencia.verifiedByList.map((vId) => {
                      const vUser = firestoreUsers.find((u) => u.id === vId || u.email === vId);
                      const vEntry = (incidencia.history || []).find((h) => h.action === "Incidencia verificada" && (h.performedBy === vId || h.performedBy === vUser?.email));
                      return (
                        <span key={vId} className="inline-flex items-center gap-1 text-[#1D1D1F] font-medium">
                          <UserAvatar name={vUser?.name || getUserName(vId)} photoUrl={vUser?.photoURL || vUser?.avatar} size="xs" />
                          {vUser?.name || getUserName(vId)}{vEntry?.performedAt ? " • " + formatHistoryDateTime(vEntry.performedAt) : ""}
                        </span>
                      );
                    })}
                  </div>
                ) : incidencia.confirmedBy ? (
                  (() => {
                    const cUser = firestoreUsers.find((u) => u.id === incidencia.confirmedBy || u.email === incidencia.confirmedBy);
                    return (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-[#5856D6]" />
                        <span className="text-[#86868B]">Verificada por:</span>
                        <span className="inline-flex items-center gap-1 text-[#1D1D1F] font-medium">
                          <UserAvatar name={cUser?.name || getUserName(incidencia.confirmedBy)} photoUrl={cUser?.photoURL || cUser?.avatar} size="xs" />
                          {cUser?.name || getUserName(incidencia.confirmedBy)}{incidencia.confirmedAt ? " • " + formatHistoryDateTime(incidencia.confirmedAt) : ""}
                        </span>
                      </div>
                    );
                  })()
                ) : null}
                <div className="flex items-center gap-1.5">
                  <LayoutGrid className="w-3 h-3 text-[#86868B]" />
                  <span className="text-[#86868B]">Desde:</span>
                  <span className="text-[#1D1D1F] font-medium">{reporter?.department ? getDeptName(reporter.department) : getDeptName(incidencia.targetDepartment)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-[#86868B]" />
                  <span className="text-[#86868B]">Para:</span>
                  <span className="text-[#1D1D1F] font-medium">{incidencia.targetDepartments ? incidencia.targetDepartments.map(getDeptName).join(", ") : getDeptName(incidencia.targetDepartment)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-[#86868B]" />
                  <span className="text-[#86868B]">{formatRelativeTime(incidencia.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[#86868B]">{expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 border-t border-[#E5E5E7]">
            <div className="py-4 space-y-4">
              {/* Descripción */}
              <div className="bg-[#F5F5F7] rounded-lg p-3"><p className="text-sm text-[#1D1D1F] whitespace-pre-wrap">{incidencia.description}</p></div>


              {/* Accion: basado en el estado ACTUAL */}
              {(() => {
                const histRev = [...(incidencia.history || [])].reverse();
                const closeHist = histRev.find(h => h.action === "Incidencia cerrada");
                const reopenHist = histRev.find(h => h.action === "Incidencia reabierta");
                const resNote = [...(incidencia.notes || [])].reverse().find(n => n.content.replace(/[íi]/g, "i").toLowerCase().startsWith("resolucion:"));
                // Estado ACTUAL decide el color, no el historial
                if (incidencia.status === IncidenciaStatus.REOPENED && reopenHist?.note) return (
                  <div className="bg-[#007AFF]/10 border border-[#007AFF] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2"><Unlock className="w-4 h-4 text-[#007AFF]" /><span className="text-xs font-semibold text-[#007AFF] uppercase tracking-wide">Motivo de reapertura</span></div>
                    <p className="text-sm text-[#1D1D1F]">{reopenHist.note}</p>
                    {incidencia.reopenedBy && <p className="text-xs text-[#86868B] mt-1">{getUserName(incidencia.reopenedBy)} • {incidencia.reopenedAt ? formatHistoryDateTime(incidencia.reopenedAt) : ""}</p>}
                  </div>
                );
                if (incidencia.status === IncidenciaStatus.CLOSED && closeHist?.note) return (
                  <div className="bg-[#8E8E93]/10 border border-[#8E8E93] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2"><Lock className="w-4 h-4 text-[#8E8E93]" /><span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Motivo de cierre</span></div>
                    <p className="text-sm text-[#1D1D1F]">{closeHist.note}</p>
                    {incidencia.closedBy && <p className="text-xs text-[#86868B] mt-1">{getUserName(incidencia.closedBy)} • {incidencia.closedAt ? formatHistoryDateTime(incidencia.closedAt) : ""}</p>}
                  </div>
                );
                if (incidencia.status === IncidenciaStatus.RESOLVED && resNote) return (
                  <div className="bg-[#34C759]/10 border border-[#34C759] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-[#34C759]" /><span className="text-xs font-semibold text-[#34C759] uppercase tracking-wide">Resolucion</span></div>
                    <p className="text-sm text-[#1D1D1F]">{resNote.content.replace(/Resoluci[óo]n:\s*/i, "")}</p>
                    <p className="text-xs text-[#86868B] mt-1">{getUserName(resNote.createdBy)} • {formatRelativeTime(resNote.createdAt)}</p>
                  </div>
                );
                return null;
              })()}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2"><UserCircle className="w-4 h-4 text-[#86868B]" /><span className="text-[#86868B]">Reportado por:</span><span className="inline-flex items-center gap-1.5 text-[#1D1D1F] font-medium"><UserAvatar name={reporter?.name || getUserName(incidencia.reportedBy)} photoUrl={reporter?.photoURL || reporter?.avatar} size="xs" />{reporter?.name || getUserName(incidencia.reportedBy)}</span></div>
                <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-[#86868B]" /><span className="text-[#86868B]">Departamento:</span><span className="text-[#1D1D1F] font-medium">{getDeptName(incidencia.targetDepartment)}</span></div>
                {incidencia.confirmedBy && (() => {
                  const cUser = firestoreUsers.find((u) => u.id === incidencia.confirmedBy || u.email === incidencia.confirmedBy);
                  return (<div className="flex items-center gap-2"><CheckSquare className="w-4 h-4 text-[#5856D6]" /><span className="text-[#86868B]">Verificado por:</span><span className="inline-flex items-center gap-1.5 text-[#1D1D1F] font-medium"><UserAvatar name={cUser?.name || getUserName(incidencia.confirmedBy)} photoUrl={cUser?.photoURL || cUser?.avatar} size="xs" />{cUser?.name || getUserName(incidencia.confirmedBy)}</span></div>);
                })()}



              </div>
              {(incidencia.viewers || []).length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-[#86868B]" />
                    <h5 className="text-sm font-medium text-[#1D1D1F]">Visualizado por ({(incidencia.viewers || []).length})</h5>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(incidencia.viewers || []).map((viewerObj) => {
                      const viewer = firestoreUsers.find((u) => u.id === viewerObj.userId || u.email === viewerObj.userId);
                      const viewerName = viewer?.name || getUserName(viewerObj.userId);
                      return viewerName !== viewerObj.userId ? (
                        <span key={viewerObj.userId} className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#F5F5F7] rounded-full text-xs">
                          <UserAvatar name={viewerName} photoUrl={viewer?.photoURL || viewer?.avatar} size="xs" />{viewerName} <span className="text-[#86868B] text-[10px]">({new Date(viewerObj.viewedAt).toLocaleDateString()})</span>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              {incidencia.photos && incidencia.photos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#86868B]" />
                    <h5 className="text-sm font-medium text-[#1D1D1F]">Fotos ({incidencia.photos.length})</h5>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {incidencia.photos.map((photo) => {
                      const uploader = firestoreUsers.find((u) => u.id === photo.uploadedBy || u.email === photo.uploadedBy);
                      return (
                        <div key={photo.url} className="space-y-1">
                          <div className="relative group aspect-square rounded-lg overflow-hidden border border-[#E5E5E7] bg-[#F5F5F7]">
                            <img src={photo.url} alt="Foto" className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => setMaximizedPhoto(photo.url)} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <UserAvatar name={uploader?.name || getUserName(photo.uploadedBy)} photoUrl={uploader?.photoURL || uploader?.avatar} size="xs" />
                            <p className="text-[10px] text-[#86868B] truncate">{uploader?.name || getUserName(photo.uploadedBy)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {incidencia.history?.length > 0 && (<div className="space-y-2"><div className="flex items-center gap-2"><History className="w-4 h-4 text-[#86868B]" /><h5 className="text-sm font-medium text-[#1D1D1F]">Historial</h5></div><div className="space-y-1 text-sm max-h-40 overflow-y-auto bg-[#F5F5F7] rounded-lg p-3">{incidencia.history.map((h) => { const performer = firestoreUsers.find((u) => u.id === h.performedBy || u.email === h.performedBy); const performerName = performer?.name || h.performedBy; return (<div key={h.id || Math.random()} className="flex items-start gap-2 text-[#86868B]"><span>•</span><div className="flex-1"><span>{h.action}</span>{h.note && <span className="text-xs block text-[#1D1D1F]">{h.note}</span>}<span className="text-xs block">Por: {performerName} • {formatHistoryDateTime(h.performedAt)}</span></div></div>); })}</div></div>)}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#86868B]" />
                  <h5 className="text-sm font-medium text-[#1D1D1F]">Notas</h5>
                </div>
                {incidencia.notes?.length > 0 ? (
                  <div className="space-y-2">
                    {incidencia.notes
                      .filter((note) => !note.content.startsWith('Resolución:') && !note.content.startsWith('Motivo de cierre:') && !note.content.startsWith('Motivo de reapertura:'))
                      .map((note) => {
                        const noteAuthor = firestoreUsers.find((u) => u.id === note.createdBy || u.email === note.createdBy);
                        return (
                          <div key={note.id} className="bg-[#F5F5F7] rounded-lg p-3">
                            <p className="text-sm text-[#1D1D1F] whitespace-pre-wrap">{note.content}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-[#86868B]">
                              <span>{noteAuthor?.name || getUserName(note.createdBy)}</span>
                              <span>•</span>
                              <span>{formatRelativeTime(note.createdAt)}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-[#86868B] italic">No hay notas aún</p>
                )}
                {currentUserId && (
                  <>
                    {!showNoteInput ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => setShowNoteInput(true)} className="w-full">
                        <Plus className="w-4 h-4 mr-1" /> Agregar nota
                      </Button>
                    ) : (
                      <form
                        onSubmit={(e) => { e.preventDefault(); handleNoteSubmit(); }}
                        className="flex flex-col gap-2"
                      >
                        <Input
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Escribe una nota y presiona Enter..."
                          className="flex-1 min-w-0"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNoteSubmit(); }
                            if (e.key === 'Escape') { setShowNoteInput(false); setNewNote(''); }
                          }}
                          autoFocus
                        />
                        <p className="text-xs text-[#86868B]">Presiona Enter para guardar, Escape para cancelar.</p>
                      </form>
                    )}
                  </>
                )}
              </div>
            </div>
              
              <div className="flex items-center gap-2 pt-3 border-t border-[#E5E5E7] flex-wrap">
              {canConfirm && !yaVerifico && !todosVerificaron && (<Button size="sm" onClick={() => setShowConfirmModal(true)} className="bg-[#5856D6] hover:bg-[#5856D6]/90 text-white gap-1"><CheckSquare className="w-3.5 h-3.5" />Verificar</Button>)}
              {incidencia.status === IncidenciaStatus.VERIFIED && canResolve && (<Button size="sm" onClick={() => setShowResolveModal(true)} className="bg-[#34C759] hover:bg-[#34C759]/90 text-white gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Resolver</Button>)}
              {/* Botón Cerrar disponible desde el inicio para supervisores+ */}
              {canClose && incidencia.status !== IncidenciaStatus.CLOSED && incidencia.status !== IncidenciaStatus.RESOLVED && (<Button size="sm" onClick={() => setShowCloseModal(true)} className="bg-[#8E8E93] hover:bg-[#8E8E93]/90 text-white gap-1"><Lock className="w-3.5 h-3.5" />Cerrar</Button>)}
              {(incidencia.status === IncidenciaStatus.CLOSED || incidencia.status === IncidenciaStatus.RESOLVED) && (<Button size="sm" variant="outline" onClick={() => setShowReopenModal(true)} className="gap-1 border-[#007AFF] text-[#007AFF] hover:bg-[#007AFF]/5"><Unlock className="w-3.5 h-3.5" />Reabrir</Button>)}
            </div>
          </div>
        )}
      </div>

      {showConfirmModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4"><h3 className="text-lg font-semibold mb-2">Confirmar Incidencia</h3><p className="text-sm text-slate-600 mb-4">¿Estás seguro de que deseas verificar esta incidencia?</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancelar</Button><Button className="bg-[#5856D6] hover:bg-[#5856D6]/90 text-white" onClick={() => { if (currentUserId) { onConfirmIncidencia?.(incidencia.id, currentUserId); setShowConfirmModal(false); } }}>Verificar</Button></div></div></div>)}
      {showResolveModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4"><h3 className="text-lg font-semibold mb-2">Resolver Incidencia</h3><p className="text-sm text-slate-600 mb-4">Describe cómo se resolvió la incidencia:</p><textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Escribe la resolución..." className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-sm" rows={4} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowResolveModal(false)}>Cancelar</Button><Button className="bg-[#34C759] hover:bg-[#34C759]/90 text-white" onClick={() => { if (currentUserId) { onResolveIncidencia?.(incidencia.id, currentUserId, resolution); setShowResolveModal(false); setResolution(''); } }} disabled={!resolution.trim()}>Resolver</Button></div></div></div>)}
      {showCloseModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4"><h3 className="text-lg font-semibold mb-2">Cerrar Incidencia</h3><p className="text-sm text-slate-600 mb-4">Escribe el motivo del cierre:</p><textarea value={closeReason} onChange={(e) => setCloseReason(e.target.value)} placeholder="Escribe el motivo..." className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-sm" rows={4} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCloseModal(false)}>Cancelar</Button><Button className="bg-[#8E8E93] hover:bg-[#8E8E93]/90 text-white" onClick={() => { if (currentUserId) { onCloseIncidencia?.(incidencia.id, currentUserId, closeReason); setShowCloseModal(false); setCloseReason(''); } }} disabled={!closeReason.trim()}>Cerrar</Button></div></div></div>)}
      {showReopenModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4"><h3 className="text-lg font-semibold mb-2">Reabrir Incidencia</h3><p className="text-sm text-slate-600 mb-4">Escribe el motivo de la reapertura:</p><textarea value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="Escribe el motivo..." className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-sm" rows={4} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowReopenModal(false)}>Cancelar</Button><Button className="bg-[#007AFF] hover:bg-[#007AFF]/90 text-white" onClick={() => { if (currentUserId) { onReopenIncidencia?.(incidencia.id, currentUserId, reopenReason); setShowReopenModal(false); setReopenReason(''); } }} disabled={!reopenReason.trim()}>Reabrir</Button></div></div></div>)}
      {maximizedPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setMaximizedPhoto(null)}>
          <div className="relative max-w-[95vw] sm:max-w-4xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={maximizedPhoto} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" alt="Foto maximizada" />
            <div className="flex items-center gap-4 mt-4">
              {incidencia.photos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => setMaximizedPhoto(photo.url)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${maximizedPhoto === photo.url ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={photo.url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <button className="absolute top-0 right-0 text-white text-3xl hover:text-gray-300" onClick={() => setMaximizedPhoto(null)}>&times;</button>
          </div>
        </div>
      )}
    </>
  );
}
