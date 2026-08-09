import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db } from '@/firebase-config';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2, Phone, MapPin, Droplets, Award, Calendar, User, Globe, CreditCard, AlertTriangle, Pill, Camera } from 'lucide-react';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    displayName: '',
    phoneCountry: '+593',
    phone: '',
    nationality: '',
    cedula: '',
    passport: '',
    birthDate: '',
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
  });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user?.profileComplete) { navigate('/'); }
  }, [user, navigate]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.phone || !form.emergencyContactName || !form.emergencyContactPhone) {
      alert('Completa los campos obligatorios marcados con *');
      return;
    }
    setLoading(true);
    try {
      const userId = user.id;
      await updateDoc(doc(db, 'users', userId), {
        displayName: form.displayName || user.name,
        phone: form.phoneCountry + ' ' + form.phone,
        nationality: form.nationality,
        cedula: form.cedula,
        passport: form.passport,
        birthDate: form.birthDate,
        address: form.address,
        bloodType: form.bloodType,
        allergies: form.allergies,
        medications: form.medications,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        emergencyContactRelation: form.emergencyContactRelation,
        certificationNumber: form.certificationNumber,
        certificationExpiry: form.certificationExpiry,
        apneaCert: form.apneaCert,
        bankCountry: form.bankCountry,
        bankName: form.bankName,
        accountType: form.accountType,
        accountNumber: form.accountNumber,
        routingNumber: form.routingNumber,
        profileComplete: true,
        updatedAt: new Date().toISOString(),
      });
      navigate('/');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally { setLoading(false); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] max-w-2xl w-full">
        <div className="text-center mb-8">
          <img src="/logo-waveops.png" alt="WaveOps" className="w-48 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#1D1D1F]">Completa tu perfil</h1>
          <p className="text-sm text-[#86868B] mt-1">Paso {step} de 3 — Informacion personal</p>
          <div className="w-full bg-[#E5E5E7] h-1 rounded-full mt-4">
            <div className="bg-corporate h-1 rounded-full transition-all" style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }} />
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><User className="w-4 h-4 text-corporate" /> Nombre para mostrar *</label>
              <Input value={form.displayName} onChange={e => handleChange('displayName', e.target.value)} placeholder="Como quieres que te llamen" required />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Phone className="w-4 h-4 text-corporate" /> Telefono *</label>
              <div className="flex gap-2">
                <select value={form.phoneCountry} onChange={e => handleChange('phoneCountry', e.target.value)} className="w-24 h-10 rounded-xl border border-[#E5E5E7] px-2 text-sm">
                  <option value="+593">EC +593</option>
                  <option value="+1">US +1</option>
                </select>
                <Input className="flex-1" value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="987654321" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Globe className="w-4 h-4 text-corporate" /> Nacionalidad</label>
                <Input value={form.nationality} onChange={e => handleChange('nationality', e.target.value)} placeholder="Ecuatoriana" />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Calendar className="w-4 h-4 text-corporate" /> Fecha de nacimiento</label>
                <Input type="date" value={form.birthDate} onChange={e => handleChange('birthDate', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]">Cedula / ID</label>
                <Input value={form.cedula} onChange={e => handleChange('cedula', e.target.value)} placeholder="1712345678" />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]">Pasaporte</label>
                <Input value={form.passport} onChange={e => handleChange('passport', e.target.value)} placeholder="PA123456" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><MapPin className="w-4 h-4 text-corporate" /> Direccion</label>
              <Input value={form.address} onChange={e => handleChange('address', e.target.value)} placeholder="Av. Charles Darwin, Puerto Ayora" />
            </div>
            <Button onClick={() => setStep(2)} className="w-full bg-corporate h-12">Continuar</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Droplets className="w-4 h-4 text-corporate" /> Tipo de sangre</label>
              <select value={form.bloodType} onChange={e => handleChange('bloodType', e.target.value)} className="w-full h-10 rounded-xl border border-[#E5E5E7] px-3 text-sm">
                <option value="">Seleccionar</option>
                <option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><AlertTriangle className="w-4 h-4 text-corporate" /> Alergias</label>
              <Input value={form.allergies} onChange={e => handleChange('allergies', e.target.value)} placeholder="Ninguna" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Pill className="w-4 h-4 text-corporate" /> Medicamentos</label>
              <Input value={form.medications} onChange={e => handleChange('medications', e.target.value)} placeholder="Ninguno" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><User className="w-4 h-4 text-corporate" /> Contacto de emergencia (nombre) *</label>
              <Input value={form.emergencyContactName} onChange={e => handleChange('emergencyContactName', e.target.value)} placeholder="Nombre completo" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Phone className="w-4 h-4 text-corporate" /> Tel. emergencia *</label>
                <Input value={form.emergencyContactPhone} onChange={e => handleChange('emergencyContactPhone', e.target.value)} placeholder="+593 98 765 4321" required />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]">Relacion</label>
                <Input value={form.emergencyContactRelation} onChange={e => handleChange('emergencyContactRelation', e.target.value)} placeholder="Esposo/a, padre, etc." />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12">Atras</Button>
              <Button onClick={() => setStep(3)} className="flex-1 bg-corporate h-12">Continuar</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Award className="w-4 h-4 text-corporate" /> Certificacion de buceo (opcional)</label>
              <Input value={form.certificationNumber} onChange={e => handleChange('certificationNumber', e.target.value)} placeholder="PADI #123456" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Calendar className="w-4 h-4 text-corporate" /> Vencimiento certificacion</label>
              <Input type="date" value={form.certificationExpiry} onChange={e => handleChange('certificationExpiry', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]">Certificacion de apnea (opcional)</label>
              <Input value={form.apneaCert} onChange={e => handleChange('apneaCert', e.target.value)} placeholder="AIDA #123456" />
            </div>
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium text-[#1D1D1F] mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-corporate" /> Datos bancarios</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-[#86868B]">Pais del banco</label>
                  <select value={form.bankCountry} onChange={e => handleChange('bankCountry', e.target.value)} className="w-full h-10 rounded-xl border border-[#E5E5E7] px-3 text-sm">
                    <option value="">Seleccionar</option>
                    <option value="EC">Ecuador</option>
                    <option value="US">USA</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[#86868B]">Nombre del banco</label>
                  <Input value={form.bankName} onChange={e => handleChange('bankName', e.target.value)} placeholder="Banco Pichincha" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-2">
                  <label className="text-xs text-[#86868B]">Tipo de cuenta</label>
                  <select value={form.accountType} onChange={e => handleChange('accountType', e.target.value)} className="w-full h-10 rounded-xl border border-[#E5E5E7] px-3 text-sm">
                    <option value="">Seleccionar</option>
                    <option value="ahorros">Ahorros / Savings</option>
                    <option value="corriente">Corriente / Checking</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[#86868B]">Numero de cuenta</label>
                  <Input value={form.accountNumber} onChange={e => handleChange('accountNumber', e.target.value)} placeholder="1234567890" />
                </div>
              </div>
              {form.bankCountry === 'US' && (
                <div className="space-y-2 mt-2">
                  <label className="text-xs text-[#86868B]">Routing Number (solo USA)</label>
                  <Input value={form.routingNumber} onChange={e => handleChange('routingNumber', e.target.value)} placeholder="021000021" />
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12">Atras</Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-corporate h-12">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Completar perfil'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
