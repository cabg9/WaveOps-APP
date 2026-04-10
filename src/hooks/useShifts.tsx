// ═══════════════════════════════════════════════════════════════════
// HOOK DE TURNOS - WRAPPER PARA FIRESTORE (SIMPLIFICADO)
// ═══════════════════════════════════════════════════════════════════

import React, { createContext, useContext } from 'react';
import { useFirestoreShifts } from './firestore/useFirestoreShifts';
import { useFirestoreUsers } from './firestore/useFirestoreUsers';
import { Department, AssignmentStatus } from '@/types';
import { addDaysToDate, format } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════

const ShiftsContext = createContext<any>(undefined);

// ═══════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════

interface ShiftsProviderProps {
  children: React.ReactNode;
}

export function ShiftsProvider({ children }: ShiftsProviderProps) {
  const shiftsHook = useFirestoreShifts();
  const usersHook = useFirestoreUsers();

  const value = {
    shifts: shiftsHook.shifts,
    assignments: shiftsHook.assignments.map((a: any) => ({
      id: a.id,
      shiftId: a.shiftId,
      userId: a.userId,
      role: 'STAFF',
      date: a.date,
      status: a.status,
      publishedAt: a.publishedAt,
      publishedBy: a.publishedBy,
    })),
    isLoading: shiftsHook.loading,

    getShiftsByDepartment: (department: Department) => {
      return shiftsHook.shifts.filter((s: any) => s.department === department);
    },

    getUserShifts: (userId: string, date: string) => {
      const userAssignments = shiftsHook.assignments.filter(
        (a: any) => a.userId === userId && a.date === date && a.status !== AssignmentStatus.ELIMINADO
      );
      return userAssignments
        .map((a: any) => shiftsHook.shifts.find((s: any) => s.id === a.shiftId))
        .filter((s: any) => s !== undefined)
        .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
    },

    getDepartmentShifts: (department: Department, date: string) => {
      return shiftsHook.assignments.filter((a: any) => {
        const shift = shiftsHook.shifts.find((s: any) => s.id === a.shiftId);
        return shift?.department === department && a.date === date;
      });
    },

    getWeekAssignments: (department: Department, weekStart: Date) => {
      const startStr = format(weekStart, 'yyyy-MM-dd');
      const endDate = addDaysToDate(weekStart, 6);
      const endStr = format(endDate, 'yyyy-MM-dd');

      return shiftsHook.assignments.filter((a: any) => {
        const shift = shiftsHook.shifts.find((s: any) => s.id === a.shiftId);
        if (!shift) return false;
        if ((department as any) !== 'ALL' && shift.department !== department) return false;
        return a.date >= startStr && a.date <= endStr;
      });
    },

    assignShift: (userId: string, shiftId: string, date: string, assignedBy: string) => {
      shiftsHook.assignShift(userId, shiftId, date, assignedBy);
    },

    removeShift: (assignmentId: string) => {
      shiftsHook.removeShift(assignmentId);
    },

    getShiftById: (id: string) => {
      return shiftsHook.shifts.find((s: any) => s.id === id);
    },

    getAssignmentById: (id: string) => {
      return shiftsHook.assignments.find((a: any) => a.id === id);
    },

    getUsersByDepartment: (department: Department) => {
      return usersHook.users.filter((u: any) => u.department === department && u.isActive);
    },

    isUserOnShift: (userId: string, date: string) => {
      return shiftsHook.assignments.some(
        (a: any) => a.userId === userId && a.date === date && a.status !== AssignmentStatus.ELIMINADO
      );
    },

    getUsersOnShift: (department: Department, date: string) => {
      const deptAssignments = shiftsHook.assignments.filter((a: any) => {
        const shift = shiftsHook.shifts.find((s: any) => s.id === a.shiftId);
        return shift?.department === department && a.date === date;
      });
      
      const userIds = deptAssignments.map((a: any) => a.userId);
      return usersHook.users.filter((u: any) => userIds.includes(u.id));
    },

    publishAssignments: (department: Department | 'ALL', weekStart: Date, publishedBy: string) => {
      shiftsHook.publishAssignments(department, weekStart, publishedBy);
    },

    getBorradorCount: (department: Department | 'ALL', weekStart: Date) => {
      return shiftsHook.getBorradorCount(department, weekStart);
    },

    validateDayRequirements: (department: Department, date: string) => {
      return { isValid: true, errors: [] };
    },
  };

  return (
    <ShiftsContext.Provider value={value}>
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
