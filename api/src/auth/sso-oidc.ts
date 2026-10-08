import { createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify as verifySignature } from 'node:crypto'
import type { DirectoryUser } from './directory.types'

// B6.4: الدخول المؤسسي بـOIDC — القواعد النقية (من غير شبكة ولا قاعدة بيانات): الإعداد من البيئة، المعاملة الموقّعة (state وnonce وPKCE)،
// عنوان التفويض، تحقق الـID token (RS256 بمفتاح المزوّد)، وتحويل الهوية لشكل `DirectoryUser` عشان تدخل نفس مطابقة حساب الشركة.
// المزوّد بيثبت الهوية بس: لا دور ولا صلاحية ولا نطاق بييجي منه.

export const SSO_TX_COOKIE = 'hr_sso_tx'
export const SSO_TX_PATH = '/api/auth/login/sso'
export const SSO_TX_SECONDS = 600
export const SSO_CLOCK_SKEW_SECONDS = 60
export const SSO_LOGIN_CLAIMS = ['preferred_username', 'upn', 'email'] as const
export type SsoLoginClaim = (typeof SSO_LOGIN_CLAIMS)[number]
export const SSO_NOT_CONFIGURED = 'الدخول المؤسسي مش مضبوط على الخادم'
export const SSO_TX_INVALID = 'محاولة الدخول المؤسسي انتهت أو مش من المتصفح ده — ابدأ من شاشة الدخول تاني'
export const SSO_PROVIDER_FAILED = 'تعذّر إكمال الدخول من مزوّد الهوية — حاول تاني'
export const SSO_IDENTITY_REFUSED = 'حساب المؤسسة ده مش مسموح له بالدخول هنا — راجع الدعم الفني'

export interface SsoConfig { issuer: string; clientId: string; clientSecret: string; allowedDomains: string[]; loginClaim: SsoLoginClaim; label: string; redirectUri: string; allowInsecure: boolean }

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const base64url = (input: Buffer | string) => Buffer.from(input).toString('base64url')

/**
 * إعداد الـSSO من البيئة — null لو مش مضبوط (المسار مقفول). الإعداد الناقص أو الغلط = null برضه: مفيش دخول بإعداد نص نص.
 * عناوين http مسموحة بس بـ`SSO_OIDC_ALLOW_INSECURE=1` ومش في الإنتاج (مزوّد محلي في الاختبار).
 */
export function ssoConfig(env: Record<string, unknown> = process.env): SsoConfig | null {
  const issuer = text(env.SSO_OIDC_ISSUER).replace(/\/+$/, ''), clientId = text(env.SSO_OIDC_CLIENT_ID), clientSecret = text(env.SSO_OIDC_CLIENT_SECRET)
  const allowedDomains = text(env.SSO_OIDC_ALLOWED_DOMAINS).toLowerCase().split(',').map(item => item.trim()).filter(Boolean)
  const allowInsecure = text(env.SSO_OIDC_ALLOW_INSECURE) === '1' && env.NODE_ENV !== 'production'
  const loginClaim = (text(env.SSO_OIDC_LOGIN_CLAIM) || 'preferred_username') as SsoLoginClaim
  const frontend = text(env.FRONTEND_URL).replace(/\/+$/, '') || 'http://localhost:3000'
  if (!issuer || !clientId || !clientSecret || !allowedDomains.length) return null
  if (!allowedDomains.every(domain => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) || !(SSO_LOGIN_CLAIMS as readonly string[]).includes(loginClaim)) return null
  if (!secureUrl(issuer, allowInsecure)) return null
  return { issuer, clientId, clientSecret, allowedDomains, loginClaim, label: text(env.SSO_OIDC_LABEL).slice(0, 60) || 'الدخول بحساب المؤسسة', redirectUri: `${frontend}/login`, allowInsecure }
}

/** عنوان https صالح (أو http لو مسموح)، من غير اسم مستخدم وكلمة سر */
export function secureUrl(raw: unknown, allowInsecure: boolean): boolean {
  if (typeof raw !== 'string') return false
  try {
    const url = new URL(raw)
    return (url.protocol === 'https:' || (allowInsecure && url.protocol === 'http:')) && !url.username && !url.password
  } catch { return false }
}

