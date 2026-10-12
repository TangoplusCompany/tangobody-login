export interface AuthResponse {
  user_uuid: string; // 예: "3f8b8a92-2993-4a12-9c9e-56e87fbb0241"
  pin: string;       // 6자리 숫자, 예: "849201"
  email: string;
  createdAt: string;
}

export interface LoginParams {
  email: string;
  pin: string; // 4자리 PIN
}

export interface RegisterParams {
  email: string;
  pin: string; // 4자리 PIN
  birthDate: string; // 8자리 생년월일 (YYYYMMDD)
  countryCode?: string;
  phoneNumber?: string;
}

/**
 * 범용 고유 식별자(UUID v4) 생성 함수
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 6자리 숫자 PIN 생성 함수 (100000 ~ 999999)
 */
function generate6DigitPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const authApi = {
  /**
   * 로그인 API 호출 (미구현 시 Mock 응답 반환)
   */
  async login(params: LoginParams): Promise<AuthResponse> {
    if (API_BASE_URL) {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        throw new Error(`Login failed with status: ${res.status}`);
      }
      return (await res.json()) as AuthResponse;
    }

    // Mock API 시뮬레이션: 네트워크 대기 시간 (500ms)
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      user_uuid: generateUUID(),
      pin: generate6DigitPin(),
      email: params.email,
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * 회원가입 API 호출 (미구현 시 Mock 응답 반환)
   */
  async register(params: RegisterParams): Promise<AuthResponse> {
    if (API_BASE_URL) {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        throw new Error(`Register failed with status: ${res.status}`);
      }
      return (await res.json()) as AuthResponse;
    }

    // Mock API 시뮬레이션: 네트워크 대기 시간 (600ms)
    await new Promise((resolve) => setTimeout(resolve, 600));

    return {
      user_uuid: generateUUID(),
      pin: generate6DigitPin(),
      email: params.email,
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * PIN 및 QR 재발급 API (시뮬레이션)
   */
  async regeneratePin(userUuid: string, email: string): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      user_uuid: userUuid || generateUUID(),
      pin: generate6DigitPin(),
      email: email,
      createdAt: new Date().toISOString(),
    };
  },
};

