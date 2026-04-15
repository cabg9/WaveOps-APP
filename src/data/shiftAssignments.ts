import { ShiftAssignment, AssignmentStatus } from '@/types';

export const shiftAssignments: ShiftAssignment[] = [];

export const createAssignment = (
  userId: string,
  shiftId: string,
  date: string,
  assignedBy: string
): ShiftAssignment => ({
  id: `${userId}-${shiftId}-${date}`,
  userId,
  shiftId,
  date,
  role: 'STAFF',
  status: AssignmentStatus.PUBLICADO,
});
