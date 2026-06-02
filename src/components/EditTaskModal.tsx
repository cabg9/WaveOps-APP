import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Task, TaskPriority, Department, Subtask } from '@/types';
import { useFirestoreUsers } from '@/hooks/firestore/useFirestoreUsers';
import { getPriorityColor, getPriorityLabel, cn } from '@/lib/utils';

interface EditTaskModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (taskId: string, updates: Partial<Task>) => void;
  canEditAll: boolean;
}

const DEPARTMENTS = Object.values(Department);
const PRIORITIES = Object.values(TaskPriority);

export function EditTaskModal({ task, open, onOpenChange, onSave, canEditAll }: EditTaskModalProps) {
  const { users: allUsers } = useFirestoreUsers();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [department, setDepartment] = useState<Department>(Department.DIVE_SHOP);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [supportUserIds, setSupportUserIds] = useState<string[]>([]);
  const [supervisorId, setSupervisorId] = useState('');
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // Cargar datos de la tarea cuando se abre
  useEffect(() => {
    if (task && open) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || TaskPriority.MEDIUM);
      setDepartment(task.department || Department.DIVE_SHOP);
      setDueDate(task.dueDate || '');
      setDueTime(task.dueTime || '');
      setEstimatedMinutes(task.estimatedMinutes || '');
      setAssignedTo(task.assignedTo || []);
      setSupportUserIds(task.supportUserIds || []);
      setSupervisorId(task.supervisorId || '');
      setRequiresPhoto(task.requiresPhoto || false);
      setSubtasks(task.subtasks || []);
      // Asegurar que photos sean strings (URLs de Firebase)
      const taskPhotos = (task.photos || []).map((p: any) => typeof p === 'string' ? p : p.url || '');
      setPhotos(taskPhotos.filter(Boolean));
    }
  }, [task, open]);

  if (!task) return null;

  // Usuarios del mismo departamento
  const deptUsers = allUsers.filter((u) => u.department === department && u.isActive !== false);
  // Supervisores del departamento
  const supervisors = deptUsers.filter((u) => u.role === 'SUPERVISOR' || u.role === 'GERENTE_DEPARTAMENTO');

  const handleSave = () => {
    const updates: Partial<Task> = {};

    if (canEditAll) {
      if (title !== task.title) updates.title = title;
      if (description !== task.description) updates.description = description;
      if (priority !== task.priority) updates.priority = priority;
      if (department !== task.department) updates.department = department;
      if (dueDate !== task.dueDate) updates.dueDate = dueDate;
      if (dueTime !== task.dueTime) updates.dueTime = dueTime;
      if (Number(estimatedMinutes) !== task.estimatedMinutes) updates.estimatedMinutes = estimatedMinutes ? Number(estimatedMinutes) : undefined;
      if (JSON.stringify(assignedTo) !== JSON.stringify(task.assignedTo)) updates.assignedTo = assignedTo;
      if (JSON.stringify(supportUserIds) !== JSON.stringify(task.supportUserIds)) updates.supportUserIds = supportUserIds;
      if (supervisorId !== task.supervisorId) updates.supervisorId = supervisorId || undefined;
      if (requiresPhoto !== task.requiresPhoto) updates.requiresPhoto = requiresPhoto;
    }

    // Subtareas y fotos siempre editables
    if (JSON.stringify(subtasks) !== JSON.stringify(task.subtasks)) updates.subtasks = subtasks;
    if (JSON.stringify(photos) !== JSON.stringify(task.photos)) updates.photos = photos;

    // Solo enviar si hay cambios
    if (Object.keys(updates).length > 0) {
      onSave(task.id, updates);
    }
    onOpenChange(false);
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSubtask: Subtask = {
      id: `st-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    setSubtasks((prev) => [...prev, newSubtask]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (subtaskId: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
  };

  const handleToggleSubtask = (subtaskId: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleRemovePhoto = (photoUrl: string) => {
    if (!window.confirm('Eliminar esta foto?')) return;
    setPhotos((prev) => prev.filter((p) => p !== photoUrl));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1D1D1F]">Editar Tarea</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title" className="text-sm font-medium text-[#1D1D1F]">Titulo</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEditAll} className="h-10" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description" className="text-sm font-medium text-[#1D1D1F]">Descripcion</Label>
            <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEditAll} rows={3} />
          </div>

          {/* Priority & Department */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#1D1D1F]">Prioridad</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)} disabled={!canEditAll}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getPriorityColor(p) }} />
                        {getPriorityLabel(p)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#1D1D1F]">Departamento</Label>
              <Select value={department} onValueChange={(v) => setDepartment(v as Department)} disabled={!canEditAll}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-dueDate" className="text-sm font-medium text-[#1D1D1F]">Fecha limite</Label>
              <Input id="edit-dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!canEditAll} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dueTime" className="text-sm font-medium text-[#1D1D1F]">Hora limite</Label>
              <Input id="edit-dueTime" type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} disabled={!canEditAll} />
            </div>
          </div>

          {/* Estimated Time */}
          <div className="space-y-2">
            <Label htmlFor="edit-estimated" className="text-sm font-medium text-[#1D1D1F]">Tiempo estimado (minutos)</Label>
            <Input id="edit-estimated" type="number" min={0} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value ? Number(e.target.value) : '')} disabled={!canEditAll} className="w-32" />
          </div>

          {/* Supervisor */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#1D1D1F]">Supervisor</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => canEditAll && setSupervisorId('')}
                disabled={!canEditAll}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  supervisorId === '' ? 'bg-corporate text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  !canEditAll && 'opacity-50 cursor-not-allowed'
                )}
              >
                Sin supervisor
              </button>
              {supervisors.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => canEditAll && setSupervisorId(s.id)}
                  disabled={!canEditAll}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    supervisorId === s.id ? 'bg-corporate text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    !canEditAll && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Assigned To - Checkboxes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#1D1D1F]">Asignado a</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
              {deptUsers.length > 0 ? deptUsers.map((u) => (
                <label key={u.id} className={cn(
                  'flex items-center gap-3 p-2 rounded cursor-pointer overflow-hidden',
                  canEditAll ? 'hover:bg-slate-50' : 'opacity-50 cursor-not-allowed'
                )}>
                  <input
                    type="checkbox"
                    checked={assignedTo.includes(u.id)}
                    onChange={(e) => {
                      if (!canEditAll) return;
                      if (e.target.checked) {
                        setAssignedTo((prev) => [...prev, u.id]);
                      } else {
                        setAssignedTo((prev) => prev.filter((id) => id !== u.id));
                      }
                    }}
                    disabled={!canEditAll}
                    className="w-4 h-4 rounded border-slate-300 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{u.name}</div>
                    <div className="text-xs text-slate-500 truncate">{u.position} - {u.role.replace(/_/g, ' ')}</div>
                  </div>
                </label>
              )) : <p className="text-sm text-slate-500 p-2">No hay usuarios disponibles</p>}
            </div>
          </div>

          {/* Support Users - Checkboxes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#1D1D1F]">Usuarios de apoyo</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
              {allUsers.filter((u) => u.isActive !== false).length > 0 ? allUsers.filter((u) => u.isActive !== false).map((u) => (
                <label key={u.id} className={cn(
                  'flex items-center gap-3 p-2 rounded cursor-pointer overflow-hidden',
                  canEditAll ? 'hover:bg-slate-50' : 'opacity-50 cursor-not-allowed'
                )}>
                  <input
                    type="checkbox"
                    checked={supportUserIds.includes(u.id)}
                    onChange={(e) => {
                      if (!canEditAll) return;
                      if (e.target.checked) {
                        setSupportUserIds((prev) => [...prev, u.id]);
                      } else {
                        setSupportUserIds((prev) => prev.filter((id) => id !== u.id));
                      }
                    }}
                    disabled={!canEditAll}
                    className="w-4 h-4 rounded border-slate-300 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{u.name}</div>
                    <div className="text-xs text-slate-500 truncate">{u.department?.replace(/_/g, ' ')} - {u.position}</div>
                  </div>
                </label>
              )) : <p className="text-sm text-slate-500 p-2">No hay usuarios disponibles</p>}
            </div>
          </div>

          {/* Requires Photo */}
          {canEditAll && (
            <div className="flex items-center gap-3">
              <input type="checkbox" id="edit-requiresPhoto" checked={requiresPhoto} onChange={(e) => setRequiresPhoto(e.target.checked)} className="w-4 h-4 rounded border-gray-300" />
              <Label htmlFor="edit-requiresPhoto" className="text-sm text-[#1D1D1F]">Requiere foto obligatoria</Label>
            </div>
          )}

          {/* Subtasks */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-[#1D1D1F]">Subtareas</Label>
            {subtasks.length > 0 && (
              <div className="space-y-2">
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 group">
                    <input type="checkbox" checked={subtask.completed} onChange={() => handleToggleSubtask(subtask.id)} className="w-4 h-4 rounded border-gray-300" />
                    <span className={cn('flex-1 text-sm', subtask.completed ? 'text-[#86868B] line-through' : 'text-[#1D1D1F]')}>{subtask.title}</span>
                    <button onClick={() => handleRemoveSubtask(subtask.id)} className="opacity-0 group-hover:opacity-100 p-1 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} placeholder="Nueva subtarea..." onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }} className="flex-1" />
              <Button type="button" size="sm" variant="outline" onClick={handleAddSubtask} disabled={!newSubtaskTitle.trim()}><Plus className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-[#1D1D1F]">Fotos</Label>
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photos.map((photo, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => handleRemovePhoto(photo)} className="absolute top-1 right-1 w-5 h-5 bg-[#FF3B30] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#FF3B30]/90">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-corporate hover:bg-corporate/90 text-white">Guardar cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
