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
    REGISTER: '/register-member',   
    QR_CODE_STATUS: (user_sn: string | number) => `/qr-code-status/users/${user_sn}`,
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
  country_iso?: string; // 국가 식별 코드 (예: KR, US, AZ 등 2글자)
  first_name: string;
  last_name: string;
}

/** 
 * 서버로부터 돌려받는 최종 인증 결과 응답
 * 이 데이터가 그대로 AuthProvider의 sessionStorage에 저장되고 ResponsePage에 렌더링됩니다.
 */
export interface AuthResponse {
  six_digit_code: string;        // 키오스크/응답 화면에 크게 보여줄 6자리 PIN 번호
  reg_date: string;              // "2024-09-04 14:11:15"
  end_date: string;
  user_sn?: string;              // 사용자 식별 번호 (QR 상태 확인용)
}

/** QR 코드 상태 확인 요청 데이터 */
export interface QrCodeStatusRequest {
  user_id: string;
  user_password: string;
}

/** QR 코드 상태 확인 응답 데이터 */
export interface QrCodeStatusResult {
  isCompleted: boolean; // 403(status=3)인 경우 true, 200(status=1)인 경우 false
  status: number;
  message?: string[];
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
 * 현재 시각을 "YYYY-MM-DD HH:mm:ss" 형식으로 반환 (더미 및 기본값)
 */
export function formatNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * 시작 시각 또는 현재 시각 기준으로 3분 후를 "YYYY-MM-DD HH:mm:ss" 형식으로 반환 (더미 및 기본값)
 */
export function formatEndDate(startDateStr?: string): string {
  let d: Date;
  if (startDateStr) {
    const match = startDateStr.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
      const [, y, m, day, hh, mm, ss] = match.map(Number);
      d = new Date(y, m - 1, day, hh, mm, ss);
    } else {
      d = new Date();
    }
  } else {
    d = new Date();
  }
  d.setMinutes(d.getMinutes() + 3);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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

  const sixDigitCode = String(rawItem?.six_digit_code || '');
  const regDate = String(rawItem?.reg_date || formatNow());
  const endDate = String(rawItem?.end_date || formatEndDate(regDate));
  const rawUserSn = rawItem?.user_sn ?? responseData?.user_sn;
  const userSn = rawUserSn !== undefined && rawUserSn !== null
    ? String(rawUserSn)
    : undefined;

  console.log('[Auth API] Login parsed response:', { sixDigitCode, regDate, endDate, userSn });

  return {
    six_digit_code: sixDigitCode,
    reg_date: regDate,
    end_date: endDate,
    user_sn: userSn,
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
    const nowStr = formatNow();
    return {
      six_digit_code: dummyCode,
      reg_date: nowStr,
      end_date: formatEndDate(nowStr),
      user_sn: '1',
    };
  }

  // 2) 실제 서버 통신 모드: HTTP POST fetch 호출
  // mobile이 없을 경우 mobile과 country_iso 필드를 함께 제외하여 전송
  const sanitizedParams: Record<string, unknown> = { ...params };
  if (!sanitizedParams.mobile) {
    delete sanitizedParams.mobile;
    delete sanitizedParams.country_iso;
  }

  const requestBody = API_CONFIG.ENABLE_ENCRYPTION
    ? { encryptedData: encryptPayload(sanitizedParams) }
    : sanitizedParams;

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

  const sixDigitCode = String(rawItem?.six_digit_code || '');
  const regDate = String(rawItem?.reg_date || formatNow());
  const endDate = String(rawItem?.end_date || formatEndDate(regDate));
  const userSn = rawItem?.user_sn !== undefined && rawItem?.user_sn !== null
    ? String(rawItem.user_sn)
    : undefined;

  return {
    six_digit_code: sixDigitCode,
    reg_date: regDate,
    end_date: endDate,
    user_sn: userSn,
  };
}

/**
 * [API 3] QR 코드 스캔 상태 확인 요청 (POST /qr-code-status/users/{user_sn})
 * 
 * 응답 규격:
 * 1. 계속 사용 가능한 경우 (status = 1 또는 HTTP 200)
 *    { "status": 200, "success": true, "message": ["QR code still in use"] }
 *    -> isCompleted: false
 * 
 * 2. 사용 완료/스캔 완료인 경우 (status = 3 또는 HTTP 403)
 *    { "status": 403, "success": false, "message": ["QR code no longer in use"], "data": [] }
 *    -> isCompleted: true
 */
export async function checkQrCodeStatusApi(
  userSn: string | number,
): Promise<QrCodeStatusResult> {
  if (API_CONFIG.USE_MOCK) {
    return {
      isCompleted: false,
      status: 200,
      message: ['QR code still in use'],
    };
  }

  const endpointPath = typeof API_CONFIG.ENDPOINTS.QR_CODE_STATUS === 'function'
    ? API_CONFIG.ENDPOINTS.QR_CODE_STATUS(userSn)
    : `/qr-code-status/users/${userSn}`;

  const url = `${API_CONFIG.BASE_URL}${endpointPath}`;

  console.log('[QR Status Check] Requesting (GET):', url);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (err: unknown) {
    console.warn('[QR Status Check] Network error:', err);
    return { isCompleted: false, status: 0 };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let responseData: any = null;
  try {
    responseData = await response.json();
  } catch {
    // ignore
  }

  console.log('[QR Status Check] Response:', response.status, responseData);

  const statusCode: number = Number(responseData?.status) || response.status;
  const messages = normalizeServerMessages(responseData?.message);

  // 1) 403 또는 status=3, 또는 메시지에 "no longer in use": 사용 완료 (스캔 완료)
  const isCompleted =
    statusCode === 403 ||
    statusCode === 3 ||
    response.status === 403 ||
    messages.some((m) => typeof m === 'string' && m.toLowerCase().includes('no longer in use'));

  if (isCompleted) {
    console.log('[QR Status Check] => COMPLETED! (status:', statusCode, ')');
    return {
      isCompleted: true,
      status: statusCode,
      message: messages,
    };
  }

  // 2) 200 또는 status=1: 아직 스캔 전, 계속 사용 가능
  if (statusCode === 200 || statusCode === 1 || (response.ok && responseData?.success === true)) {
    return {
      isCompleted: false,
      status: statusCode,
      message: messages,
    };
  }

  return {
    isCompleted: false,
    status: statusCode,
    message: messages,
  };
}

/**
 * 기존 코드와의 호환성을 위한 authApi 네임스페이스 객체
 */
export const authApi = {
  login: loginApi,
  register: registerApi,
  checkQrCodeStatus: checkQrCodeStatusApi,
};
