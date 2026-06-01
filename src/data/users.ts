import { User, Department, Role } from '@/types';

// Usuarios sincronizados con Firebase Auth
export const users: User[] = [
  {
    id: 'director@waveops.com',
    name: 'Andres Bonilla',
    email: 'director@waveops.com',
    role: Role.DIRECTOR_GENERAL,
    department: Department.ADMINISTRATIVO,
    position: 'Director General',
    level: 1,
    isActive: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=director',
  },
  {
    id: 'gerente@waveops.com',
    name: 'Carmen Vargas',
    email: 'gerente@waveops.com',
    role: Role.GERENTE_OPERACIONES,
    department: Department.DIVE_SHOP,
    position: 'Gerente de Operaciones',
    level: 4,
    isActive: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gerente',
  },
  {
    id: 'gerente2@waveops.com',
    name: 'Pedro Mendoza',
    email: 'gerente2@waveops.com',
    role: Role.GERENTE_DEPARTAMENTO,
    department: Department.COCINA,
    position: 'Chef Ejecutivo',
    level: 5,
    isActive: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gerente2',
  },
  {
    id: 'supervisor@waveops.com',
    name: 'Jorge Ramirez',
    email: 'supervisor@waveops.com',
    role: Role.SUPERVISOR,
    department: Department.DIVE_SHOP,
    position: 'Supervisor de Dive Shop',
    level: 6,
    isActive: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=supervisor',
  },
  {
    id: 'buzo1@waveops.com',
    name: 'Carlos Mendez',
    email: 'buzo1@waveops.com',
    role: Role.STAFF,
    department: Department.DIVE_SHOP,
    position: 'Buzo',
    level: 7,
    isActive: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=buzo1',
  },
  {
    id: 'buzo2@waveops.com',
    name: 'Maria Gonzalez',
    email: 'buzo2@waveops.com',
    role: Role.STAFF,
    department: Department.DIVE_SHOP,
    position: 'Buzo',
    level: 7,
    isActive: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=buzo2',
  },
  {
    id: 'guia@waveops.com',
    name: 'Fernando Diaz',
    email: 'guia@waveops.com',
    role: Role.STAFF,
    department: Department.GUIANZA,
    position: 'Guia Naturalista',
    level: 7,
    isActive: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guia',
  },
  {
    id: 'cocinero@waveops.com',
    name: 'Antonio Ruiz',
    email: 'cocinero@waveops.com',
    role: Role.STAFF,
    department: Department.COCINA,
    position: 'Cocinero',
    level: 7,
    isActive: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cocinero',
  },
  {
    id: 'chofer@waveops.com',
    name: 'Luis Torres',
    email: 'chofer@waveops.com',
    role: Role.STAFF,
    department: Department.MOVILIDAD,
    position: 'Chofer',
    level: 7,
    isActive: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chofer',
  },
  {
    id: 'rrhh@waveops.com',
    name: 'Roberto Silva',
    email: 'rrhh@waveops.com',
    role: Role.RRHH,
    department: Department.ADMINISTRATIVO,
    position: 'RRHH',
    level: 3,
    isActive: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rrhh',
  },
];

export const getUserByEmail = (email: string): User | undefined => {
  return users.find(u => u.email === email);
};

export const getUsersByDepartment = (department: Department): User[] => {
  return users.filter(user => user.department === department && user.isActive);
};

export const getUsersByRole = (role: Role): User[] => {
  return users.filter(user => user.role === role && user.isActive);
};

export const getUsersByLevel = (level: number): User[] => {
  return users.filter(user => user.level === level && user.isActive);
};

export const getActiveUsers = (): User[] => {
  return users.filter(user => user.isActive);
};
