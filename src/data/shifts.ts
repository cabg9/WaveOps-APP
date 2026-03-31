// ═══════════════════════════════════════════════════════════════════
// DATOS DE TURNOS - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { Shift, Department } from '@/types';

// Paleta de colores distintivos para cada departamento
const COLORS = {
  ADMINISTRATIVO: '#6366F1',   // Indigo
  FINANCIERO: '#8B5CF6',       // Violeta
  VENTAS: '#EC4899',           // Rosa
  MARKETING: '#F43F5E',        // Rojo rosado
  DIVE_SHOP: '#0EA5E9',        // Azul cielo
  GUIANZA: '#10B981',          // Esmeralda
  MOVILIDAD: '#F59E0B',        // Ámbar
  VESSELS: '#06B6D4',          // Cyan
  WAREHOUSE: '#84CC16',        // Lima
  COCINA: '#F97316',           // Naranja
  LIBRE: '#9CA3AF',            // Gris
};

export const shifts: Shift[] = [
  // ═══════════════════════════════════════════════════════════════════
  // ADMINISTRATIVO (y sub-departamentos: FINANCIERO, VENTAS, MARKETING)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-adm-am',
    name: 'AM',
    department: Department.ADMINISTRATIVO,
    startTime: '09:00',
    endTime: '13:00',
    color: COLORS.ADMINISTRATIVO,
  },
  {
    id: 'shift-adm-md',
    name: 'MD',
    department: Department.ADMINISTRATIVO,
    startTime: '14:00',
    endTime: '18:00',
    color: COLORS.ADMINISTRATIVO,
  },
  {
    id: 'shift-adm-pm',
    name: 'PM',
    department: Department.ADMINISTRATIVO,
    startTime: '18:00',
    endTime: '22:00',
    color: COLORS.ADMINISTRATIVO,
  },
  {
    id: 'shift-adm-libre',
    name: 'Libre',
    department: Department.ADMINISTRATIVO,
    startTime: '00:00',
    endTime: '24:00',
    color: COLORS.LIBRE,
  },

  // ═══════════════════════════════════════════════════════════════════
  // FINANCIERO (comparte horarios con ADMINISTRATIVO)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-fin-am',
    name: 'AM',
    department: Department.FINANCIERO,
    startTime: '09:00',
    endTime: '13:00',
    color: COLORS.FINANCIERO,
  },
  {
    id: 'shift-fin-md',
    name: 'MD',
    department: Department.FINANCIERO,
    startTime: '14:00',
    endTime: '18:00',
    color: COLORS.FINANCIERO,
  },
  {
    id: 'shift-fin-pm',
    name: 'PM',
    department: Department.FINANCIERO,
    startTime: '18:00',
    endTime: '22:00',
    color: COLORS.FINANCIERO,
  },
  {
    id: 'shift-fin-libre',
    name: 'Libre',
    department: Department.FINANCIERO,
    startTime: '00:00',
    endTime: '24:00',
    color: COLORS.LIBRE,
  },

  // ═══════════════════════════════════════════════════════════════════
  // VENTAS (comparte horarios con ADMINISTRATIVO)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-vnt-am',
    name: 'AM',
    department: Department.VENTAS,
    startTime: '09:00',
    endTime: '13:00',
    color: COLORS.VENTAS,
  },
  {
    id: 'shift-vnt-md',
    name: 'MD',
    department: Department.VENTAS,
    startTime: '14:00',
    endTime: '18:00',
    color: COLORS.VENTAS,
  },
  {
    id: 'shift-vnt-pm',
    name: 'PM',
    department: Department.VENTAS,
    startTime: '18:00',
    endTime: '22:00',
    color: COLORS.VENTAS,
  },
  {
    id: 'shift-vnt-libre',
    name: 'Libre',
    department: Department.VENTAS,
    startTime: '00:00',
    endTime: '24:00',
    color: COLORS.LIBRE,
  },

  // ═══════════════════════════════════════════════════════════════════
  // MARKETING (comparte horarios con ADMINISTRATIVO)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-mkt-am',
    name: 'AM',
    department: Department.MARKETING,
    startTime: '09:00',
    endTime: '13:00',
    color: COLORS.MARKETING,
  },
  {
    id: 'shift-mkt-md',
    name: 'MD',
    department: Department.MARKETING,
    startTime: '14:00',
    endTime: '18:00',
    color: COLORS.MARKETING,
  },
  {
    id: 'shift-mkt-pm',
    name: 'PM',
    department: Department.MARKETING,
    startTime: '18:00',
    endTime: '22:00',
    color: COLORS.MARKETING,
  },
  {
    id: 'shift-mkt-libre',
    name: 'Libre',
    department: Department.MARKETING,
    startTime: '00:00',
    endTime: '24:00',
    color: COLORS.LIBRE,
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
    color: COLORS.DIVE_SHOP,
  },
  {
    id: 'shift-ds-am',
    name: 'AM',
    department: Department.DIVE_SHOP,
    startTime: '09:00',
    endTime: '13:00',
    color: COLORS.DIVE_SHOP,
  },
  {
    id: 'shift-ds-pm',
    name: 'PM',
    department: Department.DIVE_SHOP,
    startTime: '12:30',
    endTime: '20:30',
    color: COLORS.DIVE_SHOP,
  },
  {
    id: 'shift-ds-libre',
    name: 'Libre',
    department: Department.DIVE_SHOP,
    startTime: '00:00',
    endTime: '24:00',
    color: COLORS.LIBRE,
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
    color: COLORS.GUIANZA,
  },
  {
    id: 'shift-gz-norte-1',
    name: 'Guianza Norte 1',
    department: Department.GUIANZA,
    startTime: '06:00',
    endTime: '15:00',
    color: COLORS.GUIANZA,
  },
  {
    id: 'shift-gz-norte-2',
    name: 'Guianza Norte 2',
    department: Department.GUIANZA,
    startTime: '11:30',
    endTime: '18:30',
    color: COLORS.GUIANZA,
  },
  {
    id: 'shift-gz-norte-3',
    name: 'Guianza Norte 3',
    department: Department.GUIANZA,
    startTime: '12:30',
    endTime: '20:30',
    color: COLORS.GUIANZA,
  },
  {
    id: 'shift-gz-libre',
    name: 'Libre',
    department: Department.GUIANZA,
    startTime: '00:00',
    endTime: '24:00',
    color: COLORS.LIBRE,
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
    color: COLORS.MOVILIDAD,
  },
  {
    id: 'shift-mv-pax-a',
    name: 'Norte Pax Ida A',
    department: Department.MOVILIDAD,
    startTime: '07:00',
    endTime: '08:00',
    color: COLORS.MOVILIDAD,
  },
  {
    id: 'shift-mv-pax-b',
    name: 'Norte Pax Ida B',
    department: Department.MOVILIDAD,
    startTime: '09:30',
    endTime: '10:30',
    color: COLORS.MOVILIDAD,
  },
  {
    id: 'shift-mv-pax-c',
    name: 'Norte Pax Ida C',
    department: Department.MOVILIDAD,
    startTime: '12:30',
    endTime: '13:30',
    color: COLORS.MOVILIDAD,
  },
  {
    id: 'shift-mv-libre',
    name: 'Libre',
    department: Department.MOVILIDAD,
    startTime: '00:00',
    endTime: '24:00',
    color: COLORS.LIBRE,
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
    color: COLORS.VESSELS,
  },
  {
    id: 'shift-vs-md-norte',
    name: 'MD Norte',
    department: Department.VESSELS,
    startTime: '11:30',
    endTime: '18:30',
    color: COLORS.VESSELS,
  },
  {
    id: 'shift-vs-pm-norte',
    name: 'PM Norte',
    department: Department.VESSELS,
    startTime: '12:30',
    endTime: '20:30',
    color: COLORS.VESSELS,
  },
  {
    id: 'shift-vs-libre',
    name: 'Libre',
    department: Department.VESSELS,
    startTime: '00:00',
    endTime: '24:00',
    color: COLORS.LIBRE,
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
    color: COLORS.WAREHOUSE,
  },
  {
    id: 'shift-wh-pm1',
    name: 'PM 1',
    department: Department.WAREHOUSE,
    startTime: '15:00',
    endTime: '19:00',
    color: COLORS.WAREHOUSE,
  },
  {
    id: 'shift-wh-pm2',
    name: 'PM 2',
    department: Department.WAREHOUSE,
    startTime: '18:00',
    endTime: '21:00',
    color: COLORS.WAREHOUSE,
  },
  {
    id: 'shift-wh-libre',
    name: 'Libre',
    department: Department.WAREHOUSE,
    startTime: '00:00',
    endTime: '24:00',
    color: COLORS.LIBRE,
  },

  // ═══════════════════════════════════════════════════════════════════
  // COCINA (se mantiene igual)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'shift-ck-manana',
    name: 'Mañana',
    department: Department.COCINA,
    startTime: '08:00',
    endTime: '12:00',
    color: COLORS.COCINA,
  },
  {
    id: 'shift-ck-tarde',
    name: 'Tarde',
    department: Department.COCINA,
    startTime: '12:00',
    endTime: '16:00',
    color: COLORS.COCINA,
  },
  {
    id: 'shift-ck-noche',
    name: 'Noche',
    department: Department.COCINA,
    startTime: '16:00',
    endTime: '20:00',
    color: COLORS.COCINA,
  },
  {
    id: 'shift-ck-libre',
    name: 'Libre',
    department: Department.COCINA,
    startTime: '00:00',
    endTime: '24:00',
    color: COLORS.LIBRE,
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
