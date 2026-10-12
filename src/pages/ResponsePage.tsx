import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { PinDisplay } from '../components/PinDisplay';

export const ResponsePage: React.FC = () => {
  const { t } = useLanguage();
  const { authData, clearAuth } = useAuth();
  const navigate = useNavigate();

  // 세션 데이터가 없을 경우 기본값 제공 (테스트 및 직접 접근 대비)
  const currentData = authData || {
    user_uuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    pin: '849201',
    email: 'user@tangobody.com',
    createdAt: new Date().toISOString(),
  };

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

  // QR 코드에 담길 데이터
  const qrPayload = JSON.stringify({
    user_uuid: currentData.user_uuid,
    pin: currentData.pin,
    email: currentData.email,
  });

  return (
    // 모바일 전용 뷰 (반응형 분기 없이 어떤 스마트폰이든 최적의 비율로 고정)
    <div className="w-full max-w-[390px] mx-auto bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      {/* 1. 상단 무한 롤링 배너 (노란색 톤, 스캔 실패 시 밝기 최대 안내) */}
      <div className="relative w-full bg-amber-50 border-b border-amber-200/80 overflow-hidden py-2">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-amber-50 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-amber-50 to-transparent z-10" />

        <div className="animate-marquee flex items-center gap-8 whitespace-nowrap text-xs font-semibold text-amber-900 select-none">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            {t.response.brightnessMarquee}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            {t.response.brightnessMarquee}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            {t.response.brightnessMarquee}
          </span>
        </div>
      </div>

      <div className="p-5 text-center">
        {/* 상단 액션 바: 좌측 상단 [← 처음으로], 우측 [인증 완료] 뱃지 */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handleBackToLogin}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors border border-gray-200"
            title={t.response.backToLogin}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.response.backToLogin}</span>
          </button>

          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#2C4FD0]/10 text-[#2C4FD0]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t.response.title}</span>
          </div>
        </div>

        {/* 상단 안내 문구 */}
        <p className="text-xs text-gray-600 font-medium leading-relaxed mb-4 px-1">
          {t.response.subtitle}
        </p>

        {/* 2차 뎁스 직관 노출: 불필요한 중첩 박스를 모두 없애고 QR 코드가 시원하게 노출 */}
        <div className="flex justify-center mb-3">
          <QRCodeSVG
            value={qrPayload}
            size={210}
            level="H"
            includeMargin={true}
            className="w-52 h-52 drop-shadow-xs"
          />
        </div>

        {/* 2차 뎁스 직관 노출: QR 코드 바로 아래에 6자리 PIN이 시원하게 밀착 */}
        <div className="mb-5 w-full">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            {t.response.pinLabel}
          </span>
          <PinDisplay pin={currentData.pin} />
        </div>

        {/* 2차 뎁스 안내 가이드 (2열 그리드 플랫 카드) */}
        <div className="flex flex-col gap-2.5 text-center pt-3 border-t border-gray-100">
          {/* 방법 1: QR 스캔 */}
          <div className="bg-slate-50/80 rounded-2xl p-2.5 border border-gray-100 flex flex-col items-center">
            <div className="w-full h-45 rounded-xl bg-white flex items-center justify-center p-1.5 mb-2 border border-gray-100/90 shadow-2xs">
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
            <div className="w-full h-45 rounded-xl bg-white flex items-center justify-center p-1.5 mb-2 border border-gray-100/90 shadow-2xs">
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
