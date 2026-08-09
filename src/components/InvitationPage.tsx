import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInvitation } from '@/hooks/useInvitation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase-config';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function InvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { acceptInvitation, loading } = useInvitation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationData, setInvitationData] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) { setError('Token no proporcionado'); setChecking(false); return; }
    getDoc(doc(db, 'invitations', token)).then(snap => {
      if (!snap.exists()) { setError('Invitacion invalida'); setChecking(false); return; }
      const data = snap.data();
      if (data.status !== 'PENDING') { setError('Invitacion ya usada o expirada'); setChecking(false); return; }
      if (new Date(data.expiresAt) < new Date()) { setError('Invitacion expirada'); setChecking(false); return; }
      setInvitationData(data); setChecking(false);
    }).catch(() => { setError('Error'); setChecking(false); });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (password.length < 6) { setError('Minimo 6 caracteres'); return; }
    if (password !== confirmPassword) { setError('No coinciden'); return; }
    if (!token) return;
    try { await acceptInvitation(token, password); setSuccess(true); }
    catch (err: any) { setError(err.message); }
  };

  if (checking) return <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center"><Loader2 className="w-8 h-8 text-corporate animate-spin" /></div>;
  if (error && !invitationData) return <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center"><div className="bg-white p-8 rounded-2xl text-center"><AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4"/><p>{error}</p><Button onClick={() => navigate('/login')} className="mt-4 bg-corporate">Login</Button></div></div>;
  if (success) return <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center"><div className="bg-white p-8 rounded-2xl text-center"><CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4"/><h2 className="text-lg font-semibold">Cuenta creada!</h2><Button onClick={() => navigate('/login')} className="mt-4 bg-corporate">Iniciar sesion</Button></div></div>;

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] max-w-md w-full">
        <div className="text-center mb-8">
          <img src="/logo-waveops.png" alt="WaveOps" className="w-64 mx-auto mb-6" />
          <h1 className="text-xl font-semibold text-[#1D1D1F]">Bienvenido a WaveOps</h1>
          <p className="text-sm text-[#86868B] mt-2">Has sido invitado a unirte al equipo de Dive X Surf.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#1D1D1F]">Email</label>
            <Input value={invitationData?.email || ''} disabled className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#1D1D1F]">Contraseña</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimo 6 caracteres" required />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#1D1D1F]">Confirmar contraseña</label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repite tu contraseña" required />
          </div>
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}
          <Button type="submit" className="w-full bg-corporate h-12 text-base" disabled={loading}>{loading ? 'Creando...' : 'Crear mi cuenta'}</Button>
        </form>
      </div>
    </div>
  );
}
