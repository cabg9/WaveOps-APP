// ═══════════════════════════════════════════════════════════════════
// HOOK DE TURNOS - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Shift, ShiftAssignment, Department } from '@/types';
import { shifts as initialShifts } from '@/data/shifts';
import { users } from '@/data/users';
import { generateId, addDaysToDate, format } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════

interface ShiftsContextType {
  shifts: Shift[];
  assignments: ShiftAssignment[];
  isLoading: boolean;
  getShiftsByDepartment: (department: Department) => Shift[];
  getUserShifts: (userId: string, date: string) => Shift[];
  getDepartmentShifts: (department: Department, date: string) => ShiftAssignment[];
  getWeekAssignments: (department: Department, weekStart: Date) => ShiftAssignment[];
  assignShift: (userId: string, shiftId: string, date: string, assignedBy: string) => void;
  removeShift: (assignmentId: string) => void;
  getShiftById: (id: string) => Shift | undefined;
  getAssignmentById: (id: string) => ShiftAssignment | undefined;
  getUsersByDepartment: (department: Department) => typeof users;
  isUserOnShift: (userId: string, date: string) => boolean;
  getUsersOnShift: (department: Department, date: string) => typeof users;
}

const ShiftsContext = createContext<ShiftsContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════

interface ShiftsProviderProps {
  children: React.ReactNode;
}

// Generar asignaciones iniciales de ejemplo
const generateInitialAssignments = (): ShiftAssignment[] => {
  const assignments: ShiftAssignment[] = [];
  const today = new Date();
  
  // Asignar turnos para los próximos 7 días
  for (let dayOffset = -3; dayOffset <= 7; dayOffset++) {
    const date = addDaysToDate(today, dayOffset);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Dive Shop - algunos buzos
    assignments.push({
      id: generateId(),
      shiftId: dayOffset % 2 === 0 ? 'shift-ds-2' : 'shift-ds-3', // AM / PM alternados
      userId: '16', // Carlos
      role: 'STAFF',
      date: dateStr,
    });
    
    assignments.push({
      id: generateId(),
      shiftId: dayOffset % 2 === 0 ? 'shift-ds-3' : 'shift-ds-2', // PM / AM alternados
      userId: '17', // Maria
      role: 'STAFF',
      date: dateStr,
    });
    
    // Warehouse
    assignments.push({
      id: generateId(),
      shiftId: 'shift-wh-2', // PM1
      userId: '32', // Victor
      role: 'STAFF',
      date: dateStr,
    });
    
    // Guianza
    assignments.push({
      id: generateId(),
      shiftId: 'shift-gz-1', // Mañana
      userId: '20', // Fernando
      role: 'STAFF',
      date: dateStr,
    });
    
    assignments.push({
      id: generateId(),
      shiftId: 'shift-gz-2', // Tarde
      userId: '21', // Isabel
      role: 'STAFF',
      date: dateStr,
    });
  }
  
  return assignments;
};

