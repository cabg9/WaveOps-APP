const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyA0I98d1hP1EH-3bHHau0fLHQZuccfU10Y",
  authDomain: "wve-b3db5.firebaseapp.com",
  projectId: "wve-b3db5",
  storageBucket: "wve-b3db5.appspot.com",
  messagingSenderId: "79515389827",
  appId: "1:79515389827:web:4869ddbd6c7cc638ac0bb9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MODULES = [
  { id: 'tasks', name: 'Tasks', nameEs: 'Tareas', description: 'Gestion de tareas operativas', icon: 'ClipboardList', color: '#007AFF', route: '/tasks', isActive: true, isVisible: true, status: 'live', order: 1, category: 'operations', requiredPermission: 'canViewModuleTasks', isSystem: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'horarios', name: 'Horarios', nameEs: 'Horarios', description: 'Asignacion de turnos y gestion de horarios', icon: 'Clock', color: '#5856D6', route: '/horarios', isActive: true, isVisible: true, status: 'live', order: 2, category: 'operations', requiredPermission: 'canViewModuleHorarios', isSystem: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'reportes', name: 'Reportes', nameEs: 'Reportes', description: 'Generacion y consulta de reportes', icon: 'FileText', color: '#34C759', route: '/reportes', isActive: true, isVisible: true, status: 'live', order: 3, category: 'management', requiredPermission: 'canViewModuleReportes', isSystem: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'ordenes-pago', name: 'Ordenes de Pago', nameEs: 'Ordenes de Pago', description: 'Gestion de ordenes de pago', icon: 'CreditCard', color: '#FF9500', route: '/ordenes-pago', isActive: true, isVisible: true, status: 'live', order: 4, category: 'financial', requiredPermission: 'canViewModuleOrdenesPago', isSystem: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'dive-ops', name: 'Dive Ops', nameEs: 'Operaciones de Buceo', description: 'Gestion de operaciones de buceo', icon: 'IdCard', color: '#5AC8FA', route: '/dive-ops', isActive: true, isVisible: true, status: 'live', order: 5, category: 'operations', requiredPermission: 'canViewModuleDiveOps', isSystem: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'requisiciones', name: 'Requisiciones', nameEs: 'Requisiciones', description: 'Gestion de requisiciones y compras', icon: 'ShoppingCart', color: '#FFCC00', route: '/requisiciones', isActive: true, isVisible: true, status: 'live', order: 6, category: 'logistics', requiredPermission: 'canViewModuleRequisiciones', isSystem: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'movilidad', name: 'Movilidad', nameEs: 'Movilidad', description: 'Gestion de transporte', icon: 'Car', color: '#FF3B30', route: '/movilidad', isActive: true, isVisible: true, status: 'live', order: 7, category: 'logistics', requiredPermission: 'canViewModuleMovilidad', isSystem: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'vessels', name: 'Vessels', nameEs: 'Embarcaciones', description: 'Gestion de embarcaciones', icon: 'Anchor', color: '#AF52DE', route: '/vessels', isActive: true, isVisible: true, status: 'live', order: 8, category: 'operations', requiredPermission: 'canViewModuleVessels', isSystem: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'develops', name: 'Develops', nameEs: 'Administracion', description: 'Panel maestro de control', icon: 'Code2', color: '#1D1D1F', route: '/develops', isActive: true, isVisible: false, status: 'live', order: 99, category: 'admin', requiredPermission: 'canViewModuleDevelops', isSystem: true, createdAt: new Date().toISOString(), createdBy: 'system' },
];

