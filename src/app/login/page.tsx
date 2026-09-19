'use client'

import { useEffect, useState } from 'react'
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { login, saveSession, ApiError, CHANGE_PASSWORD_PATH } from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // انتهت الجلسة؟ (وُجّهنا من apiFetch بعد 401 بـ ?expired=1)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('expired')
    ) {
      setExpired(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const { accessToken, user } = await login(email, password)
      saveSession(accessToken, user, rememberMe)
      // كلمة مؤقتة من المدير → لازم يغيّرها الأول قبل ما يدخل النظام
      window.location.href = user.mustChangePassword ? CHANGE_PASSWORD_PATH : '/'
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'تعذّر الاتصال بالخادم — تأكد أن الـ API يعمل'
      )
      setIsLoading(false)
    }
  }

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
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">مرحباً بعودتك</h2>
          <p className="text-gray-500 text-center mb-8">قم بتسجيل الدخول للمتابعة</p>

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

            {/* Email */}
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
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
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
<p className="text-xs text-gray-500 max-w-44">نسيت كلمة المرور؟ تواصل مع مسؤول الموارد البشرية لإعادة تعيينها.</p>
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
                  تسجيل الدخول
                </>
              )}
            </button>
          </form>


        </div>

        {/* Footer */}
        <p className="text-center text-primary-100 mt-8 text-sm">
          © {new Date().getFullYear()} نظام الموارد البشرية — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  )
}
