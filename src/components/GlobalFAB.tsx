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
  StickyNote,
  ChevronLeft,
  Circle,
  CheckCircle2,
  Trash2,
  ArrowRightLeft,
  Calendar,
  Clock,
  Bell,
  Hash,
  MapPin,
  Image as ImageIcon,
  List,
  Info,
  ChevronRight,
  CalendarDays,
  CalendarCheck,
  CheckSquare,
  LayoutList,
} from 'lucide-react';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useFirestoreReminders, ReminderItem, FirestoreReminder } from '@/hooks/firestore/useFirestoreReminders';
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

const CATEGORIES = [
  { id: 'today', label: 'Hoy', icon: CalendarDays, color: 'bg-[#007AFF]', countKey: 'today' },
  { id: 'scheduled', label: 'Programados', icon: Calendar, color: 'bg-[#FF9500]', countKey: 'scheduled' },
  { id: 'all', label: 'Todos', icon: LayoutList, color: 'bg-[#5856D6]', countKey: 'all' },
  { id: 'flagged', label: 'Indicador', icon: Flag, color: 'bg-[#FF3B30]', countKey: 'flagged' },
  { id: 'urgent', label: 'Urgente', icon: Bell, color: 'bg-[#FF2D55]', countKey: 'urgent' },
  { id: 'completed', label: 'Terminados', icon: CheckSquare, color: 'bg-[#34C759]', countKey: 'completed' },
  { id: 'personal', label: 'Personal', icon: List, color: 'bg-[#8E8E93]', countKey: 'personal' },
] as const;

