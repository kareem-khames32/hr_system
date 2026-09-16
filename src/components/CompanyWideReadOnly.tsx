'use client'

import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import { getCurrentUser } from '@/lib/api'

// ===== تعريفات لكل الشركة (عزل الفروع) =====
// الكتالوجات المشتركة (الدرجات، المسميات، تصنيفات الأصول، أنواع الأذونات والمستندات، مراكز التكلفة) وأنواع الخصومات والمكافآت
// مالهاش فرع = لكل الشركة. حساب مقفول على فرع يشوفها بس، والإضافة والتعديل والتعطيل من حساب على مستوى الشركة.
// نفس قاعدة الخادم (branchScopeOf / assertCompanyWideWrite) ونفس scope في useDefinitionBranches — الخادم بيرفض أصلًا، والشاشة بتخفي الأزرار بس.
export function useCompanyWideWrite(): { canWrite: boolean; readOnly: boolean } {
  // الاتنين false لحد ما نقرا الحساب: لا زرار يظهر ويختفي، ولا ملاحظة تظهر وتختفي
  const [companyWide, setCompanyWide] = useState<boolean | null>(null)
  useEffect(() => { setCompanyWide(getCurrentUser()?.role === 'super_admin') }, [])
  return { canWrite: companyWide === true, readOnly: companyWide === false }
}

export function CompanyWideReadOnlyNote({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2 ${className}`}>
      <Info size={16} className="shrink-0" />
      <span>للعرض بس — التعديل من حساب على مستوى الشركة</span>
    </div>
  )
}
