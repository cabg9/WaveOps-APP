// ═══════════════════════════════════════════════════════════════════
// ASIGNACIONES DE USUARIOS A TURNOS - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { ShiftAssignment, AssignmentStatus } from '@/types';

// Asignaciones de usuarios a turnos por departamento
export const shiftAssignments: ShiftAssignment[] = [
  // ═══════════════════════════════════════════════════════════════════
  // DIVE SHOP - Turno AM
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'assign-ds-am-1',
    shiftId: 'shift-ds-am', // AM
    userId: '5', // Pedro Mendoza - Gerente de Dive Shop
    role: 'SUPERVISOR',
    date: '2025-01-15',
    status: AssignmentStatus.PUBLICADO,
  },
  {
    id: 'assign-ds-am-2',
    shiftId: 'shift-ds-am', // AM
    userId: '15', // Carlos Ruiz - Staff
    role: 'STAFF',
    date: '2025-01-15',
    status: AssignmentStatus.PUBLICADO,
  },
  {
    id: 'assign-ds-am-3',
    shiftId: 'shift-ds-am', // AM
    userId: '16', // Ana Lopez - Staff
    role: 'STAFF',
    date: '2025-01-15',
    status: AssignmentStatus.PUBLICADO,
  },

  // ═══════════════════════════════════════════════════════════════════
  // DIVE SHOP - Turno PM
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'assign-ds-pm-1',
    shiftId: 'shift-ds-pm', // PM
    userId: '18', // Sofia Castro - Supervisor
    role: 'SUPERVISOR',
    date: '2025-01-15',
    status: AssignmentStatus.PUBLICADO,
  },
  {
    id: 'assign-ds-pm-2',
    shiftId: 'shift-ds-pm', // PM
    userId: '19', // Miguel Angel - Staff
    role: 'STAFF',
    date: '2025-01-15',
    status: AssignmentStatus.PUBLICADO,
  },
  {
    id: 'assign-ds-pm-3',
    shiftId: 'shift-ds-pm', // PM
    userId: '20', // Laura Jimenez - Staff
    role: 'STAFF',
    date: '2025-01-15',
    status: AssignmentStatus.PUBLICADO,
  },

  // ═══════════════════════════════════════════════════════════════════
  // DIVE SHOP - Turno Despacho
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'assign-ds-despacho-1',
    shiftId: 'shift-ds-despacho', // Despacho
    userId: '24', // Maria Elena - Staff
    role: 'STAFF',
    date: '2025-01-15',
    status: AssignmentStatus.PUBLICADO,
  },

  // ═══════════════════════════════════════════════════════════════════
  // WAREHOUSE - PM 1
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'assign-wh-pm1-1',
    shiftId: 'shift-wh-pm1', // PM 1
    userId: '32', // Victor - Staff
    role: 'STAFF',
    date: '2025-01-15',
    status: AssignmentStatus.PUBLICADO,
  },

  // ═══════════════════════════════════════════════════════════════════
  // GUIANZA - Guianza Norte 1
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'assign-gz-norte1-1',
    shiftId: 'shift-gz-norte-1', // Guianza Norte 1
    userId: '20', // Fernando - Staff
    role: 'STAFF',
    date: '2025-01-15',
    status: AssignmentStatus.PUBLICADO,
  },

  // ═══════════════════════════════════════════════════════════════════
  // GUIANZA - Guianza Norte 2
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'assign-gz-norte2-1',
    shiftId: 'shift-gz-norte-2', // Guianza Norte 2
    userId: '21', // Isabel - Staff
    role: 'STAFF',
    date: '2025-01-15',
    status: AssignmentStatus.PUBLICADO,
  },
];

// Función para obtener usuarios asignados a un turno específico
export function getUsersByShift(shiftId: string): { userId: string; role: string }[] {
  return shiftAssignments
    .filter(a => a.shiftId === shiftId)
    .map(a => ({ userId: a.userId, role: a.role }));
}
