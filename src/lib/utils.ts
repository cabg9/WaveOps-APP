// ═══════════════════════════════════════════════════════════════════
// UTILIDADES - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format as dateFnsFormat, isSameDay as dateFnsIsSameDay, addDays as dateFnsAddDays, startOfWeek, endOfWeek, isPast, isToday, isTomorrow, parseISO as dateFnsParseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { TaskStatus, TaskPriority, IncidenciaStatus } from '@/types';

// Re-exportar funciones de date-fns
export const format = dateFnsFormat;
export const parseISO = dateFnsParseISO;
export const isSameDay = dateFnsIsSameDay;
export const addDays = dateFnsAddDays;

// ═══════════════════════════════════════════════════════════════════
// CLASES CSS
// ═══════════════════════════════════════════════════════════════════

/**
 * Combina clases de Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ═══════════════════════════════════════════════════════════════════
// FECHAS
// ═══════════════════════════════════════════════════════════════════

/**
 * Formatea una fecha completa
 * Ej: "Lunes, 25 de marzo de 2025"
 */
export function formatDate(date: string | Date | number): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
}

/**
 * Formatea una fecha corta
 * Ej: "25 mar"
 */
export function formatDateShort(date: string | Date | number): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(d, 'd MMM', { locale: es });
}

/**
 * Formatea una fecha completa corta
 * Ej: "25 de marzo"
 */
export function formatDateFull(date: string | Date | number): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(d, "d 'de' MMMM", { locale: es });
}

/**
 * Formatea una fecha para el calendario
 * Ej: "lun 25"
 */
export function formatCalendarDate(date: string | Date | number): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(d, 'EEE d', { locale: es });
}

/**
 * Formatea una hora
 * Ej: "09:00"
 */
export function formatTime(time: string): string {
  return time;
}

/**
 * Formatea fecha y hora
 * Ej: "25/03/2025 10:30"
 */
export function formatDateTime(date: string | Date | number): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(d, 'dd/MM/yyyy HH:mm', { locale: es });
}

/**
 * Formatea fecha y hora corta
 * Ej: "25/03 10:30"
 */
export function formatDateTimeShort(date: string | Date | number): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(d, 'dd/MM HH:mm', { locale: es });
}

/**
 * Formatea hora relativa
 * Ej: "Hace 2 horas"
 */
export function formatRelativeTime(date: string | Date | number): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Ahora';
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Hace ${diffInHours} h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Ayer';
  if (diffInDays < 7) return `Hace ${diffInDays} días`;
  
  return formatDateShort(d);
}

/**
 * Obtiene el rango de la semana (lunes a domingo)
 */
export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Lunes
  const end = endOfWeek(date, { weekStartsOn: 1 }); // Domingo
  return { start, end };
}

/**
 * Formatea el rango de semana
 * Ej: "25 marzo - 31 marzo"
 */
export function formatWeekRange(start: Date, end: Date): string {
  const startStr = format(start, "d MMMM", { locale: es });
  const endStr = format(end, "d MMMM", { locale: es });
  return `${startStr} - ${endStr}`;
}

/**
 * Verifica si una fecha está en el pasado
 */
export function isDatePast(date: string | Date | number): boolean {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return isPast(d) && !isToday(d);
}

/**
 * Verifica si una fecha es hoy
 */
export function isDateToday(date: string | Date | number): boolean {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return isToday(d);
}

/**
 * Verifica si una fecha es mañana
 */
export function isDateTomorrow(date: string | Date | number): boolean {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return isTomorrow(d);
}

/**
 * Agrega días a una fecha
 */
export function addDaysToDate(date: Date, days: number): Date {
  return addDays(date, days);
}

/**
 * Verifica si dos fechas son el mismo día
 */
export function areSameDay(date1: Date, date2: Date): boolean {
  return isSameDay(date1, date2);
}

// ═══════════════════════════════════════════════════════════════════
// TEXTOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtiene las iniciales de un nombre
 * Ej: "Andres Bonilla" → "AB"
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Trunca un texto a una longitud máxima
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Capitaliza la primera letra de un texto
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// ═══════════════════════════════════════════════════════════════════
// COLORES DE ESTADO
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtiene el color de un estado de tarea
 */
export function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: '#8E8E93',
    [TaskStatus.IN_PROGRESS]: '#007AFF',
    [TaskStatus.COMPLETED]: '#34C759',
    [TaskStatus.VERIFIED]: '#5856D6',
    [TaskStatus.BLOCKED]: '#FF9500',
    [TaskStatus.OVERDUE]: '#FF3B30',
  };
  return colors[status];
}

/**
 * Obtiene el color de fondo de un estado de tarea
 */
export function getStatusBgColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: 'bg-[#8E8E93]',
    [TaskStatus.IN_PROGRESS]: 'bg-[#007AFF]',
    [TaskStatus.COMPLETED]: 'bg-[#34C759]',
    [TaskStatus.VERIFIED]: 'bg-[#5856D6]',
    [TaskStatus.BLOCKED]: 'bg-[#FF9500]',
    [TaskStatus.OVERDUE]: 'bg-[#FF3B30]',
  };
  return colors[status];
}

/**
 * Obtiene la clase de texto de un estado de tarea
 */
