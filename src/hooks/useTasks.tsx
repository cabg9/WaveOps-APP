// ═══════════════════════════════════════════════════════════════════
// HOOK DE TAREAS - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Task,
  Incidencia,
  TaskStatus,
  IncidenciaStatus,
  TaskFilters,
  IncidenciaFilters,
  TaskCounts,
  IncidenciaCounts,
  TimeFilter,
  TaskType,
  TaskPriority,
  Department,
  Note,
  Subtask,
} from '@/types';
import { tasks as initialTasks } from '@/data/tasks';
import { incidencias as initialIncidencias } from '@/data/incidencias';
import { generateId, isDatePast, isDateToday, isDateTomorrow, parseISO, isSameDay, addDays } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════

const TasksContext = createContext<TasksContextType | undefined>(undefined);

interface TasksContextType {
  tasks: Task[];
  incidencias: Incidencia[];
  isLoading: boolean;
  // Tasks
  getTasks: (filters?: TaskFilters) => Task[];
  getTaskById: (id: string) => Task | undefined;
  getTasksByUser: (userId: string) => Task[];
  getTasksByDepartment: (department: Department) => Task[];
  getTasksByStatus: (status: TaskStatus) => Task[];
  getOverdueTasks: () => Task[];
  createTask: (task: Partial<Task>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  changeTaskStatus: (id: string, status: TaskStatus, note?: string, userId?: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string, userId: string) => void;
  addNote: (taskId: string, content: string, userId: string) => void;
  addPhoto: (taskId: string, photo: string) => void;
  verifyTask: (id: string, userId: string) => void;
  rateTask: (id: string, rating: 'good' | 'bad', note: string, userId: string) => void;
  blockTask: (id: string, reason: string, userId: string) => void;
  unblockTask: (id: string, note: string, userId: string) => void;
  reopenTask: (id: string, userId: string) => void;
  // Incidencias
  getIncidencias: (filters?: IncidenciaFilters) => Incidencia[];
  createIncidencia: (incidencia: Partial<Incidencia>) => Incidencia;
  updateIncidencia: (id: string, updates: Partial<Incidencia>) => void;
  confirmIncidencia: (id: string, userId: string) => void;
  resolveIncidencia: (id: string, userId: string) => void;
  closeIncidencia: (id: string, userId: string) => void;
  reopenIncidencia: (id: string, userId: string) => void;
  addIncidenciaNote: (id: string, content: string, userId: string) => void;
  // Contadores
  getTaskCounts: () => TaskCounts;
  getIncidenciaCounts: () => IncidenciaCounts;
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════

interface TasksProviderProps {
  children: React.ReactNode;
}

export function TasksProvider({ children }: TasksProviderProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [incidencias, setIncidencias] = useState<Incidencia[]>(initialIncidencias);
  const [isLoading] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════

  const addHistoryEntry = (
    taskId: string,
    action: string,
    fromStatus?: TaskStatus,
    toStatus?: TaskStatus,
    userId?: string,
    note?: string
  ): void => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? {
              ...task,
              history: [
                ...task.history,
                {
                  id: generateId(),
                  action,
                  fromStatus,
                  toStatus,
                  performedBy: userId || 'system',
                  performedAt: new Date().toISOString(),
                  note,
                },
              ],
            }
          : task
      )
    );
  };

  const checkAndUpdateOverdue = useCallback(() => {
    setTasks(prev =>
      prev.map(task => {
        if (
          (task.status === TaskStatus.PENDING || task.status === TaskStatus.IN_PROGRESS) &&
          isDatePast(task.dueDate)
        ) {
          return { ...task, status: TaskStatus.OVERDUE };
        }
        return task;
      })
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // GET TASKS
  // ═══════════════════════════════════════════════════════════════════

  const getTasks = useCallback((filters?: TaskFilters): Task[] => {
    checkAndUpdateOverdue();

    let result = [...tasks];

    if (filters?.status) {
      result = result.filter(t => t.status === filters.status);
    }

    if (filters?.priority) {
      result = result.filter(t => t.priority === filters.priority);
    }

    if (filters?.department) {
      result = result.filter(t => t.department === filters.department);
    }

    if (filters?.assignedTo) {
      result = result.filter(t => t.assignedTo.includes(filters.assignedTo!));
    }

    if (filters?.timeFilter) {
      const today = new Date();
      const yesterday = addDays(today, -1);
      const tomorrow = addDays(today, 1);

      switch (filters.timeFilter) {
        case TimeFilter.TODAY:
          result = result.filter(t => isDateToday(t.dueDate));
          break;
        case TimeFilter.YESTERDAY:
          result = result.filter(t => isSameDay(parseISO(t.dueDate), yesterday));
          break;
        case TimeFilter.TOMORROW:
          result = result.filter(t => isDateTomorrow(t.dueDate));
          break;
        case TimeFilter.UPCOMING:
          result = result.filter(t => {
            const due = parseISO(t.dueDate);
            return due > tomorrow;
          });
          break;
        case TimeFilter.PAST_WEEKS:
          result = result.filter(t => isDatePast(t.dueDate));
          break;
      }
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        t =>
          t.title.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower)
      );
    }

    // Orden: En Progreso → Atrasadas → Demás (cronológico)
    result.sort((a, b) => {
      const priorityOrder: Record<TaskStatus, number> = {
        [TaskStatus.IN_PROGRESS]: 0,
        [TaskStatus.OVERDUE]: 1,
        [TaskStatus.PENDING]: 2,
        [TaskStatus.BLOCKED]: 3,
        [TaskStatus.COMPLETED]: 4,
        [TaskStatus.VERIFIED]: 5,
      };

      const priorityDiff = priorityOrder[a.status] - priorityOrder[b.status];
      if (priorityDiff !== 0) return priorityDiff;

      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return result;
  }, [tasks, checkAndUpdateOverdue]);

  const getTaskById = useCallback(
    (id: string): Task | undefined => {
      return tasks.find(t => t.id === id);
    },
    [tasks]
  );

  const getTasksByUser = useCallback(
    (userId: string): Task[] => {
      return tasks.filter(t => t.assignedTo.includes(userId));
    },
    [tasks]
  );

  const getTasksByDepartment = useCallback(
    (department: Department): Task[] => {
      return tasks.filter(t => t.department === department);
    },
    [tasks]
  );

  const getTasksByStatus = useCallback(
    (status: TaskStatus): Task[] => {
      return tasks.filter(t => t.status === status);
    },
    [tasks]
  );

  const getOverdueTasks = useCallback((): Task[] => {
    return tasks.filter(t => t.status === TaskStatus.OVERDUE);
  }, [tasks]);

  // ═══════════════════════════════════════════════════════════════════
  // CREATE TASK
  // ═══════════════════════════════════════════════════════════════════

  const createTask = useCallback((task: Partial<Task>): Task => {
    const newTask: Task = {
      id: generateId(),
      title: task.title || 'Nueva Tarea',
      description: task.description || '',
      status: TaskStatus.PENDING,
      priority: task.priority || TaskPriority.MEDIUM,
      type: task.type || TaskType.EXTRA,
      createdBy: task.createdBy || 'system',
      assignedTo: task.assignedTo || [],
      supervisorId: task.supervisorId || '',
      department: task.department || Department.DIVE_SHOP,
      dueDate: task.dueDate || new Date().toISOString().split('T')[0],
      startTime: task.startTime,
      estimatedMinutes: task.estimatedMinutes,
      requiresPhoto: task.requiresPhoto || false,
      photos: [],
      subtasks: task.subtasks || [],
      history: [
        {
          id: generateId(),
          action: 'Tarea creada',
          performedBy: task.createdBy || 'system',
          performedAt: new Date().toISOString(),
        },
      ],
      notes: [],
      createdAt: new Date().toISOString(),
    };

    setTasks(prev => [...prev, newTask]);
    return newTask;
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE TASK
  // ═══════════════════════════════════════════════════════════════════

  const updateTask = useCallback((id: string, updates: Partial<Task>): void => {
    setTasks(prev =>
      prev.map(task => (task.id === id ? { ...task, ...updates } : task))
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // DELETE TASK
  // ═══════════════════════════════════════════════════════════════════

  const deleteTask = useCallback((id: string): void => {
    setTasks(prev => prev.filter(task => task.id !== id));
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // CHANGE STATUS
  // ═══════════════════════════════════════════════════════════════════

  const changeTaskStatus = useCallback(
    (id: string, status: TaskStatus, note?: string, userId?: string): void => {
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      const fromStatus = task.status;

      setTasks(prev =>
        prev.map(t =>
          t.id === id
            ? {
                ...t,
                status,
                ...(status === TaskStatus.COMPLETED && {
                  completedAt: new Date().toISOString(),
                }),
              }
            : t
        )
      );

      addHistoryEntry(
        id,
        `Marcada como ${getStatusLabel(status)}`,
        fromStatus,
        status,
        userId,
        note
      );
    },
    [tasks]
  );

  // ═══════════════════════════════════════════════════════════════════
  // SUBTASKS
  // ═══════════════════════════════════════════════════════════════════

  const addSubtask = useCallback((taskId: string, title: string): void => {
    const newSubtask: Subtask = {
      id: generateId(),
      title,
      completed: false,
    };

    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, subtasks: [...task.subtasks, newSubtask] }
          : task
      )
    );
  }, []);

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string, userId: string): void => {
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId
            ? {
                ...task,
                subtasks: task.subtasks.map(st =>
                  st.id === subtaskId
                    ? {
                        ...st,
                        completed: !st.completed,
                        completedBy: !st.completed ? userId : undefined,
                        completedAt: !st.completed ? new Date().toISOString() : undefined,
                      }
                    : st
                ),
              }
            : task
        )
      );
    },
    []
  );

  // ═══════════════════════════════════════════════════════════════════
  // NOTES
  // ═══════════════════════════════════════════════════════════════════

  const addNote = useCallback((taskId: string, content: string, userId: string): void => {
    const newNote: Note = {
      id: generateId(),
      content,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, notes: [...task.notes, newNote] }
          : task
      )
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // PHOTOS
  // ═══════════════════════════════════════════════════════════════════

  const addPhoto = useCallback((taskId: string, photo: string): void => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, photos: [...task.photos, photo] }
          : task
      )
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // VERIFY
  // ═══════════════════════════════════════════════════════════════════

  const verifyTask = useCallback((id: string, userId: string): void => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    setTasks(prev =>
      prev.map(t =>
        t.id === id
          ? {
              ...t,
              status: TaskStatus.VERIFIED,
              verifiedAt: new Date().toISOString(),
              verifiedBy: userId,
            }
          : t
      )
    );

    addHistoryEntry(
      id,
      'Tarea verificada',
      TaskStatus.COMPLETED,
      TaskStatus.VERIFIED,
      userId
    );
  }, [tasks]);

  // ═══════════════════════════════════════════════════════════════════
  // RATE
  // ═══════════════════════════════════════════════════════════════════

  const rateTask = useCallback(
    (id: string, rating: 'good' | 'bad', note: string, userId: string): void => {
      setTasks(prev =>
        prev.map(t =>
          t.id === id
            ? {
                ...t,
                rating,
                ratingNote: note,
              }
            : t
        )
      );

      addHistoryEntry(
        id,
        `Tarea calificada como ${rating === 'good' ? 'Bien Hecha' : 'Mal Hecha'}`,
        undefined,
        undefined,
        userId,
        note
      );
    },
    []
  );

  // ═══════════════════════════════════════════════════════════════════
  // BLOCK
  // ═══════════════════════════════════════════════════════════════════

  const blockTask = useCallback(
    (id: string, reason: string, userId: string): void => {
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      const fromStatus = task.status;

      setTasks(prev =>
        prev.map(t =>
          t.id === id
            ? {
                ...t,
                status: TaskStatus.BLOCKED,
                blockedReason: reason,
                blockedAt: new Date().toISOString(),
                blockedBy: userId,
              }
            : t
        )
      );

      addHistoryEntry(
        id,
        'Tarea bloqueada',
        fromStatus,
        TaskStatus.BLOCKED,
        userId,
        reason
      );
    },
    [tasks]
  );

  // ═══════════════════════════════════════════════════════════════════
  // UNBLOCK
  // ═══════════════════════════════════════════════════════════════════

  const unblockTask = useCallback(
    (id: string, note: string, userId: string): void => {
      setTasks(prev =>
        prev.map(t =>
          t.id === id
            ? {
                ...t,
                status: TaskStatus.PENDING,
                blockedReason: undefined,
                blockedAt: undefined,
                blockedBy: undefined,
              }
            : t
        )
      );

      addHistoryEntry(
        id,
        'Tarea desbloqueada',
        TaskStatus.BLOCKED,
        TaskStatus.PENDING,
        userId,
        note
      );
    },
    []
  );

  // ═══════════════════════════════════════════════════════════════════
  // REOPEN
  // ═══════════════════════════════════════════════════════════════════

  const reopenTask = useCallback((id: string, userId: string): void => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const fromStatus = task.status;

    setTasks(prev =>
      prev.map(t =>
        t.id === id
          ? {
              ...t,
              status: TaskStatus.PENDING,
              completedAt: undefined,
              verifiedAt: undefined,
              verifiedBy: undefined,
              rating: undefined,
              ratingNote: undefined,
            }
          : t
      )
    );

    addHistoryEntry(
      id,
      'Tarea reabierta',
      fromStatus,
      TaskStatus.PENDING,
      userId
    );
  }, [tasks]);

  // ═══════════════════════════════════════════════════════════════════
  // GET INCIDENCIAS
  // ═══════════════════════════════════════════════════════════════════

  const getIncidencias = useCallback((filters?: IncidenciaFilters): Incidencia[] => {
    let result = [...incidencias];

    if (filters?.status) {
      result = result.filter(i => i.status === filters.status);
    }

    if (filters?.priority) {
      result = result.filter(i => i.priority === filters.priority);
    }

    if (filters?.department) {
      result = result.filter(i => i.targetDepartment === filters.department);
    }

    if (filters?.timeFilter) {
      const today = new Date();
      const yesterday = addDays(today, -1);

      switch (filters.timeFilter) {
        case TimeFilter.TODAY:
          result = result.filter(i => isDateToday(i.createdAt));
          break;
        case TimeFilter.YESTERDAY:
          result = result.filter(i => isSameDay(parseISO(i.createdAt), yesterday));
          break;
        case TimeFilter.PAST_WEEKS:
          result = result.filter(i => isDatePast(i.createdAt));
          break;
      }
    }

    // Orden: Nuevas → Abiertas → Reabiertas → Demás
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
  }, [incidencias]);

  // ═══════════════════════════════════════════════════════════════════
  // CREATE INCIDENCIA
  // ═══════════════════════════════════════════════════════════════════

  const createIncidencia = useCallback((incidencia: Partial<Incidencia>): Incidencia => {
    const newIncidencia: Incidencia = {
      id: generateId(),
      title: incidencia.title || 'Nueva Incidencia',
      description: incidencia.description || '',
      status: IncidenciaStatus.NEW,
      priority: incidencia.priority || TaskPriority.MEDIUM,
      reportedBy: incidencia.reportedBy || 'system',
      reportedFor: incidencia.reportedFor,
      targetDepartment: incidencia.targetDepartment || Department.ADMINISTRATIVO,
      notes: [],
      createdAt: new Date().toISOString(),
    };

    setIncidencias(prev => [...prev, newIncidencia]);
    return newIncidencia;
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE INCIDENCIA
  // ═══════════════════════════════════════════════════════════════════

  const updateIncidencia = useCallback((id: string, updates: Partial<Incidencia>): void => {
    setIncidencias(prev =>
      prev.map(inc => (inc.id === id ? { ...inc, ...updates } : inc))
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // CONFIRM INCIDENCIA
  // ═══════════════════════════════════════════════════════════════════

  const confirmIncidencia = useCallback((id: string, userId: string): void => {
    setIncidencias(prev =>
      prev.map(inc =>
        inc.id === id
          ? {
              ...inc,
              status: IncidenciaStatus.VERIFIED,
              confirmedBy: userId,
              confirmedAt: new Date().toISOString(),
            }
          : inc
      )
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // RESOLVE INCIDENCIA
  // ═══════════════════════════════════════════════════════════════════

  const resolveIncidencia = useCallback((id: string, userId: string): void => {
    setIncidencias(prev =>
      prev.map(inc =>
        inc.id === id
          ? {
              ...inc,
              status: IncidenciaStatus.RESOLVED,
              resolvedBy: userId,
              resolvedAt: new Date().toISOString(),
            }
          : inc
      )
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // CLOSE INCIDENCIA
  // ═══════════════════════════════════════════════════════════════════

  const closeIncidencia = useCallback((id: string, userId: string): void => {
    setIncidencias(prev =>
      prev.map(inc =>
        inc.id === id
          ? {
              ...inc,
              status: IncidenciaStatus.CLOSED,
              closedBy: userId,
              closedAt: new Date().toISOString(),
            }
          : inc
      )
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // REOPEN INCIDENCIA
  // ═══════════════════════════════════════════════════════════════════

  const reopenIncidencia = useCallback((id: string, _userId: string): void => {
    setIncidencias(prev =>
      prev.map(inc =>
        inc.id === id
          ? {
              ...inc,
              status: IncidenciaStatus.REOPENED,
            }
          : inc
      )
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // ADD INCIDENCIA NOTE
  // ═══════════════════════════════════════════════════════════════════

  const addIncidenciaNote = useCallback((id: string, content: string, userId: string): void => {
    const newNote: Note = {
      id: generateId(),
      content,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    setIncidencias(prev =>
      prev.map(inc =>
        inc.id === id
          ? { ...inc, notes: [...inc.notes, newNote] }
          : inc
      )
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // COUNTERS
  // ═══════════════════════════════════════════════════════════════════

  const getTaskCounts = useCallback((): TaskCounts => {
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      verified: tasks.filter(t => t.status === TaskStatus.VERIFIED).length,
      blocked: tasks.filter(t => t.status === TaskStatus.BLOCKED).length,
      overdue: tasks.filter(t => t.status === TaskStatus.OVERDUE).length,
    };
  }, [tasks]);

  const getIncidenciaCounts = useCallback((): IncidenciaCounts => {
    return {
      total: incidencias.length,
      new: incidencias.filter(i => i.status === IncidenciaStatus.NEW).length,
      open: incidencias.filter(i => i.status === IncidenciaStatus.OPEN).length,
      verified: incidencias.filter(i => i.status === IncidenciaStatus.VERIFIED).length,
      resolved: incidencias.filter(i => i.status === IncidenciaStatus.RESOLVED).length,
      closed: incidencias.filter(i => i.status === IncidenciaStatus.CLOSED).length,
      reopened: incidencias.filter(i => i.status === IncidenciaStatus.REOPENED).length,
    };
  }, [incidencias]);

  // ═══════════════════════════════════════════════════════════════════
  // VALUE
  // ═══════════════════════════════════════════════════════════════════

  const value: TasksContextType = {
    tasks,
    incidencias,
    isLoading,
    getTasks,
    getTaskById,
    getTasksByUser,
    getTasksByDepartment,
    getTasksByStatus,
    getOverdueTasks,
    createTask,
    updateTask,
    deleteTask,
    changeTaskStatus,
    addSubtask,
    toggleSubtask,
    addNote,
    addPhoto,
    verifyTask,
    rateTask,
    blockTask,
    unblockTask,
    reopenTask,
    getIncidencias,
    createIncidencia,
    updateIncidencia,
    confirmIncidencia,
    resolveIncidencia,
    closeIncidencia,
    reopenIncidencia,
    addIncidenciaNote,
    getTaskCounts,
    getIncidenciaCounts,
  };

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════

export function useTasks(): TasksContextType {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════

function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: 'Pendiente',
    [TaskStatus.IN_PROGRESS]: 'En Progreso',
    [TaskStatus.COMPLETED]: 'Completada',
    [TaskStatus.VERIFIED]: 'Verificada',
    [TaskStatus.BLOCKED]: 'Bloqueada',
    [TaskStatus.OVERDUE]: 'Atrasada',
  };
  return labels[status];
}
