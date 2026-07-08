'use client'

import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import { ArrowRight, BookOpen, Info } from 'lucide-react'

export default function PoliciesPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">
            الإعدادات
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">السياسات</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">سياسات الموارد البشرية</h1>
            <p className="text-gray-500 mt-1">سياسات الإجازات والعمل الإضافي والانضباط</p>
          </div>
        </div>

        {/* Empty State */}
        <div className="card p-12 text-center">
          <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            مستودع السياسات يُفعَّل في مرحلة لاحقة
          </h3>
          <p className="text-gray-500">
            ستتمكن هنا من إدارة سياسات الإجازات والعمل الإضافي والانضباط وربطها بمحرك القواعد
          </p>
        </div>

        {/* ملاحظة */}
        <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3">
          <Info size={20} className="text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">أين تُدار القيم الفعلية حالياً؟</p>
            <p className="mt-1">
              قيم الاستحقاق السنوي وسماحية التأخير وقواعد الرواتب تُدار من إعدادات النظام على
              الخادم، وتظهر قيمها الفعلية في شاشة «جداول العمل» وأنواع الإجازات.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