// ===== المعاملة: state وnonce ومفتاح PKCE، موقّعة بسر الخادم وبعمر قصير =====
export interface SsoTransaction { state: string; nonce: string; verifier: string; expiresAt: number }
export function newSsoTransaction(nowSeconds: number, bytes: (size: number) => Buffer = randomBytes): SsoTransaction {
  return { state: base64url(bytes(24)), nonce: base64url(bytes(24)), verifier: base64url(bytes(32)), expiresAt: nowSeconds + SSO_TX_SECONDS }
}
const txMac = (payload: string, serverSecret: string) => createHmac('sha256', `sso-tx-v1:${serverSecret}`).update(payload).digest('base64url')
export function sealSsoTransaction(tx: SsoTransaction, serverSecret: string): string {
  const payload = base64url(JSON.stringify(tx))
  return `${payload}.${txMac(payload, serverSecret)}`
}
/** المعاملة من الـcookie: التوقيع صح (مقارنة ثابتة الزمن) ولسه في عمرها — وإلا null */
export function openSsoTransaction(sealed: unknown, serverSecret: string, nowSeconds: number): SsoTransaction | null {
  const parts = typeof sealed === 'string' ? sealed.split('.') : []
  if (parts.length !== 2) return null
  const given = Buffer.from(parts[1]), expected = Buffer.from(txMac(parts[0], serverSecret))
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const tx = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as SsoTransaction
    if (![tx.state, tx.nonce, tx.verifier].every(value => typeof value === 'string' && value.length >= 20) || !Number.isFinite(tx.expiresAt) || tx.expiresAt < nowSeconds) return null
    return tx
  } catch { return null }
}
/** الـstate الراجع بيطابق بتاع المعاملة؟ (مقارنة ثابتة الزمن) */
export function sameState(given: unknown, expected: string): boolean {
  if (typeof given !== 'string') return false
  const a = Buffer.from(given), b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
export const pkceChallenge = (verifier: string): string => createHash('sha256').update(verifier).digest('base64url')

/** عنوان صفحة دخول المزوّد (رمز التفويض + PKCE S256 + state + nonce) */
export function authorizationUrl(endpoint: string, config: SsoConfig, tx: SsoTransaction): string {
  const url = new URL(endpoint)
  for (const [key, value] of Object.entries({ response_type: 'code', client_id: config.clientId, redirect_uri: config.redirectUri, scope: 'openid profile email', state: tx.state, nonce: tx.nonce,
    code_challenge: pkceChallenge(tx.verifier), code_challenge_method: 'S256' })) url.searchParams.set(key, value)
  return url.toString()
}

/** قيمة Set-Cookie للمعاملة: HttpOnly وعلى مسار الـSSO بس وبعمرها (وعمر صفر = مسح) */
export function ssoCookieHeader(value: string, secure: boolean, maxAgeSeconds: number): string {
  return [`${SSO_TX_COOKIE}=${value}`, `Path=${SSO_TX_PATH}`, 'HttpOnly', 'SameSite=Strict', ...(secure ? ['Secure'] : []), `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`].join('; ')
}

// ===== الـID token =====
export interface Jwk { kty?: string; kid?: string; use?: string; alg?: string; n?: string; e?: string }
export class SsoTokenError extends Error {
  constructor(readonly code: string) { super(code) }
}
const decodePart = (part: string): Record<string, unknown> => {
  const parsed = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new SsoTokenError('MALFORMED')
  return parsed as Record<string, unknown>
}

/**
 * تحقق الـID token: RS256 بس (ولا `none` ولا HS)، توقيع بمفتاح RSA من مفاتيح المزوّد بنفس الـkid، والمزوّد والتطبيق والصلاحية والـnonce.
 * بيرجّع الادعاءات، أو بيرمي `SsoTokenError` بكود السبب (للسجل بس — المستخدم بياخد رسالة واحدة).
 */
export function verifyIdToken(token: unknown, keys: readonly Jwk[], expected: { issuer: string; clientId: string; nonce: string }, nowSeconds: number): Record<string, unknown> {
  const parts = typeof token === 'string' ? token.split('.') : []
  if (parts.length !== 3 || parts.some(part => !part)) throw new SsoTokenError('MALFORMED')
  let header: Record<string, unknown>, claims: Record<string, unknown>
  try { header = decodePart(parts[0]); claims = decodePart(parts[1]) } catch { throw new SsoTokenError('MALFORMED') }
  if (header.alg !== 'RS256') throw new SsoTokenError('ALGORITHM')
  const key = keys.find(candidate => candidate.kty === 'RSA' && typeof candidate.kid === 'string' && candidate.kid === header.kid && (candidate.use === undefined || candidate.use === 'sig'))
  if (!key || !key.n || !key.e) throw new SsoTokenError('UNKNOWN_KEY')
  let valid = false
  try {
    valid = verifySignature('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({ key: { kty: 'RSA', n: key.n, e: key.e }, format: 'jwk' }), Buffer.from(parts[2], 'base64url'))
  } catch { valid = false }
  if (!valid) throw new SsoTokenError('SIGNATURE')
  if (claims.iss !== expected.issuer) throw new SsoTokenError('ISSUER')
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (!audience.includes(expected.clientId) || (audience.length > 1 && claims.azp !== expected.clientId) || (claims.azp !== undefined && claims.azp !== expected.clientId)) throw new SsoTokenError('AUDIENCE')
  if (typeof claims.exp !== 'number' || claims.exp + SSO_CLOCK_SKEW_SECONDS < nowSeconds) throw new SsoTokenError('EXPIRED')
  if (typeof claims.iat !== 'number' || claims.iat - SSO_CLOCK_SKEW_SECONDS > nowSeconds) throw new SsoTokenError('ISSUED_IN_FUTURE')
  if (typeof claims.nbf === 'number' && claims.nbf - SSO_CLOCK_SKEW_SECONDS > nowSeconds) throw new SsoTokenError('NOT_YET_VALID')
  if (typeof claims.nonce !== 'string' || !sameState(claims.nonce, expected.nonce)) throw new SsoTokenError('NONCE')
  if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255) throw new SsoTokenError('SUBJECT')
  return claims
}

/** المعرّف الثابت للهوية في عمود `domainObjectGuid`: بصمة (المزوّد + sub) ببادئة — مابيتصادمش مع معرّف الدليل (GUID) */
export const ssoObjectId = (issuer: string, subject: string): string => `sso:${createHash('sha256').update(`${issuer}\n${subject}`).digest('hex').slice(0, 56)}`

/**
 * الادعاءات ← هوية بشكل `DirectoryUser` (عشان تدخل `resolveUser` القايم). البريد اللي بيتطابق بيه الموظف من الخانة المضبوطة بس:
 * `preferred_username`/`upn` (يتحكم فيهم مدير المؤسسة)، أو `email` بشرط `email_verified === true`. ونطاقه لازم يكون مسموح.
 */
export function ssoIdentity(claims: Record<string, unknown>, config: Pick<SsoConfig, 'issuer' | 'allowedDomains' | 'loginClaim'>): DirectoryUser {
  const login = text(claims[config.loginClaim]).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(login) || login.length > 200) throw new SsoTokenError('LOGIN_CLAIM')
  if (config.loginClaim === 'email' && claims.email_verified !== true) throw new SsoTokenError('EMAIL_UNVERIFIED')
  const domain = login.slice(login.lastIndexOf('@') + 1)
  if (!config.allowedDomains.includes(domain)) throw new SsoTokenError('DOMAIN')
  // Google Workspace: نطاق المؤسسة (hd) لو موجود لازم يكون مسموح كمان
  if (claims.hd !== undefined && !config.allowedDomains.includes(text(claims.hd).toLowerCase())) throw new SsoTokenError('DOMAIN')
  const employeeId = text(claims.employeeid ?? claims.employee_id).slice(0, 60)
  return { objectGuid: ssoObjectId(config.issuer, String(claims.sub)), sAMAccountName: login.slice(0, login.lastIndexOf('@')), userPrincipalName: login, mail: login,
    displayName: text(claims.name).slice(0, 200) || null, employeeId: employeeId || null, disabled: false }
}
