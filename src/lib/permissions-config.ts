// ═══════════════════════════════════════════════════════════════════
// SISTEMA DE PERMISOS RBAC - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { User, Permission, Role, Department } from '@/types';

// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE PERMISOS POR NIVEL
// ═══════════════════════════════════════════════════════════════════

// Nivel 1: Director General - Acceso total
const LEVEL_1_PERMISSIONS: Permission[] = [
  // Dashboard
  'canViewDashboard',
  'canViewModuleTasks',
  'canViewModuleHorarios',
  'canViewModuleDiveOps',
  'canViewModuleVessels',
  'canViewModuleMovilidad',
  'canViewModuleRequisiciones',
  'canViewModuleOrdenesPago',
  'canViewModuleReportes',
  'canViewModuleDevelops',
  // Tasks
  'canCreateSpecificTask',
  'canCreateExtraTask',
  'canEditAllTasks',
  'canDeleteAllTasks',
  'canVerifyTask',
  'canRateTask',
  'canBlockTask',
  'canUnblockTask',
  'canViewAllDepartments',
  'canReopenTask',
  // Horarios
  'canViewTeam',
  'canAssignShifts',
  'canModifyShifts',
  'canApproveChanges',
  'canRejectChanges',
  'canRequestChange',
  // Incidencias
  'canCreateIncidencia',
  'canViewAllIncidencias',
  'canViewOperationalIncidencias',
  'canViewOwnDepartmentIncidencias',
  'canConfirmIncidenciaAsManager',
  'canResolveIncidencia',
  'canCloseIncidencia',
  'canReopenIncidencia',
];

// Nivel 2: Director - Casi todo, sin Develops
const LEVEL_2_PERMISSIONS: Permission[] = [
  // Dashboard
  'canViewDashboard',
  'canViewModuleTasks',
  'canViewModuleHorarios',
  'canViewModuleDiveOps',
  'canViewModuleVessels',
  'canViewModuleMovilidad',
  'canViewModuleRequisiciones',
  'canViewModuleOrdenesPago',
  'canViewModuleReportes',
  // Tasks
  'canCreateExtraTask',
  'canEditOwnTasks',
  'canDeleteOwnTasks',
  'canVerifyTask',
  'canRateTask',
  'canBlockTask',
  'canUnblockTask',
  'canViewAllDepartments',
  'canReopenTask',
  // Horarios
  'canViewTeam',
  'canAssignShifts',
  'canModifyShifts',
  'canApproveChanges',
  'canRejectChanges',
  'canRequestChange',
  // Incidencias
  'canCreateIncidencia',
  'canViewAllIncidencias',
  'canViewOperationalIncidencias',
  'canViewOwnDepartmentIncidencias',
  'canConfirmIncidenciaAsManager',
  'canResolveIncidencia',
  'canCloseIncidencia',
  'canReopenIncidencia',
];

// Nivel 3: RRHH - Gestión de personal, todo en Tasks
const LEVEL_3_PERMISSIONS: Permission[] = [
  // Dashboard
  'canViewDashboard',
  'canViewModuleTasks',
  'canViewModuleHorarios',
  'canViewModuleDiveOps',
  'canViewModuleVessels',
  'canViewModuleMovilidad',
  'canViewModuleRequisiciones',
  'canViewModuleOrdenesPago',
  'canViewModuleReportes',
  // Tasks
  'canCreateExtraTask',
  'canEditAllTasks',
  'canDeleteAllTasks',
  'canVerifyTask',
  'canRateTask',
  'canBlockTask',
  'canUnblockTask',
  'canViewAllDepartments',
  'canReopenTask',
  // Horarios
  'canViewTeam',
  'canAssignShifts',
  'canModifyShifts',
  'canApproveChanges',
  'canRejectChanges',
  'canRequestChange',
  // Incidencias
  'canCreateIncidencia',
  'canViewAllIncidencias',
  'canViewOperationalIncidencias',
  'canViewOwnDepartmentIncidencias',
  'canConfirmIncidenciaAsManager',
  'canResolveIncidencia',
  'canCloseIncidencia',
  'canReopenIncidencia',
];

