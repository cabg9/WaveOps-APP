import { useState, useEffect, useMemo } from "react";
import {
  X, Plus, Trash2,
  FileText, Clock, ShieldCheck, Users, User, Zap, Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Task, TaskPriority, Subtask } from "@/types";
import { useDynamicDepartments } from "@/hooks/firestore/useDynamicDepartments";
import { useFirestoreUsers } from "@/hooks/firestore/useFirestoreUsers";
import { cn } from "@/lib/utils";

interface EditTaskModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (taskId: string, updates: Partial<Task>) => void;
  canEditAll: boolean;
}


const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: "Baja", color: "bg-[#8E8E93]" },
  MEDIUM: { label: "Media", color: "bg-[#007AFF]" },
  HIGH: { label: "Alta", color: "bg-[#FF9500]" },
  CRITICAL: { label: "Critica", color: "bg-[#FF3B30]" },
};

const timeButtons = [5, 10, 15, 20, 30, 40, 50, 60];

export function EditTaskModal({ task, open, onOpenChange, onSave, canEditAll }: EditTaskModalProps) {
  const { departmentNames, defaultDepartment } = useDynamicDepartments();
  const { users: allUsers } = useFirestoreUsers();

  // === ESTADOS ===
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [department, setDepartment] = useState<string>(defaultDepartment);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | "">("");
  const [customMinutes, setCustomMinutes] = useState("");
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [supportUserIds, setSupportUserIds] = useState<string[]>([]);
  const [supervisorId, setSupervisorId] = useState("");
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [showSupport, setShowSupport] = useState(false);
  const [supportDepartment, setSupportDepartment] = useState<string | "">("");

  // Cargar datos
  useEffect(() => {
    if (task && open) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setPriority(task.priority || TaskPriority.MEDIUM);
      setDepartment(task.department || defaultDepartment);
      setDueDate(task.dueDate || "");
      setDueTime(task.dueTime || "");
      setEstimatedMinutes(task.estimatedMinutes || "");
      setCustomMinutes("");
      setShowCustomTime(false);
      setAssignedTo(task.assignedTo || []);
      setSupportUserIds(task.supportUserIds || []);
      setSupervisorId(task.supervisorId || "");
      setRequiresPhoto(task.requiresPhoto || false);
      setSubtasks(task.subtasks || []);
      setShowSupport((task.supportUserIds || []).length > 0);
      setSupportDepartment("");
      const taskPhotos = (task.photos || []).map((p: any) => typeof p === "string" ? p : p.url || "");
      setPhotos(taskPhotos.filter(Boolean));
    }
  }, [task, open]);

  const calculatedDueLabel = useMemo(() => {
    if (!dueDate) return "Sin fecha";
    if (dueTime) return `${dueDate} ${dueTime}`;
    return dueDate;
  }, [dueDate, dueTime]);

  if (!task) return null;

  const deptUsers = allUsers.filter((u) => u.department === department && u.isActive !== false);
  const supervisors = deptUsers.filter((u) => u.role === "SUPERVISOR" || u.role === "GERENTE_DEPARTAMENTO");
  const supportDeptUsers = supportDepartment ? allUsers.filter((u) => u.department === supportDepartment && u.isActive !== false) : [];

  const toggleAssigned = (uid: string) => {
    if (!canEditAll) return;
    setAssignedTo((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);
  };
  const toggleSupport = (uid: string) => {
    if (!canEditAll) return;
    setSupportUserIds((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);
  };

  const handleSave = () => {
    const updates: any = {};
    const finalMinutes = showCustomTime ? Number(customMinutes) || undefined : estimatedMinutes || undefined;
    if (canEditAll) {
      if (title !== task!.title) updates.title = title;
      if (description !== task!.description) updates.description = description;
      if (priority !== task!.priority) updates.priority = priority;
      if (department !== task!.department) updates.department = department;
      if (dueDate !== task!.dueDate) updates.dueDate = dueDate;
      if (dueTime !== task!.dueTime) updates.dueTime = dueTime;
      if (finalMinutes !== task!.estimatedMinutes) updates.estimatedMinutes = finalMinutes;
      if (JSON.stringify(assignedTo) !== JSON.stringify(task!.assignedTo)) updates.assignedTo = assignedTo;
      if (JSON.stringify(supportUserIds) !== JSON.stringify(task!.supportUserIds)) updates.supportUserIds = supportUserIds;
      if (supervisorId !== task!.supervisorId) updates.supervisorId = supervisorId || undefined;
      if (requiresPhoto !== task!.requiresPhoto) updates.requiresPhoto = requiresPhoto;
    }
    if (JSON.stringify(subtasks) !== JSON.stringify(task!.subtasks)) updates.subtasks = subtasks;
    const origPhotos = (task!.photos || []).map((p: any) => typeof p === "string" ? p : p.url || "").filter(Boolean);
    if (JSON.stringify(photos) !== JSON.stringify(origPhotos)) updates.photos = photos;
    if (Object.keys(updates).length > 0) onSave(task!.id, updates);
    onOpenChange(false);
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks((prev) => [...prev, { id: `st-${Date.now()}`, title: newSubtaskTitle.trim(), completed: false }]);
    setNewSubtaskTitle("");
  };
  const handleRemoveSubtask = (id: string) => setSubtasks((prev) => prev.filter((s) => s.id !== id));
  const handleToggleSubtask = (id: string) => setSubtasks((prev) => prev.map((s) => s.id === id ? { ...s, completed: !s.completed } : s));
  const handleRemovePhoto = (url: string) => { if (!window.confirm("Eliminar esta foto?")) return; setPhotos((prev) => prev.filter((p) => p !== url)); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="mt-8 pb-2">
            <span className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold w-full justify-center", task.type === "EXTRA" ? "bg-amber-500 text-white" : "border-2 border-corporate text-corporate bg-corporate/5")}>
              {task.type === "EXTRA" ? <Plus className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              Editar {task.type === "EXTRA" ? "Tarea Extra" : "Tarea Especifica"}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 space-y-6">

          {/* ===== BLOQUE 1: INFORMACION DE LA TAREA ===== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
              <FileText className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">Informacion de la Tarea</p>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Titulo</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEditAll} className="mt-1 bg-white" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Prioridad</Label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(priorityConfig).map(([key, cfg]) => (
                  <button key={key} type="button" disabled={!canEditAll} onClick={() => setPriority(key as TaskPriority)}
                    className={cn("py-2.5 px-2 rounded-xl text-xs font-semibold text-white transition-all", cfg.color, priority === key ? "ring-2 ring-offset-1 ring-gray-400 scale-105" : "opacity-60 hover:opacity-100", !canEditAll && "cursor-not-allowed opacity-40")}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Descripcion</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe la tarea..." rows={3} disabled={!canEditAll} className="mt-1 bg-white resize-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subtareas</Label>
              {subtasks.length > 0 && (
                <div className="space-y-2">
                  {subtasks.map((st) => (
                    <div key={st.id} className="flex items-center gap-2 group">
                      <input type="checkbox" checked={st.completed} onChange={() => handleToggleSubtask(st.id)} className="w-4 h-4 rounded border-gray-300" />
                      <span className={cn("flex-1 text-sm", st.completed ? "text-[#86868B] line-through" : "text-[#1D1D1F]")}>{st.title}</span>
                      <button onClick={() => handleRemoveSubtask(st.id)} className="opacity-0 group-hover:opacity-100 p-1 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} placeholder="Nueva subtarea..." onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSubtask(); } }} className="flex-1" />
                <Button type="button" size="sm" variant="outline" onClick={handleAddSubtask} disabled={!newSubtaskTitle.trim()}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>

          {/* ===== BLOQUE 2: RESPONSABLE Y SUPERVISOR ===== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
              <Users className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">Responsable y Supervisor</p>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Departamento</Label>
              <div className="grid grid-cols-2 gap-2">
                {departmentNames.map((dept) => (
                  <button key={dept} type="button" disabled={!canEditAll} onClick={() => { setDepartment(dept); setAssignedTo([]); setSupervisorId(""); }}
                    className={cn("py-3 px-4 rounded-xl text-sm font-medium border-2 transition-all capitalize", department === dept ? "border-[#007AFF] bg-[#007AFF]/5 text-[#007AFF]" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300", !canEditAll && "opacity-50 cursor-not-allowed")}>
                    {dept.replace(/_/g, " ").toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Asignar a</Label>
              <div className="grid grid-cols-1 gap-2">
                {deptUsers.length > 0 ? deptUsers.map((u) => (
                  <button key={u.id} type="button" disabled={!canEditAll} onClick={() => toggleAssigned(u.id)}
                    className={cn("flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all text-left", assignedTo.includes(u.id) ? "border-[#007AFF] bg-[#007AFF]/5 text-[#007AFF]" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300", !canEditAll && "cursor-not-allowed opacity-40")}>
                    <User className="w-4 h-4 flex-shrink-0" />
                    <div className="min-w-0"><p className="font-medium truncate">{u.name}</p><p className="text-xs opacity-70 truncate">{u.position}</p></div>
                  </button>
                )) : <p className="text-xs text-gray-400 text-center py-3">No hay usuarios disponibles</p>}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Supervisor</Label>
              <div className="grid grid-cols-1 gap-2">
                <button type="button" disabled={!canEditAll} onClick={() => canEditAll && setSupervisorId("")}
                  className={cn("flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all text-left", supervisorId === "" ? "border-[#8B5CF6] bg-[#8B5CF6]/5 text-[#8B5CF6]" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300", !canEditAll && "cursor-not-allowed opacity-40")}>
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />Sin supervisor
                </button>
                {supervisors.map((s) => (
                  <button key={s.id} type="button" disabled={!canEditAll} onClick={() => canEditAll && setSupervisorId(s.id)}
                    className={cn("flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all text-left", supervisorId === s.id ? "border-[#8B5CF6] bg-[#8B5CF6]/5 text-[#8B5CF6]" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300", !canEditAll && "cursor-not-allowed opacity-40")}>
                    <ShieldCheck className="w-4 h-4 flex-shrink-0" />{s.name}
                  </button>
                ))}
              </div>
              {supervisors.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No hay supervisores para este departamento</p>}
            </div>
          </div>

          {/* ===== BLOQUE 3: PROGRAMACION ===== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
              <Clock className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">Programacion</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha de inicio</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!canEditAll} className="mt-1 bg-white" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hora de inicio (24h)</Label>
                <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} disabled={!canEditAll} className="mt-1 bg-white" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Tiempo estimado</Label>
              <div className="grid grid-cols-5 gap-2">
                {timeButtons.map((m) => (
                  <button key={m} type="button" disabled={!canEditAll} onClick={() => { setEstimatedMinutes(m); setShowCustomTime(false); setCustomMinutes(""); }}
                    className={cn("py-2 px-1 rounded-xl text-xs font-medium border-2 transition-all", estimatedMinutes === m && !showCustomTime ? "border-[#007AFF] bg-[#007AFF]/5 text-[#007AFF]" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300", !canEditAll && "cursor-not-allowed opacity-40")}>
                    {m}m
                  </button>
                ))}
                <button type="button" disabled={!canEditAll} onClick={() => setShowCustomTime(true)}
                  className={cn("py-2 px-1 rounded-xl text-xs font-medium border-2 transition-all", showCustomTime ? "border-[#007AFF] bg-[#007AFF]/5 text-[#007AFF]" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300", !canEditAll && "cursor-not-allowed opacity-40")}>
                  Otro
                </button>
              </div>
              {showCustomTime && (
                <div className="flex items-center gap-2 mt-2">
                  <Input type="number" min={1} value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)} placeholder="Minutos" disabled={!canEditAll} className="w-32 bg-white" />
                  <span className="text-sm text-gray-500">min = {customMinutes ? `${Math.floor(Number(customMinutes) / 60)}h ${Number(customMinutes) % 60}min` : "—"}</span>
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha limite calculada</Label>
              <div className="flex items-center gap-2 mt-1 bg-slate-100 rounded-xl px-4 py-3 border border-slate-200">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700 font-medium">{calculatedDueLabel}</span>
              </div>
            </div>
          </div>

          {/* ===== BLOQUE 4: REQUISITOS ===== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
              <Camera className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">Requisitos</p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
              <input type="checkbox" id="edit-requiresPhoto" checked={requiresPhoto} onChange={(e) => setRequiresPhoto(e.target.checked)} disabled={!canEditAll} className="w-4 h-4 rounded border-gray-300" />
              <Label htmlFor="edit-requiresPhoto" className={cn("text-sm font-medium cursor-pointer", !canEditAll && "opacity-50")}>Requiere foto para completar</Label>
            </div>
          </div>

          {/* ===== BLOQUE 5: SOLICITAR APOYO ===== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
              <Zap className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">Solicitar Apoyo</p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
              <input type="checkbox" id="showSupport" checked={showSupport} onChange={(e) => { setShowSupport(e.target.checked); if (!e.target.checked) { setSupportUserIds([]); setSupportDepartment(""); } }} disabled={!canEditAll} className="w-4 h-4 rounded border-gray-300" />
              <Label htmlFor="showSupport" className={cn("text-sm font-medium cursor-pointer", !canEditAll && "opacity-50")}>Solicitar apoyo de otros departamentos</Label>
            </div>
            {showSupport && (
              <div className="space-y-3 pl-2 border-l-2 border-amber-200">
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Departamento de apoyo</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {departmentNames.filter((d) => d !== department).map((dept) => (
                      <button key={dept} type="button" disabled={!canEditAll} onClick={() => { setSupportDepartment(dept); setSupportUserIds([]); }}
                        className={cn("py-3 px-4 rounded-xl text-sm font-medium border-2 transition-all capitalize", supportDepartment === dept ? "border-[#FF9500] bg-[#FF9500]/5 text-[#FF9500]" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300", !canEditAll && "opacity-50 cursor-not-allowed")}>
                        {dept.replace(/_/g, " ").toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
                {supportDepartment && (
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Usuarios de apoyo</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {supportDeptUsers.length > 0 ? supportDeptUsers.map((u) => (
                        <button key={u.id} type="button" disabled={!canEditAll} onClick={() => toggleSupport(u.id)}
                          className={cn("flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all text-left", supportUserIds.includes(u.id) ? "border-[#FF9500] bg-[#FF9500]/5 text-[#FF9500]" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300", !canEditAll && "cursor-not-allowed opacity-40")}>
                          <User className="w-4 h-4 flex-shrink-0" />
                          <div className="min-w-0"><p className="font-medium truncate">{u.name}</p><p className="text-xs opacity-70 truncate">{u.department?.replace(/_/g, " ")} - {u.position}</p></div>
                        </button>
                      )) : <p className="text-xs text-gray-400 text-center py-3">No hay usuarios disponibles</p>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fotos */}
          {photos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                <Camera className="w-4 h-4 text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">Fotos de evidencia</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={p} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => handleRemovePhoto(p)} className="absolute top-1 right-1 w-5 h-5 bg-[#FF3B30] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-12 rounded-xl border-gray-300 text-gray-700 font-medium">Cancelar</Button>
            <Button onClick={handleSave} className="flex-1 h-12 rounded-xl bg-corporate hover:bg-corporate/90 text-white font-medium">Guardar cambios</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
