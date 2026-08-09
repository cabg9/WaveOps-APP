import { useCallback, useState } from 'react';

const SEND_INVITATION_URL = 'https://sendinvitationemail-fex6pa2byq-uc.a.run.app';
const ACCEPT_INVITATION_URL = 'https://acceptinvitation-fex6pa2byq-uc.a.run.app';

export function useInvitation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendInvitation = useCallback(async (data: {
    email: string; name: string; role: string; department: string; userId: string;
  }) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(SEND_INVITATION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error al enviar invitacion');
      return result;
    } catch (err: any) { setError(err.message); throw err; }
    finally { setLoading(false); }
  }, []);

  const acceptInvitation = useCallback(async (token: string, password: string) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(ACCEPT_INVITATION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error al aceptar invitacion');
      return result;
    } catch (err: any) { setError(err.message); throw err; }
    finally { setLoading(false); }
  }, []);

  return { sendInvitation, acceptInvitation, loading, error };
}
