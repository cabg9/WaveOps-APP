import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  Target,
  AlertCircle,
  MessageSquare,
  X,
  Lightbulb,
  Flag,
  CheckSquare,
  ChevronLeft,
  Circle,
  CheckCircle2,
  Trash2,
  ArrowRightLeft,
  Calendar,
  Clock,
  Bell,
  Hash,
  Image as ImageIcon,
  Loader2,
  List,
  Info,
  ChevronRight,
  CalendarDays,
  CalendarCheck,
  LayoutList,
  Search,
  LayoutGrid,
  Pencil,
} from 'lucide-react';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useFirestoreReminders, ReminderItem, FirestoreReminder } from '@/hooks/firestore/useFirestoreReminders';
import { useStorageUpload } from '@/hooks/firestore/useStorageUpload';
import { db } from '@/firebase-config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { hasPermission } from '@/lib/permissions-config';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { TaskPriority } from '@/types';

interface FabAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  onClick: () => void;
  requiredRole?: () => boolean;
}

const HOT_CORNER_SIZE = 80;
const HIDE_DELAY = 800;
const INACTIVITY_DELAY = 4000;

function getLocationContext(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return 'Dashboard';
  const main = parts[0];
  const map: Record<string, string> = {
    tasks: 'Tasks',
    horarios: 'Horarios',
    develops: 'Develops',
    configuracion: 'Configuración',
    perfil: 'Perfil',
    onboarding: 'Onboarding',
  };
  return map[main] || main;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function normalizeDept(name: string): string {
  if (!name) return '';
  const cleaned = name.trim().replace(/\s+/g, '_').toUpperCase();
  const map: Record<string, string> = {
    ADMINISTRATIVO: 'ADMINISTRATIVO',
    FINANCIERO: 'FINANCIERO',
    VENTAS: 'VENTAS',
    MARKETING: 'MARKETING',
    DIVE_SHOP: 'DIVE_SHOP',
    DIVE: 'DIVE_SHOP',
    GUIADO_DE_BUCEO: 'GUIANZA',
    GUIANZA: 'GUIANZA',
    COCINA: 'COCINA',
    MOVILIDAD: 'MOVILIDAD',
    WAREHOUSE: 'WAREHOUSE',
    VESSELS: 'VESSELS',
    OPERACIONES: 'OPERACIONES',
  };
  return map[cleaned] || cleaned;
}

function formatReminderDate(dueDate?: string, hasTime?: boolean, dueTime?: string): string {
  if (!dueDate) return '';
  const [y, m, d] = dueDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  let label = '';
  if (diff === 0) label = 'Hoy';
  else if (diff === 1) label = 'Mañana';
  else if (diff === -1) label = 'Ayer';
  else label = date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  if (hasTime && dueTime) label += ` · ${dueTime}`;
  return label;
}

function isReminderDue(reminder: FirestoreReminder): boolean {
  if (!reminder.hasDate || !reminder.dueDate) return false;
  const now = new Date();
  const [y, m, d] = reminder.dueDate.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (due < today) return true;
  if (due.getTime() !== today.getTime()) return false;
  if (!reminder.hasTime || !reminder.dueTime) return true;
  const [hh, mm] = reminder.dueTime.split(':').map(Number);
  return now.getHours() > hh || (now.getHours() === hh && now.getMinutes() >= mm);
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // ignore
  }
}

const CATEGORIES = [
  { id: 'today', label: 'Hoy', icon: CalendarDays, color: 'bg-corporate', countKey: 'today' },
  { id: 'scheduled', label: 'Programados', icon: Calendar, color: 'bg-amber-500', countKey: 'scheduled' },
  { id: 'all', label: 'Todos', icon: LayoutList, color: 'bg-slate-600', countKey: 'all' },
  { id: 'flagged', label: 'Indicador', icon: Flag, color: 'bg-rose-500', countKey: 'flagged' },
  { id: 'urgent', label: 'Urgente', icon: Bell, color: 'bg-red-500', countKey: 'urgent' },
  { id: 'completed', label: 'Terminados', icon: CheckSquare, color: 'bg-emerald-500', countKey: 'completed' },
] as const;

const DEFAULT_LISTS = ['General', 'Proyectos', 'Seguimiento'];
const LIST_COLORS: Record<string, string> = {
  General: 'bg-corporate',
  Proyectos: 'bg-amber-500',
  Seguimiento: 'bg-blue-500',
  Urgente: 'bg-red-500',
};

