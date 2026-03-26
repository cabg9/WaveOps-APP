// ═══════════════════════════════════════════════════════════════════
// LOGIN SCREEN - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si ya está autenticado, redirigir al dashboard
  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!email.trim()) {
      setError('El correo electrónico es requerido');
      return;
    }

    if (!password.trim()) {
      setError('La contraseña es requerida');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/', { replace: true });
      } else {
        setError('Credenciales inválidas. Por favor verifica e intenta nuevamente.');
      }
    } catch (err) {
      setError('Ocurrió un error al iniciar sesión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/whaleshark.jpg)',
        }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-corporate rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Anchor className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">Galapagos Tasks</h1>
            <p className="text-sm text-[#86868B] mt-1">Sistema de Gestión Operativa</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#1D1D1F]">
                Correo electrónico
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@galapagosdiveandsurf.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 rounded-xl border-[#E5E5E7] focus:border-corporate focus:ring-corporate"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#1D1D1F]">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 rounded-xl border-[#E5E5E7] focus:border-corporate focus:ring-corporate"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label
                htmlFor="remember"
                className="text-sm text-[#86868B] cursor-pointer"
              >
                Recordarme en este dispositivo
              </Label>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-[#FF3B30]/10 text-[#FF3B30] text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 bg-corporate hover:bg-corporate/90 text-white rounded-xl font-medium transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <button className="text-sm text-corporate hover:underline">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

        {/* Demo Info */}
        <div className="mt-6 text-center text-white/80 text-sm">
          <p>Usuario demo: andres.bonilla@galapagosdiveandsurf.com</p>
          <p>Contraseña: cualquiera (mínimo 6 caracteres)</p>
        </div>
      </div>
    </div>
  );
}
