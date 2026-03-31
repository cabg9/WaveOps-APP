// ═══════════════════════════════════════════════════════════════════
// DATOS DE TURNOS - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { Shift, Department } from '@/types';

// Paleta de colores únicos para cada turno (no se repiten)
const TURN_COLORS = {
  // Administrativo
  'shift-adm-am': '#FF6B6B',      // Rojo coral
  'shift-adm-md': '#4ECDC4',      // Turquesa
  'shift-adm-pm': '#45B7D1',      // Azul claro
  'shift-adm-libre': '#96CEB4',   // Verde menta
  
  // Financiero
  'shift-fin-am': '#DDA0DD',      // Orquídea
  'shift-fin-md': '#98D8C8',      // Verde agua
  'shift-fin-pm': '#F7DC6F',      // Amarillo
  'shift-fin-libre': '#BB8FCE',   // Púrpura claro
  
  // Ventas
  'shift-vnt-am': '#85C1E9',      // Azul cielo
  'shift-vnt-md': '#F8B739',      // Naranja dorado
  'shift-vnt-pm': '#52BE80',      // Verde esmeralda
  'shift-vnt-libre': '#EC7063',   // Rojo salmón
  
  // Marketing
  'shift-mkt-am': '#AF7AC5',      // Púrpura medio
  'shift-mkt-md': '#5499C7',      // Azul acero
  'shift-mkt-pm': '#58D68D',      // Verde primavera
  'shift-mkt-libre': '#F5B041',   // Mostaza
  
  // Dive Shop
  'shift-ds-despacho': '#1ABC9C', // Verde turquesa
  'shift-ds-am': '#3498DB',       // Azul brillante
  'shift-ds-pm': '#9B59B6',       // Violeta
  'shift-ds-libre': '#E74C3C',    // Rojo
  
  // Guianza
  'shift-gz-despacho-norte': '#E67E22', // Naranja
  'shift-gz-norte-1': '#2ECC71',  // Verde
  'shift-gz-norte-2': '#E91E63',  // Rosa fuerte
  'shift-gz-norte-3': '#00BCD4',  // Cyan
  'shift-gz-libre': '#8BC34A',    // Verde lima
  
  // Movilidad
  'shift-mv-trip-id': '#FF5722',  // Naranja profundo
  'shift-mv-pax-a': '#795548',    // Café
  'shift-mv-pax-b': '#607D8B',    // Azul grisáceo
  'shift-mv-pax-c': '#3F51B5',    // Índigo
  'shift-mv-libre': '#9E9E9E',    // Gris
  
  // Vessels
  'shift-vs-am-norte': '#03A9F4', // Azul celeste
  'shift-vs-md-norte': '#FF9800', // Naranja ámbar
  'shift-vs-pm-norte': '#8BC34A', // Verde lima
  'shift-vs-libre': '#CDDC39',    // Lima amarillo
  
  // Warehouse
  'shift-wh-despacho': '#673AB7', // Púrpura profundo
  'shift-wh-pm1': '#009688',      // Verde azulado
  'shift-wh-pm2': '#FFEB3B',      // Amarillo
  'shift-wh-libre': '#FFC107',    // Ámbar
  
  // Cocina
  'shift-ck-manana': '#FF7043',   // Naranja coral
  'shift-ck-tarde': '#AB47BC',    // Púrpura medio
  'shift-ck-noche': '#42A5F5',    // Azul
  'shift-ck-libre': '#66BB6A',    // Verde
};

// Iconos/distintivos para cada departamento (claves para usar con Lucide icons)
export const DEPT_ICON_KEYS: Record<Department, string> = {
  [Department.ADMINISTRATIVO]: 'Building2',
  [Department.FINANCIERO]: 'DollarSign',
  [Department.VENTAS]: 'ShoppingCart',
  [Department.MARKETING]: 'Megaphone',
  [Department.DIVE_SHOP]: 'Waves',
  [Department.GUIANZA]: 'Compass',
  [Department.MOVILIDAD]: 'Car',
  [Department.VESSELS]: 'Ship',
  [Department.WAREHOUSE]: 'Package',
  [Department.COCINA]: 'ChefHat',
};

// Nombres cortos de departamentos para badges
export const DEPT_SHORT_NAMES: Record<Department, string> = {
  [Department.ADMINISTRATIVO]: 'ADM',
  [Department.FINANCIERO]: 'FIN',
  [Department.VENTAS]: 'VTA',
  [Department.MARKETING]: 'MKT',
  [Department.DIVE_SHOP]: 'DIVE',
  [Department.GUIANZA]: 'GUIA',
  [Department.MOVILIDAD]: 'MOV',
  [Department.VESSELS]: 'VES',
  [Department.WAREHOUSE]: 'WH',
  [Department.COCINA]: 'COC',
};

