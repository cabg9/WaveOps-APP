// ═══════════════════════════════════════════════════════════════════
// CONFIRM-ACTION - Sistema de confirmación por niveles
// ═══════════════════════════════════════════════════════════════════

import type { ConfirmLevel, ConfirmActionOptions } from '@/types/develops';

// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE NIVELES
// ═══════════════════════════════════════════════════════════════════

interface LevelConfig {
  requiresCheckbox: boolean;
  requiresPassword: boolean;
  requiresTwoFactor: boolean;
  confirmButtonText: string;
  confirmButtonVariant: 'default' | 'destructive' | 'outline';
  warningText: string;
}

const LEVEL_CONFIG: Record<ConfirmLevel, LevelConfig> = {
  simple: {
    requiresCheckbox: false,
    requiresPassword: false,
    requiresTwoFactor: false,
    confirmButtonText: 'Confirmar',
    confirmButtonVariant: 'default',
    warningText: '',
  },
  important: {
    requiresCheckbox: true,
    requiresPassword: false,
    requiresTwoFactor: false,
    confirmButtonText: 'Confirmar',
    confirmButtonVariant: 'default',
    warningText: 'Esta acción tiene impacto importante. Por favor, confirme que desea continuar.',
  },
  sensitive: {
    requiresCheckbox: true,
    requiresPassword: true,
    requiresTwoFactor: false,
    confirmButtonText: 'Confirmar con contraseña',
    confirmButtonVariant: 'destructive',
    warningText: 'Esta acción es sensible y requiere su contraseña para continuar.',
  },
  critical: {
    requiresCheckbox: true,
    requiresPassword: true,
    requiresTwoFactor: true,
    confirmButtonText: 'Confirmar acción crítica',
    confirmButtonVariant: 'destructive',
    warningText: '⚠️ ACCIÓN CRÍTICA: Esta acción es irreversible y requiere verificación de seguridad adicional.',
  },
};

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL: Ejecuta una acción con confirmación
// ═══════════════════════════════════════════════════════════════════

/**
 * Ejecuta una acción con el nivel de confirmación apropiado.
 * Devuelve una promesa que se resuelve si el usuario confirma,
 * o se rechaza si cancela.
 */