// Nivel 4: Gerente Operaciones - Todo operativo
const LEVEL_4_PERMISSIONS: Permission[] = [
  // Dashboard
  'canViewDashboard',
  'canViewModuleTasks',
  'canViewModuleHorarios',
  'canViewModuleDiveOps',
  'canViewModuleVessels',
  'canViewModuleMovilidad',
  'canViewModuleRequisiciones',
  'canViewModuleOrdenesPago',
  'canViewModuleReportes',
  // Tasks
  'canCreateExtraTask',
  'canEditOwnTasks',
  'canDeleteOwnTasks',
  'canVerifyTask',
  'canRateTask',
  'canBlockTask',
  'canUnblockTask',
  'canViewAllDepartments',
  'canReopenTask',
  // Horarios
  'canViewTeam',
  'canAssignShifts',
  'canModifyShifts',
  'canApproveChanges',
  'canRejectChanges',
  'canRequestChange',
  // Incidencias
  'canCreateIncidencia',
  'canViewOperationalIncidencias',
  'canViewOwnDepartmentIncidencias',
  'canConfirmIncidenciaAsManager',
  'canResolveIncidencia',
  'canCloseIncidencia',
  'canReopenIncidencia',
];

// Nivel 5: Gerente Departamento - Su departamento
const LEVEL_5_PERMISSIONS: Permission[] = [
  // Dashboard
  'canViewDashboard',
  'canViewModuleTasks',
  'canViewModuleHorarios',
  'canViewModuleDiveOps',
  'canViewModuleVessels',
  'canViewModuleMovilidad',
  'canViewModuleRequisiciones',
  // Tasks
  'canCreateExtraTask',
  'canEditOwnTasks',
  'canDeleteOwnTasks',
  'canVerifyTask',
  'canRateTask',
  'canBlockTask',
  'canUnblockTask',
  'canViewOwnDepartment',
  'canReopenTask',
  // Horarios
  'canViewTeam',
  'canAssignShifts',
  'canModifyShifts',
  'canApproveChanges',
  'canRejectChanges',
  'canRequestChange',
  // Incidencias
  'canCreateIncidencia',
  'canViewOwnDepartmentIncidencias',
  'canConfirmIncidenciaAsManager',
  'canResolveIncidencia',
  'canCloseIncidencia',
  'canReopenIncidencia',
];

// Nivel 6: Supervisor - Su departamento, menos permisos
const LEVEL_6_PERMISSIONS: Permission[] = [
  // Dashboard
  'canViewDashboard',
  'canViewModuleTasks',
  'canViewModuleHorarios',
  'canViewModuleDiveOps',
  'canViewModuleVessels',
  'canViewModuleMovilidad',
  'canViewModuleRequisiciones',
  // Tasks
  'canCreateExtraTask',
  'canEditOwnTasks',
  'canDeleteOwnTasks',
  'canVerifyTask',
  'canRateTask',
  'canBlockTask',
  'canUnblockTask',
  'canViewOwnDepartment',
  'canReopenTask',
  // Horarios
  'canViewTeam',
  'canRequestChange',
  // Incidencias
  'canCreateIncidencia',
  'canViewOwnDepartmentIncidencias',
  'canConfirmIncidenciaAsSupervisor',
  'canResolveIncidencia',
  'canReopenIncidencia',
];

// Nivel 7: Staff - Solo operaciones básicas
const LEVEL_7_PERMISSIONS: Permission[] = [
  // Dashboard
  'canViewDashboard',
  'canViewModuleTasks',
  'canViewModuleHorarios',
  'canViewModuleDiveOps',
  'canViewModuleVessels',
  'canViewModuleMovilidad',
  // Tasks
  'canBlockTask',
  'canViewOwnDepartment',
  // Horarios
  'canRequestChange',
  // Incidencias
  'canCreateIncidencia',
  'canViewOwnDepartmentIncidencias',
];

// ═══════════════════════════════════════════════════════════════════
// MAPA DE PERMISOS POR NIVEL
// ═══════════════════════════════════════════════════════════════════

const PERMISSIONS_BY_LEVEL: Record<number, Permission[]> = {
  1: LEVEL_1_PERMISSIONS,
  2: LEVEL_2_PERMISSIONS,
  3: LEVEL_3_PERMISSIONS,
  4: LEVEL_4_PERMISSIONS,
  5: LEVEL_5_PERMISSIONS,
  6: LEVEL_6_PERMISSIONS,
  7: LEVEL_7_PERMISSIONS,
};