export const shifts: Shift[] = [
  // ═══════════════════════════════════════════════════════════════════
  // ADMINISTRATIVO
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-adm-am',
    name: 'AM',
    department: Department.ADMINISTRATIVO,
    startTime: '09:00',
    endTime: '13:00',
    color: TURN_COLORS['shift-adm-am'],
  },
  {
    id: 'shift-adm-md',
    name: 'MD',
    department: Department.ADMINISTRATIVO,
    startTime: '14:00',
    endTime: '18:00',
    color: TURN_COLORS['shift-adm-md'],
  },
  {
    id: 'shift-adm-pm',
    name: 'PM',
    department: Department.ADMINISTRATIVO,
    startTime: '18:00',
    endTime: '22:00',
    color: TURN_COLORS['shift-adm-pm'],
  },
  {
    id: 'shift-adm-libre',
    name: 'Libre',
    department: Department.ADMINISTRATIVO,
    startTime: '00:00',
    endTime: '24:00',
    color: TURN_COLORS['shift-adm-libre'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // FINANCIERO
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-fin-am',
    name: 'AM',
    department: Department.FINANCIERO,
    startTime: '09:00',
    endTime: '13:00',
    color: TURN_COLORS['shift-fin-am'],
  },
  {
    id: 'shift-fin-md',
    name: 'MD',
    department: Department.FINANCIERO,
    startTime: '14:00',
    endTime: '18:00',
    color: TURN_COLORS['shift-fin-md'],
  },
  {
    id: 'shift-fin-pm',
    name: 'PM',
    department: Department.FINANCIERO,
    startTime: '18:00',
    endTime: '22:00',
    color: TURN_COLORS['shift-fin-pm'],
  },
  {
    id: 'shift-fin-libre',
    name: 'Libre',
    department: Department.FINANCIERO,
    startTime: '00:00',
    endTime: '24:00',
    color: TURN_COLORS['shift-fin-libre'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // VENTAS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-vnt-am',
    name: 'AM',
    department: Department.VENTAS,
    startTime: '09:00',
    endTime: '13:00',
    color: TURN_COLORS['shift-vnt-am'],
  },
  {
    id: 'shift-vnt-md',
    name: 'MD',
    department: Department.VENTAS,
    startTime: '14:00',
    endTime: '18:00',
    color: TURN_COLORS['shift-vnt-md'],
  },
  {
    id: 'shift-vnt-pm',
    name: 'PM',
    department: Department.VENTAS,
    startTime: '18:00',
    endTime: '22:00',
    color: TURN_COLORS['shift-vnt-pm'],
  },
  {
    id: 'shift-vnt-libre',
    name: 'Libre',
    department: Department.VENTAS,
    startTime: '00:00',
    endTime: '24:00',
    color: TURN_COLORS['shift-vnt-libre'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // MARKETING
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-mkt-am',
    name: 'AM',
    department: Department.MARKETING,
    startTime: '09:00',
    endTime: '13:00',
    color: TURN_COLORS['shift-mkt-am'],
  },
  {
    id: 'shift-mkt-md',
    name: 'MD',
    department: Department.MARKETING,
    startTime: '14:00',
    endTime: '18:00',
    color: TURN_COLORS['shift-mkt-md'],
  },
  {
    id: 'shift-mkt-pm',
    name: 'PM',
    department: Department.MARKETING,
    startTime: '18:00',
    endTime: '22:00',
    color: TURN_COLORS['shift-mkt-pm'],
  },
  {
    id: 'shift-mkt-libre',
    name: 'Libre',
    department: Department.MARKETING,
    startTime: '00:00',
    endTime: '24:00',
    color: TURN_COLORS['shift-mkt-libre'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // DIVE SHOP
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-ds-despacho',
    name: 'Despacho',
    department: Department.DIVE_SHOP,
    startTime: '06:45',
    endTime: '07:45',
    color: TURN_COLORS['shift-ds-despacho'],
  },
  {
    id: 'shift-ds-am',
    name: 'AM',
    department: Department.DIVE_SHOP,
    startTime: '09:00',
    endTime: '13:00',
    color: TURN_COLORS['shift-ds-am'],
  },
  {
    id: 'shift-ds-pm',
    name: 'PM',
    department: Department.DIVE_SHOP,
    startTime: '12:30',
    endTime: '20:30',
    color: TURN_COLORS['shift-ds-pm'],
  },
  {
    id: 'shift-ds-libre',
    name: 'Libre',
    department: Department.DIVE_SHOP,
    startTime: '00:00',
    endTime: '24:00',
    color: TURN_COLORS['shift-ds-libre'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // GUIANZA
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-gz-despacho-norte',
    name: 'Despacho Norte',
    department: Department.GUIANZA,
    startTime: '06:45',
    endTime: '07:15',
    color: TURN_COLORS['shift-gz-despacho-norte'],
  },
  {
    id: 'shift-gz-norte-1',
    name: 'Guianza Norte 1',
    department: Department.GUIANZA,
    startTime: '06:00',
    endTime: '15:00',
    color: TURN_COLORS['shift-gz-norte-1'],
  },
  {
    id: 'shift-gz-norte-2',
    name: 'Guianza Norte 2',
    department: Department.GUIANZA,
    startTime: '11:30',
    endTime: '18:30',
    color: TURN_COLORS['shift-gz-norte-2'],
  },
  {
    id: 'shift-gz-norte-3',
    name: 'Guianza Norte 3',
    department: Department.GUIANZA,
    startTime: '12:30',
    endTime: '20:30',
    color: TURN_COLORS['shift-gz-norte-3'],
  },
  {
    id: 'shift-gz-libre',
    name: 'Libre',
    department: Department.GUIANZA,
    startTime: '00:00',
    endTime: '24:00',
    color: TURN_COLORS['shift-gz-libre'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // MOVILIDAD
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-mv-trip-id',
    name: 'Norte Tripulación Ida',
    department: Department.MOVILIDAD,
    startTime: '06:00',
    endTime: '07:00',
    color: TURN_COLORS['shift-mv-trip-id'],
  },
  {
    id: 'shift-mv-pax-a',
    name: 'Norte Pax Ida A',
    department: Department.MOVILIDAD,
    startTime: '07:00',
    endTime: '08:00',
    color: TURN_COLORS['shift-mv-pax-a'],
  },
  {
    id: 'shift-mv-pax-b',
    name: 'Norte Pax Ida B',
    department: Department.MOVILIDAD,
    startTime: '09:30',
    endTime: '10:30',
    color: TURN_COLORS['shift-mv-pax-b'],
  },
  {
    id: 'shift-mv-pax-c',
    name: 'Norte Pax Ida C',
    department: Department.MOVILIDAD,
    startTime: '12:30',
    endTime: '13:30',
    color: TURN_COLORS['shift-mv-pax-c'],
  },
  {
    id: 'shift-mv-libre',
    name: 'Libre',
    department: Department.MOVILIDAD,
    startTime: '00:00',
    endTime: '24:00',
    color: TURN_COLORS['shift-mv-libre'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // VESSELS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-vs-am-norte',
    name: 'AM Norte',
    department: Department.VESSELS,
    startTime: '06:00',
    endTime: '15:00',
    color: TURN_COLORS['shift-vs-am-norte'],
  },
  {
    id: 'shift-vs-md-norte',
    name: 'MD Norte',
    department: Department.VESSELS,
    startTime: '11:30',
    endTime: '18:30',
    color: TURN_COLORS['shift-vs-md-norte'],
  },
  {
    id: 'shift-vs-pm-norte',
    name: 'PM Norte',
    department: Department.VESSELS,
    startTime: '12:30',
    endTime: '20:30',
    color: TURN_COLORS['shift-vs-pm-norte'],
  },
  {
    id: 'shift-vs-libre',
    name: 'Libre',
    department: Department.VESSELS,
    startTime: '00:00',
    endTime: '24:00',
    color: TURN_COLORS['shift-vs-libre'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // WAREHOUSE
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-wh-despacho',
    name: 'Despacho',
    department: Department.WAREHOUSE,
    startTime: '06:00',
    endTime: '08:00',
    color: TURN_COLORS['shift-wh-despacho'],
  },
  {
    id: 'shift-wh-pm1',
    name: 'PM 1',
    department: Department.WAREHOUSE,
    startTime: '15:00',
    endTime: '19:00',
    color: TURN_COLORS['shift-wh-pm1'],
  },
  {
    id: 'shift-wh-pm2',
    name: 'PM 2',
    department: Department.WAREHOUSE,
    startTime: '18:00',
    endTime: '21:00',
    color: TURN_COLORS['shift-wh-pm2'],
  },
  {
    id: 'shift-wh-libre',
    name: 'Libre',
    department: Department.WAREHOUSE,
    startTime: '00:00',
    endTime: '24:00',
    color: TURN_COLORS['shift-wh-libre'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // COCINA
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-ck-manana',
    name: 'Mañana',
    department: Department.COCINA,
    startTime: '08:00',
    endTime: '12:00',
    color: TURN_COLORS['shift-ck-manana'],
  },
  {
    id: 'shift-ck-tarde',
    name: 'Tarde',
    department: Department.COCINA,
    startTime: '12:00',
    endTime: '16:00',
    color: TURN_COLORS['shift-ck-tarde'],
  },
  {
    id: 'shift-ck-noche',
    name: 'Noche',
    department: Department.COCINA,
    startTime: '16:00',
    endTime: '20:00',
    color: TURN_COLORS['shift-ck-noche'],
  },
  {
    id: 'shift-ck-libre',
    name: 'Libre',
    department: Department.COCINA,
    startTime: '00:00',
    endTime: '24:00',
    color: TURN_COLORS['shift-ck-libre'],
  },
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

export function getShiftsByDepartment(department: Department): Shift[] {
  return shifts.filter(s => s.department === department);
}

export function getShiftById(id: string): Shift | undefined {
  return shifts.find(s => s.id === id);
}

// Función para ordenar turnos por hora de inicio
export function sortShiftsByTime(shiftsToSort: Shift[]): Shift[] {
  return [...shiftsToSort].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });
}
