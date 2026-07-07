export interface Department {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  isActive: boolean;
  parentId: string | null;
  type: 'administrativo' | 'operativo' | 'otro';
  createdAt: string;
  updatedAt: string;
}

export type DepartmentFormData = Omit<Department, 'id' | 'createdAt' | 'updatedAt'>;
