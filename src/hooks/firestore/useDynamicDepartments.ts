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
  children?: DynamicDepartment[];
  createdAt?: string;
  updatedAt?: string;
}

// Devuelve todos los ids descendientes de un departamento (recursivo, N niveles)
function getDescendantIds(parentId: string | null | undefined, depts: DynamicDepartment[]): string[] {
  if (!parentId) return [];
  const direct = depts.filter(d => d.parentId === parentId).map(d => d.id);
  const indirect = direct.flatMap(childId => getDescendantIds(childId, depts));
  return Array.from(new Set([...direct, ...indirect]));
}

// Normaliza un código de departamento: mayúsculas, sin espacios/tab iniciales/finales y espacios → _
export function normalizeDeptCode(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, '_');
  if (DEPT_NAME_TO_CODE[cleaned]) return DEPT_NAME_TO_CODE[cleaned];
  return cleaned.toUpperCase();
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
        const code = normalizeDeptCode(data.code || name);
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

  // IDs de todos los descendientes de OPERACIONES (hijos, nietos, etc.)
  const operationsDescendantIds = useMemo(() => {
    return getDescendantIds(operationsDeptId, activeDepartments);
  }, [operationsDeptId, activeDepartments]);

  // Un departamento es "operacional" si:
  // - Su código es OPERACIONES (el departamento padre), o
  // - Está en el subárbol de OPERACIONES (hijos/nietos/etc.), o
  // - Legacy: tenía `isOperational: true` en Firestore (transición).
  const departmentsWithOperational = useMemo(() => {
    return departments.map(d => ({
      ...d,
      isOperational:
        d.code?.toUpperCase() === OPERATIONS_CODE ||
        operationsDescendantIds.includes(d.id) ||
        d.isOperational === true,
    }));
  }, [departments, operationsDescendantIds]);

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
    const dept = departments.find(d => d.code === code);
    if (!dept) return false;
    return dept.isActive !== false && (
      dept.code?.toUpperCase() === OPERATIONS_CODE ||
      operationsDescendantIds.includes(dept.id) ||
      dept.isOperational === true
    );
  }, [departments, operationsDescendantIds]);

  // Devuelve todos los códigos del subárbol de un departamento dado su código (incluido él mismo)
  const getDepartmentSubtreeCodes = useCallback((rootCode: string): string[] => {
    const root = activeDepartments.find(d => d.code === rootCode);
    if (!root) return [];
    const subtreeIds = [root.id, ...getDescendantIds(root.id, activeDepartments)];
    return Array.from(new Set(
      activeDepartments
        .filter(d => subtreeIds.includes(d.id))
        .map(d => d.code)
    ));
  }, [activeDepartments]);

  // Devuelve todos los códigos del subárbol de OPERACIONES (incluido él mismo)
  const getOperationalSubtreeCodes = useCallback((): string[] => {
    return getDepartmentSubtreeCodes(OPERATIONS_CODE);
  }, [getDepartmentSubtreeCodes]);

  // Departamentos que un usuario específico puede ver.
  // Regla jerárquica pura (sin overrides manuales):
  // - Roles con visión total (DG/Director/RRHH) ven todos los departamentos.
  // - Gerente de Operaciones ve OPERACIONES + todos sus descendientes.
  // - Cualquier otro usuario ve su propio departamento + todos sus descendientes (hijos, nietos, etc.).
  // - NO ve padres, abuelos ni hermanos.
  const getVisibleDepartmentCodes = useCallback((user: { role: string; department: string } | null): string[] => {
    if (!user) return [];

    const userDeptCode = normalizeDeptCode(user.department || '');

    // Si aún no cargan los departamentos, devolver al menos el propio departamento
    // del usuario normalizado para evitar parpadeos del selector.
    if (activeDepartments.length === 0) {
      return userDeptCode ? [userDeptCode] : [];
    }

    // Roles con visión total por defecto
    if (user.role === Role.DIRECTOR_GENERAL || user.role === Role.DIRECTOR || user.role === Role.RRHH) {
      return departmentCodes.length > 0 ? departmentCodes : (userDeptCode ? [userDeptCode] : []);
    }

    // Fallback explícito para Gerente de Operaciones: siempre ve el subárbol operacional
    if (user.role === Role.GERENTE_OPERACIONES) {
      const opsCode = getOperationalSubtreeCodes();
      if (opsCode.length > 0) return opsCode;
      // Fallback de última instancia: cualquier departamento marcado como operacional
      if (operationalDepartmentCodes.length > 0) return operationalDepartmentCodes;
    }

    // Encontrar el departamento del usuario por código o por nombre
    const userDept = activeDepartments.find(d => d.code === userDeptCode || d.name === user.department);

    if (!userDept) {
      return [userDeptCode].filter(Boolean);
    }

    // Subárbol del departamento del usuario (él + descendientes)
    return getDepartmentSubtreeCodes(userDept.code);
  }, [departmentCodes, activeDepartments, operationalDepartmentCodes, getOperationalSubtreeCodes, getDepartmentSubtreeCodes]);

  const isProtectedDepartment = useCallback((code: string): boolean => {
    return code === OPERATIONS_CODE || code === ADMIN_CODE;
  }, []);

  // Árbol de departamentos para mostrar en UI (padres con sus hijos recursivamente)
  const departmentTree = useMemo(() => {
    const buildTree = (parentId: string | null, visited: Set<string> = new Set()): DynamicDepartment[] => {
      return activeDepartments
        .filter(d => d.parentId === parentId && !visited.has(d.id))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(d => {
          const nextVisited = new Set(visited);
          nextVisited.add(d.id);
          return { ...d, children: buildTree(d.id, nextVisited) };
        });
    };
    return buildTree(null);
  }, [activeDepartments]);

  // Opciones planas con nivel jerárquico para selects (ej: ── Hijo)
  const departmentTreeOptions = useMemo(() => {
    const flat: { code: string; name: string; level: number }[] = [];
    const walk = (nodes: DynamicDepartment[], level: number) => {
      nodes.forEach(node => {
        flat.push({ code: node.code, name: node.name, level });
        if (node.children && node.children.length > 0) {
          walk(node.children, level + 1);
        }
      });
    };
    walk(departmentTree, 0);
    return flat;
  }, [departmentTree]);

  return {
    departments: departmentsWithOperational,
    departmentCodes,
    departmentNames,
    departmentOptions,
    departmentTree,
    departmentTreeOptions,
    defaultDepartment,
    operationalDepartmentCodes,
    isOperationalDepartment,
    getVisibleDepartmentCodes,
    getDepartmentSubtreeCodes,
    getDeptName,
    getDeptCode,
    getDeptIcon,
    getDeptShortName,
    isProtectedDepartment,
    loading,
  };
}
