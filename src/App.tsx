import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageProvider';
import { AuthProvider } from './context/AuthProvider';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResponsePage } from './pages/ResponsePage';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-blue-500 selection:text-white">
            {/* 상단 공통 헤더 (로고 & 언어 감지/선택기) */}
            <Header />

            {/* 페이지 메인 콘텐츠 */}
            <main className="flex-1 flex items-center justify-center px-4 pt-4 pb-8">
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<RegisterPage />} />
                <Route path="/response" element={<ResponsePage />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </main>

            {/* 하단 푸터 */}
            <footer className="py-4 text-center text-xs text-gray-400">
              © {new Date().getFullYear()} Tangobody Inc. All rights reserved.
            </footer>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}