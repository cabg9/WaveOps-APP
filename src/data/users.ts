// ═══════════════════════════════════════════════════════════════════
// DATOS DE USUARIOS - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { User, Department, Role } from '@/types';

export const users: User[] = [
  // ═══════════════════════════════════════════════════════════════════
  // NIVEL 1 - DIRECTOR GENERAL (1 usuario)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '1',
    name: 'Andres Bonilla',
    email: 'andres.bonilla@galapagosdiveandsurf.com',
    role: Role.DIRECTOR_GENERAL,
    department: Department.ADMINISTRATIVO,
    position: 'Director General',
    level: 1,
    isActive: true,
  },

  // ═══════════════════════════════════════════════════════════════════
  // NIVEL 2 - DIRECTOR (1 usuario)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2',
    name: 'Mariana Torres',
    email: 'mariana.torres@galapagosdiveandsurf.com',
    role: Role.DIRECTOR,
    department: Department.FINANCIERO,
    position: 'Directora Financiera',
    level: 2,
    isActive: true,
  },

  // ═══════════════════════════════════════════════════════════════════
  // NIVEL 3 - RRHH (1 usuario)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3',
    name: 'Roberto Silva',
    email: 'roberto.silva@galapagosdiveandsurf.com',
    role: Role.RRHH,
    department: Department.ADMINISTRATIVO,
    position: 'Jefe de RRHH',
    level: 3,
    isActive: true,
  },

  // ═══════════════════════════════════════════════════════════════════
  // NIVEL 4 - GERENTE OPERACIONES (1 usuario)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '4',
    name: 'Carmen Vargas',
    email: 'carmen.vargas@galapagosdiveandsurf.com',
    role: Role.GERENTE_OPERACIONES,
    department: Department.DIVE_SHOP,
    position: 'Gerente de Operaciones',
    level: 4,
    isActive: true,
  },

  // ═══════════════════════════════════════════════════════════════════
  // NIVEL 5 - GERENTES DE DEPARTAMENTO (5 usuarios)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '5',
    name: 'Pedro Mendoza',
    email: 'pedro.mendoza@galapagosdiveandsurf.com',
    role: Role.GERENTE_DEPARTAMENTO,
    department: Department.DIVE_SHOP,
    position: 'Gerente de Dive Shop',
    level: 5,
    isActive: true,
  },
  {
    id: '6',
    name: 'Lucia Herrera',
    email: 'lucia.herrera@galapagosdiveandsurf.com',
    role: Role.GERENTE_DEPARTAMENTO,
    department: Department.GUIANZA,
    position: 'Gerente de Guianza',
    level: 5,
    isActive: true,
  },
  {
    id: '7',
    name: 'Antonio Ruiz',
    email: 'antonio.ruiz@galapagosdiveandsurf.com',
    role: Role.GERENTE_DEPARTAMENTO,
    department: Department.COCINA,
    position: 'Gerente de Cocina',
    level: 5,
    isActive: true,
  },
  {
    id: '8',
    name: 'Diana Castro',
    email: 'diana.castro@galapagosdiveandsurf.com',
    role: Role.GERENTE_DEPARTAMENTO,
    department: Department.MOVILIDAD,
    position: 'Gerente de Movilidad',
    level: 5,
    isActive: true,
  },
  {
    id: '9',
    name: 'Eduardo Flores',
    email: 'eduardo.flores@galapagosdiveandsurf.com',
    role: Role.GERENTE_DEPARTAMENTO,
    department: Department.WAREHOUSE,
    position: 'Gerente de Warehouse',
    level: 5,
    isActive: true,
  },

  // ═══════════════════════════════════════════════════════════════════
  // NIVEL 6 - SUPERVISORES (6 usuarios)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '10',
    name: 'Jorge Ramirez',
    email: 'jorge.ramirez@galapagosdiveandsurf.com',
    role: Role.SUPERVISOR,
    department: Department.DIVE_SHOP,
    position: 'Supervisor de Dive Shop',
    level: 6,
    isActive: true,
  },
  {
    id: '11',
    name: 'Sofia Morales',
    email: 'sofia.morales@galapagosdiveandsurf.com',
    role: Role.SUPERVISOR,
    department: Department.GUIANZA,
    position: 'Supervisor de Guianza',
    level: 6,
    isActive: true,
  },
  {
    id: '12',
    name: 'Miguel Aguilar',
    email: 'miguel.aguilar@galapagosdiveandsurf.com',
    role: Role.SUPERVISOR,
    department: Department.COCINA,
    position: 'Supervisor de Cocina',
    level: 6,
    isActive: true,
  },
  {
    id: '13',
    name: 'Patricia Luna',
    email: 'patricia.luna@galapagosdiveandsurf.com',
    role: Role.SUPERVISOR,
    department: Department.MOVILIDAD,
    position: 'Supervisor de Movilidad',
    level: 6,
    isActive: true,
  },
  {
    id: '14',
    name: 'Ricardo Ortega',
    email: 'ricardo.ortega@galapagosdiveandsurf.com',
    role: Role.SUPERVISOR,
    department: Department.WAREHOUSE,
    position: 'Supervisor de Warehouse',
    level: 6,
    isActive: true,
  },
  {
    id: '15',
    name: 'Ana Beltran',
    email: 'ana.beltran@galapagosdiveandsurf.com',
    role: Role.SUPERVISOR,
    department: Department.VESSELS,
    position: 'Supervisor de Vessels',
    level: 6,
    isActive: true,
  },

  // ═══════════════════════════════════════════════════════════════════
  // NIVEL 7 - STAFF (24 usuarios)
  // ═══════════════════════════════════════════════════════════════════
  
  // DIVE SHOP - Buzos (4)
  {
    id: '16',
    name: 'Carlos Mendez',
    email: 'carlos.mendez@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.DIVE_SHOP,
    position: 'Buzo',
    level: 7,
    isActive: true,
  },
  {
    id: '17',
    name: 'Maria Gonzalez',
    email: 'maria.gonzalez@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.DIVE_SHOP,
    position: 'Buzo',
    level: 7,
    isActive: true,
  },
  {
    id: '18',
    name: 'Luis Chavez',
    email: 'luis.chavez@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.DIVE_SHOP,
    position: 'Buzo',
    level: 7,
    isActive: true,
  },
  {
    id: '19',
    name: 'Elena Rojas',
    email: 'elena.rojas@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.DIVE_SHOP,
    position: 'Buzo',
    level: 7,
    isActive: true,
  },

  // GUIANZA - Guias (4)
  {
    id: '20',
    name: 'Fernando Diaz',
    email: 'fernando.diaz@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.GUIANZA,
    position: 'Guía',
    level: 7,
    isActive: true,
  },
  {
    id: '21',
    name: 'Isabel Reyes',
    email: 'isabel.reyes@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.GUIANZA,
    position: 'Guía',
    level: 7,
    isActive: true,
  },
  {
    id: '22',
    name: 'Diego Soto',
    email: 'diego.soto@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.GUIANZA,
    position: 'Guía',
    level: 7,
    isActive: true,
  },
  {
    id: '23',
    name: 'Gabriela Pena',
    email: 'gabriela.pena@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.GUIANZA,
    position: 'Guía',
    level: 7,
    isActive: true,
  },

  // COCINA - Cocineros (4)
  {
    id: '24',
    name: 'Hugo Cruz',
    email: 'hugo.cruz@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.COCINA,
    position: 'Cocinero',
    level: 7,
    isActive: true,
  },
  {
    id: '25',
    name: 'Julia Medina',
    email: 'julia.medina@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.COCINA,
    position: 'Cocinero',
    level: 7,
    isActive: true,
  },
  {
    id: '26',
    name: 'Alberto Guzman',
    email: 'alberto.guzman@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.COCINA,
    position: 'Cocinero',
    level: 7,
    isActive: true,
  },
  {
    id: '27',
    name: 'Natalia Espinoza',
    email: 'natalia.espinoza@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.COCINA,
    position: 'Cocinero',
    level: 7,
    isActive: true,
  },

  // MOVILIDAD - Conductores (4)
  {
    id: '28',
    name: 'Oscar Vega',
    email: 'oscar.vega@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.MOVILIDAD,
    position: 'Conductor',
    level: 7,
    isActive: true,
  },
  {
    id: '29',
    name: 'Raquel Bravo',
    email: 'raquel.bravo@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.MOVILIDAD,
    position: 'Conductor',
    level: 7,
    isActive: true,
  },
  {
    id: '30',
    name: 'Sergio Fuentes',
    email: 'sergio.fuentes@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.MOVILIDAD,
    position: 'Conductor',
    level: 7,
    isActive: true,
  },
  {
    id: '31',
    name: 'Tania Ibarra',
    email: 'tania.ibarra@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.MOVILIDAD,
    position: 'Conductor',
    level: 7,
    isActive: true,
  },

  // WAREHOUSE - Tecnicos (4)
  {
    id: '32',
    name: 'Victor Campos',
    email: 'victor.campos@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.WAREHOUSE,
    position: 'Técnico',
    level: 7,
    isActive: true,
  },
  {
    id: '33',
    name: 'Wendy Miranda',
    email: 'wendy.miranda@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.WAREHOUSE,
    position: 'Técnico',
    level: 7,
    isActive: true,
  },
  {
    id: '34',
    name: 'Xavier Paredes',
    email: 'xavier.paredes@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.WAREHOUSE,
    position: 'Técnico',
    level: 7,
    isActive: true,
  },
  {
    id: '35',
    name: 'Yolanda Salazar',
    email: 'yolanda.salazar@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.WAREHOUSE,
    position: 'Técnico',
    level: 7,
    isActive: true,
  },

  // VESSELS - Marineros (4)
  {
    id: '36',
    name: 'Zacarias Leon',
    email: 'zacarias.leon@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.VESSELS,
    position: 'Marinero',
    level: 7,
    isActive: true,
  },
  {
    id: '37',
    name: 'Adriana Serrano',
    email: 'adriana.serrano@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.VESSELS,
    position: 'Marinero',
    level: 7,
    isActive: true,
  },
  {
    id: '38',
    name: 'Bruno Valdez',
    email: 'bruno.valdez@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.VESSELS,
    position: 'Marinero',
    level: 7,
    isActive: true,
  },
  {
    id: '39',
    name: 'Cecilia Arias',
    email: 'cecilia.arias@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.VESSELS,
    position: 'Marinero',
    level: 7,
    isActive: true,
  },

  // ═══════════════════════════════════════════════════════════════════
  // USUARIOS INACTIVOS (1)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '40',
    name: 'Daniel Navarro',
    email: 'daniel.navarro@galapagosdiveandsurf.com',
    role: Role.STAFF,
    department: Department.VENTAS,
    position: 'Vendedor',
    level: 7,
    isActive: false,
  },
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

export const getUserById = (id: string): User | undefined => {
  return users.find(user => user.id === id);
};

export const getUserByEmail = (email: string): User | undefined => {
  return users.find(user => user.email.toLowerCase() === email.toLowerCase());
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
