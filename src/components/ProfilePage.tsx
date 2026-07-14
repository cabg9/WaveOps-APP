// ═══════════════════════════════════════════════════════════════════
// PROFILE PAGE - Perfil de Usuario
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useFirestoreUsers } from '@/hooks/firestore/useFirestoreUsers';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Mail, Phone, Building2, Briefcase, Lock,
  MapPin, Calendar, UserCircle, Contact, Camera
} from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { auth } from '@/firebase-config';

export default function ProfilePage() {
  const { user } = useAuth();
  const { updateUser, users } = useFirestoreUsers();

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Get fresh user data from Firestore
  const freshUser = users.find(u => u.id === user?.id) || user;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    position: '',
    nickname: '',
    cedula: '',
    birthDate: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    photoURL: '',
  });

  useEffect(() => {
    if (freshUser) {
      setFormData({
        name: freshUser.name || '',
        phone: freshUser.phone || '',
        position: freshUser.position || '',
        nickname: freshUser.nickname || '',
        cedula: freshUser.cedula || '',
        birthDate: freshUser.birthDate || '',
        address: freshUser.address || '',
        emergencyContact: freshUser.emergencyContact || '',
        emergencyPhone: freshUser.emergencyPhone || '',
        photoURL: freshUser.photoURL || '',
      });
    }
  }, [freshUser]);

  if (!user) {
    return (
      <Layout title="Perfil">
        <div className="flex items-center justify-center py-20">
          <p className="text-[#86868B]">Inicia sesión para ver tu perfil</p>
        </div>
      </Layout>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser(user.id, {
        name: formData.name,
        phone: formData.phone,
        nickname: formData.nickname,
        cedula: formData.cedula,
        birthDate: formData.birthDate,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        emergencyPhone: formData.emergencyPhone,
        photoURL: formData.photoURL,
      });
      setIsEditing(false);
      toast.success('Perfil actualizado correctamente');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error('Error al actualizar perfil: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setPasswordError('No hay usuario autenticado');
        return;
      }
      await updatePassword(currentUser, newPassword);
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Contraseña actualizada correctamente');
      setTimeout(() => setShowPasswordModal(false), 2000);
    } catch (err: any) {
      console.error('Password error:', err);
      if (err.code === 'auth/requires-recent-login') {
        setPasswordError('Debes cerrar sesión y volver a iniciar para cambiar la contraseña');
      } else {
        setPasswordError(err.message || 'Error al cambiar contraseña');
      }
    }
  };

  // Calculate age and birthday
  const getAge = (birthDate: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const getNextBirthday = (birthDate: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    const nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    if (nextBirthday < today) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }
    const daysLeft = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  const age = getAge(formData.birthDate);
  const daysToBirthday = getNextBirthday(formData.birthDate);

  return (
    <Layout title="Perfil">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-6">
          <Avatar className="w-24 h-24">
            {formData.photoURL ? (
              <AvatarImage src={formData.photoURL} alt={user.name} />
            ) : null}
            <AvatarFallback className="bg-corporate text-white text-3xl">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">
              {user.name}
              {formData.nickname && <span className="text-[#86868B] text-lg ml-2">"{formData.nickname}"</span>}
            </h1>
            <p className="text-[#86868B]">{user.role.replace(/_/g, ' ')}</p>
            {daysToBirthday !== null && (
              <p className="text-sm text-corporate mt-1">
                {daysToBirthday === 0 ? '¡Hoy es su cumpleaños! 🎉' :
                 daysToBirthday === 1 ? 'Mañana es su cumpleaños! 🎂' :
                 `Cumpleaños en ${daysToBirthday} días`} {age ? `(${age} años)` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Información Personal</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancelar' : 'Editar'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label>Foto URL</Label>
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#86868B]" />
                    <Input
                      value={formData.photoURL}
                      onChange={(e) => setFormData({ ...formData, photoURL: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nombre completo</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Como le gusta que le llamen</Label>
                  <div className="flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-[#86868B]" />
                    <Input
                      value={formData.nickname}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                      placeholder="Ej: Andy, Andresito"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cédula / Pasaporte</Label>
                  <Input
                    value={formData.cedula}
                    onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                    placeholder="Ej: 1712345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de nacimiento</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#86868B]" />
                    <Input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#86868B]" />
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Ej: 0991234567"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Residencia / Dirección</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#86868B]" />
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Ej: Puerto Ayora, Santa Cruz"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contacto de emergencia (nombre)</Label>
                  <div className="flex items-center gap-2">
                    <Contact className="w-4 h-4 text-[#86868B]" />
                    <Input
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                      placeholder="Ej: María Bonilla"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contacto de emergencia (teléfono)</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#86868B]" />
                    <Input
                      value={formData.emergencyPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                      placeholder="Ej: 0987654321"
                    />
                  </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-corporate hover:bg-corporate/90">
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                {formData.nickname && (
                  <div className="flex items-center gap-3">
                    <UserCircle className="w-4 h-4 text-[#86868B]" />
                    <span className="text-sm text-[#86868B] w-32">Le llaman:</span>
                    <span className="text-[#1D1D1F] font-medium">"{formData.nickname}"</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#86868B]" />
                  <span className="text-sm text-[#86868B] w-32">Email:</span>
                  <span className="text-[#1D1D1F]">{user.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#86868B]" />
                  <span className="text-sm text-[#86868B] w-32">Teléfono:</span>
                  <span className="text-[#1D1D1F]">{formData.phone || 'No registrado'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-[#86868B]" />
                  <span className="text-sm text-[#86868B] w-32">Departamento:</span>
                  <span className="text-[#1D1D1F]">{user.department?.replace(/_/g, ' ') || 'No asignado'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-[#86868B]" />
                  <span className="text-sm text-[#86868B] w-32">Cargo:</span>
                  <span className="text-[#1D1D1F]">{user.position || 'No registrado'}</span>
                </div>
                {formData.cedula && (
                  <div className="flex items-center gap-3">
                    <UserCircle className="w-4 h-4 text-[#86868B]" />
                    <span className="text-sm text-[#86868B] w-32">Cédula:</span>
                    <span className="text-[#1D1D1F]">{formData.cedula}</span>
                  </div>
                )}
                {formData.birthDate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-[#86868B]" />
                    <span className="text-sm text-[#86868B] w-32">Nacimiento:</span>
                    <span className="text-[#1D1D1F]">
                      {new Date(formData.birthDate).toLocaleDateString('es-EC')}
                      {age !== null && ` (${age} años)`}
                    </span>
                  </div>
                )}
                {formData.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-[#86868B]" />
                    <span className="text-sm text-[#86868B] w-32">Residencia:</span>
                    <span className="text-[#1D1D1F]">{formData.address}</span>
                  </div>
                )}
                {(formData.emergencyContact || formData.emergencyPhone) && (
                  <div className="flex items-center gap-3">
                    <Contact className="w-4 h-4 text-[#86868B]" />
                    <span className="text-sm text-[#86868B] w-32">Emergencia:</span>
                    <span className="text-[#1D1D1F]">
                      {formData.emergencyContact} {formData.emergencyPhone && `- ${formData.emergencyPhone}`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card>
          <CardHeader>
            <CardTitle>Seguridad</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Cambiar Contraseña
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Password Change Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-[#86868B]">
              Para cambiar tu contraseña, debes cerrar sesión y volver a iniciar sesión recientemente.
            </p>
            <div className="space-y-2">
              <Label>Nueva Contraseña</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Contraseña</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
              />
            </div>
            {passwordError && (
              <p className="text-sm text-red-500">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-sm text-green-600">Contraseña actualizada correctamente</p>
            )}
            <Button
              onClick={handleChangePassword}
              className="w-full bg-corporate hover:bg-corporate/90"
            >
              Actualizar Contraseña
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