// ═══════════════════════════════════════════════════════════════════
// FUNCIONES PÚBLICAS
// ═══════════════════════════════════════════════════════════════════

/**
 * Verifica si un usuario tiene un permiso específico
 */
export const hasPermission = (user: User | null, permission: Permission): boolean => {
  if (!user) return false;
  const userPermissions = PERMISSIONS_BY_LEVEL[user.level] || [];
  return userPermissions.includes(permission);
};

/**
 * Obtiene todos los permisos de un usuario
 */
export const getUserPermissions = (user: User | null): Permission[] => {
  if (!user) return [];
  return PERMISSIONS_BY_LEVEL[user.level] || [];
};

/**
 * Obtiene los módulos visibles para un usuario
 */
export const getVisibleModules = (user: User | null): string[] => {
  if (!user) return [];
  
  const modules: string[] = ['dashboard'];
  
  if (hasPermission(user, 'canViewModuleTasks')) modules.push('tasks');
  if (hasPermission(user, 'canViewModuleHorarios')) modules.push('horarios');
  if (hasPermission(user, 'canViewModuleDiveOps')) modules.push('dive-ops');
  if (hasPermission(user, 'canViewModuleVessels')) modules.push('vessels');
  if (hasPermission(user, 'canViewModuleMovilidad')) modules.push('movilidad');
  if (hasPermission(user, 'canViewModuleRequisiciones')) modules.push('requisiciones');
  if (hasPermission(user, 'canViewModuleOrdenesPago')) modules.push('ordenes-pago');
  if (hasPermission(user, 'canViewModuleReportes')) modules.push('reportes');
  if (hasPermission(user, 'canViewModuleDevelops')) modules.push('develops');
  
  return modules;
};

/**
 * Verifica si un usuario puede ver todas las tareas de todos los departamentos
 */
export const canViewAllDepartments = (user: User | null): boolean => {
  return hasPermission(user, 'canViewAllDepartments');
};

/**
 * Verifica si un usuario puede ver solo su departamento
 */
export const canViewOwnDepartment = (user: User | null): boolean => {
  return hasPermission(user, 'canViewOwnDepartment');
};

/**
 * Obtiene el nivel de un rol
 */
export const getRoleLevel = (role: Role): number => {
  const roleLevels: Record<Role, number> = {
    [Role.DIRECTOR_GENERAL]: 1,
    [Role.DIRECTOR]: 2,
    [Role.RRHH]: 3,
    [Role.GERENTE_OPERACIONES]: 4,
    [Role.GERENTE_DEPARTAMENTO]: 5,
    [Role.SUPERVISOR]: 6,
    [Role.STAFF]: 7,
  };
  return roleLevels[role] || 7;
};

/**
 * Verifica si un usuario tiene nivel superior a otro
 */
export const isHigherLevel = (user1: User, user2: User): boolean => {
  return user1.level < user2.level;
};

/**
 * Verifica si un usuario es supervisor o superior de otro
 */
export const isSupervisorOf = (supervisor: User, subordinate: User): boolean => {
  // Mismo departamento y nivel superior
  if (supervisor.department !== subordinate.department) return false;
  return supervisor.level < subordinate.level;
};

/**
 * Verifica si un usuario puede gestionar una tarea específica
 */
export const canManageTask = (
  user: User | null,
  taskCreatorId: string,
  taskDepartment: Department
): boolean => {
  if (!user) return false;
  
  // Nivel 1 y 3 pueden editar todo
  if (hasPermission(user, 'canEditAllTasks')) return true;
  
  // Puede editar sus propias tareas
  if (hasPermission(user, 'canEditOwnTasks') && taskCreatorId === user.id) return true;
  
  // Gerente/Supervisor puede editar tareas de su departamento
  if (user.department === taskDepartment && user.level <= 6) return true;
  
  return false;
};

/**
 * Verifica si un usuario puede eliminar una tarea
 */
