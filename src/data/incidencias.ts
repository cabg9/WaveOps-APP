// ═══════════════════════════════════════════════════════════════════
// DATOS DE INCIDENCIAS - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { Incidencia, IncidenciaStatus, TaskPriority, Department } from '@/types';

export const incidencias: Incidencia[] = [
  // ═══════════════════════════════════════════════════════════════════
  // NUEVAS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'inc-1',
    title: 'Fuga de agua en baño de recepción',
    description: 'Se detectó una fuga de agua en el baño de la recepción principal. Necesita reparación urgente.',
    status: IncidenciaStatus.NEW,
    priority: TaskPriority.HIGH,
    reportedBy: '16', // Carlos Mendez
    targetDepartment: Department.ADMINISTRATIVO,
    notes: [],
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
  },

  // ═══════════════════════════════════════════════════════════════════
  // ABIERTAS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'inc-2',
    title: 'Aire acondicionado no funciona',
    description: 'El aire acondicionado del área de equipos no está funcionando. La temperatura es muy alta.',
    status: IncidenciaStatus.OPEN,
    priority: TaskPriority.MEDIUM,
    reportedBy: '17', // Maria Gonzalez
    targetDepartment: Department.WAREHOUSE,
    notes: [
      { id: 'n-inc-2-1', content: 'Ya se contactó al técnico', createdBy: '14', createdAt: new Date(Date.now() - 7200000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 día atrás
  },

  // ═══════════════════════════════════════════════════════════════════
  // VERIFICADAS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'inc-3',
    title: 'Equipo de snorkel dañado',
    description: 'Se encontraron 3 máscaras de snorkel rotas en el inventario.',
    status: IncidenciaStatus.VERIFIED,
    priority: TaskPriority.HIGH,
    reportedBy: '20', // Fernando Diaz
    targetDepartment: Department.WAREHOUSE,
    confirmedBy: '14', // Ricardo Ortega
    confirmedAt: new Date(Date.now() - 43200000).toISOString(), // 12 horas atrás
    notes: [
      { id: 'n-inc-3-1', content: 'Confirmado, necesitamos reponer', createdBy: '14', createdAt: new Date(Date.now() - 43200000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },

  // ═══════════════════════════════════════════════════════════════════
  // RESUELTAS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'inc-4',
    title: 'Falta de agua potable',
    description: 'Se agotó el agua potable en la embarcación secundaria.',
    status: IncidenciaStatus.RESOLVED,
    priority: TaskPriority.CRITICAL,
    reportedBy: '36', // Zacarias Leon
    targetDepartment: Department.VESSELS,
    confirmedBy: '15', // Ana Beltran
    confirmedAt: new Date(Date.now() - 172800000).toISOString(),
    resolvedBy: '38', // Bruno Valdez
    resolvedAt: new Date(Date.now() - 86400000).toISOString(),
    notes: [
      { id: 'n-inc-4-1', content: 'Ya reabastecimos el agua', createdBy: '38', createdAt: new Date(Date.now() - 86400000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },

  // ═══════════════════════════════════════════════════════════════════
  // CERRADAS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'inc-5',
    title: 'Luz quemada en área de tanques',
    description: 'Una de las luces del área de llenado de tanques está quemada.',
    status: IncidenciaStatus.CLOSED,
    priority: TaskPriority.LOW,
    reportedBy: '18', // Luis Chavez
    targetDepartment: Department.WAREHOUSE,
    confirmedBy: '14', // Ricardo Ortega
    confirmedAt: new Date(Date.now() - 345600000).toISOString(),
    resolvedBy: '34', // Xavier Paredes
    resolvedAt: new Date(Date.now() - 259200000).toISOString(),
    closedBy: '14',
    closedAt: new Date(Date.now() - 172800000).toISOString(),
    notes: [
      { id: 'n-inc-5-1', content: 'Luz reemplazada', createdBy: '34', createdAt: new Date(Date.now() - 259200000).toISOString() },
      { id: 'n-inc-5-2', content: 'Verificado y cerrado', createdBy: '14', createdAt: new Date(Date.now() - 172800000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 432000000).toISOString(),
  },

  // ═══════════════════════════════════════════════════════════════════
  // REABIERTAS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'inc-6',
    title: 'Problema con generador eléctrico',
    description: 'El generador eléctrico de respaldo presenta fallas intermitentes.',
    status: IncidenciaStatus.REOPENED,
    priority: TaskPriority.CRITICAL,
    reportedBy: '32', // Victor Campos
    targetDepartment: Department.ADMINISTRATIVO,
    confirmedBy: '10', // Jorge Ramirez
    confirmedAt: new Date(Date.now() - 604800000).toISOString(),
    resolvedBy: '34', // Xavier Paredes
    resolvedAt: new Date(Date.now() - 432000000).toISOString(),
    closedBy: '10',
    closedAt: new Date(Date.now() - 345600000).toISOString(),
    notes: [
      { id: 'n-inc-6-1', content: 'Se reparó el generador', createdBy: '34', createdAt: new Date(Date.now() - 432000000).toISOString() },
      { id: 'n-inc-6-2', content: 'Volvió a fallar, necesita reparación más profunda', createdBy: '32', createdAt: new Date(Date.now() - 86400000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 691200000).toISOString(),
  },

  // Más incidencias...
  {
    id: 'inc-7',
    title: 'Ruido extraño en compresor',
    description: 'El compresor principal está haciendo un ruido extraño al encender.',
    status: IncidenciaStatus.NEW,
    priority: TaskPriority.HIGH,
    reportedBy: '16', // Carlos Mendez
    targetDepartment: Department.DIVE_SHOP,
    notes: [],
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'inc-8',
    title: 'Silla rota en sala de espera',
    description: 'Una de las sillas de la sala de espera está rota y puede ser peligrosa.',
    status: IncidenciaStatus.OPEN,
    priority: TaskPriority.LOW,
    reportedBy: '21', // Isabel Reyes
    targetDepartment: Department.ADMINISTRATIVO,
    notes: [],
    createdAt: new Date(Date.now() - 129600000).toISOString(),
  },
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

export const getIncidenciasByStatus = (status: IncidenciaStatus): Incidencia[] => {
  return incidencias.filter(inc => inc.status === status);
};

export const getIncidenciasByDepartment = (department: Department): Incidencia[] => {
  return incidencias.filter(inc => inc.targetDepartment === department);
};

export const getIncidenciaById = (id: string): Incidencia | undefined => {
  return incidencias.find(inc => inc.id === id);
};

export const getIncidenciaCounts = () => {
  return {
    total: incidencias.length,
    new: incidencias.filter(i => i.status === IncidenciaStatus.NEW).length,
    open: incidencias.filter(i => i.status === IncidenciaStatus.OPEN).length,
    verified: incidencias.filter(i => i.status === IncidenciaStatus.VERIFIED).length,
    resolved: incidencias.filter(i => i.status === IncidenciaStatus.RESOLVED).length,
    closed: incidencias.filter(i => i.status === IncidenciaStatus.CLOSED).length,
    reopened: incidencias.filter(i => i.status === IncidenciaStatus.REOPENED).length,
  };
};