const L1 = ['canViewDashboard','canViewModuleTasks','canViewModuleHorarios','canViewModuleDiveOps','canViewModuleVessels','canViewModuleMovilidad','canViewModuleRequisiciones','canViewModuleOrdenesPago','canViewModuleReportes','canViewModuleDevelops','canCreateSpecificTask','canCreateExtraTask','canEditAllTasks','canDeleteAllTasks','canVerifyTask','canRateTask','canBlockTask','canUnblockTask','canViewAllDepartments','canReopenTask','canViewTeam','canAssignShifts','canModifyShifts','canApproveChanges','canRejectChanges','canRequestChange','canCreateIncidencia','canViewAllIncidencias','canViewOperationalIncidencias','canViewOwnDepartmentIncidencias','canConfirmIncidenciaAsManager','canResolveIncidencia','canCloseIncidencia','canReopenIncidencia'];
const L2 = ['canViewDashboard','canViewModuleTasks','canViewModuleHorarios','canViewModuleDiveOps','canViewModuleVessels','canViewModuleMovilidad','canViewModuleRequisiciones','canViewModuleOrdenesPago','canViewModuleReportes','canCreateExtraTask','canEditOwnTasks','canDeleteOwnTasks','canVerifyTask','canRateTask','canBlockTask','canUnblockTask','canViewAllDepartments','canReopenTask','canViewTeam','canAssignShifts','canModifyShifts','canApproveChanges','canRejectChanges','canRequestChange','canCreateIncidencia','canViewAllIncidencias','canViewOperationalIncidencias','canViewOwnDepartmentIncidencias','canConfirmIncidenciaAsManager','canResolveIncidencia','canCloseIncidencia','canReopenIncidencia'];
const L3 = ['canViewDashboard','canViewModuleTasks','canViewModuleHorarios','canViewModuleDiveOps','canViewModuleVessels','canViewModuleMovilidad','canViewModuleRequisiciones','canViewModuleOrdenesPago','canViewModuleReportes','canCreateExtraTask','canEditAllTasks','canDeleteAllTasks','canVerifyTask','canRateTask','canBlockTask','canUnblockTask','canViewAllDepartments','canReopenTask','canViewTeam','canAssignShifts','canModifyShifts','canApproveChanges','canRejectChanges','canRequestChange','canCreateIncidencia','canViewAllIncidencias','canViewOperationalIncidencias','canViewOwnDepartmentIncidencias','canConfirmIncidenciaAsManager','canResolveIncidencia','canCloseIncidencia','canReopenIncidencia'];
const L4 = ['canViewDashboard','canViewModuleTasks','canViewModuleHorarios','canViewModuleDiveOps','canViewModuleVessels','canViewModuleMovilidad','canViewModuleRequisiciones','canViewModuleOrdenesPago','canViewModuleReportes','canCreateExtraTask','canEditOwnTasks','canDeleteOwnTasks','canVerifyTask','canRateTask','canBlockTask','canUnblockTask','canViewAllDepartments','canReopenTask','canViewTeam','canAssignShifts','canModifyShifts','canApproveChanges','canRejectChanges','canRequestChange','canCreateIncidencia','canViewOperationalIncidencias','canViewOwnDepartmentIncidencias','canConfirmIncidenciaAsManager','canResolveIncidencia','canCloseIncidencia','canReopenIncidencia'];
const L5 = ['canViewDashboard','canViewModuleTasks','canViewModuleHorarios','canViewModuleDiveOps','canViewModuleVessels','canViewModuleMovilidad','canViewModuleRequisiciones','canCreateExtraTask','canEditOwnTasks','canDeleteOwnTasks','canVerifyTask','canRateTask','canBlockTask','canUnblockTask','canViewOwnDepartment','canReopenTask','canViewTeam','canAssignShifts','canModifyShifts','canApproveChanges','canRejectChanges','canRequestChange','canCreateIncidencia','canViewOwnDepartmentIncidencias','canConfirmIncidenciaAsManager','canResolveIncidencia','canCloseIncidencia','canReopenIncidencia'];
const L6 = ['canViewDashboard','canViewModuleTasks','canViewModuleHorarios','canViewModuleDiveOps','canViewModuleVessels','canViewModuleMovilidad','canViewModuleRequisiciones','canCreateExtraTask','canEditOwnTasks','canDeleteOwnTasks','canVerifyTask','canRateTask','canBlockTask','canUnblockTask','canViewOwnDepartment','canReopenTask','canViewTeam','canRequestChange','canCreateIncidencia','canViewOwnDepartmentIncidencias','canConfirmIncidenciaAsSupervisor','canResolveIncidencia','canReopenIncidencia'];
const L7 = ['canViewDashboard','canViewModuleTasks','canViewModuleHorarios','canViewModuleDiveOps','canViewModuleVessels','canViewModuleMovilidad','canBlockTask','canViewOwnDepartment','canRequestChange','canCreateIncidencia','canViewOwnDepartmentIncidencias'];