export const canDeleteTask = (
  user: User | null,
  taskCreatorId: string,
  taskDepartment: Department
): boolean => {
  if (!user) return false;
  
  // Nivel 1 y 3 pueden eliminar todo
  if (hasPermission(user, 'canDeleteAllTasks')) return true;
  
  // Puede eliminar sus propias tareas
  if (hasPermission(user, 'canDeleteOwnTasks') && taskCreatorId === user.id) return true;
  
  // Gerente puede eliminar tareas de su departamento
  if (user.department === taskDepartment && user.level === 5) return true;
  
  return false;
};

/**
 * Verifica si un usuario puede verificar una tarea
 */
export const canVerifyTask = (
  user: User | null,
  taskAssignees: string[],
  taskDepartment: Department
): boolean => {
  if (!user) return false;
  
  // Necesita permiso de verificación
  if (!hasPermission(user, 'canVerifyTask')) return false;
  
  // No puede verificar su propia tarea
  if (taskAssignees.includes(user.id)) return false;
  
  // Debe ser del mismo departamento o tener permiso de ver todos
  if (user.department !== taskDepartment && !canViewAllDepartments(user)) return false;
  
  return true;
};

/**
 * Verifica si un usuario puede asignar turnos
 */
export const canAssignShift = (
  user: User | null,
  targetDepartment: Department
): boolean => {
  if (!user) return false;
  
  if (!hasPermission(user, 'canAssignShifts')) return false;
  
  // Niveles 1-3 pueden asignar en cualquier departamento
  if (user.level <= 3) return true;
  
  // Niveles 4-5 solo en su departamento
  return user.department === targetDepartment;
};

/**
 * Obtiene el nombre legible de un permiso
 */
export const getPermissionLabel = (permission: Permission): string => {
  const labels: Record<Permission, string> = {
    // Dashboard
    'canViewDashboard': 'Ver Dashboard',
    'canViewModuleTasks': 'Ver Módulo Tasks',
    'canViewModuleHorarios': 'Ver Módulo Horarios',
    'canViewModuleDiveOps': 'Ver Módulo Dive Ops',
    'canViewModuleVessels': 'Ver Módulo Vessels',
    'canViewModuleMovilidad': 'Ver Módulo Movilidad',
    'canViewModuleRequisiciones': 'Ver Módulo Requisiciones',
    'canViewModuleOrdenesPago': 'Ver Módulo Órdenes de Pago',
    'canViewModuleReportes': 'Ver Módulo Reportes',
    'canViewModuleDevelops': 'Ver Módulo Develops',
    // Tasks
    'canCreateSpecificTask': 'Crear Tareas Específicas',
    'canCreateExtraTask': 'Crear Tareas Extra',
    'canEditAllTasks': 'Editar Todas las Tareas',
    'canEditOwnTasks': 'Editar Tareas Propias',
    'canDeleteAllTasks': 'Eliminar Todas las Tareas',
    'canDeleteOwnTasks': 'Eliminar Tareas Propias',
    'canVerifyTask': 'Verificar Tareas',
    'canRateTask': 'Calificar Tareas',
    'canBlockTask': 'Bloquear Tareas',
    'canUnblockTask': 'Desbloquear Tareas',
    'canViewAllDepartments': 'Ver Todos los Departamentos',
    'canViewOwnDepartment': 'Ver Propio Departamento',
    'canReopenTask': 'Reabrir Tareas',
    // Horarios
    'canViewTeam': 'Ver Equipo',
    'canAssignShifts': 'Asignar Turnos',
    'canModifyShifts': 'Modificar Turnos',
    'canApproveChanges': 'Aprobar Cambios',
    'canRejectChanges': 'Rechazar Cambios',
    'canRequestChange': 'Solicitar Cambios',
    // Incidencias
    'canCreateIncidencia': 'Crear Incidencias',
    'canViewAllIncidencias': 'Ver Todas las Incidencias',
    'canViewOperationalIncidencias': 'Ver Incidencias Operativas',
    'canViewOwnDepartmentIncidencias': 'Ver Incidencias del Departamento',
    'canConfirmIncidenciaAsManager': 'Confirmar Incidencias (Gerente)',
    'canConfirmIncidenciaAsSupervisor': 'Confirmar Incidencias (Supervisor)',
    'canResolveIncidencia': 'Resolver Incidencias',
    'canCloseIncidencia': 'Cerrar Incidencias',
    'canReopenIncidencia': 'Reabrir Incidencias',
  };
  return labels[permission] || permission;
};
