// ═══════════════════════════════════════════════════════════════════
// HOOK DE TURNOS - WRAPPER PARA FIRESTORE (SIMPLIFICADO)
// ═══════════════════════════════════════════════════════════════════

import React, { createContext, useContext } from 'react';
import { useFirestoreShifts } from './firestore/useFirestoreShifts';
import { useFirestoreUsers } from './firestore/useFirestoreUsers';
import { AssignmentStatus } from '@/types';
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
  // Combinar turnos estáticos con Firestore (los estáticos tienen IDs que las asignaciones usan)

  const shifts = shiftsHook.shifts;

  const value = {
    shifts: shifts,
    assignments: shiftsHook.assignments.map((a: any) => ({
      id: a.id,
      shiftId: a.shiftId,
      userId: a.userId,
      role: 'STAFF',
      date: a.date,
      status: a.status,
      previousStatus: a.previousStatus,
      publishedAt: a.publishedAt,
      publishedBy: a.publishedBy,
    })),
    isLoading: shiftsHook.loading,

    getShiftsByDepartment: (department: string) => {
      return shifts.filter((s: any) => {
        const deptCode = s.department?.replace(/ /g, '_').toUpperCase();
        return s.department === department || deptCode === department;
      });
    },

    getUserShifts: (userId: string, date: string) => {
      const userAssignments = shiftsHook.assignments.filter(
        (a: any) => {
        const matchesUser = a.userId === userId || a.userId === (usersHook.users.find(u => u.id === userId)?.email) || a.userId?.includes(userId?.split('@')[0]);
        return matchesUser && a.date === date && (a.status === AssignmentStatus.PUBLICADO || a.status === 'BORRADOR');
      }
      );
      return userAssignments
        .map((a: any) => shifts.find((s: any) => s.id === a.shiftId))
        .filter((s: any) => s !== undefined)
        .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
    },

    getDepartmentShifts: (department: string, date: string) => {
      return shiftsHook.assignments.filter((a: any) => {
        const shift = shifts.find((s: any) => s.id === a.shiftId);
        return shift?.department === department && a.date === date;
      });
    },

    getWeekAssignments: (department: string, weekStart: Date) => {
      const startStr = format(weekStart, 'yyyy-MM-dd');
      const endDate = addDaysToDate(weekStart, 6);
      const endStr = format(endDate, 'yyyy-MM-dd');

      return shiftsHook.assignments.filter((a: any) => {
        const shift = shifts.find((s: any) => s.id === a.shiftId);
        if (!shift) return false;
        if ((department as any) !== 'ALL') {
          const deptCode = shift.department?.replace(/ /g, '_').toUpperCase();
          if (shift.department !== department && deptCode !== department) return false;
        }
        return a.date >= startStr && a.date <= endStr;
      });
    },

    assignShift: (userId: string, shiftId: string, date: string, assignedBy: string) => {
      shiftsHook.assignShift(userId, shiftId, date, assignedBy);
    },

    removeShift: (assignmentId: string) => {
      shiftsHook.removeShift(assignmentId);
    },

    restoreShift: (assignmentId: string) => {
      shiftsHook.restoreShift(assignmentId);
    },

    getShiftById: (id: string) => {
      return shifts.find((s: any) => s.id === id);
    },

    getAssignmentById: (id: string) => {
      return shiftsHook.assignments.find((a: any) => a.id === id);
    },

    getUsersByDepartment: (department: string) => {
      return usersHook.users.filter((u: any) => u.department === department && u.isActive);
    },

    isUserOnShift: (userId: string, date: string) => {
      const userEmail = usersHook.users.find((u: any) => u.id === userId)?.email;
      return shiftsHook.assignments.some(
        (a: any) => (a.userId === userId || a.userId === userEmail) && a.date === date && (a.status === AssignmentStatus.PUBLICADO || a.status === 'BORRADOR')
      );
    },

    getUsersOnShift: (department: string, date: string) => {
      const deptAssignments = shiftsHook.assignments.filter((a: any) => {
        const shift = shifts.find((s: any) => s.id === a.shiftId);
        return shift?.department === department && a.date === date;
      });
      
      const userIds = deptAssignments.map((a: any) => a.userId);
      return usersHook.users.filter((u: any) => userIds.includes(u.id) || userIds.includes(u.email));
    },

    publishAssignments: (department: string | 'ALL', weekStart: Date, publishedBy: string) => {
      shiftsHook.publishAssignments(department, weekStart, publishedBy);
    },

    cleanupSpecificTasksForRemovedAssignment: (assignment: { id: string; shiftId: string; date: string; userId: string }) => {
      shiftsHook.cleanupSpecificTasksForRemovedAssignment(assignment as any);
    },

    getBorradorCount: (department: string | 'ALL', weekStart: Date) => {
      return shiftsHook.getBorradorCount(department, weekStart);
    },

    getPendingChangesCount: (department: string | 'ALL', weekStart: Date) => {
      return shiftsHook.getPendingChangesCount(department, weekStart);
    },

    validateDayRequirements: (department: string, date: string) => {
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
