// ═══════════════════════════════════════════════════════════════════
// HOOK DE TAREAS - WRAPPER PARA FIRESTORE
// ═══════════════════════════════════════════════════════════════════

import React, { createContext, useContext } from 'react';
import { useFirestoreTasks } from './firestore/useFirestoreTasks';
import { useFirestoreIncidencias } from './firestore/useFirestoreIncidencias';
import { TaskStatus, TaskType, TaskPriority } from '@/types';
import { useDynamicDepartments } from '@/hooks/firestore/useDynamicDepartments';

function normalizeDeptCode(name: string): string {
  if (!name) return '';
  const cleaned = name.trim().replace(/\s+/g, '_').toUpperCase();
  const map: Record<string, string> = {
    'ADMINISTRATIVO': 'ADMINISTRATIVO',
    'FINANCIERO': 'FINANCIERO',
    'VENTAS': 'VENTAS',
    'MARKETING': 'MARKETING',
    'DIVE_SHOP': 'DIVE_SHOP',
    'DIVE': 'DIVE_SHOP',
    'GUIADO_DE_BUCEO': 'GUIANZA',
    'GUIANZA': 'GUIANZA',
    'COCINA': 'COCINA',
    'MOVILIDAD': 'MOVILIDAD',
    'WAREHOUSE': 'WAREHOUSE',
    'VESSELS': 'VESSELS',
    'OPERACIONES': 'OPERACIONES',
  };
  return map[cleaned] || cleaned;
}

// ═══════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════

const TasksContext = createContext<any>(undefined);

// ═══════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════

interface TasksProviderProps {
  children: React.ReactNode;
}

export function TasksProvider({ children }: TasksProviderProps) {
  const tasksHook = useFirestoreTasks();
  const { defaultDepartment } = useDynamicDepartments();
  const incidenciasHook = useFirestoreIncidencias();

  const value = {
    tasks: tasksHook.tasks,
    incidencias: incidenciasHook.incidencias,
    isLoading: tasksHook.loading || incidenciasHook.loading,

    // Tasks
    getTasks: (filters?: any) => {
      let result = [...tasksHook.tasks];
      if (filters?.department) {
        result = result.filter((t: any) => t.department === filters.department);
      }
      if (filters?.status) {
        result = result.filter((t: any) => t.status === filters.status);
      }
      if (filters?.assignedTo) {
        result = result.filter((t: any) => t.assignedTo === filters.assignedTo);
      }
      return result;
    },

    getTaskById: (id: string) => tasksHook.tasks.find((t: any) => t.id === id),

    getTasksByUser: (userId: string) => tasksHook.tasks.filter((t: any) => t.assignedTo?.includes(userId)),

    getTasksByDepartment: (department: string) => tasksHook.tasks.filter((t: any) => t.department === department),

    getTasksByStatus: (status: TaskStatus) => tasksHook.tasks.filter((t: any) => t.status === status),

    getOverdueTasks: () => tasksHook.tasks.filter((t: any) => {
      if (!t.dueDate) return false;
      const today = new Date().toISOString().split('T')[0];
      return t.dueDate < today && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.VERIFIED;
    }),

    createTask: (task: any) => {
      return tasksHook.createTask({
        title: task.title || '',
        description: task.description || '',
        type: task.type || TaskType.SPECIFIC,
        status: TaskStatus.PENDING,
        priority: task.priority || TaskPriority.MEDIUM,
        assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo || []),
        department: normalizeDeptCode(task.department || defaultDepartment),
        dueDate: task.dueDate || new Date().toISOString(),
        dueTime: task.dueTime || '',
        createdBy: task.createdBy || '',
        createdAt: new Date().toISOString(),
        supervisorId: task.supervisorId || '',
        requiresPhoto: task.requiresPhoto || false,
        startTime: task.startTime || '',
        estimatedMinutes: task.estimatedMinutes || 0,
        subtasks: task.subtasks || [],
        shiftIds: task.shiftIds || [],
        supportUserIds: task.supportUserIds || [],
        recurrence: task.recurrence || 'NONE',
      });
    },

    updateTask: (id: string, updates: any) => {
      tasksHook.updateTask(id, updates);
    },

    deleteTask: (id: string) => {
      tasksHook.deleteTask(id);
    },

    changeTaskStatus: (id: string, status: TaskStatus, note?: string, userId?: string) => {
      tasksHook.changeTaskStatus(id, status, userId || '', note);
    },

    addSubtask: (taskId: string, title: string) => {
      tasksHook.addSubtask(taskId, title);
    },

    toggleSubtask: (taskId: string, subtaskId: string) => {
      tasksHook.toggleSubtask(taskId, subtaskId);
    },

    addNote: (taskId: string, content: string, userId: string) => {
      tasksHook.addNote(taskId, content, userId);
    },

    addPhoto: (taskId: string, photo: string) => {
      tasksHook.addPhoto(taskId, photo);
    },

    verifyTask: (id: string, userId: string) => {
      tasksHook.verifyTask(id, userId);
    },

    rateTask: (id: string, rating: 'good' | 'bad', note: string, userId: string) => {
      tasksHook.rateTask(id, rating, note, userId);
    },

    blockTask: (id: string, reason: string, userId: string) => {
      tasksHook.blockTask(id, reason, userId);
    },

    unblockTask: (id: string, note: string, userId: string) => {
      tasksHook.unblockTask(id, note, userId);
    },

    reopenTask: (id: string, userId: string) => {
      tasksHook.reopenTask(id, userId);
    },

    // Incidencias - ahora leen de coleccion 'incidencias' separada de 'incapacidades'
    getIncidencias: (filters?: any) => {
      let result = [...incidenciasHook.incidencias];
      if (filters?.status) {
        result = result.filter((i: any) => i.status === filters.status);
      }
      return result;
    },

    createIncidencia: incidenciasHook.createIncidencia,
    confirmIncidencia: incidenciasHook.confirmIncidencia,
    resolveIncidencia: incidenciasHook.resolveIncidencia,
    closeIncidencia: incidenciasHook.closeIncidencia,
    reopenIncidencia: incidenciasHook.reopenIncidencia,
    addIncidenciaNote: incidenciasHook.addNote,
    addIncidenciaViewer: incidenciasHook.addViewer,
    addIncidenciaPhoto: incidenciasHook.addPhoto,

    // Contadores
    getTaskCounts: () => {
      const counts = tasksHook.getTaskCounts();
      return {
        total: counts.total,
        pending: counts.pending,
        inProgress: counts.inProgress,
        completed: counts.completed,
        verified: counts.verified,
        overdue: counts.overdue,
        byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        byDepartment: {},
      };
    },

    getIncidenciaCounts: incidenciasHook.getCounts,
  };

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
}
