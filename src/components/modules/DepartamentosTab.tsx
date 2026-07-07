import { useState, useCallback, useMemo } from "react";
import {
  Pencil, Trash2, Plus, Building2, AlertTriangle, ChevronDown, ChevronUp,
  X, GitBranch, Shield, Crown, HardHat, Users, Briefcase, Save, UserCog,
  ExternalLink
} from "lucide-react";
import { useFirestoreDepartments } from "@/hooks/firestore/useFirestoreDepartments";
import { useFirestoreUsers } from "@/hooks/firestore/useFirestoreUsers";
import { useAudit } from "@/hooks/useAudit";
import { executeWithConfirm } from "@/lib/confirm-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DepartmentFormData } from "@/types/department";
import { Role } from "@/types";
import { writeBatch, collection, getDocs, query, where, doc } from "firebase/firestore";
import { db } from "@/firebase-config";

const DEPARTMENT_COLORS = [
  "#64748b", "#475569", "#334155", "#1e293b", "#0f172a",
  "#94a3b8", "#78716c", "#57534e", "#44403c", "#292524",
];

const DEPT_TYPE_LABELS: Record<string, string> = {
  administrativo: "Administrativo",
  operativo: "Operativo",
  otro: "Otro",
};

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

// Sync department name across all collections
async function syncDepartmentName(oldName: string, newName: string): Promise<number> {
  let totalUpdated = 0;
  const batch = writeBatch(db);
  const collectionsToCheck = ['users', 'tasks', 'shifts'];
  
  for (const collName of collectionsToCheck) {
    const snap = await getDocs(query(collection(db, collName), where("department", "==", oldName)));
    snap.forEach(d => {
      batch.update(doc(db, collName, d.id), { department: newName.trim() });
      totalUpdated++;
    });
  }
  
  if (totalUpdated > 0) await batch.commit();
  return totalUpdated;
}

