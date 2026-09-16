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
   * Módulos adicionales para los usuarios de este departamento (ids de
   * appModules). Semántica ADITIVA: se SUMAN a los módulos que el rol ya
   * permite; NUNCA quitan visibilidad. Ausente o vacío = sin módulos extra
   * (el menú queda definido solo por el rol). Los extras solo se agregan si
   * el módulo sigue visible globalmente (isVisible, feature flag y estado);
   * el permiso del rol no se exige para ellos.
   */
  visibleModuleIds?: string[];
}

export type DepartmentFormData = Omit<Department, 'id' | 'createdAt' | 'updatedAt'>;
