import { useMemo } from "react";
import { useFirestoreDepartments } from "./useFirestoreDepartments";

export function useDynamicDepartments() {
  const { departments, loading } = useFirestoreDepartments();
  const departmentNames = useMemo(() => departments.map((d: any) => d.name), [departments]);
  const defaultDepartment = useMemo(() => departmentNames[0] || "OPERACIONES", [departmentNames]);
  return { departments, departmentNames, defaultDepartment, loading };
}

export default useDynamicDepartments;
