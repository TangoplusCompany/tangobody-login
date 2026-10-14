/**
 * ============================================================================
 * [Tangobody] 인증 관련 API 서비스 (Auth Service)
 * ============================================================================
 * 
 * 💡 [사용자 설정 가이드]
 * 1. BASE_URL: 백엔드 서버 주소를 입력하세요. (예: 'https://gym.tangoplus.co.kr/user_api/v1')
 * 2. ENDPOINTS: 백엔드 개발자와 맞춘 실제 로그인/회원가입 엔드포인트 경로를 지정하세요.
 * 3. USE_MOCK: 
 *    - true  : 실제 서버 없이 더미(Mock) 응답으로 동작 (현재 개발/테스트용)
 *    - false : 실제 백엔드 서버로 실제 HTTP POST 요청을 보냄
 * 4. ENABLE_ENCRYPTION:
 *    - true  : 전송 전 바디(Body) 데이터를 암호화하여 전송 (보안 요구 시)
 *    - false : 일반 표준 JSON 형태로 전송 (HTTPS 통신 시 기본 암호화됨)
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. 서버 설정 (사용자 수정 영역)
// ----------------------------------------------------------------------------
export const API_CONFIG = {
  // 백엔드 기본 서버 주소 (환경변수 또는 직접 입력)
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://gym.tangoplus.co.kr/user_api/v1',

  // API 엔드포인트 URL 경로
  ENDPOINTS: {
    LOGIN: '/login-foreign-member',        
    REGISTER: '/register-foreign-member',   
  },

  // 더미(Mock) 모드 사용 여부 (백엔드 완성 시 false로 변경하세요!)
  USE_MOCK: false,

  // 클라이언트 단 페이로드 암호화 여부
  ENABLE_ENCRYPTION: false,
};

// ----------------------------------------------------------------------------
// 2. 요청 및 응답 타입 정의 (DTO)
// ----------------------------------------------------------------------------

/** 로그인 요청 데이터 */
export interface LoginRequest {
  email: string;
  pin_password: string; // 4자리 숫자 PIN
}

/** 회원가입 요청 데이터 */
export interface RegisterRequest {
  email: string;
  pin_password: string;        
  birthday: string;    
  gender: '남성' | '여성'; 
  mobile?: string;
  first_name : string;
  last_name :string;
}

/** 
 * 서버로부터 돌려받는 최종 인증 결과 응답
 * 이 데이터가 그대로 AuthProvider의 sessionStorage에 저장되고 ResponsePage에 렌더링됩니다.
 */
export interface AuthResponse {
  six_digit_code: string;        // 키오스크/응답 화면에 크게 보여줄 6자리 PIN 번호
  user_sn: string; 
  user_uuid: string;   
  pin?: string;                  // 하위 호환성을 위해 six_digit_code 복사
  email?: string;
}

/**
 * 로그인/공통 실패 시 서버 에러 응답 구조
 */
export interface LoginErrorResponse {
  status: 401 | 500 | number;
  success: false;
  message: string[] | string[][];
  data: unknown[];
}

/**
 * 회원가입 실패 시 서버 에러 응답 구조
 * 1. 400: 필수 파라미터 부재 및 잘못된 입력 포맷
 * 2. 409: 이미 등록된 이메일
 * 3. 500: 그 외 서버 에러
 */
export interface RegisterErrorResponse {
  status: 400 | 409 | 500 | number;
  success: false;
  message: string[] | string[][];
  data: unknown[];
}

export type RegisterErrorStatus = 400 | 409 | 500;

/**
 * API 기본 에러 클래스
 */
export class ApiError extends Error {
  status: number;
  serverMessages?: string[];

  constructor(status: number, message: string, serverMessages?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.serverMessages = serverMessages;
  }
}

/**
 * 회원가입 전용 API 에러 클래스
 */
export class RegisterApiError extends ApiError {
  constructor(status: number, message: string, serverMessages?: string[]) {
    super(status, message, serverMessages);
    this.name = 'RegisterApiError';
  }
}

// ----------------------------------------------------------------------------
// 3. 더미 암호화 헬퍼 함수
// ----------------------------------------------------------------------------
/**
 * 페이로드 암호화 함수 (더미 예시)
 */
function encryptPayload<T>(data: T): string {
  const jsonString = JSON.stringify(data);
  if (typeof btoa !== 'undefined') {
    return btoa(encodeURIComponent(jsonString));
  }
  return jsonString;
}

/**
 * 6자리 랜덤 숫자 PIN 생성기 (더미 응답용)
 */
function generateDummy6DigitPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 중첩 배열(string[][] | string[]) 형태의 에러 메시지를 1차원 string[] 배열로 정규화
 */
function normalizeServerMessages(rawMessage: unknown): string[] {
  if (Array.isArray(rawMessage)) {
    return rawMessage.flat(Infinity).map((m: unknown) => String(m));
  }
  if (typeof rawMessage === 'string' && rawMessage.trim()) {
    return [rawMessage];
  }
  return [];
}