export function getStatusTextColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: 'text-[#8E8E93]',
    [TaskStatus.IN_PROGRESS]: 'text-[#007AFF]',
    [TaskStatus.COMPLETED]: 'text-[#34C759]',
    [TaskStatus.VERIFIED]: 'text-[#5856D6]',
    [TaskStatus.BLOCKED]: 'text-[#FF9500]',
    [TaskStatus.OVERDUE]: 'text-[#FF3B30]',
  };
  return colors[status];
}

/**
 * Obtiene el color de un estado de incidencia
 */
export function getIncidenciaStatusColor(status: IncidenciaStatus): string {
  const colors: Record<IncidenciaStatus, string> = {
    [IncidenciaStatus.NEW]: '#FF3B30',
    [IncidenciaStatus.OPEN]: '#FF9500',
    [IncidenciaStatus.VERIFIED]: '#5856D6',
    [IncidenciaStatus.RESOLVED]: '#34C759',
    [IncidenciaStatus.CLOSED]: '#8E8E93',
    [IncidenciaStatus.REOPENED]: '#007AFF',
  };
  return colors[status];
}

/**
 * Obtiene el color de fondo de un estado de incidencia
 */
export function getIncidenciaStatusBgColor(status: IncidenciaStatus): string {
  const colors: Record<IncidenciaStatus, string> = {
    [IncidenciaStatus.NEW]: 'bg-[#FF3B30]',
    [IncidenciaStatus.OPEN]: 'bg-[#FF9500]',
    [IncidenciaStatus.VERIFIED]: 'bg-[#5856D6]',
    [IncidenciaStatus.RESOLVED]: 'bg-[#34C759]',
    [IncidenciaStatus.CLOSED]: 'bg-[#8E8E93]',
    [IncidenciaStatus.REOPENED]: 'bg-[#007AFF]',
  };
  return colors[status];
}

/**
 * Obtiene el color de una prioridad
 */
export function getPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    [TaskPriority.CRITICAL]: '#FF3B30',
    [TaskPriority.HIGH]: '#FF9500',
    [TaskPriority.MEDIUM]: '#FFCC00',
    [TaskPriority.LOW]: '#8E8E93',
  };
  return colors[priority];
}

/**
 * Obtiene el color de fondo de una prioridad
 */
export function getPriorityBgColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    [TaskPriority.CRITICAL]: 'bg-[#FF3B30]',
    [TaskPriority.HIGH]: 'bg-[#FF9500]',
    [TaskPriority.MEDIUM]: 'bg-[#FFCC00]',
    [TaskPriority.LOW]: 'bg-[#8E8E93]',
  };
  return colors[priority];
}

// ═══════════════════════════════════════════════════════════════════
// LABELS
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtiene el label de un estado de tarea
 */
export function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: 'Pendiente',
    [TaskStatus.IN_PROGRESS]: 'En Progreso',
    [TaskStatus.COMPLETED]: 'Completada',
    [TaskStatus.VERIFIED]: 'Verificada',
    [TaskStatus.BLOCKED]: 'Bloqueada',
    [TaskStatus.OVERDUE]: 'Atrasada',
  };
  return labels[status];
}

/**
 * Obtiene el label de un estado de incidencia
 */
export function getIncidenciaStatusLabel(status: IncidenciaStatus): string {
  const labels: Record<IncidenciaStatus, string> = {
    [IncidenciaStatus.NEW]: 'Nueva',
    [IncidenciaStatus.OPEN]: 'Abierta',
    [IncidenciaStatus.VERIFIED]: 'Verificada',
    [IncidenciaStatus.RESOLVED]: 'Resuelta',
    [IncidenciaStatus.CLOSED]: 'Cerrada',
    [IncidenciaStatus.REOPENED]: 'Reabierta',
  };
  return labels[status];
}

/**
 * Obtiene el label de una prioridad
 */
export function getPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    [TaskPriority.CRITICAL]: 'Crítica',
    [TaskPriority.HIGH]: 'Alta',
    [TaskPriority.MEDIUM]: 'Media',
    [TaskPriority.LOW]: 'Baja',
  };
  return labels[priority];
}

// ═══════════════════════════════════════════════════════════════════
// VALIDACIONES
// ═══════════════════════════════════════════════════════════════════

/**
 * Valida un email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida una contraseña (mínimo 6 caracteres)
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

/**
 * Verifica si una tarea está atrasada
 */
export function isTaskOverdue(dueDate: string, status: TaskStatus): boolean {
  if (status === TaskStatus.COMPLETED || status === TaskStatus.VERIFIED) {
    return false;
  }
  return isDatePast(dueDate);
}

// ═══════════════════════════════════════════════════════════════════
// GENERADORES DE ID
// ═══════════════════════════════════════════════════════════════════

/**
 * Genera un ID único
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════════
// ARRAYS
// ═══════════════════════════════════════════════════════════════════

/**
 * Agrupa un array por una clave
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Ordena un array por fecha
 */
export function sortByDate<T>(
  array: T[],
  dateKey: keyof T,
  order: 'asc' | 'desc' = 'desc'
): T[] {
  return [...array].sort((a, b) => {
    const dateA = new Date(a[dateKey] as string).getTime();
    const dateB = new Date(b[dateKey] as string).getTime();
    return order === 'asc' ? dateA - dateB : dateB - dateA;
  });
}
