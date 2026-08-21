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
}

export type DepartmentFormData = Omit<Department, 'id' | 'createdAt' | 'updatedAt'>;
