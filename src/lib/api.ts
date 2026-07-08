// طبقة الاتصال بالباك إند — مصدر واحد لكل نداءات الـ API
// التوكن يُحفظ في localStorage (تذكرني) أو sessionStorage (جلسة فقط)

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'

const TOKEN_KEY = 'hr_access_token'
const USER_KEY = 'hr_current_user'

export interface CurrentUser {
  id: number
  email: string
  displayName: string
  role: string
  branchId: number | null
  employeeId: number | null
}

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return (
    localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
  )
}

export const getCurrentUser = (): CurrentUser | null => {
  if (typeof window === 'undefined') return null
  const raw =
    localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CurrentUser
  } catch {
    return null
  }
}

export const saveSession = (
  token: string,
  user: CurrentUser,
  remember: boolean
) => {
  const store = remember ? localStorage : sessionStorage
  store.setItem(TOKEN_KEY, token)
  store.setItem(USER_KEY, JSON.stringify(user))
}

export const clearSession = () => {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(TOKEN_KEY)
    store.removeItem(USER_KEY)
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

// نداء عام — يضيف التوكن تلقائياً ويرمي ApiError برسالة السيرفر
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    let message = `خطأ في الاتصال (${res.status})`
    try {
      const body = await res.json()
      message = Array.isArray(body.message)
        ? body.message.join('، ')
        : (body.message ?? message)
    } catch {
      /* الرد ليس JSON */
    }
    throw new ApiError(res.status, message)
  }

  return res.json() as Promise<T>
}

// ===== Auth =====
export interface LoginResponse {
  accessToken: string
  user: CurrentUser
}

export const login = (email: string, password: string) =>
  apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
