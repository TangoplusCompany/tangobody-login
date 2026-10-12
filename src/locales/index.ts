import { ko } from './ko';
import { en } from './en';

export type Language = 'ko' | 'en';
export type Translation = typeof ko;

export const translations: Record<Language, Translation> = {
  ko,
  en,
};

