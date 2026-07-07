import { useState, useCallback } from "react";
import { Pencil, Trash2, Plus, Building2, AlertTriangle } from "lucide-react";
import { useFirestoreDepartments } from "@/hooks/firestore/useFirestoreDepartments";
import { useFirestoreUsers } from "@/hooks/firestore/useFirestoreUsers";
import { useAudit } from "@/hooks/useAudit";
import { executeWithConfirm } from "@/lib/confirm-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DepartmentFormData } from "@/types/department";

const DEPARTMENT_COLORS = [
  "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444",
  "#ec4899", "#6366f1", "#14b8a6", "#f97316", "#64748b",
];

export function DepartamentosTab() {
  const { departments, loading, createDepartment, updateDepartment, deleteDepartment, checkUsersInDepartment } = useFirestoreDepartments();
  const { users } = useFirestoreUsers();
  const { logAction } = useAudit();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DepartmentFormData>({
    name: "", description: "", color: DEPARTMENT_COLORS[0], icon: "building", isActive: true, order: 0,
  });
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm({ name: "", description: "", color: DEPARTMENT_COLORS[0], icon: "building", isActive: true, order: departments.length });
  }, [departments.length]);

  const startEdit = useCallback((dept: any) => {
    setEditingId(dept.id);
    setForm({ name: dept.name, description: dept.description, color: dept.color, icon: dept.icon, isActive: dept.isActive, order: dept.order });
  }, []);

  const handleSave = async () => {
    if (form.name.trim() === "") { alert("El nombre del departamento es obligatorio"); return; }
    setSaving(true);
    try {
      if (editingId !== null) {
        await updateDepartment(editingId, form);
        await logAction({ action: "DEPARTMENT_UPDATED", targetType: "department", targetId: editingId, targetName: form.name, impactLevel: "major", description: "Departamento actualizado: " + form.name });
      } else {
        const id = await createDepartment({ ...form, order: departments.length });
        await logAction({ action: "DEPARTMENT_CREATED", targetType: "department", targetId: id, targetName: form.name, impactLevel: "major", description: "Departamento creado: " + form.name });
      }
      resetForm();
    } catch (err: any) { alert("Error: " + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (dept: any) => {
    const count = await checkUsersInDepartment(dept.name);
    if (count > 0) { alert("No se puede eliminar '" + dept.name + "' porque tiene " + count + " usuario(s) activo(s). Reasigne los usuarios primero."); return; }
    try {
      await executeWithConfirm({ level: "sensitive", title: "Eliminar departamento", description: "Eliminar '" + dept.name + "' permanentemente?", action: async () => {
        await deleteDepartment(dept.id);
        await logAction({ action: "DEPARTMENT_DELETED", targetType: "department", targetId: dept.id, targetName: dept.name, impactLevel: "major", description: "Departamento eliminado: " + dept.name });
      }});
    } catch { }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-100">{editingId !== null ? "Editar departamento" : "Nuevo departamento"}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5"><Label className="text-slate-300">Nombre *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Operaciones" className="border-slate-600 bg-slate-700 text-slate-100" /></div>
          <div className="space-y-1.5"><Label className="text-slate-300">Descripcion</Label><Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Gestion de operaciones diarias" className="border-slate-600 bg-slate-700 text-slate-100" /></div>
          <div className="space-y-1.5"><Label className="text-slate-300">Color</Label><div className="flex flex-wrap gap-1.5">{DEPARTMENT_COLORS.map(c => (<button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`h-7 w-7 rounded-full border-2 transition ${form.color === c ? "border-white scale-110" : "border-transparent hover:scale-105"}`} style={{ backgroundColor: c }} />))}</div></div>
          <div className="space-y-1.5"><Label className="text-slate-300">Orden</Label><Input type="number" value={form.order} onChange={(e) => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} className="border-slate-600 bg-slate-700 text-slate-100" /></div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="bg-sky-600 hover:bg-sky-700"><Plus className="mr-1.5 h-4 w-4" />{editingId !== null ? "Guardar cambios" : "Crear departamento"}</Button>
          {editingId !== null && <Button variant="ghost" onClick={resetForm} className="text-slate-300 hover:text-slate-100">Cancelar</Button>}
        </div>
      </div>
      {loading ? (<p className="text-slate-400">Cargando departamentos...</p>) : departments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-600 p-8 text-center text-slate-400"><Building2 className="mx-auto mb-3 h-10 w-10 opacity-50" /><p className="text-sm">No hay departamentos creados.</p><p className="mt-1 text-xs opacity-70">Crea el primero usando el formulario de arriba.</p></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept: any) => {
            const userCount = users.filter((u: any) => u.department === dept.name && u.isActive !== false).length;
            return (
              <div key={dept.id} className="group relative rounded-xl border border-slate-700 bg-slate-800 p-4 transition hover:border-slate-500">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: dept.color + "20" }}><Building2 className="h-5 w-5" style={{ color: dept.color }} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><h4 className="truncate text-sm font-semibold text-slate-100">{dept.name}</h4>{dept.isActive === false && <span className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] text-slate-300">INACTIVO</span>}</div>
                    {dept.description && <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">{dept.description}</p>}
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500"><span>{userCount} usuario{userCount !== 1 ? "s" : ""}</span>{userCount > 0 && <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="h-3 w-3" /> En uso</span>}</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-1 border-t border-slate-700 pt-2 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => startEdit(dept)} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-sky-400 transition hover:bg-sky-400/10"><Pencil className="h-3 w-3" /> Editar</button>
                  <button onClick={() => handleDelete(dept)} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-400 transition hover:bg-red-400/10"><Trash2 className="h-3 w-3" /> Eliminar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
