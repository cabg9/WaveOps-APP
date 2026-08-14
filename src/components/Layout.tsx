// ═══════════════════════════════════════════════════════════════════
// LAYOUT PRINCIPAL - WAVEOPS
// ═══════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
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
  LayoutDashboard,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useNotifications } from '@/hooks/firestore/useNotifications';
import { useFCMToken } from '@/hooks/useFCMToken';
import { NotificationsDrawer } from '@/components/NotificationsDrawer';
import { useAppConfig } from '@/hooks/useAppConfig';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/UserAvatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

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

const iconMap: Record<string, LucideIcon> = {
  Home, ClipboardList, Clock, IdCard, Anchor, Car, ShoppingCart, CreditCard, FileText, Code2, LayoutDashboard,
};

// ═══════════════════════════════════════════════════════════════════
// NAV ITEMS
// ═══════════════════════════════════════════════════════════════════

function useNavItems(): NavItem[] {
  const { modules, hasDevelopAccess } = useAppConfig();
  const { hasPermission } = useAuth();

  const items: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/' },
  ];

  modules.forEach((mod) => {
    if (!mod.isVisible) return;
    if (mod.id === "develops") return;
    const IconComponent = iconMap[mod.icon] || LayoutDashboard;
    items.push({ id: mod.id, label: mod.name, icon: IconComponent, path: mod.route, permission: mod.requiredPermission });
  });

  if (hasDevelopAccess) {
    items.push({ id: 'develops', label: 'Develops', icon: Code2, path: '/develops', permission: 'canViewModuleDevelops' });
  }

  return items;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════

export function Layout({ children, title, showDate = true }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications(user?.id);
  const { permission, isSupported, requestPermission } = useFCMToken();
  const navItems = useNavItems();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const showNotifBanner = isSupported && permission === "default" && user?.id;

  return (
    <>
    <div className="min-h-screen bg-[#F5F5F7] flex">
      {/* ═══════════════════════════════════════════════════════════════════
          SIDEBAR - DESKTOP ONLY
          ═══════════════════════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-16 bg-white border-r border-[#E5E5E7] flex-col items-center pt-4 pb-6 z-50">
        {/* Logo */}
        <div className="mb-6">
          <img src="/logo-icon.png" alt="WaveOps" className="w-10 h-10 rounded-xl" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-1">
          {navItems
            
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
        <div className="flex flex-col items-center gap-2 pb-16">
          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-all relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#FF3B30] rounded-full flex items-center justify-center">
                <span className="text-white text-[10px] font-medium">{unreadCount}</span>
              </span>
            )}
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
      <main className="flex-1 lg:ml-16">
        {/* Header - Desktop */}
        <header className="hidden lg:flex sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#E5E5E7]">
          <div className="flex items-center justify-between px-6 py-4 w-full">
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
                      <p className="text-[10px] text-corporate font-medium tracking-wide">Dive X Surf</p>
                    </div>
                    <UserAvatar
                      name={user.name}
                      photoUrl={user.photoURL || user.avatar}
                      size="sm"
                      fallbackClassName="bg-corporate text-sm font-medium"
                    />
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

        {/* Header - Mobile */}
        <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-[#E5E5E7]">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Left: Logo & Title */}
            <div className="flex items-center gap-3">
              <img src="/logo-icon.png" alt="WaveOps" className="w-10 h-10 rounded-xl" />
              <div>
                {title && (
                  <h1 className="text-lg font-semibold text-[#1D1D1F]">{title}</h1>
                )}
                {showDate && (
                  <p className="text-xs text-[#86868B] capitalize">
                    {formattedDate}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Notifications & Menu */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(true)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[#86868B] hover:bg-[#F5F5F7] transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#FF3B30] rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-medium">{unreadCount}</span>
                  </span>
                )}
              </button>

              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button className="w-10 h-10 rounded-xl flex items-center justify-center text-[#86868B] hover:bg-[#F5F5F7] transition-all">
                    <Menu className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] bg-white p-0">
                  {/* Sheet Header */}
                  <SheetHeader className="p-4 border-b border-[#E5E5E7]">
                    <div className="flex items-center justify-between">
                      <img src="/logo-icon.png" alt="WaveOps" className="w-10 h-10 rounded-xl" />

                    </div>
                  </SheetHeader>

                  {/* Navigation */}
                  <nav className="flex-1 p-4">
                    <div className="space-y-1">
                      {navItems
                        
                        .map((item) => {
                          const active = isActive(item.path);
                          const Icon = item.icon;

                          return (
                            <button
                              key={item.id}
                              onClick={() => handleNavClick(item.path)}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                                active
                                  ? 'bg-corporate/10 text-corporate'
                                  : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                              )}
                            >
                              <Icon className="w-5 h-5" />
                              <span className="font-medium">{item.label}</span>
                            </button>
                          );
                        })}
                    </div>
                  </nav>

                  {/* User Section */}
                  <div className="p-4 border-t border-[#E5E5E7]">
                    {user && (
                      <div className="space-y-4">
                        {/* User Info */}
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={user.name}
                            photoUrl={user.photoURL || user.avatar}
                            size="md"
                            fallbackClassName="bg-corporate text-sm font-medium"
                          />
                          <div>
                            <p className="font-medium text-[#1D1D1F]">{user.name}</p>
                            <p className="text-xs text-[#86868B]">{user.role.replace(/_/g, ' ')}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-1">
                          <button
                            onClick={() => handleNavClick('/perfil')}
                            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-[#1D1D1F] hover:bg-[#F5F5F7] transition-all text-left"
                          >
                            <span className="text-sm">Perfil</span>
                          </button>
                          <button
                            onClick={() => handleNavClick('/configuracion')}
                            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-[#1D1D1F] hover:bg-[#F5F5F7] transition-all text-left"
                          >
                            <span className="text-sm">Configuración</span>
                          </button>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-[#FF3B30] hover:bg-[#FF3B30]/5 transition-all text-left"
                          >
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm">Cerrar Sesión</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>

    {/* Notifications Drawer */}
    <NotificationsDrawer
      isOpen={showNotifications}
      onClose={() => setShowNotifications(false)}
      notifications={notifications}
      unreadCount={unreadCount}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
      onDelete={deleteNotification}
    />
    </>
  );
}

export default Layout;
