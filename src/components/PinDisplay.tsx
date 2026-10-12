import React from 'react';

interface PinDisplayProps {
  pin: string; // 6자리 숫자 문자열
}

export const PinDisplay: React.FC<PinDisplayProps> = ({ pin }) => {
  // 6자리 맞춤 (부족하면 _ 로 채움)
  const paddedPin = (pin || '').padEnd(6, '_').slice(0, 6);
  const firstGroup = paddedPin.slice(0, 3).split('');
  const secondGroup = paddedPin.slice(3, 6).split('');

  const renderSlot = (char: string, index: number) => {
    const isPlaceholder = char === '_';
    return (
      <div
        key={index}
        className={`w-10.5 h-16 flex items-center justify-center rounded-xl font-mono text-4xl font-bold transition-all ${
          isPlaceholder
            ? 'bg-gray-100 text-gray-300 border border-dashed border-gray-300'
            : 'bg-white text-gray-900 border border-[#2C4FD0] shadow-sm shadow-[#2C4FD0]/15 ring-2 ring-[#2C4FD0]/10'
        }`}
      >
        {isPlaceholder ? (
          <span className="opacity-40 select-none pb-1">_</span>
        ) : (
          <span className="tracking-tight text-[#2C4FD0]">{char}</span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* 6자리 PIN 디스플레이 (_ _ _   _ _ _) 모바일 최적화 */}
      <div className="flex items-center justify-center gap-1.5 select-all w-full py-1">
        {/* 앞 3자리 */}
        <div className="flex items-center gap-1.5">
          {firstGroup.map((char, idx) => renderSlot(char, idx))}
        </div>

        {/* 3자리와 3자리 사이 구분 바 */}
        <div className="w-2.5 h-1 bg-gray-300 rounded-full shrink-0" />

        {/* 뒤 3자리 */}
        <div className="flex items-center gap-1.5">
          {secondGroup.map((char, idx) => renderSlot(char, idx + 3))}
        </div>
      </div>
    </div>
  );
};
