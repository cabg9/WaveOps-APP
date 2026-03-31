// ═══════════════════════════════════════════════════════════════════
// ASIGNACIONES DE USUARIOS A TURNOS - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { ShiftAssignment } from '@/types';

// Asignaciones de usuarios a turnos por departamento
export const shiftAssignments: ShiftAssignment[] = [
  // ═══════════════════════════════════════════════════════════════════
  // DIVE SHOP - Turno AM
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'assign-ds-am-1',
    shiftId: 'shift-ds-2', // AM
    userId: '5', // Pedro Mendoza - Gerente de Dive Shop
    role: 'SUPERVISOR',
    date: '2025-01-15',
  },
  {
    id: 'assign-ds-am-2',
    shiftId: 'shift-ds-2', // AM
    userId: '15', // Carlos Ruiz - Staff
    role: 'STAFF',
    date: '2025-01-15',
  },
  {
    id: 'assign-ds-am-3',
    shiftId: 'shift-ds-2', // AM
    userId: '16', // Ana Lopez - Staff
    role: 'STAFF',
    date: '2025-01-15',
  },
  {
    id: 'assign-ds-am-4',
    shiftId: 'shift-ds-2', // AM
    userId: '17', // Diego Flores - Staff
    role: 'STAFF',
    date: '2025-01-15',
  },

  // ═══════════════════════════════════════════════════════════════════
  // DIVE SHOP - Turno PM
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'assign-ds-pm-1',
    shiftId: 'shift-ds-3', // PM
    userId: '18', // Sofia Castro - Supervisor
    role: 'SUPERVISOR',
    date: '2025-01-15',
  },
  {
    id: 'assign-ds-pm-2',
    shiftId: 'shift-ds-3', // PM
    userId: '19', // Miguel Angel - Staff
    role: 'STAFF',
    date: '2025-01-15',
  },
  {
    id: 'assign-ds-pm-3',
    shiftId: 'shift-ds-3', // PM
    userId: '20', // Laura Jimenez - Staff
    role: 'STAFF',
    date: '2025-01-15',
  },
  {
    id: 'assign-ds-pm-4',
    shiftId: 'shift-ds-3', // PM
    userId: '21', // Javier Ortiz - Staff
    role: 'STAFF',
    date: '2025-01-15',
  },
  {
    id: 'assign-ds-pm-5',
    shiftId: 'shift-ds-3', // PM
    userId: '22', // Patricia Vega - Staff
    role: 'STAFF',
    date: '2025-01-15',
  },
  {
    id: 'assign-ds-pm-6',
    shiftId: 'shift-ds-3', // PM
    userId: '23', // Ricardo Soto - Staff
    role: 'STAFF',
    date: '2025-01-15',
  },

  // ═══════════════════════════════════════════════════════════════════
  // DIVE SHOP - Turno Despacho
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'assign-ds-despacho-1',
    shiftId: 'shift-ds-1', // Despacho
    userId: '24', // Maria Elena - Staff
    role: 'STAFF',
    date: '2025-01-15',
  },
];

// Función para obtener usuarios asignados a un turno específico
export function getUsersByShift(shiftId: string): { userId: string; role: string }[] {
  return shiftAssignments
    .filter((a) => a.shiftId === shiftId)
    .map((a) => ({ userId: a.userId, role: a.role }));
}

// Función para obtener usuarios por turno y rol
export function getUsersByShiftAndRole(shiftId: string, role: string): string[] {
  return shiftAssignments
    .filter((a) => a.shiftId === shiftId && a.role === role)
    .map((a) => a.userId);
}
