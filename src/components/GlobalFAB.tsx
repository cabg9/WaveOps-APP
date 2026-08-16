import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Target, AlertCircle, MessageSquare, X, Lightbulb, Flag } from 'lucide-react';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { db } from '@/firebase-config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface FabAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  onClick: () => void;
  requiredRole?: () => boolean;
}

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

export function GlobalFAB() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'sugerencia' | 'problema'>('sugerencia');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      <div
        ref={containerRef}
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end"
      >
        {/* Overlay semitransparente solo para dar foco */}
        {isOpen && (
          <div className="fixed inset-0 bg-black/10 pointer-events-none" />
        )}

        {/* Acciones secundarias */}
        <div className="flex flex-col items-end gap-3 mb-3 mr-0.5">
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
    </>
  );
}

export default GlobalFAB;
