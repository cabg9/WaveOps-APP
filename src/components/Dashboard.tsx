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
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useTasks } from '@/hooks/useTasks';
import { useShifts } from '@/hooks/useShifts';
import { useDynamicDepartments } from '@/hooks/firestore/useDynamicDepartments';
import { db } from '@/firebase-config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Role } from '@/types';

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
  progress?: number;
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
  progress,
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
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-[#F5F5F7]')}>
            <Icon className={cn('w-5 h-5', 'text-[#86868B]')} />
          </div>
          <span className="font-medium text-[#1D1D1F]">{title}</span>
        </div>
        <ArrowUpRight className="w-4 h-4 text-[#C7C7CC] group-hover:text-[#86868B] transition-colors" />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center mb-3">
        <div className="text-right pr-5 min-w-[80px]">
          <p className="text-xs text-[#86868B] mb-0.5">{stat1.label}</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{stat1.value}</p>
        </div>
        <div className="w-px h-10 bg-[#E5E5E7]" />
        <div className="text-left pl-5 min-w-[80px]">
          <p className="text-xs text-[#86868B] mb-0.5">{stat2.label}</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{stat2.value}</p>
        </div>
      </div>

      {/* Bottom */}
      {progress !== undefined ? (
        <div className="mt-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#86868B]">{bottomText}</span>
            <span className="font-semibold text-[#1D1D1F]">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#E5E5E7] rounded-full overflow-hidden">
            <div className="h-full bg-corporate rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
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
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const navigate = useNavigate();
  const { visibleModules, hasDevelopAccess } = useAppConfig();
  const { user } = useAuth();
  const { tasks, getTaskCounts } = useTasks();
  const { getUserShifts } = useShifts();
  const { operationalDepartmentCodes, getDeptName } = useDynamicDepartments();

  const taskCounts = getTaskCounts();

  // ─── CONTEOS PERSONALES DEL USUARIO ACTUAL ───
  const getLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const todayStr = getLocalDate();

  // ─── CONTEOS DEL DEPARTAMENTO DEL USUARIO (Resumen de Equipo) ───
  const userDept = user?.department;
  const canViewAllDepartments = user?.role === Role.DIRECTOR_GENERAL || user?.role === Role.DIRECTOR || user?.role === Role.RRHH;
  const isGerenteOperaciones = user?.role === Role.GERENTE_OPERACIONES;

  const deptTasks = canViewAllDepartments
    ? tasks
    : isGerenteOperaciones
      ? tasks.filter((t) => operationalDepartmentCodes.includes(t.department))
      : userDept
        ? tasks.filter((t) => t.department === userDept)
        : [];

  const now = new Date();
  const isTaskOverdue = (t: any) => {
    if (!t.dueDate || t.status === 'COMPLETED' || t.status === 'VERIFIED') return false;
    const due = new Date(`${t.dueDate}T${t.dueTime || '23:59'}`);
    return due < now;
  };

  const deptTodayTasks = deptTasks.filter((t) => t.dueDate === todayStr);
  const deptOverdue = deptTasks.filter(isTaskOverdue);
  const deptOverduePrevious = deptOverdue.filter((t) => t.dueDate < todayStr);
  const deptCompletedToday = deptTodayTasks.filter((t) => t.status === 'COMPLETED' || t.status === 'VERIFIED');
  const teamTotalTasks = deptTodayTasks.length + deptOverduePrevious.length;
  const userId = user?.id;

  // ─── TURNO DE HOY ───
  const todayShifts = userId ? getUserShifts(userId, todayStr) : [];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const parseMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  const activeShift = todayShifts.find((s) => {
    const start = parseMinutes(s.startTime);
    const end = parseMinutes(s.endTime);
    return currentMinutes >= start && currentMinutes <= end;
  });
  const nextShift = todayShifts.find((s) => parseMinutes(s.startTime) > currentMinutes);
  const relevantShift = activeShift || nextShift || todayShifts[0];

  // ─── SOLICITUDES DE CAMBIO RECIBIDAS ───
  const [receivedChangeRequests, setReceivedChangeRequests] = React.useState(0);
  React.useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'solicitudes'),
      where('estado', '==', 'pendiente')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const count = snapshot.docs.filter((doc) => {
        const data = doc.data();
        const aId = data.aId;
        const a = data.a;
        return (
          aId === user.id ||
          aId === user.email ||
          a === user.name ||
          a === user.email
        );
      }).length;
      setReceivedChangeRequests(count);
    });
    return () => unsubscribe();
  }, [user]);

  const myTasks = userId ? tasks.filter((t) =>
    (t.assignedTo?.includes(userId)) ||
    (t.supportUserIds?.includes(userId)) ||
    (t.supervisorId === userId)
  ) : [];

  const myPendingToday    = myTasks.filter((t) => t.dueDate === todayStr && t.status === 'PENDING').length;
  const myTasksForVerification = myTasks.filter((t) => t.status === 'COMPLETED' && ((t.supervisorId === userId) || (!t.supervisorId && t.createdBy === userId))).length;
  const myInProgressToday = myTasks.filter((t) => t.dueDate === todayStr && t.status === 'IN_PROGRESS').length;
  const myCompletedToday  = myTasks.filter((t) => t.dueDate === todayStr && (t.status === 'COMPLETED' || t.status === 'VERIFIED')).length;
  const myOverdue = tasks.filter((t) => {
    if (!t.dueDate) return false;
    return t.dueDate < todayStr && t.status !== 'COMPLETED' && t.status !== 'VERIFIED' && userId && ((t.assignedTo?.includes(userId)) || (t.supportUserIds?.includes(userId)));
  }).length;

  const totalTodayMyTasks = myPendingToday + myInProgressToday + myCompletedToday + myTasksForVerification + myOverdue;
  const progressRaw = totalTodayMyTasks > 0 ? myTasks.filter((t) => t.dueDate === todayStr).reduce((sum, t) => {
    if (t.status === "COMPLETED" || t.status === "VERIFIED") return sum + 1.0;
    if (t.status === "IN_PROGRESS") {
      if (t.subtasks && t.subtasks.length > 0) {
        const completedSub = t.subtasks.filter((s) => s.completed).length;
        return sum + (completedSub / t.subtasks.length);
      }
      return sum + 0.5;
    }
    return sum;
  }, 0) : 0;
  const progressPercent = totalTodayMyTasks > 0 ? Math.round((progressRaw / totalTodayMyTasks) * 100) : 0;

  // Datos de ejemplo para los módulos
  // Módulos dinámicos desde Firestore
  const colorMap: Record<string, { iconColor: string; bgColor: string }> = {
    '#007AFF': { iconColor: 'text-corporate', bgColor: 'bg-corporate/10' },
    '#5856D6': { iconColor: 'text-apple-blue', bgColor: 'bg-apple-blue/10' },
    '#34C759': { iconColor: 'text-apple-green', bgColor: 'bg-apple-green/10' },
    '#FF9500': { iconColor: 'text-apple-orange', bgColor: 'bg-apple-orange/10' },
    '#5AC8FA': { iconColor: 'text-apple-cyan', bgColor: 'bg-apple-cyan/10' },
    '#FFCC00': { iconColor: 'text-apple-yellow', bgColor: 'bg-apple-yellow/10' },
    '#FF3B30': { iconColor: 'text-apple-red', bgColor: 'bg-apple-red/10' },
    '#AF52DE': { iconColor: 'text-apple-purple', bgColor: 'bg-apple-purple/10' },
    '#1D1D1F': { iconColor: 'text-[#1D1D1F]', bgColor: 'bg-[#1D1D1F]/10' },
  };

  const dynamicModules = visibleModules
    .filter((mod) => mod.id !== 'develops' || hasDevelopAccess)
    .map((mod) => {
    const colors = colorMap[mod.color] || { iconColor: 'text-corporate', bgColor: 'bg-corporate/10' };
    const IconComponent = (Icons[mod.icon as keyof typeof Icons] || Icons.LayoutDashboard) as React.ElementType;

    // Estadísticas según el módulo
    const statsByModule: Record<string, {
      stat1: { label: string; value: string | number };
      stat2: { label: string; value: string | number };
      bottomText: string;
      bottomStatus: 'active' | 'inactive' | 'progress';
      progress?: number;
    }> = {
      tasks: {
        stat1: { label: 'Hoy', value: myPendingToday + myTasksForVerification },
        stat2: { label: 'Atrasadas', value: myOverdue },
        bottomText: 'Progreso',
        bottomStatus: 'progress',
        progress: progressPercent,
      },
      horarios: {
        stat1: {
          label: 'Hoy',
          value: relevantShift ? relevantShift.name : 'Stand By',
        },
        stat2: { label: 'Solicitudes', value: receivedChangeRequests },
        bottomText: relevantShift
          ? activeShift
            ? `Activo · ${relevantShift.startTime}-${relevantShift.endTime} · ${getDeptName(relevantShift.department || '') || 'Dive Shop'}`
            : `${relevantShift.startTime}-${relevantShift.endTime} · ${getDeptName(relevantShift.department || '') || 'Dive Shop'}`
          : 'Stand By',
        bottomStatus: relevantShift ? (activeShift ? 'active' : 'inactive') : 'progress',
      },
      reportes: {
        stat1: { label: 'Pendientes', value: 3 },
        stat2: { label: 'Generados', value: 12 },
        bottomText: 'Activo',
        bottomStatus: 'active',
      },
      'ordenes-pago': {
        stat1: { label: 'Pendientes', value: 5 },
        stat2: { label: 'Aprobadas', value: 8 },
        bottomText: 'Activo',
        bottomStatus: 'active',
      },
      'dive-ops': {
        stat1: { label: 'Inmersiones', value: 2 },
        stat2: { label: 'Buceadores', value: 8 },
        bottomText: 'Activo',
        bottomStatus: 'active',
      },
      requisiciones: {
        stat1: { label: 'Pendientes', value: 4 },
        stat2: { label: 'Entregadas', value: 15 },
        bottomText: 'Activo',
        bottomStatus: 'active',
      },
      movilidad: {
        stat1: { label: 'Vehiculos', value: 0 },
        stat2: { label: 'Rutas', value: 0 },
        bottomText: 'Activo',
        bottomStatus: 'active',
      },
      vessels: {
        stat1: { label: 'Barcos', value: 0 },
        stat2: { label: 'Salidas', value: 0 },
        bottomText: 'Activo',
        bottomStatus: 'active',
      },
    };

    const stats = statsByModule[mod.id] || {
      stat1: { label: 'Estado', value: mod.isActive ? 'Activo' : 'Inactivo' },
      stat2: { label: 'Modulo', value: mod.name },
      bottomText: mod.isActive ? 'Activo' : 'Inactivo',
      bottomStatus: ('active' as 'active' | 'inactive' | 'progress'),
    };

    return {
      id: mod.id,
      title: mod.name,
      icon: IconComponent,
      ...colors,
      ...stats,
    };
  });

  const modules = dynamicModules;

  return (
    <Layout title="Dashboard" showDate={true}>
      <div className="space-y-6">
        {/* Welcome Banner + Logo */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-2xl text-white p-6">
            <img src="/whaleshark-bg.jpg" alt="Fondo" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
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
          </div>
          {/* Logo Dive X Surf - FUERA del banner para no ser cortado */}
          <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-20 h-20 sm:w-[72px] sm:h-[72px] rounded-full bg-black/30 flex items-center justify-center shadow-2xl border border-white/10">
            <img src="/divexsurf-logo.png" alt="Dive X Surf" className="w-20 h-20 sm:w-24 sm:h-24 object-contain" />
          </div>
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
            <p className="text-sm text-[#86868B] mb-4">
              {canViewAllDepartments
                ? 'Todos los departamentos'
                : isGerenteOperaciones
                  ? 'Departamentos operativos'
                  : (user?.department?.replace(/_/g, ' ') || 'Dive Shop')}
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-corporate/10 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-corporate" />
                  </div>
                  <span className="text-sm text-[#1D1D1F]">Total Tasks</span>
                </div>
                <span className="text-lg font-semibold text-[#1D1D1F]">{teamTotalTasks}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-apple-green/10 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-apple-green" />
                  </div>
                  <span className="text-sm text-[#1D1D1F]">Completados hoy</span>
                </div>
                <span className="text-lg font-semibold text-[#1D1D1F]">{deptCompletedToday.length}</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-apple-red/10 rounded-lg flex items-center justify-center">
                    <Clock3 className="w-4 h-4 text-apple-red" />
                  </div>
                  <span className="text-sm text-[#1D1D1F]">Atrasados</span>
                </div>
                <span className="text-lg font-semibold text-[#1D1D1F]">{deptOverdue.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
