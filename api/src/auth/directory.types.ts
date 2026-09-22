// ===== الدخول بحساب الشركة (Active Directory عادي على الشبكة — بلا Entra ولا ADFS) =====
// الواجهة الصغيرة اللي الخدمة بتقف وراها: الاختبارات بتستبدل authenticate بدليل مزيّف فمفيش اتصال حقيقي.
// المجال بيثبت الهوية بس. الأدوار والصلاحيات ونطاق الفروع بيفضلوا من جداولنا — ممنوع نقرأ مجموعات AD
// أو نمنح أي حاجة منها (قرار المالك 22 سبتمبر).

/** بيانات الحساب كما قرأناها من المجال بعد نجاح الـbind. */
export interface DirectoryUser {
  /** objectGUID بصيغته النصية — المعرّف الثابت: إعادة التسمية أو تغيير البريد مابتكسرهوش */
  objectGuid: string
  sAMAccountName: string
  userPrincipalName: string
  /** صندوق البريد من AD — منه بتتبعت رسالة رمز التحقق (مش من نسختنا) */
  mail: string | null
  displayName: string | null
  /** خاصية employeeID لو الـIT عبّاها — تُطابَق بكود الموظف عندنا */
  employeeId: string | null
  /** userAccountControl & 2 — حساب متوقف في المجال */
  disabled: boolean
}

/** سبب رفض الدخول بحساب المجال — كل سبب برسالته العربية، والتفاصيل التقنية تفضل في سجل الخادم. */
export type DirectoryFailureCode =
  // المجال مش مضبوط في .env (المسار مقفول أصلًا)
  | 'NOT_CONFIGURED'
  // اسم المستخدم أو كلمة المرور غلط (bind فشل) — أو كلمة مرور فاضية (bind بلا كلمة = ربط مجهول)
  | 'INVALID_CREDENTIALS'
  // الـbind نجح لكن مالقيناش الحساب في الدليل (base DN غلط أو الحساب برّه النطاق)
  | 'NOT_FOUND_IN_DIRECTORY'
  // الحساب متوقف في المجال
  | 'ACCOUNT_DISABLED'
  // الخادم مش راد/شبكة/شهادة — مش خطأ في بيانات المستخدم
  | 'DIRECTORY_UNAVAILABLE'

export const DIRECTORY_FAILURE_MESSAGES: Record<DirectoryFailureCode, string> = {
  NOT_CONFIGURED: 'الدخول بحساب الشركة غير مضبوط على الخادم — ادخل بالبريد وكلمة المرور',
  INVALID_CREDENTIALS: 'اسم المستخدم أو كلمة المرور في حساب الشركة غير صحيحة',
  NOT_FOUND_IN_DIRECTORY: 'الحساب مش موجود في دليل الشركة — راجع الدعم الفني',
  ACCOUNT_DISABLED: 'حساب الشركة متوقف — راجع الدعم الفني',
  DIRECTORY_UNAVAILABLE: 'تعذّر الوصول لخادم دليل الشركة — جرّب الدخول بالبريد وكلمة المرور أو راجع الدعم الفني',
}

/** خطأ بسبب مُصنَّف: الرسالة العربية للمستخدم، وdetail للسجل (بلا أي كلمة مرور). */
export class DirectoryAuthError extends Error {
  constructor(
    readonly code: DirectoryFailureCode,
    readonly detail?: string
  ) {
    super(DIRECTORY_FAILURE_MESSAGES[code])
    this.name = 'DirectoryAuthError'
  }
}

/** الواجهة اللي auth.service بيتكلم بيها — الاختبار بيحط مكانها دليل مزيّف. */
export interface DirectoryProvider {
  /** المجال مضبوط في .env؟ false = المسار مقفول والواجهة مابتعرضهوش */
  isConfigured(): boolean
  /** يتحقق من كلمة المرور على المجال ويرجّع خصائص الحساب — يرمي DirectoryAuthError لأي رفض */
  authenticate(username: string, password: string): Promise<DirectoryUser>
}

