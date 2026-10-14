import React from 'react';
import { useLocation } from 'react-router-dom';
import { LanguageSelector } from './LanguageSelector';

export const Header: React.FC = () => {
  const location = useLocation();
  const showLogo = location.pathname === '/response';

  return (
    <header className="w-full max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
      <div>
        {showLogo && (
          <div className="flex items-center gap-2.5">
            <img
              src="/logo_color.png"
              alt="Tangobody Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="text-xl font-bold tracking-tight text-gray-900">
              Tangobody
            </span>
          </div>
        )}
      </div>

      <div>
        <LanguageSelector />
      </div>
    </header>
  );
};
