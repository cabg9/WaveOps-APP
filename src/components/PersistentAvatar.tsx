import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

// Lee TODO directamente de localStorage - NO hooks, NO useAuth, NO re-renders
const getName = () => localStorage.getItem('wo_name') || '';
const getPhoto = () => localStorage.getItem('wo_photo') || '';
const getRole = () => localStorage.getItem('wo_role') || '';
const isLoggedIn = () => localStorage.getItem('wo_auth') === '1';

export function PersistentAvatar() {
  const navigate = useNavigate();

  // Si no esta logueado, no mostrar nada
  if (!isLoggedIn()) return null;

  const name = getName();
  const photo = getPhoto();
  const role = getRole();

  const handleLogout = () => {
    // Limpiar TODO y recargar
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="fixed top-0 right-0 z-40 hidden lg:block">
      <div className="px-6 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 bg-white hover:bg-[#F5F5F7] rounded-xl px-3 py-2 transition-colors">
              <div className="text-right">
                <p className="text-sm font-medium text-[#1D1D1F]">{name}</p>
                <p className="text-xs text-[#86868B]">{role.replace(/_/g, ' ')}</p>
              </div>
              <div className="w-9 h-9 rounded-full overflow-hidden bg-corporate flex-shrink-0">
                {photo ? (
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-sm font-medium">
                    {getInitials(name)}
                  </div>
                )}
              </div>
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
