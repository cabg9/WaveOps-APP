// ═══════════════════════════════════════════════════════════════════
// DATOS DE TURNOS - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { Shift, Department, Role } from '@/types';

export const shifts: Shift[] = [
  // ═══════════════════════════════════════════════════════════════════
  // DIVE SHOP
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-ds-1',
    name: 'Despacho',
    department: Department.DIVE_SHOP,
    startTime: '06:45',
    endTime: '07:45',
    color: '#045aa0',
  },
  {
    id: 'shift-ds-2',
    name: 'AM',
    department: Department.DIVE_SHOP,
    startTime: '09:00',
    endTime: '13:00',
    color: '#045aa0',
    requirements: [
      { role: Role.SUPERVISOR, count: 1 },
      { role: Role.STAFF, count: 3 }, // 2 voluntarios + 1 vendedor
    ],
  },
  {
    id: 'shift-ds-3',
    name: 'PM',
    department: Department.DIVE_SHOP,
    startTime: '12:30',
    endTime: '20:30',
    color: '#045aa0',
    requirements: [
      { role: Role.SUPERVISOR, count: 1 },
      { role: Role.STAFF, count: 5 }, // 3 voluntarios + 2 vendedores
    ],
  },
  {
    id: 'shift-ds-4',
    name: 'Libre',
    department: Department.DIVE_SHOP,
    startTime: '00:00',
    endTime: '00:00',
    color: '#8E8E93',
  },

  // ═══════════════════════════════════════════════════════════════════
  // WAREHOUSE
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-wh-1',
    name: 'Despacho',
    department: Department.WAREHOUSE,
    startTime: '06:15',
    endTime: '08:00',
    color: '#5856D6',
  },
  {
    id: 'shift-wh-2',
    name: 'PM1',
    department: Department.WAREHOUSE,
    startTime: '15:00',
    endTime: '19:00',
    color: '#5856D6',
  },
  {
    id: 'shift-wh-3',
    name: 'PM2',
    department: Department.WAREHOUSE,
    startTime: '18:00',
    endTime: '21:00',
    color: '#5856D6',
  },
  {
    id: 'shift-wh-4',
    name: 'Libre',
    department: Department.WAREHOUSE,
    startTime: '00:00',
    endTime: '00:00',
    color: '#8E8E93',
  },

  // ═══════════════════════════════════════════════════════════════════
  // GUIANZA
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-gz-1',
    name: 'Mañana',
    department: Department.GUIANZA,
    startTime: '08:00',
    endTime: '12:00',
    color: '#34C759',
  },
  {
    id: 'shift-gz-2',
    name: 'Tarde',
    department: Department.GUIANZA,
    startTime: '12:00',
    endTime: '16:00',
    color: '#34C759',
  },
  {
    id: 'shift-gz-3',
    name: 'Noche',
    department: Department.GUIANZA,
    startTime: '16:00',
    endTime: '20:00',
    color: '#34C759',
  },
  {
    id: 'shift-gz-4',
    name: 'Libre',
    department: Department.GUIANZA,
    startTime: '00:00',
    endTime: '00:00',
    color: '#8E8E93',
  },

  // ═══════════════════════════════════════════════════════════════════
  // COCINA
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-ck-1',
    name: 'Mañana',
    department: Department.COCINA,
    startTime: '08:00',
    endTime: '12:00',
    color: '#FF9500',
  },
  {
    id: 'shift-ck-2',
    name: 'Tarde',
    department: Department.COCINA,
    startTime: '12:00',
    endTime: '16:00',
    color: '#FF9500',
  },
  {
    id: 'shift-ck-3',
    name: 'Noche',
    department: Department.COCINA,
    startTime: '16:00',
    endTime: '20:00',
    color: '#FF9500',
  },
  {
    id: 'shift-ck-4',
    name: 'Libre',
    department: Department.COCINA,
    startTime: '00:00',
    endTime: '00:00',
    color: '#8E8E93',
  },

  // ═══════════════════════════════════════════════════════════════════
  // MOVILIDAD
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-mv-1',
    name: 'Mañana',
    department: Department.MOVILIDAD,
    startTime: '08:00',
    endTime: '12:00',
    color: '#FF3B30',
  },
  {
    id: 'shift-mv-2',
    name: 'Tarde',
    department: Department.MOVILIDAD,
    startTime: '12:00',
    endTime: '16:00',
    color: '#FF3B30',
  },
  {
    id: 'shift-mv-3',
    name: 'Noche',
    department: Department.MOVILIDAD,
    startTime: '16:00',
    endTime: '20:00',
    color: '#FF3B30',
  },
  {
    id: 'shift-mv-4',
    name: 'Libre',
    department: Department.MOVILIDAD,
    startTime: '00:00',
    endTime: '00:00',
    color: '#8E8E93',
  },

  // ═══════════════════════════════════════════════════════════════════
  // VESSELS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-vs-1',
    name: 'Mañana',
    department: Department.VESSELS,
    startTime: '08:00',
    endTime: '12:00',
    color: '#5AC8FA',
  },
  {
    id: 'shift-vs-2',
    name: 'Tarde',
    department: Department.VESSELS,
    startTime: '12:00',
    endTime: '16:00',
    color: '#5AC8FA',
  },
  {
    id: 'shift-vs-3',
    name: 'Noche',
    department: Department.VESSELS,
    startTime: '16:00',
    endTime: '20:00',
    color: '#5AC8FA',
  },
  {
    id: 'shift-vs-4',
    name: 'Libre',
    department: Department.VESSELS,
    startTime: '00:00',
    endTime: '00:00',
    color: '#8E8E93',
  },

  // ═══════════════════════════════════════════════════════════════════
  // ADMINISTRATIVO
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-ad-1',
    name: 'Mañana',
    department: Department.ADMINISTRATIVO,
    startTime: '08:00',
    endTime: '12:00',
    color: '#007AFF',
  },
  {
    id: 'shift-ad-2',
    name: 'Tarde',
    department: Department.ADMINISTRATIVO,
    startTime: '12:00',
    endTime: '16:00',
    color: '#007AFF',
  },
  {
    id: 'shift-ad-3',
    name: 'Libre',
    department: Department.ADMINISTRATIVO,
    startTime: '00:00',
    endTime: '00:00',
    color: '#8E8E93',
  },

  // ═══════════════════════════════════════════════════════════════════
  // FINANCIERO
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-fn-1',
    name: 'Mañana',
    department: Department.FINANCIERO,
    startTime: '08:00',
    endTime: '12:00',
    color: '#007AFF',
  },
  {
    id: 'shift-fn-2',
    name: 'Tarde',
    department: Department.FINANCIERO,
    startTime: '12:00',
    endTime: '16:00',
    color: '#007AFF',
  },
  {
    id: 'shift-fn-3',
    name: 'Libre',
    department: Department.FINANCIERO,
    startTime: '00:00',
    endTime: '00:00',
    color: '#8E8E93',
  },

  // ═══════════════════════════════════════════════════════════════════
  // VENTAS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-vt-1',
    name: 'Mañana',
    department: Department.VENTAS,
    startTime: '08:00',
    endTime: '12:00',
    color: '#007AFF',
  },
  {
    id: 'shift-vt-2',
    name: 'Tarde',
    department: Department.VENTAS,
    startTime: '12:00',
    endTime: '16:00',
    color: '#007AFF',
  },
  {
    id: 'shift-vt-3',
    name: 'Libre',
    department: Department.VENTAS,
    startTime: '00:00',
    endTime: '00:00',
    color: '#8E8E93',
  },

  // ═══════════════════════════════════════════════════════════════════
  // MARKETING
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-mk-1',
    name: 'Mañana',
    department: Department.MARKETING,
    startTime: '08:00',
    endTime: '12:00',
    color: '#007AFF',
  },
  {
    id: 'shift-mk-2',
    name: 'Tarde',
    department: Department.MARKETING,
    startTime: '12:00',
    endTime: '16:00',
    color: '#007AFF',
  },
  {
    id: 'shift-mk-3',
    name: 'Libre',
    department: Department.MARKETING,
    startTime: '00:00',
    endTime: '00:00',
    color: '#8E8E93',
  },
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

export const getShiftsByDepartment = (department: Department): Shift[] => {
  return shifts.filter(shift => shift.department === department);
};

export const getShiftById = (id: string): Shift | undefined => {
  return shifts.find(shift => shift.id === id);
};

export const getShiftDuration = (shift: Shift): number => {
  if (shift.startTime === '00:00' && shift.endTime === '00:00') {
    return 0;
  }
  const [startHours, startMinutes] = shift.startTime.split(':').map(Number);
  const [endHours, endMinutes] = shift.endTime.split(':').map(Number);
  return (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
};

export const formatShiftTime = (shift: Shift): string => {
  if (shift.startTime === '00:00' && shift.endTime === '00:00') {
    return 'Libre';
  }
  return `${shift.startTime} - ${shift.endTime}`;
};
