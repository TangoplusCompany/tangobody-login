import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { PinDisplay } from '../components/PinDisplay';
import type { AuthResponse } from '../api/auth';

export const ResponsePage: React.FC = () => {
  const { t } = useLanguage();
  const { authData, clearAuth } = useAuth();
  const navigate = useNavigate();

  // 세션 데이터가 없을 경우 기본값 제공 (테스트 및 직접 접근 대비)
  const currentData: AuthResponse = authData || {
    six_digit_code: '849201',
    user_sn: '1',
    user_uuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  };

  const pinCode = currentData.six_digit_code ;

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
    clearAuth();
    navigate('/login');
  };

  // QR 코드에 담길 데이터 (스캔 시 JSON key 없이 6자리 숫자 문자열만 바로 전달)
  const qrPayload = pinCode;

  return (
    // 모바일 전용 뷰: 전체적인 마진은 m-4 정도로 최소화하고 화면에 최대한 꽉 차게 구성
    <div className="w-full max-w-[390px] mx-auto bg-white rounded-xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      {/* 1. 상단 무한 롤링 배너 (노란색 톤, 스캔 실패 시 밝기 최대 안내) */}
      <div className="relative w-full bg-amber-50 border-b border-yellow-200/90 overflow-hidden py-2">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-linear-to-r from-amber-50 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-linear-to-l from-amber-50 to-transparent z-10" />

        <div className="animate-marquee flex items-center gap-8 whitespace-nowrap text-xs font-semibold text-amber-900 select-none">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
            {t.response.brightnessMarquee}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
            {t.response.brightnessMarquee}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
            {t.response.brightnessMarquee}
          </span>
        </div>
      </div>

      <div className="p-4 text-center">
        {/* 상단 액션 바: 좌측 상단 [← 처음으로], 우측 [인증 완료] 뱃지 */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handleBackToLogin}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors border border-gray-200"
            title={t.response.backToLogin}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-bold">{t.response.backToLogin}</span>
          </button>

          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#2C4FD0]/10 text-[#2C4FD0]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t.response.title}</span>
          </div>
        </div>

        <p className="text-xs text-gray-600 font-medium leading-relaxed mb-8 px-1">
          {t.response.subtitle}
        </p>

        <div className="w-full mx-auto flex flex-col items-center">
          {/* QR 코드 (하단 PIN 번호 너비만큼 꽉 참) */}
          <div className="w-full aspect-square mb-8 flex items-center justify-center">
            <QRCodeSVG
              value={qrPayload}
              size={320}
              level="H"
              includeMargin={false}
              className="w-full h-full"
            />
          </div>

          <div className="w-full mb-5">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
              {t.response.pinLabel}
            </span>
            <PinDisplay pin={pinCode} />
          </div>
        </div>

        {/* 2차 뎁스 안내 가이드 */}
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
