// TURNOS TAB - CRUD de turnos por departamento
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '@/firebase-config';
import { useDynamicDepartments } from '@/hooks/firestore/useDynamicDepartments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

export function TurnosTab() {
  const { departmentOptions } = useDynamicDepartments();
  const [firestoreShifts, setFirestoreShifts] = useState<Record<string, any>>({});
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

  // Listen to Firestore shifts
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'shifts'), (snap) => {
      const data: Record<string, any> = {};
      snap.docs.forEach(d => {
        const docData = d.data();
        data[d.id] = { _docId: d.id, id: docData.id || d.id, ...docData };
      });
      setFirestoreShifts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Combine static + Firestore shifts
  const allShifts = useMemo(() => {
    return Object.values(firestoreShifts).filter((fs: any) => fs.name && fs.startTime && fs.isActive !== false) as Shift[];
  }, [firestoreShifts]);

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
      await setDoc(doc(db, "shifts", docRefId), {
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
    : allShifts.filter(s => s.department === filterDept);

  if (loading) return <div className="p-8 text-center text-[#86868B]">Cargando turnos...</div>;


  // Migrar turnos estaticos a Firestore

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
        {departmentOptions.map(d => (
          <button key={d.code} onClick={() => setFilterDept(d.code)} className={cn('px-3 py-1.5 rounded-full text-sm whitespace-nowrap', filterDept === d.code ? 'bg-corporate text-white' : 'bg-[#F5F5F7] text-[#86868B]')}>{d.name}</button>
        ))}
      </div>

      {/* Lista de turnos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredShifts.map(shift => (
          <Card key={shift.id} className="overflow-hidden">
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
                <div className="flex gap-1">
                  <button onClick={() => openEdit(shift)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(shift)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#86868B] hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredShifts.length === 0 && (
          <div className="col-span-full text-center py-12 text-[#86868B]">
            No hay turnos {filterDept !== 'all' && 'para este departamento'}
          </div>
        )}
      </div>

      {/* Modal */}
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
                {departmentOptions.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
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
    </div>
  );
}
