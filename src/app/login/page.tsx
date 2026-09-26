'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Clock,
  ShieldCheck,
  Network,
  ArrowRight,
  RotateCw,
  Wallet,
  ClipboardList,
  CalendarDays,
} from 'lucide-react'
import {
  login,
  domainLogin,
  verifyLoginCode,
  resendLoginCode,
  fetchLoginOptions,
  isTwoFactorChallenge,
  saveSession,
  ApiError,
  CHANGE_PASSWORD_PATH,
  type CurrentUser,
  type TwoFactorChallenge,
} from '@/lib/api'
import { useBranding } from '@/lib/branding'
import { BrandLogo } from '@/components/branding/BrandLogo'
import { BrandBackdrop } from '@/components/branding/BrandBackdrop'
import { PoweredBy } from '@/components/branding/PoweredBy'

// طريقتان للدخول (قرار المالك 22 سبتمبر): البريد وكلمة المرور زي ما هي، و«الدخول بحساب الشركة»
// على الـActive Directory. الزر التاني مايظهرش غير لما الخادم يقول إن المجال مضبوط.
type Mode = 'password' | 'domain'

// شكل الصفحة (طلب المالك 26 سبتمبر): نصّين — نص فيه شعار الشركة واسمها والفورم و«بواسطة Logic Leap HR»،
// ونص بتدرّج أخضر مزرق نازل لليل بلمسة ذهبي ونقشة نجمة ثمانية واسم الشركة كبير («مش شاشة زرقا»).
// تحت lg النص البصري بيبقى شريط مضغوط فوق الفورم. المنطق نفسه (الطريقتين والرمز والتذكر والتحويلات) زي ما كان.

// كروت الوحدات في النص البصري — إشارة لما في النظام، مش روابط
const MODULE_CHIPS = [
  { label: 'الحضور', icon: Clock },
  { label: 'الرواتب', icon: Wallet },
  { label: 'الطلبات', icon: ClipboardList },
  { label: 'الإجازات', icon: CalendarDays },
]

const TAGLINE = 'كل ما يخص فريقك في مكان واحد'

// الاسم الكبير على قد طوله: الطويل بيصغر درجة بدل ما يتقص بدري
const bigNameSize = (name: string) =>
  name.length > 42 ? 'lg:text-4xl' : name.length > 24 ? 'lg:text-5xl' : 'lg:text-6xl'

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50/70 py-3 text-gray-900 placeholder:text-gray-400 transition focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-600/15'
const labelClass = 'mb-2 block text-sm font-medium text-gray-700'
const toggleClass =
  'absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600'
const submitClass =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-teal-700 to-emerald-700 py-3 font-semibold text-white shadow-lg shadow-teal-900/20 transition-all hover:from-teal-800 hover:to-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/35 disabled:cursor-not-allowed disabled:opacity-50'
const linkButtonClass =
  'flex items-center gap-1.5 rounded-lg px-1 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600'

