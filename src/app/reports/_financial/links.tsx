'use client'

import Link from 'next/link'
import { Banknote, FileSpreadsheet, Landmark, MinusCircle, PieChart, Timer, Wallet } from 'lucide-react'

// التقارير المالية لشهر الرواتب — نفس القائمة في «لوحة التقارير» و«تقرير الرواتب»
export const FINANCIAL_REPORT_LINKS = [
  { href: '/reports/payroll-register', title: 'تقرير الرواتب', description: 'كشف كل موظف: الأساسي والبدلات والإضافي والخصومات والصافي وبنك/نقدي', icon: FileSpreadsheet },
  { href: '/reports/payroll-cost', title: 'ملخص تكلفة الرواتب', description: 'بالفرع والقسم: المستحق والخصومات والصافي والإضافي والتأمينات', icon: PieChart },
  { href: '/reports/deductions', title: 'تقرير الخصومات', description: 'خصومات الشهر بالنوع وبالموظف', icon: MinusCircle },
  { href: '/reports/loans', title: 'تقرير السلف', description: 'الأرصدة القائمة وأقساط الشهر واللي اتخصم في المسير', icon: Wallet },
  { href: '/reports/overtime', title: 'تقرير الإضافي', description: 'دقائق ومبالغ الإضافي المعتمد بالموظف والقسم', icon: Timer },
  { href: '/reports/cost-centers', title: 'تقرير مراكز التكلفة', description: 'تكلفة الرواتب لكل مركز تكلفة في الشهر', icon: Landmark },
] as const

export function FinancialReportLinks({ title = 'التقارير المالية' }: { title?: string }) {
  return (
    <div className="card">
      <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
        <Banknote size={20} className="text-primary-600" />
        {title}
      </h2>
      <p className="text-sm text-gray-500 mb-4">لشهر رواتب بحدوده، بالفرع والقسم ومركز التكلفة، مع تصدير Excel وطباعة</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {FINANCIAL_REPORT_LINKS.map((report) => {
          const Icon = report.icon
          return (
            <Link key={report.href} href={report.href} className="p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors group flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                <Icon size={20} className="text-primary-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 group-hover:text-primary-600 transition-colors">{report.title}</h3>
                <p className="text-sm text-gray-500">{report.description}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
