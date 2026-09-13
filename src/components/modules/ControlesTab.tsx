// CONTROLES TAB - Catálogo Dinámico de Controles (Fase 0)
// Motor configurable: licencias, pruebas y certificados son REGISTROS
// creados en la app (colecciones 'controlTypes', 'controlAssignments' y
// 'controlTargetTypes'), nada hardcodeado. Cubre personas, departamentos,
// equipos, vehículos, embarcaciones y ubicaciones. Estado calculado en render
// (vigente/por_vencer/vencido/verificado). Las alertas de vencimiento las
// generan Cloud Functions (programada cada 15 min + inmediata al asignar):
// el cliente solo muestra estado y dispara la callable 'checkControlsNow'.
import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, setDoc, getDoc, query, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/firebase-config';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { useFirestoreUsers } from '@/hooks/firestore/useFirestoreUsers';
import { useDynamicDepartments } from '@/hooks/firestore/useDynamicDepartments';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAudit } from '@/hooks/useAudit';
import { useStorageUpload } from '@/hooks/firestore/useStorageUpload';
import { useFirestorePositions } from '@/hooks/firestore/useFirestorePositions';
import { executeWithConfirm } from '@/lib/confirm-action';
import { getCurrentTenantId } from '@/lib/tenant';
import { registerI18nKeys, t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Role } from '@/types';
import type { AuditAction } from '@/types/develops';
import type {
  ControlType,
  ControlAssignment,
  ControlTargetTypeItem,
  ControlFieldType,
  ControlAssignmentStatus,
  ControlHistoryEntry,
} from '@/types/catalogs';
import {
  Plus, Pencil, ShieldCheck, ChevronDown, ChevronUp, Search, ClipboardList,
  Layers, ImagePlus, AlertTriangle, CheckCircle2, XCircle, Clock, Power, FileCheck2, RefreshCw,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// I18N
// ═══════════════════════════════════════════════════════════════════

registerI18nKeys({
  es: {
    'controls.tab.types': 'Tipos de control',
    'controls.tab.assignments': 'Controles asignados',
    'controls.readOnly': 'Solo lectura. Solo Dirección General y RRHH pueden gestionar controles.',
    'controls.types.title': 'Tipos de control',
    'controls.types.subtitle': 'catálogo dinámico · nada hardcodeado',
    'controls.types.new': 'Nuevo tipo',
    'controls.types.loadSeeds': 'Cargar iniciales',
    'controls.types.empty': 'No hay tipos de control registrados',
    'controls.types.emptyHint': 'Crea el primer tipo o carga el catálogo inicial',
    'controls.type.modalNew': 'Nuevo tipo de control',
    'controls.type.modalEdit': 'Editar tipo de control',
    'controls.type.name': 'Nombre',
    'controls.type.namePlaceholder': 'Ej: PADI Open Water',
    'controls.type.nameEn': 'Nombre (inglés, opcional)',
    'controls.type.description': 'Descripción',
    'controls.type.appliesTo': 'Aplica a',
    'controls.type.roles': 'Roles a los que aplica',
    'controls.type.rolesHint': 'Define qué roles están obligados a tener este documento',
    'controls.type.validityMonths': 'Vigencia (meses)',
    'controls.type.validityHint': 'Vacío = no vence',
    'controls.type.alertDaysBefore': 'Alertar días antes del vencimiento',
    'controls.type.isRequired': 'Obligatorio',
    'controls.type.isOptional': 'Opcional',
    'controls.type.verifierRole': 'Rol verificador',
    'controls.type.positions': 'Posiciones a las que aplica',
    'controls.type.customFields': 'Campos personalizados',
    'controls.type.addField': 'Agregar campo',
    'controls.type.fieldLabel': 'Etiqueta',
    'controls.type.fieldType': 'Tipo',
    'controls.type.fieldOptions': 'Opciones (separadas por comas)',
    'controls.type.fieldType.texto': 'Texto',
    'controls.type.fieldType.fecha': 'Fecha',
    'controls.type.fieldType.numero': 'Número',
    'controls.type.fieldType.seleccion': 'Selección',
    'controls.type.noCustomFields': 'Sin campos personalizados',
    'controls.type.required': 'Obligatorio',
    'controls.type.optional': 'Opcional',
    'controls.type.validityForever': 'No vence',
    'controls.type.validityMonthsShort': 'meses de vigencia',
    'controls.type.alertDays': 'días de alerta',
    'controls.type.customFieldsCount': 'campos personalizados',
    'controls.type.deactivate': 'Desactivar',
    'controls.type.activate': 'Activar',
    'controls.applies.personas': 'Personas',
    'controls.applies.departamentos': 'Departamentos',
    'controls.applies.equipos': 'Equipos',
    'controls.applies.vehiculos': 'Vehículos',
    'controls.applies.embarcaciones': 'Embarcaciones',
    'controls.applies.ubicaciones': 'Ubicaciones',
    'controls.type.targetSelection': 'Selección específica',
    'controls.type.selectUsers': 'Personas incluidas',
    'controls.type.selectDepartments': 'Departamentos incluidos',
    'controls.type.selectLocations': 'Ubicaciones incluidas',
    'controls.type.noDepartment': 'Sin departamento',
    'controls.type.addName': 'Agregar',
    'controls.type.nameInputPlaceholder': 'Escribe un nombre y pulsa Agregar',
    'controls.type.noSelection': 'Sin selección',
    'controls.detail.targetSelections': 'Selección por destino',
    'controls.type.scopeTabsHint': 'Activa una o varias para indicar a quiénes aplica este control.',
    'controls.targets.title': '¿A qué se le puede asignar un control?',
    'controls.targets.subtitle': 'Tipos de destino: personas, departamentos, equipos, vehículos, embarcaciones o ubicaciones. Crea aquí cualquier tipo de cosa que necesite documentos o controles.',
    'controls.targets.add': 'Agregar',
    'controls.targets.newPlaceholder': 'Nuevo destino...',
    'controls.seeds.confirmTitle': 'Cargar catálogo inicial',
    'controls.seeds.confirmDesc': 'Se crearán los destinos y tipos de control iniciales que falten. Los existentes no se modifican.',
    'controls.seeds.summary': '{targets} destinos y {types} tipos cargados ({existing} ya existían)',
    'controls.targets.empty': 'Sin destinos en el catálogo. Carga el catálogo inicial o agrega uno.',
    'controls.targets.renamed': 'Destino actualizado',
    'controls.assignments.title': 'Controles asignados',
    'controls.assignments.new': 'Nuevo control',
    'controls.assignments.checkNow': 'Verificar vencimientos ahora',
    'controls.assignments.checkNowResult': '{checked} controles revisados, {updated} estados actualizados, {alerts} alertas enviadas',
    'controls.assignments.empty': 'No hay controles asignados',
    'controls.assignments.search': 'Buscar por nombre...',
    'controls.assignments.filterStatus': 'Estado',
    'controls.assignments.filterAll': 'Todos',
    'controls.assignments.filterVigente': 'Vigente',
    'controls.assignments.filterPorVencer': 'Por vencer',
    'controls.assignments.filterVencido': 'Vencido',
    'controls.assignments.filterVerificado': 'Verificado',
    'controls.assignment.modalNew': 'Asignar control',
    'controls.assignment.modalEdit': 'Editar control asignado',
    'controls.assignment.controlType': 'Tipo de control',
    'controls.assignment.selectType': 'Selecciona un tipo',
    'controls.assignment.targetCategory': '¿A qué aplica?',
    'controls.assignment.targetUser': 'Persona',
    'controls.assignment.selectUser': 'Selecciona una persona',
    'controls.assignment.targetName.equipos': 'Nombre del equipo',
    'controls.assignment.targetName.vehiculos': 'Nombre del vehículo',
    'controls.assignment.targetName.embarcaciones': 'Nombre de la embarcación',
    'controls.assignment.targetName.ubicaciones': 'Nombre de la ubicación',
    'controls.assignment.targetName.generic': 'Nombre del equipo/vehículo/embarcación/ubicación',
    'controls.assignment.targetDepartment': 'Departamento',
    'controls.assignment.selectDepartment': 'Selecciona un departamento',
    'controls.assignment.targetNamePlaceholder': 'Ej: Compresor principal',
    'controls.assignment.issueDate': 'Fecha de emisión',
    'controls.assignment.expiryDate': 'Fecha de vencimiento',
    'controls.assignment.expiryAuto': 'Se calcula automáticamente según la vigencia del tipo',
    'controls.assignment.expiryNone': 'Este control no vence',
    'controls.assignment.photo': 'Foto del documento (opcional)',
    'controls.assignment.photoSelect': 'Seleccionar imagen',
    'controls.assignment.verify': 'Verificar',
    'controls.assignment.verifyTitle': 'Verificar control',
    'controls.assignment.verifyConfirm': '¿Confirmas que el documento fue revisado y es válido?',
    'controls.assignment.verifiedBy': 'Verificado por',
    'controls.assignment.history': 'Historial',
    'controls.assignment.historyEmpty': 'Sin movimientos registrados',
    'controls.assignment.issueDateShort': 'Emisión',
    'controls.assignment.expiryDateShort': 'Vencimiento',
    'controls.status.vigente': 'Vigente',
    'controls.status.por_vencer': 'Por vencer',
    'controls.status.vencido': 'Vencido',
    'controls.status.verificado': 'Verificado',
    'controls.history.creado': 'Creado',
    'controls.history.emitido': 'Emitido',
    'controls.history.verificado': 'Verificado',
    'controls.history.editado': 'Editado',
    'controls.history.desactivado': 'Desactivado',
    'controls.history.alerta_enviada': 'Alerta enviada',
    'controls.detail.id': 'ID',
    'controls.detail.nameEn': 'Nombre (inglés)',
    'controls.detail.roles': 'Roles',
    'controls.detail.positions': 'Posiciones',
    'controls.detail.verifierRole': 'Rol verificador',
    'controls.detail.created': 'Creado',
    'controls.detail.updated': 'Actualizado',
    'controls.detail.icon': 'Icono',
    'controls.detail.state': 'Estado',
    'controls.detail.targetType': 'Tipo de destino',
    'controls.detail.lastAlert': 'Última alerta',
    'controls.detail.fieldType': 'Tipo de dato',
    'controls.common.save': 'Guardar',
    'controls.common.create': 'Crear',
    'controls.common.cancel': 'Cancelar',
    'controls.common.close': 'Cerrar',
    'controls.common.active': 'Activo',
    'controls.common.inactive': 'Inactivo',
    'controls.validation.nameRequired': 'El nombre es obligatorio',
    'controls.validation.appliesRequired': 'Selecciona al menos una opción en "Aplica a"',
    'controls.validation.typeRequired': 'Selecciona un tipo de control',
    'controls.validation.targetRequired': 'Indica a quién o qué se asigna el control',
    'controls.validation.issueDateRequired': 'La fecha de emisión es obligatoria',
    'controls.error.save': 'Error al guardar',
    'controls.error.load': 'Error al cargar datos',
    'controls.loading': 'Cargando controles...',
  },
  en: {
    'controls.tab.types': 'Control types',
    'controls.tab.assignments': 'Assigned controls',
    'controls.readOnly': 'Read only. Only General Management and HR can manage controls.',
    'controls.types.title': 'Control types',
    'controls.types.subtitle': 'dynamic catalog · nothing hardcoded',
    'controls.types.new': 'New type',
    'controls.types.loadSeeds': 'Load initial set',
    'controls.types.empty': 'No control types registered',
    'controls.types.emptyHint': 'Create the first type or load the initial catalog',
    'controls.type.modalNew': 'New control type',
    'controls.type.modalEdit': 'Edit control type',
    'controls.type.name': 'Name',
    'controls.type.namePlaceholder': 'E.g.: PADI Open Water',
    'controls.type.nameEn': 'Name (English, optional)',
    'controls.type.description': 'Description',
    'controls.type.appliesTo': 'Applies to',
    'controls.type.roles': 'Roles it applies to',
    'controls.type.rolesHint': 'Defines which roles are required to have this document',
    'controls.type.validityMonths': 'Validity (months)',
    'controls.type.validityHint': 'Empty = never expires',
    'controls.type.alertDaysBefore': 'Alert days before expiry',
    'controls.type.isRequired': 'Required',
    'controls.type.isOptional': 'Optional',
    'controls.type.verifierRole': 'Verifier role',
    'controls.type.positions': 'Positions it applies to',
    'controls.type.customFields': 'Custom fields',
    'controls.type.addField': 'Add field',
    'controls.type.fieldLabel': 'Label',
    'controls.type.fieldType': 'Type',
    'controls.type.fieldOptions': 'Options (comma separated)',
    'controls.type.fieldType.texto': 'Text',
    'controls.type.fieldType.fecha': 'Date',
    'controls.type.fieldType.numero': 'Number',
    'controls.type.fieldType.seleccion': 'Select',
    'controls.type.noCustomFields': 'No custom fields',
    'controls.type.required': 'Required',
    'controls.type.optional': 'Optional',
    'controls.type.validityForever': 'Never expires',
    'controls.type.validityMonthsShort': 'months of validity',
    'controls.type.alertDays': 'alert days',
    'controls.type.customFieldsCount': 'custom fields',
    'controls.type.deactivate': 'Deactivate',
    'controls.type.activate': 'Activate',
    'controls.applies.personas': 'People',
    'controls.applies.departamentos': 'Departments',
    'controls.applies.equipos': 'Equipment',
    'controls.applies.vehiculos': 'Vehicles',
    'controls.applies.embarcaciones': 'Vessels',
    'controls.applies.ubicaciones': 'Locations',
    'controls.type.targetSelection': 'Specific selection',
    'controls.type.selectUsers': 'Included people',
    'controls.type.selectDepartments': 'Included departments',
    'controls.type.selectLocations': 'Included locations',
    'controls.type.noDepartment': 'No department',
    'controls.type.addName': 'Add',
    'controls.type.nameInputPlaceholder': 'Type a name and press Add',
    'controls.type.noSelection': 'No selection',
    'controls.detail.targetSelections': 'Selection by target',
    'controls.type.scopeTabsHint': 'Turn on one or more to indicate who this control applies to.',
    'controls.targets.title': 'What can a control be assigned to?',
    'controls.targets.subtitle': 'Target types: people, departments, teams, vehicles, vessels or locations. Create here any kind of thing that needs documents or controls.',
    'controls.targets.add': 'Add',
    'controls.targets.newPlaceholder': 'New target...',
    'controls.seeds.confirmTitle': 'Load initial catalog',
    'controls.seeds.confirmDesc': 'Missing initial targets and control types will be created. Existing ones will not be modified.',
    'controls.seeds.summary': '{targets} targets and {types} types loaded ({existing} already existed)',
    'controls.targets.empty': 'No targets in the catalog. Load the initial set or add one.',
    'controls.targets.renamed': 'Target updated',
    'controls.assignments.title': 'Assigned controls',
    'controls.assignments.new': 'New control',
    'controls.assignments.checkNow': 'Check expirations now',
    'controls.assignments.checkNowResult': '{checked} controls checked, {updated} statuses updated, {alerts} alerts sent',
    'controls.assignments.empty': 'No assigned controls',
    'controls.assignments.search': 'Search by name...',
    'controls.assignments.filterStatus': 'Status',
    'controls.assignments.filterAll': 'All',
    'controls.assignments.filterVigente': 'Valid',
    'controls.assignments.filterPorVencer': 'Expiring soon',
    'controls.assignments.filterVencido': 'Expired',
    'controls.assignments.filterVerificado': 'Verified',
    'controls.assignment.modalNew': 'Assign control',
    'controls.assignment.modalEdit': 'Edit assigned control',
    'controls.assignment.controlType': 'Control type',
    'controls.assignment.selectType': 'Select a type',
    'controls.assignment.targetCategory': 'What does it apply to?',
    'controls.assignment.targetUser': 'Person',
    'controls.assignment.selectUser': 'Select a person',
    'controls.assignment.targetName.equipos': 'Equipment name',
    'controls.assignment.targetName.vehiculos': 'Vehicle name',
    'controls.assignment.targetName.embarcaciones': 'Vessel name',
    'controls.assignment.targetName.ubicaciones': 'Location name',
    'controls.assignment.targetName.generic': 'Equipment/vehicle/vessel/location name',
    'controls.assignment.targetDepartment': 'Department',
    'controls.assignment.selectDepartment': 'Select a department',
    'controls.assignment.targetNamePlaceholder': 'E.g.: Main compressor',
    'controls.assignment.issueDate': 'Issue date',
    'controls.assignment.expiryDate': 'Expiry date',
    'controls.assignment.expiryAuto': 'Calculated automatically from the type validity',
    'controls.assignment.expiryNone': 'This control never expires',
    'controls.assignment.photo': 'Document photo (optional)',
    'controls.assignment.photoSelect': 'Select image',
    'controls.assignment.verify': 'Verify',
    'controls.assignment.verifyTitle': 'Verify control',
    'controls.assignment.verifyConfirm': 'Do you confirm the document was reviewed and is valid?',
    'controls.assignment.verifiedBy': 'Verified by',
    'controls.assignment.history': 'History',
    'controls.assignment.historyEmpty': 'No movements recorded',
    'controls.assignment.issueDateShort': 'Issued',
    'controls.assignment.expiryDateShort': 'Expires',
    'controls.status.vigente': 'Valid',
    'controls.status.por_vencer': 'Expiring soon',
    'controls.status.vencido': 'Expired',
    'controls.status.verificado': 'Verified',
    'controls.history.creado': 'Created',
    'controls.history.emitido': 'Issued',
    'controls.history.verificado': 'Verified',
    'controls.history.editado': 'Edited',
    'controls.history.desactivado': 'Deactivated',
    'controls.history.alerta_enviada': 'Alert sent',
    'controls.detail.id': 'ID',
    'controls.detail.nameEn': 'Name (English)',
    'controls.detail.roles': 'Roles',
    'controls.detail.positions': 'Positions',
    'controls.detail.verifierRole': 'Verifier role',
    'controls.detail.created': 'Created',
    'controls.detail.updated': 'Updated',
    'controls.detail.icon': 'Icon',
    'controls.detail.state': 'Status',
    'controls.detail.targetType': 'Target type',
    'controls.detail.lastAlert': 'Last alert',
    'controls.detail.fieldType': 'Field type',
    'controls.common.save': 'Save',
    'controls.common.create': 'Create',
    'controls.common.cancel': 'Cancel',
    'controls.common.close': 'Close',
    'controls.common.active': 'Active',
    'controls.common.inactive': 'Inactive',
    'controls.validation.nameRequired': 'Name is required',
    'controls.validation.appliesRequired': 'Select at least one "Applies to" option',
    'controls.validation.typeRequired': 'Select a control type',
    'controls.validation.targetRequired': 'Indicate who or what the control is assigned to',
    'controls.validation.issueDateRequired': 'Issue date is required',
    'controls.error.save': 'Error saving',
    'controls.error.load': 'Error loading data',
    'controls.loading': 'Loading controls...',
  },
});

// ═══════════════════════════════════════════════════════════════════
// CONSTANTES Y UTILIDADES
// ═══════════════════════════════════════════════════════════════════

// Semillas del catálogo dinámico "Aplica a" (controlTargetTypes).
// ids deterministas → setDoc idempotente; nunca se borran documentos.
const SEED_TARGET_TYPES: Array<{ id: string; name: string }> = [
  { id: 'personas', name: 'Personas' },
  { id: 'departamentos', name: 'Departamentos' },
  { id: 'equipos', name: 'Equipos' },
  { id: 'vehiculos', name: 'Vehículos' },
  { id: 'embarcaciones', name: 'Embarcaciones' },
  { id: 'ubicaciones', name: 'Ubicaciones' },
];

// Semillas del catálogo inicial (ids deterministas → setDoc idempotente)
const SEED_CONTROL_TYPES: Array<{
  id: string;
  name: string;
  description: string;
  appliesTo: string[];
  validityMonths: number | null;
}> = [
  { id: 'padi-open-water', name: 'PADI Open Water', description: 'Certificación PADI Open Water para buzos.', appliesTo: ['personas'], validityMonths: 24 },
  { id: 'licencia-conducir', name: 'Licencia de conducir', description: 'Licencia de conducir vigente del colaborador.', appliesTo: ['personas'], validityMonths: 60 },
  { id: 'prueba-hidrostatica-tanque', name: 'Prueba hidrostática de tanque', description: 'Prueba hidrostática periódica de tanques de buceo.', appliesTo: ['equipos'], validityMonths: 12 },
  { id: 'seguro-guia', name: 'Seguro de guía', description: 'Seguro vigente para guías de turismo.', appliesTo: ['personas'], validityMonths: 12 },
  { id: 'manipulacion-alimentos', name: 'Manipulación de alimentos', description: 'Certificado de manipulación de alimentos.', appliesTo: ['personas'], validityMonths: 12 },
  { id: 'revision-tecnica-vehicular', name: 'Revisión técnica vehicular', description: 'Revisión técnica vehicular al día.', appliesTo: ['vehiculos'], validityMonths: 12 },
];

// Acciones de auditoría (cast: el union AuditAction aún no incluye prefijo CONTROL_)
const AUDIT_ACTIONS = {
  typeCreated: 'CONTROL_TYPE_CREATED' as AuditAction,
  typeUpdated: 'CONTROL_TYPE_UPDATED' as AuditAction,
  seedsLoaded: 'CONTROL_TYPES_SEEDED' as AuditAction,
  assignmentCreated: 'CONTROL_ASSIGNMENT_CREATED' as AuditAction,
  assignmentUpdated: 'CONTROL_ASSIGNMENT_UPDATED' as AuditAction,
  assignmentDeactivated: 'CONTROL_ASSIGNMENT_DEACTIVATED' as AuditAction,
  assignmentVerified: 'CONTROL_ASSIGNMENT_VERIFIED' as AuditAction,
  targetCreated: 'CONTROL_TARGET_CREATED' as AuditAction,
  targetUpdated: 'CONTROL_TARGET_UPDATED' as AuditAction,
};

// Claves i18n legibles para ControlAssignment.targetType (singular guardado)
const ASSIGN_TARGET_I18N: Record<string, string> = {
  user: 'controls.applies.personas',
  departamento: 'controls.applies.departamentos',
  equipo: 'controls.applies.equipos',
  vehiculo: 'controls.applies.vehiculos',
  embarcacion: 'controls.applies.embarcaciones',
  ubicacion: 'controls.applies.ubicaciones',
};

function toIso(value: any): string {
  if (value?.toDate?.()) return value.toDate().toISOString();
  if (typeof value === 'string' && value) return value;
  return new Date().toISOString();
}

function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addMonthsToDate(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, (m - 1) + months, d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function diffDaysFromToday(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

// Estado calculado: NO es verdad absoluta, se recalcula en render y al crear
function computeStatus(assignment: ControlAssignment, type: ControlType | undefined): ControlAssignmentStatus {
  if (assignment.verifiedAt) return 'verificado';
  if (!assignment.expiryDate) return 'vigente';
  const days = diffDaysFromToday(assignment.expiryDate);
  if (days < 0) return 'vencido';
  const alertDays = type?.alertDaysBefore ?? 30;
  if (days <= alertDays) return 'por_vencer';
  return 'vigente';
}

function docToControlType(id: string, data: any): ControlType {
  return {
    id,
    tenantId: data.tenantId || 'default',
    isActive: data.isActive !== false,
    createdAt: toIso(data.createdAt),
    createdBy: data.createdBy || '',
    updatedAt: data.updatedAt ? toIso(data.updatedAt) : undefined,
    updatedBy: data.updatedBy,
    name: data.name || '',
    nameEn: data.nameEn,
    description: data.description,
    appliesTo: Array.isArray(data.appliesTo) ? data.appliesTo : [],
    targetSelections: data.targetSelections && typeof data.targetSelections === 'object'
      ? data.targetSelections
      : undefined,
    roleIds: Array.isArray(data.roleIds) ? data.roleIds : [],
    positionIds: Array.isArray(data.positionIds) ? data.positionIds : [],
    validityMonths: typeof data.validityMonths === 'number' ? data.validityMonths : null,
    frequencyDays: typeof data.frequencyDays === 'number' ? data.frequencyDays : null,
    customFields: Array.isArray(data.customFields) ? data.customFields : [],
    alertDaysBefore: typeof data.alertDaysBefore === 'number' ? data.alertDaysBefore : 30,
    isRequired: data.isRequired === true,
    verifierRole: data.verifierRole || 'RRHH',
  };
}

function docToControlAssignment(id: string, data: any): ControlAssignment {
  return {
    id,
    tenantId: data.tenantId || 'default',
    isActive: data.isActive !== false,
    createdAt: toIso(data.createdAt),
    createdBy: data.createdBy || '',
    updatedAt: data.updatedAt ? toIso(data.updatedAt) : undefined,
    updatedBy: data.updatedBy,
    controlTypeId: data.controlTypeId || '',
    controlTypeName: data.controlTypeName,
    targetType: data.targetType || 'user',
    targetId: data.targetId || '',
    targetName: data.targetName || '',
    targetDepartmentId: data.targetDepartmentId,
    issueDate: data.issueDate || '',
    expiryDate: data.expiryDate || null,
    customValues: data.customValues || {},
    photoUrl: data.photoUrl,
    status: data.status || 'vigente',
    verifiedBy: data.verifiedBy,
    verifiedByName: data.verifiedByName,
    verifiedAt: data.verifiedAt ? toIso(data.verifiedAt) : undefined,
    history: Array.isArray(data.history) ? data.history : [],
    lastAlertAt: data.lastAlertAt ? toIso(data.lastAlertAt) : undefined,
  };
}

function docToControlTargetType(id: string, data: any): ControlTargetTypeItem {
  return {
    id,
    tenantId: data.tenantId || 'default',
    isActive: data.isActive !== false,
    createdAt: toIso(data.createdAt),
    createdBy: data.createdBy || '',
    updatedAt: data.updatedAt ? toIso(data.updatedAt) : undefined,
    updatedBy: data.updatedBy,
    name: data.name || '',
    nameEn: data.nameEn,
    icon: data.icon,
  };
}

// ═══════════════════════════════════════════════════════════════════
// FORM STATE
// ═══════════════════════════════════════════════════════════════════

interface TypeFormState {
  name: string;
  nameEn: string;
  description: string;
  appliesTo: string[]; // ids del catálogo dinámico controlTargetTypes
  targetSelections: Record<string, string[]>; // selección específica por id de appliesTo
  rolesTabVisible: boolean; // pestaña ROLES activa (solo UI; no se persiste)
  roleIds: string[];
  positionIds: string[]; // ids de positions
  validityMonths: string; // string para input; vacío = no vence
  alertDaysBefore: string;
  isRequired: boolean;
  verifierRole: string;
  customFields: Array<{ key: string; label: string; type: ControlFieldType; options: string }>;
}

const EMPTY_TYPE_FORM: TypeFormState = {
  name: '',
  nameEn: '',
  description: '',
  appliesTo: [],
  targetSelections: {},
  rolesTabVisible: false,
  roleIds: [],
  positionIds: [],
  validityMonths: '',
  alertDaysBefore: '30',
  isRequired: false,
  verifierRole: 'RRHH',
  customFields: [],
};

interface AssignmentFormState {
  controlTypeId: string;
  appliesToSel: string; // id del catálogo controlTargetTypes
  targetUserId: string;
  targetDeptId: string; // solo cuando appliesToSel === 'departamentos'
  targetName: string;
  issueDate: string;
  expiryDate: string; // solo cuando el tipo no tiene validityMonths
  customValues: Record<string, string>;
  photoFile: File | null;
}

const EMPTY_ASSIGNMENT_FORM: AssignmentFormState = {
  controlTypeId: '',
  appliesToSel: '',
  targetUserId: '',
  targetDeptId: '',
  targetName: '',
  issueDate: todayInputValue(),
  expiryDate: '',
  customValues: {},
  photoFile: null,
};

const STATUS_STYLE: Record<ControlAssignmentStatus, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  vigente: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: CheckCircle2 },
  por_vencer: { bg: 'bg-amber-50', text: 'text-amber-600', icon: Clock },
  vencido: { bg: 'bg-red-50', text: 'text-red-600', icon: XCircle },
  verificado: { bg: 'bg-blue-50', text: 'text-blue-600', icon: ShieldCheck },
};

// Fila de detalle expandible: etiqueta gris + valor, usada en las tres listas
function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 text-xs">
      <span className="sm:w-44 shrink-0 text-[#86868B] font-medium">{label}</span>
      <span className="text-[#1D1D1F] break-words">{value || '—'}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════

export function ControlesTab() {
  const { user: currentUser } = useAuth();
  const { users } = useFirestoreUsers();
  const { departments: dynamicDepartments } = useDynamicDepartments();
  const { roleTemplates } = useAppConfig();
  const { positions } = useFirestorePositions();
  const { logAction } = useAudit();
  const { uploadImage, uploading: uploadingPhoto } = useStorageUpload();

  const [controlTypes, setControlTypes] = useState<ControlType[]>([]);
  const [assignments, setAssignments] = useState<ControlAssignment[]>([]);
  const [targetTypes, setTargetTypes] = useState<ControlTargetTypeItem[]>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string; isActive: boolean; tenantId?: string }>>([]);
  const [targetNameInputs, setTargetNameInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTargets, setSavingTargets] = useState(false);
  const [checkingNow, setCheckingNow] = useState(false);
  const [newTargetName, setNewTargetName] = useState('');
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [editingTargetName, setEditingTargetName] = useState('');

  const [tab, setTab] = useState<'types' | 'assignments'>('types');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ControlAssignmentStatus>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modales de tipo de control
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ControlType | null>(null);
  const [typeForm, setTypeForm] = useState<TypeFormState>(EMPTY_TYPE_FORM);

  // Modales de asignación
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ControlAssignment | null>(null);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>(EMPTY_ASSIGNMENT_FORM);

  // Modal de verificación
  const [verifyTarget, setVerifyTarget] = useState<ControlAssignment | null>(null);
  const [verifying, setVerifying] = useState(false);

  const tenantId = getCurrentTenantId();

  const canWrite = currentUser?.role === Role.DIRECTOR_GENERAL || currentUser?.role === Role.RRHH;
  const activeUsers = useMemo(() => users.filter(u => u.isActive !== false), [users]);
  const activeDepartments = useMemo(() => dynamicDepartments.filter(d => d.isActive), [dynamicDepartments]);
  const activeTypes = useMemo(() => controlTypes.filter(ct => ct.isActive), [controlTypes]);
  const activeAssignments = useMemo(() => assignments.filter(a => a.isActive), [assignments]);
  const activeTargetTypes = useMemo(() => targetTypes.filter(x => x.isActive), [targetTypes]);
  const activeLocations = useMemo(() => locations.filter(l => l.isActive), [locations]);

  // Usuarios activos agrupados por departamento (encabezados ordenados alfabéticamente)
  const usersByDepartment = useMemo(() => {
    const groups = new Map<string, typeof activeUsers>();
    activeUsers.forEach(u => {
      const dept = u.department || '';
      if (!groups.has(dept)) groups.set(dept, []);
      groups.get(dept)!.push(u);
    });
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [activeUsers]);

  // Resuelve ids/nombres guardados en targetSelections a nombres legibles
  const resolveSelectionNames = (targetId: string, values: string[]): string[] => {
    if (targetId === 'personas') return values.map(v => activeUsers.find(u => u.id === v)?.name || v);
    if (targetId === 'departamentos') return values.map(v => dynamicDepartments.find(d => d.id === v)?.name || v);
    if (targetId === 'ubicaciones') return values.map(v => locations.find(l => l.id === v)?.name || v);
    return values; // nombres de texto tal cual
  };

  // Nombre legible de un id del catálogo "Aplica a". Compatibilidad legacy:
  // ids antiguos sin doc en el catálogo caen a la clave i18n, y si tampoco
  // existe, se muestra el id tal cual.
  const targetTypeName = (id: string): string => {
    const item = targetTypes.find(x => x.id === id);
    if (item) return item.name;
    const legacy = t(`controls.applies.${id}`);
    return legacy !== `controls.applies.${id}` ? legacy : id;
  };

  // Nombre legible de una posición a partir de su id
  const positionName = (id: string): string =>
    positions.find(p => p.id === id)?.name || id;

  // Nombre legible de un rol (roleTemplate) a partir de su id
  const roleName = (id: string): string =>
    roleTemplates.find(rt => rt.id === id)?.name || id;

  // ═══════════════════════════════════════════════════════════════════
  // LISTENERS FIRESTORE
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    const q = query(collection(db, 'controlTypes'), orderBy('name', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map(d => docToControlType(d.id, d.data()))
          .filter(ct => !ct.tenantId || ct.tenantId === tenantId);
        setControlTypes(items);
        setLoading(false);
      },
      (err) => {
        console.error('[ControlesTab] controlTypes:', err);
        toast.error(t('controls.error.load'));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [tenantId]);

  useEffect(() => {
    const q = query(collection(db, 'controlAssignments'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map(d => docToControlAssignment(d.id, d.data()))
          .filter(a => !a.tenantId || a.tenantId === tenantId);
        setAssignments(items);
      },
      (err) => console.error('[ControlesTab] controlAssignments:', err)
    );
    return () => unsub();
  }, [tenantId]);

  // Catálogo dinámico "Aplica a" (controlTargetTypes)
  useEffect(() => {
    const q = query(collection(db, 'controlTargetTypes'), orderBy('name', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map(d => docToControlTargetType(d.id, d.data()))
          .filter(x => !x.tenantId || x.tenantId === tenantId);
        setTargetTypes(items);
      },
      (err) => console.error('[ControlesTab] controlTargetTypes:', err)
    );
    return () => unsub();
  }, [tenantId]);

  // Ubicaciones activas (colección 'locations'): alimenta el selector dependiente
  // del destino 'ubicaciones' en el formulario de tipo de control.
  useEffect(() => {
    const q = query(collection(db, 'locations'), orderBy('name', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map(d => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || '',
              isActive: data.isActive !== false,
              tenantId: data.tenantId,
            };
          })
          .filter(x => !x.tenantId || x.tenantId === tenantId);
        setLocations(items);
      },
      (err) => console.error('[ControlesTab] locations:', err)
    );
    return () => unsub();
  }, [tenantId]);

  // NOTA: las alertas de vencimiento (por_vencer / vencido) las generan las
  // Cloud Functions (revisión programada cada 15 min + notificación inmediata
  // al asignar). El cliente ya NO crea notificaciones: aquí solo se calcula
  // el estado para mostrarlo (vigente/por_vencer/vencido/verificado).

  // ═══════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════

  const typeOf = (assignment: ControlAssignment) =>
    controlTypes.find(ct => ct.id === assignment.controlTypeId);

  const canVerify = (assignment: ControlAssignment): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === Role.DIRECTOR_GENERAL || currentUser.role === Role.RRHH) return true;
    const type = typeOf(assignment);
    if (!type?.verifierRole) return false;
    if (currentUser.role === type.verifierRole) return true;
    const template = roleTemplates.find(rt => rt.id === type.verifierRole || rt.baseRole === type.verifierRole);
    return template ? currentUser.role === template.baseRole : false;
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const buildHistoryEntry = (action: ControlHistoryEntry['action'], note?: string): ControlHistoryEntry => ({
    action,
    by: currentUser?.id || 'system',
    byName: currentUser?.name || 'Sistema',
    at: new Date().toISOString(),
    ...(note ? { note } : {}),
  });

  // ═══════════════════════════════════════════════════════════════════
  // TIPOS DE CONTROL: CRUD + SEMILLAS
  // ═══════════════════════════════════════════════════════════════════

  const openCreateType = () => {
    setEditingType(null);
    setTypeForm(EMPTY_TYPE_FORM);
    setTypeModalOpen(true);
  };

  const openEditType = (ct: ControlType) => {
    setEditingType(ct);
    setTypeForm({
      name: ct.name,
      nameEn: ct.nameEn || '',
      description: ct.description || '',
      appliesTo: [...ct.appliesTo],
      targetSelections: { ...(ct.targetSelections || {}) },
      rolesTabVisible: (ct.roleIds || []).length > 0,
      roleIds: [...ct.roleIds],
      positionIds: [...(ct.positionIds || [])],
      validityMonths: ct.validityMonths != null ? String(ct.validityMonths) : '',
      alertDaysBefore: String(ct.alertDaysBefore ?? 30),
      isRequired: ct.isRequired,
      verifierRole: ct.verifierRole || 'RRHH',
      customFields: (ct.customFields || []).map(f => ({
        key: f.key,
        label: f.label,
        type: f.type,
        options: (f.options || []).join(', '),
      })),
    });
    setTypeModalOpen(true);
  };

  const toggleAppliesTo = (opt: string) => {
    setTypeForm(prev => ({
      ...prev,
      appliesTo: prev.appliesTo.includes(opt)
        ? prev.appliesTo.filter(o => o !== opt)
        : [...prev.appliesTo, opt],
    }));
  };

  const toggleRoleId = (roleId: string) => {
    setTypeForm(prev => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter(r => r !== roleId)
        : [...prev.roleIds, roleId],
    }));
  };

  const togglePositionId = (positionId: string) => {
    setTypeForm(prev => ({
      ...prev,
      positionIds: prev.positionIds.includes(positionId)
        ? prev.positionIds.filter(p => p !== positionId)
        : [...prev.positionIds, positionId],
    }));
  };

  // Selectores dependientes del destino: agregar/quitar un valor (id o nombre)
  // en targetSelections[targetId]. Los valores se conservan aunque el bloque se
  // oculte al quitar el chip de "Aplica a".
  const toggleTargetSelectionValue = (targetId: string, value: string) => {
    setTypeForm(prev => {
      const current = prev.targetSelections[targetId] || [];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, targetSelections: { ...prev.targetSelections, [targetId]: next } };
    });
  };

  // Destinos sin catálogo propio (equipos, vehículos, etc.): nombres libres con chips
  const addTargetName = (targetId: string) => {
    const name = (targetNameInputs[targetId] || '').trim();
    if (!name) return;
    setTypeForm(prev => {
      const current = prev.targetSelections[targetId] || [];
      if (current.includes(name)) return prev;
      return { ...prev, targetSelections: { ...prev.targetSelections, [targetId]: [...current, name] } };
    });
    setTargetNameInputs(prev => ({ ...prev, [targetId]: '' }));
  };

  const removeTargetName = (targetId: string, name: string) => {
    setTypeForm(prev => ({
      ...prev,
      targetSelections: {
        ...prev.targetSelections,
        [targetId]: (prev.targetSelections[targetId] || []).filter(v => v !== name),
      },
    }));
  };

  const updateCustomField = (index: number, patch: Partial<TypeFormState['customFields'][number]>) => {
    setTypeForm(prev => ({
      ...prev,
      customFields: prev.customFields.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }));
  };

  const handleSaveType = async () => {
    if (!currentUser) return;
    if (!typeForm.name.trim()) {
      toast.error(t('controls.validation.nameRequired'));
      return;
    }
    if (typeForm.appliesTo.length === 0) {
      toast.error(t('controls.validation.appliesRequired'));
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const validityMonths = typeForm.validityMonths.trim() === '' ? null : Number(typeForm.validityMonths);
      const alertDaysBefore = typeForm.alertDaysBefore.trim() === '' ? 30 : Number(typeForm.alertDaysBefore);
      const customFields = typeForm.customFields
        .filter(f => f.label.trim())
        .map((f, i) => ({
          key: f.key || `campo_${i + 1}`,
          label: f.label.trim(),
          type: f.type,
          ...(f.type === 'seleccion'
            ? { options: f.options.split(',').map(o => o.trim()).filter(Boolean) }
            : {}),
        }));
      const payload = {
        tenantId,
        name: typeForm.name.trim(),
        nameEn: typeForm.nameEn.trim() || null,
        description: typeForm.description.trim() || null,
        appliesTo: typeForm.appliesTo,
        targetSelections: typeForm.targetSelections,
        roleIds: typeForm.roleIds,
        positionIds: typeForm.positionIds,
        validityMonths,
        alertDaysBefore,
        isRequired: typeForm.isRequired,
        verifierRole: typeForm.verifierRole || 'RRHH',
        customFields,
        isActive: true,
        updatedAt: now,
        updatedBy: currentUser.name,
      };
      if (editingType) {
        await updateDoc(doc(db, 'controlTypes', editingType.id), payload);
        await logAction({
          action: AUDIT_ACTIONS.typeUpdated,
          targetType: 'control_type',
          targetId: editingType.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Tipo de control actualizado: ${payload.name}`,
        });
        toast.success(t('controls.common.save'));
      } else {
        const docRef = await addDoc(collection(db, 'controlTypes'), {
          ...payload,
          createdAt: now,
          createdBy: currentUser.name,
        });
        await logAction({
          action: AUDIT_ACTIONS.typeCreated,
          targetType: 'control_type',
          targetId: docRef.id,
          targetName: payload.name,
          impactLevel: 'major',
          description: `Tipo de control creado: ${payload.name}`,
        });
        toast.success(t('controls.common.create'));
      }
      setTypeModalOpen(false);
      setEditingType(null);
      setTypeForm(EMPTY_TYPE_FORM);
    } catch (err: any) {
      toast.error(`${t('controls.error.save')}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTypeActive = async (ct: ControlType) => {
    if (!currentUser || !canWrite) return;
    try {
      await updateDoc(doc(db, 'controlTypes', ct.id), {
        isActive: !ct.isActive,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.name,
      });
      await logAction({
        action: AUDIT_ACTIONS.typeUpdated,
        targetType: 'control_type',
        targetId: ct.id,
        targetName: ct.name,
        impactLevel: 'major',
        description: ct.isActive ? `Tipo de control desactivado: ${ct.name}` : `Tipo de control activado: ${ct.name}`,
      });
    } catch (err: any) {
      toast.error(`${t('controls.error.save')}: ${err.message}`);
    }
  };

  // UN SOLO botón "Cargar iniciales": primero los destinos (controlTargetTypes)
  // y después los tipos de control ligados a ellos. Idempotente: los docs que
  // ya existen con nombre NO se pisan (el usuario pudo renombrarlos/editarlos).
  const handleLoadInitialCatalog = async () => {
    if (!currentUser || !canWrite) return;
    await executeWithConfirm({
      level: 'major',
      title: t('controls.seeds.confirmTitle'),
      description: t('controls.seeds.confirmDesc'),
      action: async () => {
        setSaving(true);
        try {
          const now = new Date().toISOString();

          // 1) Destinos
          let targetsCreated = 0;
          let targetsExisting = 0;
          for (const seed of SEED_TARGET_TYPES) {
            const ref = doc(db, 'controlTargetTypes', seed.id);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              if (!snap.data()?.name) await setDoc(ref, { name: seed.name }, { merge: true });
              targetsExisting++;
            } else {
              await setDoc(ref, {
                tenantId,
                name: seed.name,
                isActive: true,
                createdAt: now,
                createdBy: currentUser.name,
                updatedAt: now,
                updatedBy: currentUser.name,
              }, { merge: true });
              targetsCreated++;
            }
          }

          // 2) Tipos de control ligados a los destinos
          let typesCreated = 0;
          let typesExisting = 0;
          for (const seed of SEED_CONTROL_TYPES) {
            const ref = doc(db, 'controlTypes', seed.id);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              if (!snap.data()?.name) await setDoc(ref, { name: seed.name }, { merge: true });
              typesExisting++;
            } else {
              await setDoc(ref, {
                tenantId,
                name: seed.name,
                nameEn: null,
                description: seed.description,
                appliesTo: seed.appliesTo,
                roleIds: [],
                positionIds: [],
                validityMonths: seed.validityMonths,
                alertDaysBefore: 30,
                isRequired: false,
                verifierRole: 'RRHH',
                customFields: [],
                isActive: true,
                createdAt: now,
                createdBy: currentUser.name,
                updatedAt: now,
                updatedBy: currentUser.name,
              }, { merge: true });
              typesCreated++;
            }
          }

          await logAction({
            action: AUDIT_ACTIONS.seedsLoaded,
            targetType: 'control_type',
            targetId: 'initial-catalog',
            targetName: 'Catálogo inicial de controles',
            impactLevel: 'major',
            description: `Catálogo inicial cargado: ${targetsCreated} destinos y ${typesCreated} tipos nuevos (${targetsExisting + typesExisting} ya existían)`,
          });
          toast.success(
            t('controls.seeds.summary')
              .replace('{targets}', String(targetsCreated))
              .replace('{types}', String(typesCreated))
              .replace('{existing}', String(targetsExisting + typesExisting))
          );
        } catch (err: any) {
          toast.error(`${t('controls.error.save')}: ${err.message}`);
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // ═══════════════════════════════════════════════════════════════════
  // CATÁLOGO "APLICA A" (controlTargetTypes): CRUD + SEMILLAS
  // ═══════════════════════════════════════════════════════════════════

  const handleCreateTarget = async () => {
    if (!currentUser || !canWrite || !newTargetName.trim()) return;
    setSavingTargets(true);
    try {
      await addDoc(collection(db, 'controlTargetTypes'), {
        tenantId,
        name: newTargetName.trim(),
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.name,
      });
      await logAction({
        action: AUDIT_ACTIONS.targetCreated,
        targetType: 'control_target',
        targetId: 'new',
        targetName: newTargetName.trim(),
        impactLevel: 'minor',
        description: `Destino de control creado: ${newTargetName.trim()}`,
      });
      setNewTargetName('');
    } catch (err: any) {
      toast.error(`${t('controls.error.save')}: ${err.message}`);
    } finally {
      setSavingTargets(false);
    }
  };

  const handleRenameTarget = async () => {
    if (!currentUser || !canWrite || !editingTargetId || !editingTargetName.trim()) return;
    setSavingTargets(true);
    try {
      await updateDoc(doc(db, 'controlTargetTypes', editingTargetId), {
        name: editingTargetName.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.name,
      });
      await logAction({
        action: AUDIT_ACTIONS.targetUpdated,
        targetType: 'control_target',
        targetId: editingTargetId,
        targetName: editingTargetName.trim(),
        impactLevel: 'minor',
        description: `Destino de control renombrado: ${editingTargetName.trim()}`,
      });
      toast.success(t('controls.targets.renamed'));
      setEditingTargetId(null);
      setEditingTargetName('');
    } catch (err: any) {
      toast.error(`${t('controls.error.save')}: ${err.message}`);
    } finally {
      setSavingTargets(false);
    }
  };

  const handleToggleTargetActive = async (tt: ControlTargetTypeItem) => {
    if (!currentUser || !canWrite) return;
    try {
      await updateDoc(doc(db, 'controlTargetTypes', tt.id), {
        isActive: !tt.isActive,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.name,
      });
      await logAction({
        action: AUDIT_ACTIONS.targetUpdated,
        targetType: 'control_target',
        targetId: tt.id,
        targetName: tt.name,
        impactLevel: 'minor',
        description: tt.isActive ? `Destino de control desactivado: ${tt.name}` : `Destino de control activado: ${tt.name}`,
      });
    } catch (err: any) {
      toast.error(`${t('controls.error.save')}: ${err.message}`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // VERIFICACIÓN MANUAL DE VENCIMIENTOS (Cloud Function callable)
  // ═══════════════════════════════════════════════════════════════════

  const handleCheckNow = async () => {
    if (!currentUser || !canWrite || checkingNow) return;
    setCheckingNow(true);
    try {
      const fn = httpsCallable(functions, 'checkControlsNow');
      const res = await fn();
      const data = (res?.data || {}) as { checked?: number; updated?: number; alerts?: number };
      toast.success(
        t('controls.assignments.checkNowResult')
          .replace('{checked}', String(data.checked ?? 0))
          .replace('{updated}', String(data.updated ?? 0))
          .replace('{alerts}', String(data.alerts ?? 0))
      );
    } catch (err: any) {
      toast.error(err?.message || String(err));
    } finally {
      setCheckingNow(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // CONTROLES ASIGNADOS: CRUD + VERIFICACIÓN
  // ═══════════════════════════════════════════════════════════════════

  const selectedAssignType = activeTypes.find(ct => ct.id === assignmentForm.controlTypeId);

  const openCreateAssignment = () => {
    setEditingAssignment(null);
    setAssignmentForm({ ...EMPTY_ASSIGNMENT_FORM, issueDate: todayInputValue() });
    setAssignmentModalOpen(true);
  };

  const openEditAssignment = (a: ControlAssignment) => {
    const targetTypeStr = a.targetType as string;
    setEditingAssignment(a);
    setAssignmentForm({
      controlTypeId: a.controlTypeId,
      appliesToSel: targetTypeStr === 'departamento' ? 'departamentos'
        : a.targetType === 'user' ? 'personas'
        : a.targetType === 'equipo' ? 'equipos'
        : a.targetType === 'vehiculo' ? 'vehiculos'
        : a.targetType === 'embarcacion' ? 'embarcaciones' : 'ubicaciones',
      targetUserId: a.targetType === 'user' ? a.targetId : '',
      targetDeptId: targetTypeStr === 'departamento' ? a.targetId : '',
      targetName: a.targetType === 'user' || targetTypeStr === 'departamento' ? '' : a.targetName,
      issueDate: a.issueDate || todayInputValue(),
      expiryDate: a.expiryDate || '',
      customValues: Object.fromEntries(Object.entries(a.customValues || {}).map(([k, v]) => [k, String(v)])),
      photoFile: null,
    });
    setAssignmentModalOpen(true);
  };

  const handleTypeChange = (controlTypeId: string) => {
    const ct = activeTypes.find(c => c.id === controlTypeId);
    setAssignmentForm(prev => ({
      ...prev,
      controlTypeId,
      appliesToSel: ct && ct.appliesTo.length === 1 ? ct.appliesTo[0] : '',
      targetUserId: '',
      targetDeptId: '',
      targetName: '',
      customValues: {},
    }));
  };

  const autoExpiry = (): string | null => {
    if (!selectedAssignType?.validityMonths || !assignmentForm.issueDate) return null;
    return addMonthsToDate(assignmentForm.issueDate, selectedAssignType.validityMonths);
  };

  const handleSaveAssignment = async () => {
    if (!currentUser) return;
    if (!assignmentForm.controlTypeId) {
      toast.error(t('controls.validation.typeRequired'));
      return;
    }
    const ct = selectedAssignType;
    if (!ct) {
      toast.error(t('controls.validation.typeRequired'));
      return;
    }
    if (ct.appliesTo.length > 1 && !assignmentForm.appliesToSel) {
      toast.error(t('controls.validation.targetRequired'));
      return;
    }
    const appliesToSel = assignmentForm.appliesToSel || ct.appliesTo[0];
    const isPerson = appliesToSel === 'personas';
    const isDepartment = appliesToSel === 'departamentos';
    if (isPerson && !assignmentForm.targetUserId) {
      toast.error(t('controls.validation.targetRequired'));
      return;
    }
    if (isDepartment && !assignmentForm.targetDeptId) {
      toast.error(t('controls.validation.targetRequired'));
      return;
    }
    if (!isPerson && !isDepartment && !assignmentForm.targetName.trim()) {
      toast.error(t('controls.validation.targetRequired'));
      return;
    }
    if (!assignmentForm.issueDate) {
      toast.error(t('controls.validation.issueDateRequired'));
      return;
    }
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      if (assignmentForm.photoFile) {
        photoUrl = await uploadImage(assignmentForm.photoFile, 'controls/');
      }
      const now = new Date().toISOString();
      const computed = autoExpiry();
      const expiryDate = ct.validityMonths ? computed : (assignmentForm.expiryDate || null);

      const customValues: Record<string, string | number> = {};
      (ct.customFields || []).forEach(f => {
        const raw = assignmentForm.customValues[f.key];
        if (raw === undefined || raw === '') return;
        customValues[f.key] = f.type === 'numero' ? Number(raw) : raw;
      });

      const targetUser = isPerson ? activeUsers.find(u => u.id === assignmentForm.targetUserId) : undefined;
      const targetDept = isDepartment ? activeDepartments.find(d => d.id === assignmentForm.targetDeptId) : undefined;
      // Mapeo id del catálogo → targetType. Ids nuevos del catálogo caen a
      // 'equipo' como genérico (los conocidos conservan su tipo específico).
      const targetTypeMap: Record<string, ControlAssignment['targetType']> = {
        personas: 'user',
        departamentos: 'departamento' as ControlAssignment['targetType'],
        equipos: 'equipo',
        vehiculos: 'vehiculo',
        embarcaciones: 'embarcacion',
        ubicaciones: 'ubicacion',
      };

      if (editingAssignment) {
        const history = [
          ...(editingAssignment.history || []),
          buildHistoryEntry('editado'),
        ];
        await updateDoc(doc(db, 'controlAssignments', editingAssignment.id), {
          issueDate: assignmentForm.issueDate,
          expiryDate,
          customValues,
          ...(photoUrl ? { photoUrl } : {}),
          status: editingAssignment.verifiedAt ? 'verificado' : computeStatus({ ...editingAssignment, issueDate: assignmentForm.issueDate, expiryDate } as ControlAssignment, ct),
          history,
          updatedAt: now,
          updatedBy: currentUser.name,
        });
        await logAction({
          action: AUDIT_ACTIONS.assignmentUpdated,
          targetType: 'control_assignment',
          targetId: editingAssignment.id,
          targetName: `${ct.name} · ${editingAssignment.targetName}`,
          impactLevel: 'major',
          description: `Control asignado actualizado: ${ct.name} (${editingAssignment.targetName})`,
        });
        toast.success(t('controls.common.save'));
      } else {
        const targetType = targetTypeMap[appliesToSel] || ('equipo' as ControlAssignment['targetType']);
        const newAssignment: Omit<ControlAssignment, 'id'> = {
          tenantId,
          isActive: true,
          createdAt: now,
          createdBy: currentUser.name,
          controlTypeId: ct.id,
          controlTypeName: ct.name,
          targetType,
          targetId: isPerson ? assignmentForm.targetUserId : isDepartment ? (targetDept?.id || '') : assignmentForm.targetName.trim(),
          targetName: isPerson ? (targetUser?.name || '') : isDepartment ? (targetDept?.name || '') : assignmentForm.targetName.trim(),
          targetDepartmentId: isDepartment ? (targetDept?.id || '') : targetUser?.department,
          issueDate: assignmentForm.issueDate,
          expiryDate,
          customValues,
          ...(photoUrl ? { photoUrl } : {}),
          status: 'vigente',
          history: [buildHistoryEntry('creado', `Emisión: ${assignmentForm.issueDate}`)],
        };
        newAssignment.status = computeStatus(newAssignment as ControlAssignment, ct);
        const docRef = await addDoc(collection(db, 'controlAssignments'), newAssignment);
        await logAction({
          action: AUDIT_ACTIONS.assignmentCreated,
          targetType: 'control_assignment',
          targetId: docRef.id,
          targetName: `${ct.name} · ${newAssignment.targetName}`,
          impactLevel: 'major',
          description: `Control asignado creado: ${ct.name} → ${newAssignment.targetName}`,
        });
        toast.success(t('controls.common.create'));
      }
      setAssignmentModalOpen(false);
      setEditingAssignment(null);
      setAssignmentForm({ ...EMPTY_ASSIGNMENT_FORM, issueDate: todayInputValue() });
    } catch (err: any) {
      toast.error(`${t('controls.error.save')}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!currentUser || !verifyTarget) return;
    setVerifying(true);
    try {
      const now = new Date().toISOString();
      const historyEntry = buildHistoryEntry('verificado', `Verificado por ${currentUser.name}`);
      await updateDoc(doc(db, 'controlAssignments', verifyTarget.id), {
        verifiedBy: currentUser.id,
        verifiedByName: currentUser.name,
        verifiedAt: now,
        status: 'verificado',
        history: [...(verifyTarget.history || []), historyEntry],
        updatedAt: now,
        updatedBy: currentUser.name,
      });
      await logAction({
        action: AUDIT_ACTIONS.assignmentVerified,
        targetType: 'control_assignment',
        targetId: verifyTarget.id,
        targetName: `${verifyTarget.controlTypeName} · ${verifyTarget.targetName}`,
        impactLevel: 'sensitive',
        description: `Control verificado: ${verifyTarget.controlTypeName} (${verifyTarget.targetName})`,
        confirmationMethod: 'simple',
      });
      toast.success(t('controls.status.verificado'));
      setVerifyTarget(null);
    } catch (err: any) {
      toast.error(`${t('controls.error.save')}: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleToggleAssignmentActive = async (a: ControlAssignment) => {
    if (!currentUser || !canWrite) return;
    try {
      const historyEntry = buildHistoryEntry(a.isActive ? 'desactivado' : 'editado', a.isActive ? 'Control desactivado' : 'Control reactivado');
      await updateDoc(doc(db, 'controlAssignments', a.id), {
        isActive: !a.isActive,
        history: [...(a.history || []), historyEntry],
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.name,
      });
      await logAction({
        action: AUDIT_ACTIONS.assignmentDeactivated,
        targetType: 'control_assignment',
        targetId: a.id,
        targetName: `${a.controlTypeName} · ${a.targetName}`,
        impactLevel: 'major',
        description: a.isActive
          ? `Control desactivado: ${a.controlTypeName} (${a.targetName})`
          : `Control reactivado: ${a.controlTypeName} (${a.targetName})`,
      });
    } catch (err: any) {
      toast.error(`${t('controls.error.save')}: ${err.message}`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // FILTRADO DE ASIGNACIONES
  // ═══════════════════════════════════════════════════════════════════

  const filteredAssignments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return activeAssignments.filter(a => {
      const type = typeOf(a);
      const status = computeStatus(a, type);
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (term) {
        const haystack = `${a.controlTypeName || ''} ${a.targetName || ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [activeAssignments, search, statusFilter, controlTypes]);

  if (loading) return <div className="p-8 text-center text-[#86868B]">{t('controls.loading')}</div>;

  const statusBadge = (status: ControlAssignmentStatus) => {
    const style = STATUS_STYLE[status];
    const Icon = style.icon;
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', style.bg, style.text)}>
        <Icon className="w-3 h-3" />
        {t(`controls.status.${status}`)}
      </span>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5">
      {/* Sub-pestañas internas (pills) + aviso de solo lectura */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center bg-white rounded-2xl p-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)] w-fit">
          <button
            onClick={() => setTab('types')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              tab === 'types' ? 'bg-corporate text-white shadow-sm' : 'text-[#86868B] hover:text-[#1D1D1F]'
            )}
          >
            <Layers className="w-4 h-4" />
            {t('controls.tab.types')}
          </button>
          <button
            onClick={() => setTab('assignments')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              tab === 'assignments' ? 'bg-corporate text-white shadow-sm' : 'text-[#86868B] hover:text-[#1D1D1F]'
            )}
          >
            <ClipboardList className="w-4 h-4" />
            {t('controls.tab.assignments')}
          </button>
        </div>
        {!canWrite && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {t('controls.readOnly')}
          </div>
        )}
      </div>

      {/* ═══════════ PESTAÑA: TIPOS DE CONTROL ═══════════ */}
      {tab === 'types' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div>
              <h2 className="text-lg font-semibold text-[#1D1D1F]">{t('controls.types.title')}</h2>
              <p className="text-sm text-[#86868B]">
                {activeTypes.length} · {t('controls.types.subtitle')}
              </p>
            </div>
            {canWrite && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleLoadInitialCatalog}
                  disabled={saving}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <FileCheck2 className="w-4 h-4" />
                  {t('controls.types.loadSeeds')}
                </Button>
                <Button onClick={openCreateType} className="bg-corporate hover:bg-corporate/90 flex items-center gap-2 whitespace-nowrap">
                  <Plus className="w-4 h-4" />
                  {t('controls.types.new')}
                </Button>
              </div>
            )}
          </div>

          {/* Catálogo dinámico "Aplica a" (controlTargetTypes) */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#1D1D1F]">{t('controls.targets.title')}</h3>
                <p className="text-xs text-[#86868B] mt-0.5 max-w-2xl">{t('controls.targets.subtitle')}</p>
              </div>
            </div>
            {targetTypes.length === 0 ? (
              <p className="text-xs text-[#86868B] mt-3">{t('controls.targets.empty')}</p>
            ) : (
              <div className="space-y-2 mt-3">
                {targetTypes.map(tt => editingTargetId === tt.id ? (
                  <div key={tt.id} className="flex items-center gap-2 bg-[#F5F5F7] rounded-xl p-2">
                    <Input
                      value={editingTargetName}
                      onChange={e => setEditingTargetName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameTarget(); }}
                      className="h-8 w-40"
                      autoFocus
                    />
                    <button
                      onClick={handleRenameTarget}
                      disabled={savingTargets}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
                      title={t('controls.common.save')}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setEditingTargetId(null); setEditingTargetName(''); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[#86868B] hover:text-red-500"
                      title={t('controls.common.cancel')}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    key={tt.id}
                    className={cn(
                      'bg-white rounded-xl border p-3 transition-shadow',
                      tt.isActive ? 'border-[#E5E5E7]' : 'border-[#F5F5F7] opacity-70',
                      expandedIds.has(tt.id) && 'shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                    )}
                  >
                    <div
                      className="flex items-center justify-between gap-2 cursor-pointer"
                      onClick={() => toggleExpanded(tt.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          tt.isActive ? 'bg-[#F5F5F7] text-[#1D1D1F]' : 'bg-[#F5F5F7] text-[#86868B]'
                        )}>
                          {tt.name}
                        </span>
                        <span className="text-[11px] text-[#86868B]">
                          {tt.isActive ? t('controls.common.active') : t('controls.common.inactive')}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {canWrite && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); setEditingTargetId(tt.id); setEditingTargetName(tt.name); }}
                              title={t('controls.type.modalEdit')}
                              className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleToggleTargetActive(tt); }}
                              title={tt.isActive ? t('controls.type.deactivate') : t('controls.type.activate')}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-[#86868B] hover:text-red-500"
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {expandedIds.has(tt.id)
                          ? <ChevronUp className="w-4 h-4 text-[#86868B]" />
                          : <ChevronDown className="w-4 h-4 text-[#86868B]" />}
                      </div>
                    </div>
                    {expandedIds.has(tt.id) && (
                      <div className="mt-3 pt-3 border-t border-[#F5F5F7] space-y-1.5">
                        <DetailRow label={t('controls.detail.id')} value={tt.id} />
                        <DetailRow label={t('controls.type.name')} value={tt.name} />
                        <DetailRow label={t('controls.detail.nameEn')} value={tt.nameEn} />
                        <DetailRow label={t('controls.detail.icon')} value={tt.icon} />
                        <DetailRow
                          label={t('controls.detail.state')}
                          value={tt.isActive ? t('controls.common.active') : t('controls.common.inactive')}
                        />
                        <DetailRow
                          label={t('controls.detail.created')}
                          value={`${tt.createdBy || '—'} · ${new Date(tt.createdAt).toLocaleString()}`}
                        />
                        <DetailRow
                          label={t('controls.detail.updated')}
                          value={tt.updatedAt ? `${tt.updatedBy || '—'} · ${new Date(tt.updatedAt).toLocaleString()}` : undefined}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canWrite && (
              <div className="flex items-center gap-2 mt-3">
                <Input
                  value={newTargetName}
                  onChange={e => setNewTargetName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateTarget(); }}
                  placeholder={t('controls.targets.newPlaceholder')}
                  className="h-9 sm:w-64"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCreateTarget}
                  disabled={savingTargets || !newTargetName.trim()}
                  className="flex items-center gap-1 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('controls.targets.add')}
                </Button>
              </div>
            )}
          </div>

          {activeTypes.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-[#86868B] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <Layers className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm font-medium text-[#1D1D1F]">{t('controls.types.empty')}</p>
              <p className="text-xs mt-1">{t('controls.types.emptyHint')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
              {activeTypes.map(ct => (
                <div key={ct.id} className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  <div
                    className="flex items-start justify-between gap-2 cursor-pointer"
                    onClick={() => toggleExpanded(ct.id)}
                  >
                    <div className="min-w-0">
                      <h3 className="font-medium text-[#1D1D1F] truncate">{ct.name}</h3>
                      {ct.description && (
                        <p className="text-xs text-[#86868B] mt-1 line-clamp-2">{ct.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {canWrite && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); openEditType(ct); }}
                            title={t('controls.type.modalEdit')}
                            className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleToggleTypeActive(ct); }}
                            title={t('controls.type.deactivate')}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-[#86868B] hover:text-red-500"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {expandedIds.has(ct.id)
                        ? <ChevronUp className="w-4 h-4 text-[#86868B]" />
                        : <ChevronDown className="w-4 h-4 text-[#86868B]" />}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {ct.appliesTo.map(opt => (
                      <span key={opt} className="px-2 py-0.5 rounded-full bg-[#F5F5F7] text-xs text-[#1D1D1F]">
                        {targetTypeName(opt)}
                      </span>
                    ))}
                    {(ct.positionIds || []).map(pid => (
                      <span key={pid} className="px-2 py-0.5 rounded-full bg-corporate/10 text-xs text-corporate">
                        {positionName(pid)}
                      </span>
                    ))}
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      ct.isRequired ? 'bg-red-50 text-red-600' : 'bg-[#F5F5F7] text-[#86868B]'
                    )}>
                      {ct.isRequired ? t('controls.type.required') : t('controls.type.optional')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-[#F5F5F7] text-xs text-[#86868B]">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {ct.validityMonths != null
                        ? `${ct.validityMonths} ${t('controls.type.validityMonthsShort')}`
                        : t('controls.type.validityForever')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {ct.alertDaysBefore} {t('controls.type.alertDays')}
                    </span>
                    {(ct.customFields || []).length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <ClipboardList className="w-3.5 h-3.5" />
                        {ct.customFields.length} {t('controls.type.customFieldsCount')}
                      </span>
                    )}
                  </div>

                  {/* Detalle expandible: todos los campos del tipo */}
                  {expandedIds.has(ct.id) && (
                    <div className="mt-3 pt-3 border-t border-[#F5F5F7] space-y-1.5">
                      <DetailRow label={t('controls.type.name')} value={ct.name} />
                      <DetailRow label={t('controls.detail.nameEn')} value={ct.nameEn} />
                      <DetailRow label={t('controls.type.description')} value={ct.description} />
                      <DetailRow
                        label={t('controls.type.appliesTo')}
                        value={ct.appliesTo.map(targetTypeName).join(', ')}
                      />
                      {ct.appliesTo.map(targetId => {
                        const values = (ct.targetSelections || {})[targetId] || [];
                        if (values.length === 0) return null;
                        return (
                          <DetailRow
                            key={targetId}
                            label={`${t('controls.detail.targetSelections')} · ${targetTypeName(targetId)}`}
                            value={resolveSelectionNames(targetId, values).join(', ')}
                          />
                        );
                      })}
                      <DetailRow
                        label={t('controls.detail.roles')}
                        value={ct.roleIds.length > 0 ? ct.roleIds.map(roleName).join(', ') : undefined}
                      />
                      <DetailRow
                        label={t('controls.detail.positions')}
                        value={(ct.positionIds || []).length > 0 ? (ct.positionIds || []).map(positionName).join(', ') : undefined}
                      />
                      <DetailRow
                        label={t('controls.type.validityMonths')}
                        value={ct.validityMonths != null ? `${ct.validityMonths}` : t('controls.type.validityForever')}
                      />
                      <DetailRow label={t('controls.type.alertDaysBefore')} value={String(ct.alertDaysBefore)} />
                      <DetailRow
                        label={t('controls.type.isRequired')}
                        value={ct.isRequired ? t('controls.type.required') : t('controls.type.optional')}
                      />
                      <DetailRow label={t('controls.detail.verifierRole')} value={ct.verifierRole} />
                      <DetailRow
                        label={t('controls.type.customFields')}
                        value={
                          (ct.customFields || []).length > 0
                            ? ct.customFields.map(f =>
                                `${f.label} (${t(`controls.type.fieldType.${f.type}`)}${f.options?.length ? `: ${f.options.join(', ')}` : ''})`
                              ).join(' · ')
                            : undefined
                        }
                      />
                      <DetailRow
                        label={t('controls.detail.created')}
                        value={`${ct.createdBy || '—'} · ${new Date(ct.createdAt).toLocaleString()}`}
                      />
                      <DetailRow
                        label={t('controls.detail.updated')}
                        value={ct.updatedAt ? `${ct.updatedBy || '—'} · ${new Date(ct.updatedAt).toLocaleString()}` : undefined}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════ PESTAÑA: CONTROLES ASIGNADOS ═══════════ */}
      {tab === 'assignments' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div>
              <h2 className="text-lg font-semibold text-[#1D1D1F]">{t('controls.assignments.title')}</h2>
              <p className="text-sm text-[#86868B]">{filteredAssignments.length} / {activeAssignments.length}</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('controls.assignments.search')}
                  className="pl-9 h-10 rounded-xl bg-[#F5F5F7] border-[#E5E5E7]"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'all' | ControlAssignmentStatus)}
                className="h-10 rounded-xl border border-[#E5E5E7] bg-[#F5F5F7] px-3 text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-corporate/20"
              >
                <option value="all">{t('controls.assignments.filterAll')}</option>
                <option value="vigente">{t('controls.assignments.filterVigente')}</option>
                <option value="por_vencer">{t('controls.assignments.filterPorVencer')}</option>
                <option value="vencido">{t('controls.assignments.filterVencido')}</option>
                <option value="verificado">{t('controls.assignments.filterVerificado')}</option>
              </select>
              {canWrite && (
                <Button
                  variant="outline"
                  onClick={handleCheckNow}
                  disabled={checkingNow}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <RefreshCw className={cn('w-4 h-4', checkingNow && 'animate-spin')} />
                  {t('controls.assignments.checkNow')}
                </Button>
              )}
              {canWrite && (
                <Button onClick={openCreateAssignment} className="bg-corporate hover:bg-corporate/90 flex items-center gap-2 whitespace-nowrap">
                  <Plus className="w-4 h-4" />
                  {t('controls.assignments.new')}
                </Button>
              )}
            </div>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-[#86868B] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <ClipboardList className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">{t('controls.assignments.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map(a => {
                const type = typeOf(a);
                const status = computeStatus(a, type);
                const isExpanded = expandedIds.has(a.id);
                return (
                  <div key={a.id} className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => toggleExpanded(a.id)}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-[#1D1D1F]">{a.controlTypeName || type?.name || '—'}</h3>
                          {statusBadge(status)}
                        </div>
                        <p className="text-sm text-[#86868B] mt-0.5">{a.targetName}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-[#86868B]">
                          <span>{t('controls.assignment.issueDateShort')}: {a.issueDate || '—'}</span>
                          {a.expiryDate && (
                            <span className={cn(status === 'vencido' && 'text-red-600 font-medium')}>
                              {t('controls.assignment.expiryDateShort')}: {a.expiryDate}
                            </span>
                          )}
                          {a.verifiedByName && (
                            <span className="inline-flex items-center gap-1 text-blue-600">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              {t('controls.assignment.verifiedBy')}: {a.verifiedByName}
                            </span>
                          )}
                        </div>
                        {(a.customValues && Object.keys(a.customValues).length > 0) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(type?.customFields || []).map(f => (
                              a.customValues[f.key] !== undefined && (
                                <span key={f.key} className="px-2 py-0.5 rounded-lg bg-[#F5F5F7] text-xs text-[#1D1D1F]">
                                  {f.label}: {String(a.customValues[f.key])}
                                </span>
                              )
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {a.photoUrl && (
                          <a
                            href={a.photoUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]"
                          >
                            <ImagePlus className="w-4 h-4" />
                          </a>
                        )}
                        {canWrite && status !== 'verificado' && canVerify(a) && (
                          <button
                            onClick={e => { e.stopPropagation(); setVerifyTarget(a); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {t('controls.assignment.verify')}
                          </button>
                        )}
                        {canWrite && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); openEditAssignment(a); }}
                              title={t('controls.assignment.modalEdit')}
                              className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleToggleAssignmentActive(a); }}
                              title={a.isActive ? t('controls.type.deactivate') : t('controls.type.activate')}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-[#86868B] hover:text-red-500"
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-[#86868B]" />
                          : <ChevronDown className="w-4 h-4 text-[#86868B]" />}
                      </div>
                    </div>

                    {/* Detalle expandible: todos los campos + historial completo */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-[#F5F5F7] space-y-4">
                        <div className="space-y-1.5">
                          <DetailRow label={t('controls.assignment.controlType')} value={a.controlTypeName || type?.name} />
                          <DetailRow
                            label={t('controls.detail.targetType')}
                            value={t(ASSIGN_TARGET_I18N[a.targetType] || 'controls.assignment.targetName.generic')}
                          />
                          <DetailRow label={t('controls.assignment.targetUser')} value={a.targetName} />
                          <DetailRow label={t('controls.assignment.issueDate')} value={a.issueDate} />
                          <DetailRow
                            label={t('controls.assignment.expiryDate')}
                            value={a.expiryDate || t('controls.type.validityForever')}
                          />
                          <DetailRow
                            label={t('controls.type.customFields')}
                            value={
                              Object.keys(a.customValues || {}).length > 0
                                ? Object.entries(a.customValues).map(([k, v]) => {
                                    const f = type?.customFields.find(cf => cf.key === k);
                                    return `${f?.label || k}: ${String(v)}`;
                                  }).join(' · ')
                                : undefined
                            }
                          />
                          <DetailRow
                            label={t('controls.assignment.photo')}
                            value={
                              a.photoUrl ? (
                                <a
                                  href={a.photoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-block mt-1"
                                >
                                  <img
                                    src={a.photoUrl}
                                    alt={a.controlTypeName || ''}
                                    className="h-24 rounded-xl border border-[#E5E5E7] object-cover"
                                  />
                                </a>
                              ) : undefined
                            }
                          />
                          <DetailRow
                            label={t('controls.assignment.verifiedBy')}
                            value={
                              a.verifiedByName
                                ? `${a.verifiedByName}${a.verifiedAt ? ` · ${new Date(a.verifiedAt).toLocaleString()}` : ''}`
                                : undefined
                            }
                          />
                          <DetailRow label={t('controls.detail.lastAlert')} value={a.lastAlertAt ? new Date(a.lastAlertAt).toLocaleString() : undefined} />
                          <DetailRow label={t('controls.assignment.filterStatus')} value={t(`controls.status.${status}`)} />
                          <DetailRow
                            label={t('controls.detail.created')}
                            value={`${a.createdBy || '—'} · ${new Date(a.createdAt).toLocaleString()}`}
                          />
                          <DetailRow
                            label={t('controls.detail.updated')}
                            value={a.updatedAt ? `${a.updatedBy || '—'} · ${new Date(a.updatedAt).toLocaleString()}` : undefined}
                          />
                        </div>

                        <div>
                          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-2">
                            {t('controls.assignment.history')}
                          </h4>
                          {(a.history || []).length === 0 ? (
                            <p className="text-xs text-[#86868B]">{t('controls.assignment.historyEmpty')}</p>
                          ) : (
                            <div className="space-y-1.5">
                              {[...(a.history || [])].reverse().map((h, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-[#F5F5F7] text-[#1D1D1F] font-medium">
                                    {t(`controls.history.${h.action}`)}
                                  </span>
                                  <span className="text-[#86868B]">
                                    {h.byName} · {new Date(h.at).toLocaleString()}
                                    {h.note && <span className="text-[#1D1D1F]"> — {h.note}</span>}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════ MODAL: CREAR/EDITAR TIPO DE CONTROL ═══════════ */}
      <Dialog open={typeModalOpen} onOpenChange={setTypeModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingType ? t('controls.type.modalEdit') : t('controls.type.modalNew')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('controls.type.name')} *</Label>
                <Input
                  value={typeForm.name}
                  onChange={e => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder={t('controls.type.namePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('controls.type.nameEn')}</Label>
                <Input
                  value={typeForm.nameEn}
                  onChange={e => setTypeForm({ ...typeForm, nameEn: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('controls.type.description')}</Label>
              <Input
                value={typeForm.description}
                onChange={e => setTypeForm({ ...typeForm, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('controls.type.appliesTo')} *</Label>
              <div className="flex flex-wrap gap-1.5">
                {/* Tres pestañas acumulables e independientes: PERSONAS | ROLES | DEPARTAMENTOS.
                    PERSONAS/DEPARTAMENTOS viven en appliesTo; al apagarse conservan su
                    targetSelections. ROLES es solo bandera de UI (rolesTabVisible). */}
                <button
                  type="button"
                  onClick={() => toggleAppliesTo('personas')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    typeForm.appliesTo.includes('personas')
                      ? 'bg-corporate text-white border-corporate'
                      : 'bg-white text-[#86868B] border-[#E5E5E7] hover:text-[#1D1D1F]'
                  )}
                >
                  {t('controls.applies.personas')}
                </button>
                <button
                  type="button"
                  onClick={() => setTypeForm(prev => ({ ...prev, rolesTabVisible: !prev.rolesTabVisible }))}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    typeForm.rolesTabVisible
                      ? 'bg-corporate text-white border-corporate'
                      : 'bg-white text-[#86868B] border-[#E5E5E7] hover:text-[#1D1D1F]'
                  )}
                >
                  {t('controls.detail.roles')}
                </button>
                <button
                  type="button"
                  onClick={() => toggleAppliesTo('departamentos')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    typeForm.appliesTo.includes('departamentos')
                      ? 'bg-corporate text-white border-corporate'
                      : 'bg-white text-[#86868B] border-[#E5E5E7] hover:text-[#1D1D1F]'
                  )}
                >
                  {t('controls.applies.departamentos')}
                </button>
                {activeTargetTypes
                  .filter(tt => {
                    const key = tt.id.trim().toLowerCase();
                    const name = tt.name.trim().toLowerCase();
                    // Excluir los chips fijos por id Y por nombre (el usuario pudo
                    // crear entradas del catálogo duplicadas con id autogenerado).
                    return !['personas', 'departamentos', 'roles'].some(
                      fixed => key === fixed || name === fixed
                    );
                  })
                  .map(tt => (
                  <button
                    key={tt.id}
                    type="button"
                    onClick={() => toggleAppliesTo(tt.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      typeForm.appliesTo.includes(tt.id)
                        ? 'bg-corporate text-white border-corporate'
                        : 'bg-white text-[#86868B] border-[#E5E5E7] hover:text-[#1D1D1F]'
                    )}
                  >
                    {tt.name}
                  </button>
                ))}
                {/* Compatibilidad: ids legacy que ya no están en el catálogo */}
                {typeForm.appliesTo
                  .filter(id => !activeTargetTypes.some(tt => tt.id === id))
                  .map(id => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleAppliesTo(id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        'bg-corporate text-white border-corporate'
                      )}
                    >
                      {targetTypeName(id)}
                    </button>
                  ))}
              </div>
              <p className="text-[11px] text-[#86868B]">{t('controls.type.scopeTabsHint')}</p>
            </div>

            {/* Selectores dependientes del destino: un bloque por cada chip activo
                en "Aplica a". Al quitar un chip su bloque desaparece, pero sus
                valores se conservan en targetSelections del estado del formulario. */}
            {typeForm.appliesTo.map(targetId => {
              const selected = typeForm.targetSelections[targetId] || [];
              const blockCls = 'space-y-2 rounded-xl border border-[#E5E5E7] p-3';
              const chipCls = (on: boolean) => cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                on
                  ? 'bg-corporate text-white border-corporate'
                  : 'bg-white text-[#86868B] border-[#E5E5E7] hover:text-[#1D1D1F]'
              );
              if (targetId === 'personas') {
                return (
                  <div key={targetId} className={blockCls}>
                    <Label>{t('controls.type.targetSelection')}: {targetTypeName(targetId)}</Label>
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-[#F5F5F7] divide-y divide-[#F5F5F7]">
                      {usersByDepartment.map(([dept, deptUsers]) => (
                        <div key={dept || 'none'} className="p-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] px-1 mb-1.5">
                            {dept || t('controls.type.noDepartment')}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {deptUsers.map(u => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => toggleTargetSelectionValue(targetId, u.id)}
                                className={chipCls(selected.includes(u.id))}
                              >
                                {u.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      {activeUsers.length === 0 && (
                        <p className="text-xs text-[#86868B] p-3">{t('controls.type.noSelection')}</p>
                      )}
                    </div>
                  </div>
                );
              }
              if (targetId === 'departamentos' || targetId === 'ubicaciones') {
                const options = targetId === 'departamentos' ? activeDepartments : activeLocations;
                const labelKey = targetId === 'departamentos'
                  ? 'controls.type.selectDepartments'
                  : 'controls.type.selectLocations';
                return (
                  <div key={targetId} className={blockCls}>
                    <Label>{t(labelKey)}</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {options.map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleTargetSelectionValue(targetId, opt.id)}
                          className={chipCls(selected.includes(opt.id))}
                        >
                          {opt.name}
                        </button>
                      ))}
                      {options.length === 0 && (
                        <span className="text-xs text-[#86868B]">{t('controls.type.noSelection')}</span>
                      )}
                    </div>
                  </div>
                );
              }
              // Cualquier otro destino del catálogo sin catálogo propio: nombres con chips
              return (
                <div key={targetId} className={blockCls}>
                  <Label>{t('controls.type.targetSelection')}: {targetTypeName(targetId)}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={targetNameInputs[targetId] || ''}
                      onChange={e => setTargetNameInputs(prev => ({ ...prev, [targetId]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTargetName(targetId); } }}
                      placeholder={t('controls.type.nameInputPlaceholder')}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addTargetName(targetId)}
                      disabled={!(targetNameInputs[targetId] || '').trim()}
                      className="flex items-center gap-1 whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t('controls.type.addName')}
                    </Button>
                  </div>
                  {selected.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selected.map(name => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => removeTargetName(targetId, name)}
                          title={t('controls.common.cancel')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-corporate/10 text-corporate text-xs font-medium border border-corporate/20 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                        >
                          {name}
                          <XCircle className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bloque de la pestaña ROLES: multi-select de roleIds (se guarda igual en
                roleIds). Puede estar visible aunque roleIds esté vacío. */}
            {typeForm.rolesTabVisible && (
              <div className="space-y-2 rounded-xl border border-[#E5E5E7] p-3">
                <Label>{t('controls.type.roles')}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {roleTemplates.length === 0 ? (
                    <span className="text-xs text-[#86868B]">—</span>
                  ) : roleTemplates.map(rt => (
                    <button
                      key={rt.id}
                      type="button"
                      onClick={() => toggleRoleId(rt.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        typeForm.roleIds.includes(rt.id)
                          ? 'bg-corporate text-white border-corporate'
                          : 'bg-white text-[#86868B] border-[#E5E5E7] hover:text-[#1D1D1F]'
                      )}
                    >
                      {rt.name}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#86868B]">{t('controls.type.rolesHint')}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('controls.type.positions')}</Label>
              <div className="flex flex-wrap gap-1.5">
                {positions.length === 0 ? (
                  <span className="text-xs text-[#86868B]">—</span>
                ) : positions.map(pos => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => togglePositionId(pos.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      typeForm.positionIds.includes(pos.id)
                        ? 'bg-corporate text-white border-corporate'
                        : 'bg-white text-[#86868B] border-[#E5E5E7] hover:text-[#1D1D1F]'
                    )}
                  >
                    {pos.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('controls.type.validityMonths')}</Label>
                <Input
                  type="number"
                  min="0"
                  value={typeForm.validityMonths}
                  onChange={e => setTypeForm({ ...typeForm, validityMonths: e.target.value })}
                  placeholder="—"
                />
                <p className="text-[11px] text-[#86868B]">{t('controls.type.validityHint')}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('controls.type.alertDaysBefore')}</Label>
                <Input
                  type="number"
                  min="0"
                  value={typeForm.alertDaysBefore}
                  onChange={e => setTypeForm({ ...typeForm, alertDaysBefore: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('controls.type.verifierRole')}</Label>
                <select
                  value={typeForm.verifierRole}
                  onChange={e => setTypeForm({ ...typeForm, verifierRole: e.target.value })}
                  className="w-full h-10 rounded-lg border border-[#E5E5E7] px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-corporate/20"
                >
                  <option value="RRHH">RRHH</option>
                  <option value={Role.DIRECTOR_GENERAL}>{Role.DIRECTOR_GENERAL.replace(/_/g, ' ')}</option>
                  {roleTemplates.map(rt => (
                    <option key={rt.id} value={rt.id}>{rt.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('controls.type.isRequired')}</Label>
                <button
                  type="button"
                  onClick={() => setTypeForm({ ...typeForm, isRequired: !typeForm.isRequired })}
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors relative',
                    typeForm.isRequired ? 'bg-corporate' : 'bg-[#E5E5E7]'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
                    typeForm.isRequired ? 'left-[22px]' : 'left-0.5'
                  )} />
                </button>
              </div>
              <p className="text-[11px] text-[#86868B]">
                {typeForm.isRequired ? t('controls.type.isRequired') : t('controls.type.isOptional')}
              </p>
            </div>

            {/* Editor de campos personalizados */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('controls.type.customFields')}</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setTypeForm({
                    ...typeForm,
                    customFields: [...typeForm.customFields, { key: '', label: '', type: 'texto', options: '' }],
                  })}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('controls.type.addField')}
                </Button>
              </div>
              {typeForm.customFields.length === 0 ? (
                <p className="text-xs text-[#86868B] bg-[#F5F5F7] rounded-lg p-3">{t('controls.type.noCustomFields')}</p>
              ) : (
                <div className="space-y-2">
                  {typeForm.customFields.map((f, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-[#F5F5F7] rounded-xl p-3">
                      <Input
                        value={f.label}
                        onChange={e => updateCustomField(i, { label: e.target.value })}
                        placeholder={t('controls.type.fieldLabel')}
                        className="bg-white flex-1"
                      />
                      <select
                        value={f.type}
                        onChange={e => updateCustomField(i, { type: e.target.value as ControlFieldType })}
                        className="h-10 rounded-lg border border-[#E5E5E7] px-3 text-sm bg-white focus:outline-none"
                      >
                        <option value="texto">{t('controls.type.fieldType.texto')}</option>
                        <option value="fecha">{t('controls.type.fieldType.fecha')}</option>
                        <option value="numero">{t('controls.type.fieldType.numero')}</option>
                        <option value="seleccion">{t('controls.type.fieldType.seleccion')}</option>
                      </select>
                      {f.type === 'seleccion' && (
                        <Input
                          value={f.options}
                          onChange={e => updateCustomField(i, { options: e.target.value })}
                          placeholder={t('controls.type.fieldOptions')}
                          className="bg-white sm:w-56"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setTypeForm({ ...typeForm, customFields: typeForm.customFields.filter((_, idx) => idx !== i) })}
                        className="p-2 rounded-lg hover:bg-red-50 text-[#86868B] hover:text-red-500 shrink-0"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleSaveType} disabled={saving} className="flex-1 bg-corporate hover:bg-corporate/90">
                {editingType ? t('controls.common.save') : t('controls.common.create')}
              </Button>
              <Button variant="outline" onClick={() => setTypeModalOpen(false)} className="w-full sm:w-auto">
                {t('controls.common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ MODAL: CREAR/EDITAR ASIGNACIÓN ═══════════ */}
      <Dialog open={assignmentModalOpen} onOpenChange={setAssignmentModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? t('controls.assignment.modalEdit') : t('controls.assignment.modalNew')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('controls.assignment.controlType')} *</Label>
              <select
                value={assignmentForm.controlTypeId}
                onChange={e => handleTypeChange(e.target.value)}
                disabled={!!editingAssignment}
                className="w-full h-10 rounded-lg border border-[#E5E5E7] px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-corporate/20 disabled:opacity-60"
              >
                <option value="">{t('controls.assignment.selectType')}</option>
                {activeTypes.map(ct => (
                  <option key={ct.id} value={ct.id}>{ct.name}</option>
                ))}
              </select>
            </div>

            {selectedAssignType && selectedAssignType.appliesTo.length > 1 && !editingAssignment && (
              <div className="space-y-2">
                <Label>{t('controls.assignment.targetCategory')}</Label>
                <select
                  value={assignmentForm.appliesToSel}
                  onChange={e => setAssignmentForm({ ...assignmentForm, appliesToSel: e.target.value, targetUserId: '', targetDeptId: '', targetName: '' })}
                  className="w-full h-10 rounded-lg border border-[#E5E5E7] px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-corporate/20"
                >
                  <option value="">—</option>
                  {selectedAssignType.appliesTo.map(opt => (
                    <option key={opt} value={opt}>{targetTypeName(opt)}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedAssignType && (selectedAssignType.appliesTo.length === 1 || assignmentForm.appliesToSel) && (
              <>
                {(assignmentForm.appliesToSel || selectedAssignType.appliesTo[0]) === 'personas' ? (
                  <div className="space-y-2">
                    <Label>{t('controls.assignment.targetUser')} *</Label>
                    <select
                      value={assignmentForm.targetUserId}
                      onChange={e => setAssignmentForm({ ...assignmentForm, targetUserId: e.target.value })}
                      disabled={!!editingAssignment}
                      className="w-full h-10 rounded-lg border border-[#E5E5E7] px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-corporate/20 disabled:opacity-60"
                    >
                      <option value="">{t('controls.assignment.selectUser')}</option>
                      {activeUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (assignmentForm.appliesToSel || selectedAssignType.appliesTo[0]) === 'departamentos' ? (
                  <div className="space-y-2">
                    <Label>{t('controls.assignment.targetDepartment')} *</Label>
                    <select
                      value={assignmentForm.targetDeptId}
                      onChange={e => setAssignmentForm({ ...assignmentForm, targetDeptId: e.target.value })}
                      disabled={!!editingAssignment}
                      className="w-full h-10 rounded-lg border border-[#E5E5E7] px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-corporate/20 disabled:opacity-60"
                    >
                      <option value="">{t('controls.assignment.selectDepartment')}</option>
                      {activeDepartments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>
                      {(['equipos', 'vehiculos', 'embarcaciones', 'ubicaciones'] as string[]).includes(assignmentForm.appliesToSel || selectedAssignType.appliesTo[0])
                        ? t(`controls.assignment.targetName.${assignmentForm.appliesToSel || selectedAssignType.appliesTo[0]}`)
                        : t('controls.assignment.targetName.generic')} *
                    </Label>
                    <Input
                      value={assignmentForm.targetName}
                      onChange={e => setAssignmentForm({ ...assignmentForm, targetName: e.target.value })}
                      placeholder={t('controls.assignment.targetNamePlaceholder')}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('controls.assignment.issueDate')} *</Label>
                    <Input
                      type="date"
                      value={assignmentForm.issueDate}
                      onChange={e => setAssignmentForm({ ...assignmentForm, issueDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('controls.assignment.expiryDate')}</Label>
                    {selectedAssignType.validityMonths ? (
                      <>
                        <Input type="date" value={autoExpiry() || ''} disabled className="bg-[#F5F5F7]" />
                        <p className="text-[11px] text-[#86868B]">{t('controls.assignment.expiryAuto')}</p>
                      </>
                    ) : (
                      <>
                        <Input
                          type="date"
                          value={assignmentForm.expiryDate}
                          onChange={e => setAssignmentForm({ ...assignmentForm, expiryDate: e.target.value })}
                        />
                        <p className="text-[11px] text-[#86868B]">{t('controls.type.validityHint')}</p>
                      </>
                    )}
                  </div>
                </div>

                {(selectedAssignType.customFields || []).length > 0 && (
                  <div className="space-y-2">
                    <Label>{t('controls.type.customFields')}</Label>
                    <div className="space-y-2">
                      {selectedAssignType.customFields.map(f => (
                        <div key={f.key} className="space-y-1">
                          <Label className="text-xs text-[#86868B]">{f.label}</Label>
                          {f.type === 'fecha' ? (
                            <Input
                              type="date"
                              value={assignmentForm.customValues[f.key] || ''}
                              onChange={e => setAssignmentForm({ ...assignmentForm, customValues: { ...assignmentForm.customValues, [f.key]: e.target.value } })}
                            />
                          ) : f.type === 'numero' ? (
                            <Input
                              type="number"
                              value={assignmentForm.customValues[f.key] || ''}
                              onChange={e => setAssignmentForm({ ...assignmentForm, customValues: { ...assignmentForm.customValues, [f.key]: e.target.value } })}
                            />
                          ) : f.type === 'seleccion' ? (
                            <select
                              value={assignmentForm.customValues[f.key] || ''}
                              onChange={e => setAssignmentForm({ ...assignmentForm, customValues: { ...assignmentForm.customValues, [f.key]: e.target.value } })}
                              className="w-full h-10 rounded-lg border border-[#E5E5E7] px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-corporate/20"
                            >
                              <option value="">—</option>
                              {(f.options || []).map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={assignmentForm.customValues[f.key] || ''}
                              onChange={e => setAssignmentForm({ ...assignmentForm, customValues: { ...assignmentForm.customValues, [f.key]: e.target.value } })}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{t('controls.assignment.photo')}</Label>
                  <label className="flex items-center gap-2 cursor-pointer bg-[#F5F5F7] hover:bg-[#E5E5E7] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] transition-colors w-fit">
                    <ImagePlus className="w-4 h-4 text-corporate" />
                    {assignmentForm.photoFile ? assignmentForm.photoFile.name : t('controls.assignment.photoSelect')}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => setAssignmentForm({ ...assignmentForm, photoFile: e.target.files?.[0] || null })}
                    />
                  </label>
                </div>
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleSaveAssignment}
                disabled={saving || uploadingPhoto || !selectedAssignType}
                className="flex-1 bg-corporate hover:bg-corporate/90"
              >
                {saving || uploadingPhoto
                  ? '...'
                  : editingAssignment ? t('controls.common.save') : t('controls.common.create')}
              </Button>
              <Button variant="outline" onClick={() => setAssignmentModalOpen(false)} className="w-full sm:w-auto">
                {t('controls.common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ MODAL: CONFIRMAR VERIFICACIÓN ═══════════ */}
      <Dialog open={!!verifyTarget} onOpenChange={open => { if (!open) setVerifyTarget(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('controls.assignment.verifyTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-[#F5F5F7] rounded-xl p-4 text-sm">
              <p className="font-medium text-[#1D1D1F]">{verifyTarget?.controlTypeName}</p>
              <p className="text-[#86868B]">{verifyTarget?.targetName}</p>
              {verifyTarget?.expiryDate && (
                <p className="text-xs text-[#86868B] mt-1">
                  {t('controls.assignment.expiryDateShort')}: {verifyTarget.expiryDate}
                </p>
              )}
            </div>
            <p className="text-sm text-[#1D1D1F]">{t('controls.assignment.verifyConfirm')}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleVerify} disabled={verifying} className="flex-1 bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                {t('controls.assignment.verify')}
              </Button>
              <Button variant="outline" onClick={() => setVerifyTarget(null)} className="w-full sm:w-auto">
                {t('controls.common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
