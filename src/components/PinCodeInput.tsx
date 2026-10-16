import React, { useState, useRef, useEffect } from 'react';

interface PinCodeInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  status?: 'default' | 'success' | 'error';
  id?: string;
  autoFocus?: boolean;
}

export const PinCodeInput: React.FC<PinCodeInputProps> = ({
  value,
  onChange,
  disabled = false,
  status = 'default',
  id,
  autoFocus = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  // 가장 최근에 입력되어 노출 중인 글자의 인덱스 (0~3 또는 null)
  const [visibleIndex, setVisibleIndex] = useState<number | null>(null);
  const prevLengthRef = useRef(value.length);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 글자가 새로 추가되었을 때: 방금 입력된 글자만 보이게 하고 이전 글자들은 * 처리
    if (value.length > prevLengthRef.current) {
      const newlyAddedIndex = value.length - 1;
      setVisibleIndex(newlyAddedIndex);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      // 1초 후 마지막 글자도 *로 마스킹
      timerRef.current = setTimeout(() => {
        setVisibleIndex(null);
      }, 1000);
    } else if (value.length < prevLengthRef.current) {
      // 삭제(백스페이스) 시에는 타이머 클리어 및 마스킹 유지
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setVisibleIndex(null);
    }

    prevLengthRef.current = value.length;
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    if (rawVal.length <= 4) {
      onChange(rawVal);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setVisibleIndex(null);
  };

  const handleBoxClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div
      className="relative cursor-pointer select-none w-full"
      onClick={handleBoxClick}
    >
      {/* 실제 키보드 입력값을 수신하는 투명 input */}
      <input
        ref={inputRef}
        id={id}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />

      {/* 4개의 개별 PIN 박스 (ㅁ ㅁ ㅁ ㅁ) */}
      <div className="flex items-center justify-between w-full">
        {[0, 1, 2, 3].map((index) => {
          const hasValue = index < value.length;
          const isCurrentActive = isFocused && index === value.length;
          const char = hasValue
            ? index === visibleIndex
              ? value[index] // 가장 최근에 입력한 글자 (숫자 그대로 표시)
              : '*'          // 이전 글자 (* 로 마스킹)
            : '';

          // 테두리 및 배경 상태 결정
          let borderClass = 'border-gray-200 bg-gray-50/70 text-gray-800';

          if (status === 'success') {
            borderClass = 'border-[#00E676] bg-emerald-50/30 text-gray-900';
          } else if (status === 'error') {
            borderClass = 'border-red-400 bg-rose-50/30 text-gray-900';
          } else if (isCurrentActive) {
            borderClass = 'border-brand-blue ring-2 ring-brand-blue/25 bg-white text-gray-900 shadow-sm';
          } else if (hasValue) {
            borderClass = 'border-gray-300 bg-white text-gray-900 shadow-2xs';
          }

          return (
            <div
              key={index}
              className={`w-14 h-14 sm:w-16 sm:h-14 rounded-xl border flex items-center justify-center transition-all duration-150 font-mono font-bold ${borderClass}`}
            >
              {hasValue ? (
                <span
                  className={`transition-all transform ${
                    char === '*'
                      ? 'text-2xl font-bold text-gray-700 select-none leading-none pt-1'
                      : 'text-xl font-bold text-gray-900'
                  }`}
                >
                  {char}
                </span>
              ) : isCurrentActive ? (
                // 현재 입력 대기 중인 빈 칸에는 깜빡이는 커서 바 표시
                <span className="w-0.5 h-5 bg-brand-blue animate-pulse rounded-full" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

