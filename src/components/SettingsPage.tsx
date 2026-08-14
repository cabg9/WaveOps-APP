// SETTINGS PAGE
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Volume2, Moon, Globe, Monitor, Smartphone, Filter, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase-config';

interface UserSettings {
  emailNotifications: boolean;
  soundNotifications: boolean;
  darkMode: boolean;
  desktopPush: boolean;
  rememberFilters: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  emailNotifications: true,
  soundNotifications: true,
  darkMode: false,
  desktopPush: false,
  rememberFilters: true,
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const pendingWritesRef = useRef(0);

  // Cargar settings desde Firestore y mantenerlos sincronizados en tiempo real
  useEffect(() => {
    if (!user?.id) return;
    const ref = doc(db, 'users', user.id);

    getDoc(ref).then((snap) => {
      if (snap.exists() && snap.data()?.settings) {
        setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...snap.data().settings }));
      }
    });

    const unsubscribe = onSnapshot(ref, (snap) => {
      // Ignorar snapshots generados por nuestros propios updateDoc para evitar loops
      if (pendingWritesRef.current > 0) return;
      if (snap.exists() && snap.data()?.settings) {
        setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...snap.data().settings }));
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

  const updateSetting = async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    if (!user?.id) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    pendingWritesRef.current += 1;
    try {
      await updateDoc(doc(db, 'users', user.id), { settings: newSettings });
      toast.success('Configuracion guardada');
    } catch (err) {
      console.error('Error guardando settings:', err);
      toast.error('Error al guardar configuracion');
    } finally {
      pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
    }
  };

  if (!user) {
    return (
      <Layout title="Configuracion">
        <div className="flex items-center justify-center py-20">
          <p className="text-[#86868B]">Inicia sesion para ver configuracion</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Configuracion">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold text-[#1D1D1F]">Configuracion</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-corporate" />
              Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div><Label>Email</Label><p className="text-sm text-[#86868B]">Recibir emails de tareas, turnos e incidencias</p></div>
              <Switch checked={settings.emailNotifications} onCheckedChange={(v) => updateSetting('emailNotifications', v)} />
            </div>
            <div className="flex items-center justify-between opacity-60">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#86868B]" />
                <div><Label>Celular</Label><p className="text-sm text-[#86868B]">Push notifications en la app movil</p></div>
              </div>
              <div className="flex items-center gap-2"><span className="text-xs text-[#86868B]">Proximamente</span><Switch checked={false} disabled /></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#86868B]" />
                <div><Label>Escritorio</Label><p className="text-sm text-[#86868B]">Notificaciones push en el navegador</p></div>
              </div>
              <Switch checked={settings.desktopPush} onCheckedChange={(v) => { updateSetting('desktopPush', v); if (v && 'Notification' in window) Notification.requestPermission(); }} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#86868B]" />
                <div><Label>Sonidos</Label><p className="text-sm text-[#86868B]">Reproducir sonido en notificaciones</p></div>
              </div>
              <Switch checked={settings.soundNotifications} onCheckedChange={(v) => updateSetting('soundNotifications', v)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-corporate" />
              Apariencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div><Label>Modo oscuro</Label><p className="text-sm text-[#86868B]">Tema oscuro para la aplicacion</p></div>
              <Switch checked={settings.darkMode} onCheckedChange={(v) => updateSetting('darkMode', v)} />
            </div>
            <div className="flex items-center justify-between opacity-60">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#86868B]" />
                <div><Label>Idioma</Label><p className="text-sm text-[#86868B]">Idioma de la interfaz</p></div>
              </div>
              <div className="flex items-center gap-2"><span className="text-xs text-[#86868B]">Espanol</span><span className="text-xs text-[#C7C7CC]">/ English proximamente</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-corporate" />
              Preferencias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div><Label>Recordar filtros</Label><p className="text-sm text-[#86868B]">Guardar ultimo filtro usado en cada modulo</p></div>
              <Switch checked={settings.rememberFilters} onCheckedChange={(v) => updateSetting('rememberFilters', v)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-corporate" />
              Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm"><span className="text-[#86868B]">Formato de hora</span><span className="font-medium text-[#1D1D1F]">24 horas</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-[#86868B]">Inicio de semana</span><span className="font-medium text-[#1D1D1F]">Lunes</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-[#86868B]">Zona horaria</span><span className="font-medium text-[#1D1D1F]">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span></div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