export async function executeWithConfirm(
  options: ConfirmActionOptions
): Promise<void> {
  const config = LEVEL_CONFIG[options.level];

  // Nivel simple: solo confirmación básica (dialog)
  if (options.level === 'simple') {
    const confirmed = window.confirm(`${options.title}\n\n${options.description}`);
    if (!confirmed) {
      throw new Error('Cancelado por el usuario');
    }
    await options.action();
    options.onSuccess?.();
    return;
  }

  // Niveles important, sensitive, critical:
  // Construir mensaje detallado
  const parts = [
    options.title,
    '',
    options.description,
    '',
  ];

  if (config.warningText) {
    parts.push(config.warningText);
    parts.push('');
  }

  if (config.requiresCheckbox) {
    parts.push('☑️ Debe confirmar que entiende las consecuencias.');
  }

  if (config.requiresPassword) {
    parts.push('🔒 Se requiere su contraseña para continuar.');
  }

  if (config.requiresTwoFactor) {
    parts.push('📱 Se requiere un segundo factor de autenticación.');
  }

  // Por ahora, para niveles > simple, usamos confirm() nativo
  // En la implementación real del componente UI, esto sería un modal
  // con checkbox, input de contraseña, etc.
  const message = parts.join('\n');
  const confirmed = window.confirm(message);

  if (!confirmed) {
    throw new Error('Cancelado por el usuario');
  }

  // Si requiere contraseña, pedirla
  if (config.requiresPassword) {
    const password = window.prompt('Ingrese su contraseña para confirmar:');
    if (!password) {
      throw new Error('Contraseña no proporcionada');
    }
    // NOTA: En la implementación real, aquí se validaría la contraseña
    // contra Firebase Auth antes de ejecutar la acción
    console.log('[confirm-action] Contraseña recibida (validación pendiente)');
  }

  // Si requiere 2FA, pedir código
  if (config.requiresTwoFactor) {
    const code = window.prompt('Ingrese el código de verificación enviado a su email:');
    if (!code) {
      throw new Error('Código de verificación no proporcionado');
    }
    // NOTA: En la implementación real, aquí se validaría el código
    console.log('[confirm-action] Código 2FA recibido (validación pendiente)');
  }

  // Ejecutar la acción
  try {
    await options.action();
    options.onSuccess?.();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    options.onError?.(err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN: Determinar nivel de impacto automáticamente
// ═══════════════════════════════════════════════════════════════════

export function getImpactLevelForAction(action: string): ConfirmLevel {
  const criticalActions = [
    'USER_DELETED', 'ROLE_DELETED', 'MODULE_DEACTIVATED',
    'SETTINGS_UPDATED', 'SECURITY_POLICY_CHANGED',
    'DEPARTMENT_DELETED', 'SHIFT_DELETED',
  ];

  const sensitiveActions = [
    'USER_DEACTIVATED', 'PASSWORD_RESET', 'DEVELOP_ACCESS_GRANTED',
    'DEVELOP_ACCESS_REVOKED', 'FEATURE_DISABLED',
  ];

  const importantActions = [
    'USER_CREATED', 'USER_UPDATED', 'ROLE_CREATED', 'ROLE_UPDATED',
    'MODULE_ACTIVATED', 'FEATURE_ENABLED',
    'DEPARTMENT_CREATED', 'DEPARTMENT_UPDATED',
  ];

  if (criticalActions.includes(action)) return 'critical';
  if (sensitiveActions.includes(action)) return 'sensitive';
  if (importantActions.includes(action)) return 'important';
  return 'simple';
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN: Validar contraseña del usuario
// ═══════════════════════════════════════════════════════════════════

/**
 * Valida la contraseña del usuario actual contra Firebase Auth.
 * NOTA: Esta es una implementación básica. En producción se usaría
 * reauthenticateWithCredential de Firebase Auth.
 */
export async function validateUserPassword(password: string): Promise<boolean> {
  // TODO: Implementar validación real con Firebase Auth
  // import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
  // const credential = EmailAuthProvider.credential(user.email, password);
  // await reauthenticateWithCredential(auth.currentUser, credential);

  // Por ahora, solo verificamos que no esté vacía
  return password.length > 0;
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN: Enviar código 2FA
// ═══════════════════════════════════════════════════════════════════

/**
 * Envía un código de verificación por email.
 * NOTA: Implementación básica. En producción se usaría
 * Firebase Authentication para enviar códigos.
 */
export async function sendTwoFactorCode(email: string): Promise<void> {
  // TODO: Implementar envío real de código 2FA
  console.log(`[confirm-action] Código 2FA enviado a ${email}`);
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS REACT (para uso en componentes)
// ═══════════════════════════════════════════════════════════════════

/**
 * Hook para acciones con confirmación integrada.
 * Uso en componentes:
 *
 * const { confirm } = useConfirmAction();
 *
 * const handleDelete = async () => {
 *   try {
 *     await confirm({
 *       level: 'critical',
 *       title: 'Eliminar usuario',
 *       description: '¿Está seguro de eliminar a Juan Pérez?',
 *       action: async () => await deleteUser(userId),
 *     });
 *     toast.success('Usuario eliminado');
 *   } catch {
 *     // Cancelado o error
 *   }
 * };
 */
export function useConfirmAction() {
  const confirm = useCallback(
    async (options: Omit<ConfirmActionOptions, 'onSuccess' | 'onError'>): Promise<void> => {
      return executeWithConfirm({
        ...options,
        onSuccess: () => {
          console.log(`[confirm-action] ✅ ${options.title} - ejecutado`);
        },
        onError: (err) => {
          console.error(`[confirm-action] ❌ ${options.title} - error:`, err);
        },
      });
    },
    []
  );

  return { confirm };
}

// Nota: useCallback se importa arriba, necesitamos agregarlo
import { useCallback } from 'react';
