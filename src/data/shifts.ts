import { Shift, Department } from '@/types';

// Iconos por departamento
export const DEPT_ICON_KEYS: Record<Department, string> = {
  [Department.ADMINISTRATIVO]: 'Building2',
  [Department.FINANCIERO]: 'DollarSign',
  [Department.VENTAS]: 'ShoppingCart',
  [Department.MARKETING]: 'Megaphone',
  [Department.DIVE_SHOP]: 'Waves',
  [Department.GUIANZA]: 'Compass',
  [Department.COCINA]: 'ChefHat',
  [Department.MOVILIDAD]: 'Car',
  [Department.WAREHOUSE]: 'Package',
  [Department.VESSELS]: 'Ship',
};

// Nombres cortos por departamento
export const DEPT_SHORT_NAMES: Record<Department, string> = {
  [Department.ADMINISTRATIVO]: 'ADM',
  [Department.FINANCIERO]: 'FIN',
  [Department.VENTAS]: 'VTA',
  [Department.MARKETING]: 'MKT',
  [Department.DIVE_SHOP]: 'DIVE',
  [Department.GUIANZA]: 'GUIA',
  [Department.COCINA]: 'COC',
  [Department.MOVILIDAD]: 'MOV',
  [Department.WAREHOUSE]: 'WHS',
  [Department.VESSELS]: 'VES',
};

// Ordenar turnos por hora de inicio
export const sortShiftsByTime = (shifts: Shift[]): Shift[] => {
  return [...shifts].sort((a, b) => a.startTime.localeCompare(b.startTime));
};

export const shifts: Shift[] = [
  {
    id: 'ds-morning',
    name: 'Mañana',
    department: Department.DIVE_SHOP,
    startTime: '07:00',
    endTime: '15:00',
    color: '#007AFF',
  },
  {
    id: 'ds-afternoon',
    name: 'Tarde',
    department: Department.DIVE_SHOP,
    startTime: '15:00',
    endTime: '23:00',
    color: '#5856D6',
  },
  {
    id: 'ds-night',
    name: 'Noche',
    department: Department.DIVE_SHOP,
    startTime: '23:00',
    endTime: '07:00',
    color: '#1C1C1E',
  },
  {
    id: 'vn-morning',
    name: 'Mañana',
    department: Department.VENTAS,
    startTime: '08:00',
    endTime: '16:00',
    color: '#34C759',
  },
  {
    id: 'vn-afternoon',
    name: 'Tarde',
    department: Department.VENTAS,
    startTime: '16:00',
    endTime: '00:00',
    color: '#FF9500',
  },
  {
    id: 'ad-day',
    name: 'Día',
    department: Department.ADMINISTRATIVO,
    startTime: '09:00',
    endTime: '17:00',
    color: '#AF52DE',
  },
  {
    id: 'libre',
    name: 'Libre',
    department: Department.DIVE_SHOP,
    startTime: '00:00',
    endTime: '00:00',
    color: '#8E8E93',
  },
];
