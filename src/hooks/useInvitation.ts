import { useCallback, useState } from 'react';

const FUNCTION_BASE = 'https://us-central1-wve-b3db5.cloudfunctions.net';

export function useInvitation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendInvitation = useCallback(async (data: {
    email: string; name: string; role: string; department: string; userId: string;
  }) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${FUNCTION_BASE}/sendInvitationEmail`, {
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
      const res = await fetch(`${FUNCTION_BASE}/acceptInvitation`, {
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
