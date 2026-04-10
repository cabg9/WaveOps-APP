// ═══════════════════════════════════════════════════════════════════
// COMPONENTE DE INICIALIZACIÓN DE FIRESTORE
// Crea datos iniciales si las colecciones están vacías
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/firebase-config';
import { Department } from '@/types';

// Turnos iniciales
const initialShifts = [
  {
    name: 'Turno AM',
    department: Department.DIVE_SHOP,
    startTime: '08:00',
    endTime: '16:00',
    color: '#007AFF',
    isActive: true,
  },
  {
    name: 'Turno PM',
    department: Department.DIVE_SHOP,
    startTime: '16:00',
    endTime: '00:00',
    color: '#34C759',
    isActive: true,
  },
  {
    name: 'Turno Noche',
    department: Department.DIVE_SHOP,
    startTime: '00:00',
    endTime: '08:00',
    color: '#5856D6',
    isActive: true,
  },
  {
    name: 'Administrativo AM',
    department: Department.ADMINISTRATIVO,
    startTime: '09:00',
    endTime: '17:00',
    color: '#FF9500',
    isActive: true,
  },
  {
    name: 'Cocina Principal',
    department: Department.COCINA,
    startTime: '06:00',
    endTime: '14:00',
    color: '#FF3B30',
    isActive: true,
  },
  {
    name: 'Guianza AM',
    department: Department.GUIANZA,
    startTime: '07:00',
    endTime: '15:00',
    color: '#AF52DE',
    isActive: true,
  },
  {
    name: 'Movilidad',
    department: Department.MOVILIDAD,
    startTime: '08:00',
    endTime: '17:00',
    color: '#FF2D55',
    isActive: true,
  },
  {
    name: 'Warehouse',
    department: Department.WAREHOUSE,
    startTime: '08:00',
    endTime: '16:00',
    color: '#5AC8FA',
    isActive: true,
  },
];

// Usuarios de prueba
const initialUsers = [
  {
    email: 'director@waveops.com',
    name: 'Andres Bonilla',
    role: 'DIRECTOR_GENERAL',
    department: Department.ADMINISTRATIVO,
    position: 'Director General',
    level: 1,
    isActive: true,
  },
  {
    email: 'gerente@waveops.com',
    name: 'Carmen Vargas',
    role: 'GERENTE_OPERACIONES',
    department: Department.DIVE_SHOP,
    position: 'Gerente de Operaciones',
    level: 4,
    isActive: true,
  },
  {
    email: 'supervisor@waveops.com',
    name: 'Jorge Ramirez',
    role: 'SUPERVISOR',
    department: Department.DIVE_SHOP,
    position: 'Supervisor de Dive Shop',
    level: 6,
    isActive: true,
  },
  {
    email: 'buzo1@waveops.com',
    name: 'Carlos Mendez',
    role: 'STAFF',
    department: Department.DIVE_SHOP,
    position: 'Buzo',
    level: 7,
    isActive: true,
  },
  {
    email: 'buzo2@waveops.com',
    name: 'Maria Gonzalez',
    role: 'STAFF',
    department: Department.DIVE_SHOP,
    position: 'Buzo',
    level: 7,
    isActive: true,
  },
];

export function InitializeFirestore() {
  const [initialized, setInitialized] = useState(false);
  const [message, setMessage] = useState('Verificando datos...');

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Verificar y crear turnos
        const shiftsSnapshot = await getDocs(collection(db, 'shifts'));
        if (shiftsSnapshot.empty) {
          setMessage('Creando turnos iniciales...');
          for (const shift of initialShifts) {
            await addDoc(collection(db, 'shifts'), shift);
          }
          console.log('✅ Turnos creados');
        }

        // Verificar y crear usuarios
        const usersSnapshot = await getDocs(collection(db, 'users'));
        if (usersSnapshot.empty) {
          setMessage('Creando usuarios de prueba...');
          for (const user of initialUsers) {
            await addDoc(collection(db, 'users'), {
              ...user,
              createdAt: new Date().toISOString(),
            });
          }
          console.log('✅ Usuarios creados');
        }

        setMessage('¡Datos inicializados!');
        setInitialized(true);
      } catch (err) {
        console.error('Error al inicializar Firestore:', err);
        setMessage('Error al inicializar datos');
      }
    };

    initializeData();
  }, []);

  // No renderiza nada visible, solo ejecuta la inicialización
  return null;
}