// ----------------------------------------------------------------------------
// 4. 실제 API 호출 서비스 함수
// ----------------------------------------------------------------------------

/**
 * [API 1] 로그인 요청 (POST)
 */
export async function loginApi(params: LoginRequest): Promise<AuthResponse> {
  // 1) 더미(Mock) 모드일 경우: 가상 네트워크 지연 후 더미 응답 반환
  if (API_CONFIG.USE_MOCK) {
    console.log('[Mock API] 로그인 요청 파라미터:', params);
    await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms 지연 시뮬레이션

    if (params.email === 'error401@test.com' || params.pin_password === '0000') {
      throw new ApiError(401, 'Wrong email or password', ['Wrong email or password']);
    }
    if (params.email === 'error500@test.com') {
      throw new ApiError(500, 'Server Error On Kiosk Login', ['Server Error On Kiosk Login']);
    }

    const dummyCode = generateDummy6DigitPin();
    return {
      six_digit_code: dummyCode,
      pin: dummyCode,
      user_sn: '1',
      user_uuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      email: params.email,
    };
  }

  // 2) 실제 서버 통신 모드: HTTP POST fetch 호출
  const requestBody = API_CONFIG.ENABLE_ENCRYPTION
    ? { encryptedData: encryptPayload(params) }
    : params;

  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error';
    throw new ApiError(500, message, [message]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let responseData: any = null;
  try {
    responseData = await response.json();
  } catch {
    // ignore
  }

  const statusCode: number = Number(responseData?.status) || response.status;
  const isSuccess: boolean =
    response.ok &&
    responseData?.success !== false &&
    statusCode >= 200 &&
    statusCode < 300;

  if (!isSuccess) {
    const serverMessages = normalizeServerMessages(responseData?.message);

    throw new ApiError(
      statusCode,
      serverMessages[0] || `Login failed with status ${statusCode}`,
      serverMessages
    );
  }

  const rawItem = Array.isArray(responseData?.data)
    ? responseData.data[0] || responseData
    : responseData?.data || responseData;

  const sixDigitCode = String(rawItem?.six_digit_code || rawItem?.pin || '');

  return {
    six_digit_code: sixDigitCode,
    pin: sixDigitCode,
    user_sn: String(rawItem?.user_sn ?? ''),
    user_uuid: String(rawItem?.user_uuid ?? ''),
    email: params.email,
  };
}

/**
 * [API 2] 회원가입 요청 (POST)
 */
export async function registerApi(params: RegisterRequest): Promise<AuthResponse> {
  // 1) 더미(Mock) 모드일 경우: 가상 네트워크 지연 후 더미 응답 반환
  if (API_CONFIG.USE_MOCK) {
    console.log('[Mock API] 회원가입 요청 파라미터:', params);
    await new Promise((resolve) => setTimeout(resolve, 600)); // 600ms 지연 시뮬레이션

    if (params.email === 'exists@test.com') {
      throw new RegisterApiError(409, 'Email already exists', ['Email already exists']);
    }
    if (params.email === 'badrequest@test.com') {
      throw new RegisterApiError(400, 'The Pin password is required', [
        'The Pin password is required',
        'The Birthday is not valid date format',
      ]);
    }
    if (params.email === 'error500@test.com') {
      throw new RegisterApiError(500, 'Server Error On Registering Foreign Members', [
        'Server Error On Registering Foreign Members',
      ]);
    }

    const dummyCode = generateDummy6DigitPin();
    return {
      six_digit_code: dummyCode,
      pin: dummyCode,
      user_sn: '1',
      user_uuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      email: params.email,
    };
  }

  // 2) 실제 서버 통신 모드: HTTP POST fetch 호출
  const requestBody = API_CONFIG.ENABLE_ENCRYPTION
    ? { encryptedData: encryptPayload(params) }
    : params;

  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error';
    throw new RegisterApiError(500, message, [message]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let responseData: any = null;
  try {
    responseData = await response.json();
  } catch {
    // ignore
  }

  const statusCode: number = Number(responseData?.status) || response.status;
  const isSuccess: boolean =
    response.ok &&
    responseData?.success !== false &&
    statusCode >= 200 &&
    statusCode < 300;

  if (!isSuccess) {
    const serverMessages = normalizeServerMessages(responseData?.message);

    throw new RegisterApiError(
      statusCode,
      serverMessages[0] || `Register failed with status ${statusCode}`,
      serverMessages
    );
  }

  const rawItem = Array.isArray(responseData?.data)
    ? responseData.data[0] || responseData
    : responseData?.data || responseData;

  const sixDigitCode = String(rawItem?.six_digit_code || rawItem?.pin || '');

  return {
    six_digit_code: sixDigitCode,
    pin: sixDigitCode,
    user_sn: String(rawItem?.user_sn ?? ''),
    user_uuid: String(rawItem?.user_uuid ?? ''),
    email: params.email,
  };
}

/**
 * 기존 코드와의 호환성을 위한 authApi 네임스페이스 객체
 */
export const authApi = {
  login: loginApi,
  register: registerApi,
};
