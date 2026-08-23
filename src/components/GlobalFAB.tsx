import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useFirestoreNotes, NoteItem, FirestoreNote } from '@/hooks/firestore/useFirestoreNotes';
import { useFirestoreTasks } from '@/hooks/firestore/useFirestoreTasks';
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
import { toast } from 'sonner';
import { TaskStatus, TaskPriority } from '@/types';

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

export function GlobalFAB() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { notes, createNote, updateNote, toggleNoteItem, deleteNote, markNoteConverted } = useFirestoreNotes(user?.id);
  const { createTask } = useFirestoreTasks();

  const [isOpen, setIsOpen] = useState(false);
  const [isFabVisible, setIsFabVisible] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'sugerencia' | 'problema'>('sugerencia');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [editingNote, setEditingNote] = useState<FirestoreNote | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteItems, setNoteItems] = useState<NoteItem[]>([]);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mouseInHotCornerRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpenRef = useRef(isOpen);
  const showNotesPanelRef = useRef(showNotesPanel);
  const showFeedbackRef = useRef(showFeedback);
  const touchStartRef = useRef<{ x: number; y: number; inHotCorner: boolean } | null>(null);

  isOpenRef.current = isOpen;
  showNotesPanelRef.current = showNotesPanel;
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
      if (!isOpenRef.current && !showNotesPanelRef.current && !showFeedbackRef.current && !mouseInHotCornerRef.current) {
        setIsFabVisible(false);
      }
    }, HIDE_DELAY);
  }, []);

  const scheduleInactivityHide = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      if (!isOpenRef.current && !showNotesPanelRef.current && !showFeedbackRef.current && !mouseInHotCornerRef.current) {
        setIsFabVisible(false);
      }
    }, INACTIVITY_DELAY);
  }, []);

  // Auto-hide initial delay
  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [scheduleHide]);

  // Desktop hot corner
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

  // Keep visible while any panel/menu is open
  useEffect(() => {
    if (isOpen || showNotesPanel || showFeedback) {
      showFab();
    } else {
      scheduleHide();
    }
  }, [isOpen, showNotesPanel, showFeedback, showFab, scheduleHide]);

  // Mobile swipe up from bottom-right hot corner
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
      const dy = start.y - t.clientY; // positive = upward
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

  // Cerrar al hacer click fuera
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

  const handleOpenNotes = () => {
    setIsOpen(false);
    setShowNotesPanel(true);
  };

  const resetNoteEditor = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteItems([]);
  };

  const handleNewNote = () => {
    resetNoteEditor();
    setNoteTitle('');
    setNoteItems([{ id: generateId(), text: '', completed: false }]);
  };

  const handleEditNote = (note: FirestoreNote) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteItems(note.items.length > 0 ? note.items : [{ id: generateId(), text: '', completed: false }]);
  };

  const handleSaveNote = async () => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión para guardar notas');
      return;
    }
    const title = noteTitle.trim() || 'Sin título';
    const items = noteItems.filter((item) => item.text.trim() !== '');
    setIsSavingNote(true);
    try {
      if (editingNote) {
        await updateNote(editingNote.id, { title, items });
        toast.success('Nota actualizada');
      } else {
        await createNote(title, items);
        toast.success('Nota creada');
      }
      resetNoteEditor();
    } catch (err) {
      console.error('Error guardando nota:', err);
      toast.error('No se pudo guardar la nota');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleAddItem = () => {
    setNoteItems((prev) => [...prev, { id: generateId(), text: '', completed: false }]);
  };

  const handleUpdateItemText = (id: string, text: string) => {
    setNoteItems((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  const handleToggleItemInEditor = (id: string) => {
    setNoteItems((prev) => prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)));
  };

  const handleRemoveItem = (id: string) => {
    setNoteItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleConvertNote = async (note: FirestoreNote) => {
    if (!user?.id || !user.department) {
      toast.error('Debes iniciar sesión para convertir notas');
      return;
    }

    const canSpecific = hasPermission(user, 'canCreateSpecificTask');
    const canExtra = hasPermission(user, 'canCreateExtraTask');

    if (!canSpecific && !canExtra) {
      toast.error('No tienes permiso para crear tareas');
      return;
    }

    setIsConverting(true);
    try {
      const taskType = canSpecific ? 'SPECIFIC' : 'EXTRA';
      const uncheckedItems = note.items.filter((item) => !item.completed);
      const description =
        uncheckedItems.length > 0
          ? `Pendientes: ${uncheckedItems.map((item) => item.text).join(', ')}`
          : '';

      const taskId = await createTask({
        title: note.title,
        description,
        type: taskType as 'SPECIFIC' | 'EXTRA',
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        assignedTo: [user.id],
        department: normalizeDept(user.department),
        dueDate: todayISO(),
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        subtasks: note.items.map((item) => ({
          id: item.id,
          title: item.text,
          completed: item.completed,
        })),
      });

      await markNoteConverted(note.id, taskId);
      toast.success(`Nota convertida en ${canSpecific ? 'tarea específica' : 'tarea extra'}`, {
        action: {
          label: 'Ver tarea',
          onClick: () => navigate(`/tasks?id=${taskId}`),
        },
      });
      resetNoteEditor();
    } catch (err) {
      console.error('Error convirtiendo nota:', err);
      toast.error('No se pudo convertir la nota');
    } finally {
      setIsConverting(false);
    }
  };

  const activeNotes = notes.filter((note) => note.status === 'active');

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
      id: 'notes',
      label: 'Notas',
      icon: StickyNote,
      color: 'text-[#FF9500]',
      bgColor: 'bg-white',
      onClick: handleOpenNotes,
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
        {/* Overlay semitransparente solo para dar foco */}
        {isOpen && (
          <div className="fixed inset-0 bg-black/10 pointer-events-none" />
        )}

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

      {/* Panel de Notas a pantalla completa */}
      {showNotesPanel && (
        <div className="fixed inset-0 z-50 bg-[#F5F5F7] flex flex-col">
          <header className="sticky top-0 z-10 bg-[#F5F5F7]/95 backdrop-blur border-b border-[#E5E5E7] px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => {
                setShowNotesPanel(false);
                resetNoteEditor();
              }}
              className="flex items-center gap-1 text-corporate font-medium text-sm px-2 py-1 rounded-lg hover:bg-corporate/5 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Cerrar
            </button>
            <h1 className="text-lg font-semibold text-[#1D1D1F]">Notas</h1>
            <button
              onClick={handleNewNote}
              className="flex items-center gap-1 text-corporate font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-corporate/5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva nota
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4">
            {activeNotes.length === 0 && !editingNote && (
              <div className="flex flex-col items-center justify-center h-full text-[#86868B] space-y-3">
                <StickyNote className="w-12 h-12 opacity-20" />
                <p className="text-sm">No tienes notas activas</p>
                <button
                  onClick={handleNewNote}
                  className="text-corporate text-sm font-medium px-4 py-2 rounded-xl bg-corporate/5 hover:bg-corporate/10 transition-colors"
                >
                  Crear una nota
                </button>
              </div>
            )}

            <div className="space-y-3 max-w-2xl mx-auto">
              {activeNotes.map((note) => {
                const completed = note.items.filter((item) => item.completed).length;
                const total = note.items.length;
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <div
                    key={note.id}
                    className="bg-white rounded-2xl shadow-sm border border-[#E5E5E7] p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => handleEditNote(note)}
                        className="text-left flex-1"
                      >
                        <h3 className="font-semibold text-[#1D1D1F]">{note.title}</h3>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditNote(note)}
                          className="p-2 text-[#86868B] hover:text-corporate hover:bg-corporate/5 rounded-full transition-colors"
                          title="Editar"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="p-2 text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/5 rounded-full transition-colors"
                          title="Archivar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {note.items.length > 0 && (
                      <div className="space-y-2">
                        {note.items.slice(0, 4).map((item) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <button
                              onClick={() => toggleNoteItem(note.id, item.id)}
                              className={cn(
                                'flex-shrink-0 transition-colors',
                                item.completed ? 'text-corporate' : 'text-[#C7C7CC]'
                              )}
                            >
                              {item.completed ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>
                            <span
                              className={cn(
                                'text-sm truncate',
                                item.completed ? 'text-[#86868B] line-through' : 'text-[#1D1D1F]'
                              )}
                            >
                              {item.text}
                            </span>
                          </div>
                        ))}
                        {note.items.length > 4 && (
                          <p className="text-xs text-[#86868B] pl-8">
                            +{note.items.length - 4} elementos más
                          </p>
                        )}
                      </div>
                    )}

                    {total > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-[#86868B]">
                          <span>{completed} de {total}</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5 bg-[#E5E5E7]" />
                      </div>
                    )}

                    <div className="flex items-center justify-end pt-1">
                      <button
                        onClick={() => handleConvertNote(note)}
                        disabled={isConverting}
                        className="flex items-center gap-1.5 text-xs font-medium text-corporate bg-corporate/5 hover:bg-corporate/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        {isConverting ? 'Convirtiendo...' : 'Convertir en tarea'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Editor de nota */}
      <Dialog
        open={!!editingNote || noteItems.length > 0 || noteTitle !== ''}
        onOpenChange={(open) => {
          if (!open) resetNoteEditor();
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg rounded-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingNote ? 'Editar nota' : 'Nueva nota'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 overflow-y-auto">
            <Input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Título"
              className="rounded-xl border-[#E5E5E7] text-[#1D1D1F] font-medium"
            />

            <div className="space-y-2">
              {noteItems.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleItemInEditor(item.id)}
                    className={cn(
                      'flex-shrink-0 transition-colors',
                      item.completed ? 'text-corporate' : 'text-[#C7C7CC]'
                    )}
                  >
                    {item.completed ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <Input
                    value={item.text}
                    onChange={(e) => handleUpdateItemText(item.id, e.target.value)}
                    placeholder={`Elemento ${index + 1}`}
                    className="flex-1 rounded-xl border-[#E5E5E7] text-sm"
                    autoFocus={index === noteItems.length - 1 && item.text === ''}
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
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-2 text-sm font-medium text-corporate hover:text-corporate/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Añadir elemento
            </button>

            {editingNote && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleConvertNote(editingNote)}
                  disabled={isConverting}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-corporate bg-corporate/5 hover:bg-corporate/10 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {isConverting ? 'Convirtiendo...' : 'Convertir en tarea'}
                </button>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={resetNoteEditor}
                disabled={isSavingNote || isConverting}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 rounded-xl text-white bg-corporate hover:bg-corporate/90"
                onClick={handleSaveNote}
                disabled={isSavingNote || isConverting || noteItems.every((item) => !item.text.trim())}
              >
                {isSavingNote ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default GlobalFAB;
