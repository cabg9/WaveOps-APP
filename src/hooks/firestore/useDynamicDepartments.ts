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
    const codes = activeDepartmentsWithOperational
      .filter(d => d.isOperational)
      .map(d => d.code);
    console.log('[useDynamicDepartments] operationalDepartmentCodes:', codes, 'operationsDeptId:', operationsDeptId, 'activeDepartmentsWithOperational:', activeDepartmentsWithOperational.map(d => ({ id: d.id, code: d.code, name: d.name, parentId: d.parentId, isOperational: d.isOperational })));
    return codes;
  }, [activeDepartmentsWithOperational, operationsDeptId]);

  const isOperationalDepartment = useCallback((code: string): boolean => {
    const dept = departments.find(d => d.code === code);
    if (!dept) return false;
    const opsDept = departments.find(d => d.code?.toUpperCase() === OPERATIONS_CODE && d.isActive !== false);
    return dept.isActive !== false && (
      dept.code?.toUpperCase() === OPERATIONS_CODE ||
      dept.parentId === opsDept?.id ||
      dept.isOperational === true
    );
  }, [departments]);

  // Departamentos que un usuario específico puede ver además del propio.
  // Respeta roles: DG/Director/RRHH ven todos; Gerente de Operaciones ve su departamento + hijos operacionales;
  // otros usuarios ven su departamento + visibleDepartments configurado manualmente.
  const getVisibleDepartmentCodes = useCallback((user: { role: string; department: string; visibleDepartments?: string[] } | null): string[] => {
    if (!user) return [];
    if (user.role === Role.DIRECTOR_GENERAL || user.role === Role.DIRECTOR || user.role === Role.RRHH) {
      return departmentCodes;
    }
    if (user.role === Role.GERENTE_OPERACIONES) {
      // Calcular directamente sobre departments para evitar race condition con operationalDepartmentCodes
      const opsDept = departments.find(d => d.code?.toUpperCase() === OPERATIONS_CODE && d.isActive !== false);
      const opsDeptId = opsDept?.id;
      const codes = departments
        .filter(d => d.isActive !== false)
        .filter(d => d.code?.toUpperCase() === OPERATIONS_CODE || d.parentId === opsDeptId || d.isOperational === true)
        .map(d => d.code);
      const unique = Array.from(new Set(codes));
      console.log('[useDynamicDepartments] Gerente de Operaciones - codes:', unique, 'opsDeptId:', opsDeptId, 'user.department:', user.department);
      return unique;
    }
    const extra = (user.visibleDepartments || []).filter(d => d && d !== user.department);
    return Array.from(new Set([user.department, ...extra].filter(Boolean)));
  }, [departmentCodes, departments]);

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
