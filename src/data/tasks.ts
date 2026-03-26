// ═══════════════════════════════════════════════════════════════════
// DATOS DE TAREAS - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { Task, TaskStatus, TaskPriority, TaskType, Department } from '@/types';

export const tasks: Task[] = [
  // ═══════════════════════════════════════════════════════════════════
  // TAREAS EN PROGRESO
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'task-1',
    title: 'Preparar equipos de buceo para salida AM',
    description: 'Revisar y preparar todos los equipos de buceo necesarios para la salida de la mañana. Incluye tanques, reguladores, chalecos y computadoras.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    type: TaskType.SPECIFIC,
    createdBy: '5', // Pedro Mendoza (Gerente Dive Shop)
    assignedTo: ['16', '17'], // Carlos y Maria (Buzos)
    supervisorId: '10', // Jorge Ramirez (Supervisor)
    department: Department.DIVE_SHOP,
    dueDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    estimatedMinutes: 60,
    requiresPhoto: true,
    photos: [],
    subtasks: [
      { id: 'st-1-1', title: 'Revisar tanques de aire', completed: true, completedBy: '16', completedAt: new Date().toISOString() },
      { id: 'st-1-2', title: 'Verificar reguladores', completed: false },
      { id: 'st-1-3', title: 'Preparar chalecos', completed: false },
    ],
    history: [
      { id: 'h-1-1', action: 'Tarea creada', performedBy: '5', performedAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'h-1-2', action: 'Marcada como En Progreso', fromStatus: TaskStatus.PENDING, toStatus: TaskStatus.IN_PROGRESS, performedBy: '16', performedAt: new Date().toISOString() },
    ],
    notes: [
      { id: 'n-1-1', content: 'Los tanques están listos, necesito ayuda con los reguladores', createdBy: '16', createdAt: new Date().toISOString() },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'task-2',
    title: 'Limpieza de área común',
    description: 'Realizar limpieza completa del área común incluyendo recepción, sala de espera y baños.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    type: TaskType.EXTRA,
    createdBy: '7', // Antonio Ruiz (Gerente Cocina)
    assignedTo: ['24'], // Hugo Cruz (Cocinero)
    supervisorId: '12', // Miguel Aguilar (Supervisor)
    department: Department.COCINA,
    dueDate: new Date().toISOString().split('T')[0],
    estimatedMinutes: 45,
    requiresPhoto: false,
    photos: [],
    subtasks: [],
    history: [
      { id: 'h-2-1', action: 'Tarea creada', performedBy: '7', performedAt: new Date(Date.now() - 43200000).toISOString() },
      { id: 'h-2-2', action: 'Marcada como En Progreso', fromStatus: TaskStatus.PENDING, toStatus: TaskStatus.IN_PROGRESS, performedBy: '24', performedAt: new Date(Date.now() - 3600000).toISOString() },
    ],
    notes: [],
    createdAt: new Date(Date.now() - 43200000).toISOString(),
  },

  // ═══════════════════════════════════════════════════════════════════
  // TAREAS PENDIENTES
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'task-3',
    title: 'Revisar mantenimiento de vehículos',
    description: 'Realizar revisión de mantenimiento preventivo de todos los vehículos de la flota. Verificar aceite, frenos y neumáticos.',
    status: TaskStatus.PENDING,
    priority: TaskPriority.CRITICAL,
    type: TaskType.SPECIFIC,
    createdBy: '8', // Diana Castro (Gerente Movilidad)
    assignedTo: ['28', '29'], // Oscar y Raquel (Conductores)
    supervisorId: '13', // Patricia Luna (Supervisor)
    department: Department.MOVILIDAD,
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    startTime: '09:00',
    estimatedMinutes: 120,
    requiresPhoto: true,
    photos: [],
    subtasks: [
      { id: 'st-3-1', title: 'Revisar niveles de aceite', completed: false },
      { id: 'st-3-2', title: 'Verificar estado de frenos', completed: false },
      { id: 'st-3-3', title: 'Inspeccionar neumáticos', completed: false },
      { id: 'st-3-4', title: 'Documentar hallazgos', completed: false },
    ],
    history: [
      { id: 'h-3-1', action: 'Tarea creada', performedBy: '8', performedAt: new Date().toISOString() },
    ],
    notes: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-4',
    title: 'Inventario de equipo de snorkel',
    description: 'Realizar inventario completo del equipo de snorkel disponible. Registrar mascaras, snorkels y aletas.',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    type: TaskType.EXTRA,
    createdBy: '9', // Eduardo Flores (Gerente Warehouse)
    assignedTo: ['32'], // Victor Campos (Técnico)
    supervisorId: '14', // Ricardo Ortega (Supervisor)
    department: Department.WAREHOUSE,
    dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    estimatedMinutes: 90,
    requiresPhoto: false,
    photos: [],
    subtasks: [],
    history: [
      { id: 'h-4-1', action: 'Tarea creada', performedBy: '9', performedAt: new Date(Date.now() - 86400000).toISOString() },
    ],
    notes: [
      { id: 'n-4-1', content: 'Necesito acceso al almacén principal', createdBy: '32', createdAt: new Date().toISOString() },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'task-5',
    title: 'Preparar briefing para turistas',
    description: 'Preparar y revisar el material de briefing para los turistas del grupo de mañana. Incluye seguridad y rutas.',
    status: TaskStatus.PENDING,
    priority: TaskPriority.HIGH,
    type: TaskType.SPECIFIC,
    createdBy: '6', // Lucia Herrera (Gerente Guianza)
    assignedTo: ['20', '21'], // Fernando e Isabel (Guias)
    supervisorId: '11', // Sofia Morales (Supervisor)
    department: Department.GUIANZA,
    dueDate: new Date().toISOString().split('T')[0],
    startTime: '07:30',
    estimatedMinutes: 30,
    requiresPhoto: false,
    photos: [],
    subtasks: [
      { id: 'st-5-1', title: 'Revisar rutas del día', completed: false },
      { id: 'st-5-2', title: 'Preparar material de seguridad', completed: false },
    ],
    history: [
      { id: 'h-5-1', action: 'Tarea creada', performedBy: '6', performedAt: new Date(Date.now() - 172800000).toISOString() },
    ],
    notes: [],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },

  // ═══════════════════════════════════════════════════════════════════
  // TAREAS COMPLETADAS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'task-6',
    title: 'Limpieza de embarcación principal',
    description: 'Realizar limpieza completa de la embarcación principal después de la salida del día.',
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.HIGH,
    type: TaskType.SPECIFIC,
    createdBy: '15', // Ana Beltran (Supervisor Vessels)
    assignedTo: ['36', '37'], // Zacarias y Adriana (Marineros)
    supervisorId: '15',
    department: Department.VESSELS,
    dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    estimatedMinutes: 90,
    requiresPhoto: true,
    photos: ['https://example.com/photo1.jpg'],
    subtasks: [
      { id: 'st-6-1', title: 'Lavar cubierta', completed: true, completedBy: '36', completedAt: new Date(Date.now() - 90000000).toISOString() },
      { id: 'st-6-2', title: 'Limpiar cabinas', completed: true, completedBy: '37', completedAt: new Date(Date.now() - 88000000).toISOString() },
      { id: 'st-6-3', title: 'Revisar equipos de seguridad', completed: true, completedBy: '36', completedAt: new Date(Date.now() - 86000000).toISOString() },
    ],
    history: [
      { id: 'h-6-1', action: 'Tarea creada', performedBy: '15', performedAt: new Date(Date.now() - 172800000).toISOString() },
      { id: 'h-6-2', action: 'Marcada como En Progreso', fromStatus: TaskStatus.PENDING, toStatus: TaskStatus.IN_PROGRESS, performedBy: '36', performedAt: new Date(Date.now() - 100800000).toISOString() },
      { id: 'h-6-3', action: 'Marcada como Completada', fromStatus: TaskStatus.IN_PROGRESS, toStatus: TaskStatus.COMPLETED, performedBy: '36', performedAt: new Date(Date.now() - 84000000).toISOString() },
    ],
    notes: [
      { id: 'n-6-1', content: 'Todo listo para mañana', createdBy: '36', createdAt: new Date(Date.now() - 84000000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    completedAt: new Date(Date.now() - 84000000).toISOString(),
  },
  {
    id: 'task-7',
    title: 'Preparar almuerzo para equipo',
    description: 'Preparar el almuerzo para todo el equipo de operaciones.',
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.MEDIUM,
    type: TaskType.EXTRA,
    createdBy: '7', // Antonio Ruiz
    assignedTo: ['25', '26'], // Julia y Alberto (Cocineros)
    supervisorId: '12', // Miguel Aguilar
    department: Department.COCINA,
    dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    estimatedMinutes: 120,
    requiresPhoto: false,
    photos: [],
    subtasks: [],
    history: [
      { id: 'h-7-1', action: 'Tarea creada', performedBy: '7', performedAt: new Date(Date.now() - 172800000).toISOString() },
      { id: 'h-7-2', action: 'Marcada como En Progreso', fromStatus: TaskStatus.PENDING, toStatus: TaskStatus.IN_PROGRESS, performedBy: '25', performedAt: new Date(Date.now() - 100800000).toISOString() },
      { id: 'h-7-3', action: 'Marcada como Completada', fromStatus: TaskStatus.IN_PROGRESS, toStatus: TaskStatus.COMPLETED, performedBy: '25', performedAt: new Date(Date.now() - 72000000).toISOString() },
    ],
    notes: [],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    completedAt: new Date(Date.now() - 72000000).toISOString(),
  },

  // ═══════════════════════════════════════════════════════════════════
  // TAREAS VERIFICADAS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'task-8',
    title: 'Inspección de seguridad pre-salida',
    description: 'Realizar inspección completa de seguridad antes de la salida de buceo.',
    status: TaskStatus.VERIFIED,
    priority: TaskPriority.CRITICAL,
    type: TaskType.SPECIFIC,
    createdBy: '4', // Carmen Vargas (Gerente Operaciones)
    assignedTo: ['10'], // Jorge Ramirez (Supervisor)
    supervisorId: '5', // Pedro Mendoza
    department: Department.DIVE_SHOP,
    dueDate: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    estimatedMinutes: 30,
    requiresPhoto: true,
    photos: ['https://example.com/safety1.jpg', 'https://example.com/safety2.jpg'],
    subtasks: [
      { id: 'st-8-1', title: 'Verificar equipos de emergencia', completed: true, completedBy: '10', completedAt: new Date(Date.now() - 180000000).toISOString() },
      { id: 'st-8-2', title: 'Revisar radio de comunicación', completed: true, completedBy: '10', completedAt: new Date(Date.now() - 179000000).toISOString() },
      { id: 'st-8-3', title: 'Confirmar botiquín completo', completed: true, completedBy: '10', completedAt: new Date(Date.now() - 178000000).toISOString() },
    ],
    history: [
      { id: 'h-8-1', action: 'Tarea creada', performedBy: '4', performedAt: new Date(Date.now() - 259200000).toISOString() },
      { id: 'h-8-2', action: 'Marcada como En Progreso', fromStatus: TaskStatus.PENDING, toStatus: TaskStatus.IN_PROGRESS, performedBy: '10', performedAt: new Date(Date.now() - 200000000).toISOString() },
      { id: 'h-8-3', action: 'Marcada como Completada', fromStatus: TaskStatus.IN_PROGRESS, toStatus: TaskStatus.COMPLETED, performedBy: '10', performedAt: new Date(Date.now() - 176000000).toISOString() },
      { id: 'h-8-4', action: 'Verificada', fromStatus: TaskStatus.COMPLETED, toStatus: TaskStatus.VERIFIED, performedBy: '5', performedAt: new Date(Date.now() - 172800000).toISOString() },
    ],
    notes: [
      { id: 'n-8-1', content: 'Todo en orden, listos para salir', createdBy: '10', createdAt: new Date(Date.now() - 176000000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    completedAt: new Date(Date.now() - 176000000).toISOString(),
    verifiedAt: new Date(Date.now() - 172800000).toISOString(),
    verifiedBy: '5',
    rating: 'good',
  },

  // ═══════════════════════════════════════════════════════════════════
  // TAREAS BLOQUEADAS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'task-9',
    title: 'Reparar compresor de aire',
    description: 'Reparar el compresor de aire del dive shop que presenta fallas.',
    status: TaskStatus.BLOCKED,
    priority: TaskPriority.CRITICAL,
    type: TaskType.EXTRA,
    createdBy: '5', // Pedro Mendoza
    assignedTo: ['32'], // Victor Campos
    supervisorId: '10', // Jorge Ramirez
    department: Department.DIVE_SHOP,
    dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    estimatedMinutes: 180,
    requiresPhoto: false,
    photos: [],
    subtasks: [],
    history: [
      { id: 'h-9-1', action: 'Tarea creada', performedBy: '5', performedAt: new Date(Date.now() - 259200000).toISOString() },
      { id: 'h-9-2', action: 'Marcada como En Progreso', fromStatus: TaskStatus.PENDING, toStatus: TaskStatus.IN_PROGRESS, performedBy: '32', performedAt: new Date(Date.now() - 200000000).toISOString() },
      { id: 'h-9-3', action: 'Marcada como Bloqueada', fromStatus: TaskStatus.IN_PROGRESS, toStatus: TaskStatus.BLOCKED, performedBy: '32', performedAt: new Date(Date.now() - 180000000).toISOString() },
    ],
    notes: [
      { id: 'n-9-1', content: 'Necesitamos la pieza de repuesto que está en orden', createdBy: '32', createdAt: new Date(Date.now() - 180000000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    blockedReason: 'Esperando pieza de repuesto',
    blockedAt: new Date(Date.now() - 180000000).toISOString(),
    blockedBy: '32',
  },

  // ═══════════════════════════════════════════════════════════════════
  // TAREAS ATRASADAS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'task-10',
    title: 'Actualizar inventario de equipos',
    description: 'Actualizar el inventario completo de equipos de buceo en el sistema.',
    status: TaskStatus.OVERDUE,
    priority: TaskPriority.HIGH,
    type: TaskType.SPECIFIC,
    createdBy: '9', // Eduardo Flores
    assignedTo: ['33'], // Wendy Miranda
    supervisorId: '14', // Ricardo Ortega
    department: Department.WAREHOUSE,
    dueDate: new Date(Date.now() - 172800000).toISOString().split('T')[0], // 2 días atrás
    estimatedMinutes: 240,
    requiresPhoto: false,
    photos: [],
    subtasks: [
      { id: 'st-10-1', title: 'Contar reguladores', completed: false },
      { id: 'st-10-2', title: 'Contar chalecos', completed: false },
      { id: 'st-10-3', title: 'Contar computadoras', completed: false },
      { id: 'st-10-4', title: 'Actualizar sistema', completed: false },
    ],
    history: [
      { id: 'h-10-1', action: 'Tarea creada', performedBy: '9', performedAt: new Date(Date.now() - 432000000).toISOString() },
      { id: 'h-10-2', action: 'Tarea marcada como Atrasada automáticamente', performedBy: 'system', performedAt: new Date(Date.now() - 86400000).toISOString() },
    ],
    notes: [
      { id: 'n-10-1', content: 'Necesito más tiempo para completar esto', createdBy: '33', createdAt: new Date(Date.now() - 86400000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 432000000).toISOString(),
  },

  // Más tareas de ejemplo...
  {
    id: 'task-11',
    title: 'Capacitación de seguridad',
    description: 'Asistir a la capacitación de seguridad mensual.',
    status: TaskStatus.PENDING,
    priority: TaskPriority.HIGH,
    type: TaskType.SPECIFIC,
    createdBy: '3', // Roberto Silva (RRHH)
    assignedTo: ['16', '17', '18', '19', '20', '21'], // Varios staff
    supervisorId: '3',
    department: Department.DIVE_SHOP,
    dueDate: new Date(Date.now() + 604800000).toISOString().split('T')[0], // Próxima semana
    startTime: '14:00',
    estimatedMinutes: 120,
    requiresPhoto: false,
    photos: [],
    subtasks: [],
    history: [
      { id: 'h-11-1', action: 'Tarea creada', performedBy: '3', performedAt: new Date().toISOString() },
    ],
    notes: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-12',
    title: 'Mantenimiento de motores',
    description: 'Realizar mantenimiento preventivo de los motores de las embarcaciones.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.CRITICAL,
    type: TaskType.SPECIFIC,
    createdBy: '15', // Ana Beltran
    assignedTo: ['38', '39'], // Bruno y Cecilia
    supervisorId: '15',
    department: Department.VESSELS,
    dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    estimatedMinutes: 300,
    requiresPhoto: true,
    photos: [],
    subtasks: [
      { id: 'st-12-1', title: 'Cambiar aceite motor principal', completed: true, completedBy: '38', completedAt: new Date().toISOString() },
      { id: 'st-12-2', title: 'Revisar filtros', completed: false },
      { id: 'st-12-3', title: 'Verificar sistema de refrigeración', completed: false },
    ],
    history: [
      { id: 'h-12-1', action: 'Tarea creada', performedBy: '15', performedAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'h-12-2', action: 'Marcada como En Progreso', fromStatus: TaskStatus.PENDING, toStatus: TaskStatus.IN_PROGRESS, performedBy: '38', performedAt: new Date().toISOString() },
    ],
    notes: [],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

export const getTasksByStatus = (status: TaskStatus): Task[] => {
  return tasks.filter(task => task.status === status);
};

export const getTasksByUser = (userId: string): Task[] => {
  return tasks.filter(task => task.assignedTo.includes(userId));
};

export const getTasksByDepartment = (department: Department): Task[] => {
  return tasks.filter(task => task.department === department);
};

export const getTaskById = (id: string): Task | undefined => {
  return tasks.find(task => task.id === id);
};

export const getOverdueTasks = (): Task[] => {
  return tasks.filter(task => task.status === TaskStatus.OVERDUE);
};

export const getTaskCounts = () => {
  return {
    total: tasks.length,
    pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
    inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
    verified: tasks.filter(t => t.status === TaskStatus.VERIFIED).length,
    blocked: tasks.filter(t => t.status === TaskStatus.BLOCKED).length,
    overdue: tasks.filter(t => t.status === TaskStatus.OVERDUE).length,
  };
};
