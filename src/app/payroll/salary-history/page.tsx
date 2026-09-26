'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, RefreshCw } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { PayrollSalaryHistoryEditor } from '@/components/PayrollSalaryHistoryEditor'
import { EmployeePicker } from '@/components/EmployeePicker'
import { can, fetchEmployeeDirectory, type ApiEmployeeDirectoryEntry } from '@/lib/api'
import { payrollPoliciesError } from '@/lib/payroll-policies-api'

function SalaryHistoryContent() {
  const [employees, setEmployees] = useState<ApiEmployeeDirectoryEntry[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [reload, setReload] = useState(0)
  const canView = can('payroll.view')

  useEffect(() => {
    if (!canView) { setLoading(false); return }
    let cancelled = false
    setLoading(true); setError('')
    fetchEmployeeDirectory()
      .then(rows => { if (!cancelled) setEmployees(rows) })
      .catch(cause => { if (!cancelled) setError(payrollPoliciesError(cause)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [canView, reload])

  const selected = employees.find(row => String(row.id) === employeeId)

  return <div className="space-y-6 pb-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3"><span className="rounded-2xl p-3 bg-primary-50 text-primary-600"><BookOpen size={26} /></span><div><h1 className="text-2xl font-bold text-gray-800">سجل الأجر المؤرخ</h1><p className="text-gray-500 mt-1">وثّق الأجر وتاريخ سريانه لكل موظف حسب العقد أو قرار الزيادة.</p></div></div>
      <Link href="/payroll" className="btn-secondary flex gap-2 items-center text-sm"><ArrowRight size={17} />مسير الرواتب</Link>
    </header>

    {!canView ? <p className="card text-gray-500">عرض سجل الأجر يتطلب صلاحية عرض الرواتب.</p> : <>
      <section className="card space-y-4" aria-label="اختيار موظف لسجل الأجر">
        <p className="text-sm text-gray-500">اختر الموظف ثم اعرض سجله. لا يلزم إنشاء سياسة رواتب لاستخدام هذه الصفحة.</p>
        <p className="text-xs text-gray-500">قائمة الاختيار تعرض الموظفين النشطين المتاحين لصلاحياتك حاليًا؛ لا تشمل جميع الموظفين التاريخيين.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label htmlFor="salary-history-employee" className="block text-sm font-medium mb-2">الموظف — بحث بالاسم أو كود الموظف</label><EmployeePicker id="salary-history-employee" employees={employees} value={employeeId} disabled={loading || dirty} placeholder={loading ? 'جارٍ تحميل الموظفين…' : 'اكتب اسم الموظف أو كوده…'} onChange={value => {
            if (dirty || loading) return
            if (!value || employees.some(row => String(row.id) === value)) setEmployeeId(value)
          }} /></div>
        </div>
        {error && <div role="alert" className="text-sm text-red-700 space-y-2"><p>{error}</p><button type="button" className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50" disabled={loading || dirty} onClick={() => { if (!dirty && !loading) setReload(value => value + 1) }}><RefreshCw size={16} />إعادة تحميل الموظفين</button></div>}
        {!loading && !error && employees.length === 0 && <p className="text-sm text-gray-500">لا يوجد موظفون نشطون متاحون في نطاق صلاحياتك.</p>}
        {dirty && <p role="status" className="text-sm text-amber-800">احفظ مراجعة الأجر أو تجاهل تعديلاتها قبل تغيير الموظف.</p>}
      </section>
      {selected ? <section className="card space-y-4"><h2 className="font-semibold text-gray-800">{selected.fullName} · {selected.employeeCode}</h2><PayrollSalaryHistoryEditor key={selected.id} employeeId={selected.id} canEdit={can('payroll.approve')} disabled={loading} onDirtyChange={setDirty} onSaved={() => {}} /></section> : !loading && employees.length > 0 && <p className="text-sm text-gray-500">لم يُحدد موظف بعد. اختره لعرض فترات الأجر الموثقة أو إضافة مراجعة جديدة.</p>}
    </>}
  </div>
}

export default function PayrollSalaryHistoryPage() {
  return <MainLayout><SalaryHistoryContent /></MainLayout>
}