export function ShiftsProvider({ children }: ShiftsProviderProps) {
  const [shifts] = useState<Shift[]>(initialShifts);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>(generateInitialAssignments());
  const [isLoading] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // GET SHIFTS BY DEPARTMENT
  // ═══════════════════════════════════════════════════════════════════

  const getShiftsByDepartment = useCallback(
    (department: Department): Shift[] => {
      return shifts.filter(shift => shift.department === department);
    },
    [shifts]
  );

  // ═══════════════════════════════════════════════════════════════════
  // GET USER SHIFTS
  // ═══════════════════════════════════════════════════════════════════

  const getUserShifts = useCallback(
    (userId: string, date: string): Shift[] => {
      const userAssignments = assignments.filter(
        a => a.userId === userId && a.date === date
      );
      return userAssignments
        .map(a => shifts.find(s => s.id === a.shiftId))
        .filter((s): s is Shift => s !== undefined);
    },
    [assignments, shifts]
  );

  // ═══════════════════════════════════════════════════════════════════
  // GET DEPARTMENT SHIFTS
  // ═══════════════════════════════════════════════════════════════════

  const getDepartmentShifts = useCallback(
    (department: Department, date: string): ShiftAssignment[] => {
      const deptUserIds = users
        .filter(u => u.department === department && u.isActive)
        .map(u => u.id);
      
      return assignments.filter(
        a => deptUserIds.includes(a.userId) && a.date === date
      );
    },
    [assignments]
  );

  // ═══════════════════════════════════════════════════════════════════
  // GET WEEK ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════════════

  const getWeekAssignments = useCallback(
    (department: Department, weekStart: Date): ShiftAssignment[] => {
      const deptUserIds = users
        .filter(u => u.department === department && u.isActive)
        .map(u => u.id);
      
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDaysToDate(weekStart, i);
        weekDates.push(format(date, 'yyyy-MM-dd'));
      }
      
      return assignments.filter(
        a => deptUserIds.includes(a.userId) && weekDates.includes(a.date)
      );
    },
    [assignments]
  );

  // ═══════════════════════════════════════════════════════════════════
  // ASSIGN SHIFT
  // ═══════════════════════════════════════════════════════════════════

  const assignShift = useCallback(
    (userId: string, shiftId: string, date: string, role: string): void => {
      // Verificar si ya existe una asignación para este usuario en esta fecha
      const existingAssignment = assignments.find(
        a => a.userId === userId && a.date === date && a.shiftId === shiftId
      );
      
      if (existingAssignment) {
        return; // Ya existe, no hacer nada
      }
      
      const newAssignment: ShiftAssignment = {
        id: generateId(),
        shiftId,
        userId,
        role,
        date,
      };
      
      setAssignments(prev => [...prev, newAssignment]);
    },
    [assignments]
  );

  // ═══════════════════════════════════════════════════════════════════
  // REMOVE SHIFT
  // ═══════════════════════════════════════════════════════════════════

  const removeShift = useCallback((assignmentId: string): void => {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // GET SHIFT BY ID
  // ═══════════════════════════════════════════════════════════════════

  const getShiftById = useCallback(
    (id: string): Shift | undefined => {
      return shifts.find(s => s.id === id);
    },
    [shifts]
  );

  // ═══════════════════════════════════════════════════════════════════
  // GET ASSIGNMENT BY ID
  // ═══════════════════════════════════════════════════════════════════

  const getAssignmentById = useCallback(
    (id: string): ShiftAssignment | undefined => {
      return assignments.find(a => a.id === id);
    },
    [assignments]
  );

  // ═══════════════════════════════════════════════════════════════════
  // GET USERS BY DEPARTMENT
  // ═══════════════════════════════════════════════════════════════════

  const getUsersByDepartment = useCallback((department: Department) => {
    return users.filter(u => u.department === department && u.isActive);
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // IS USER ON SHIFT
  // ═══════════════════════════════════════════════════════════════════

  const isUserOnShift = useCallback(
    (userId: string, date: string): boolean => {
      return assignments.some(
        a => a.userId === userId && a.date === date
      );
    },
    [assignments]
  );

  // ═══════════════════════════════════════════════════════════════════
  // GET USERS ON SHIFT
  // ═══════════════════════════════════════════════════════════════════

  const getUsersOnShift = useCallback(
    (department: Department, date: string) => {
      const deptUserIds = users
        .filter(u => u.department === department && u.isActive)
        .map(u => u.id);
      
      const userIdsOnShift = assignments
        .filter(a => deptUserIds.includes(a.userId) && a.date === date)
        .map(a => a.userId);
      
      return users.filter(u => userIdsOnShift.includes(u.id));
    },
    [assignments]
  );

  // ═══════════════════════════════════════════════════════════════════
  // VALUE
  // ═══════════════════════════════════════════════════════════════════

  const value: ShiftsContextType = {
    shifts,
    assignments,
    isLoading,
    getShiftsByDepartment,
    getUserShifts,
    getDepartmentShifts,
    getWeekAssignments,
    assignShift,
    removeShift,
    getShiftById,
    getAssignmentById,
    getUsersByDepartment,
    isUserOnShift,
    getUsersOnShift,
  };

  return (
    <ShiftsContext.Provider value={value}>
      {children}
    </ShiftsContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════

export function useShifts(): ShiftsContextType {
  const context = useContext(ShiftsContext);
  if (context === undefined) {
    throw new Error('useShifts must be used within a ShiftsProvider');
  }
  return context;
}
