import { useState } from 'react';
import { Mail, Lock, LogIn } from 'lucide-react';

export default function App() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^@\s]{3,}@[^@\s]{2,}\.[^@\s]{2,}$/;
    const pinRegex = /^\d{4}$/;

    if (!emailRegex.test(email)) {
      setError('이메일 형식을 확인해주세요. (예: abc@de.fg)');
      return;
    }
    if (!pinRegex.test(pin)) {
      setError('비밀번호는 4자리 숫자여야 합니다.');
      return;
    }

    setError('');
    alert('로그인 성공!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <LogIn className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">환영합니다</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="이메일 (abc@de.fg)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="password"
              placeholder="PIN 번호 (숫자 4자리)"
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                if (val.length <= 4) setPin(val);
              }}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all tracking-widest"
            />
          </div>

          {error && <p className="text-red-500 text-sm pl-1">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors"
          >
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}