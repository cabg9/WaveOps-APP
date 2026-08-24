// ═══════════════════════════════════════════════════════════════════
// PALETA CORPORATIVA - WAVEOPS
// ═══════════════════════════════════════════════════════════════════

export interface ColorOption {
  value: string;
  label: string;
}

export const CORPORATE_COLORS: ColorOption[] = [
  { value: '#007AFF', label: 'Azul WaveOps' },
  { value: '#5856D6', label: 'Indigo' },
  { value: '#34C759', label: 'Verde' },
  { value: '#FF9500', label: 'Naranja' },
  { value: '#FF3B30', label: 'Rojo' },
  { value: '#5AC8FA', label: 'Celeste' },
  { value: '#AF52DE', label: 'Morado' },
  { value: '#FFCC00', label: 'Amarillo' },
  { value: '#8E8E93', label: 'Gris' },
  { value: '#1C1C1E', label: 'Negro' },
];

export function getColorLabel(hex: string): string {
  const found = CORPORATE_COLORS.find((c) => c.value.toLowerCase() === hex.toLowerCase());
  return found?.label || hex;
}

export function normalizeColor(hex: string): string {
  const found = CORPORATE_COLORS.find((c) => c.value.toLowerCase() === hex.toLowerCase());
  return found?.value || hex;
}
