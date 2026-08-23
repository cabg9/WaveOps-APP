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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section } from "@/components/ui/Section";
import { Task, TaskPriority, Subtask } from "@/types";
import { useDynamicDepartments, normalizeDeptCode } from "@/hooks/firestore/useDynamicDepartments";
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
  const { departmentTreeOptions, defaultDepartment } = useDynamicDepartments();
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

  const deptUsers = allUsers.filter((u) => normalizeDeptCode(u.department || '') === normalizeDeptCode(department || '') && u.isActive !== false);
  const supervisors = deptUsers.filter((u) => u.role === "SUPERVISOR" || u.role === "GERENTE_DEPARTAMENTO");
  const supportDeptUsers = supportDepartment ? allUsers.filter((u) => normalizeDeptCode(u.department || '') === normalizeDeptCode(supportDepartment || '') && u.isActive !== false) : [];

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
            <span className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold w-full justify-center", task.type === "EXTRA" ? "bg-amber-500 text-white" : "border-2 border-corporate text-corporate bg-corporate/5")}>
              {task.type === "EXTRA" ? <Plus className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              Editar {task.type === "EXTRA" ? "Tarea Extra" : "Tarea Especifica"}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-8 space-y-4">

          {/* SECCIÓN 1: Información de la tarea */}
          <Section title="Información de la tarea" icon={FileText}>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEditAll} />
            </div>

            <div className="space-y-2">
              <Label>Prioridad</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(priorityConfig).map(([key, cfg]) => (
                  <button key={key} type="button" disabled={!canEditAll} onClick={() => setPriority(key as TaskPriority)}
                    className={cn("px-2 py-2 rounded-xl text-sm font-medium transition-all border", priority === key ? `${cfg.color} text-white border-transparent` : "bg-white text-[#86868B] border-[#E5E5E7] hover:text-[#1D1D1F]", !canEditAll && "cursor-not-allowed opacity-40")}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe la tarea..." rows={3} disabled={!canEditAll} />
            </div>

            <div className="space-y-2">
              <Label>Subtareas</Label>
              {subtasks.length > 0 && (
                <div className="space-y-2">
                  {subtasks.map((st) => (
                    <div key={st.id} className="flex items-center gap-2 group">
                      <input type="checkbox" checked={st.completed} onChange={() => handleToggleSubtask(st.id)} className="w-4 h-4 rounded border-[#E5E5E7]" />
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
          </Section>

          {/* SECCIÓN 2: Responsable y Supervisor */}
          <Section title="Responsable y Supervisor" icon={Users}>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <div className="flex flex-wrap gap-2">
                {departmentTreeOptions.map((dept) => (
                  <button key={dept.code} type="button" disabled={!canEditAll} onClick={() => { setDepartment(dept.code); setAssignedTo([]); setSupervisorId(""); }}
                    className={cn("px-3 py-2 rounded-xl text-sm font-medium transition-all border capitalize", department === dept.code ? "border-corporate text-corporate bg-corporate/5" : "border-[#E5E5E7] text-[#86868B] hover:bg-[#F5F5F7]", !canEditAll && "opacity-50 cursor-not-allowed")}
                    style={{ marginLeft: `${dept.level * 16}px` }}>
                    {dept.level > 0 ? '└─ ' : ''}{dept.name.replace(/_/g, " ").toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Asignar a</Label>
              <div className="grid grid-cols-1 gap-2">
                {deptUsers.length > 0 ? deptUsers.map((u) => (
                  <button key={u.id} type="button" disabled={!canEditAll} onClick={() => toggleAssigned(u.id)}
                    className={cn("flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all text-left", assignedTo.includes(u.id) ? "border-corporate text-corporate bg-corporate/5" : "border-[#E5E5E7] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]", !canEditAll && "cursor-not-allowed opacity-40")}>
                    <User className="w-4 h-4 flex-shrink-0 text-[#86868B]" />
                    <div className="min-w-0"><p className="font-medium truncate">{u.name}</p><p className="text-xs text-[#86868B] truncate">{u.position}</p></div>
                  </button>
                )) : <p className="text-xs text-[#86868B] text-center py-3">No hay usuarios disponibles</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Supervisor</Label>
              <div className="grid grid-cols-1 gap-2">
                <button type="button" disabled={!canEditAll} onClick={() => canEditAll && setSupervisorId("")}
                  className={cn("flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all text-left", supervisorId === "" ? "border-[#8B5CF6] bg-[#8B5CF6]/5 text-[#8B5CF6]" : "border-[#E5E5E7] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]", !canEditAll && "cursor-not-allowed opacity-40")}>
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />Sin supervisor
                </button>
                {supervisors.map((s) => (
                  <button key={s.id} type="button" disabled={!canEditAll} onClick={() => canEditAll && setSupervisorId(s.id)}
                    className={cn("flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all text-left", supervisorId === s.id ? "border-[#8B5CF6] bg-[#8B5CF6]/5 text-[#8B5CF6]" : "border-[#E5E5E7] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]", !canEditAll && "cursor-not-allowed opacity-40")}>
                    <ShieldCheck className="w-4 h-4 flex-shrink-0" />{s.name}
                  </button>
                ))}
              </div>
              {supervisors.length === 0 && <p className="text-xs text-[#86868B] text-center py-3">No hay supervisores para este departamento</p>}
            </div>
          </Section>

          {/* SECCIÓN 3: Programación */}
          <Section title="Programación" icon={Clock}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de inicio</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!canEditAll} />
              </div>
              <div className="space-y-2">
                <Label>Hora de inicio *</Label>
                <div className="flex items-center gap-2">
                  <Select value={dueTime.split(':')[0] || '08'} onValueChange={(h) => setDueTime(`${h.padStart(2,'0')}:${dueTime.split(':')[1] || '00'}`)} disabled={!canEditAll}>
                    <SelectTrigger className="w-20 h-10 text-center"><SelectValue placeholder="HH" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span className="text-[#86868B] font-medium">:</span>
                  <Select value={dueTime.split(':')[1] || '00'} onValueChange={(m) => setDueTime(`${dueTime.split(':')[0] || '08'}:${m.padStart(2,'0')}`)} disabled={!canEditAll}>
                    <SelectTrigger className="w-20 h-10 text-center"><SelectValue placeholder="MM" /></SelectTrigger>
                    <SelectContent>
                      {[0,15,30,45].map((m) => { const ms = String(m).padStart(2,'0'); return <SelectItem key={ms} value={ms}>{ms}</SelectItem>; })}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-[#86868B]">Formato 24 horas</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tiempo estimado</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {timeButtons.map((m) => (
                  <button key={m} type="button" disabled={!canEditAll} onClick={() => { setEstimatedMinutes(m); setShowCustomTime(false); setCustomMinutes(""); }}
                    className={cn("px-2 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all border", estimatedMinutes === m && !showCustomTime ? "border-corporate text-corporate bg-white" : "bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5E7]", !canEditAll && "cursor-not-allowed opacity-40")}>
                    {m}m
                  </button>
                ))}
                <button type="button" disabled={!canEditAll} onClick={() => setShowCustomTime(true)}
                  className={cn("px-2 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all border", showCustomTime ? "border-corporate text-corporate bg-white" : "bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5E7]", !canEditAll && "cursor-not-allowed opacity-40")}>
                  Otro
                </button>
              </div>
              {showCustomTime && (
                <div className="flex items-center gap-2 pt-1">
                  <Input type="number" min={1} value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)} placeholder="Minutos" disabled={!canEditAll} className="w-32" />
                  <span className="text-sm text-[#86868B]">min = {customMinutes ? `${Math.floor(Number(customMinutes) / 60)}h ${Number(customMinutes) % 60}min` : "—"}</span>
                </div>
              )}
            </div>

            <div className="bg-corporate/5 rounded-xl p-3 flex items-center gap-2 border border-corporate/20">
              <Clock className="w-4 h-4 text-corporate" />
              <span className="text-sm text-[#1D1D1F]">Fecha límite calculada</span>
              <span className="text-sm font-semibold text-corporate ml-auto">{calculatedDueLabel}</span>
            </div>
          </Section>

          {/* SECCIÓN 4: Requisitos */}
          <Section title="Requisitos" icon={Camera}>
            <div className="flex items-center gap-3 p-3 bg-[#F5F5F7] rounded-xl">
              <input type="checkbox" id="edit-requiresPhoto" checked={requiresPhoto} onChange={(e) => setRequiresPhoto(e.target.checked)} disabled={!canEditAll} className="w-4 h-4 rounded border-[#E5E5E7] text-corporate focus:ring-corporate" />
              <Label htmlFor="edit-requiresPhoto" className={cn("text-sm font-medium text-[#1D1D1F] mb-0 cursor-pointer", !canEditAll && "opacity-50")}>Requiere foto para completar</Label>
            </div>
          </Section>

          {/* SECCIÓN 5: Solicitar Apoyo */}
          <Section title="Solicitar Apoyo" icon={Zap}>
            <div className="flex items-center gap-3 p-3 bg-[#F5F5F7] rounded-xl">
              <input type="checkbox" id="showSupport" checked={showSupport} onChange={(e) => { setShowSupport(e.target.checked); if (!e.target.checked) { setSupportUserIds([]); setSupportDepartment(""); } }} disabled={!canEditAll} className="w-4 h-4 rounded border-[#E5E5E7] text-corporate focus:ring-corporate" />
              <Label htmlFor="showSupport" className={cn("text-sm font-medium text-[#1D1D1F] mb-0 cursor-pointer", !canEditAll && "opacity-50")}>Solicitar apoyo de otros departamentos</Label>
            </div>
            {showSupport && (
              <div className="space-y-3 pl-2 border-l-2 border-corporate/30">
                <div className="space-y-2">
                  <Label>Departamento de apoyo</Label>
                  <div className="flex flex-wrap gap-2">
                    {departmentTreeOptions.filter((d) => d.code !== department).map((dept) => (
                      <button key={dept.code} type="button" disabled={!canEditAll} onClick={() => { setSupportDepartment(dept.code); setSupportUserIds([]); }}
                        className={cn("px-3 py-2 rounded-xl text-sm font-medium transition-all border capitalize", supportDepartment === dept.code ? "border-corporate text-corporate bg-corporate/5" : "border-[#E5E5E7] text-[#86868B] hover:bg-[#F5F5F7]", !canEditAll && "opacity-50 cursor-not-allowed")}
                        style={{ marginLeft: `${dept.level * 16}px` }}>
                        {dept.level > 0 ? '└─ ' : ''}{dept.name.replace(/_/g, " ").toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
                {supportDepartment && (
                  <div className="space-y-2">
                    <Label>Usuarios de apoyo</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {supportDeptUsers.length > 0 ? supportDeptUsers.map((u) => (
                        <button key={u.id} type="button" disabled={!canEditAll} onClick={() => toggleSupport(u.id)}
                          className={cn("flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all text-left", supportUserIds.includes(u.id) ? "border-corporate text-corporate bg-corporate/5" : "border-[#E5E5E7] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]", !canEditAll && "cursor-not-allowed opacity-40")}>
                          <User className="w-4 h-4 flex-shrink-0 text-[#86868B]" />
                          <div className="min-w-0"><p className="font-medium truncate">{u.name}</p><p className="text-xs text-[#86868B] truncate">{u.department?.replace(/_/g, " ")} - {u.position}</p></div>
                        </button>
                      )) : <p className="text-xs text-[#86868B] text-center py-3">No hay usuarios disponibles</p>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* SECCIÓN 6: Fotos de evidencia */}
          {photos.length > 0 && (
            <Section title="Fotos de evidencia" icon={Camera}>
              <div className="flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-[#E5E5E7] group">
                    <img src={p} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => handleRemovePhoto(p)} className="absolute top-1 right-1 w-5 h-5 bg-[#FF3B30] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleSave} className="bg-corporate hover:bg-corporate/90 text-white w-full sm:w-auto">Guardar cambios</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
