import { Shift } from '@/types';

// Iconos por departamento (dinamico, sincronizado con Firestore)
export const DEPT_ICON_KEYS: Record<string, string> = {
  'ADMINISTRATIVO': 'Building2',
  'VENTAS': 'ShoppingCart',
  'GUIANZA': 'Compass',
  'DIVE_SHOP': 'Waves',
  'MANTENIMIENTO': 'Wrench',
  'OPERACIONES': 'Ship',
  'COCINA': 'ChefHat',
  'LOGISTICA': 'Truck',
};

// Nombres cortos por departamento
export const DEPT_SHORT_NAMES: Record<string, string> = {
  'ADMINISTRATIVO': 'ADM',
  'VENTAS': 'VTA',
  'GUIANZA': 'GUIA',
  'DIVE_SHOP': 'DIVE',
  'MANTENIMIENTO': 'MANT',
  'OPERACIONES': 'OPS',
  'COCINA': 'COC',
  'LOGISTICA': 'LOG',
};

// Ordenar turnos por hora de inicio
export const sortShiftsByTime = (shifts: Shift[]): Shift[] => {
  return [...shifts].sort((a, b) => a.startTime.localeCompare(b.startTime));
};

export const shifts: Shift[] = [
  {
    id: 'ds-morning',
    name: 'Mañana',
    department: 'DIVE_SHOP',
    startTime: '07:00',
    endTime: '15:00',
    color: '#007AFF',
  },
  {
    id: 'ds-afternoon',
    name: 'Tarde',
    department: 'DIVE_SHOP',
    startTime: '15:00',
    endTime: '23:00',
    color: '#5856D6',
  },
  {
    id: 'ds-night',
    name: 'Noche',
    department: 'DIVE_SHOP',
    startTime: '23:00',
    endTime: '07:00',
    color: '#1C1C1E',
  },
  {
    id: 'vn-morning',
    name: 'Mañana',
    department: 'VENTAS',
    startTime: '08:00',
    endTime: '16:00',
    color: '#34C759',
  },
  {
    id: 'vn-afternoon',
    name: 'Tarde',
    department: 'VENTAS',
    startTime: '16:00',
    endTime: '00:00',
    color: '#FF9500',
  },
  {
    id: 'ad-day',
    name: 'Día',
    department: 'ADMINISTRATIVO',
    startTime: '09:00',
    endTime: '17:00',
    color: '#AF52DE',
  },
  {
    id: 'libre',
    name: 'Libre',
    department: 'DIVE_SHOP',
    startTime: '00:00',
    endTime: '00:00',
    color: '#8E8E93',
  },
];
