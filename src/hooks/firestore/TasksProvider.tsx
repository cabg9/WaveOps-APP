// ═══════════════════════════════════════════════════════════════════
// TASKS PROVIDER - FIRESTORE VERSION
// ═══════════════════════════════════════════════════════════════════

import React, { createContext, useContext } from 'react';
import { useFirestoreTasks, FirestoreTask } from './useFirestoreTasks';
import { TaskStatus } from '@/types';

interface TasksContextType {
  tasks: FirestoreTask[];
  loading: boolean;
  error: string | null;
  createTask: (task: Omit<FirestoreTask, 'id'>) => Promise<string>;
  updateTask: (id: string, updates: Partial<FirestoreTask>, userId?: string) => Promise<void>;
  changeTaskStatus: (id: string, status: TaskStatus, userId: string, note?: string) => Promise<void>;
  addNote: (taskId: string, content: string, userId: string) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  addPhoto: (taskId: string, photoUrl: string) => Promise<void>;
  verifyTask: (id: string, userId: string) => Promise<void>;
  rateTask: (id: string, rating: 'good' | 'bad', note: string, userId: string) => Promise<void>;
  blockTask: (id: string, reason: string, userId: string) => Promise<void>;
  unblockTask: (id: string, note: string, userId: string) => Promise<void>;
  reopenTask: (id: string, userId: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  getTaskCounts: () => {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    verified: number;
    overdue: number;
  };
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const tasksHook = useFirestoreTasks();

  return (
    <TasksContext.Provider value={tasksHook}>
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