const ROLES = [
  { id: 'director_general', name: 'Director General', description: 'Acceso total', baseRole: 'DIRECTOR_GENERAL', level: 1, permissions: L1, moduleAccess: MODULES.map(m => ({ moduleId: m.id, canView: true, canEdit: true })), isSystem: true, isActive: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'director', name: 'Director', description: 'Acceso amplio, sin Develops', baseRole: 'DIRECTOR', level: 2, permissions: L2, moduleAccess: MODULES.filter(m => m.id !== 'develops').map(m => ({ moduleId: m.id, canView: true, canEdit: true })), isSystem: true, isActive: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'rrhh', name: 'RRHH', description: 'Gestion completa de personal', baseRole: 'RRHH', level: 3, permissions: L3, moduleAccess: MODULES.filter(m => m.id !== 'develops').map(m => ({ moduleId: m.id, canView: true, canEdit: true })), isSystem: true, isActive: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'gerente_operaciones', name: 'Gerente de Operaciones', description: 'Gestion operativa', baseRole: 'GERENTE_OPERACIONES', level: 4, permissions: L4, moduleAccess: MODULES.filter(m => m.id !== 'develops').map(m => ({ moduleId: m.id, canView: true, canEdit: m.id !== 'ordenes-pago' })), isSystem: true, isActive: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'gerente_departamento', name: 'Gerente de Departamento', description: 'Gestion de su departamento', baseRole: 'GERENTE_DEPARTAMENTO', level: 5, permissions: L5, moduleAccess: MODULES.filter(m => !['develops','ordenes-pago','reportes'].includes(m.id)).map(m => ({ moduleId: m.id, canView: true, canEdit: true })), isSystem: true, isActive: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'supervisor', name: 'Supervisor', description: 'Supervision operativa', baseRole: 'SUPERVISOR', level: 6, permissions: L6, moduleAccess: MODULES.filter(m => !['develops','ordenes-pago','reportes'].includes(m.id)).map(m => ({ moduleId: m.id, canView: true, canEdit: false })), isSystem: true, isActive: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'staff', name: 'Staff', description: 'Operaciones basicas', baseRole: 'STAFF', level: 7, permissions: L7, moduleAccess: MODULES.filter(m => ['tasks','horarios','dive-ops','movilidad','vessels'].includes(m.id)).map(m => ({ moduleId: m.id, canView: true, canEdit: false })), isSystem: true, isActive: true, createdAt: new Date().toISOString(), createdBy: 'system' },
];

async function seed() {
  console.log('🌱 Seed Develops - WaveOps');
  
  for (const m of MODULES) {
    await setDoc(doc(db, 'appModules', m.id), m);
    console.log('✅ appModules/' + m.id);
  }
  
  const flags = {};
  MODULES.forEach(m => {
    const key = 'enable' + m.id.charAt(0).toUpperCase() + m.id.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    flags[key] = m.isActive;
  });
  flags.enableTaskPhotos = true; flags.enableTaskSubtasks = true; flags.enableTaskRating = true;
  flags.enableShiftDraft = true; flags.enableIncapacidades = true; flags.enableIncidencias = true;
  flags.enableBetaFeatures = false; flags.enableNewDashboard = false;

  await setDoc(doc(db, 'appSettings', 'global'), {
    id: 'global', featureFlags: flags,
    developAccess: { mode: 'whitelist', allowedUserIds: ['1Toq0mr9WONCpHor11z0'], allowedRoles: ['DIRECTOR_GENERAL'], allowDelegation: true },
    security: { passwordMinLength: 8, passwordRequireUppercase: true, passwordRequireNumbers: true, maxLoginAttempts: 5, sessionTimeoutMinutes: 480, requirePasswordForSensitiveActions: true, auditLogRetentionDays: 365 },
    branding: { appName: 'WaveOps', logoUrl: '', primaryColor: '#007AFF', companyName: 'Galapagos Dive & Surf' },
    modulesOrder: MODULES.filter(m => m.isVisible).map(m => m.id),
    updatedAt: new Date().toISOString(), updatedBy: 'system',
  });
  console.log('✅ appSettings/global');

  for (const r of ROLES) {
    await setDoc(doc(db, 'roleTemplates', r.id), r);
    console.log('✅ roleTemplates/' + r.id);
  }

  console.log('\\n✅ Seed completado: 9 modulos, 1 settings, 7 roles');
}

seed().catch(e => { console.error('❌', e); process.exit(1); });
