// ═══════════════════════════════════════════════════════════════════
// TENANT - Resolución del tenant actual (preparación multi-tenancy)
// ═══════════════════════════════════════════════════════════════════
// Hoy existe un único tenant por defecto. Cuando WaveOps pase a
// multi-tenancy real, esta función leerá el tenant desde la
// configuración del dominio/cuenta. Toda colección nueva debe
// guardar tenant_id usando getCurrentTenantId().

export const DEFAULT_TENANT_ID = 'default';

export function getCurrentTenantId(): string {
  return DEFAULT_TENANT_ID;
}
