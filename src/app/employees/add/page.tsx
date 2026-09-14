'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmployeeForm, { EmployeeFormPayload } from '@/components/EmployeeForm'
import { can, createEmployee, getCurrentUser } from '@/lib/api'
import { clearEmployeeAddDraft } from '@/lib/employee-add-draft'
import { saveQualifications } from '@/lib/save-qualifications'

export default function AddEmployeePage() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<{ id: number; name: string; warning: string } | null>(null)
  const creating = useRef(false)
  const createdId = useRef<number | null>(null)

  const handleSubmit = async (payload: EmployeeFormPayload) => {
    if (creating.current || createdId.current) return
    creating.current = true
    setError('')
    setSubmitting(true)
    try {
      // قوائم المؤهلات تُحفظ بعد إنشاء الموظف (تحتاج employeeId)
      const { qualifications, ...employeeData } = payload
      const emp = await createEmployee(employeeData)
      createdId.current = emp.id
      setCreated({ id: emp.id, name: emp.fullName, warning: '' })
      const userId = getCurrentUser()?.id
      if (userId) {
        try { clearEmployeeAddDraft(userId) } catch { /* Creation already succeeded; storage failure must not suggest retrying it. */ }
      }
      const warn = await saveQualifications(emp.id, qualifications)
      if (warn) {
        setCreated({ id: emp.id, name: emp.fullName, warning: warn })
        return
      }
      // من يملك الإنشاء دون العرض لا يدخل القائمة — يعود للوحته
      window.location.href = can('employees.view') ? '/employees' : '/'
    } catch (err) {
      if (createdId.current) setCreated((previous) => previous ? { ...previous, warning: 'حُفظ سجل الموظف، وتعذر إكمال المؤهلات. راجع ملفه لاستكمالها.' } : previous)
      else setError(err instanceof Error ? err.message : 'تعذر حفظ الموظف')
    } finally { creating.current = false; setSubmitting(false) }
  }

  if (created) return <MainLayout><div className="card max-w-xl mx-auto mt-10 p-8 space-y-5"><CheckCircle2 size={44} className="text-green-600" /><h1 className="text-xl font-bold text-gray-900">تم إنشاء الموظف «{created.name}»</h1><p className="text-sm text-gray-600">حُفظ سجل الموظف رقم {created.id}. لا تحتاج إلى إرسال نموذج الإضافة مرة أخرى.</p>{submitting && <p role="status" className="text-sm text-primary-700 flex items-center gap-2"><Loader2 size={17} className="animate-spin" />جارٍ استكمال حفظ المؤهلات...</p>}{created.warning && <div role="alert" className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm p-4 leading-6">{created.warning}<p className="mt-2">راجع العناصر المحفوظة في ملف الموظف وأكمل العناصر التي تعذر حفظها.</p></div>}<div className="flex flex-wrap gap-3">{!submitting && can('employees.view') && can('employees.edit') && <Link href={`/employees/${created.id}/edit`} className="btn-primary">فتح الملف واستكمال المؤهلات</Link>}{can('employees.view') ? <Link href="/employees" className="btn-secondary">قائمة الموظفين</Link> : <Link href="/" className="btn-secondary">العودة للوحة التحكم</Link>}</div>{created.warning && !(can('employees.view') && can('employees.edit')) && <p className="text-xs text-gray-500">استكمال المؤهلات يحتاج مسؤولًا لديه صلاحية عرض الموظفين وتعديلهم؛ أرسل له رقم الموظف أعلاه.</p>}</div></MainLayout>

  return (
    <EmployeeForm
      mode="add"
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
    />
  )
}
