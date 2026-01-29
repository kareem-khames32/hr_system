'use client'

import Link from 'next/link'
import { Home, ArrowRight, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="text-center max-w-lg">
        {/* 404 Illustration */}
        <div className="mb-8">
          <span className="text-[150px] font-bold text-primary-500 leading-none">404</span>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-gray-800 mb-4">الصفحة غير موجودة</h1>
        <p className="text-gray-500 mb-8">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها أو حذفها.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-3 rounded-xl transition-colors flex items-center gap-2"
          >
            <Home size={18} />
            الصفحة الرئيسية
          </Link>
          <button
            onClick={() => window.history.back()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors flex items-center gap-2"
          >
            <ArrowRight size={18} />
            العودة للخلف
          </button>
        </div>

        {/* Helpful Links */}
        <div className="mt-12 p-6 bg-white rounded-2xl shadow-sm">
          <h2 className="font-bold text-gray-800 mb-4">روابط مفيدة</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/" className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 text-sm">
              لوحة التحكم
            </Link>
            <Link href="/employees" className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 text-sm">
              الموظفين
            </Link>
            <Link href="/attendance" className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 text-sm">
              الحضور
            </Link>
            <Link href="/leaves" className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 text-sm">
              الإجازات
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
