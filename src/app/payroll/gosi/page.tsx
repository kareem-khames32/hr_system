'use client'

import { MainLayout } from '@/components/layout'
import { Shield, AlertCircle } from 'lucide-react'

export default function GOSIPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">التأمينات الاجتماعية (GOSI)</h1>
            <p className="text-gray-500 mt-1">إدارة اشتراكات التأمينات الاجتماعية للموظفين</p>
          </div>
        </div>

        {/* Empty State */}
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-primary-600" />
          </div>
          <h3 className="font-bold text-gray-800 mb-2">هذه الوحدة تُفعَّل في مرحلة لاحقة</h3>
          <p className="text-gray-500">لا توجد بيانات حقيقية بعد — سيتم ربط اشتراكات التأمينات عند تفعيل الوحدة</p>
        </div>

        {/* Contribution Rates (reference) */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4">نسب الاشتراك (مرجع)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-medium text-gray-800 mb-3">الموظفين السعوديين</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">حصة الموظف</span>
                  <span className="font-medium text-gray-800">9.75%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">حصة المنشأة</span>
                  <span className="font-medium text-gray-800">11.75%</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
                  <span className="font-medium text-gray-700">الإجمالي</span>
                  <span className="font-bold text-primary-600">21.5%</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-medium text-gray-800 mb-3">الموظفين غير السعوديين</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">حصة الموظف</span>
                  <span className="font-medium text-gray-800">0%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">حصة المنشأة (أخطار مهنية)</span>
                  <span className="font-medium text-gray-800">2%</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
                  <span className="font-medium text-gray-700">الإجمالي</span>
                  <span className="font-bold text-primary-600">2%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <AlertCircle size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-blue-800 mb-2">معلومات مهمة عن التأمينات الاجتماعية</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• يجب سداد الاشتراكات قبل اليوم 15 من الشهر التالي</li>
                <li>• الحد الأدنى للراتب الخاضع للاشتراك هو 1,500 ر.س</li>
                <li>• الحد الأقصى للراتب الخاضع للاشتراك هو 45,000 ر.س</li>
                <li>• تأخير السداد يترتب عليه غرامات تصل إلى 2% شهرياً</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
