import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';
import { COUNTRIES } from '../data/countries';
import type { Country } from '../data/countries';

interface CountryCodeModalProps {
  isOpen: boolean;
  selectedDialCode: string;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

export const CountryCodeModal: React.FC<CountryCodeModalProps> = ({
  isOpen,
  selectedDialCode,
  onSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const handleSelect = (country: Country) => {
    setSearchQuery('');
    onSelect(country);
    onClose();
  };

  // 모달 오픈 시 검색창 자동 포커스
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ESC 키 닫기 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchQuery('');
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 검색 필터링: 오직 영문 국가명(English Name) 및 전화번호 다이얼 코드(Dial Code)로만 검색
  const filteredCountries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return COUNTRIES;

    // 검색어에서 '+' 기호 제거한 숫자
    const cleanNumberQuery = query.replace(/^\+/, '');

    return COUNTRIES.filter((c) => {
      // 1. 영문 국가명 검색 (대소문자 무시)
      const matchesName = c.name.toLowerCase().includes(query);

      // 2. 다이얼 코드 검색 (예: '82', '+82')
      const cleanDialCode = c.dialCode.replace(/^\+/, '');
      const matchesDialCode =
        c.dialCode.includes(query) || cleanDialCode.startsWith(cleanNumberQuery);

      return matchesName || matchesDialCode;
    });
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      {/* 바깥 클릭 시 닫기 */}
      <div className="fixed inset-0" onClick={handleClose} />

      {/* 모달 본체 */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-10 flex flex-col max-h-[85vh]">
        {/* 모달 헤더 */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Select Country Code</h3>
            <p className="text-[11px] text-gray-400">Search by English country name or dial code</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 검색 입력창 */}
        <div className="p-3 bg-gray-50 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. South Korea or 82"
              className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C4FD0] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 국가 목록 리스트 */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 p-2">
          {filteredCountries.length > 0 ? (
            filteredCountries.map((country) => {
              const isSelected = selectedDialCode === country.dialCode;
              return (
                <button
                  key={`${country.code}-${country.dialCode}`}
                  type="button"
                  onClick={() => handleSelect(country)}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-left text-xs sm:text-sm transition-colors ${
                    isSelected
                      ? 'bg-[#2C4FD0]/10 text-[#2C4FD0] font-semibold'
                      : 'hover:bg-gray-50 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <span className="text-xl shrink-0 select-none">{country.flag}</span>
                    <span className="truncate">{country.name}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-[#2C4FD0] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {country.dialCode}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-[#2C4FD0]" />}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-12 text-center text-gray-400 text-xs">
              <p>No countries found</p>
              <p className="text-[11px] mt-1 text-gray-300">
                Try searching in English (e.g. "South Korea" or "82")
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
