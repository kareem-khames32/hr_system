'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Building2,
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

// طريقتان للدخول (قرار المالك 22 سبتمبر): البريد وكلمة المرور زي ما هي، و«الدخول بحساب الشركة»
// على الـActive Directory. الزر التاني مايظهرش غير لما الخادم يقول إن المجال مضبوط.
type Mode = 'password' | 'domain'

export default function LoginPage() {
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
    `flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      active ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
    }`

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-primary-900/30">
            <Building2 className="w-10 h-10 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mt-4">نظام الموارد البشرية</h1>
          <p className="text-primary-100 mt-2">إدارة الموارد البشرية</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {challenge ? (
            /* ===================== الخطوة الثانية: رمز البريد ===================== */
            <>
              <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">التحقق بخطوتين</h2>
              <p className="text-gray-500 text-center mb-6 text-sm leading-6">
                بعتنا رمز من {challenge.codeLength} أرقام على{' '}
                <span className="font-medium text-gray-700" dir="ltr">{challenge.sentTo}</span>.
                الرمز صالح {Math.round(challenge.expiresInSeconds / 60)} دقائق ولمرة واحدة.
              </p>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {notice && !error && (
                <div className="flex items-center gap-2 bg-success-50 text-success-700 text-sm rounded-xl px-4 py-3 mb-4">
                  <Mail size={18} className="shrink-0" />
                  <span>{notice}</span>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-5">
                <div>
                  <label htmlFor="login-code" className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center tracking-[0.6em] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="------"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, challenge.codeLength))}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showCode ? 'إخفاء الرمز' : 'إظهار الرمز'}
                      onClick={() => setShowCode(!showCode)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCode ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || code.length !== challenge.codeLength}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                  className="flex items-center gap-2 text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <RotateCw size={16} />
                  {cooldown > 0 ? `إعادة الإرسال بعد ${cooldown} ثانية` : 'ابعت رمز جديد'}
                </button>
                <button type="button" onClick={restart} className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                  <ArrowRight size={16} />
                  ابدأ من جديد
                </button>
              </div>
            </>
          ) : (
            /* ===================== الخطوة الأولى: الهوية ===================== */
            <>
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">مرحباً بعودتك</h2>
              <p className="text-gray-500 text-center mb-6">قم بتسجيل الدخول للمتابعة</p>

              {/* طريقتان للدخول — «حساب الشركة» يظهر لما المجال يكون مضبوط على الخادم */}
              {domainLoginEnabled && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-1.5 mb-6">
                  <button type="button" className={tabClass(mode === 'password')} onClick={() => switchMode('password')}>
                    <Mail size={16} />
                    بالبريد وكلمة المرور
                  </button>
                  <button type="button" className={tabClass(mode === 'domain')} onClick={() => switchMode('domain')}>
                    <Network size={16} />
                    بحساب الشركة
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* انتهت الجلسة — تحويل تلقائي من صفحة محمية بعد 401 */}
                {expired && !error && (
                  <div className="flex items-center gap-2 bg-amber-50 text-amber-700 text-sm rounded-xl px-4 py-3">
                    <Clock size={18} className="shrink-0" />
                    <span>انتهت جلستك — سجّل الدخول من جديد للمتابعة</span>
                  </div>
                )}
                {/* خطأ تسجيل الدخول */}
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {mode === 'domain' ? (
                  /* اسم المستخدم في الشركة */
                  <div>
                    <label htmlFor="login-username" className="block text-sm font-medium text-gray-700 mb-2">
                      اسم المستخدم في الشركة
                    </label>
                    <div className="relative">
                      <Network size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="login-username"
                        autoComplete="username"
                        type="text"
                        dir="ltr"
                        className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder="name@maharah.local"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      نفس حسابك اللي بتدخل بيه على أجهزة الشركة — اكتب الاسم بس أو بالنطاق كامل.
                    </p>
                  </div>
                ) : (
                  /* Email */
                  <div>
                    <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-2">
                      البريد الإلكتروني
                    </label>
                    <div className="relative">
                      <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="login-email"
                        autoComplete="username"
                        type="email"
                        className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
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
                  <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-2">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="login-password"
                      autoComplete="current-password"
                      type={showPassword ? 'text' : 'password'}
                      className="w-full pr-10 pl-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-600">تذكرني</span>
                  </label>
                  <p className="text-xs text-gray-500 max-w-44">
                    {mode === 'domain'
                      ? 'نسيت كلمة مرور حساب الشركة؟ تواصل مع الدعم الفني.'
                      : 'نسيت كلمة المرور؟ تواصل مع مسؤول الموارد البشرية لإعادة تعيينها.'}
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

        {/* Footer */}
        <p className="text-center text-primary-100 mt-8 text-sm">
          © {new Date().getFullYear()} نظام الموارد البشرية — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  )
}