/** إعدادات المجال من .env — كلها نصوص بسيطة، والباسورد مابيطلعش من هنا أبدًا. */
export interface DirectoryConfig {
  enabled: boolean
  host: string
  port: number
  ldaps: boolean
  /** شهادة الخادم الموقّعة داخليًا: false = مانتحققش منها (تحذير عند الإقلاع) */
  rejectUnauthorized: boolean
  baseDn: string
  upnSuffix: string
  bindDn: string
  bindPassword: string
  timeoutMs: number
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const flag = (value: unknown, fallback: boolean): boolean => {
  const raw = text(value).toLowerCase()
  if (raw === 'true') return true
  if (raw === 'false') return false
  return fallback
}

/**
 * قراءة إعدادات المجال من البيئة.
 * مفعّل = AD_HOST مكتوب و AD_ENABLED مش false: مصدر واحد للحقيقة، ومفيش مفتاح في القاعدة يقدر يفتحه.
 */
export function readDirectoryConfig(env: Record<string, unknown>): DirectoryConfig {
  const host = text(env.AD_HOST)
  const ldaps = flag(env.AD_LDAPS, false)
  const port = Number(text(env.AD_PORT) || (ldaps ? '636' : '389'))
  const timeoutMs = Number(text(env.AD_TIMEOUT_MS) || '8000')
  return {
    enabled: host.length > 0 && flag(env.AD_ENABLED, true),
    host,
    port: Number.isInteger(port) && port > 0 && port <= 65535 ? port : ldaps ? 636 : 389,
    ldaps,
    rejectUnauthorized: flag(env.AD_TLS_REJECT_UNAUTHORIZED, true),
    baseDn: text(env.AD_BASE_DN),
    upnSuffix: text(env.AD_UPN_SUFFIX).replace(/^@/, ''),
    bindDn: text(env.AD_BIND_DN),
    bindPassword: typeof env.AD_BIND_PASSWORD === 'string' ? env.AD_BIND_PASSWORD : '',
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs >= 1000 ? timeoutMs : 8000,
  }
}

/** ما ينقص الإعداد لكي يعمل — تُستخدم في رسالة الإقلاع وفي شاشة السياسات (بلا أي سر). */
export function directoryConfigGaps(config: DirectoryConfig): string[] {
  const gaps: string[] = []
  if (!config.host) gaps.push('AD_HOST')
  if (!config.baseDn) gaps.push('AD_BASE_DN')
  if (!config.upnSuffix) gaps.push('AD_UPN_SUFFIX')
  return gaps
}

/** عنوان الخادم — بيتطبع في السجل: مفيش فيه اسم مستخدم ولا كلمة مرور. */
export const directoryUrl = (config: DirectoryConfig): string =>
  `${config.ldaps ? 'ldaps' : 'ldap'}://${config.host}:${config.port}`

/**
 * تحذير الإقلاع لما LDAPS مقفول: كلمات مرور المجال بتعدّي على الشبكة بلا تشفير.
 * null = مفيش ما يُحذَّر منه. مابنسكتش عنه ومابنعتبرهوش وضعًا طبيعيًّا.
 */
export function directoryInsecureWarning(config: DirectoryConfig): string | null {
  if (!config.enabled) return null
  if (!config.ldaps) {
    return (
      `الدخول بحساب الشركة مفتوح على ${directoryUrl(config)} بلا LDAPS — كلمات مرور المجال بتنتقل على الشبكة ` +
      'بلا تشفير وأي حد على نفس الشبكة يقدر يقراها. اضبط AD_LDAPS=true وAD_PORT=636 على شهادة الـDomain Controller.'
    )
  }
  if (!config.rejectUnauthorized) {
    return (
      `الدخول بحساب الشركة على ${directoryUrl(config)} بـLDAPS لكن AD_TLS_REJECT_UNAUTHORIZED=false — ` +
      'شهادة الخادم مش متحقَّق منها، فحد في المنتصف يقدر ينتحل الـDomain Controller. حمّل شهادة الشركة على الخادم واضبطه true.'
    )
  }
  return null
}

/** تطبيع اسم الدخول: sam أو DOMAIN\\sam أو UPN كامل → UPN بلاحقة .env، وsAMAccountName للبحث. */
export function normalizeDomainLogin(
  raw: string,
  upnSuffix: string
): { upn: string; sam: string } | null {
  const value = text(raw)
  if (!value) return null
  const withoutDomain = value.includes('\\') ? value.slice(value.lastIndexOf('\\') + 1) : value
  if (!withoutDomain) return null
  if (withoutDomain.includes('@')) {
    const [sam] = withoutDomain.split('@')
    return sam ? { upn: withoutDomain.toLowerCase(), sam } : null
  }
  if (!upnSuffix) return null
  return { upn: `${withoutDomain.toLowerCase()}@${upnSuffix.toLowerCase()}`, sam: withoutDomain }
}

/** هروب فلتر LDAP (RFC 4515) — اسم فيه ( أو * أو \\ مايبنيش فلتر تاني. */
export function escapeLdapFilterValue(value: string): string {
  let out = ''
  for (const ch of value) {
    if (ch === '\\') out += '\\5c'
    else if (ch === '*') out += '\\2a'
    else if (ch === '(') out += '\\28'
    else if (ch === ')') out += '\\29'
    else if (ch === '\0') out += '\\00'
    else if (ch === '/') out += '\\2f'
    else out += ch
  }
  return out
}

/** objectGUID جاي 16 بايت بترتيب AD المختلط (أول 3 مجموعات little-endian) → الصيغة النصية المعروفة. */
export function objectGuidToString(value: unknown): string | null {
  const buffer = Buffer.isBuffer(value)
    ? value
    : value instanceof Uint8Array
      ? Buffer.from(value)
      : null
  if (!buffer || buffer.length !== 16) return null
  const group = (start: number, end: number, reverse: boolean): string => {
    const bytes = Array.from(buffer.subarray(start, end))
    if (reverse) bytes.reverse()
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  return [group(0, 4, true), group(4, 6, true), group(6, 8, true), group(8, 10, false), group(10, 16, false)].join('-')
}

/** userAccountControl: البِت 0x2 = الحساب متوقف. */
export const ACCOUNT_DISABLED_FLAG = 0x2
export const isDisabledAccountControl = (value: unknown): boolean => {
  const n = Number(Array.isArray(value) ? value[0] : value)
  return Number.isFinite(n) && (n & ACCOUNT_DISABLED_FLAG) !== 0
}

/** مسح أي كلمة مرور من نص خطأ قبل تسجيله — حزام أمان فوق عدم تمريرها أصلًا. */
export function scrubSecrets(message: string, secrets: Array<string | undefined>): string {
  let out = String(message ?? '')
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length >= 3) out = out.split(secret).join('***')
  }
  return out
}
