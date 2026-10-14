import { ko } from './ko';
import { en } from './en';
import { az } from './az';
import { es } from './es';
import { ru } from './ru';

export type Language = 'ko' | 'en' | 'az' | 'es' | 'ru';
export type Translation = typeof ko;

export const translations: Record<Language, Translation> = {
  ko,
  en,
  az,
  es,
  ru,
};
