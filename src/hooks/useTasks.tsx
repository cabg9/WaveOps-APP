// ═══════════════════════════════════════════════════════════════════
// HOOK DE TAREAS - WRAPPER PARA FIRESTORE (SIMPLIFICADO)
// ═══════════════════════════════════════════════════════════════════

import React, { createContext, useContext } from 'react';
import { useFirestoreTasks } from './firestore/useFirestoreTasks';
import { useFirestoreIncapacidades } from './firestore/useFirestoreIncapacidades';
import { TaskStatus, TaskType, TaskPriority, Department, IncidenciaStatus } from '@/types';

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
  const incapacidadesHook = useFirestoreIncapacidades();

  const value = {
    tasks: tasksHook.tasks,
    incidencias: incapacidadesHook.incapacidades.map((inc: any) => ({
      id: inc.id,
      title: inc.motivo || 'Incapacidad',
      description: inc.notes || '',
      reportedBy: inc.userId,
      status: IncidenciaStatus.NEW,
      createdAt: inc.createdAt,
      updatedAt: inc.updatedAt || inc.createdAt,
      notes: [],
    })),
    isLoading: tasksHook.loading || incapacidadesHook.loading,

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

    getTasksByUser: (userId: string) => tasksHook.tasks.filter((t: any) => t.assignedTo === userId),

    getTasksByDepartment: (department: Department) => tasksHook.tasks.filter((t: any) => t.department === department),

    getTasksByStatus: (status: TaskStatus) => tasksHook.tasks.filter((t: any) => t.status === status),

    getOverdueTasks: () => tasksHook.tasks.filter((t: any) => {
      const due = new Date(t.dueDate);
      const now = new Date();
      return due < now && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.VERIFIED;
    }),

    createTask: (task: any) => {
      tasksHook.createTask({
        title: task.title || '',
        description: task.description || '',
        type: task.type || TaskType.SPECIFIC,
        status: TaskStatus.PENDING,
        priority: task.priority || TaskPriority.MEDIUM,
        assignedTo: task.assignedTo || '',
        department: task.department || Department.DIVE_SHOP,
        dueDate: task.dueDate || new Date().toISOString(),
        createdBy: task.createdBy || '',
        createdAt: new Date().toISOString(),
      });
      return { id: Date.now().toString(), ...task };
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

    // Incidencias
    getIncidencias: (filters?: any) => {
      let result = incapacidadesHook.incapacidades.map((inc: any) => ({
        id: inc.id,
        title: inc.motivo || 'Incapacidad',
        description: inc.notes || '',
        reportedBy: inc.userId,
        status: IncidenciaStatus.NEW,
        createdAt: inc.createdAt,
        updatedAt: inc.updatedAt || inc.createdAt,
        notes: [],
      }));
      if (filters?.status) {
        result = result.filter((i: any) => i.status === filters.status);
      }
      return result;
    },

    createIncidencia: (incidencia: any) => {
      incapacidadesHook.createIncapacidad({
        userId: incidencia.reportedBy || '',
        userName: 'Usuario',
        userAvatar: '',
        userDepartment: Department.DIVE_SHOP,
        type: 'incapacidad',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        description: incidencia.title || '',
        status: 'pendiente',
        history: [],
        notes: [],
        createdAt: new Date().toISOString(),
        documents: [],
      });
      return { id: Date.now().toString(), ...incidencia };
    },

    updateIncidencia: (id: string, updates: any) => {
      incapacidadesHook.updateIncapacidad(id, updates);
    },

    confirmIncidencia: (id: string, userId: string) => {
      incapacidadesHook.verifyIncapacidad(id, userId, 'Usuario');
    },

    resolveIncidencia: (id: string, userId: string, resolution?: string) => {
      incapacidadesHook.addNote(id, resolution || 'Resuelta', userId);
    },

    closeIncidencia: (id: string, userId: string, reason?: string) => {
      incapacidadesHook.rejectIncapacidad(id, reason || 'Cerrada', userId);
    },

    reopenIncidencia: (id: string, userId: string, reason?: string) => {
      incapacidadesHook.undoIncapacidad(id, userId, reason);
    },

    addIncidenciaNote: (id: string, content: string, userId: string) => {
      incapacidadesHook.addNote(id, content, userId);
    },

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

    getIncidenciaCounts: () => ({
      total: incapacidadesHook.incapacidades.length,
      pending: incapacidadesHook.incapacidades.filter((i: any) => i.status === 'pendiente').length,
      inProgress: incapacidadesHook.incapacidades.filter((i: any) => i.status === 'verificada').length,
      resolved: incapacidadesHook.incapacidades.filter((i: any) => i.status === 'registrada').length,
      closed: incapacidadesHook.incapacidades.filter((i: any) => i.status === 'rechazada').length,
      new: incapacidadesHook.incapacidades.filter((i: any) => i.status === 'pendiente').length,
      open: 0,
      verified: incapacidadesHook.incapacidades.filter((i: any) => i.status === 'verificada').length,
      reopened: 0,
    }),
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
