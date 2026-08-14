import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { UserAvatar } from '@/components/UserAvatar';
import { ChevronDown } from 'lucide-react';

export function PersistentAvatar() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  // Si no esta logueado, no mostrar nada
  if (!isAuthenticated || !user) return null;

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="fixed top-0 right-0 z-40 hidden lg:block">
      <div className="px-6 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 bg-white hover:bg-[#F5F5F7] rounded-xl px-3 py-2 transition-colors">
              <div className="text-right">
                <p className="text-sm font-medium text-[#1D1D1F]">{user.name}</p>
                <p className="text-xs text-[#86868B]">{user.role.replace(/_/g, ' ')}</p>
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
            <DropdownMenuItem onClick={() => navigate('/perfil')}>Perfil</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/configuracion')}>Configuracion</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-[#FF3B30]">Cerrar sesion</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
