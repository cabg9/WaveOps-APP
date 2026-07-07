import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/firebase-config';

export type ConfirmLevel = 1 | 2 | 3 | 4;

export interface ConfirmOptions {
  level: ConfirmLevel | string;
  title: string;
  message?: string;
  description?: string;
  actionLabel?: string;
  requirePassword?: boolean;
  action?: () => Promise<any>;
}

export interface ConfirmResult {
  confirmed: boolean;
  password?: string;
}

const LEVEL_CONFIG: Record<number, { color: string; icon: string; name: string }> = {
  1: { color: 'blue',   icon: 'ℹ️', name: 'Informativo' },
  2: { color: 'amber',  icon: '⚠️', name: 'Importante' },
  3: { color: 'orange', icon: '🔒', name: 'Sensible' },
  4: { color: 'red',    icon: '🛡️', name: 'Crítico' },
};

const LEVEL_MAP: Record<string, ConfirmLevel> = {
  'info': 1,
  'informativo': 1,
  'minor': 1,
  'important': 2,
  'importante': 2,
  'moderate': 2,
  'major': 2,
  'sensitive': 3,
  'sensible': 3,
  'critical': 4,
  'critico': 4,
  'crítico': 4,
};

export function getConfirmLevelConfig(level: ConfirmLevel) {
  return LEVEL_CONFIG[level];
}

export function getImpactLevelForAction(action: string): ConfirmLevel {
  const normalized = action.toLowerCase().trim();
  return LEVEL_MAP[normalized] || 2;
}

function resolveLevel(level: ConfirmLevel | string): ConfirmLevel {
  if (typeof level === 'number') return level as ConfirmLevel;
  const mapped = LEVEL_MAP[level.toLowerCase()];
  if (mapped) return mapped;
  console.warn(`[confirm-action] Unknown level "${level}", defaulting to 2`);
  return 2;
}

export async function validateUserPassword(password: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No hay un usuario autenticado');
  }
  try {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    return true;
  } catch (err: any) {
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      throw new Error('Contraseña incorrecta');
    }
    if (err.code === 'auth/too-many-requests') {
      throw new Error('Demasiados intentos. Intente más tarde.');
    }
    throw new Error('Error al validar contraseña: ' + (err.message || 'Error desconocido'));
  }
}

export async function confirmAction(options: ConfirmOptions): Promise<ConfirmResult> {
  const numericLevel = resolveLevel(options.level);
  const config = LEVEL_CONFIG[numericLevel];
  const text = options.message || options.description || '¿Está seguro?';
  
  const message = `[${config.name}] ${options.title}\n\n${text}`;
  const confirmed = window.confirm(message);
  
  if (!confirmed) {
    return { confirmed: false };
  }

  if (numericLevel >= 3) {
    const password = window.prompt(`🔐 ${options.title}\n\nPor seguridad, ingrese su contraseña para continuar:`);
    if (!password) {
      return { confirmed: false };
    }
    return { confirmed: true, password };
  }

  return { confirmed: true };
}

export async function executeWithConfirm<T>(
  options: ConfirmOptions & { action?: () => Promise<T> },
  legacyAction?: () => Promise<T>
): Promise<T | null> {
  const result = await confirmAction(options);
  
  if (!result.confirmed) {
    return null;
  }

  if (result.password) {
    try {
      const valid = await validateUserPassword(result.password);
      if (!valid) {
        window.alert('❌ Contraseña incorrecta. La acción ha sido cancelada.');
        return null;
      }
      console.log('[confirm-action] Contraseña validada correctamente');
    } catch (err: any) {
      console.error('[confirm-action] Error validando contraseña:', err);
      window.alert(`❌ ${err.message || 'Contraseña incorrecta'}. La acción ha sido cancelada.`);
      return null;
    }
  }

  const actionFn = options.action || legacyAction;
  if (!actionFn) {
    throw new Error('executeWithConfirm requiere una función action');
  }
  return actionFn();
}

export function useConfirmAction() {
  const confirm = async (options: ConfirmOptions): Promise<ConfirmResult> => {
    return confirmAction(options);
  };

  const execute = async <T>(options: ConfirmOptions, action?: () => Promise<T>): Promise<T | null> => {
    return executeWithConfirm(options, action);
  };

  const validatePassword = async (password: string): Promise<boolean> => {
    return validateUserPassword(password);
  };

  return { confirm, execute, validatePassword };
}

export default {
  confirmAction,
  executeWithConfirm,
  validateUserPassword,
  useConfirmAction,
  getConfirmLevelConfig,
  getImpactLevelForAction,
};
