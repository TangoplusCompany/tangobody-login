import React, { useState } from 'react';
import { Mail, Lock, LogIn, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/auth';

export const LoginPage: React.FC = () => {
  const { t } = useLanguage();
  const { setAuthData } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^@\s]{3,}@[^@\s]{2,}\.[^@\s]{2,}$/;
    const pinRegex = /^\d{4}$/;

    if (!email.trim()) {
      setError(t.login.validation.emailRequired);
      return;
    }

    if (!emailRegex.test(email.trim())) {
      setError(t.login.validation.emailInvalid);
      return;
    }

    if (!pin.trim()) {
      setError(t.login.validation.pinRequired);
      return;
    }

    if (!pinRegex.test(pin)) {
      setError(t.login.validation.pinInvalid);
      return;
    }

    try {
      setIsLoading(true);
      const res = await authApi.login({
        email: email.trim(),
        pin: pin.trim(),
      });
      setAuthData(res);
      navigate('/response');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4  bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 transition-all">
      <div className="text-center mb-8">
        <div className="bg-[#2C4FD0]/10 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#2C4FD0] shadow-xs">
          <LogIn className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{t.login.title}</h2>
        <p className="text-sm text-gray-500 mt-1">{t.login.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 이메일 입력 */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
            {t.login.emailLabel}
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input
              type="email"
              placeholder={t.login.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full pl-11 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C4FD0] focus:bg-white transition-all text-sm"
              autoComplete="email"
            />
          </div>
        </div>

        {/* 4자리 PIN 입력 */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
            {t.login.pinLabel}
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder={t.login.pinPlaceholder}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                if (val.length <= 4) setPin(val);
              }}
              disabled={isLoading}
              className="w-full pl-11 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C4FD0] focus:bg-white transition-all tracking-widest font-mono text-sm"
              autoComplete="current-password"
            />
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 로그인 버튼 */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 bg-[#2C4FD0] hover:bg-[#223FA8] active:bg-[#1B3388] disabled:bg-[#2C4FD0]/40 text-white font-semibold rounded-xl shadow-md shadow-[#2C4FD0]/25 transition-all flex items-center justify-center gap-2 text-sm mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t.login.submitting}</span>
            </>
          ) : (
            <>
              <span>{t.login.submitButton}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* 회원가입 링크 */}
      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <p className="text-xs sm:text-sm text-gray-500">
          {t.login.noAccount}{' '}
          <Link
            to="/signup"
            className="font-semibold text-[#2C4FD0] hover:underline inline-flex items-center gap-1 ml-1"
          >
            {t.login.goToSignUp}
          </Link>
        </p>
      </div>
    </div>
  );
};
