import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, RotateCcw, AlertCircle } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { PinDisplay } from '../components/PinDisplay';
import { authApi, ApiError, formatNow } from '../api/auth';
import type { AuthResponse } from '../api/auth';

/**
 * reg_date ("YYYY-MM-DD HH:mm:ss") 문자열을 받아 남은 유효시간(초)을 계산합니다.
 * 백엔드 개발/테스트용 정적 날짜(예: 과거 24시간 이상 차이)이거나 시계 차이가 큰 경우,
 * 기본 3분(180초)으로 안전하게 초기화합니다.
 */
function getRemainingSeconds(regDateStr?: string): number {
  if (!regDateStr) return 180;

  // "YYYY-MM-DD HH:mm:ss" 또는 "YYYY-MM-DDTHH:mm:ss" 파싱
  const match = regDateStr.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return 180;

  const [, y, m, d, hh, mm, ss] = match.map(Number);
  const serverTime = new Date(y, m - 1, d, hh, mm, ss).getTime();
  const now = Date.now();
  const elapsedSec = Math.floor((now - serverTime) / 1000);

  // 24시간 이상 과거 날짜 (예: "2024-09-04 14:11:15" 같은 더미/테스트 데이터)인 경우:
  // 테스트를 위해 180초 카운트다운 제공
  if (Math.abs(elapsedSec) > 86400) {
    return 180;
  }

  const remaining = 180 - elapsedSec;
  return remaining > 0 ? remaining : 0;
}

