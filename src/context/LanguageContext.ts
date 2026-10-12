import { createContext } from 'react';
import type { Language, Translation } from '../locales';

export type LanguageMode = 'auto' | 'manual';

export interface LanguageContextType {
  language: Language;
  mode: LanguageMode;
  systemLang: string;
  detectedLanguage: Language;
  t: Translation;
  setLanguage: (lang: Language) => void;
  resetToAuto: () => void;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