export default function LoginPage() {
  const brand = useBranding()
  const [mode, setMode] = useState<Mode>('password')
  const [domainLoginEnabled, setDomainLoginEnabled] = useState(false)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // انتهت الجلسة؟ (وُجّهنا من apiFetch بعد 401 بـ ?expired=1)
  const [expired, setExpired] = useState(false)

  // ===== الخطوة الثانية: رمز البريد =====
  // الحالة المعلَّقة مش جلسة: مفيش توكن بيتحفظ لحد ما الرمز يتأكد
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null)
  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const codeInput = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('expired')
    ) {
      setExpired(true)
    }
  }, [])

  // المجال مضبوط على الخادم؟ فشل النداء مايمنعش الدخول العادي
  useEffect(() => {
    fetchLoginOptions()
      .then((options) => setDomainLoginEnabled(!!options.domainLoginEnabled))
      .catch(() => setDomainLoginEnabled(false))
  }, [])

  // عدّاد إعادة الإرسال — ظاهر للمستخدم بدل زر مايردّش
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  useEffect(() => {
    if (challenge) codeInput.current?.focus()
  }, [challenge])

  const enterSystem = useCallback(
    (accessToken: string, user: CurrentUser) => {
      saveSession(accessToken, user, rememberMe)
      // كلمة مؤقتة من المدير → لازم يغيّرها الأول قبل ما يدخل النظام
      window.location.href = user.mustChangePassword ? CHANGE_PASSWORD_PATH : '/'
    },
    [rememberMe]
  )

  const asMessage = (err: unknown, fallback: string) =>
    err instanceof ApiError ? err.message : fallback

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setNotice(null)
    try {
      const outcome =
        mode === 'domain' ? await domainLogin(username, password) : await login(email, password)
      if (isTwoFactorChallenge(outcome)) {
        // التحقق بخطوتين مفتوح: مفيش جلسة لحد ما الرمز يتأكد
        setChallenge(outcome)
        setCooldown(outcome.resendAfterSeconds)
        setCode('')
        setPassword('')
        setIsLoading(false)
        return
      }
      enterSystem(outcome.accessToken, outcome.user)
    } catch (err) {
      setError(asMessage(err, 'تعذّر الاتصال بالخادم — تأكد أن الـ API يعمل'))
      setIsLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!challenge) return
    setIsLoading(true)
    setError(null)
    setNotice(null)
    try {
      const session = await verifyLoginCode(challenge.challengeToken, code)
      enterSystem(session.accessToken, session.user)
    } catch (err) {
      setError(asMessage(err, 'تعذّر التحقق من الرمز — أعد المحاولة'))
      setCode('')
      setIsLoading(false)
      codeInput.current?.focus()
    }
  }

  const handleResend = async () => {
    if (!challenge || cooldown > 0 || isLoading) return
    setIsLoading(true)
    setError(null)
    setNotice(null)
    try {
      const again = await resendLoginCode(challenge.challengeToken)
      setCooldown(again.resendAfterSeconds)
      setNotice(`اتبعت رمز جديد إلى ${again.sentTo} — الرمز القديم بطل`)
      setCode('')
    } catch (err) {
      setError(asMessage(err, 'تعذّر إرسال رمز جديد — أعد المحاولة'))
      // 429 بيرجع الثواني الباقية في تفاصيل الرد؛ بدونها نقفل الزر المهلة كاملة
      const waitFor = err instanceof ApiError ? Number(err.details?.retryAfterSeconds) : NaN
      setCooldown(Number.isFinite(waitFor) && waitFor > 0 ? waitFor : challenge.resendAfterSeconds)
    } finally {
      setIsLoading(false)
      codeInput.current?.focus()
    }
  }

  const restart = () => {
    setChallenge(null)
    setCode('')
    setPassword('')
    setError(null)
    setNotice(null)
    setCooldown(0)
  }

  const switchMode = (next: Mode) => {
    if (next === mode) return
    setMode(next)
    setError(null)
    setNotice(null)
    setPassword('')
  }

  const tabClass = (active: boolean) =>
    clsx(
      'flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-center text-sm font-medium leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600',
      active ? 'bg-white text-teal-800 shadow-sm ring-1 ring-black/5' : 'text-gray-600 hover:text-gray-900'
    )

  const spinner = <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />

  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row-reverse" dir="rtl">
      {/* ===================== النص البصري: التدرّج والنقشة واسم الشركة كبير (تحت lg شريط مضغوط فوق الفورم) ===================== */}
      <section className="relative isolate overflow-hidden text-white lg:flex lg:min-h-screen lg:w-[52%] lg:items-center">
        <BrandBackdrop patternId="ll-login-pattern" ornamentClassName="hidden lg:block" />
        <div className="relative w-full px-6 pb-14 pt-8 sm:px-10 lg:px-14 lg:py-16 xl:px-20">
          <div className="flex items-center gap-4 lg:block">
            {/* على الموبايل الشعار في الشريط نفسه — على الشاشة الكبيرة فوق الفورم */}
            <div className="shrink-0 lg:hidden">
              {brand.ready ? (
                <BrandLogo brand={brand} size="md" tone="dark" />
              ) : (
                <div aria-hidden className="h-12 w-12 rounded-2xl bg-white/10 motion-safe:animate-pulse" />
              )}
            </div>
            <div className="ll-rise min-w-0 flex-1">
              <p className="mb-5 hidden items-center gap-3 text-sm font-medium tracking-wide text-white/70 lg:flex">
                <span aria-hidden className="h-px w-10 bg-[#e9b949]/80" />
                بوابة الموارد البشرية
              </p>
              {brand.ready ? (
                <p
                  title={brand.companyName}
                  // w-fit: التدرّج (أبيض لذهبي) على عرض الاسم نفسه مش عرض النص كله — فآخر الاسم دايمًا ذهبي
                  className={clsx(
                    'line-clamp-2 w-fit max-w-full text-balance break-words bg-gradient-to-l from-white via-white to-[#f3d58a] bg-clip-text text-2xl font-extrabold leading-[1.3] text-transparent sm:text-3xl lg:line-clamp-3 lg:leading-[1.2]',
                    bigNameSize(brand.companyName)
                  )}
                >
                  <bdi>{brand.companyName}</bdi>
                </p>
              ) : (
                <div aria-hidden className="h-8 w-2/3 rounded-xl bg-white/10 motion-safe:animate-pulse lg:h-16" />
              )}
              <p className="mt-2 text-sm text-white/75 sm:text-base lg:mt-5 lg:text-xl">{TAGLINE}</p>
            </div>
          </div>

          <ul aria-label="وحدات النظام" className="mt-6 hidden flex-wrap gap-2.5 sm:flex lg:mt-12 lg:gap-3">
            {MODULE_CHIPS.map(({ label, icon: Icon }, index) => (
              <li
                key={label}
                className="ll-rise flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 shadow-lg shadow-black/10 backdrop-blur-md"
                style={{ animationDelay: `${160 + index * 90}ms` }}
              >
                <Icon size={16} aria-hidden className="text-[#f3d58a]" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===================== نص الفورم: هوية الشركة ثم الفورم ثم «بواسطة Logic Leap HR» ===================== */}
      <main className="relative z-10 -mt-6 flex flex-1 flex-col rounded-t-[2rem] bg-white px-5 pb-6 pt-8 sm:px-10 lg:mt-0 lg:rounded-none lg:px-16 lg:py-10">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          <div className="hidden min-h-14 flex-wrap items-center gap-x-4 gap-y-3 lg:flex">
            {brand.ready ? (
              <>
                <BrandLogo brand={brand} size="lg" />
                <p title={brand.companyName} className="min-w-[10rem] flex-1 line-clamp-2 break-words text-lg font-bold leading-snug text-gray-900">
                  <bdi>{brand.companyName}</bdi>
                </p>
              </>
            ) : (
              <div aria-hidden className="flex flex-1 items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gray-100 motion-safe:animate-pulse" />
                <div className="h-5 w-1/2 rounded-lg bg-gray-100 motion-safe:animate-pulse" />
              </div>
            )}
          </div>

          {/* الشاشة الكبيرة: الفورم في النص رأسيًا — الموبايل: تحت الشريط على طول */}
          <div className="flex flex-1 flex-col pb-8 pt-2 lg:justify-center lg:py-12">
            <div key={challenge ? 'code' : 'identity'} className="ll-rise">
              {challenge ? (
                /* ===================== الخطوة الثانية: رمز البريد ===================== */
                <>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/15">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h1 className="mb-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">التحقق بخطوتين</h1>
                  <p className="mb-6 text-sm leading-6 text-gray-500">
                    بعتنا رمز من {challenge.codeLength} أرقام على{' '}
                    <span className="font-medium text-gray-700" dir="ltr">{challenge.sentTo}</span>.
                    الرمز صالح {Math.round(challenge.expiresInSeconds / 60)} دقائق ولمرة واحدة.
                  </p>

                  {error && (
                    <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-600/10">
                      <AlertCircle size={18} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  {notice && !error && (
                    <div role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700 ring-1 ring-inset ring-success-600/10">
                      <Mail size={18} className="shrink-0" />
                      <span>{notice}</span>
                    </div>
                  )}

                  <form onSubmit={handleVerify} className="space-y-5">
                    <div>
                      <label htmlFor="login-code" className={labelClass}>
                        رمز التحقق
                      </label>
                      <div className="relative">
                        <input
                          id="login-code"
                          ref={codeInput}
                          // الرمز مخفي زي كلمة المرور، وبزر إظهار — المدخل رقمي بس
                          type={showCode ? 'text' : 'password'}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={challenge.codeLength}
                          dir="ltr"
                          className={clsx(inputClass, 'px-10 text-center font-mono text-lg tracking-[0.6em]')}
                          placeholder="------"
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, challenge.codeLength))}
                          required
                        />
                        <button
                          type="button"
                          aria-label={showCode ? 'إخفاء الرمز' : 'إظهار الرمز'}
                          onClick={() => setShowCode(!showCode)}
                          className={toggleClass}
                        >
                          {showCode ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || code.length !== challenge.codeLength}
                      className={submitClass}
                    >
                      {isLoading ? (
                        spinner
                      ) : (
                        <>
                          <LogIn size={18} />
                          تأكيد ودخول
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-5 flex items-center justify-between gap-3 text-sm">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={cooldown > 0 || isLoading}
                      className={clsx(linkButtonClass, 'text-teal-700 hover:text-teal-800 disabled:cursor-not-allowed disabled:text-gray-400')}
                    >
                      <RotateCw size={16} />
                      {cooldown > 0 ? `إعادة الإرسال بعد ${cooldown} ثانية` : 'ابعت رمز جديد'}
                    </button>
                    <button type="button" onClick={restart} className={clsx(linkButtonClass, 'text-gray-500 hover:text-gray-700')}>
                      <ArrowRight size={16} />
                      ابدأ من جديد
                    </button>
                  </div>
                </>
              ) : (
                /* ===================== الخطوة الأولى: الهوية ===================== */
                <>
                  <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">مرحباً بعودتك</h1>
                  <p className="mb-7 mt-2 text-gray-500">قم بتسجيل الدخول للمتابعة</p>

                  {/* طريقتان للدخول — «حساب الشركة» يظهر لما المجال يكون مضبوط على الخادم */}
                  {domainLoginEnabled && (
                    <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-gray-100 p-1">
                      <button type="button" aria-pressed={mode === 'password'} className={tabClass(mode === 'password')} onClick={() => switchMode('password')}>
                        <Mail size={16} className="shrink-0" />
                        بالبريد وكلمة المرور
                      </button>
                      <button type="button" aria-pressed={mode === 'domain'} className={tabClass(mode === 'domain')} onClick={() => switchMode('domain')}>
                        <Network size={16} className="shrink-0" />
                        بحساب الشركة
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* انتهت الجلسة — تحويل تلقائي من صفحة محمية بعد 401 */}
                    {expired && !error && (
                      <div role="status" className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-600/15">
                        <Clock size={18} className="shrink-0" />
                        <span>انتهت جلستك — سجّل الدخول من جديد للمتابعة</span>
                      </div>
                    )}
                    {/* خطأ تسجيل الدخول */}
                    {error && (
                      <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-600/10">
                        <AlertCircle size={18} className="shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {mode === 'domain' ? (
                      /* اسم المستخدم في الشركة */
                      <div>
                        <label htmlFor="login-username" className={labelClass}>
                          اسم المستخدم في الشركة
                        </label>
                        <div className="relative">
                          <Network size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            id="login-username"
                            autoComplete="username"
                            type="text"
                            dir="ltr"
                            className={clsx(inputClass, 'pl-4 pr-11')}
                            placeholder="name@maharah.local"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-gray-500">
                          نفس حسابك اللي بتدخل بيه على أجهزة الشركة — اكتب الاسم بس أو بالنطاق كامل.
                        </p>
                      </div>
                    ) : (
                      /* Email */
                      <div>
                        <label htmlFor="login-email" className={labelClass}>
                          البريد الإلكتروني
                        </label>
                        <div className="relative">
                          <Mail size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            id="login-email"
                            autoComplete="username"
                            type="email"
                            className={clsx(inputClass, 'pl-4 pr-11')}
                            placeholder="example@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Password */}
                    <div>
                      <label htmlFor="login-password" className={labelClass}>
                        كلمة المرور
                      </label>
                      <div className="relative">
                        <Lock size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          id="login-password"
                          autoComplete="current-password"
                          type={showPassword ? 'text' : 'password'}
                          className={clsx(inputClass, 'pl-11 pr-11')}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                          onClick={() => setShowPassword(!showPassword)}
                          className={toggleClass}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="flex items-start justify-between gap-4">
                      <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md focus-within:ring-2 focus-within:ring-teal-600/40">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 accent-teal-700"
                        />
                        <span className="text-sm text-gray-600">تذكرني</span>
                      </label>
                      <p className="max-w-52 text-left text-xs leading-5 text-gray-500">
                        {mode === 'domain'
                          ? 'نسيت كلمة مرور حساب الشركة؟ تواصل مع الدعم الفني.'
                          : 'نسيت كلمة المرور؟ تواصل مع مسؤول الموارد البشرية لإعادة تعيينها.'}
                      </p>
                    </div>

                    {/* Submit Button */}
                    <button type="submit" disabled={isLoading} className={submitClass}>
                      {isLoading ? (
                        spinner
                      ) : (
                        <>
                          <LogIn size={18} />
                          {mode === 'domain' ? 'الدخول بحساب الشركة' : 'تسجيل الدخول'}
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          <PoweredBy className="pt-2" />
        </div>
      </main>
    </div>
  )
}
