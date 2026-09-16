'use client'

import Link from 'next/link'
import { Home, ArrowRight, SearchX } from 'lucide-react'

// تُعرض داخل إطار النظام (القائمة الجانبية + الهيدر) بنفس شكل بطاقة «غير مصرح» — التنقل من القائمة الجانبية
export default function NotFound() {
  return (
    <div className="card p-12 text-center max-w-lg mx-auto mt-12">
      <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <SearchX size={32} className="text-primary-500" />
      </div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">الصفحة غير موجودة</h1>
      <p className="text-gray-500 mb-6">
        الرابط غير صحيح أو أن الشاشة نُقلت — اختر الشاشة المطلوبة من القائمة الجانبية
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          <Home size={18} />
          الرئيسية
        </Link>
        <button type="button" onClick={() => window.history.back()} className="btn-secondary inline-flex items-center gap-2">
          <ArrowRight size={18} />
          رجوع
        </button>
      </div>
    </div>
  )
}
