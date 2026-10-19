import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, RotateCcw, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { PinDisplay } from '../components/PinDisplay';
import { authApi, ApiError, formatNow, formatEndDate } from '../api/auth';
import type { AuthResponse } from '../api/auth';

/**
 * "YYYY-MM-DD HH:mm:ss" 또는 ISO 날짜 문자열을 밀리초(ms) 단위 타임스탬프로 변환합니다.
 */
function parseDateStrToMs(dateStr?: string): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    const [, y, m, d, hh, mm, ss] = match.map(Number);
    return new Date(y, m - 1, d, hh, mm, ss).getTime();
  }
  const parsed = new Date(dateStr).getTime();
  return isNaN(parsed) ? null : parsed;
}

/**
 * 서버의 end_date를 기준으로 만료 타임스탬프(ms)를 계산합니다.
 * 과거 더미 데이터(예: 2024년 테스트값)인 경우 세션스토리지에 현재 PIN 코드 기준 만료 시각을 앵커링하여
 * 창을 최소화하거나 나갔다 오더라도 일관되게 정확한 남은 시간을 계산할 수 있도록 보장합니다.
 */
function getTargetEndTimeMs(endDateStr?: string, code?: string): number {
  const endMs = parseDateStrToMs(endDateStr);
  const now = Date.now();

  // 1) 정상적인 최근 24시간 내 타임스탬프인 경우: end_date 그대로 사용
  if (endMs !== null && Math.abs(endMs - now) <= 86400 * 1000) {
    return endMs;
  }

  // 2) 과거 더미 데이터인 경우: 세션에 앵커링된 만료 시각이 있는지 확인하여 일관성 유지
  const cacheKey = `tango_target_end_${code || 'default'}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsedCached = Number(cached);
      if (!isNaN(parsedCached)) return parsedCached;
    }
    const fallbackTarget = now + 180 * 1000;
    sessionStorage.setItem(cacheKey, String(fallbackTarget));
    return fallbackTarget;
  } catch {
    return now + 180 * 1000;
  }
}

/**
 * 목표 만료 시각(ms)으로부터 현재 시점의 남은 초(s)를 계산합니다.
 */
function calculateRemainingSeconds(targetMs: number): number {
  const diffSec = Math.floor((targetMs - Date.now()) / 1000);
  return diffSec > 0 ? diffSec : 0;
}

export const ResponsePage: React.FC = () => {
  const { t } = useLanguage();
  const { authData, setAuthData, clearAuth } = useAuth();
  const navigate = useNavigate();

  // 세션 데이터가 없을 경우 기본값 제공 (테스트 및 직접 접근 대비)
  const currentData: AuthResponse = authData || {
    six_digit_code: '849201',
    reg_date: '2024-09-04 14:11:15',
    end_date: '2024-09-04 14:14:15',
    user_sn: '1',
  };

  const pinCode = currentData.six_digit_code;

  // 서버의 end_date를 기준으로 산출한 목표 만료 시각(ms)
  const targetEndTimeMs = getTargetEndTimeMs(
    currentData.end_date,
    currentData.six_digit_code
  );

  // end_date 기준 실시간 잔여 초(s) 상태
  const [timeLeft, setTimeLeft] = useState<number>(() =>
    calculateRemainingSeconds(targetEndTimeMs)
  );
  const [isReissuing, setIsReissuing] = useState(false);
  const [reissueError, setReissueError] = useState<string | null>(null);

  // QR 스캔 완료(403 수신) 상태 및 자동 이동 카운트다운(5초)
  const [isScanCompleted, setIsScanCompleted] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  // 저장된 로그인 자격증명 (email -> user_id, pin_password -> user_password)
  const storedCreds = (() => {
    try {
      const raw = sessionStorage.getItem('tango_last_credentials');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  // 1) 매 1초마다 end_date(targetEndTimeMs)와 Date.now()의 차이를 직접 계산하여 갱신
  // 2) 브라우저 탭 최소화/백그라운드 전환 후 복귀(visibilitychange, focus, pageshow) 시 즉시 재계산
  useEffect(() => {
    const updateTime = () => {
      const remaining = calculateRemainingSeconds(targetEndTimeMs);
      setTimeLeft(remaining);
      return remaining;
    };

    // 초기 및 포커스 복귀 이벤트 핸들러
    const handleSync = () => {
      updateTime();
    };

    updateTime();

    // 1초 인터벌: prev - 1이 아니라 항상 targetEndTimeMs - Date.now()로 절대 시간 계산
    const interval = setInterval(() => {
      const remaining = updateTime();
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    document.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    window.addEventListener('pageshow', handleSync);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('pageshow', handleSync);
    };
  }, [targetEndTimeMs]);

  // timeLeft 최신값을 ref로 관리하여 polling interval이 1초마다 취소/재시작되는 것을 방지
  const timeLeftRef = useRef(timeLeft);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
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

  const handleBackToLogin = useCallback(() => {
    sessionStorage.removeItem('tango_last_credentials');
    sessionStorage.removeItem(`tango_target_end_${currentData.six_digit_code}`);
    clearAuth();
    navigate('/login');
  }, [clearAuth, currentData.six_digit_code, navigate]);

  // [QR 코드 상태 폴링]
  useEffect(() => {
    if (isScanCompleted || isReissuing) {
      return;
    }

    const targetUserSn = currentData.user_sn || storedCreds?.user_sn;
    if (!targetUserSn) {
      console.warn('[QR Poll] Waiting for valid user_sn...');
      return;
    }

    let isCancelled = false;
    let isFetching = false;

    const checkStatus = async () => {
      if (isCancelled || isFetching || isScanCompleted || timeLeftRef.current <= 0) return;
      isFetching = true;

      try {
        const result = await authApi.checkQrCodeStatus(targetUserSn);

        if (isCancelled) return;

        // 403 (status === 3): 키오스크 스캔 사용 완료 감지
        if (result.isCompleted) {
          console.log('[QR Poll] Scan completed successfully!');
          setRedirectCountdown(5);
          setIsScanCompleted(true);
        }
      } catch (err) {
        console.warn('[QR Poll] Status check error:', err);
      } finally {
        isFetching = false;
      }
    };

    // 마운트 1초 후 첫 확인, 이후 2.5초마다 주기적 폴링
    const initialTimer = setTimeout(checkStatus, 1000);
    const interval = setInterval(checkStatus, 2500);

    return () => {
      isCancelled = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [
    isScanCompleted,
    isReissuing,
    currentData.user_sn,
    storedCreds?.user_sn,
  ]);

  // [스캔 완료 카운트다운]
  // 스캔 완료 시 5초 후 자동으로 세션을 정리하고 로그인 페이지로 복귀
  useEffect(() => {
    if (!isScanCompleted) return;

    const countdownTimer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          handleBackToLogin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [isScanCompleted, handleBackToLogin]);

  // 3분 만료 후 "새로 발급" 버튼 클릭 시 기존 로그인 정보로 재발급
  const handleReissue = async () => {
    if (isReissuing) return;
    setIsReissuing(true);
    setReissueError(null);
    setIsScanCompleted(false);
    setRedirectCountdown(5);

    try {
      if (storedCreds) {
        const { email, pin_password } = storedCreds;
        // 기존 로그인 자격증명으로 로그인 API 다시 호출
        const freshRes = await authApi.login({
          email,
          pin_password,
        });

        sessionStorage.removeItem(`tango_target_end_${currentData.six_digit_code}`);
        sessionStorage.setItem(
          'tango_last_credentials',
          JSON.stringify({ email, pin_password, user_sn: freshRes.user_sn })
        );
        setAuthData(freshRes);
      } else {
        // 자격증명이 없는 경우 (직접 URL 접근 등 테스트 대비)
        const dummyCode = Math.floor(100000 + Math.random() * 900000).toString();
        const newRegDate = formatNow();
        const newEndDate = formatEndDate(newRegDate);

        sessionStorage.removeItem(`tango_target_end_${currentData.six_digit_code}`);
        setAuthData({
          six_digit_code: dummyCode,
          reg_date: newRegDate,
          end_date: newEndDate,
          user_sn: '1',
        });
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
      {/* 1. 상단 배너 (스캔 완료 시 녹색 배너, 진행 중일 때 노란색 밝기 안내 배너) */}
      {isScanCompleted ? (
        <div className="w-full bg-emerald-50 border-b border-emerald-200/90 py-2.5 px-4 text-center">
          <p className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            <span>{t.response.scanCompletedTitle}</span>
          </p>
        </div>
      ) : (
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
      )}

      <div className="p-4 text-center">
        {isScanCompleted ? (
          <div className="py-12 px-4 flex flex-col items-center justify-center min-h-[460px]">
            {/* 성공 체크 아이콘 애니메이션 */}
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-[#00E676] flex items-center justify-center mb-5 text-[#00C853] shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {t.response.scanCompletedTitle}
            </h2>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed max-w-[260px]">
              {t.response.scanCompletedDesc}
            </p>

            {/* 자동 이동 카운트다운 뱃지 */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50/80 border border-blue-100 rounded-full text-xs font-semibold text-[#2C4FD0] mb-8">
              <Clock className="w-4 h-4" />
              <span>
                {redirectCountdown}{t.response.scanCompletedCountdownSuffix}
              </span>
            </div>

            {/* 지금 바로 이동 버튼 */}
            <button
              type="button"
              onClick={handleBackToLogin}
              className="w-full max-w-[240px] py-3.5 px-4 bg-[#2C4FD0] hover:bg-[#1E3EB8] active:scale-95 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{t.response.goToLoginNow}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};