function ReminderImageUpload({ imageUrl, onChange }: { imageUrl: string; onChange: (url: string) => void }) {
  const { uploadImage, uploading, progress } = useStorageUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [maximized, setMaximized] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, 'reminders');
      onChange(url);
      toast.success('Imagen cargada');
    } catch (err) {
      console.error('Error al subir imagen:', err);
      toast.error('No se pudo cargar la imagen');
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {imageUrl ? (
        <div className="flex items-center gap-3">
          <div className="relative w-20 h-20 rounded-xl bg-[#F5F5F7] flex items-center justify-center border border-[#E5E5E7] overflow-hidden group">
            <img
              src={imageUrl}
              alt="Recordatorio"
              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setMaximized(true)}
            />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-0.5 right-0.5 w-5 h-5 bg-[#FF3B30] text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs font-medium text-corporate hover:text-corporate/80 transition-colors"
          >
            {uploading ? `Subiendo ${progress}%...` : 'Cambiar imagen'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#C7C7CC] text-[#007AFF] hover:bg-[#007AFF]/5 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          {uploading ? `Subiendo ${progress}%...` : 'Agregar imagen'}
        </button>
      )}

      {maximized && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setMaximized(false)}
        >
          <img
            src={imageUrl}
            alt="Recordatorio"
            className="max-w-full max-h-full rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}

function ReminderCard({
  reminder,
  view,
  onEdit,
  onConvert,
  onToggleItem,
  onArchive,
  canConvert,
}: {
  reminder: FirestoreReminder;
  view: 'cards' | 'list';
  onEdit: () => void;
  onConvert: () => void;
  onToggleItem: (itemId: string) => void;
  onArchive: () => void;
  canConvert: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [maximizedPhoto, setMaximizedPhoto] = useState<string | null>(null);
  const completed = reminder.items.filter((item) => item.completed).length;
  const total = reminder.items.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const dateLabel = formatReminderDate(reminder.dueDate, reminder.hasTime, reminder.dueTime);
  const allCompleted = total > 0 && completed === total;

  if (view === 'list') {
    return (
      <div
        onClick={() => setExpanded(!expanded)}
        className="bg-white rounded-xl border border-[#E5E5E7] p-3 hover:shadow-sm transition-shadow cursor-pointer"
      >
        <div className="flex items-start gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (total === 0 || allCompleted) {
                onArchive();
              } else {
                toast.info('Completa todos los pasos primero');
              }
            }}
            className={cn('flex-shrink-0 transition-colors mt-0.5', allCompleted ? 'text-corporate' : 'text-[#C7C7CC]')}
          >
            {total > 0 ? (
              allCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn('font-medium text-[#1D1D1F] truncate', allCompleted && 'line-through text-[#86868B]')}>
                {reminder.title}
              </h3>
              {reminder.isUrgent && <Bell className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
              {reminder.flagged && <Flag className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
            </div>
            {reminder.notes && (
              <p className={cn('text-xs text-[#86868B] mt-0.5', expanded ? '' : 'line-clamp-1')}>
                {reminder.notes}
              </p>
            )}
            {reminder.imageUrl && expanded && (
              <div className="mt-2">
                <div
                  className="relative w-16 h-16 rounded-lg bg-[#F5F5F7] border border-[#E5E5E7] overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); setMaximizedPhoto(reminder.imageUrl || null); }}
                >
                  <img src={reminder.imageUrl} alt="Recordatorio" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {dateLabel && (
                <span className={cn('text-xs', reminder.dueDate && reminder.dueDate < todayISO() ? 'text-red-500' : 'text-corporate')}>
                  {dateLabel}
                </span>
              )}
              {total > 0 && <span className="text-xs text-[#8E8E93]">{completed} de {total}</span>}
              {reminder.tags.length > 0 && (
                <span className="text-xs text-[#8E8E93]">{reminder.tags.map((t) => `#${t}`).join(' ')}</span>
              )}
              {reminder.imageUrl && !expanded && (
                <ImageIcon className="w-3.5 h-3.5 text-[#8E8E93]" />
              )}
            </div>

            {expanded && total > 0 && (
              <div className="mt-3 space-y-1.5">
                {reminder.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleItem(item.id); }}
                      className={cn('flex-shrink-0 transition-colors', item.completed ? 'text-corporate' : 'text-[#C7C7CC]')}
                    >
                      {item.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </button>
                    <span className={cn(item.completed && 'line-through text-[#86868B]')}>{item.text}</span>
                  </div>
                ))}
              </div>
            )}

            {expanded && (
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#E5E5E7]">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-corporate bg-corporate/5 hover:bg-corporate/10 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>
                {canConvert && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onConvert(); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-corporate bg-corporate/5 hover:bg-corporate/10 transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Convertir
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onArchive(); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-500/5 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className={cn(
        'bg-white rounded-2xl border border-[#E5E5E7] p-4 transition-all cursor-pointer hover:shadow-md',
        allCompleted && 'opacity-75'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={cn('text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full text-white', LIST_COLORS[reminder.list] || 'bg-slate-400')}>
              {reminder.list || 'General'}
            </span>
            {reminder.isUrgent && <Bell className="w-3.5 h-3.5 text-red-500" />}
            {reminder.flagged && <Flag className="w-3.5 h-3.5 text-amber-500" />}
          </div>
          <h3 className={cn('font-semibold text-[#1D1D1F]', allCompleted && 'line-through text-[#86868B]')}>
            {reminder.title}
          </h3>
          {reminder.notes && (
            <p className={cn('text-sm text-[#86868B] mt-1', expanded ? '' : 'line-clamp-2')}>
              {reminder.notes}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {dateLabel && (
              <span className={cn(
                'text-xs flex items-center gap-1 font-medium',
                reminder.dueDate && reminder.dueDate < todayISO() ? 'text-red-500' : 'text-corporate'
              )}>
                <Calendar className="w-3 h-3" />
                {dateLabel}
              </span>
            )}
            {total > 0 && <span className="text-xs text-[#8E8E93]">{completed} de {total}</span>}
            {reminder.tags.length > 0 && (
              <span className="text-xs text-[#8E8E93]">
                {reminder.tags.map((t) => `#${t}`).join(' ')}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (total === 0 || allCompleted) {
              onArchive();
            } else {
              toast.info('Completa todos los pasos primero');
            }
          }}
          className={cn('flex-shrink-0 transition-colors mt-1', allCompleted ? 'text-corporate' : 'text-[#C7C7CC]')}
        >
          {total > 0 ? (
            allCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />
          ) : (
            <Circle className="w-6 h-6" />
          )}
        </button>
      </div>

      {total > 0 && (
        <div className="mt-3">
          <Progress value={progress} className="h-1.5 bg-[#E5E5E7]" />
        </div>
      )}

      {expanded && total > 0 && (
        <div className="mt-3 space-y-1.5">
          {reminder.items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleItem(item.id); }}
                className={cn('flex-shrink-0 transition-colors', item.completed ? 'text-corporate' : 'text-[#C7C7CC]')}
              >
                {item.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              </button>
              <span className={cn(item.completed && 'line-through text-[#86868B]')}>{item.text}</span>
            </div>
          ))}
        </div>
      )}

      {expanded && reminder.imageUrl && (
        <div className="mt-3">
          <div
            className="relative w-20 h-20 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7] overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            onClick={(e) => { e.stopPropagation(); setMaximizedPhoto(reminder.imageUrl || null); }}
          >
            <img src={reminder.imageUrl} alt="Recordatorio" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {expanded && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#E5E5E7]">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-corporate bg-corporate/5 hover:bg-corporate/10 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
          {canConvert && (
            <button
              onClick={(e) => { e.stopPropagation(); onConvert(); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-corporate bg-corporate/5 hover:bg-corporate/10 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Convertir
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onArchive(); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-500/5 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        </div>
      )}

      {maximizedPhoto && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={(e) => { e.stopPropagation(); setMaximizedPhoto(null); }}
        >
          <img
            src={maximizedPhoto}
            alt="Recordatorio"
            className="max-w-full max-h-full rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}

export function GlobalFAB() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    reminders,
    lists: userLists,
    createReminder,
    updateReminder,
    toggleReminderItem,
    archiveReminder,
    markReminderConverted,
    renameList,
    addList,
    deleteList,
    cleanupOldCompleted,
  } = useFirestoreReminders(user?.id);

  const [isOpen, setIsOpen] = useState(false);
  const [isFabVisible, setIsFabVisible] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'sugerencia' | 'problema'>('sugerencia');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showRemindersPanel, setShowRemindersPanel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedListFilter, setSelectedListFilter] = useState<string>('all');
  const [reminderView, setReminderView] = useState<'cards' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingReminder, setEditingReminder] = useState<FirestoreReminder | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [hasDate, setHasDate] = useState(false);
  const [hasTime, setHasTime] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [list, setList] = useState('Personal');
  const [tags, setTags] = useState<string[]>([]);
  const [flagged, setFlagged] = useState(false);
  const [priority, setPriority] = useState<FirestoreReminder['priority']>('none');
  const [imageUrl, setImageUrl] = useState('');
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const notifiedRemindersRef = useRef<Record<string, string>>({});
  const [convertingReminder, setConvertingReminder] = useState<FirestoreReminder | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mouseInHotCornerRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpenRef = useRef(isOpen);
  const showRemindersPanelRef = useRef(showRemindersPanel);
  const showFeedbackRef = useRef(showFeedback);
  const touchStartRef = useRef<{ x: number; y: number; inHotCorner: boolean } | null>(null);

  isOpenRef.current = isOpen;
  showRemindersPanelRef.current = showRemindersPanel;
  showFeedbackRef.current = showFeedback;

  const showFab = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    setIsFabVisible(true);
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!isOpenRef.current && !showRemindersPanelRef.current && !showFeedbackRef.current && !mouseInHotCornerRef.current) {
        setIsFabVisible(false);
      }
    }, HIDE_DELAY);
  }, []);

  const scheduleInactivityHide = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      if (!isOpenRef.current && !showRemindersPanelRef.current && !showFeedbackRef.current && !mouseInHotCornerRef.current) {
        setIsFabVisible(false);
      }
    }, INACTIVITY_DELAY);
  }, []);

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [scheduleHide]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const inHotCorner =
        window.innerWidth - e.clientX <= HOT_CORNER_SIZE &&
        window.innerHeight - e.clientY <= HOT_CORNER_SIZE;

      if (inHotCorner !== mouseInHotCornerRef.current) {
        mouseInHotCornerRef.current = inHotCorner;
        if (inHotCorner) {
          showFab();
        } else {
          scheduleHide();
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [showFab, scheduleHide]);

  useEffect(() => {
    if (isOpen || showRemindersPanel || showFeedback) {
      showFab();
    } else {
      scheduleHide();
    }
  }, [isOpen, showRemindersPanel, showFeedback, showFab, scheduleHide]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const inHotCorner =
        window.innerWidth - t.clientX <= HOT_CORNER_SIZE &&
        window.innerHeight - t.clientY <= HOT_CORNER_SIZE;
      touchStartRef.current = { x: t.clientX, y: t.clientY, inHotCorner };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const start = touchStartRef.current;
      if (!start || !start.inHotCorner) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = start.y - t.clientY;
      if (dy > 60 && Math.abs(dy) > Math.abs(dx)) {
        showFab();
        scheduleInactivityHide();
      }
      touchStartRef.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [showFab, scheduleInactivityHide]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleCreateTask = (type: 'extra' | 'specific') => {
    setIsOpen(false);
    navigate(`/tasks?create=${type}`);
  };

  const handleCreateIncidencia = () => {
    setIsOpen(false);
    navigate('/tasks?create=incidencia');
  };

  const handleOpenFeedback = () => {
    setIsOpen(false);
    setShowFeedback(true);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) {
      toast.error('Escribe un mensaje para enviar');
      return;
    }
    if (!user?.id) {
      toast.error('Debes iniciar sesión para enviar feedback');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user.id,
        userName: user.name || '',
        userEmail: user.email || '',
        userRole: user?.role || '',
        location: getLocationContext(location.pathname),
        fullPath: location.pathname + location.search,
        type: feedbackType,
        message: feedbackMessage.trim(),
        status: 'nuevo',
        createdAt: serverTimestamp(),
      });
      toast.success('Feedback enviado. Gracias por ayudarnos a mejorar.');
      setFeedbackMessage('');
      setFeedbackType('sugerencia');
      setShowFeedback(false);
    } catch (err) {
      console.error('Error enviando feedback:', err);
      toast.error('No se pudo enviar el feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReminders = () => {
    setIsOpen(false);
    setShowRemindersPanel(true);
  };

  const resetReminderEditor = () => {
    setEditingReminder(null);
    setTitle('');
    setNotes('');
    setItems([]);
    setHasDate(false);
    setHasTime(false);
    setDueDate('');
    setDueTime('');
    setIsUrgent(false);
    setList('General');
    setTags([]);
    setFlagged(false);
    setPriority('none');
    setImageUrl('');
  };

  const handleNewReminder = () => {
    resetReminderEditor();
    if (selectedListFilter !== 'all') {
      setList(selectedListFilter);
    }
    setItems([{ id: generateId(), text: '', completed: false }]);
    setIsEditorOpen(true);
  };

  const handleEditReminder = (reminder: FirestoreReminder) => {
    setEditingReminder(reminder);
    setIsEditorOpen(true);
    setTitle(reminder.title);
    setNotes(reminder.notes || '');
    setItems(reminder.items.length > 0 ? reminder.items : [{ id: generateId(), text: '', completed: false }]);
    setHasDate(reminder.hasDate);
    setHasTime(reminder.hasTime);
    setDueDate(reminder.dueDate || '');
    setDueTime(reminder.dueTime || '');
    setIsUrgent(reminder.isUrgent);
    setList(reminder.list || 'General');
    setTags(reminder.tags || []);
    setFlagged(reminder.flagged);
    setPriority(reminder.priority || 'none');
    setImageUrl(reminder.imageUrl || '');
  };

  const buildReminderData = (): Partial<FirestoreReminder> => ({
    title: title.trim() || 'Sin título',
    notes: notes.trim(),
    items: items.filter((item) => item.text.trim() !== ''),
    hasDate,
    hasTime,
    dueDate: hasDate ? dueDate || todayISO() : '',
    dueTime: hasDate && hasTime ? dueTime || '09:00' : '',
    isUrgent,
    list: list.trim() || 'General',
    tags,
    flagged,
    priority,
    imageUrl: imageUrl.trim(),
  });

  const handleSaveReminder = async () => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión para guardar recordatorios');
      return;
    }
    const data = buildReminderData();
    if (data.items?.length === 0 && !data.title?.trim() && !data.notes?.trim()) {
      toast.error('Agrega un título, nota o al menos un elemento');
      return;
    }
    setIsSavingReminder(true);
    try {
      if (editingReminder) {
        await updateReminder(editingReminder.id, data, { userId: user.id, userName: user.name || '' });
        toast.success('Recordatorio actualizado');
      } else {
        await createReminder(data);
        toast.success('Recordatorio creado');
      }
      if (data.list && data.list !== 'General') {
        addList(data.list).catch(() => {});
      }
      setIsEditorOpen(false);
      resetReminderEditor();
    } catch (err) {
      console.error('Error guardando recordatorio:', err);
      toast.error('No se pudo guardar el recordatorio');
    } finally {
      setIsSavingReminder(false);
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { id: generateId(), text: '', completed: false }]);
  };

  const handleUpdateItemText = (id: string, text: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  const handleToggleItemInEditor = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)));
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const canConvert = user && (hasPermission(user, 'canCreateSpecificTask') || hasPermission(user, 'canCreateExtraTask'));

  const startConvert = (reminder?: FirestoreReminder) => {
    const target = reminder || editingReminder;
    if (!target) return;
    const canSpecific = user && hasPermission(user, 'canCreateSpecificTask');
    const canExtra = user && hasPermission(user, 'canCreateExtraTask');
    if (!canSpecific && !canExtra) {
      toast.error('No tienes permiso para crear tareas');
      return;
    }
    setConvertingReminder(target);
    if (canSpecific && canExtra) {
      setShowConvertDialog(true);
      return;
    }
    doConvert(canSpecific ? 'specific' : 'extra');
  };

  const doConvert = (type: 'specific' | 'extra') => {
    if (!convertingReminder) return;
    setShowConvertDialog(false);
    setShowRemindersPanel(false);
    resetReminderEditor();
    navigate(`/tasks?create=${type}&reminderId=${convertingReminder.id}`);
  };

  const activeReminders = reminders.filter((r) => r.status === 'active');
  const dueCount = useMemo(() => activeReminders.filter(isReminderDue).length, [activeReminders]);

  // Solicitar permiso de notificaciones al montar
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Revisar recordatorios vencidos y notificar
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const checkDue = () => {
      const nowKey = new Date().toISOString().slice(0, 16);
      activeReminders.forEach((reminder) => {
        if (!isReminderDue(reminder)) return;
        const lastNotified = notifiedRemindersRef.current[reminder.id];
        if (lastNotified === nowKey) return;
        notifiedRemindersRef.current[reminder.id] = nowKey;
        playNotificationSound();
        new Notification('Recordatorio', {
          body: reminder.title || 'Tienes un recordatorio',
          icon: '/logo-icon.png',
          tag: reminder.id,
        });
      });
    };
    checkDue();
    const interval = setInterval(checkDue, 30000);
    return () => clearInterval(interval);
  }, [activeReminders]);

  // Limpiar recordatorios terminados/archivados mayores a 1 semana
  useEffect(() => {
    if (!user?.id) return;
    cleanupOldCompleted(7).catch(() => {});
    const interval = setInterval(() => {
      cleanupOldCompleted(7).catch(() => {});
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id, cleanupOldCompleted]);

  const availableLists = useMemo(() => {
    const existing = new Set<string>();
    DEFAULT_LISTS.forEach((l) => existing.add(l));
    userLists.forEach((l) => existing.add(l));
    activeReminders.map((r) => r.list).filter(Boolean).forEach((l) => existing.add(l as string));
    return Array.from(existing).sort();
  }, [activeReminders, userLists]);

  const counts = useMemo(() => {
    const today = todayISO();
    return {
      today: activeReminders.filter((r) => r.hasDate && r.dueDate === today).length,
      scheduled: activeReminders.filter((r) => r.hasDate).length,
      all: activeReminders.length,
      flagged: activeReminders.filter((r) => r.flagged).length,
      urgent: activeReminders.filter((r) => r.isUrgent).length,
      completed: reminders.filter((r) => r.status === 'converted' || r.status === 'archived' || (r.items.length > 0 && r.items.every((i) => i.completed))).length,
    };
  }, [activeReminders, reminders]);

  const filteredDisplayReminders = useMemo(() => {
    let result = [...activeReminders];
    // Filtros y listas son mutuamente excluyentes
    if (selectedListFilter !== 'all') {
      result = result.filter((r) => r.list === selectedListFilter);
    } else if (selectedCategory !== 'all') {
      switch (selectedCategory) {
        case 'today':
          result = result.filter((r) => r.hasDate && r.dueDate === todayISO());
          break;
        case 'scheduled':
          result = result.filter((r) => r.hasDate);
          break;
        case 'flagged':
          result = result.filter((r) => r.flagged);
          break;
        case 'urgent':
          result = result.filter((r) => r.isUrgent);
          break;
        case 'completed':
          result = reminders.filter((r) => r.status === 'converted' || r.status === 'archived' || (r.items.length > 0 && r.items.every((i) => i.completed)));
          break;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.notes || '').toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          r.items.some((i) => i.text.toLowerCase().includes(q))
      );
    }
    return result;
  }, [activeReminders, reminders, selectedCategory, selectedListFilter, searchQuery]);

  const actions: FabAction[] = [
    {
      id: 'incidencia',
      label: 'Incidencia',
      icon: AlertCircle,
      color: 'text-[#FF3B30]',
      bgColor: 'bg-white',
      onClick: handleCreateIncidencia,
    },
    {
      id: 'extra',
      label: 'Tarea extra',
      icon: Plus,
      color: 'text-amber-500',
      bgColor: 'bg-white',
      onClick: () => handleCreateTask('extra'),
    },
    {
      id: 'specific',
      label: 'Tarea específica',
      icon: Target,
      color: 'text-corporate',
      bgColor: 'bg-white',
      onClick: () => handleCreateTask('specific'),
      requiredRole: () => user?.role === 'DIRECTOR_GENERAL',
    },
    {
      id: 'reminders',
      label: 'Recordatorios',
      icon: CheckSquare,
      color: 'text-[#FF9500]',
      bgColor: 'bg-white',
      onClick: handleOpenReminders,
    },
    {
      id: 'feedback',
      label: 'Feedback',
      icon: MessageSquare,
      color: 'text-[#007AFF]',
      bgColor: 'bg-white',
      onClick: handleOpenFeedback,
    },
  ];

  const visibleActions = actions.filter((a) => !a.requiredRole || a.requiredRole());

  return (
    <>
      {/* Indicador sutil cuando el FAB está oculto */}
      <div
        className={cn(
          'fixed bottom-4 right-4 z-50 w-2 h-2 rounded-full bg-corporate/30 pointer-events-none transition-opacity duration-300',
          isFabVisible || isOpen ? 'opacity-0' : 'opacity-100'
        )}
        aria-hidden
      />

      <div
        ref={containerRef}
        onTouchStart={scheduleInactivityHide}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex flex-col items-end transition-all duration-300',
          isFabVisible || isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        {/* Acciones secundarias */}
        <div
          className={cn(
            'flex flex-col items-end gap-3 mb-3 mr-0.5 transition-all',
            isOpen ? 'opacity-100 visible' : 'opacity-0 invisible h-0 overflow-hidden mb-0'
          )}
        >
          {visibleActions.map((action, index) => {
            const Icon = action.icon;
            const delay = index * 50;
            return (
              <div
                key={action.id}
                className={cn(
                  'flex items-center gap-3 transition-all duration-300 ease-out',
                  isOpen
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-6 pointer-events-none'
                )}
                style={{ transitionDelay: isOpen ? `${delay}ms` : '0ms' }}
              >
                <span
                  className={cn(
                    'text-sm font-medium text-[#1D1D1F] bg-white px-3 py-1.5 rounded-lg shadow-sm border border-[#E5E5E7] whitespace-nowrap transition-all duration-200',
                    isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  )}
                  style={{ transitionDelay: isOpen ? `${delay + 50}ms` : '0ms' }}
                >
                  {action.label}
                </span>
                <button
                  onClick={action.onClick}
                  className={cn(
                    'relative w-12 h-12 rounded-full shadow-lg border border-[#E5E5E7] flex items-center justify-center transition-transform duration-200 hover:scale-110',
                    action.bgColor,
                    action.color
                  )}
                  title={action.label}
                >
                  <Icon className="w-5 h-5" />
                  {action.id === 'reminders' && dueCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
                      {dueCount > 9 ? '9+' : dueCount}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Botón principal */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'relative w-14 h-14 rounded-full bg-corporate text-white shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105',
            isOpen && 'rotate-45'
          )}
          aria-label="Acciones rápidas"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
          {!isOpen && dueCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 flex items-center justify-center bg-red-500 text-white text-[11px] font-bold rounded-full border-2 border-corporate">
              {dueCount > 9 ? '9+' : dueCount}
            </span>
          )}
        </button>
      </div>

      {/* Modal de Feedback */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-[#86868B]">
              Estás en: <span className="font-medium text-[#1D1D1F]">{getLocationContext(location.pathname)}</span>
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFeedbackType('sugerencia')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
                  feedbackType === 'sugerencia'
                    ? 'border-corporate text-corporate bg-corporate/5'
                    : 'border-[#E5E5E7] text-[#86868B] hover:bg-[#F5F5F7]'
                )}
              >
                <Lightbulb className="w-4 h-4" />
                Sugerencia
              </button>
              <button
                type="button"
                onClick={() => setFeedbackType('problema')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
                  feedbackType === 'problema'
                    ? 'border-[#FF3B30] text-[#FF3B30] bg-[#FF3B30]/5'
                    : 'border-[#E5E5E7] text-[#86868B] hover:bg-[#F5F5F7]'
                )}
              >
                <Flag className="w-4 h-4" />
                Problema
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1D1D1F]">
                {feedbackType === 'sugerencia' ? '¿Qué te gustaría agregar o mejorar?' : '¿Qué problema estás experimentando?'}
              </label>
              <Textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Describe con el mayor detalle posible..."
                rows={5}
                className="resize-none rounded-xl border-[#E5E5E7]"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowFeedback(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                className={cn(
                  'flex-1 rounded-xl text-white',
                  feedbackType === 'sugerencia' ? 'bg-corporate hover:bg-corporate/90' : 'bg-[#FF3B30] hover:bg-[#FF3B30]/90'
                )}
                onClick={handleSubmitFeedback}
                disabled={isSubmitting || !feedbackMessage.trim()}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Panel de Recordatorios a pantalla completa */}
      {showRemindersPanel && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <header className="sticky top-0 z-10 bg-white border-b border-[#E5E5E7] px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => {
                setShowRemindersPanel(false);
                resetReminderEditor();
              }}
              className="flex items-center gap-1 text-corporate font-medium text-sm px-2 py-1 rounded-lg hover:bg-corporate/5 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Cerrar
            </button>
            <h1 className="text-lg font-semibold text-[#1D1D1F]">Recordatorios</h1>
            <button
              onClick={handleNewReminder}
              className="flex items-center gap-1 text-white bg-corporate font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-corporate/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo
            </button>
          </header>

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Sidebar / filtros */}
            <aside className="lg:w-64 lg:border-r border-[#E5E5E7] bg-[#FAFAFA] lg:bg-white flex flex-col">
              {/* Mobile: filtros horizontales */}
              <div className="lg:hidden p-3 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const count = (counts as any)[cat.countKey] || 0;
                    const active = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setSelectedListFilter('all');
                        }}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                          active
                            ? 'bg-corporate text-white border-corporate'
                            : 'bg-white text-[#1D1D1F] border-[#E5E5E7] hover:bg-corporate/5'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {cat.label}
                        <span className={cn('ml-0.5', active ? 'text-white/80' : 'text-[#86868B]')}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desktop: sidebar vertical */}
              <div className="hidden lg:flex flex-col p-4 space-y-1">
                <h2 className="text-xs font-semibold text-[#86868B] uppercase tracking-wider mb-2 px-2">Filtros</h2>
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const count = (counts as any)[cat.countKey] || 0;
                  const active = selectedCategory === cat.id;
                  const isUrgent = cat.id === 'urgent';
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setSelectedListFilter('all');
                      }}
                      className={cn(
                        'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        active
                          ? 'bg-corporate/10 text-corporate'
                          : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-corporate/10', isUrgent ? 'text-red-500' : 'text-corporate')}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="flex-1 text-left">{cat.label}</span>
                      <span className={cn('text-xs', active ? 'text-corporate' : 'text-[#86868B]')}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Buscador y vista */}
              <div className="p-3 lg:p-4 border-t border-[#E5E5E7] space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder=""
                      className="pl-9 rounded-xl border-[#E5E5E7] text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-[#F2F2F7] rounded-lg p-1 shrink-0">
                    <button
                      onClick={() => setReminderView('cards')}
                      className={cn(
                        'px-2 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1',
                        reminderView === 'cards' ? 'bg-white text-corporate shadow-sm' : 'text-[#86868B] hover:text-[#1D1D1F]'
                      )}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Tarjetas</span>
                    </button>
                    <button
                      onClick={() => setReminderView('list')}
                      className={cn(
                        'px-2 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1',
                        reminderView === 'list' ? 'bg-white text-corporate shadow-sm' : 'text-[#86868B] hover:text-[#1D1D1F]'
                      )}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Lista</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Filtro de listas */}
              <div className="hidden lg:block p-4 border-t border-[#E5E5E7] flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-2 px-2">
                  <h2 className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Listas</h2>
                  <button
                    onClick={() => {
                      const name = window.prompt('Nombre de la nueva lista');
                      if (name?.trim()) {
                        const trimmed = name.trim();
                        setSelectedListFilter(trimmed);
                        setSelectedCategory('all');
                        addList(trimmed).catch(() => {});
                      }
                    }}
                    className="text-xs text-corporate hover:text-corporate/80 font-medium"
                  >
                    + Nueva
                  </button>
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setSelectedListFilter('all');
                      setSelectedCategory('all');
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-colors',
                      selectedListFilter === 'all' ? 'bg-corporate/10 text-corporate font-medium' : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                    )}
                  >
                    <List className="w-4 h-4" />
                    <span className="flex-1 text-left">Todas las listas</span>
                  </button>
                  {availableLists.map((listName) => (
                    <div
                      key={listName}
                      className={cn(
                        'flex items-center gap-1 w-full px-2 py-1.5 rounded-xl text-sm transition-colors group',
                        selectedListFilter === listName ? 'bg-corporate/10 text-corporate font-medium' : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                      )}
                    >
                      <button
                        onClick={() => {
                          setSelectedListFilter(listName);
                          setSelectedCategory('all');
                        }}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        <div className={cn('w-2 h-2 rounded-full', LIST_COLORS[listName] || 'bg-slate-400')} />
                        <span className="truncate">{listName}</span>
                        <span className="text-xs text-[#86868B]">
                          {activeReminders.filter((r) => r.list === listName).length}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          const name = window.prompt('Nuevo nombre para la lista', listName);
                          if (name?.trim() && name.trim() !== listName) {
                            renameList(listName, name.trim()).then((count) => {
                              toast.success(`Lista actualizada (${count} recordatorios)`);
                              if (selectedListFilter === listName) setSelectedListFilter(name.trim());
                            }).catch(() => toast.error('No se pudo renombrar la lista'));
                          }
                        }}
                        className="p-1.5 rounded-lg text-[#86868B] hover:text-corporate hover:bg-corporate/5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Editar lista"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar la lista "${listName}"? Los recordatorios se moverán a General.`)) {
                            deleteList(listName).then((count) => {
                              toast.success(`Lista eliminada (${count} recordatorios movidos)`);
                              if (selectedListFilter === listName) {
                                setSelectedListFilter('all');
                                setSelectedCategory('all');
                              }
                            }).catch(() => toast.error('No se pudo eliminar la lista'));
                          }
                        }}
                        className="p-1.5 rounded-lg text-[#86868B] hover:text-red-500 hover:bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar lista"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* Contenido */}
            <main className="flex-1 overflow-y-auto p-4 bg-[#FAFAFA]">
              {/* Mobile: filtros de lista */}
              <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide">
                <button
                  onClick={() => {
                    setSelectedListFilter('all');
                    setSelectedCategory('all');
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                    selectedListFilter === 'all'
                      ? 'bg-corporate text-white border-corporate'
                      : 'bg-white text-[#1D1D1F] border-[#E5E5E7]'
                  )}
                >
                  Todas
                </button>
                {availableLists.map((listName) => (
                  <button
                    key={listName}
                    onClick={() => {
                      setSelectedListFilter(listName);
                      setSelectedCategory('all');
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                      selectedListFilter === listName
                        ? 'bg-corporate text-white border-corporate'
                        : 'bg-white text-[#1D1D1F] border-[#E5E5E7]'
                    )}
                  >
                    {listName}
                  </button>
                ))}
              </div>

              {filteredDisplayReminders.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-[#86868B] space-y-3">
                  <CalendarCheck className="w-12 h-12 opacity-20" />
                  <p className="text-sm">No hay recordatorios en esta categoria</p>
                  <button
                    onClick={handleNewReminder}
                    className="text-corporate text-sm font-medium px-4 py-2 rounded-xl bg-corporate/5 hover:bg-corporate/10 transition-colors"
                  >
                    Crear un recordatorio
                  </button>
                </div>
              )}

              <div className={cn(
                reminderView === 'cards' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-2'
              )}>
                {filteredDisplayReminders.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    view={reminderView}
                    onEdit={() => handleEditReminder(reminder)}
                    onConvert={() => startConvert(reminder)}
                    onToggleItem={(itemId) => toggleReminderItem(reminder.id, itemId)}
                    onArchive={() => archiveReminder(reminder.id, { userId: user?.id || '', userName: user?.name || '' })}
                    canConvert={!!canConvert}
                  />
                ))}
              </div>
            </main>
          </div>
        </div>
      )}

      {/* Editor de recordatorio (popup) */}
      <Dialog
        open={isEditorOpen}
        onOpenChange={(open) => {
          setIsEditorOpen(open);
          if (!open) resetReminderEditor();
        }}
      >
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg rounded-2xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-4 py-3 border-b border-[#E5E5E7]">
            <DialogTitle className="text-lg">
              {editingReminder ? 'Editar recordatorio' : 'Nuevo recordatorio'}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto p-4 max-h-[calc(90vh-80px)]">
            <div className="bg-white rounded-2xl border border-[#E5E5E7] overflow-hidden mb-4">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título"
                autoFocus={!editingReminder}
                className="border-0 rounded-none text-[#1D1D1F] font-medium placeholder:text-[#C7C7CC] focus-visible:ring-0 h-11"
              />
              <div className="h-px bg-[#E5E5E7]" />
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas"
                rows={2}
                className="border-0 rounded-none resize-none text-[#1D1D1F] placeholder:text-[#C7C7CC] focus-visible:ring-0"
              />
            </div>

            {/* Fecha y hora */}
            <div className="bg-white rounded-2xl border border-[#E5E5E7] overflow-hidden mb-4">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-corporate" />
                  <span className="text-sm text-[#1D1D1F]">Fecha</span>
                </div>
                <Switch checked={hasDate} onCheckedChange={setHasDate} className="scale-90" />
              </div>
              {hasDate && (
                <div className="px-4 py-2 border-b border-[#E5E5E7]">
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="border-0 rounded-none focus-visible:ring-0 h-9"
                  />
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-corporate" />
                  <span className="text-sm text-[#1D1D1F]">Hora</span>
                </div>
                <Switch checked={hasTime} onCheckedChange={(v) => { setHasTime(v); if (v) setHasDate(true); }} className="scale-90" />
              </div>
              {hasTime && (
                <div className="px-4 py-2">
                  <Input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="border-0 rounded-none focus-visible:ring-0 h-9"
                  />
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-[#1D1D1F]">Urgente</span>
                </div>
                <Switch checked={isUrgent} onCheckedChange={setIsUrgent} className="scale-90" />
              </div>
            </div>

            {/* Lista */}
            <div className="bg-white rounded-2xl border border-[#E5E5E7] overflow-hidden mb-4">
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#E5E5E7]">
                <List className="w-4 h-4 text-corporate" />
                <span className="text-sm font-medium text-[#1D1D1F]">Lista</span>
              </div>
              <div className="px-4 py-3">
                <div className="flex flex-wrap gap-2 mb-2">
                  {availableLists.map((listName) => (
                    <button
                      key={listName}
                      type="button"
                      onClick={() => setList(listName)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
                        list === listName
                          ? 'bg-corporate text-white border-corporate'
                          : 'bg-white text-[#1D1D1F] border-[#E5E5E7] hover:bg-corporate/5'
                      )}
                    >
                      {listName}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const name = window.prompt('Nombre de la nueva lista');
                      if (name?.trim()) {
                        const trimmed = name.trim();
                        setList(trimmed);
                        addList(trimmed).catch(() => {});
                      }
                    }}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-[#C7C7CC] text-[#86868B] hover:border-corporate hover:text-corporate transition-colors"
                  >
                    + Nueva lista
                  </button>
                </div>
                {!availableLists.includes(list) && list && (
                  <div className="flex items-center gap-2 text-xs text-corporate">
                    <span>Lista nueva: {list}</span>
                    <button onClick={() => setList('General')} className="text-[#86868B] hover:text-[#FF3B30]">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Detalles */}
            <div className="bg-white rounded-2xl border border-[#E5E5E7] overflow-hidden mb-4">
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#E5E5E7]">
                <Info className="w-4 h-4 text-corporate" />
                <span className="text-sm font-medium text-[#1D1D1F]">Detalles</span>
              </div>
              <div className="px-4 py-2.5 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-2 mb-1.5">
                  <Hash className="w-4 h-4 text-[#8E8E93]" />
                  <span className="text-sm text-[#1D1D1F]">Etiquetas</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-corporate/10 text-corporate text-xs font-medium"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                        className="hover:text-[#FF3B30]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <Input
                    placeholder="Agregar..."
                    className="w-20 border-0 rounded-none focus-visible:ring-0 text-xs px-0 h-7"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const value = e.currentTarget.value.trim();
                        if (value && !tags.includes(value)) {
                          setTags([...tags, value]);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-3">
                  <Flag className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-[#1D1D1F]">Indicador</span>
                </div>
                <Switch checked={flagged} onCheckedChange={setFlagged} className="scale-90" />
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-[#1D1D1F]">Prioridad</span>
                </div>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as FirestoreReminder['priority'])}
                  className="text-sm bg-transparent text-corporate focus:outline-none"
                >
                  <option value="none">Ninguna</option>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div className="px-4 py-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <ImageIcon className="w-4 h-4 text-[#8E8E93]" />
                  <span className="text-sm text-[#1D1D1F]">Imagen</span>
                </div>
                <ReminderImageUpload imageUrl={imageUrl} onChange={setImageUrl} />
              </div>
            </div>

            {/* Items / checklist */}
            <div className="bg-white rounded-2xl border border-[#E5E5E7] overflow-hidden mb-4">
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#E5E5E7]">
                <CheckSquare className="w-4 h-4 text-corporate" />
                <span className="text-sm font-medium text-[#1D1D1F]">Pasos</span>
              </div>
              <div className="px-4 py-3 space-y-2">
                {items.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleItemInEditor(item.id)}
                      className={cn(
                        'flex-shrink-0 transition-colors',
                        item.completed ? 'text-corporate' : 'text-[#C7C7CC]'
                      )}
                    >
                      {item.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <Input
                      value={item.text}
                      onChange={(e) => handleUpdateItemText(item.id, e.target.value)}
                      placeholder={`Paso ${index + 1}`}
                      className="flex-1 border-0 rounded-none focus-visible:ring-0 text-sm px-0"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-[#C7C7CC] hover:text-[#FF3B30] rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 text-sm font-medium text-corporate hover:text-corporate/80 transition-colors pt-1"
                >
                  <Plus className="w-4 h-4" />
                  Añadir paso
                </button>
              </div>
            </div>

            {editingReminder && canConvert && (
              <button
                type="button"
                onClick={() => startConvert(editingReminder)}
                disabled={isSavingReminder}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-corporate bg-corporate/5 hover:bg-corporate/10 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 mb-4"
              >
                <ArrowRightLeft className="w-4 h-4" />
                Convertir en tarea
              </button>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => { setIsEditorOpen(false); resetReminderEditor(); }}
                disabled={isSavingReminder}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 rounded-xl text-white bg-corporate hover:bg-corporate/90"
                onClick={handleSaveReminder}
                disabled={isSavingReminder}
              >
                {isSavingReminder ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de conversión */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Convertir en tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-[#86868B]">
              Elige el tipo de tarea. Se abrirá el formulario completo para que completes asignación, turnos y demás detalles.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {user && hasPermission(user, 'canCreateSpecificTask') && (
                <button
                  onClick={() => doConvert('specific')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#E5E5E7] hover:border-corporate hover:bg-corporate/5 transition-colors"
                >
                  <Target className="w-6 h-6 text-corporate" />
                  <span className="text-sm font-medium text-[#1D1D1F]">Específica</span>
                </button>
              )}
              {user && hasPermission(user, 'canCreateExtraTask') && (
                <button
                  onClick={() => doConvert('extra')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#E5E5E7] hover:border-amber-500 hover:bg-amber-500/5 transition-colors"
                >
                  <Plus className="w-6 h-6 text-amber-500" />
                  <span className="text-sm font-medium text-[#1D1D1F]">Extra</span>
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default GlobalFAB;
