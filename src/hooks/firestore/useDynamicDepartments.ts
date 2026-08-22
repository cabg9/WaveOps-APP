import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase-config';
import { Role } from '@/types';

// Mapeo de fallback: nombre legible → código del enum (para compatibilidad con datos existentes)
const DEPT_NAME_TO_CODE: Record<string, string> = {
  'Administrativo': 'ADMINISTRATIVO',
  'Financiero': 'FINANCIERO',
  'Ventas': 'VENTAS',
  'Marketing': 'MARKETING',
  'Dive Shop': 'DIVE_SHOP',
  'Guiado de Buceo': 'GUIANZA',
  'Cocina': 'COCINA',
  'Movilidad': 'MOVILIDAD',
  'Warehouse': 'WAREHOUSE',
  'Vessels': 'VESSELS',
};

const OPERATIONS_CODE = 'OPERACIONES';
const ADMIN_CODE = 'ADMINISTRATIVO';

export interface DynamicDepartment {
  id: string;
  name: string;
  code: string;
  icon: string;
  shortName: string;
  order: number;
  isActive: boolean;
  isOperational?: boolean;
  parentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function normalizeDeptCode(name: string): string {
  if (DEPT_NAME_TO_CODE[name]) return DEPT_NAME_TO_CODE[name];
  return name.toUpperCase().replace(/ /g, '_');
}

export function useDynamicDepartments() {
  const [departments, setDepartments] = useState<DynamicDepartment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sin orderBy para incluir TODOS los documentos (incluso sin campo 'order')
    const q = query(collection(db, 'departments'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const depts: DynamicDepartment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const name = data.name || doc.id;
        const code = data.code || normalizeDeptCode(name);
        depts.push({
          id: doc.id,
          name,
          code,
          icon: data.icon || 'Building2',
          shortName: data.shortName || name,
          order: data.order ?? 999,
          isActive: data.isActive !== false,
          parentId: data.parentId || null,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      depts.sort((a, b) => a.order - b.order);
      setDepartments(depts);
      setLoading(false);
    }, (error) => {
      console.error('Error loading departments:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const activeDepartments = departments.filter(d => d.isActive);

  const departmentCodes = activeDepartments.map(d => d.code);
  const departmentNames = activeDepartments.map(d => d.name);
  const departmentOptions = activeDepartments.map(d => ({ code: d.code, name: d.name }));
  const defaultDepartment = departmentNames[0] || '';

  const operationsDept = useMemo(() => {
    return activeDepartments.find(d => d.code?.toUpperCase() === OPERATIONS_CODE);
  }, [activeDepartments]);

  const operationsDeptId = operationsDept?.id;

  // A partir de ahora un departamento es "operacional" si:
  // - Su código es OPERACIONES (el departamento padre), o
  // - Su parentId apunta al departamento OPERACIONES.
  // - Legacy: tenía `isOperational: true` en Firestore (transición).
  // Esto reemplaza el campo manual `isOperational`.
  const departmentsWithOperational = useMemo(() => {
    return departments.map(d => ({
      ...d,
      isOperational:
        d.code?.toUpperCase() === OPERATIONS_CODE ||
        d.parentId === operationsDeptId ||
        d.isOperational === true,
    }));
  }, [departments, operationsDeptId]);

  const activeDepartmentsWithOperational = departmentsWithOperational.filter(d => d.isActive);

  const getDeptName = (code: string): string => {
    const dept = departments.find(d => d.code === code);
    return dept?.name || code;
  };

  const getDeptCode = (name: string): string => {
    const dept = departments.find(d => d.name === name);
    return dept?.code || normalizeDeptCode(name);
  };

  const getDeptIcon = (code: string): string => {
    const dept = departments.find(d => d.code === code);
    return dept?.icon || 'Building2';
  };

  const getDeptShortName = (code: string): string => {
    const dept = departments.find(d => d.code === code);
    return dept?.shortName || dept?.name || code;
  };

  const operationalDepartmentCodes = useMemo(() => {
    return activeDepartmentsWithOperational
      .filter(d => d.isOperational)
      .map(d => d.code);
  }, [activeDepartmentsWithOperational]);

  const isOperationalDepartment = useCallback((code: string): boolean => {
    return operationalDepartmentCodes.includes(code);
  }, [operationalDepartmentCodes]);

  // Departamentos que un usuario específico puede ver además del propio.
  // Respeta roles: DG/Director/RRHH ven todos; Gerente de Operaciones ve su departamento + hijos operacionales;
  // otros usuarios ven su departamento + visibleDepartments configurado manualmente.
  const getVisibleDepartmentCodes = useCallback((user: { role: string; department: string; visibleDepartments?: string[] } | null): string[] => {
    if (!user) return [];
    if (user.role === Role.DIRECTOR_GENERAL || user.role === Role.DIRECTOR || user.role === Role.RRHH) {
      return departmentCodes;
    }
    if (user.role === Role.GERENTE_OPERACIONES) {
      return operationalDepartmentCodes;
    }
    const extra = (user.visibleDepartments || []).filter(d => d && d !== user.department);
    return Array.from(new Set([user.department, ...extra].filter(Boolean)));
  }, [departmentCodes, operationalDepartmentCodes]);

  const isProtectedDepartment = useCallback((code: string): boolean => {
    return code === OPERATIONS_CODE || code === ADMIN_CODE;
  }, []);

  return {
    departments: departmentsWithOperational,
    departmentCodes,
    departmentNames,
    departmentOptions,
    defaultDepartment,
    operationalDepartmentCodes,
    isOperationalDepartment,
    getVisibleDepartmentCodes,
    getDeptName,
    getDeptCode,
    getDeptIcon,
    getDeptShortName,
    isProtectedDepartment,
    loading,
  };
}
