// ═══════════════════════════════════════════════════════════════════
// TIPOS GALAPAGOS TASKS - V1.0.0.0
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════

export enum Department {
  ADMINISTRATIVO = 'ADMINISTRATIVO',
  FINANCIERO = 'FINANCIERO',
  VENTAS = 'VENTAS',
  MARKETING = 'MARKETING',
  DIVE_SHOP = 'DIVE_SHOP',
  GUIANZA = 'GUIANZA',
  COCINA = 'COCINA',
  MOVILIDAD = 'MOVILIDAD',
  WAREHOUSE = 'WAREHOUSE',
  VESSELS = 'VESSELS',
}

export enum Role {
  DIRECTOR_GENERAL = 'DIRECTOR_GENERAL',      // Nivel 1
  DIRECTOR = 'DIRECTOR',                      // Nivel 2
  RRHH = 'RRHH',                              // Nivel 3
  GERENTE_OPERACIONES = 'GERENTE_OPERACIONES', // Nivel 4
  GERENTE_DEPARTAMENTO = 'GERENTE_DEPARTAMENTO', // Nivel 5
  SUPERVISOR = 'SUPERVISOR',                  // Nivel 6
  STAFF = 'STAFF',                            // Nivel 7
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
  BLOCKED = 'BLOCKED',
  OVERDUE = 'OVERDUE',
}

export enum TaskPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum IncidenciaStatus {
  NEW = 'NEW',
  OPEN = 'OPEN',
  VERIFIED = 'VERIFIED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
}

export enum TimeFilter {
  PAST_WEEKS = 'PAST_WEEKS',
  YESTERDAY = 'YESTERDAY',
  TODAY = 'TODAY',
  TOMORROW = 'TOMORROW',
  UPCOMING = 'UPCOMING',
}

export enum TaskType {
  SPECIFIC = 'SPECIFIC',
  EXTRA = 'EXTRA',
}

export enum TaskRecurrence {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

// ═══════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Para usuarios de prueba
  role: Role;
  department: Department;
  position: string;
  level: number; // 1-7
  isActive: boolean;
  avatar?: string;
  phone?: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  completedBy?: string; // userId
  completedAt?: string; // ISO date
}

export interface TaskHistory {
  id: string;
  action: string;
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;
  performedBy: string; // userId
  performedAt: string; // ISO date
  note?: string;
}

export interface Note {
  id: string;
  content: string;
  createdBy: string; // userId
  createdAt: string; // ISO date
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  createdBy: string; // userId
  assignedTo: string[]; // userIds
  supervisorId?: string; // userId
  department: Department;
  dueDate: string; // ISO date YYYY-MM-DD
  dueTime?: string; // HH:MM - hora límite calculada
  startTime?: string; // HH:MM
  estimatedMinutes?: number;
  requiresPhoto: boolean;
  photos: string[];
  subtasks: Subtask[];
  history: TaskHistory[];
  notes: Note[];
  createdAt: string; // ISO date
  completedAt?: string; // ISO date
  verifiedAt?: string; // ISO date
  verifiedBy?: string; // userId
  rating?: 'good' | 'bad';
  ratingNote?: string;
  blockedReason?: string;
  blockedAt?: string; // ISO date
  blockedBy?: string; // userId
  shiftIds?: string[]; // IDs de turnos asignados
  supportUserIds?: string[]; // IDs de usuarios de apoyo
  recurrence?: TaskRecurrence; // Periodicidad para tareas específicas
}

export interface Incidencia {
  id: string;
  title: string;
  description: string;
  status: IncidenciaStatus;
  priority: TaskPriority;
  reportedBy: string; // userId
  reportedFor?: string; // userId (opcional)
  targetDepartment: Department;
  confirmedBy?: string; // userId
  confirmedAt?: string; // ISO date
  resolvedBy?: string; // userId
  resolvedAt?: string; // ISO date
  closedBy?: string; // userId
  closedAt?: string; // ISO date
  reopenedBy?: string; // userId
  reopenedAt?: string; // ISO date
  reopenReason?: string;
  notes: Note[];
  history: TaskHistory[];
  createdAt: string; // ISO date
}

export interface Shift {
  id: string;
  name: string;
  department: Department;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  color?: string; // hex color
  requirements?: ShiftRequirement[]; // Roles necesarios para el turno
}

export interface ShiftRequirement {
  role: Role;
  count: number; // Cantidad de personas necesarias con ese rol
}

export interface ShiftAssignment {
  id: string;
  shiftId: string;
  userId: string;
  role: string; // Rol del usuario en este turno (ej: SUPERVISOR, STAFF)
  date: string; // YYYY-MM-DD
}

// ═══════════════════════════════════════════════════════════════════
// TIPOS AUXILIARES
// ═══════════════════════════════════════════════════════════════════

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  department?: Department;
  assignedTo?: string;
  timeFilter?: TimeFilter;
  search?: string;
}

