// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PARA CREAR USUARIOS EN FIREBASE AUTH
// Se ejecuta al iniciar la app y crea usuarios si no existen
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  fetchSignInMethodsForEmail 
} from 'firebase/auth';
import { auth } from '@/firebase-config';

const usersToCreate = [
  { email: 'director@waveops.com', name: 'Andres Bonilla', password: '123456' },
  { email: 'gerente@waveops.com', name: 'Carmen Vargas', password: '123456' },
  { email: 'gerente2@waveops.com', name: 'Pedro Mendoza', password: '123456' },
  { email: 'supervisor@waveops.com', name: 'Jorge Ramirez', password: '123456' },
  { email: 'buzo1@waveops.com', name: 'Carlos Mendez', password: '123456' },
  { email: 'buzo2@waveops.com', name: 'Maria Gonzalez', password: '123456' },
  { email: 'guia@waveops.com', name: 'Fernando Diaz', password: '123456' },
  { email: 'cocinero@waveops.com', name: 'Antonio Ruiz', password: '123456' },
  { email: 'chofer@waveops.com', name: 'Luis Torres', password: '123456' },
  { email: 'rrhh@waveops.com', name: 'Roberto Silva', password: '123456' },
];

export function CreateAuthUsers() {
  const [status, setStatus] = useState<string>('Verificando usuarios...');

  useEffect(() => {
    const createUsers = async () => {
      console.log('🔍 Verificando usuarios en Firebase Auth...');
      
      for (const user of usersToCreate) {
        try {
          // Verificar si el usuario ya existe
          const methods = await fetchSignInMethodsForEmail(auth, user.email);
          
          if (methods.length === 0) {
            // Usuario no existe, crearlo
            console.log(`⏳ Creando usuario: ${user.email}`);
            const userCredential = await createUserWithEmailAndPassword(
              auth,
              user.email,
              user.password
            );
            await updateProfile(userCredential.user, {
              displayName: user.name,
            });
            console.log(`✅ Usuario creado: ${user.email}`);
          } else {
            console.log(`⚠️ Usuario ya existe: ${user.email}`);
          }
        } catch (err: any) {
          console.error(`❌ Error con ${user.email}:`, err.code, err.message);
        }
      }
      
      console.log('✅ Verificación de usuarios completada');
      setStatus('Usuarios verificados');
    };

    createUsers();
  }, []);

  // No renderiza nada visible
  return null;
}
