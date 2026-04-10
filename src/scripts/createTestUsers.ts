// ═══════════════════════════════════════════════════════════════════
// SCRIPT: Crear usuarios de prueba en Firestore
// Ejecutar con: npx tsx src/scripts/createTestUsers.ts
// ═══════════════════════════════════════════════════════════════════

import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { Department, Role } from '../types';

// Usuarios de prueba
const testUsers = [
  {
    email: 'director@waveops.com',
    name: 'Andres Bonilla',
    role: Role.DIRECTOR_GENERAL,
    department: Department.ADMINISTRATIVO,
    position: 'Director General',
    level: 1,
    isActive: true,
  },
  {
    email: 'gerente@waveops.com',
    name: 'Carmen Vargas',
    role: Role.GERENTE_OPERACIONES,
    department: Department.DIVE_SHOP,
    position: 'Gerente de Operaciones',
    level: 4,
    isActive: true,
  },
  {
    email: 'supervisor@waveops.com',
    name: 'Jorge Ramirez',
    role: Role.SUPERVISOR,
    department: Department.DIVE_SHOP,
    position: 'Supervisor de Dive Shop',
    level: 6,
    isActive: true,
  },
  {
    email: 'buzo1@waveops.com',
    name: 'Carlos Mendez',
    role: Role.STAFF,
    department: Department.DIVE_SHOP,
    position: 'Buzo',
    level: 7,
    isActive: true,
  },
  {
    email: 'buzo2@waveops.com',
    name: 'Maria Gonzalez',
    role: Role.STAFF,
    department: Department.DIVE_SHOP,
    position: 'Buzo',
    level: 7,
    isActive: true,
  },
  {
    email: 'guia@waveops.com',
    name: 'Fernando Diaz',
    role: Role.STAFF,
    department: Department.GUIANZA,
    position: 'Guía Naturalista',
    level: 7,
    isActive: true,
  },
  {
    email: 'cocinero@waveops.com',
    name: 'Antonio Ruiz',
    role: Role.GERENTE_DEPARTAMENTO,
    department: Department.COCINA,
    position: 'Chef Ejecutivo',
    level: 5,
    isActive: true,
  },
  {
    email: 'chofer@waveops.com',
    name: 'Luis Torres',
    role: Role.STAFF,
    department: Department.MOVILIDAD,
    position: 'Chofer',
    level: 7,
    isActive: true,
  },
];

async function createTestUsers() {
  console.log('🚀 Creando usuarios de prueba en Firestore...\n');
  
  try {
    for (const user of testUsers) {
      const docRef = await addDoc(collection(db, 'users'), {
        ...user,
        createdAt: new Date().toISOString(),
      });
      console.log(`✅ ${user.name} (${user.email}) - ID: ${docRef.id}`);
    }
    
    console.log('\n🎉 ¡Usuarios creados exitosamente!');
    console.log(`Total: ${testUsers.length} usuarios`);
  } catch (error) {
    console.error('❌ Error al crear usuarios:', error);
  }
}

// Para ejecutar: importar y llamar createTestUsers() desde un componente
export { createTestUsers };
