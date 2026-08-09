import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db } from '@/firebase-config';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2, Phone, MapPin, Droplets, Award, Calendar, User } from 'lucide-react';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    phone: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    bloodType: '',
    certificationNumber: '',
    certificationExpiry: '',
    joinDate: '',
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
    const userId = user.id;
    if (!form.phone || !form.emergencyContactName || !form.emergencyContactPhone) {
      alert('Completa los campos obligatorios marcados con *');
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        phone: form.phone,
        address: form.address,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        bloodType: form.bloodType,
        certificationNumber: form.certificationNumber,
        certificationExpiry: form.certificationExpiry,
        joinDate: form.joinDate,
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
      <div className="bg-white rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] max-w-lg w-full">
        <div className="text-center mb-8">
          <img src="/logo-waveops.png" alt="WaveOps" className="w-48 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#1D1D1F]">Completa tu perfil</h1>
          <p className="text-sm text-[#86868B] mt-1">Paso {step} de 2 — Informacion obligatoria</p>
          <div className="w-full bg-[#E5E5E7] h-1 rounded-full mt-4">
            <div className="bg-corporate h-1 rounded-full transition-all" style={{ width: step === 1 ? '50%' : '100%' }} />
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Phone className="w-4 h-4 text-corporate" /> Telefono *</label>
              <Input value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="+593 98 765 4321" required />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><MapPin className="w-4 h-4 text-corporate" /> Direccion</label>
              <Input value={form.address} onChange={e => handleChange('address', e.target.value)} placeholder="Av. Charles Darwin, Puerto Ayora" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Calendar className="w-4 h-4 text-corporate" /> Fecha de ingreso</label>
              <Input type="date" value={form.joinDate} onChange={e => handleChange('joinDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Droplets className="w-4 h-4 text-corporate" /> Tipo de sangre</label>
              <select value={form.bloodType} onChange={e => handleChange('bloodType', e.target.value)} className="w-full h-10 rounded-xl border border-[#E5E5E7] px-3 text-sm">
                <option value="">Seleccionar</option>
                <option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
              </select>
            </div>
            <Button onClick={() => setStep(2)} className="w-full bg-corporate h-12">Continuar</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><User className="w-4 h-4 text-corporate" /> Contacto de emergencia (nombre) *</label>
              <Input value={form.emergencyContactName} onChange={e => handleChange('emergencyContactName', e.target.value)} placeholder="Nombre completo" required />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Phone className="w-4 h-4 text-corporate" /> Telefono de emergencia *</label>
              <Input value={form.emergencyContactPhone} onChange={e => handleChange('emergencyContactPhone', e.target.value)} placeholder="+593 98 765 4321" required />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Award className="w-4 h-4 text-corporate" /> Numero de certificacion</label>
              <Input value={form.certificationNumber} onChange={e => handleChange('certificationNumber', e.target.value)} placeholder="PADI #123456" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Calendar className="w-4 h-4 text-corporate" /> Vencimiento de certificacion</label>
              <Input type="date" value={form.certificationExpiry} onChange={e => handleChange('certificationExpiry', e.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12">Atras</Button>
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
