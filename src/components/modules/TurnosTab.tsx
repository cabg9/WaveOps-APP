// TURNOS TAB - CRUD de turnos por departamento
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase-config';
import { useDynamicDepartments, normalizeDeptCode } from '@/hooks/firestore/useDynamicDepartments';
import { useFirestoreShifts } from '@/hooks/firestore/useFirestoreShifts';
import { useSpecificTaskTemplates } from '@/hooks/firestore/useSpecificTaskTemplates';
import { useFirestoreUsers } from '@/hooks/firestore/useFirestoreUsers';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/UserAvatar';
import { SpecificTaskForm, SpecificTaskFormData } from '@/components/SpecificTaskForm';
import { Plus, Pencil, Trash2, Clock, Eye, Users, CheckSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Role, TaskPriority, TaskVigencia, SpecificTaskTemplate } from '@/types';

interface Shift {
  id: string;
  name: string;
  department: string;
  startTime: string;
  endTime: string;
  color: string;
}

const COLORS = [
  '#007AFF', '#34C759', '#5856D6', '#FF9500', '#FF3B30',
  '#5AC8FA', '#AF52DE', '#FFCC00', '#8E8E93', '#1C1C1E',
];

function generateShiftId(name: string, dept: string) {
  const deptPrefix = dept.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 4);
  const nameSuffix = name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 6);
  return `${deptPrefix}-${nameSuffix}`;
}

