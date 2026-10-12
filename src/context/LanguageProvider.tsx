import React, { useEffect, useState } from 'react';
import type { Language } from '../locales';
import { translations } from '../locales';
import { LanguageContext } from './LanguageContext';
import type { LanguageContextType, LanguageMode } from './LanguageContext';

const STORAGE_KEY_LANG = 'tangobody_preferred_lang';
const STORAGE_KEY_MODE = 'tangobody_lang_mode';

function detectBrowserLanguage(): { detected: Language; raw: string } {
  if (typeof window === 'undefined' || !navigator) {
    return { detected: 'ko', raw: 'ko' };
  }

  const primary = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  const isKorean = primary.toLowerCase().startsWith('ko');
  return {
    detected: isKorean ? 'ko' : 'en',
    raw: primary,
  };
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [systemInfo, setSystemInfo] = useState(() => detectBrowserLanguage());
  const [mode, setMode] = useState<LanguageMode>(() => {
    const savedMode = localStorage.getItem(STORAGE_KEY_MODE) as LanguageMode | null;
    return savedMode === 'manual' ? 'manual' : 'auto';
  });
  const [manualLang, setManualLang] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LANG) as Language | null;
    return saved === 'ko' || saved === 'en' ? saved : 'ko';
  });

  // 브라우저 언어 변경 감지 이벤트 (Chrome 설정 등에서 언어를 바꿨을 때 실시간 반영)
  useEffect(() => {
    const handleLanguageChange = () => {
      const updated = detectBrowserLanguage();
      setSystemInfo(updated);
    };

    window.addEventListener('languagechange', handleLanguageChange);
    return () => {
      window.removeEventListener('languagechange', handleLanguageChange);
    };
  }, []);

  const currentLanguage: Language = mode === 'manual' ? manualLang : systemInfo.detected;

  const handleSetLanguage = (lang: Language) => {
    setMode('manual');
    setManualLang(lang);
    localStorage.setItem(STORAGE_KEY_MODE, 'manual');
    localStorage.setItem(STORAGE_KEY_LANG, lang);
  };

  const handleResetToAuto = () => {
    setMode('auto');
    localStorage.setItem(STORAGE_KEY_MODE, 'auto');
    localStorage.removeItem(STORAGE_KEY_LANG);
    setSystemInfo(detectBrowserLanguage());
  };

  const value: LanguageContextType = {
    language: currentLanguage,
    mode,
    systemLang: systemInfo.raw,
    detectedLanguage: systemInfo.detected,
    t: translations[currentLanguage],
    setLanguage: handleSetLanguage,
    resetToAuto: handleResetToAuto,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

