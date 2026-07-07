// Script de migracion: extrae departamentos unicos de usuarios y los crea en la coleccion departments
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase-config';

async function migrateDepartments() {
  console.log('[Migrate] Leyendo usuarios...');
  const usersSnap = await getDocs(collection(db, 'users'));
  const depts = new Map<string, { count: number; sampleUser: any }>();
  
  usersSnap.forEach(doc => {
    const u = doc.data();
    const d = (u.department || '').trim();
    if (d) {
      const existing = depts.get(d);
      depts.set(d, { count: (existing?.count || 0) + 1, sampleUser: u });
    }
  });
  
  if (depts.size === 0) {
    console.log('[Migrate] No se encontraron departamentos en usuarios.');
    return;
  }
  
  console.log(`[Migrate] Encontrados ${depts.size} departamentos:`);
  const colors = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#64748b'];
  let i = 0;
  
  for (const [name, info] of depts) {
    console.log(`  - "${name}" (${info.count} usuarios)`);
    await addDoc(collection(db, 'departments'), {
      name,
      description: '',
      color: colors[i % colors.length],
      icon: 'building',
      isActive: true,
      order: i,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    i++;
  }
  
  console.log(`[Migrate] ${i} departamentos migrados exitosamente!`);
}

migrateDepartments().catch(console.error);
