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

// NOTA: Los turnos ahora se gestionan 100% desde Firestore.
// Usa el hook useFirestoreShifts() para obtenerlos.
