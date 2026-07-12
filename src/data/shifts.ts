import { Shift } from '@/types';

// Iconos por departamento (dinamico, sincronizado con Firestore)
export const DEPT_ICON_KEYS: Record<string, string> = {
  'Administrativo': 'Building2',
  'Ventas': 'ShoppingCart',
  'Guianza': 'Compass',
  'Dive Shop': 'Waves',
  'Mantenimiento': 'Wrench',
  'Operaciones': 'Ship',
  'Cocina': 'ChefHat',
  'Logistica': 'Truck',
};

// Nombres cortos por departamento
export const DEPT_SHORT_NAMES: Record<string, string> = {
  'Administrativo': 'ADM',
  'Ventas': 'VTA',
  'Guianza': 'GUIA',
  'Dive Shop': 'DIVE',
  'Mantenimiento': 'MANT',
  'Operaciones': 'OPS',
  'Cocina': 'COC',
  'Logistica': 'LOG',
};

// Ordenar turnos por hora de inicio
export const sortShiftsByTime = (shifts: Shift[]): Shift[] => {
  return [...shifts].sort((a, b) => a.startTime.localeCompare(b.startTime));
};

export const shifts: Shift[] = [
  {
    id: 'ds-morning',
    name: 'Mañana',
    department: 'Dive Shop',
    startTime: '07:00',
    endTime: '15:00',
    color: '#007AFF',
  },
  {
    id: 'ds-afternoon',
    name: 'Tarde',
    department: 'Dive Shop',
    startTime: '15:00',
    endTime: '23:00',
    color: '#5856D6',
  },
  {
    id: 'ds-night',
    name: 'Noche',
    department: 'Dive Shop',
    startTime: '23:00',
    endTime: '07:00',
    color: '#1C1C1E',
  },
  {
    id: 'vn-morning',
    name: 'Mañana',
    department: 'Ventas',
    startTime: '08:00',
    endTime: '16:00',
    color: '#34C759',
  },
  {
    id: 'vn-afternoon',
    name: 'Tarde',
    department: 'Ventas',
    startTime: '16:00',
    endTime: '00:00',
    color: '#FF9500',
  },
  {
    id: 'ad-day',
    name: 'Día',
    department: 'Administrativo',
    startTime: '09:00',
    endTime: '17:00',
    color: '#AF52DE',
  },
  {
    id: 'libre',
    name: 'Libre',
    department: 'Dive Shop',
    startTime: '00:00',
    endTime: '00:00',
    color: '#8E8E93',
  },
];