export interface IncidenciaFilters {
  status?: IncidenciaStatus;
  priority?: TaskPriority;
  department?: Department;
  timeFilter?: TimeFilter;
}

export interface TaskCounts {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  verified: number;
  blocked: number;
  overdue: number;
}

export interface IncidenciaCounts {
  total: number;
  new: number;
  open: number;
  verified: number;
  resolved: number;
  closed: number;
  reopened: number;
}

// ═══════════════════════════════════════════════════════════════════
// PERMISOS
// ═══════════════════════════════════════════════════════════════════

export type Permission = 
  // Dashboard
  | 'canViewDashboard'
  | 'canViewModuleTasks'
  | 'canViewModuleHorarios'
  | 'canViewModuleDiveOps'
  | 'canViewModuleVessels'
  | 'canViewModuleMovilidad'
  | 'canViewModuleRequisiciones'
  | 'canViewModuleOrdenesPago'
  | 'canViewModuleReportes'
  | 'canViewModuleDevelops'
  // Tasks
  | 'canCreateSpecificTask'
  | 'canCreateExtraTask'
  | 'canEditAllTasks'
  | 'canEditOwnTasks'
  | 'canDeleteAllTasks'
  | 'canDeleteOwnTasks'
  | 'canVerifyTask'
  | 'canRateTask'
  | 'canBlockTask'
  | 'canUnblockTask'
  | 'canViewAllDepartments'
  | 'canViewOwnDepartment'
  | 'canReopenTask'
  // Horarios
  | 'canViewTeam'
  | 'canAssignShifts'
  | 'canModifyShifts'
  | 'canApproveChanges'
  | 'canRejectChanges'
  | 'canRequestChange'
  // Incidencias
  | 'canCreateIncidencia'
  | 'canViewAllIncidencias'
  | 'canViewOperationalIncidencias'
  | 'canViewOwnDepartmentIncidencias'
  | 'canConfirmIncidenciaAsManager'
  | 'canConfirmIncidenciaAsSupervisor'
  | 'canResolveIncidencia'
  | 'canCloseIncidencia'
  | 'canReopenIncidencia';

// ═══════════════════════════════════════════════════════════════════
// CONTEXTOS
// ═══════════════════════════════════════════════════════════════════

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  hasPermission: (permission: Permission) => boolean;
}

export interface TasksContextType {
  tasks: Task[];
  incidencias: Incidencia[];
  isLoading: boolean;
  // Tasks
  getTasks: (filters?: TaskFilters) => Task[];
  getTaskById: (id: string) => Task | undefined;
  getTasksByUser: (userId: string) => Task[];
  getTasksByDepartment: (department: Department) => Task[];
  getTasksByStatus: (status: TaskStatus) => Task[];
  getOverdueTasks: () => Task[];
  createTask: (task: Partial<Task>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  changeTaskStatus: (id: string, status: TaskStatus, note?: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string, userId: string) => void;
  addNote: (taskId: string, content: string, userId: string) => void;
  addPhoto: (taskId: string, photo: string) => void;
  verifyTask: (id: string, userId: string) => void;
  rateTask: (id: string, rating: 'good' | 'bad', note: string, userId: string) => void;
  blockTask: (id: string, reason: string, userId: string) => void;
  unblockTask: (id: string, note: string, userId: string) => void;
  reopenTask: (id: string, userId: string) => void;
  // Incidencias
  getIncidencias: (filters?: IncidenciaFilters) => Incidencia[];
  createIncidencia: (incidencia: Partial<Incidencia>) => void;
  updateIncidencia: (id: string, updates: Partial<Incidencia>) => void;
  confirmIncidencia: (id: string, userId: string) => void;
  resolveIncidencia: (id: string, userId: string) => void;
  closeIncidencia: (id: string, userId: string) => void;
  reopenIncidencia: (id: string, userId: string) => void;
  addIncidenciaNote: (id: string, content: string, userId: string) => void;
  // Contadores
  getTaskCounts: () => TaskCounts;
  getIncidenciaCounts: () => IncidenciaCounts;
}

export interface ShiftsContextType {
  shifts: Shift[];
  assignments: ShiftAssignment[];
  isLoading: boolean;
  getShiftsByDepartment: (department: Department) => Shift[];
  getUserShifts: (userId: string, date: string) => Shift[];
  getDepartmentShifts: (department: Department, date: string) => ShiftAssignment[];
  getWeekAssignments: (department: Department, weekStart: Date) => ShiftAssignment[];
  assignShift: (userId: string, shiftId: string, date: string, assignedBy: string) => void;
  removeShift: (assignmentId: string) => void;
  getShiftById: (id: string) => Shift | undefined;
  getAssignmentById: (id: string) => ShiftAssignment | undefined;
}
