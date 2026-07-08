'use client'

import { MainLayout } from '@/components/layout'
import { DollarSign, Info } from 'lucide-react'

export default function AllowancesPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إدارة البدلات</h1>
            <p className="text-gray-500 mt-1">إعداد وإدارة أنواع البدلات المختلفة</p>
          </div>
        </div>

        {/* Empty State */}
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <DollarSign size={32} className="text-primary-600" />
          </div>
          <h3 className="font-bold text-gray-800 mb-2">هذه الوحدة تُفعَّل في مرحلة لاحقة</h3>
          <p className="text-gray-500">
            لا توجد بيانات حقيقية بعد — تعريف البدلات (سكن، مواصلات، هاتف...) سيتوفر عند تفعيل الوحدة
          </p>
        </div>

        {/* Info Card */}
        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Info size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-blue-800 mb-2">ما الذي يشمله المسير حالياً؟</h3>
              <p className="text-sm text-blue-700">
                يعتمد حساب المسير الحالي على الراتب الأساسي والعمل الإضافي والخصومات الآلية
                (التأخير، الإجازات بدون راتب، أقساط السلف). عند تفعيل وحدة البدلات ستُضاف
                البدلات المعرفة هنا إلى استحقاقات الموظف تلقائياً.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
