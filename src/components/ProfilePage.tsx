// ═══════════════════════════════════════════════════════════════════
// PROFILE PAGE - WaveOps
// Modern, Apple-inspired design
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useFirestoreUsers } from '@/hooks/firestore/useFirestoreUsers';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { db, storage } from '@/firebase-config';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Mail, Phone, MapPin, Calendar, User, Globe, Droplets,
  AlertTriangle, Pill, Award, CreditCard, Camera, Edit3,
  Check, X, ChevronRight, Shield, Briefcase, Building2,
  Heart, UserCircle, Flag, Droplet, BadgeCheck, IdCard
} from 'lucide-react';

// Country codes for display
const COUNTRY_NAMES: Record<string, string> = {
  '+593': 'Ecuador', '+1': 'USA', '+44': 'UK', '+34': 'España',
  '+49': 'Alemania', '+33': 'Francia', '+39': 'Italia', '+51': 'Perú',
  '+56': 'Chile', '+57': 'Colombia', '+54': 'Argentina', '+55': 'Brasil',
  '+52': 'México', '+598': 'Uruguay', '+591': 'Bolivia', '+507': 'Panamá',
  '+61': 'Australia', '+81': 'Japón', '+86': 'China', '+91': 'India',
};

// Blood type colors
const BLOOD_TYPE_COLORS: Record<string, string> = {
  'A+': 'bg-red-100 text-red-700', 'A-': 'bg-red-50 text-red-600',
  'B+': 'bg-blue-100 text-blue-700', 'B-': 'bg-blue-50 text-blue-600',
  'AB+': 'bg-purple-100 text-purple-700', 'AB-': 'bg-purple-50 text-purple-600',
  'O+': 'bg-green-100 text-green-700', 'O-': 'bg-green-50 text-green-600',
};

interface ProfilePageProps {
  userId?: string; // For admin editing other users
  onClose?: () => void; // For modal mode
}

