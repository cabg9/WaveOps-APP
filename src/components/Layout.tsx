// ═══════════════════════════════════════════════════════════════════
// LAYOUT PRINCIPAL - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  ClipboardList,
  Clock,
  IdCard,
  Anchor,
  Car,
  ShoppingCart,
  CreditCard,
  FileText,
  Code2,
  Bell,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showDate?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  permission?: string;
}

// ═══════════════════════════════════════════════════════════════════
// NAV ITEMS
// ═══════════════════════════════════════════════════════════════════

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/' },
  { id: 'tasks', label: 'Tasks', icon: ClipboardList, path: '/tasks' },
  { id: 'horarios', label: 'Horarios', icon: Clock, path: '/horarios' },
  { id: 'reportes', label: 'Reportes', icon: FileText, path: '/reportes' },
  { id: 'ordenes-pago', label: 'Órdenes de Pago', icon: CreditCard, path: '/ordenes-pago' },
  { id: 'dive-ops', label: 'Dive Ops', icon: IdCard, path: '/dive-ops' },
  { id: 'requisiciones', label: 'Requisiciones', icon: ShoppingCart, path: '/requisiciones' },
  { id: 'movilidad', label: 'Movilidad', icon: Car, path: '/movilidad' },
  { id: 'vessels', label: 'Vessels', icon: Anchor, path: '/vessels' },
  { id: 'develops', label: 'Develops', icon: Code2, path: '/develops', permission: 'canViewModuleDevelops' },
];

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════

export function Layout({ children, title, showDate = true }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();

  // Formatear fecha
  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex">
      {/* ═══════════════════════════════════════════════════════════════════
          SIDEBAR
          ═══════════════════════════════════════════════════════════════════ */}
      <aside className="fixed left-0 top-0 h-screen w-16 bg-white border-r border-[#E5E5E7] flex flex-col items-center py-4 z-50">
        {/* Logo */}
        <div className="mb-6">
          <div className="w-10 h-10 bg-corporate rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">G</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-1">
          {navItems
            .filter((item) => !item.permission || hasPermission(item.permission as any))
            .map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                    active
                      ? 'bg-[#F5F5F7] text-corporate'
                      : 'text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
                  )}
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
        </nav>

        {/* Bottom Actions */}
        <div className="flex flex-col items-center gap-2">
          {/* Notifications */}
          <button className="w-10 h-10 rounded-xl flex items-center justify-center text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-all relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-[#FF3B30] rounded-full flex items-center justify-center">
              <span className="text-white text-[10px] font-medium">3</span>
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-all"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 ml-16">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#E5E5E7]">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Left: Title & Date */}
            <div>
              {title && (
                <h1 className="text-2xl font-semibold text-[#1D1D1F]">{title}</h1>
              )}
              {showDate && (
                <p className="text-sm text-[#86868B] capitalize mt-0.5">
                  {formattedDate}
                </p>
              )}
            </div>

            {/* Right: User */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 hover:bg-[#F5F5F7] rounded-xl px-3 py-2 transition-colors">
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#1D1D1F]">{user.name}</p>
                      <p className="text-xs text-[#86868B]">{user.role.replace(/_/g, ' ')}</p>
                    </div>
                    <Avatar className="w-9 h-9 bg-corporate">
                      <AvatarFallback className="bg-corporate text-white text-sm font-medium">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-[#86868B]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/perfil')}>
                    Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/configuracion')}>
                    Configuración
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-[#FF3B30]">
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

export default Layout;
