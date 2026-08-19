// ═══════════════════════════════════════════════════════════════════
// FORMULARIO DE PLANTILLA DE TAREA ESPECÍFICA
// ═══════════════════════════════════════════════════════════════════

import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Section } from '@/components/ui/Section';
import { cn } from '@/lib/utils';
import { TaskPriority, TaskVigencia } from '@/types';

export interface SpecificTaskFormData {
  title: string;
  description: string;
  department: string;
  shiftIds: string[];
  startTime: string;
  estimatedMinutes: number;
  priority: TaskPriority;
  requiresPhoto: boolean;
  vigenciaDays: TaskVigencia;
}

interface SpecificTaskFormProps {
  form: SpecificTaskFormData;
  setForm: React.Dispatch<React.SetStateAction<SpecificTaskFormData>>;
  departments: { code: string; name: string }[];
  shifts: { id: string; name: string; startTime: string; endTime: string; department: string }[];
  supervisorName: string;
  observers: { name: string; role: string }[];
  dueTime: string;
  onCancel: () => void;
  onSubmit: () => void;
  disabled?: boolean;
  isEditing?: boolean;
}

export function SpecificTaskForm({
  form,
  setForm,
  departments,
  shifts,
  supervisorName,
  observers,
  dueTime,
  onCancel,
  onSubmit,
  disabled,
  isEditing,
}: SpecificTaskFormProps) {
  const vigenciaOptions = [
    { value: TaskVigencia.DAYS_30, label: '30 días' },
    { value: TaskVigencia.WEEKS_8, label: '8 semanas' },
    { value: TaskVigencia.WEEKS_12, label: '12 semanas' },
    { value: TaskVigencia.MONTHS_6, label: '6 meses' },
    { value: TaskVigencia.YEAR_1, label: '1 año' },
    { value: TaskVigencia.YEAR_1_5, label: '1 año y medio' },
    { value: TaskVigencia.YEARS_2, label: '2 años' },
    { value: TaskVigencia.INDEFINIDO, label: 'Indefinido' },
  ];

  const priorityOptions = [
    { value: TaskPriority.LOW, label: 'Baja', color: '#8E8E93' },
    { value: TaskPriority.MEDIUM, label: 'Media', color: '#007AFF' },
    { value: TaskPriority.HIGH, label: 'Alta', color: '#FF9500' },
    { value: TaskPriority.CRITICAL, label: 'Crítica', color: '#FF3B30' },
  ];

  const minuteOptions = [15, 30, 45, 60, 90, 120];
  const startMinuteOptions = Array.from({ length: 60 }, (_, i) => i);
  const [startHour, startMinute] = form.startTime.split(':').map((v) => v || '00');

  const setStartTime = (hour: string, minute: string) => {
    setForm((prev) => ({ ...prev, startTime: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}` }));
  };

  return (
    <div className="space-y-4 py-2 px-2 pb-6">
      {/* SECCIÓN 1: ¿Qué hay que hacer? */}
      <Section title="¿Qué hay que hacer?">
        <div className="space-y-2">
          <Label>Título *</Label>
          <Input
            placeholder="Ej: Checklist de apertura Dive Shop"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Descripción</Label>
          <Textarea
            placeholder="Describe de forma breve lo que debe cumplirse..."
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Prioridad *</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {priorityOptions.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, priority: p.value }))}
                className={cn(
                  'px-2 py-2 rounded-xl text-sm font-medium transition-all border',
                  form.priority === p.value
                    ? 'text-white border-transparent'
                    : 'bg-white text-[#86868B] border-[#E5E5E7] hover:text-[#1D1D1F]'
                )}
                style={form.priority === p.value ? { backgroundColor: p.color } : undefined}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* SECCIÓN 2: ¿Dónde y cuándo? */}
      <Section title="¿Dónde y cuándo se cumple?">
        <div className="space-y-2">
          <Label>Departamento *</Label>
          <div className="flex flex-wrap gap-2">
            {departments.map((dept) => (
              <button
                key={dept.code}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, department: dept.code }))}
                className={cn(
                  'px-3 py-2 rounded-xl text-sm font-medium transition-all border',
                  form.department === dept.code
                    ? 'border-corporate text-corporate bg-corporate/5'
                    : 'border-[#E5E5E7] text-[#86868B] hover:bg-[#F5F5F7]'
                )}
              >
                {dept.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Turnos *</Label>
          {shifts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {shifts.map((shift) => {
                const isSelected = form.shiftIds.includes(shift.id);
                return (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => setForm((prev) => ({
                      ...prev,
                      shiftIds: isSelected
                        ? prev.shiftIds.filter((id) => id !== shift.id)
                        : [...prev.shiftIds, shift.id],
                    }))}
                    className={cn(
                      'px-3 py-3 rounded-xl text-sm text-left border transition-all',
                      isSelected
                        ? 'border-corporate bg-corporate/5 text-corporate'
                        : 'border-[#E5E5E7] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]'
                    )}
                  >
                    <span className="font-medium block">{shift.name}</span>
                    <span className="text-xs text-[#86868B] block">{shift.startTime} - {shift.endTime}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#86868B]">No hay turnos activos para este departamento.</p>
          )}
          {form.shiftIds.length > 0 && (
            <p className="text-xs text-[#86868B]">{form.shiftIds.length} turno{form.shiftIds.length > 1 ? 's' : ''} seleccionado{form.shiftIds.length > 1 ? 's' : ''}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Hora de inicio - selects 24h */}
          <div className="space-y-2">
            <Label>Hora de inicio *</Label>
            <div className="flex items-center gap-2">
              <Select value={startHour} onValueChange={(h) => setStartTime(h, startMinute)}>
                <SelectTrigger className="w-20 h-10 text-center">
                  <SelectValue placeholder="HH" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[#86868B] font-medium">:</span>
              <Select value={startMinute} onValueChange={(m) => setStartTime(startHour, m)}>
                <SelectTrigger className="w-20 h-10 text-center">
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {startMinuteOptions.map((m) => {
                    const ms = String(m).padStart(2, '0');
                    return <SelectItem key={ms} value={ms}>{ms}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-[#86868B]">Formato 24 horas</p>
          </div>

          {/* Tiempo estimado - botones */}
          <div className="space-y-2">
            <Label>Tiempo estimado *</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {minuteOptions.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, estimatedMinutes: m }))}
                  className={cn(
                    'px-2 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all border',
                    form.estimatedMinutes === m
                      ? 'border-corporate text-corporate bg-white'
                      : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5E7]'
                  )}
                >
                  {m}m
                </button>
              ))}
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, estimatedMinutes: minuteOptions.includes(prev.estimatedMinutes) ? 150 : prev.estimatedMinutes }))}
                className={cn(
                  'px-2 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all border',
                  !minuteOptions.includes(form.estimatedMinutes)
                    ? 'border-corporate text-corporate bg-white'
                    : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5E7]'
                )}
              >
                Otro
              </button>
            </div>
            {!minuteOptions.includes(form.estimatedMinutes) && (
              <div className="flex items-center gap-2 pt-1">
                <Input
                  type="number"
                  min={5}
                  max={10080}
                  step={5}
                  value={form.estimatedMinutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, estimatedMinutes: parseInt(e.target.value) || 5 }))}
                  className="w-28 h-9"
                />
                <span className="text-sm text-[#86868B]">min</span>
              </div>
            )}
          </div>
        </div>

        {/* Hora límite calculada */}
        <div className="bg-corporate/5 rounded-xl p-3 flex items-center justify-between border border-corporate/20">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-corporate" />
            <span className="text-sm text-[#1D1D1F]">Hora límite calculada</span>
          </div>
          <span className="text-sm font-semibold text-corporate">{dueTime}</span>
        </div>
      </Section>

      {/* SECCIÓN 3: ¿Quién controla? */}
      <Section title="¿Quién controla?">
        <div className="bg-[#F5F5F7] rounded-xl p-3 space-y-1">
          <span className="text-xs text-[#86868B]">Supervisor asignado automáticamente</span>
          <p className="text-sm font-medium text-[#1D1D1F]">{supervisorName || 'No se encontró supervisor'}</p>
        </div>

        {observers.length > 0 && (
          <div className="bg-[#F5F5F7] rounded-xl p-3 space-y-2">
            <span className="text-xs text-[#86868B]">Recibirán alertas si se atrasa o no se cumple</span>
            <div className="flex flex-wrap gap-2">
              {observers.map((obs, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 text-sm text-[#1D1D1F] bg-white px-2 py-1 rounded-lg border border-[#E5E5E7]">
                  {obs.name}
                  <span className="text-[#86868B] text-xs">({obs.role.replace(/_/g, ' ')})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* SECCIÓN 4: Configuración adicional */}
      <Section title="Configuración adicional">
        <div className="space-y-2">
          <Label>Vigencia *</Label>
          <div className="flex flex-wrap gap-2">
            {vigenciaOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, vigenciaDays: opt.value }))}
                className={cn(
                  'px-3 py-2 rounded-xl text-sm font-medium transition-all border',
                  form.vigenciaDays === opt.value
                    ? 'border-corporate text-corporate bg-corporate/5'
                    : 'border-[#E5E5E7] text-[#86868B] hover:bg-[#F5F5F7]'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#86868B]">La tarea seguirá generándose mientras el turno siga siendo asignado dentro de este plazo.</p>
        </div>

        <div className="flex items-center gap-3 p-3 bg-[#F5F5F7] rounded-xl">
          <input
            id="requires-photo-specific"
            type="checkbox"
            checked={form.requiresPhoto}
            onChange={(e) => setForm((prev) => ({ ...prev, requiresPhoto: e.target.checked }))}
            className="w-4 h-4 rounded border-[#E5E5E7] text-corporate focus:ring-corporate"
          />
          <Label htmlFor="requires-photo-specific" className="text-sm font-medium text-[#1D1D1F] mb-0 cursor-pointer">
            Requiere foto para completar
          </Label>
        </div>
      </Section>

      {/* Botones */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 pb-2">
        <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">Cancelar</Button>
        <Button
          className="bg-corporate hover:bg-corporate/90 text-white w-full sm:w-auto"
          onClick={onSubmit}
          disabled={disabled || !form.title.trim() || form.shiftIds.length === 0}
        >
          {isEditing ? 'Guardar cambios' : 'Crear tarea específica'}
        </Button>
      </div>
    </div>
  );
}
