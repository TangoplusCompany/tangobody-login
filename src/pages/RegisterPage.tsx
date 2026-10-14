import React, { useState } from 'react';
import { Mail, Lock, Calendar, Phone, UserPlus, ArrowLeft, Loader2, AlertCircle, ChevronDown, User, Check, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { authApi, RegisterApiError, ApiError } from '../api/auth';
import { CountryCodeModal } from '../components/CountryCodeModal';
import { getDefaultCountryByLanguage } from '../data/countries';
import type { Country } from '../data/countries';

export const RegisterPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { setAuthData } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'남성' | '여성' | ''>('');

  // 현재 선택된 언어에 맞춰 기본 국가번호 초기화 (영어 -> +1 미국 등)
  const [selectedCountry, setSelectedCountry] = useState<Country>(() =>
    getDefaultCountryByLanguage(language)
  );
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [prevLanguage, setPrevLanguage] = useState(language);

  // 3. useEffect 대신 본문에서 바로 갱신
  if (prevLanguage !== language) {
    setPrevLanguage(language);
    setSelectedCountry(getDefaultCountryByLanguage(language));
  }
  

  // 모든 필수 항목(이메일, PIN 4자리, PIN 확인 일치, 이름, 성, 생년월일, 성별, 개인정보 동의) 유효성 충족 여부
  const isFormValid = Boolean(
    email.trim() &&
    /^[^@\s]{3,}@[^@\s]{2,}\.[^@\s]{2,}$/.test(email.trim()) &&
    /^\d{4}$/.test(pin) &&
    pin === pinConfirm &&
    firstName.trim() &&
    lastName.trim() &&
    birthDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(birthDate) &&
    (gender === '남성' || gender === '여성') &&
    agreedPrivacy &&
    (!phoneNumber.trim() || phoneNumber.replace(/[^0-9]/g, '').length >= 5)
  );

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

    // 3. 이름 (이름 & 성 2칸, 필수)
    if (!firstName.trim()) {
      setError(t.signUp.validation.firstNameRequired);
      return;
    }
    if (!lastName.trim()) {
      setError(t.signUp.validation.lastNameRequired);
      return;
    }

    // 4. 생년월일 (달력 선택, YYYY-MM-DD 형식, 필수)
    if (!birthDate.trim()) {
      setError(t.signUp.validation.birthDateRequired);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      setError(t.signUp.validation.birthDateInvalid);
      return;
    }

    // 5. 성별 (남성/여성, 필수)
    if (!gender) {
      setError(t.signUp.validation.genderRequired);
      return;
    }

    // 6. 국가번호 & 휴대폰번호 (선택)
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (phoneNumber.trim() && cleanPhone.length < 5) {
      setError(t.signUp.validation.phoneInvalid);
      return;
    }

    // 7. 개인정보 수집 및 이용 동의 (필수)
    if (!agreedPrivacy) {
      setError(t.signUp.validation.privacyRequired);
      return;
    }

    try {
      setIsLoading(true);

      const res = await authApi.register({
        email: email.trim(),
        pin_password: pin.trim(),
        birthday: birthDate.trim(),
        gender: gender as '남성' | '여성',
        mobile: phoneNumber.trim() ? cleanPhone : undefined,
        country_iso: selectedCountry.code,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });

      setAuthData(res);
      navigate('/response');
    } catch (err: unknown) {
      if (err instanceof RegisterApiError || err instanceof ApiError) {
        if (err.status === 409) {
          setError(t.signUp.validation.emailExists);
        } else if (err.status === 400) {
          setError(t.signUp.validation.invalidInput);
        } else {
          setError(t.signUp.validation.serverError);
        }
      } else {
        setError(t.signUp.validation.serverError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto p-6 sm:p-8 bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 transition-all">
      <div className="text-center mb-6">
        <div className="bg-brand-blue/10 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-blue shadow-xs">
          <UserPlus className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{t.signUp.title}</h2>
        <p className="text-sm text-gray-500 mt-1">{t.signUp.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. 이메일 (필수) */}
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
              className="w-full pl-11 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all text-sm"
              autoComplete="email"
            />
          </div>
        </div>

        {/* 2. PIN 번호 & 확인 (필수 4자리) */}
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
                className="w-full pl-11 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all tracking-widest font-mono text-sm"
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
                className={`w-full pl-11 pr-4 py-3 bg-gray-50/80 border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none transition-all tracking-widest font-mono text-sm ${
                  pinConfirm.length > 0
                    ? pin === pinConfirm
                      ? 'border-[#00E676] focus:ring-2 focus:ring-[#00E676]/40 focus:bg-white'
                      : 'border-red-400 focus:ring-2 focus:ring-red-400/40 focus:bg-white'
                    : 'border-gray-200 focus:ring-2 focus:ring-brand-blue focus:bg-white'
                }`}
              />
            </div>
            {/* 실시간 PIN 일치/불일치 상태 안내 (네온초록색 - 빨간색) */}
            {pinConfirm.length > 0 && (
              <p
                className={`text-[11px] mt-1.5 pl-1 flex items-center gap-1 font-semibold transition-all duration-150 ${
                  pin === pinConfirm
                    ? 'text-[#00C853] dark:text-[#00E676]'
                    : 'text-red-500'
                }`}
              >
                {pin === pinConfirm ? (
                  <>
                    <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                    <span>{t.signUp.pinMatch}</span>
                  </>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                    <span>{t.signUp.pinMismatch}</span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {/* 3. 이름 (이름 & 성 2칸 분리, 필수) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
              <span>{t.signUp.firstNameLabel}</span>
              <span className="text-red-500 text-[11px] font-bold">*{t.signUp.required}</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder={t.signUp.firstNamePlaceholder}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-3 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all text-sm"
                autoComplete="given-name"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
              <span>{t.signUp.lastNameLabel}</span>
              <span className="text-red-500 text-[11px] font-bold">*{t.signUp.required}</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder={t.signUp.lastNamePlaceholder}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-3 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all text-sm"
                autoComplete="family-name"
              />
            </div>
          </div>
        </div>

        {/* 4. 생년월일 (달력 선택, YYYY-MM-DD 형식, 필수) */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
            <span>{t.signUp.birthDateLabel}</span>
            <span className="text-red-500 text-[11px] font-bold">*{t.signUp.required}</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input
              type="date"
              lang={language}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker?.();
                } catch {
                  // Ignore if unsupported
                }
              }}
              min="1900-01-01"
              max={new Date().toISOString().split('T')[0]}
              disabled={isLoading}
              className="w-full pl-11 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all font-mono text-sm tracking-wide cursor-pointer"
            />
          </div>
        </div>

        {/* 5. 성별 (남성/여성 토글 버튼, 필수) */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
            <span>{t.signUp.genderLabel}</span>
            <span className="text-red-500 text-[11px] font-bold">*{t.signUp.required}</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setGender('남성')}
              disabled={isLoading}
              className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center cursor-pointer ${
                gender === '남성'
                  ? 'bg-brand-blue text-white border-brand-blue shadow-sm shadow-brand-blue/30 font-bold'
                  : 'bg-gray-50/80 text-gray-700 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span>{t.signUp.genderMale}</span>
            </button>
            <button
              type="button"
              onClick={() => setGender('여성')}
              disabled={isLoading}
              className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center cursor-pointer ${
                gender === '여성'
                  ? 'bg-brand-blue text-white border-brand-blue shadow-sm shadow-brand-blue/30 font-bold'
                  : 'bg-gray-50/80 text-gray-700 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span>{t.signUp.genderFemale}</span>
            </button>
          </div>
        </div>

        {/* 6. 국가번호 & 휴대폰번호 (선택) */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
            <span>{t.signUp.phoneLabel}</span>
            <span className="text-gray-400 text-[11px]">({t.signUp.optional})</span>
          </label>
          <div className="flex gap-2">
            {/* 국가번호 모달 트리거 버튼 */}
            <div className="w-2/5 min-w-31.25">
              <button
                type="button"
                onClick={() => setIsCountryModalOpen(true)}
                disabled={isLoading}
                className="w-full py-3 px-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all flex items-center justify-between gap-1.5 cursor-pointer hover:bg-gray-100/70"
                title="Select country code"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-base select-none">{selectedCountry.flag}</span>
                  <span className="font-semibold text-gray-900 font-mono text-xs sm:text-sm">
                    {selectedCountry.dialCode}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            </div>

            {/* 휴대폰 번호 입력창 */}
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
                className="w-full pl-10 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all text-sm"
              />
            </div>
          </div>
        </div>

        {/* 7. 개인정보 수집 및 이용 동의 (필수 체크 항목) */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 p-3 bg-gray-50/90 hover:bg-gray-100/80 border border-gray-200 rounded-xl cursor-pointer transition-colors select-none">
            <input
              type="checkbox"
              checked={agreedPrivacy}
              onChange={(e) => setAgreedPrivacy(e.target.checked)}
              disabled={isLoading}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue shrink-0 cursor-pointer accent-brand-blue"
            />
            <span className="text-xs text-gray-700 leading-relaxed font-medium">
              {t.signUp.privacyConsent}
            </span>
          </label>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 회원가입 제출 버튼 */}
        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-3 select-none ${
            isFormValid && !isLoading
              ? 'bg-brand-blue hover:bg-brand-blue-hover active:bg-brand-blue-dark text-white shadow-md shadow-brand-blue/25 cursor-pointer'
              : 'bg-slate-200 text-slate-400 border border-slate-200/80 cursor-not-allowed shadow-none'
          }`}
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
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-600 hover:text-brand-blue transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.signUp.goToLogin}</span>
        </Link>
      </div>

      {/* 국가번호 검색 모달 */}
      <CountryCodeModal
        isOpen={isCountryModalOpen}
        selectedDialCode={selectedCountry.dialCode}
        onSelect={(country) => setSelectedCountry(country)}
        onClose={() => setIsCountryModalOpen(false)}
      />
    </div>
  );
};