export default function ProfilePage({ userId, onClose }: ProfilePageProps = {}) {
  const { user: currentUser } = useAuth();
  const { updateUser, users } = useFirestoreUsers();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  // Determine which user to display
  const isAdmin = !userId || (currentUser?.level || 7) <= 3;
  const targetUserId = userId || currentUser?.id;
  const freshUser = users.find(u => u.id === targetUserId) || currentUser;

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    email: '',
    phone: '',
    phoneCountry: '+593',
    nationality: '',
    birthDate: '',
    cedula: '',
    passport: '',
    address: '',
    bloodType: '',
    allergies: '',
    medications: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    certificationNumber: '',
    certificationExpiry: '',
    apneaCert: '',
    bankCountry: '',
    bankName: '',
    accountType: '',
    accountNumber: '',
    routingNumber: '',
    photoURL: '',
    role: '',
    department: '',
    position: '',
    level: 7,
    joinDate: '',
  });

  useEffect(() => {
    if (freshUser) {
      setFormData({
        name: freshUser.name || '',
        displayName: freshUser.displayName || '',
        email: freshUser.email || '',
        phone: freshUser.phone || '',
        phoneCountry: freshUser.phone?.split(' ')[0] || '+593',
        nationality: freshUser.nationality || '',
        birthDate: freshUser.birthDate || '',
        cedula: freshUser.cedula || '',
        passport: freshUser.passport || '',
        address: freshUser.address || '',
        bloodType: freshUser.bloodType || '',
        allergies: freshUser.allergies || '',
        medications: freshUser.medications || '',
        emergencyContactName: freshUser.emergencyContactName || '',
        emergencyContactPhone: freshUser.emergencyContactPhone || '',
        emergencyContactRelation: freshUser.emergencyContactRelation || '',
        certificationNumber: freshUser.certificationNumber || '',
        certificationExpiry: freshUser.certificationExpiry || '',
        apneaCert: freshUser.apneaCert || '',
        bankCountry: freshUser.bankCountry || '',
        bankName: freshUser.bankName || '',
        accountType: freshUser.accountType || '',
        accountNumber: freshUser.accountNumber || '',
        routingNumber: freshUser.routingNumber || '',
        photoURL: freshUser.photoURL || '',
        role: freshUser.role || '',
        department: freshUser.department || '',
        position: freshUser.position || '',
        level: freshUser.level || 7,
        joinDate: freshUser.joinDate || '',
      });
    }
  }, [freshUser]);

  if (!freshUser) {
    return (
      <Layout title="Perfil">
        <div className="flex items-center justify-center py-20">
          <p className="text-[#86868B]">Usuario no encontrado</p>
        </div>
      </Layout>
    );
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (uid: string): Promise<string | null> => {
    if (!photoFile) return null;
    const storageRef = ref(storage, `users/${uid}/profile-photo.jpg`);
    await uploadBytes(storageRef, photoFile);
    return getDownloadURL(storageRef);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let photoURL = formData.photoURL;
      if (photoFile) {
        photoURL = await uploadPhoto(targetUserId!) || photoURL;
      }

      await updateUser(targetUserId!, {
        // @ts-ignore
        displayName: formData.displayName,
        phone: formData.phone,
        nationality: formData.nationality,
        birthDate: formData.birthDate,
        cedula: formData.cedula,
        passport: formData.passport,
        address: formData.address,
        bloodType: formData.bloodType,
        allergies: formData.allergies,
        medications: formData.medications,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        emergencyContactRelation: formData.emergencyContactRelation,
        certificationNumber: formData.certificationNumber,
        certificationExpiry: formData.certificationExpiry,
        apneaCert: formData.apneaCert,
        bankCountry: formData.bankCountry,
        bankName: formData.bankName,
        accountType: formData.accountType,
        accountNumber: formData.accountNumber,
        routingNumber: formData.routingNumber,
        photoURL,
        name: formData.name,
        position: formData.position,
        updatedAt: new Date().toISOString(),
      });

      setIsEditing(false);
      setPhotoFile(null);
      setPhotoPreview('');
      toast.success('Perfil actualizado correctamente');
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error('Error al actualizar perfil: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Calculate age
  const getAge = () => {
    if (!formData.birthDate) return null;
    const birth = new Date(formData.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const age = getAge();

  // Helper to display info
  const InfoRow = ({ icon: Icon, label, value, missing = 'No registrado' }: any) => (
    <div className="flex items-start gap-3 py-2">
      <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#86868B]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#86868B]">{label}</p>
        <p className="text-sm font-medium text-[#1D1D1F] truncate">{value || missing}</p>
      </div>
    </div>
  );

  // Section component
  const Section = ({ title, icon: Icon, children, color = 'bg-corporate' }: any) => (
    <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className={`h-1 ${color}`} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] flex items-center justify-center">
            <Icon className="w-4 h-4 text-corporate" />
          </div>
          <h3 className="font-semibold text-[#1D1D1F]">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );

  // Editable field
  const EditableField = ({ label, field, type = 'text', placeholder = '', selectOptions = null }: any) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-[#86868B]">{label}</Label>
      {selectOptions ? (
        <select
          value={formData[field as keyof typeof formData] || ''}
          onChange={e => handleChange(field, e.target.value)}
          className="w-full h-10 rounded-xl border border-[#E5E5E7] px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-corporate/20"
        >
          {selectOptions.map((opt: any) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <Input
          type={type}
          value={formData[field as keyof typeof formData] || ''}
          onChange={e => handleChange(field, e.target.value)}
          placeholder={placeholder}
          className="h-10 rounded-xl border-[#E5E5E7] focus:ring-corporate/20"
        />
      )}
    </div>
  );

  const isOwnProfile = !userId || userId === currentUser?.id;

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-20">
      {/* Header Banner */}
      <div className="relative h-48 md:h-56 overflow-hidden">
        <img
          src="/profile-header.jpg"
          alt="Header"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#F5F5F7]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div
                onClick={isEditing ? handlePhotoClick : undefined}
                className={`w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg ${isEditing ? 'cursor-pointer ring-2 ring-corporate ring-offset-2' : ''}`}
              >
                {photoPreview || formData.photoURL ? (
                  <img src={photoPreview || formData.photoURL} alt={formData.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-corporate flex items-center justify-center text-white text-3xl font-bold">
                    {getInitials(formData.name)}
                  </div>
                )}
              </div>
              {isEditing && (
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-corporate rounded-full flex items-center justify-center shadow-md">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl font-bold text-[#1D1D1F]">
                {formData.name || 'Usuario'}
                {formData.displayName && (
                  <span className="text-[#86868B] text-lg font-normal ml-2">"{formData.displayName}"</span>
                )}
              </h1>
              <p className="text-[#86868B] mt-1">{formData.position || formData.role?.replace(/_/g, ' ') || 'Sin rol'}</p>
              <div className="flex items-center justify-center md:justify-start gap-3 mt-3">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F5F5F7] text-xs text-[#86868B]">
                  <Briefcase className="w-3 h-3" />
                  {formData.department?.replace(/_/g, ' ') || 'Sin departamento'}
                </span>
                {formData.bloodType && (
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${BLOOD_TYPE_COLORS[formData.bloodType] || 'bg-gray-100 text-gray-700'}`}>
                    <Droplet className="w-3 h-3" />
                    {formData.bloodType}
                  </span>
                )}
                {age !== null && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F5F5F7] text-xs text-[#86868B]">
                    <Calendar className="w-3 h-3" />
                    {age} años
                  </span>
                )}
              </div>
            </div>

            {/* Edit Button */}
            {(isOwnProfile || isAdmin) && (
              <Button
                variant={isEditing ? 'default' : 'outline'}
                onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
                className={isEditing ? 'bg-corporate' : ''}
              >
                {isEditing ? (
                  <><X className="w-4 h-4 mr-1" /> Cancelar</>
                ) : (
                  <><Edit3 className="w-4 h-4 mr-1" /> Editar</>
                )}
              </Button>
            )}
          </div>
        </div>

        {isEditing ? (
          /* EDIT MODE */
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
              <h3 className="font-semibold text-[#1D1D1F] mb-4">Información Personal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditableField label="Nombre completo" field="name" />
                <EditableField label="Nombre para mostrar" field="displayName" placeholder="Cómo te gusta que te llamen" />
                <EditableField label="Nacionalidad" field="nationality" placeholder="Ej: Ecuatoriana" />
                <EditableField label="Fecha de nacimiento" field="birthDate" type="date" />
                <EditableField label="Cédula / ID" field="cedula" placeholder="1712345678" />
                <EditableField label="Pasaporte" field="passport" placeholder="PA123456" />
                <div className="md:col-span-2">
                  <EditableField label="Dirección" field="address" placeholder="Av. Charles Darwin, Puerto Ayora" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
              <h3 className="font-semibold text-[#1D1D1F] mb-4">Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditableField label="Teléfono" field="phone" placeholder="+593 987654321" />
                <EditableField label="Email" field="email" type="email" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
              <h3 className="font-semibold text-[#1D1D1F] mb-4">Salud</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditableField
                  label="Tipo de sangre"
                  field="bloodType"
                  selectOptions={[
                    { value: '', label: 'Seleccionar' },
                    { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
                    { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
                    { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
                    { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
                  ]}
                />
                <EditableField label="Alergias" field="allergies" placeholder="Ninguna" />
                <div className="md:col-span-2">
                  <EditableField label="Medicamentos" field="medications" placeholder="Ninguno" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
              <h3 className="font-semibold text-[#1D1D1F] mb-4">Contacto de Emergencia</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditableField label="Nombre" field="emergencyContactName" placeholder="Nombre completo" />
                <EditableField label="Teléfono" field="emergencyContactPhone" placeholder="+593 987654321" />
                <EditableField
                  label="Relación"
                  field="emergencyContactRelation"
                  selectOptions={[
                    { value: '', label: 'Seleccionar' },
                    { value: 'Esposo/a', label: 'Esposo/a' },
                    { value: 'Padre', label: 'Padre' },
                    { value: 'Madre', label: 'Madre' },
                    { value: 'Hijo/a', label: 'Hijo/a' },
                    { value: 'Hermano/a', label: 'Hermano/a' },
                    { value: 'Tio/a', label: 'Tio/a' },
                    { value: 'Primo/a', label: 'Primo/a' },
                    { value: 'Amigo/a', label: 'Amigo/a' },
                    { value: 'Otro', label: 'Otro' },
                  ]}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
              <h3 className="font-semibold text-[#1D1D1F] mb-4">Certificaciones</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditableField label="Certificación de buceo" field="certificationNumber" placeholder="PADI #123456" />
                <EditableField label="Vencimiento" field="certificationExpiry" type="date" />
                <EditableField label="Certificación apnea" field="apneaCert" placeholder="AIDA #123456" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
              <h3 className="font-semibold text-[#1D1D1F] mb-4">Datos Bancarios</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditableField
                  label="País del banco"
                  field="bankCountry"
                  selectOptions={[
                    { value: '', label: 'Seleccionar' },
                    { value: 'EC', label: 'Ecuador' },
                    { value: 'US', label: 'USA' },
                    { value: 'PA', label: 'Panamá' },
                    { value: 'CO', label: 'Colombia' },
                    { value: 'PE', label: 'Perú' },
                    { value: 'CL', label: 'Chile' },
                    { value: 'AR', label: 'Argentina' },
                    { value: 'BR', label: 'Brasil' },
                    { value: 'MX', label: 'México' },
                    { value: 'ES', label: 'España' },
                    { value: 'GB', label: 'Reino Unido' },
                    { value: 'DE', label: 'Alemania' },
                  ]}
                />
                <EditableField label="Nombre del banco" field="bankName" placeholder="Banco Pichincha" />
                <EditableField
                  label="Tipo de cuenta"
                  field="accountType"
                  selectOptions={[
                    { value: '', label: 'Seleccionar' },
                    { value: 'ahorros', label: 'Ahorros / Savings' },
                    { value: 'corriente', label: 'Corriente / Checking' },
                  ]}
                />
                <EditableField label="Número de cuenta" field="accountNumber" placeholder="1234567890" />
                {formData.bankCountry === 'US' && (
                  <EditableField label="Routing Number" field="routingNumber" placeholder="021000021" />
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 h-12">
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 h-12 bg-corporate">
                {saving ? 'Guardando...' : <><Check className="w-4 h-4 mr-1" /> Guardar cambios</>}
              </Button>
            </div>
          </div>
        ) : (
          /* VIEW MODE */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="Información Personal" icon={User} color="bg-corporate">
              <InfoRow icon={User} label="Nombre completo" value={formData.name} />
              {formData.displayName && <InfoRow icon={UserCircle} label="Le llaman" value={`"${formData.displayName}"`} />}
              <InfoRow icon={Flag} label="Nacionalidad" value={formData.nationality} />
              <InfoRow icon={Calendar} label="Fecha de nacimiento" value={formData.birthDate ? `${formData.birthDate} (${age} años)` : ''} />
              <InfoRow icon={IdCard} label="Cédula" value={formData.cedula} />
              <InfoRow icon={Globe} label="Pasaporte" value={formData.passport} />
              <InfoRow icon={MapPin} label="Dirección" value={formData.address} />
            </Section>

            <Section title="Contacto" icon={Phone} color="bg-blue-500">
              <InfoRow icon={Phone} label="Teléfono" value={formData.phone} />
              <InfoRow icon={Mail} label="Email" value={formData.email} />
            </Section>

            <Section title="Salud" icon={Heart} color="bg-red-500">
              <InfoRow icon={Droplet} label="Tipo de sangre" value={formData.bloodType} missing="No registrado" />
              <InfoRow icon={AlertTriangle} label="Alergias" value={formData.allergies} missing="Ninguna" />
              <InfoRow icon={Pill} label="Medicamentos" value={formData.medications} missing="Ninguno" />
            </Section>

            <Section title="Contacto de Emergencia" icon={Shield} color="bg-orange-500">
              <InfoRow icon={User} label="Nombre" value={formData.emergencyContactName} />
              <InfoRow icon={Phone} label="Teléfono" value={formData.emergencyContactPhone} />
              <InfoRow icon={Heart} label="Relación" value={formData.emergencyContactRelation} />
            </Section>

            <Section title="Certificaciones" icon={Award} color="bg-purple-500">
              <InfoRow icon={BadgeCheck} label="Buceo" value={formData.certificationNumber} />
              <InfoRow icon={Calendar} label="Vencimiento" value={formData.certificationExpiry} />
              <InfoRow icon={BadgeCheck} label="Apnea" value={formData.apneaCert} />
            </Section>

            <Section title="Datos Bancarios" icon={CreditCard} color="bg-emerald-500">
              <InfoRow icon={Flag} label="País" value={formData.bankCountry} />
              <InfoRow icon={Building2} label="Banco" value={formData.bankName} />
              <InfoRow icon={CreditCard} label="Tipo" value={formData.accountType} />
              <InfoRow icon={IdCard} label="Cuenta" value={formData.accountNumber} />
              {formData.bankCountry === 'US' && (
                <InfoRow icon={IdCard} label="Routing" value={formData.routingNumber} />
              )}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
