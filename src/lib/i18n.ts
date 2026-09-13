// ═══════════════════════════════════════════════════════════════════
// I18N - Traducciones ES/EN para UI nueva (Fase 11 completará el sistema)
// ═══════════════════════════════════════════════════════════════════
// Uso: t('clave.de.ejemplo') devuelve el texto en el idioma activo
// (ES por defecto, EN como fallback). Cada pestaña/módulo registra
// sus propias claves con registerI18nKeys() para no centralizar todo
// en un solo archivo.

type Lang = 'es' | 'en';

const dictionaries: Record<Lang, Record<string, string>> = {
  es: {},
  en: {},
};

let currentLang: Lang = 'es';

export function setLanguage(lang: Lang) {
  currentLang = lang;
}

export function getLanguage(): Lang {
  return currentLang;
}

export function registerI18nKeys(keys: { es: Record<string, string>; en: Record<string, string> }) {
  Object.assign(dictionaries.es, keys.es);
  Object.assign(dictionaries.en, keys.en);
}

export function t(key: string): string {
  return dictionaries[currentLang][key] ?? dictionaries.en[key] ?? key;
}

// Hook de conveniencia para componentes (re-render si cambia el idioma en el futuro)
export function useT(): (key: string) => string {
  return t;
}
