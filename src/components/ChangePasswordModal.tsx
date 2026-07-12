// ═══════════════════════════════════════════════════════════════════
// CHANGE PASSWORD MODAL - OBLIGATORIO EN PRIMER LOGIN
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Lock, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updatePassword } from 'firebase/auth';
import { auth } from '@/firebase-config';
import { toast } from 'sonner';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onPasswordChanged: () => void;
}

export function ChangePasswordModal({ isOpen, onPasswordChanged }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('Minimo 8 caracteres');
    if (!/[A-Z]/.test(pwd)) errors.push('Al menos una mayuscula');
    if (!/[a-z]/.test(pwd)) errors.push('Al menos una minuscula');
    if (!/[0-9]/.test(pwd)) errors.push('Al menos un numero');
    if (!/[^A-Za-z0-9]/.test(pwd)) errors.push('Al menos un caracter especial');
    return errors;
  };

  const handleSubmit = async () => {
    setError('');
    if (!newPassword || !confirmPassword) {
      setError('Todos los campos son obligatorios');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contrasenas no coinciden');
      return;
    }
    const validationErrors = validatePassword(newPassword);
    if (validationErrors.length > 0) {
      setError('La contrasena debe tener: ' + validationErrors.join(', '));
      return;
    }
    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('No hay usuario autenticado');
        return;
      }
      await updatePassword(user, newPassword);
      setSuccess(true);
      toast.success('Contrasena actualizada correctamente');
      setTimeout(() => { onPasswordChanged(); }, 1500);
    } catch (err: any) {
      console.error('Error al cambiar contrasena:', err);
      if (err.code === 'auth/requires-recent-login') {
        setError('Por seguridad, cierra sesion y vuelve a iniciar sesion antes de cambiar tu contrasena.');
      } else {
        setError('Error al cambiar contrasena: ' + (err.message || 'Intenta de nuevo'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-[#007AFF] to-[#5856D6] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {success ? 'Contrasena Actualizada' : 'Cambio de Contrasena Obligatorio'}
              </h2>
              <p className="text-sm text-white/80">
                {success ? 'Tu contrasena ha sido cambiada exitosamente' : 'Es tu primer login. Debes cambiar tu contrasena para continuar.'}
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
              <p className="text-[#1D1D1F] font-medium">Listo!</p>
              <p className="text-sm text-[#86868B]">Redirigiendo...</p>
            </div>
          ) : (
            <>
              <div className="bg-[#F5F5F7] rounded-xl p-3">
                <p className="text-xs font-medium text-[#86868B] mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Requisitos de la contrasena:
                </p>
                <ul className="text-xs text-[#86868B] space-y-1 ml-5">
                  <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>Minimo 8 caracteres</li>
                  <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>Al menos una mayuscula</li>
                  <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : ''}>Al menos una minuscula</li>
                  <li className={/[0-9]/.test(newPassword) ? 'text-green-600' : ''}>Al menos un numero</li>
                  <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-green-600' : ''}>Al menos un simbolo (!@#$...)</li>
                </ul>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1D1D1F]">Nueva contrasena</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[#E5E5E7] rounded-xl text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    placeholder="Ingresa tu nueva contrasena"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1D1D1F]">Confirmar contrasena</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[#E5E5E7] rounded-xl text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    placeholder="Repite tu nueva contrasena"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500">Las contrasenas no coinciden</p>
                )}
              </div>
              <Button
                className="w-full bg-gradient-to-r from-[#007AFF] to-[#5856D6] hover:opacity-90 text-white font-medium py-2.5 rounded-xl"
                onClick={handleSubmit}
                disabled={isSubmitting || !newPassword || !confirmPassword}
              >
                {isSubmitting ? 'Cambiando...' : 'Cambiar Contrasena'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
