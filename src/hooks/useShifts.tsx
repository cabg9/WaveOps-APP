// ═══════════════════════════════════════════════════════════════════
// HOOK DE TURNOS - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Shift, ShiftAssignment, Department, AssignmentStatus, Role } from '@/types';
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
  publishAssignments: (department: Department | 'ALL', weekStart: Date, publishedBy: string) => void;
  getBorradorCount: (department: Department | 'ALL', weekStart: Date) => number;
  validateDayRequirements: (department: Department, date: string) => { isValid: boolean; errors: string[] };
}

const ShiftsContext = createContext<ShiftsContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════

interface ShiftsProviderProps {
  children: React.ReactNode;
}

// Generar asignaciones iniciales de ejemplo (PUBLICADAS)
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
      status: AssignmentStatus.PUBLICADO,
      publishedAt: new Date().toISOString(),
      publishedBy: '1',
    });
    
    assignments.push({
      id: generateId(),
      shiftId: dayOffset % 2 === 0 ? 'shift-ds-3' : 'shift-ds-2', // PM / AM alternados
      userId: '17', // Maria
      role: 'STAFF',
      date: dateStr,
      status: AssignmentStatus.PUBLICADO,
      publishedAt: new Date().toISOString(),
      publishedBy: '1',
    });
    
    // Warehouse
    assignments.push({
      id: generateId(),
      shiftId: 'shift-wh-2', // PM1
      userId: '32', // Victor
      role: 'STAFF',
      date: dateStr,
      status: AssignmentStatus.PUBLICADO,
      publishedAt: new Date().toISOString(),
      publishedBy: '1',
    });
    
    // Guianza
    assignments.push({
      id: generateId(),
      shiftId: 'shift-gz-1', // Mañana
      userId: '20', // Fernando
      role: 'STAFF',
      date: dateStr,
      status: AssignmentStatus.PUBLICADO,
      publishedAt: new Date().toISOString(),
      publishedBy: '1',
    });
    
    assignments.push({
      id: generateId(),
      shiftId: 'shift-gz-2', // Tarde
      userId: '21', // Isabel
      role: 'STAFF',
      date: dateStr,
      status: AssignmentStatus.PUBLICADO,
      publishedAt: new Date().toISOString(),
      publishedBy: '1',
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
  // ASSIGN SHIFT (crea como BORRADOR)
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
        status: AssignmentStatus.BORRADOR, // Nuevas asignaciones son borrador
      };
      
      setAssignments(prev => [...prev, newAssignment]);
    },
    [assignments]
  );

  // ═══════════════════════════════════════════════════════════════════
  // REMOVE SHIFT
  // - Si está PUBLICADO → marca como ELIMINADO (para publicar el cambio)
  // - Si está BORRADOR → elimina permanentemente
  // ═══════════════════════════════════════════════════════════════════

  const removeShift = useCallback((assignmentId: string): void => {
    setAssignments(prev => {
      const assignment = prev.find(a => a.id === assignmentId);
      
      if (assignment?.status === AssignmentStatus.PUBLICADO) {
        // Marcar como eliminado (se borrará al publicar)
        return prev.map(a => 
          a.id === assignmentId 
            ? { ...a, status: AssignmentStatus.ELIMINADO }
            : a
        );
      } else {
        // Borrador o ya eliminado → eliminar permanentemente
        return prev.filter(a => a.id !== assignmentId);
      }
    });
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
  // PUBLISH ASSIGNMENTS
  // - Cambia BORRADOR a PUBLICADO
  // - Elimina permanentemente las marcadas como ELIMINADO
  // ═══════════════════════════════════════════════════════════════════

  const publishAssignments = useCallback(
    (department: Department | 'ALL', weekStart: Date, publishedBy: string): void => {
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDaysToDate(weekStart, i);
        weekDates.push(format(date, 'yyyy-MM-dd'));
      }
      
      setAssignments(prev => {
        if (department === 'ALL') {
          // Modo ALL: publicar todos los borradores de todos los departamentos
          // Primero: eliminar las marcadas como ELIMINADO
          const filtered = prev.filter(a => {
            if (!weekDates.includes(a.date)) return true;
            return a.status !== AssignmentStatus.ELIMINADO;
          });
          
          // Luego: publicar todas las BORRADOR de la semana
          return filtered.map(a => {
            if (weekDates.includes(a.date) && a.status === AssignmentStatus.BORRADOR) {
              return {
                ...a,
                status: AssignmentStatus.PUBLICADO,
                publishedAt: new Date().toISOString(),
                publishedBy,
              };
            }
            return a;
          });
        } else {
          // Modo departamento específico
          // Primero: eliminar las marcadas como ELIMINADO
          const filtered = prev.filter(a => {
            if (!weekDates.includes(a.date)) return true;
            const user = users.find(u => u.id === a.userId);
            if (user?.department !== department) return true;
            return a.status !== AssignmentStatus.ELIMINADO;
          });
          
          // Luego: publicar las BORRADOR
          return filtered.map(a => {
            if (weekDates.includes(a.date) && a.status === AssignmentStatus.BORRADOR) {
              const user = users.find(u => u.id === a.userId);
              if (user?.department === department) {
                return {
                  ...a,
                  status: AssignmentStatus.PUBLICADO,
                  publishedAt: new Date().toISOString(),
                  publishedBy,
                };
              }
            }
            return a;
          });
        }
      });
    },
    []
  );

  // ═══════════════════════════════════════════════════════════════════
  // GET PENDING CHANGES COUNT (contar BORRADOR + ELIMINADO)
  // ═══════════════════════════════════════════════════════════════════

  const getBorradorCount = useCallback(
    (department: Department | 'ALL', weekStart: Date): number => {
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDaysToDate(weekStart, i);
        weekDates.push(format(date, 'yyyy-MM-dd'));
      }
      
      if (department === 'ALL') {
        // En modo ALL, contar todos los cambios pendientes
        return assignments.filter(
          a => weekDates.includes(a.date) && 
               (a.status === AssignmentStatus.BORRADOR || a.status === AssignmentStatus.ELIMINADO)
        ).length;
      }
      
      const deptUserIds = users
        .filter(u => u.department === department && u.isActive)
        .map(u => u.id);
      
      return assignments.filter(
        a => weekDates.includes(a.date) && 
             deptUserIds.includes(a.userId) && 
             (a.status === AssignmentStatus.BORRADOR || a.status === AssignmentStatus.ELIMINADO)
      ).length;
    },
    [assignments]
  );

  // ═══════════════════════════════════════════════════════════════════
  // VALIDATE DEPARTMENT REQUIREMENTS
  // ═══════════════════════════════════════════════════════════════════

  const validateDayRequirements = useCallback(
    (department: Department, date: string): { isValid: boolean; errors: string[] } => {
      const errors: string[] = [];
      
      // Obtener asignaciones del día (solo PUBLICADAS para validación oficial)
      const dayAssignments = assignments.filter(
        a => a.date === date && a.status === AssignmentStatus.PUBLICADO
      );
      
      // Obtener usuarios del departamento
      const deptUsers = users.filter(u => u.department === department && u.isActive);
      const deptUserIds = deptUsers.map(u => u.id);
      
      // Filtrar asignaciones del departamento
      const deptAssignments = dayAssignments.filter(a => deptUserIds.includes(a.userId));
      
      // Verificar si hay gerente o supervisor
      const hasManagerOrSupervisor = deptAssignments.some(a => {
        const user = users.find(u => u.id === a.userId);
        return user?.role === Role.GERENTE_DEPARTAMENTO || user?.role === Role.SUPERVISOR;
      });
      
      if (!hasManagerOrSupervisor) {
        errors.push('Se requiere al menos un Gerente de Departamento o Supervisor');
      }
      
      // Validaciones específicas por departamento
      switch (department) {
        case Department.DIVE_SHOP:
          // Validar requisitos específicos de Dive Shop
          const despachoAssignments = deptAssignments.filter(a => {
            const shift = shifts.find(s => s.id === a.shiftId);
            return shift?.name === 'Despacho';
          });
          
          if (despachoAssignments.length > 0) {
            const hasVoluntarioA = despachoAssignments.some(a => {
              const user = users.find(u => u.id === a.userId);
              return user?.position?.toLowerCase().includes('voluntario') && user?.position?.toLowerCase().includes('a');
            });
            if (!hasVoluntarioA) {
              errors.push('Turno Despacho: Se requiere Voluntario A');
            }
          }
          break;
          
        case Department.WAREHOUSE:
          // Validar requisitos de Warehouse
          const pm1Assignments = deptAssignments.filter(a => {
            const shift = shifts.find(s => s.id === a.shiftId);
            return shift?.name === 'PM 1';
          });
          
          if (pm1Assignments.length > 0) {
            const hasVoluntarioA = pm1Assignments.some(a => {
              const user = users.find(u => u.id === a.userId);
              return user?.position?.toLowerCase().includes('voluntario') && user?.position?.toLowerCase().includes('a');
            });
            if (!hasVoluntarioA) {
              errors.push('Turno PM 1: Se requiere Voluntario A');
            }
          }
          break;
          
        case Department.VESSELS:
          // Validar que haya al menos 1 marinero
          const hasMarinero = deptAssignments.some(a => {
            const user = users.find(u => u.id === a.userId);
            return user?.position?.toLowerCase().includes('marinero');
          });
          if (!hasMarinero) {
            errors.push('Se requiere al menos 1 Marinero');
          }
          break;
      }
      
      return { isValid: errors.length === 0, errors };
    },
    [assignments, shifts]
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
    publishAssignments,
    getBorradorCount,
    validateDayRequirements,
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
