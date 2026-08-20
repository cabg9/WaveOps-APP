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
  type?: 'parent' | 'child';
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
          isOperational: data.isOperational === true,
          parentId: data.parentId || null,
          type: data.type,
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
    return activeDepartments.filter(d => d.isOperational).map(d => d.code);
  }, [activeDepartments]);

  const isOperationalDepartment = useCallback((code: string): boolean => {
    return operationalDepartmentCodes.includes(code);
  }, [operationalDepartmentCodes]);

  // Departamentos que un usuario específico puede ver además del propio.
  // Respeta roles: DG/Director/RRHH ven todos; Gerente de Operaciones ve operativos;
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

  return {
    departments,
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
    loading,
  };
}
