import { useState, useCallback, useMemo, useEffect, ReactNode } from "react";
import {
  Pencil, Trash2, Plus, Building2, X, GitBranch,
  Shield, Crown, HardHat, Users, Briefcase, Save, UserCog,
  LayoutTemplate, Clock, ChevronRight, ChevronDown, CircleDot, Network
} from "lucide-react";
import { useFirestoreDepartments } from "@/hooks/firestore/useFirestoreDepartments";
import { useFirestoreUsers } from "@/hooks/firestore/useFirestoreUsers";
import { useFirestoreShifts } from "@/hooks/firestore/useFirestoreShifts";
import { useFirestorePositions } from "@/hooks/firestore/useFirestorePositions";
import { useSpecificTaskTemplates, CreateSpecificTaskTemplateData } from "@/hooks/firestore/useSpecificTaskTemplates";
import { useDynamicDepartments, normalizeDeptCode } from "@/hooks/firestore/useDynamicDepartments";
import { useAuth } from "@/hooks/useFirestoreAuth";
import { useAudit } from "@/hooks/useAudit";
import { executeWithConfirm } from "@/lib/confirm-action";
import { CORPORATE_COLORS } from "@/lib/colors";
import { ICON_OPTIONS, getIconByValue } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpecificTaskForm, SpecificTaskFormData } from "@/components/SpecificTaskForm";
import type { DepartmentFormData } from "@/types/department";
import { Role, TaskPriority, TaskVigencia, TaskStatus, SpecificTaskTemplate } from "@/types";
import { writeBatch, collection, getDocs, query, where, doc } from "firebase/firestore";
import { db } from "@/firebase-config";

const ROLES_LIST = [
  { value: Role.DIRECTOR_GENERAL, label: "Director General", level: 1 },
  { value: Role.DIRECTOR, label: "Director", level: 2 },
  { value: Role.RRHH, label: "RRHH", level: 3 },
  { value: Role.GERENTE_OPERACIONES, label: "Gerente de Operaciones", level: 4 },
  { value: Role.GERENTE_DEPARTAMENTO, label: "Gerente de Departamento", level: 5 },
  { value: Role.SUPERVISOR, label: "Supervisor", level: 6 },
  { value: Role.STAFF, label: "Staff", level: 7 },
];

const LEVELS = [
  { value: 1, label: "1 - Director General" },
  { value: 2, label: "2 - Director" },
  { value: 3, label: "3 - RRHH" },
  { value: 4, label: "4 - Gerente Operaciones" },
  { value: 5, label: "5 - Gerente Departamento" },
  { value: 6, label: "6 - Supervisor" },
  { value: 7, label: "7 - Staff" },
];

function getLevelBadge(level: number) {
  if (level <= 2) return { label: "Directivo", className: "bg-amber-50 text-amber-700 border-amber-200", icon: Crown };
  if (level <= 4) return { label: "Gerente", className: "bg-sky-50 text-sky-700 border-sky-200", icon: Shield };
  if (level <= 5) return { label: "Gerente Depto", className: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Shield };
  if (level === 6) return { label: "Supervisor", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: UserCog };
  return { label: "Staff", className: "bg-slate-50 text-slate-600 border-slate-200", icon: HardHat };
}

function sortUsersByHierarchy(users: any[]) {
  return [...users].sort((a, b) => {
    const pa = a.level || 7;
    const pb = b.level || 7;
    if (pa !== pb) return pa - pb;
    return (a.name || "").localeCompare(b.name || "");
  });
}

async function syncDepartmentName(oldName: string, newName: string): Promise<number> {
  let totalUpdated = 0;
  const batch = writeBatch(db);
  const collectionsToCheck = ["users", "tasks", "shifts"];
  for (const collName of collectionsToCheck) {
    const snap = await getDocs(query(collection(db, collName), where("department", "==", oldName)));
    snap.forEach(d => { batch.update(doc(db, collName, d.id), { department: newName.trim() }); totalUpdated++; });
  }
  if (totalUpdated > 0) await batch.commit();
  return totalUpdated;
}

