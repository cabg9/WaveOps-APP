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
  /**
   * Configuración de compras del departamento. Ambos campos son booleanos
   * concretos en Firestore (el parser siempre devuelve true/false).
   * - canRequestPurchases: ausente o true = el departamento puede solicitar
   *   compras (default SÍ).
   * - managesPurchases: ausente o false = no gestiona compras (default NO);
   *   los gerentes y roles superiores de los departamentos con esta opción
   *   reciben y aprueban las solicitudes de compra de toda la empresa.
   */
  canRequestPurchases?: boolean;
  managesPurchases?: boolean;
}

export type DepartmentFormData = Omit<Department, 'id' | 'createdAt' | 'updatedAt'>;