export function GlobalFAB() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    reminders,
    createReminder,
    updateReminder,
    toggleReminderItem,
    archiveReminder,
    markReminderConverted,
  } = useFirestoreReminders(user?.id);

  const [isOpen, setIsOpen] = useState(false);
  const [isFabVisible, setIsFabVisible] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'sugerencia' | 'problema'>('sugerencia');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showRemindersPanel, setShowRemindersPanel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [editingReminder, setEditingReminder] = useState<FirestoreReminder | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');
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
  const [reminderLocation, setReminderLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertType, setConvertType] = useState<'specific' | 'extra' | null>(null);

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
    setUrl('');
    setItems([]);
    setHasDate(false);
    setHasTime(false);
    setDueDate('');
    setDueTime('');
    setIsUrgent(false);
    setList('Personal');
    setTags([]);
    setFlagged(false);
    setPriority('none');
    setReminderLocation('');
    setImageUrl('');
  };

  const handleNewReminder = () => {
    resetReminderEditor();
    setItems([{ id: generateId(), text: '', completed: false }]);
  };

  const handleEditReminder = (reminder: FirestoreReminder) => {
    setEditingReminder(reminder);
    setTitle(reminder.title);
    setNotes(reminder.notes || '');
    setUrl(reminder.url || '');
    setItems(reminder.items.length > 0 ? reminder.items : [{ id: generateId(), text: '', completed: false }]);
    setHasDate(reminder.hasDate);
    setHasTime(reminder.hasTime);
    setDueDate(reminder.dueDate || '');
    setDueTime(reminder.dueTime || '');
    setIsUrgent(reminder.isUrgent);
    setList(reminder.list || 'Personal');
    setTags(reminder.tags || []);
    setFlagged(reminder.flagged);
    setPriority(reminder.priority || 'none');
    setReminderLocation(reminder.location || '');
    setImageUrl(reminder.imageUrl || '');
  };

  const buildReminderData = (): Partial<FirestoreReminder> => ({
    title: title.trim() || 'Sin título',
    notes: notes.trim(),
    url: url.trim(),
    items: items.filter((item) => item.text.trim() !== ''),
    hasDate,
    hasTime,
    dueDate: hasDate ? dueDate || todayISO() : '',
    dueTime: hasDate && hasTime ? dueTime || '09:00' : '',
    isUrgent,
    list: list.trim() || 'Personal',
    tags,
    flagged,
    priority,
    location: reminderLocation.trim(),
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

  const startConvert = () => {
    if (!editingReminder) return;
    const canSpecific = user && hasPermission(user, 'canCreateSpecificTask');
    const canExtra = user && hasPermission(user, 'canCreateExtraTask');
    if (!canSpecific && !canExtra) {
      toast.error('No tienes permiso para crear tareas');
      return;
    }
    if (canSpecific && canExtra) {
      setShowConvertDialog(true);
      return;
    }
    doConvert(canSpecific ? 'specific' : 'extra');
  };

  const doConvert = (type: 'specific' | 'extra') => {
    if (!editingReminder) return;
    setShowConvertDialog(false);
    setShowRemindersPanel(false);
    resetReminderEditor();
    navigate(`/tasks?create=${type}&reminderId=${editingReminder.id}`);
  };

  const activeReminders = reminders.filter((r) => r.status === 'active');

  const counts = useMemo(() => {
    const today = todayISO();
    return {
      today: activeReminders.filter((r) => r.hasDate && r.dueDate === today).length,
      scheduled: activeReminders.filter((r) => r.hasDate).length,
      all: activeReminders.length,
      flagged: activeReminders.filter((r) => r.flagged).length,
      urgent: activeReminders.filter((r) => r.isUrgent).length,
      completed: reminders.filter((r) => r.status === 'converted' || (r.items.length > 0 && r.items.every((i) => i.completed))).length,
      personal: activeReminders.filter((r) => r.list === 'Personal' || !r.list).length,
    };
  }, [activeReminders, reminders]);

  const filteredReminders = useMemo(() => {
    let result = [...activeReminders];
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
        result = reminders.filter((r) => r.status === 'converted' || (r.items.length > 0 && r.items.every((i) => i.completed)));
        break;
      case 'personal':
        result = result.filter((r) => r.list === 'Personal' || !r.list);
        break;
    }
    return result;
  }, [activeReminders, reminders, selectedCategory]);

  const groupedReminders = useMemo(() => {
    const groups: Record<string, FirestoreReminder[]> = {};
    filteredReminders.forEach((r) => {
      const key = r.list || 'Personal';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [filteredReminders]);

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
      icon: StickyNote,
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
                    'w-12 h-12 rounded-full shadow-lg border border-[#E5E5E7] flex items-center justify-center transition-transform duration-200 hover:scale-110',
                    action.bgColor,
                    action.color
                  )}
                  title={action.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Botón principal */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-14 h-14 rounded-full bg-corporate text-white shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105',
            isOpen && 'rotate-45'
          )}
          aria-label="Acciones rápidas"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
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
        <div className="fixed inset-0 z-50 bg-[#F2F2F7] flex flex-col">
          <header className="sticky top-0 z-10 bg-[#F2F2F7]/95 backdrop-blur border-b border-[#E5E5E7] px-4 py-3 flex items-center justify-between">
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
              className="flex items-center gap-1 text-corporate font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-corporate/5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Categorías */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6 max-w-5xl mx-auto">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const count = (counts as any)[cat.countKey] || 0;
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      'relative flex flex-col justify-between items-start text-left rounded-2xl p-3 min-h-[80px] transition-transform hover:scale-[1.02]',
                      cat.color,
                      active ? 'ring-2 ring-offset-2 ring-corporate' : ''
                    )}
                  >
                    <Icon className="w-6 h-6 text-white/90" />
                    <div className="w-full">
                      <div className="text-2xl font-bold text-white leading-none">{count}</div>
                      <div className="text-xs text-white/90 font-medium mt-0.5">{cat.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {Object.keys(groupedReminders).length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-[#86868B] space-y-3">
                <CalendarCheck className="w-12 h-12 opacity-20" />
                <p className="text-sm">No hay recordatorios en esta categoría</p>
                <button
                  onClick={handleNewReminder}
                  className="text-corporate text-sm font-medium px-4 py-2 rounded-xl bg-corporate/5 hover:bg-corporate/10 transition-colors"
                >
                  Crear un recordatorio
                </button>
              </div>
            )}

            <div className="space-y-4 max-w-2xl mx-auto">
              {Object.entries(groupedReminders).map(([listName, listReminders]) => (
                <div key={listName} className="space-y-2">
                  <h2 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wide ml-1">{listName}</h2>
                  <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E7] overflow-hidden">
                    {listReminders.map((reminder, idx) => {
                      const completed = reminder.items.filter((item) => item.completed).length;
                      const total = reminder.items.length;
                      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                      const dateLabel = formatReminderDate(reminder.dueDate, reminder.hasTime, reminder.dueTime);
                      return (
                        <div
                          key={reminder.id}
                          className={cn(
                            'p-4 transition-colors hover:bg-[#F9F9FB]',
                            idx !== listReminders.length - 1 && 'border-b border-[#E5E5E7]'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              onClick={() => handleEditReminder(reminder)}
                              className="text-left flex-1 min-w-0"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                {total > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleReminderItem(reminder.id, reminder.items[0].id);
                                    }}
                                    className={cn(
                                      'flex-shrink-0 transition-colors',
                                      reminder.items[0].completed ? 'text-corporate' : 'text-[#C7C7CC]'
                                    )}
                                  >
                                    {reminder.items[0].completed ? (
                                      <CheckCircle2 className="w-5 h-5" />
                                    ) : (
                                      <Circle className="w-5 h-5" />
                                    )}
                                  </button>
                                )}
                                <h3 className={cn('font-semibold text-[#1D1D1F]', completed === total && total > 0 && 'line-through text-[#86868B]')}>
                                  {reminder.title}
                                </h3>
                              </div>
                              {reminder.notes && (
                                <p className="text-sm text-[#86868B] mt-0.5 line-clamp-2">{reminder.notes}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {dateLabel && (
                                  <span className={cn(
                                    'text-xs flex items-center gap-1',
                                    reminder.dueDate && reminder.dueDate < todayISO() ? 'text-[#FF3B30]' : 'text-[#007AFF]'
                                  )}>
                                    <Calendar className="w-3 h-3" />
                                    {dateLabel}
                                  </span>
                                )}
                                {reminder.isUrgent && (
                                  <span className="text-xs text-[#FF2D55] flex items-center gap-1">
                                    <Bell className="w-3 h-3" />
                                    Urgente
                                  </span>
                                )}
                                {reminder.flagged && (
                                  <span className="text-xs text-[#FF9500] flex items-center gap-1">
                                    <Flag className="w-3 h-3" />
                                    Indicador
                                  </span>
                                )}
                                {total > 0 && (
                                  <span className="text-xs text-[#8E8E93]">{completed} de {total}</span>
                                )}
                              </div>
                              {total > 1 && (
                                <div className="mt-2 space-y-1">
                                  {reminder.items.slice(1, 4).map((item) => (
                                    <div key={item.id} className="flex items-center gap-2 text-sm">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleReminderItem(reminder.id, item.id);
                                        }}
                                        className={cn(
                                          'flex-shrink-0 transition-colors',
                                          item.completed ? 'text-corporate' : 'text-[#C7C7CC]'
                                        )}
                                      >
                                        {item.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                      </button>
                                      <span className={cn('truncate', item.completed && 'line-through text-[#86868B]')}>
                                        {item.text}
                                      </span>
                                    </div>
                                  ))}
                                  {total > 4 && (
                                    <p className="text-xs text-[#86868B] pl-6">+{total - 4} más</p>
                                  )}
                                </div>
                              )}
                              {total > 0 && (
                                <div className="mt-2">
                                  <Progress value={progress} className="h-1 bg-[#E5E5E7]" />
                                </div>
                              )}
                            </button>
                            <div className="flex flex-col items-end gap-1">
                              {canConvert && (
                                <button
                                  onClick={() => handleEditReminder(reminder)}
                                  className="p-2 text-[#86868B] hover:text-corporate hover:bg-corporate/5 rounded-full transition-colors"
                                  title="Convertir en tarea"
                                >
                                  <ArrowRightLeft className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => archiveReminder(reminder.id, { userId: user?.id || '', userName: user?.name || '' })}
                                className="p-2 text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/5 rounded-full transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Editor de recordatorio */}
      {(editingReminder || items.length > 0 || title !== '' || notes !== '' || url !== '') && (
        <div className="fixed inset-0 z-[60] bg-[#F2F2F7] flex flex-col">
          <header className="sticky top-0 z-10 bg-[#F2F2F7]/95 backdrop-blur border-b border-[#E5E5E7] px-4 py-3 flex items-center justify-between">
            <button
              onClick={resetReminderEditor}
              className="flex items-center gap-1 text-[#007AFF] font-medium text-sm px-2 py-1 rounded-lg hover:bg-[#007AFF]/5 transition-colors"
            >
              Cancelar
            </button>
            <h1 className="text-lg font-semibold text-[#1D1D1F]">
              {editingReminder ? 'Editar recordatorio' : 'Nuevo recordatorio'}
            </h1>
            <button
              onClick={handleSaveReminder}
              disabled={isSavingReminder}
              className="flex items-center gap-1 text-[#007AFF] font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-[#007AFF]/5 transition-colors disabled:opacity-50"
            >
              {isSavingReminder ? 'Guardando...' : 'Guardar'}
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
            <div className="bg-white rounded-2xl border border-[#E5E5E7] overflow-hidden mb-4">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título"
                className="border-0 rounded-none text-[#1D1D1F] font-medium placeholder:text-[#C7C7CC] focus-visible:ring-0 h-12"
              />
              <div className="h-px bg-[#E5E5E7]" />
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas"
                rows={3}
                className="border-0 rounded-none resize-none text-[#1D1D1F] placeholder:text-[#C7C7CC] focus-visible:ring-0"
              />
              <div className="h-px bg-[#E5E5E7]" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URL"
                className="border-0 rounded-none text-[#1D1D1F] placeholder:text-[#C7C7CC] focus-visible:ring-0 h-12"
              />
            </div>

            {/* Fecha y hora */}
            <div className="bg-white rounded-2xl border border-[#E5E5E7] overflow-hidden mb-4">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-[#007AFF]" />
                  <span className="text-[#1D1D1F]">Fecha</span>
                </div>
                <Switch checked={hasDate} onCheckedChange={setHasDate} />
              </div>
              {hasDate && (
                <div className="px-4 py-2 border-b border-[#E5E5E7]">
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="border-0 rounded-none focus-visible:ring-0"
                  />
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#007AFF]" />
                  <span className="text-[#1D1D1F]">Hora</span>
                </div>
                <Switch checked={hasTime} onCheckedChange={(v) => { setHasTime(v); if (v) setHasDate(true); }} />
              </div>
              {hasTime && (
                <div className="px-4 py-2">
                  <Input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="border-0 rounded-none focus-visible:ring-0"
                  />
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-[#FF2D55]" />
                  <span className="text-[#1D1D1F]">Urgente</span>
                </div>
                <Switch checked={isUrgent} onCheckedChange={setIsUrgent} />
              </div>
            </div>

            {/* Lista */}
            <div className="bg-white rounded-2xl border border-[#E5E5E7] overflow-hidden mb-4">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E5E7]">
                <List className="w-5 h-5 text-[#FF9500]" />
                <span className="text-[#1D1D1F]">Lista</span>
              </div>
              <div className="px-4 py-2">
                <Input
                  value={list}
                  onChange={(e) => setList(e.target.value)}
                  placeholder="Nombre de lista"
                  className="border-0 rounded-none focus-visible:ring-0"
                />
              </div>
            </div>

            {/* Detalles */}
            <div className="bg-white rounded-2xl border border-[#E5E5E7] overflow-hidden mb-4">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E5E7]">
                <Info className="w-5 h-5 text-[#5856D6]" />
                <span className="font-medium text-[#1D1D1F]">Detalles</span>
              </div>
              <div className="px-4 py-3 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-3 mb-2">
                  <Hash className="w-5 h-5 text-[#8E8E93]" />
                  <span className="text-[#1D1D1F]">Etiquetas</span>
                </div>
                <Input
                  value={tags.join(', ')}
                  onChange={(e) => setTags(e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
                  placeholder="Separadas por coma"
                  className="border-0 rounded-none focus-visible:ring-0 text-sm"
                />
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-3">
                  <Flag className="w-5 h-5 text-[#FF9500]" />
                  <span className="text-[#1D1D1F]">Poner indicador</span>
                </div>
                <Switch checked={flagged} onCheckedChange={setFlagged} />
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-[#FF3B30]" />
                  <span className="text-[#1D1D1F]">Prioridad</span>
                </div>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as FirestoreReminder['priority'])}
                  className="text-sm bg-transparent text-[#007AFF] focus:outline-none"
                >
                  <option value="none">Ninguna</option>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div className="px-4 py-3 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="w-5 h-5 text-[#8E8E93]" />
                  <span className="text-[#1D1D1F]">Ubicación</span>
                </div>
                <Input
                  value={reminderLocation}
                  onChange={(e) => setReminderLocation(e.target.value)}
                  placeholder="Agregar ubicación"
                  className="border-0 rounded-none focus-visible:ring-0 text-sm"
                />
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center gap-3 mb-2">
                  <ImageIcon className="w-5 h-5 text-[#8E8E93]" />
                  <span className="text-[#1D1D1F]">Imagen</span>
                </div>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="URL de imagen"
                  className="border-0 rounded-none focus-visible:ring-0 text-sm"
                />
              </div>
            </div>

            {/* Items / checklist */}
            <div className="bg-white rounded-2xl border border-[#E5E5E7] overflow-hidden mb-4">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E5E7]">
                <CheckSquare className="w-5 h-5 text-corporate" />
                <span className="font-medium text-[#1D1D1F]">Lista de pasos</span>
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
                      autoFocus={index === items.length - 1 && item.text === ''}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 text-[#C7C7CC] hover:text-[#FF3B30] rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-2 text-sm font-medium text-[#007AFF] hover:text-[#007AFF]/80 transition-colors pt-1"
                >
                  <Plus className="w-4 h-4" />
                  Añadir paso
                </button>
              </div>
            </div>

            {editingReminder && canConvert && (
              <button
                type="button"
                onClick={startConvert}
                disabled={isSavingReminder}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-corporate bg-corporate/5 hover:bg-corporate/10 px-4 py-3 rounded-xl transition-colors disabled:opacity-50 mb-4"
              >
                <ArrowRightLeft className="w-4 h-4" />
                Convertir en tarea
              </button>
            )}
          </div>
        </div>
      )}

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
