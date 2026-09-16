export interface Department {
  code: string;
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  isActive: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * Módulos visibles para los usuarios de este departamento (ids de appModules).
   * Campo aditivo: ausente o vacío = sin restricción (ven todos los módulos,
   * comportamiento actual). Solo cuando el admin guarda una selección concreta,
   * el menú del departamento se limita a esos módulos (filtro visual que se
   * aplica después de flags/permisos; el rol sigue definiendo qué puede hacer).
   */
  visibleModuleIds?: string[];
}

export type DepartmentFormData = Omit<Department, 'id' | 'createdAt' | 'updatedAt'>;
