import React, { useState } from 'react';
import { Mail, Lock, Calendar, Phone, UserPlus, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/auth';

interface CountryOption {
  code: string;
  label: string;
  flag: string;
}

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: '+82', label: '대한민국 (+82)', flag: '🇰🇷' },
  { code: '+1', label: 'USA / Canada (+1)', flag: '🇺🇸' },
  { code: '+81', label: 'Japan (+81)', flag: '🇯🇵' },
  { code: '+86', label: 'China (+86)', flag: '🇨🇳' },
  { code: '+44', label: 'UK (+44)', flag: '🇬🇧' },
  { code: '+49', label: 'Germany (+49)', flag: '🇩🇪' },
  { code: '+33', label: 'France (+33)', flag: '🇫🇷' },
  { code: '+84', label: 'Vietnam (+84)', flag: '🇻🇳' },
  { code: '+65', label: 'Singapore (+65)', flag: '🇸🇬' },
  { code: '+61', label: 'Australia (+61)', flag: '🇦🇺' },
];

export const RegisterPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { setAuthData } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [countryCode, setCountryCode] = useState('+82');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 생년월일 8자리 유효성 검증
  const isValidBirthDate = (dateStr: string): boolean => {
    if (!/^\d{8}$/.test(dateStr)) return false;
    const year = parseInt(dateStr.slice(0, 4), 10);
    const month = parseInt(dateStr.slice(4, 6), 10);
    const day = parseInt(dateStr.slice(6, 8), 10);

    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    // 실제 해당 월의 일수 확인
    const daysInMonth = new Date(year, month, 0).getDate();
    return day <= daysInMonth;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^@\s]{3,}@[^@\s]{2,}\.[^@\s]{2,}$/;
    const pinRegex = /^\d{4}$/;

    // 1. 이메일 (필수)
    if (!email.trim()) {
      setError(t.signUp.validation.emailRequired);
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setError(t.signUp.validation.emailInvalid);
      return;
    }

    // 2. PIN 번호 (숫자 4자리, 필수)
    if (!pin.trim()) {
      setError(t.signUp.validation.pinRequired);
      return;
    }
    if (!pinRegex.test(pin)) {
      setError(t.signUp.validation.pinInvalid);
      return;
    }
    if (pin !== pinConfirm) {
      setError(t.signUp.validation.pinMismatch);
      return;
    }

    // 3. 생년월일 (숫자 8자리, 필수)
    if (!birthDate.trim()) {
      setError(t.signUp.validation.birthDateRequired);
      return;
    }
    if (!/^\d{8}$/.test(birthDate)) {
      setError(t.signUp.validation.birthDateInvalid);
      return;
    }
    if (!isValidBirthDate(birthDate)) {
      setError(t.signUp.validation.birthDateRange);
      return;
    }

    // 4. 국가번호_휴대폰번호 (선택)
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (phoneNumber.trim() && cleanPhone.length < 7) {
      setError(t.signUp.validation.phoneInvalid);
      return;
    }

    try {
      setIsLoading(true);
      const res = await authApi.register({
        email: email.trim(),
        pin: pin.trim(),
        birthDate: birthDate.trim(),
        countryCode: phoneNumber.trim() ? countryCode : undefined,
        phoneNumber: phoneNumber.trim() ? `${countryCode}_${cleanPhone}` : undefined,
      });

      setAuthData(res);
      navigate('/response');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto p-4 bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 transition-all">
      <div className="text-center mb-6">
        <div className="bg-[#2C4FD0]/10 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#2C4FD0] shadow-xs">
          <UserPlus className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{t.signUp.title}</h2>
        <p className="text-sm text-gray-500 mt-1">{t.signUp.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 이메일 (필수) */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
            <span>{t.signUp.emailLabel}</span>
            <span className="text-red-500 text-[11px] font-bold">*{t.signUp.required}</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input
              type="email"
              placeholder={t.signUp.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full pl-11 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C4FD0] focus:bg-white transition-all text-sm"
              autoComplete="email"
            />
          </div>
        </div>

        {/* PIN 번호 & 확인 (필수 4자리) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
              <span>{t.signUp.pinLabel}</span>
              <span className="text-red-500 text-[11px] font-bold">*{t.signUp.required}</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder={t.signUp.pinPlaceholder}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  if (val.length <= 4) setPin(val);
                }}
                disabled={isLoading}
                className="w-full pl-11 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C4FD0] focus:bg-white transition-all tracking-widest font-mono text-sm"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
              <span>{t.signUp.pinConfirmLabel}</span>
              <span className="text-red-500 text-[11px] font-bold">*{t.signUp.required}</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder={t.signUp.pinConfirmPlaceholder}
                value={pinConfirm}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  if (val.length <= 4) setPinConfirm(val);
                }}
                disabled={isLoading}
                className="w-full pl-11 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C4FD0] focus:bg-white transition-all tracking-widest font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* 생년월일 (숫자 8자리, 필수) */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
            <span>{t.signUp.birthDateLabel}</span>
            <span className="text-red-500 text-[11px] font-bold">*{t.signUp.required}</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              placeholder={t.signUp.birthDatePlaceholder}
              value={birthDate}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                if (val.length <= 8) setBirthDate(val);
              }}
              disabled={isLoading}
              className="w-full pl-11 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C4FD0] focus:bg-white transition-all font-mono text-sm tracking-wider"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1 pl-1">
            {language === 'ko' ? '예시: 19950512 (8자리 숫자)' : 'Format: YYYYMMDD (8 digits)'}
          </p>
        </div>

        {/* 국가번호_휴대폰번호 (선택) */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
            <span>{t.signUp.phoneLabel}</span>
            <span className="text-gray-400 text-[11px]">({t.signUp.optional})</span>
          </label>
          <div className="flex gap-2">
            <div className="w-1/3 min-w-[120px]">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                disabled={isLoading}
                className="w-full py-3 px-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2C4FD0] focus:bg-white transition-all cursor-pointer"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <input
                type="tel"
                inputMode="numeric"
                placeholder={t.signUp.phoneNumberPlaceholder}
                value={phoneNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9-]/g, '');
                  setPhoneNumber(val);
                }}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C4FD0] focus:bg-white transition-all text-sm"
              />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-1 pl-1">
            {language === 'ko'
              ? '저장 포맷: [국가번호]_[휴대폰번호] (예: +82_01012345678)'
              : 'Stored format: [CountryCode]_[Phone] (e.g. +82_01012345678)'}
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 bg-[#2C4FD0] hover:bg-[#223FA8] active:bg-[#1B3388] disabled:bg-[#2C4FD0]/40 text-white font-semibold rounded-xl shadow-md shadow-[#2C4FD0]/25 transition-all flex items-center justify-center gap-2 text-sm mt-3"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t.signUp.submitting}</span>
            </>
          ) : (
            <span>{t.signUp.submitButton}</span>
          )}
        </button>
      </form>

      {/* 로그인으로 돌아가기 링크 */}
      <div className="mt-6 pt-5 border-t border-gray-100 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-600 hover:text-[#2C4FD0] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.signUp.goToLogin}</span>
        </Link>
      </div>
    </div>
  );
};