function calculateDueTime(startTime: string, estimatedMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes + estimatedMinutes, 0, 0);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function TurnosTab() {
  const { departmentOptions, departmentTreeOptions } = useDynamicDepartments();
  const { shifts: firestoreShifts, assignments } = useFirestoreShifts();
  const { templates, createTemplate, updateTemplate, deleteTemplate } = useSpecificTaskTemplates();
  const { users } = useFirestoreUsers();
  const { tasks } = useTasks();
  const { user: currentUser } = useAuth();

  const [firestoreShiftsLocal, setFirestoreShiftsLocal] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [filterDept, setFilterDept] = useState<string>('all');

  const [form, setForm] = useState({
    name: '',
    department: '',
    startTime: '08:00',
    endTime: '16:00',
    color: '#007AFF',
  });

  // Modales de detalle y edición de plantilla
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SpecificTaskTemplate | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState<SpecificTaskFormData>({
    title: '',
    description: '',
    department: '',
    shiftIds: [],
    startTime: '08:00',
    estimatedMinutes: 60,
    priority: TaskPriority.MEDIUM,
    requiresPhoto: false,
    vigenciaDays: TaskVigencia.INDEFINIDO,
    subtasks: [],
  });

  // Listen to Firestore shifts (fallback si useFirestoreShifts aún no carga)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'shifts'), (snap) => {
      const data: Record<string, any> = {};
      snap.docs.forEach(d => {
        const docData = d.data();
        data[d.id] = { _docId: d.id, id: docData.id || d.id, ...docData };
      });
      setFirestoreShiftsLocal(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Combine static + Firestore shifts
  const allShifts = useMemo(() => {
    const fromHook = firestoreShifts || [];
    const merged = fromHook.length > 0 ? fromHook : Object.values(firestoreShiftsLocal);
    return merged.filter((fs: any) => fs.name && fs.startTime && fs.isActive !== false) as Shift[];
  }, [firestoreShifts, firestoreShiftsLocal]);

  const resetForm = () => {
    setForm({ name: '', department: departmentOptions[0]?.code || '', startTime: '08:00', endTime: '16:00', color: '#007AFF' });
    setEditingShift(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (shift: Shift) => {
    setEditingShift(shift);
    setForm({
      name: shift.name,
      department: shift.department,
      startTime: shift.startTime,
      endTime: shift.endTime,
      color: shift.color,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.department) {
      toast.error('Nombre y departamento son obligatorios');
      return;
    }
    try {
      const shiftId = editingShift ? editingShift.id : generateShiftId(form.name, form.department);
      await setDoc(doc(db, 'shifts', shiftId), {
        id: shiftId,
        name: form.name,
        department: form.department,
        startTime: form.startTime,
        endTime: form.endTime,
        color: form.color,
        updatedAt: new Date().toISOString(),
        ...(editingShift ? {} : { createdAt: new Date().toISOString() }),
      });
      toast.success(editingShift ? 'Turno actualizado' : 'Turno creado');
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleDelete = async (shift: Shift) => {
    if (!confirm(`Mover turno "${shift.name}" a la papelera?`)) return;
    try {
      const docRefId = (shift as any)._docId || shift.id;
      await setDoc(doc(db, 'shifts', docRefId), {
        ...shift,
        isActive: false,
        deletedAt: new Date().toISOString(),
      }, { merge: true });
      toast.success('Turno movido a papelera');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const filteredShifts = filterDept === 'all'
    ? allShifts
    : allShifts.filter(s => normalizeDeptCode(s.department || '') === normalizeDeptCode(filterDept || ''));

  // ── Detalle del turno ──
  const openDetail = (shift: Shift) => {
    setSelectedShift(shift);
    setShowDetailModal(true);
  };

  const getTemplatesForShift = (shift: Shift) => {
    return templates.filter((t: SpecificTaskTemplate) => {
      const shiftIds = t.shiftIds || (t.shiftId ? [t.shiftId] : []);
      return shiftIds.includes(shift.id);
    });
  };

  const getAssignedPeopleForShift = (shift: Shift) => {
    const shiftAssignments = assignments.filter(
      (a: any) => a.shiftId === shift.id && a.status === 'PUBLICADO'
    );
    const map = new Map<string, { user: any; dates: string[] }>();
    shiftAssignments.forEach((a: any) => {
      const user = users.find((u: any) => u.id === a.userId);
      if (!user) return;
      if (!map.has(user.id)) {
        map.set(user.id, { user, dates: [] });
      }
      map.get(user.id)!.dates.push(a.date);
    });
    return Array.from(map.values()).map((entry) => ({
      ...entry,
      dates: [...new Set(entry.dates)].sort(),
    }));
  };

  const getAssignedCountForTemplate = (templateId: string) => {
    return tasks
      .filter((t: any) => t.templateId === templateId && t.source === 'specific-task-template')
      .reduce((sum: number, t: any) => sum + (t.assignedTo?.length || 0), 0);
  };

  // ── Edición de plantilla ──
  const shiftsForTemplateForm = useMemo(() => {
    const deptCode = normalizeDeptCode(templateForm.department || '');
    return firestoreShifts.filter((s: any) => normalizeDeptCode(s.department || '') === deptCode && s.isActive !== false);
  }, [firestoreShifts, templateForm.department]);

  const templateSupervisorId = useMemo(() => {
    const deptCode = normalizeDeptCode(templateForm.department || '');
    if (!deptCode) return '';
    const deptUsers = users.filter((u: any) => normalizeDeptCode(u.department || '') === deptCode && u.isActive !== false);
    const selectedShiftIds = templateForm.shiftIds || [];

    // 1. Supervisor del dept que tenga alguno de los turnos seleccionados asignado (publicado)
    if (selectedShiftIds.length > 0) {
      const supervisorsWithShift = deptUsers.filter(
        (u: any) => u.role === Role.SUPERVISOR && assignments.some((a: any) => selectedShiftIds.includes(a.shiftId) && a.userId === u.id && a.status === 'PUBLICADO')
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
    const fallback = users
      .filter((u: any) => u.isActive !== false && [Role.DIRECTOR_GENERAL, Role.DIRECTOR, Role.GERENTE_OPERACIONES, Role.RRHH].includes(u.role))
      .sort((a: any, b: any) => (a.level || 7) - (b.level || 7))[0];
    return fallback?.id || '';
  }, [users, templateForm.department, templateForm.shiftIds, assignments]);

  const templateSupervisorName = useMemo(() => {
    const s = users.find((u: any) => u.id === templateSupervisorId);
    return s ? `${s.name} (${s.role.replace(/_/g, ' ')})` : '';
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
      return calculateDueTime(templateForm.startTime || '00:00', templateForm.estimatedMinutes || 0);
    } catch {
      return '';
    }
  }, [templateForm.startTime, templateForm.estimatedMinutes]);

  const openEditTemplate = (template: SpecificTaskTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      title: template.title || '',
      description: template.description || '',
      department: template.department || '',
      shiftIds: template.shiftIds || (template.shiftId ? [template.shiftId] : []),
      startTime: template.startTime || '08:00',
      estimatedMinutes: template.estimatedMinutes || 60,
      priority: (template.priority as TaskPriority) || TaskPriority.MEDIUM,
      requiresPhoto: template.requiresPhoto || false,
      vigenciaDays: template.vigenciaDays === null ? TaskVigencia.INDEFINIDO : (template.vigenciaDays as TaskVigencia) || TaskVigencia.INDEFINIDO,
      subtasks: template.subtasks || [],
    });
    setShowEditModal(true);
  };

  const closeEditTemplate = () => {
    setShowEditModal(false);
    setEditingTemplate(null);
    setTemplateForm({
      title: '',
      description: '',
      department: '',
      shiftIds: [],
      startTime: '08:00',
      estimatedMinutes: 60,
      priority: TaskPriority.MEDIUM,
      requiresPhoto: false,
      vigenciaDays: TaskVigencia.INDEFINIDO,
      subtasks: [],
    });
  };

  const openCreateTemplateForShift = (shift: Shift) => {
    setEditingTemplate(null);
    setTemplateForm({
      title: '',
      description: '',
      department: normalizeDeptCode(shift.department || ''),
      shiftIds: [shift.id],
      startTime: shift.startTime || '08:00',
      estimatedMinutes: 60,
      priority: TaskPriority.MEDIUM,
      requiresPhoto: false,
      vigenciaDays: TaskVigencia.INDEFINIDO,
      subtasks: [],
    });
    setShowEditModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!currentUser?.id) return;
    if (!templateForm.title.trim() || templateForm.shiftIds.length === 0) {
      toast.error('Completa el título y selecciona al menos un turno');
      return;
    }
    if (!templateSupervisorId) {
      toast.error('No se encontró un supervisor o gerente para el departamento');
      return;
    }
    const payload = {
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
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, payload);
        toast.success('Plantilla actualizada');
      } else {
        await createTemplate({ ...payload, createdBy: currentUser.id });
        toast.success('Plantilla creada');
      }
      closeEditTemplate();
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('¿Eliminar esta plantilla de tarea específica?')) return;
    try {
      await deleteTemplate(templateId);
      toast.success('Plantilla eliminada');
    } catch (err: any) {
      toast.error('Error al eliminar: ' + err.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-[#86868B]">Cargando turnos...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Turnos</h2>
          <p className="text-sm text-[#86868B]">{allShifts.length} turnos configurados</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreate} className="bg-corporate hover:bg-corporate/90 flex items-center gap-2 w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4" /> Nuevo Turno
          </Button>
        </div>
      </div>

      {/* Filtro por departamento */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => setFilterDept('all')} className={cn('px-3 py-1.5 rounded-full text-sm whitespace-nowrap', filterDept === 'all' ? 'bg-corporate text-white' : 'bg-[#F5F5F7] text-[#86868B]')}>Todos</button>
        {departmentTreeOptions.map(d => (
          <button key={d.code} onClick={() => setFilterDept(d.code)} className={cn('px-3 py-1.5 rounded-full text-sm whitespace-nowrap', filterDept === d.code ? 'bg-corporate text-white' : 'bg-[#F5F5F7] text-[#86868B]')} style={{ marginLeft: `${d.level * 12}px` }}>{d.level > 0 ? '└─ ' : ''}{d.name}</button>
        ))}
      </div>

      {/* Lista de turnos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredShifts.map(shift => {
          const shiftTemplates = getTemplatesForShift(shift);
          const assignedPeople = getAssignedPeopleForShift(shift);
          return (
            <Card key={shift.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(shift)}>
              <div className="h-2" style={{ backgroundColor: shift.color }} />
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-[#1D1D1F]">{shift.name}</h3>
                    <p className="text-xs text-[#86868B] mt-1">{shift.department?.replace(/_/g, ' ')}</p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-[#86868B]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{shift.startTime} - {shift.endTime}</span>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(shift)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(shift)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#86868B] hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#F5F5F7]">
                  <div className="flex items-center gap-1.5 text-xs text-[#86868B]">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{shiftTemplates.length} tarea{shiftTemplates.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#86868B]">
                    <Users className="w-3.5 h-3.5" />
                    <span>{assignedPeople.length} asignado{assignedPeople.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredShifts.length === 0 && (
          <div className="col-span-full text-center py-12 text-[#86868B]">
            No hay turnos {filterDept !== 'all' && 'para este departamento'}
          </div>
        )}
      </div>

      {/* Modal crear/editar turno */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingShift ? 'Editar Turno' : 'Nuevo Turno'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Mañana" />
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full h-10 rounded-lg border border-[#E5E5E7] px-3 text-sm">
                {departmentTreeOptions.map(d => <option key={d.code} value={d.code}>{'\u00A0\u00A0'.repeat(d.level)}{d.level > 0 ? '└─ ' : ''}{d.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hora inicio</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hora fin</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })} className={cn('w-8 h-8 rounded-full border-2', form.color === c ? 'border-corporate scale-110' : 'border-transparent')} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleSave} className="flex-1 bg-corporate hover:bg-corporate/90">{editingShift ? 'Actualizar' : 'Crear'}</Button>
              <Button variant="outline" onClick={() => setShowModal(false)} className="w-full sm:w-auto">Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal detalle del turno */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedShift && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${selectedShift.color}20` }}>
                    <Clock className="w-5 h-5" style={{ color: selectedShift.color }} />
                  </div>
                  <div>
                    <p className="text-lg">{selectedShift.name}</p>
                    <p className="text-sm font-normal text-[#86868B]">{selectedShift.department?.replace(/_/g, ' ')} · {selectedShift.startTime} - {selectedShift.endTime}</p>
                  </div>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-6">
              {/* Tareas específicas */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-[#1D1D1F] flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-corporate" />
                    Tareas específicas vinculadas
                  </h4>
                  <Button
                    size="sm"
                    onClick={() => selectedShift && openCreateTemplateForShift(selectedShift)}
                    className="bg-corporate hover:bg-corporate/90 text-white flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </Button>
                </div>
                {(() => {
                  const shiftTemplates = getTemplatesForShift(selectedShift);
                  if (shiftTemplates.length === 0) {
                    return <p className="text-sm text-[#86868B] bg-[#F5F5F7] rounded-lg p-3">No hay tareas específicas vinculadas a este turno.</p>;
                  }
                  return (
                    <div className="border border-[#E5E5E7] rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-[#F5F5F7] text-[#86868B]">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Título</th>
                            <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Inicio</th>
                            <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Supervisor</th>
                            <th className="text-left px-3 py-2 font-medium">Asignados</th>
                            <th className="text-right px-3 py-2 font-medium">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E5E7]">
                          {shiftTemplates.map((template) => {
                            const supervisor = users.find((u: any) => u.id === template.supervisorId);
                            const assignedCount = getAssignedCountForTemplate(template.id);
                            return (
                              <tr key={template.id} className="hover:bg-[#F5F5F7]/50">
                                <td className="px-3 py-2">
                                  <p className="font-medium text-[#1D1D1F]">{template.title}</p>
                                  {template.description && <p className="text-xs text-[#86868B] line-clamp-1">{template.description}</p>}
                                </td>
                                <td className="px-3 py-2 text-[#86868B] hidden sm:table-cell">{template.startTime} · {template.estimatedMinutes}m</td>
                                <td className="px-3 py-2 text-[#86868B] hidden sm:table-cell">{supervisor?.name || 'Sin asignar'}</td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex items-center gap-1 text-xs bg-[#F5F5F7] px-2 py-1 rounded-lg">
                                    <Users className="w-3 h-3" /> {assignedCount}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button onClick={() => openEditTemplate(template)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]"><Pencil className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => handleDeleteTemplate(template.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#86868B] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Personas asignadas */}
              <div>
                <h4 className="text-sm font-medium text-[#1D1D1F] mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-corporate" />
                  Personas asignadas recientemente
                </h4>
                {(() => {
                  const assignedPeople = getAssignedPeopleForShift(selectedShift);
                  if (assignedPeople.length === 0) {
                    return <p className="text-sm text-[#86868B] bg-[#F5F5F7] rounded-lg p-3">No hay asignaciones publicadas para este turno.</p>;
                  }
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {assignedPeople.map(({ user, dates }) => (
                        <div key={user.id} className="flex items-center gap-3 p-3 bg-[#F5F5F7] rounded-xl">
                          <UserAvatar name={user.name} photoUrl={user.photoURL || user.avatar} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1D1D1F] truncate">{user.name}</p>
                            <p className="text-xs text-[#86868B] truncate">{dates.length} día{dates.length !== 1 ? 's' : ''}: {dates.slice(0, 3).join(', ')}{dates.length > 3 ? '...' : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal editar plantilla */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Editar plantilla de tarea específica' : 'Nueva tarea específica para este turno'}</DialogTitle>
          </DialogHeader>
          <SpecificTaskForm
            form={templateForm}
            setForm={setTemplateForm}
            departments={departmentOptions.map((d: any) => ({ code: d.code || d.id, name: d.name }))}
            shifts={shiftsForTemplateForm}
            supervisorName={templateSupervisorName}
            observers={templateObservers}
            dueTime={templateDueTime}
            onCancel={closeEditTemplate}
            onSubmit={handleSaveTemplate}
            disabled={savingTemplate}
            isEditing={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