export function DepartamentosTab() {
  const { departments, loading, createDepartment, updateDepartment, deleteDepartment, checkUsersInDepartment } = useFirestoreDepartments();
  const { users, updateUser } = useFirestoreUsers();
  const { logAction } = useAudit();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState("");
  const [form, setForm] = useState<DepartmentFormData>({
    name: "", description: "", color: DEPARTMENT_COLORS[0], icon: "building", isActive: true, parentId: null, type: "operativo",
  });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editLevel, setEditLevel] = useState<number>(7);
  const [editPosition, setEditPosition] = useState("");

  const rootDepts = useMemo(() => departments.filter((d: any) => !d.parentId), [departments]);
  const childDepts = useMemo(() => departments.filter((d: any) => d.parentId), [departments]);
  const deptsById = useMemo(() => {
    const m = new Map<string, any>();
    departments.forEach((d: any) => m.set(d.id, d));
    return m;
  }, [departments]);

  const openCreate = () => {
    setEditingId(null); setOriginalName("");
    setForm({ name: "", description: "", color: DEPARTMENT_COLORS[0], icon: "building", isActive: true, parentId: null, type: "operativo" });
    setShowModal(true);
  };

  const openEdit = (dept: any) => {
    setEditingId(dept.id); setOriginalName(dept.name);
    setForm({ name: dept.name, description: dept.description, color: dept.color, icon: dept.icon, isActive: dept.isActive, parentId: dept.parentId, type: dept.type || "otro" });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); setOriginalName(""); };

  const handleSave = async () => {
    if (!form.name.trim()) { alert("El nombre es obligatorio"); return; }
    if (editingId && form.parentId === editingId) { alert("Un departamento no puede ser padre de si mismo"); return; }
    setSaving(true);
    try {
      if (editingId) {
        if (originalName && originalName !== form.name) {
          const updated = await syncDepartmentName(originalName, form.name);
          console.log(`[Departamentos] ${updated} registros sincronizados de "${originalName}" a "${form.name}"`);
          await logAction({ action: "DEPARTMENT_UPDATED", targetType: "department", targetId: editingId, targetName: form.name, impactLevel: "critical", description: `Departamento renombrado: "${originalName}" → "${form.name}" (${updated} registros actualizados)` });
        } else {
          await logAction({ action: "DEPARTMENT_UPDATED", targetType: "department", targetId: editingId, targetName: form.name, impactLevel: "major", description: "Departamento actualizado: " + form.name });
        }
        await updateDepartment(editingId, form);
      } else {
        const id = await createDepartment({ ...form, parentId: form.parentId || null });
        await logAction({ action: "DEPARTMENT_CREATED", targetType: "department", targetId: id, targetName: form.name, impactLevel: "major", description: "Departamento creado: " + form.name });
      }
      closeModal();
    } catch (err: any) { alert("Error: " + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (dept: any) => {
    const hasChildren = childDepts.some((c: any) => c.parentId === dept.id);
    if (hasChildren) { alert('No se puede eliminar "' + dept.name + '" porque tiene sub-departamentos.'); return; }
    const count = await checkUsersInDepartment(dept.name);
    if (count > 0) { alert('No se puede eliminar "' + dept.name + '" porque tiene ' + count + " usuario(s)."); return; }
    try {
      await executeWithConfirm({ level: "sensitive", title: "Eliminar departamento", description: 'Eliminar "' + dept.name + '" permanentemente?', action: async () => {
        await deleteDepartment(dept.id);
        await logAction({ action: "DEPARTMENT_DELETED", targetType: "department", targetId: dept.id, targetName: dept.name, impactLevel: "critical", description: "Departamento eliminado: " + dept.name });
      }});
    } catch { }
  };

  const toggleExpand = (id: string) => { setExpandedId((prev) => (prev === id ? null : id)); setEditingUserId(null); };

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

  const startEditUser = (u: any) => {
    setEditingUserId(u.id);
    setEditRole(u.role || "");
    setEditLevel(u.level || 7);
    setEditPosition(u.position || "");
  };

  const getDeptUsers = (deptName: string) => users.filter((u: any) => u.department === deptName && u.isActive !== false);

  const renderModal = () => {
    if (!showModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">{editingId ? "Editar departamento" : "Nuevo departamento"}</h3>
            <button onClick={closeModal} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Operaciones" className="border-slate-600 bg-slate-700 text-slate-100" />
              {editingId && originalName && originalName !== form.name && (
                <p className="text-[11px] text-amber-400">Al cambiar el nombre se sincronizara en usuarios, tareas y turnos.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Descripcion</Label>
              <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Gestion de operaciones diarias" className="border-slate-600 bg-slate-700 text-slate-100" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Tipo</Label>
                <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value as any }))} className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100">
                  <option value="administrativo">Administrativo</option>
                  <option value="operativo">Operativo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Departamento Padre</Label>
                <select value={form.parentId || ""} onChange={(e) => setForm(f => ({ ...f, parentId: e.target.value || null }))} className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100">
                  <option value="">Ninguno (raiz)</option>
                  {departments.filter((d: any) => d.id !== editingId).map((d: any) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {DEPARTMENT_COLORS.map(c => (<button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`h-7 w-7 rounded-full border-2 transition ${form.color === c ? "border-white scale-110" : "border-transparent hover:scale-105"}`} style={{ backgroundColor: c }} />))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-slate-500" />
              <Label className="text-sm text-slate-300">Activo</Label>
            </div>
          </div>
          <div className="mt-6 flex gap-2 justify-end">
            <Button variant="ghost" onClick={closeModal} className="text-slate-300 hover:text-slate-100">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-sky-600 hover:bg-sky-700">{editingId ? "Guardar cambios" : "Crear departamento"}</Button>
          </div>
        </div>
      </div>
    );
  };

  const renderCardHeader = (dept: any, isParent: boolean) => {
    const deptUsers = getDeptUsers(dept.name);
    const userCount = deptUsers.length;
    const isExpanded = expandedId === dept.id;

    return (
      <div
        onClick={() => toggleExpand(dept.id)}
        className={`rounded-xl border transition cursor-pointer select-none ${isParent ? "border-slate-300 bg-white shadow-sm hover:shadow" : "border-slate-200 bg-white shadow-sm hover:shadow-md"} ${isExpanded ? "ring-2 ring-sky-200" : ""}`}
      >
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <Building2 className="h-5 w-5" style={{ color: dept.color }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-semibold text-slate-800 truncate">{dept.name}</h4>
                {isParent && <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">PADRE</span>}
                {!dept.isActive && <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">INACTIVO</span>}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                <span className="uppercase tracking-wide text-[10px]">{dept.type || "otro"}</span>
                <span>·</span>
                <span>{userCount} usuarios</span>
                {dept.parentId && (
                  <>
                    <span>·</span>
                    <span className="text-slate-400">hijo de {deptsById.get(dept.parentId)?.name || "?"}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => openEdit(dept)} className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-sky-600"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => handleDelete(dept)} className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              <button className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderExpanded = (dept: any) => {
    const deptUsers = getDeptUsers(dept.name);
    const sortedUsers = sortUsersByHierarchy(deptUsers);

    return (
      <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4" onClick={(e) => e.stopPropagation()}>
        <h5 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Equipo ({sortedUsers.length})</h5>
        {sortedUsers.length === 0 ? (
          <p className="text-xs text-slate-400">No hay usuarios asignados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="pb-2 pr-4">Nombre</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Nivel</th>
                  <th className="pb-2 pr-4">Rol</th>
                  <th className="pb-2 pr-4">Posicion</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedUsers.map((u: any) => {
                  const badge = getLevelBadge(u.level || 7);
                  const BadgeIcon = badge.icon;
                  const isEditing = editingUserId === u.id;
                  return (
                    <tr key={u.id} className="group">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold" style={{ color: dept.color }}>
                            {(u.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800">{u.name || "Sin nombre"}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-xs text-slate-500">{u.email}</td>
                      <td className="py-2 pr-4">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                          <BadgeIcon className="h-3 w-3" />{badge.label}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        {isEditing ? (
                          <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs">
                            <option value="">Seleccionar rol</option>
                            {ROLES_LIST.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
                          </select>
                        ) : (
                          <span className="text-slate-700">{u.role || "Sin rol"}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input value={editPosition} onChange={(e) => setEditPosition(e.target.value)} placeholder="Posicion" className="w-24 rounded border border-slate-300 px-2 py-1 text-xs" />
                            <select value={editLevel} onChange={(e) => setEditLevel(Number(e.target.value))} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs">
                              {LEVELS.map(l => (<option key={l.value} value={l.value}>{l.label}</option>))}
                            </select>
                          </div>
                        ) : (
                          <span className="text-slate-500">{u.position || "-"}</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => handleUpdateUser(u.id)} className="rounded p-1 text-green-600 hover:bg-green-50"><Save className="h-3.5 w-3.5" /></button>
                            <button onClick={() => { setEditingUserId(null); setEditRole(""); setEditLevel(7); setEditPosition(""); }} className="rounded p-1 text-red-400 hover:bg-red-50"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEditUser(u)} className="rounded p-1 text-slate-300 opacity-0 group-hover:opacity-100 transition hover:text-sky-600 hover:bg-sky-50"><Pencil className="h-3.5 w-3.5" /></button>
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
    );
  };

  // Build flat list: parent, then its children immediately after
  const sortedDepts = useMemo(() => {
    const result: any[] = [];
    const sortedParents = [...rootDepts].sort((a, b) => a.name.localeCompare(b.name));
    sortedParents.forEach(p => {
      result.push({ ...p, _isParent: true });
      const children = childDepts.filter((c: any) => c.parentId === p.id).sort((a: any, b: any) => a.name.localeCompare(b.name));
      children.forEach((c: any) => result.push({ ...c, _isParent: false }));
    });
    // Orphans (children whose parent was deleted)
    const orphanChildren = childDepts.filter((c: any) => !rootDepts.find((r: any) => r.id === c.parentId)).sort((a: any, b: any) => a.name.localeCompare(b.name));
    orphanChildren.forEach((c: any) => result.push({ ...c, _isParent: false }));
    return result;
  }, [rootDepts, childDepts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Departamentos</h3>
          <p className="text-sm text-slate-500">{departments.length} departamento{departments.length !== 1 ? "s" : ""} · {users.filter((u: any) => u.department && u.isActive !== false).length} usuarios asignados</p>
        </div>
        <Button onClick={openCreate} className="bg-sky-600 hover:bg-sky-700"><Plus className="mr-1.5 h-4 w-4" />Crear departamento</Button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedDepts.map((dept: any) => {
            const isExpanded = expandedId === dept.id;
            return (
              <div key={dept.id} className={dept._isParent ? "" : "relative"}>
                {!dept._isParent && (
                  <div className="absolute -left-3 top-5 bottom-0 w-0.5 bg-slate-200" />
                )}
                {renderCardHeader(dept, dept._isParent)}
                {isExpanded && <div className="mt-2">{renderExpanded(dept)}</div>}
              </div>
            );
          })}
        </div>
      )}

      {renderModal()}
    </div>
  );
}
