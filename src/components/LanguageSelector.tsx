import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { Globe, Check, ChevronDown, Sparkles } from 'lucide-react';

export const LanguageSelector: React.FC = () => {
  const { language, mode, systemLang, setLanguage, resetToAuto, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2C4FD0] shadow-xs transition-all"
        aria-expanded={isOpen}
      >
        <Globe className="w-4 h-4 text-[#2C4FD0]" />
        <span>{language === 'ko' ? '한국어' : 'English'}</span>
        {mode === 'auto' && (
          <span className="inline-flex items-center gap-1 text-[10px] bg-[#2C4FD0]/10 text-[#2C4FD0] px-1.5 py-0.5 rounded-full font-semibold">
            <Sparkles className="w-2.5 h-2.5" />
            Auto ({systemLang.slice(0, 5)})
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
            {t.language} ({t.systemDetected}: {systemLang})
          </div>

          {/* 자동 감지 옵션 */}
          <button
            type="button"
            onClick={() => {
              resetToAuto();
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-[#2C4FD0]/5 hover:text-[#2C4FD0] flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2C4FD0]" />
              <span>{t.auto}</span>
            </div>
            {mode === 'auto' && <Check className="w-4 h-4 text-[#2C4FD0]" />}
          </button>

          <div className="my-1 border-t border-gray-100" />

          {/* 한국어 */}
          <button
            type="button"
            onClick={() => {
              setLanguage('ko');
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-[#2C4FD0]/5 hover:text-[#2C4FD0] flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">🇰🇷</span>
              <span>한국어</span>
            </span>
            {mode === 'manual' && language === 'ko' && <Check className="w-4 h-4 text-[#2C4FD0]" />}
          </button>

          {/* English */}
          <button
            type="button"
            onClick={() => {
              setLanguage('en');
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-[#2C4FD0]/5 hover:text-[#2C4FD0] flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">🌐</span>
              <span>English (Other countries)</span>
            </span>
            {mode === 'manual' && language === 'en' && <Check className="w-4 h-4 text-[#2C4FD0]" />}
          </button>
        </div>
      )}
    </div>
  );
};