export const ResponsePage: React.FC = () => {
  const { t } = useLanguage();
  const { authData, setAuthData, clearAuth } = useAuth();
  const navigate = useNavigate();

  // 세션 데이터가 없을 경우 기본값 제공 (테스트 및 직접 접근 대비)
  const currentData: AuthResponse = authData || {
    six_digit_code: '849201',
    reg_date: '2024-09-04 14:11:15',
  };

  const pinCode = currentData.six_digit_code;

  // 3분(180초) 카운트다운 타이머 상태
  const [timeLeft, setTimeLeft] = useState<number>(() =>
    getRemainingSeconds(currentData.reg_date)
  );
  const [isReissuing, setIsReissuing] = useState(false);
  const [reissueError, setReissueError] = useState<string | null>(null);

  // 발급 시각(reg_date) 또는 PIN 번호 갱신 시 타이머 재설정
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeLeft(getRemainingSeconds(currentData.reg_date));
  }, [currentData.reg_date, currentData.six_digit_code]);

  // 1초 주기 타이머 카운트다운
  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  // Screen Wake Lock API: 키오스크 스캔 중 화면 어두워짐/꺼짐 자동 방지
  useEffect(() => {
    let wakeLockSentinel: { release: () => Promise<void> } | null = null;

    const requestWakeLock = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
        };
        if (nav.wakeLock) {
          wakeLockSentinel = await nav.wakeLock.request('screen');
        }
      } catch {
        // 일부 브라우저 미지원 또는 배터리 절약 모드 시 무시
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, []);

  const handleBackToLogin = () => {
    sessionStorage.removeItem('tango_last_credentials');
    clearAuth();
    navigate('/login');
  };

  // 3분 만료 후 "새로 발급" 버튼 클릭 시 기존 로그인 정보로 재발급
  const handleReissue = async () => {
    if (isReissuing) return;
    setIsReissuing(true);
    setReissueError(null);

    try {
      const storedCreds = sessionStorage.getItem('tango_last_credentials');
      if (storedCreds) {
        const { email, pin_password } = JSON.parse(storedCreds);
        // 기존 로그인 자격증명으로 로그인 API 다시 호출
        const freshRes = await authApi.login({
          email,
          pin_password,
        });

        setAuthData(freshRes);
        setTimeLeft(180);
      } else {
        // 자격증명이 없는 경우 (직접 URL 접근 등 테스트 대비)
        const dummyCode = Math.floor(100000 + Math.random() * 900000).toString();
        const newRegDate = formatNow();
        setAuthData({
          six_digit_code: dummyCode,
          reg_date: newRegDate,
        });
        setTimeLeft(180);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setReissueError(err.serverMessages?.[0] || t.response.reissueFailed);
      } else {
        setReissueError(t.response.reissueFailed);
      }
    } finally {
      setIsReissuing(false);
    }
  };

  // QR 코드에 담길 데이터 (스캔 시 JSON key 없이 6자리 숫자 문자열만 바로 전달)
  const qrPayload = pinCode;

  // 분:초 포맷 계산
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    // 모바일 전용 뷰: 전체적인 마진은 m-4 정도로 최소화하고 화면에 최대한 꽉 차게 구성
    <div className="w-full max-w-[390px] mx-auto bg-white rounded-xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      {/* 1. 상단 무한 롤링 배너 (노란색 톤, 스캔 실패 시 밝기 최대 안내) */}
      <div className="relative w-full bg-amber-50 border-b border-yellow-200/90 overflow-hidden py-2">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-linear-to-r from-amber-50 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-linear-to-l from-amber-50 to-transparent z-10" />

        <div className="animate-marquee flex items-center gap-8 whitespace-nowrap text-xs font-semibold text-amber-900 select-none">
          <span className="inline-flex items-center gap-1.5">
            {t.response.brightnessMarquee}
          </span>
          <span className="inline-flex items-center gap-1.5">
            {t.response.brightnessMarquee}
          </span>
          <span className="inline-flex items-center gap-1.5">
            {t.response.brightnessMarquee}
          </span>
        </div>
      </div>

      <div className="p-4 text-center">
        {/* 상단 액션 바: 좌측 상단 [← 처음으로], 우측 [인증 완료] 뱃지 */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={handleBackToLogin}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            title={t.response.backToLogin}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-bold">{t.response.backToLogin}</span>
          </button>

          <div className="">
            {timeLeft > 0 ? (
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  timeLeft <= 30
                    ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse'
                    : 'bg-blue-50 text-[#2C4FD0] border border-blue-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{t.response.timeRemaining}:</span>
                <span className="font-mono text-sm tracking-wider">{formattedTime}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{t.response.expired}</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-600 font-medium leading-relaxed mb-4 px-1">
          {t.response.subtitle}
        </p>

        <div className="w-full mx-auto flex flex-col items-center">
          {/* 유효시간 타이머 뱃지 */}
          

          {/* QR 코드 영역 (하단 PIN 너비만큼 꽉 참 & 만료 시 오버레이) */}
          <div className="relative w-full aspect-square mb-6 flex items-center justify-center rounded-2xl overflow-hidden border border-gray-100 bg-white p-3 shadow-inner">
            <div
              className={`w-full h-full flex items-center justify-center transition-all duration-300 ${
                timeLeft === 0 ? 'filter blur-md opacity-20 pointer-events-none' : ''
              }`}
            >
              <QRCodeSVG
                value={qrPayload}
                size={320}
                level="H"
                includeMargin={false}
                className="w-full h-full"
              />
            </div>

            {/* 만료 시 QR 코드 위에 생기는 [새로 발급] 오버레이 */}
            {timeLeft === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-white/80 backdrop-blur-[2px] z-10 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-rose-100/80 border border-rose-200 flex items-center justify-center mb-2 text-rose-600 shadow-sm">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1">
                  {t.response.expired}
                </p>
                <p className="text-xs text-gray-500 text-center mb-4 leading-relaxed max-w-[220px]">
                  {t.response.expiredDesc}
                </p>

                {reissueError && (
                  <p className="text-xs text-rose-600 mb-3 font-medium bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                    {reissueError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleReissue}
                  disabled={isReissuing}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#2C4FD0] hover:bg-[#1E3EB8] active:scale-95 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-60 cursor-pointer"
                >
                  <RotateCcw className={`w-4 h-4 ${isReissuing ? 'animate-spin' : ''}`} />
                  <span>{isReissuing ? t.response.reissuing : t.response.reissue}</span>
                </button>
              </div>
            )}
          </div>

          <div className="w-full mb-5">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
              {t.response.pinLabel}
            </span>
            <div className={timeLeft === 0 ? 'opacity-40 transition-opacity' : 'transition-opacity'}>
              <PinDisplay pin={pinCode} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 text-center pt-3 border-t border-gray-100">
          {/* 방법 1: QR 스캔 */}
          <div className="bg-slate-50/80 rounded-2xl p-2.5 border border-gray-100 flex flex-col items-center">
            <div className="w-full h-44 rounded-xl bg-white flex items-center justify-center p-1.5 mb-2 border border-gray-100/90 shadow-2xs">
              <img
                src="/guide_qrcode.png"
                alt="QR Code Guide"
                className="w-full h-full object-contain opacity-85"
              />
            </div>
            <span className="text-sm font-bold text-gray-800 leading-tight">
              {t.response.guideQrTitle}
            </span>
            <span className="text-xs text-gray-500 mt-0.5 leading-tight">
              {t.response.guideQrDesc}
            </span>
          </div>

          {/* 방법 2: 6자리 PIN 입력 */}
          <div className="bg-slate-50/80 rounded-2xl p-2.5 border border-gray-100 flex flex-col items-center">
            <div className="w-full h-44 rounded-xl bg-white flex items-center justify-center p-1.5 mb-2 border border-gray-100/90 shadow-2xs">
              <img
                src="/guide_pin.png"
                alt="PIN Guide"
                className="w-full h-full object-contain opacity-85"
              />
            </div>
            <span className="text-sm font-bold text-gray-800 leading-tight">
              {t.response.guidePinTitle}
            </span>
            <span className="text-xs text-gray-500 mt-0.5 leading-tight">
              {t.response.guidePinDesc}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

