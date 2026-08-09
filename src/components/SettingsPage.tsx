// SETTINGS PAGE
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Volume2, Moon, Globe, Monitor, Smartphone, Filter, Clock } from 'lucide-react';
import { toast } from 'sonner';

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

function loadSettings(): UserSettings {
  try {
    const saved = localStorage.getItem('waveops-settings');
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: UserSettings) {
  localStorage.setItem('waveops-settings', JSON.stringify(settings));
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  useEffect(() => { saveSettings(settings); }, [settings]);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    toast.success('Configuracion guardada');
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
