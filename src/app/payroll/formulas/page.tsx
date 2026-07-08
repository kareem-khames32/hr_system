'use client'

import { MainLayout } from '@/components/layout'
import { Calculator, Info } from 'lucide-react'

export default function PayrollFormulasPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">معادلات الرواتب</h1>
            <p className="text-gray-500 mt-1">إدارة معادلات حساب الرواتب والخصومات</p>
          </div>
        </div>

        {/* Empty State */}
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calculator size={32} className="text-primary-600" />
          </div>
          <h3 className="font-bold text-gray-800 mb-2">هذه الوحدة تُفعَّل في مرحلة لاحقة</h3>
          <p className="text-gray-500">
            لا توجد بيانات حقيقية بعد — محرر المعادلات المخصصة سيتوفر عند تفعيل الوحدة
          </p>
        </div>

        {/* Current Calculation Info */}
        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Info size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-blue-800 mb-2">كيف يُحسب المسير حالياً؟</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• الراتب الأساسي من ملف الموظف</li>
                <li>• العمل الإضافي من سجلات البصمة المعتمدة</li>
                <li>• خصم التأخير من دقائق التأخير في الحضور</li>
                <li>• خصم الإجازات بدون راتب من سجل الإجازات المعتمدة</li>
                <li>• أقساط السلف المستحقة خلال فترة المسير</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
