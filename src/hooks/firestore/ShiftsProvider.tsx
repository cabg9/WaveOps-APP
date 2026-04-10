// ═══════════════════════════════════════════════════════════════════
// SHIFTS PROVIDER - FIRESTORE VERSION
// ═══════════════════════════════════════════════════════════════════

import React, { createContext, useContext } from 'react';
import { useFirestoreShifts, FirestoreShift, FirestoreAssignment } from './useFirestoreShifts';
import { Department } from '@/types';

interface ShiftsContextType {
  shifts: FirestoreShift[];
  assignments: FirestoreAssignment[];
  loading: boolean;
  error: string | null;
  getShiftsByDepartment: (department: Department) => FirestoreShift[];
  getShiftById: (id: string) => FirestoreShift | undefined;
  getUserShifts: (userId: string, date: string) => FirestoreShift[];
  getWeekAssignments: (department: Department | 'ALL', weekStart: Date) => FirestoreAssignment[];
  assignShift: (userId: string, shiftId: string, date: string, assignedBy: string) => Promise<string>;
  removeShift: (assignmentId: string) => Promise<void>;
  publishAssignments: (department: Department | 'ALL', weekStart: Date, publishedBy: string) => Promise<void>;
  getBorradorCount: (department: Department | 'ALL', weekStart: Date) => number;
  createShift: (shiftData: Omit<FirestoreShift, 'id'>) => Promise<string>;
  updateShift: (id: string, updates: Partial<FirestoreShift>) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
}

const ShiftsContext = createContext<ShiftsContextType | undefined>(undefined);

export function ShiftsProvider({ children }: { children: React.ReactNode }) {
  const shiftsHook = useFirestoreShifts();

  return (
    <ShiftsContext.Provider value={shiftsHook}>
      {children}
    </ShiftsContext.Provider>
  );
}

export function useShifts() {
  const context = useContext(ShiftsContext);
  if (context === undefined) {
    throw new Error('useShifts must be used within a ShiftsProvider');
  }
  return context;
}
