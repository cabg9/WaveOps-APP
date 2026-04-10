// ═══════════════════════════════════════════════════════════════════
// DASHBOARD - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  FileText,
  CreditCard,
  IdCard,
  ShoppingCart,
  Car,
  Anchor,
  ArrowUpRight,
  Users,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock3,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useTasks } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

interface ModuleCardProps {
  id: string;
  title: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  stat1: { label: string; value: string | number };
  stat2: { label: string; value: string | number };
  bottomText: string;
  bottomStatus: 'active' | 'inactive' | 'progress';
  onClick: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// MODULE CARD
// ═══════════════════════════════════════════════════════════════════

function ModuleCard({
  title,
  icon: Icon,
  iconColor,
  bgColor,
  stat1,
  stat2,
  bottomText,
  bottomStatus,
  onClick,
}: ModuleCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200 group text-left w-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bgColor)}>
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
          <span className="font-medium text-[#1D1D1F]">{title}</span>
        </div>
        <ArrowUpRight className="w-4 h-4 text-[#C7C7CC] group-hover:text-[#86868B] transition-colors" />
      </div>

      {/* Stats */}
      <div className="flex gap-6 mb-3">
        <div>
          <p className="text-xs text-[#86868B] mb-0.5">{stat1.label}</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{stat1.value}</p>
        </div>
        <div>
          <p className="text-xs text-[#86868B] mb-0.5">{stat2.label}</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{stat2.value}</p>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            bottomStatus === 'active' && 'bg-[#34C759]',
            bottomStatus === 'inactive' && 'bg-[#8E8E93]',
            bottomStatus === 'progress' && 'bg-[#FF9500]'
          )}
        />
        <span className="text-xs text-[#86868B]">{bottomText}</span>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getTaskCounts } = useTasks();

  const taskCounts = getTaskCounts();

  // Datos de ejemplo para los módulos
  const modules = [
    {
      id: 'tasks',
      title: 'Tasks',
      icon: ClipboardList,
      iconColor: 'text-corporate',
      bgColor: 'bg-corporate/10',
      stat1: { label: 'Hoy', value: taskCounts.pending + taskCounts.inProgress },
      stat2: { label: 'Atrasados', value: taskCounts.overdue },
      bottomText: 'Progreso',
      bottomStatus: 'progress' as const,
    },
    {
      id: 'horarios',
      title: 'Horarios',
      icon: Clock,
      iconColor: 'text-apple-blue',
      bgColor: 'bg-apple-blue/10',
      stat1: { label: 'Hoy', value: 'Despacho' },
      stat2: { label: 'Solicitudes', value: 0 },
      bottomText: 'Activo',
      bottomStatus: 'active' as const,
    },
    {
      id: 'reportes',
      title: 'Reportes',
      icon: FileText,
      iconColor: 'text-apple-green',
      bgColor: 'bg-apple-green/10',
      stat1: { label: 'Pendientes', value: 3 },
      stat2: { label: 'Generados', value: 12 },
      bottomText: 'Activo',
      bottomStatus: 'active' as const,
    },
    {
      id: 'ordenes-pago',
      title: 'Órdenes de Pago',
      icon: CreditCard,
      iconColor: 'text-apple-orange',
      bgColor: 'bg-apple-orange/10',
      stat1: { label: 'Pendientes', value: 5 },
      stat2: { label: 'Aprobadas', value: 8 },
      bottomText: 'Activo',
      bottomStatus: 'active' as const,
    },
    {
      id: 'dive-ops',
      title: 'Dive Ops',
      icon: IdCard,
      iconColor: 'text-apple-cyan',
      bgColor: 'bg-apple-cyan/10',
      stat1: { label: 'Inmersiones', value: 2 },
      stat2: { label: 'Buceadores', value: 8 },
      bottomText: 'Activo',
      bottomStatus: 'active' as const,
    },
    {
      id: 'requisiciones',
      title: 'Requisiciones',
      icon: ShoppingCart,
      iconColor: 'text-apple-yellow',
      bgColor: 'bg-apple-yellow/10',
      stat1: { label: 'Pendientes', value: 4 },
      stat2: { label: 'Entregadas', value: 15 },
      bottomText: 'Activo',
      bottomStatus: 'active' as const,
    },
    {
      id: 'movilidad',
      title: 'Movilidad',
      icon: Car,
      iconColor: 'text-apple-red',
      bgColor: 'bg-apple-red/10',
      stat1: { label: 'Vehículos', value: 0 },
      stat2: { label: 'Rutas', value: 0 },
      bottomText: 'Activo',
      bottomStatus: 'active' as const,
    },
    {
      id: 'vessels',
      title: 'Vessels',
      icon: Anchor,
      iconColor: 'text-apple-purple',
      bgColor: 'bg-apple-purple/10',
      stat1: { label: 'Barcos', value: 0 },
      stat2: { label: 'Salidas', value: 0 },
      bottomText: 'Activo',
      bottomStatus: 'active' as const,
    },
  ];

  return (
    <Layout title="Dashboard" showDate={true}>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1D1D1F] to-[#3A3A3C] text-white p-6">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
                {user?.department?.replace(/_/g, ' ') || 'STAFF'}
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-1">
              ¡Hola {user?.name?.split(' ')[0] || 'Usuario'}!
            </h2>
            <p className="text-white/60 text-sm">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })} · {user?.department?.replace(/_/g, ' ') || 'Dive Shop'}
            </p>
          </div>
          {/* Decorative element */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 w-20 h-20 bg-white/5 rounded-full" />
        </div>

        {/* Modules Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1D1D1F]">Módulos</h3>
            <button className="text-sm text-corporate hover:underline">
              Accesos rápidos
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {modules.map((module) => (
              <ModuleCard
                key={module.id}
                {...module}
                onClick={() => navigate(`/${module.id}`)}
              />
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Próxima Salida */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-corporate" />
              <h3 className="font-semibold text-[#1D1D1F]">Próxima Salida</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#86868B] mb-1">Gordon&apos;s Rocks</p>
                <p className="text-xs text-[#86868B]">viernes, 20 de marzo · 07:00</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[#86868B]">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">10</span>
                </div>
                <div className="w-8 h-8 bg-corporate/10 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-corporate" />
                </div>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-[#E5E5E7]">
              <div className="text-center">
                <div className="w-8 h-8 bg-corporate/10 rounded-lg flex items-center justify-center mx-auto mb-1">
                  <Users className="w-4 h-4 text-corporate" />
                </div>
                <p className="text-lg font-semibold text-[#1D1D1F]">6</p>
                <p className="text-xs text-[#86868B]">Buzos</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-apple-blue/10 rounded-lg flex items-center justify-center mx-auto mb-1">
                  <CheckCircle2 className="w-4 h-4 text-apple-blue" />
                </div>
                <p className="text-lg font-semibold text-[#1D1D1F]">3</p>
                <p className="text-xs text-[#86868B]">DSD</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-apple-cyan/10 rounded-lg flex items-center justify-center mx-auto mb-1">
                  <AlertCircle className="w-4 h-4 text-apple-cyan" />
                </div>
                <p className="text-lg font-semibold text-[#1D1D1F]">1</p>
                <p className="text-xs text-[#86868B]">Snorkelers</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-apple-green/10 rounded-lg flex items-center justify-center mx-auto mb-1">
                  <ClipboardList className="w-4 h-4 text-apple-green" />
                </div>
                <p className="text-lg font-semibold text-[#1D1D1F]">10/12</p>
                <p className="text-xs text-[#86868B]">Equipos</p>
              </div>
            </div>
          </div>

          {/* Resumen del Equipo */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-corporate" />
              <h3 className="font-semibold text-[#1D1D1F]">Resumen del Equipo</h3>
            </div>
            <p className="text-sm text-[#86868B] mb-4">{user?.department?.replace(/_/g, ' ') || 'Dive Shop'}</p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-corporate/10 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-corporate" />
                  </div>
                  <span className="text-sm text-[#1D1D1F]">Total Tasks</span>
                </div>
                <span className="text-lg font-semibold text-[#1D1D1F]">{taskCounts.total}</span>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-apple-green/10 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-apple-green" />
                  </div>
                  <span className="text-sm text-[#1D1D1F]">Completados</span>
                </div>
                <span className="text-lg font-semibold text-[#1D1D1F]">{taskCounts.completed + taskCounts.verified}</span>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-apple-red/10 rounded-lg flex items-center justify-center">
                    <Clock3 className="w-4 h-4 text-apple-red" />
                  </div>
                  <span className="text-sm text-[#1D1D1F]">Atrasados</span>
                </div>
                <span className="text-lg font-semibold text-[#1D1D1F]">{taskCounts.overdue}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