export function DepartamentosTab() {
  const { departments, loading, createDepartment, updateDepartment, deleteDepartment, checkUsersInDepartment } = useFirestoreDepartments();
  const { users, updateUser } = useFirestoreUsers();
  const { logAction } = useAudit();
  const { user: currentUser } = useAuth();
  const { positions, createPosition } = useFirestorePositions();
  const { shifts, assignments: shiftAssignments } = useFirestoreShifts();
  const { templates, createTemplate, updateTemplate, deleteTemplate } = useSpecificTaskTemplates();
  const { isOperationalDepartment, departmentTree } = useDynamicDepartments();

  const [showFormModal, setShowFormModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState("");
  const [form, setForm] = useState<DepartmentFormData>({
    code: "", name: "", description: "", color: CORPORATE_COLORS[0].value, icon: "building", isActive: true, parentId: null,
  });
  const [saving, setSaving] = useState(false);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editLevel, setEditLevel] = useState<number>(7);
  const [editPosition, setEditPosition] = useState("");

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [expandedDeptIds, setExpandedDeptIds] = useState<Set<string>>(new Set());
  const [templateForm, setTemplateForm] = useState<SpecificTaskFormData>({
    title: "",
    description: "",
    department: "",
    shiftIds: [],
    startTime: "08:00",
    estimatedMinutes: 60,
    priority: TaskPriority.MEDIUM,
    requiresPhoto: false,
    vigenciaDays: TaskVigencia.INDEFINIDO,
    subtasks: [],
  });
  const [templateCounts, setTemplateCounts] = useState<Record<string, number>>({});

  const rootDepts = useMemo(() => departments.filter((d: any) => !d.parentId).sort((a: any, b: any) => a.name.localeCompare(b.name)), [departments]);
  const childDepts = useMemo(() => departments.filter((d: any) => d.parentId), [departments]);
  const independentDepts = useMemo(() => rootDepts.filter((d: any) => childrenOf(d.id).length === 0), [rootDepts]);
  const mainDept = useMemo(() => departments.find((d: any) => d.code === 'OPERACIONES') || rootDepts[0], [departments, rootDepts]);
  const deptsById = useMemo(() => { const m = new Map<string, any>(); departments.forEach((d: any) => m.set(d.id, d)); return m; }, [departments]);
  const childrenOf = (parentId: string) => childDepts.filter((c: any) => c.parentId === parentId).sort((a: any, b: any) => a.name.localeCompare(b.name));
  const getDescendantIds = (parentId: string | null, depts: any[]): string[] => {
    if (!parentId) return [];
    const direct = depts.filter(d => d.parentId === parentId).map(d => d.id);
    const indirect = direct.flatMap(childId => getDescendantIds(childId, depts));
    return Array.from(new Set([...direct, ...indirect]));
  };

  const PROTECTED_DEPT_CODES = ["OPERACIONES", "ADMINISTRATIVO"];

  const openCreate = () => { setEditingId(null); setOriginalName(""); setForm({ code: "", name: "", description: "", color: CORPORATE_COLORS[0].value, icon: "building", isActive: true, parentId: null }); setShowFormModal(true); };
  const openEdit = (dept: any) => {
    setEditingId(dept.id); setOriginalName(dept.name); setForm({ code: dept.code || "", name: dept.name, description: dept.description, color: dept.color, icon: dept.icon, isActive: dept.isActive, parentId: dept.parentId }); setShowFormModal(true);
  };
  const openTeam = (dept: any) => { setSelectedDept(dept); setEditingUserId(null); setShowTeamModal(true); };
  const closeFormModal = () => { setShowFormModal(false); setEditingId(null); setOriginalName(""); };
  const isEditingProtected = editingId ? PROTECTED_DEPT_CODES.includes(departments.find((d: any) => d.id === editingId)?.code) : false;
  const closeTeamModal = () => { setShowTeamModal(false); setSelectedDept(null); setEditingUserId(null); };

  const handleSave = async () => {
    if (editingId && isEditingProtected) {
      // Departamentos base: solo permitir editar color e icono
      setSaving(true);
      try {
        const editingDept = departments.find((d: any) => d.id === editingId);
        await updateDepartment(editingId, { color: form.color, icon: form.icon });
        await logAction({ action: "DEPARTMENT_UPDATED", targetType: "department", targetId: editingId, targetName: editingDept?.name || form.name, impactLevel: "major", description: "Actualizado color/icono: " + (editingDept?.name || form.name) });
        closeFormModal();
      } catch (err: any) { alert("Error: " + err.message); }
      finally { setSaving(false); }
      return;
    }
    if (!form.name.trim()) { alert("El nombre es obligatorio"); return; }
    if (editingId && form.parentId === editingId) { alert("Un departamento no puede ser padre de si mismo"); return; }
    if (editingId && form.parentId && getDescendantIds(editingId, departments).includes(form.parentId)) { alert("Un departamento no puede ser padre de sus propios descendientes"); return; }
    setSaving(true);
    try {
      if (editingId) {
        if (originalName && originalName !== form.name) {
          const updated = await syncDepartmentName(originalName, form.name);
          await logAction({ action: "DEPARTMENT_UPDATED", targetType: "department", targetId: editingId, targetName: form.name, impactLevel: "critical", description: "Renombrado: " + originalName + " -> " + form.name + " (" + updated + " registros)" });
        } else {
          await logAction({ action: "DEPARTMENT_UPDATED", targetType: "department", targetId: editingId, targetName: form.name, impactLevel: "major", description: "Actualizado: " + form.name });
        }
        await updateDepartment(editingId, form);
      } else {
        const id = await createDepartment({ ...form, parentId: form.parentId || null });
        await logAction({ action: "DEPARTMENT_CREATED", targetType: "department", targetId: id, targetName: form.name, impactLevel: "major", description: "Creado: " + form.name });
      }
      closeFormModal();
    } catch (err: any) { alert("Error: " + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (dept: any) => {
    const PROTECTED_CODES = ["OPERACIONES", "ADMINISTRATIVO"];
    if (PROTECTED_CODES.includes(dept.code)) { alert("No se puede eliminar el departamento " + dept.name + " por seguridad."); return; }
    const hasChildren = childDepts.some((c: any) => c.parentId === dept.id);
    if (hasChildren) { alert("No se puede eliminar porque tiene sub-departamentos."); return; }
    const count = await checkUsersInDepartment(dept.name);
    if (count > 0) { alert("No se puede eliminar porque tiene " + count + " usuario(s)."); return; }
    try {
      await executeWithConfirm({ level: "sensitive", title: "Eliminar departamento", description: "Eliminar permanentemente?", action: async () => {
        await deleteDepartment(dept.id);
        await logAction({ action: "DEPARTMENT_DELETED", targetType: "department", targetId: dept.id, targetName: dept.name, impactLevel: "critical", description: "Eliminado: " + dept.name });
      }});
    } catch { }
  };

  const handleUpdateUser = async (userId: string) => {
    try {
      const updates: any = {};
      if (editRole) updates.role = editRole as any;
      if (editLevel) updates.level = editLevel;
      if (editPosition) updates.position = editPosition.trim();
      if (Object.keys(updates).length > 0) await updateUser(userId, updates);
      setEditingUserId(null); setEditRole(""); setEditLevel(7); setEditPosition("");
    } catch (err: any) { alert("Error: " + err.message); }
  };

  const startEditUser = (u: any) => { setEditingUserId(u.id); setEditRole(u.role || ""); setEditLevel(u.level || 7); setEditPosition(u.position || ""); };
  const getDeptUsers = (dept: any) => users.filter((u: any) => normalizeDeptCode(u.department || '') === normalizeDeptCode(dept.code || dept.name || '') && u.isActive !== false);

  const deptTemplates = useMemo(() => {
    if (!selectedDept) return [];
    return templates
      .filter((t: any) => normalizeDeptCode(t.department || '') === normalizeDeptCode(selectedDept?.code || '') && t.isActive !== false)
      .sort((a: any, b: any) => (a.title || "").localeCompare(b.title || ""));
  }, [templates, selectedDept]);

  const shiftsForTemplateForm = useMemo(() => {
    const deptCode = normalizeDeptCode(templateForm.department || '');
    return shifts.filter((s: any) => normalizeDeptCode(s.department || '') === deptCode && s.isActive !== false);
  }, [shifts, templateForm.department]);

  const templateSupervisorId = useMemo(() => {
    const deptCode = normalizeDeptCode(templateForm.department || '');
    const deptUsers = users.filter((u: any) => normalizeDeptCode(u.department || '') === deptCode && u.isActive !== false);
    const selectedShiftIds = templateForm.shiftIds || [];

    // 1. Supervisor del dept que tenga alguno de los turnos seleccionados asignado (publicado)
    if (selectedShiftIds.length > 0) {
      const supervisorsWithShift = deptUsers.filter(
        (u: any) => u.role === Role.SUPERVISOR && shiftAssignments.some((a: any) => selectedShiftIds.includes(a.shiftId) && a.userId === u.id && a.status === 'PUBLICADO')
      );
      if (supervisorsWithShift.length > 0) return supervisorsWithShift[0].id;
    }

    // 2. Cualquier supervisor del dept
    const supervisor = deptUsers.find((u: any) => u.role === Role.SUPERVISOR);
    if (supervisor) return supervisor.id;

    // 3. Gerente del departamento
    const gerente = deptUsers.find((u: any) => u.role === Role.GERENTE_DEPARTAMENTO);
    if (gerente) return gerente.id;

    // 4. Fallback a superiores (DG, Director, RRHH, Gerente de Operaciones)
    const fallbackRoles = [Role.DIRECTOR_GENERAL, Role.DIRECTOR, Role.RRHH, Role.GERENTE_OPERACIONES];
    const fallback = users
      .filter((u: any) => u.isActive !== false && fallbackRoles.includes(u.role))
      .sort((a: any, b: any) => (a.level || 7) - (b.level || 7))[0];
    return fallback?.id || "";
  }, [users, templateForm.department, templateForm.shiftIds, shiftAssignments]);

  const templateSupervisorName = useMemo(() => {
    const s = users.find((u: any) => u.id === templateSupervisorId);
    return s ? `${s.name} (${s.role.replace(/_/g, " ")})` : "";
  }, [users, templateSupervisorId]);

  const templateNotifyOnDelay = useMemo(() => {
    return users
      .filter((u: any) => u.isActive !== false && (u.role === Role.RRHH || u.role === Role.GERENTE_OPERACIONES))
      .map((u: any) => u.id);
  }, [users]);

  const templateObservers = useMemo(() => {
    return users
      .filter((u: any) => templateNotifyOnDelay.includes(u.id))
      .map((u: any) => ({ name: u.name, role: u.role }));
  }, [users, templateNotifyOnDelay]);

  const templateDueTime = useMemo(() => {
    try {
      const [hours, minutes] = templateForm.startTime.split(":").map(Number);
      const date = new Date();
      date.setHours(hours, minutes + templateForm.estimatedMinutes, 0, 0);
      return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    } catch (e) {
      return templateForm.startTime;
    }
  }, [templateForm.startTime, templateForm.estimatedMinutes]);

  useEffect(() => {
    if (!selectedDept) {
      setTemplateCounts({});
      return;
    }
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        deptTemplates.map(async (template: any) => {
          try {
            const q = query(collection(db, "tasks"), where("templateId", "==", template.id));
            const snap = await getDocs(q);
            let total = 0;
            snap.forEach((d) => {
              const data = d.data();
              if (data.source !== "specific-task-template") return;
              if (data.status === TaskStatus.COMPLETED || data.status === TaskStatus.VERIFIED) return;
              total += (data.assignedTo || []).length;
            });
            counts[template.id] = total;
          } catch (err) {
            console.error("Error contando tareas de plantilla:", err);
            counts[template.id] = 0;
          }
        })
      );
      setTemplateCounts(counts);
    };
    fetchCounts();
  }, [deptTemplates, selectedDept]);

  const openTemplateModal = (dept: any, template?: SpecificTaskTemplate) => {
    setEditingTemplateId(template?.id || null);
    setTemplateForm({
      title: template?.title || "",
      description: template?.description || "",
      department: template?.department || dept.code || "",
      shiftIds: template?.shiftIds || (template?.shiftId ? [template.shiftId] : []),
      startTime: template?.startTime || "08:00",
      estimatedMinutes: template?.estimatedMinutes || 60,
      priority: (template?.priority as TaskPriority) || TaskPriority.MEDIUM,
      requiresPhoto: template?.requiresPhoto || false,
      vigenciaDays: template?.vigenciaDays === null ? TaskVigencia.INDEFINIDO : (template?.vigenciaDays as TaskVigencia) || TaskVigencia.INDEFINIDO,
      subtasks: template?.subtasks || [],
    });
    setShowTemplateModal(true);
  };

  const closeTemplateModal = () => {
    setShowTemplateModal(false);
    setEditingTemplateId(null);
    setTemplateForm({
      title: "",
      description: "",
      department: "",
      shiftIds: [],
      startTime: "08:00",
      estimatedMinutes: 60,
      priority: TaskPriority.MEDIUM,
      requiresPhoto: false,
      vigenciaDays: TaskVigencia.INDEFINIDO,
      subtasks: [],
    });
  };

  const handleSaveTemplate = async () => {
    if (!currentUser?.id) return;
    if (!templateForm.title.trim() || templateForm.shiftIds.length === 0) {
      alert("Completa el título y selecciona al menos un turno");
      return;
    }
    if (!templateSupervisorId) {
      alert("No se encontró un supervisor o gerente para el departamento seleccionado");
      return;
    }
    const payload: Omit<CreateSpecificTaskTemplateData, "createdBy"> = {
      title: templateForm.title.trim(),
      description: templateForm.description.trim(),
      department: templateForm.department,
      shiftIds: templateForm.shiftIds,
      startTime: templateForm.startTime,
      estimatedMinutes: templateForm.estimatedMinutes,
      priority: templateForm.priority,
      supervisorId: templateSupervisorId,
      notifyOnDelay: templateNotifyOnDelay,
      requiresPhoto: templateForm.requiresPhoto,
      vigenciaDays: templateForm.vigenciaDays === TaskVigencia.INDEFINIDO ? null : templateForm.vigenciaDays,
      subtasks: templateForm.subtasks,
    };
    setSavingTemplate(true);
    try {
      if (editingTemplateId) {
        await updateTemplate(editingTemplateId, payload);
      } else {
        await createTemplate({ ...payload, createdBy: currentUser.id });
      }
      closeTemplateModal();
    } catch (err: any) {
      alert("Error al guardar la plantilla: " + err.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm("¿Eliminar esta plantilla de tarea específica?")) return;
    try {
      await deleteTemplate(templateId);
    } catch (err: any) {
      alert("Error al eliminar la plantilla: " + err.message);
    }
  };

  const renderFormModal = () => {
    if (!showFormModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) closeFormModal(); }}>
        <div className="w-full max-w-[95vw] sm:max-w-lg rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">{editingId ? "Editar departamento" : "Nuevo departamento"}</h3>
            <button onClick={closeFormModal} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-4">
            {isEditingProtected && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <p className="text-xs text-amber-200">
                  <strong>Departamento base:</strong> solo puedes cambiar el color y el icono. El nombre, descripción, departamento padre y estado están protegidos.
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-slate-300">Nombre *</Label>
              <Input value={form.name} disabled={isEditingProtected} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Operaciones" className="border-slate-600 bg-slate-700 text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed" />
              {editingId && originalName && originalName !== form.name && !isEditingProtected && (
                <p className="text-[11px] text-amber-400">Se sincronizara en usuarios, tareas y turnos.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Descripcion</Label>
              <Input value={form.description} disabled={isEditingProtected} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Gestion de operaciones diarias" className="border-slate-600 bg-slate-700 text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Departamento Padre</Label>
              <select value={form.parentId || ""} disabled={isEditingProtected} onChange={(e) => setForm(f => ({ ...f, parentId: e.target.value || null }))} className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">Ninguno (departamento raíz)</option>
                {departments
                  .filter((d: any) => d.id !== editingId)
                  .filter((d: any) => !editingId || !getDescendantIds(editingId, departments).includes(d.id))
                  .sort((a: any, b: any) => a.name.localeCompare(b.name))
                  .map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
              </select>
              <p className="text-[11px] text-slate-400">Si está en el subárbol de Operaciones, se considerará operacional automáticamente.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {CORPORATE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setForm(f => ({ ...f, color: c.value }))}
                    title={c.label}
                    className={`h-7 w-7 rounded-full border-2 transition ${form.color === c.value ? "border-white scale-110" : "border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Icono</Label>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-40 overflow-y-auto rounded-lg border border-slate-600 bg-slate-700 p-2">
                {ICON_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isUsed = departments.some((d: any) => d.id !== editingId && d.icon === opt.value && d.isActive !== false);
                  const isSelected = form.icon === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      title={`${opt.label}${isUsed ? ' (en uso)' : ''}`}
                      disabled={isUsed}
                      onClick={() => setForm(f => ({ ...f, icon: opt.value }))}
                      className={`flex h-8 w-8 items-center justify-center rounded-md border transition ${isSelected ? 'border-white bg-slate-500 text-white' : 'border-slate-600 text-slate-300 hover:bg-slate-600'} ${isUsed ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" checked={form.isActive} disabled={isEditingProtected} onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed" />
              <Label className="text-sm text-slate-300">Activo</Label>
            </div>
          </div>
          <div className="mt-6 flex gap-2 justify-end">
            <Button variant="ghost" onClick={closeFormModal} className="text-slate-300 hover:text-slate-100">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-sky-600 hover:bg-sky-700">{editingId ? "Guardar cambios" : "Crear departamento"}</Button>
          </div>
        </div>
      </div>
    );
  };

  const renderTeamModal = () => {
    if (!showTeamModal || !selectedDept) return null;
    const deptUsers = getDeptUsers(selectedDept);
    const sortedUsers = sortUsersByHierarchy(deptUsers);
    const myChildren = childrenOf(selectedDept.id);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) closeTeamModal(); }}>
        <div className="w-full max-w-[95vw] sm:max-w-3xl rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">{selectedDept.name}</h3>
              <p className="text-xs text-slate-400">{selectedDept.description || "Sin descripcion"} · {sortedUsers.length} usuarios · {isOperationalDepartment(selectedDept.code) ? "Operacional" : "No operacional"}</p>
            </div>
            <div className="flex items-center gap-1">
              {!PROTECTED_DEPT_CODES.includes(selectedDept.code) && (
                <>
                  <button onClick={() => { closeTeamModal(); openEdit(selectedDept); }} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-sky-400" title="Editar departamento"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { handleDelete(selectedDept); closeTeamModal(); }} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-900/20 hover:text-red-400" title="Eliminar departamento"><Trash2 className="h-4 w-4" /></button>
                </>
              )}
              <button onClick={closeTeamModal} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"><X className="h-5 w-5" /></button>
            </div>
          </div>

          {myChildren.length > 0 && (
            <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sub-departamentos ({myChildren.length})</h4>
              <div className="flex flex-wrap gap-2">
                {myChildren.map(c => (
                  <button key={c.id} onClick={() => { setSelectedDept(c); setEditingUserId(null); }} className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700 hover:text-white">
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-700 bg-slate-900/30">
            <h4 className="px-4 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Equipo</h4>
            {sortedUsers.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-500">No hay usuarios asignados.</p>
            ) : (
              <div className="overflow-x-auto p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pr-4">Nombre</th>
                      <th className="pb-3 pr-4">Email</th>
                      <th className="pb-3 pr-4">Nivel</th>
                      <th className="pb-3 pr-4">Rol</th>
                      <th className="pb-3 pr-4">Posicion</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {sortedUsers.map((u: any) => {
                      const badge = getLevelBadge(u.level || 7);
                      const BadgeIcon = badge.icon;
                      const isEditing = editingUserId === u.id;
                      return (
                        <tr key={u.id} className="group">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-slate-300">
                                {(u.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-200">{u.name || "Sin nombre"}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-xs text-slate-400">{u.email}</td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                              <BadgeIcon className="h-3 w-3" />{badge.label}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            {isEditing ? (
                              <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200">
                                <option value="">Seleccionar rol</option>
                                {ROLES_LIST.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
                              </select>
                            ) : (
                              <span className="text-slate-300">{u.role || "Sin rol"}</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            {isEditing ? (
                              <div className="flex flex-col gap-1">
                                <select
                                  value={editPosition}
                                  onChange={async (e) => {
                                    const value = e.target.value;
                                    if (value === '__create__') {
                                      const name = window.prompt('Nombre de la nueva posicion:');
                                      if (!name || !name.trim()) {
                                        setEditPosition('');
                                        return;
                                      }
                                      const id = await createPosition(
                                        { name: name.trim(), level: editLevel || 7, department: selectedDept?.code || null, isActive: true },
                                        currentUser?.id || 'system'
                                      );
                                      if (id) {
                                        setEditPosition(name.trim());
                                      } else {
                                        alert('Error al crear la posicion');
                                        setEditPosition('');
                                      }
                                    } else {
                                      setEditPosition(value);
                                    }
                                  }}
                                  className="w-28 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200"
                                >
                                  <option value="">Posicion</option>
                                  {positions.map((p) => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                  ))}
                                  <option value="__create__">+ Nueva</option>
                                </select>
                                <select value={editLevel} onChange={(e) => setEditLevel(Number(e.target.value))} className="w-28 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200">
                                  {LEVELS.map(l => (<option key={l.value} value={l.value}>{l.label}</option>))}
                                </select>
                              </div>
                            ) : (
                              <div className="text-slate-400">
                                <div>{u.position || "-"}</div>
                                <div className="text-[10px] text-slate-500">Nivel {u.level || 7}</div>
                              </div>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center gap-1 justify-end">
                                <button onClick={() => handleUpdateUser(u.id)} className="rounded p-1 text-green-400 hover:bg-green-900/20"><Save className="h-3.5 w-3.5" /></button>
                                <button onClick={() => { setEditingUserId(null); setEditRole(""); setEditLevel(7); setEditPosition(""); }} className="rounded p-1 text-red-400 hover:bg-red-900/20"><X className="h-3.5 w-3.5" /></button>
                              </div>
                            ) : (
                              <button onClick={() => startEditUser(u)} className="rounded p-1 text-slate-500 opacity-0 group-hover:opacity-100 transition hover:text-sky-400 hover:bg-sky-900/20"><Pencil className="h-3.5 w-3.5" /></button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Plantillas de tareas específicas */}
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/30">
            <div className="flex items-center justify-between px-4 pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Plantillas de tareas específicas ({deptTemplates.length})</h4>
              <Button
                size="sm"
                onClick={() => openTemplateModal(selectedDept)}
                className="bg-sky-600 hover:bg-sky-700 text-white"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />Nueva plantilla
              </Button>
            </div>
            {deptTemplates.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-500">No hay plantillas de tareas específicas para este departamento.</p>
            ) : (
              <div className="overflow-x-auto p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pr-4">Título</th>
                      <th className="pb-3 pr-4">Turnos</th>
                      <th className="pb-3 pr-4">Asignadas</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {deptTemplates.map((template: any) => {
                      const shiftNames = (template.shiftIds || (template.shiftId ? [template.shiftId] : []))
                        .map((sid: string) => shifts.find((s: any) => s.id === sid)?.name || sid)
                        .join(", ");
                      return (
                        <tr key={template.id} className="group">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <LayoutTemplate className="h-4 w-4 text-slate-500" />
                              <span className="font-medium text-slate-200">{template.title}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-xs text-slate-400">{shiftNames || "-"}</td>
                          <td className="py-3 pr-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 border border-slate-700">
                              <Clock className="h-3 w-3" />
                              {templateCounts[template.id] ?? 0}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => openTemplateModal(selectedDept, template)} className="rounded p-1 text-slate-500 opacity-0 group-hover:opacity-100 transition hover:text-sky-400 hover:bg-sky-900/20"><Pencil className="h-3.5 w-3.5" /></button>
                              <button onClick={() => handleDeleteTemplate(template.id)} className="rounded p-1 text-slate-500 opacity-0 group-hover:opacity-100 transition hover:text-red-400 hover:bg-red-900/20"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTemplateModal = () => {
    if (!showTemplateModal) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) closeTemplateModal(); }}>
        <div className="w-full max-w-[95vw] sm:max-w-2xl rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">{editingTemplateId ? "Editar plantilla" : "Nueva plantilla"}</h3>
            <button onClick={closeTemplateModal} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"><X className="h-5 w-5" /></button>
          </div>
          <SpecificTaskForm
            form={templateForm}
            setForm={setTemplateForm}
            departments={departments.map((d: any) => ({ code: d.code || d.id, name: d.name }))}
            shifts={shiftsForTemplateForm}
            supervisorName={templateSupervisorName}
            observers={templateObservers}
            dueTime={templateDueTime}
            onCancel={closeTemplateModal}
            onSubmit={handleSaveTemplate}
            disabled={savingTemplate}
            isEditing={!!editingTemplateId}
          />
        </div>
      </div>
    );
  };

  const toggleExpanded = (id: string) => {
    setExpandedDeptIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renderCard = (dept: any, level: number = 0) => {
    const deptUsers = getDeptUsers(dept);
    const userCount = deptUsers.length;
    const myChildren = childrenOf(dept.id);
    const isParent = myChildren.length > 0;
    const isExpanded = expandedDeptIds.has(dept.id);
    const parentName = dept.parentId ? deptsById.get(dept.parentId)?.name : null;

    return (
      <div
        className="group relative flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md cursor-pointer select-none"
        style={{ marginLeft: `${level * 28}px` }}
        onClick={() => toggleExpanded(dept.id)}
      >
        {/* Línea de conexión jerárquica */}
        {level > 0 && (
          <div className="absolute -left-[15px] top-1/2 h-px w-4 bg-slate-300" />
        )}

        {/* Icono / color de departamento */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${dept.color}15` }}>
          {(() => {
            const Icon = getIconByValue(dept.icon) || Building2;
            return <Icon className="h-5 w-5" style={{ color: dept.color }} />;
          })()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-slate-800 truncate">{dept.name}</h4>
            {isParent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                <Network className="h-3 w-3" /> Padre
              </span>
            )}
            {dept.isOperational && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 border border-sky-200">
                <CircleDot className="h-3 w-3" /> Operacional
              </span>
            )}
            {!dept.isActive && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 border border-slate-200">Inactivo</span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            {parentName ? (
              <span className="text-slate-400">Sub-departamento de <span className="font-medium text-slate-600">{parentName}</span></span>
            ) : (
              <span className="uppercase tracking-wide text-[10px]">Departamento raíz</span>
            )}
            <span className="hidden sm:inline">·</span>
            <span>{userCount} usuario{userCount !== 1 ? 's' : ''}</span>
            {isParent && (
              <>
                <span className="hidden sm:inline">·</span>
                <span className="inline-flex items-center gap-1 text-sky-600 font-medium">
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  {myChildren.length} sub-departamento{myChildren.length !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {isParent && (
            <button
              onClick={() => toggleExpanded(dept.id)}
              className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              title={isExpanded ? "Contraer" : "Expandir"}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          <button onClick={() => openTeam(dept)} className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-sky-600" title="Ver equipo"><Users className="h-4 w-4" /></button>
          {!PROTECTED_DEPT_CODES.includes(dept.code) && (
            <>
              <button onClick={() => openEdit(dept)} className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-sky-600"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => handleDelete(dept)} className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderDepartmentTree = (nodes: any[], level: number = 0, visited: Set<string> = new Set()): ReactNode[] => {
    return nodes.flatMap((node) => {
      if (visited.has(node.id)) return [];
      const nextVisited = new Set(visited);
      nextVisited.add(node.id);
      const isParent = (node.children?.length || 0) > 0;
      const isExpanded = expandedDeptIds.has(node.id);
      const items: ReactNode[] = [
        <div key={node.id} className="relative">
          {level > 0 && (
            <div className="absolute -left-[15px] top-0 bottom-0 w-px bg-slate-200" />
          )}
          {renderCard(node, level)}
        </div>
      ];
      if (isParent && isExpanded) {
        items.push(...renderDepartmentTree(node.children, level + 1, nextVisited));
      }
      return items;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Departamentos</h3>
          <p className="text-sm text-slate-500">{departments.length} departamentos · {users.filter((u: any) => u.department && u.isActive !== false).length} usuarios asignados</p>
        </div>
        <Button onClick={openCreate} className="bg-sky-600 hover:bg-sky-700"><Plus className="mr-1.5 h-4 w-4" />Crear departamento</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-[#86868B] mb-1">Departamentos padre</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{rootDepts.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-[#86868B] mb-1">Independientes</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{independentDepts.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-[#86868B] mb-1">Sub-departamentos</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{childDepts.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-[#86868B] mb-1">Departamento principal</p>
          <p className="text-sm font-semibold text-[#1D1D1F] truncate">{mainDept ? mainDept.name : '-'}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" /></div>
      ) : departments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
          <Building2 className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="text-sm">No hay departamentos creados.</p>
          <button onClick={openCreate} className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700 transition">Crear primer departamento</button>
        </div>
      ) : (
        <div className="space-y-2">
          {renderDepartmentTree(departmentTree)}
        </div>
      )}

      {renderFormModal()}
      {renderTeamModal()}
      {renderTemplateModal()}
    </div>
  );
}
