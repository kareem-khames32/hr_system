'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmployeeForm, { EmployeeFormPayload } from '@/components/EmployeeForm'
import { can, createEmployee, fetchCandidates, getCurrentUser, hireCandidate, type ApiCandidate } from '@/lib/api'
import { candidateHireBlock, candidateHireInitial, candidateIdFromSearch } from '@/lib/candidate-hire'
import { clearEmployeeAddDraft } from '@/lib/employee-add-draft'
import { saveQualifications } from '@/lib/save-qualifications'

export default function AddEmployeePage() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<{ id: number; name: string; warning: string } | null>(null)
  const creating = useRef(false)
  const createdId = useRef<number | null>(null)
  // تعيين مرشح: /employees/add?candidateId=… — نفس النموذج والحقول الإجبارية، متعبّي من بيانات المرشح
  const [candidateId, setCandidateId] = useState<number | null | undefined>(undefined)
  const [candidate, setCandidate] = useState<ApiCandidate | null>(null)
  const [candidateError, setCandidateError] = useState('')

  useEffect(() => {
    const id = candidateIdFromSearch(window.location.search)
    if (id === 'invalid') { setCandidateId(null); setCandidateError('رقم المرشح غير صالح'); return }
    setCandidateId(id)
    if (id === null) return
    fetchCandidates()
      .then((rows) => {
        const found = rows.find((row) => row.id === id)
        const block = candidateHireBlock(found)
        if (block) setCandidateError(block)
        else setCandidate(found ?? null)
      })
      .catch((err) => setCandidateError(err instanceof Error ? err.message : 'تعذر تحميل بيانات المرشح'))
  }, [])

  const handleSubmit = async (payload: EmployeeFormPayload) => {
    if (creating.current || createdId.current) return
    creating.current = true
    setError('')
    setSubmitting(true)
    try {
      // قوائم المؤهلات تُحفظ بعد إنشاء الموظف (تحتاج employeeId)
      const { qualifications, ...employeeData } = payload
      const emp = candidate ? (await hireCandidate(candidate.id, employeeData)).employee : await createEmployee(employeeData)
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
      // من يملك الإنشاء دون العرض لا يدخل القائمة — يعود للوحته؛ التعيين يرجع للتوظيف
      window.location.href = candidate ? '/recruitment' : can('employees.view') ? '/employees' : '/'
    } catch (err) {
      if (createdId.current) setCreated((previous) => previous ? { ...previous, warning: 'حُفظ سجل الموظف، وتعذر إكمال المؤهلات. راجع ملفه لاستكمالها.' } : previous)
      else setError(err instanceof Error ? err.message : 'تعذر حفظ الموظف')
    } finally { creating.current = false; setSubmitting(false) }
  }

  if (created) return <MainLayout><div className="card max-w-xl mx-auto mt-10 p-8 space-y-5"><CheckCircle2 size={44} className="text-green-600" /><h1 className="text-xl font-bold text-gray-900">تم إنشاء الموظف «{created.name}»</h1><p className="text-sm text-gray-600">حُفظ سجل الموظف رقم {created.id}. لا تحتاج إلى إرسال نموذج الإضافة مرة أخرى.</p>{submitting && <p role="status" className="text-sm text-primary-700 flex items-center gap-2"><Loader2 size={17} className="animate-spin" />جارٍ استكمال حفظ المؤهلات...</p>}{created.warning && <div role="alert" className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm p-4 leading-6">{created.warning}<p className="mt-2">راجع العناصر المحفوظة في ملف الموظف وأكمل العناصر التي تعذر حفظها.</p></div>}<div className="flex flex-wrap gap-3">{!submitting && can('employees.view') && can('employees.edit') && <Link href={`/employees/${created.id}/edit`} className="btn-primary">فتح الملف واستكمال المؤهلات</Link>}{can('employees.view') ? <Link href="/employees" className="btn-secondary">قائمة الموظفين</Link> : <Link href="/" className="btn-secondary">العودة للوحة التحكم</Link>}</div>{created.warning && !(can('employees.view') && can('employees.edit')) && <p className="text-xs text-gray-500">استكمال المؤهلات يحتاج مسؤولًا لديه صلاحية عرض الموظفين وتعديلهم؛ أرسل له رقم الموظف أعلاه.</p>}</div></MainLayout>

  if (candidateError) return <MainLayout><div className="card max-w-xl mx-auto mt-10 p-8 space-y-4"><div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{candidateError}</div><Link href="/recruitment" className="btn-secondary inline-block">الرجوع للتوظيف</Link></div></MainLayout>
  // النموذج بياخد القيم الابتدائية مرة واحدة: يستنى بيانات المرشح قبل ما يتعرض
  if (candidateId === undefined || (candidateId !== null && !candidate)) return <MainLayout><p role="status" className="flex items-center gap-2 text-gray-600 mt-10 justify-center"><Loader2 size={18} className="animate-spin" />جارٍ التحميل...</p></MainLayout>

  return (
    <EmployeeForm
      mode="add"
      initial={candidate ? candidateHireInitial(candidate) : undefined}
      title={candidate ? `تعيين المرشح: ${candidate.fullName}` : undefined}
      subtitle={candidate ? 'كمّل بيانات الموظف الإجبارية (الاسم بالعربي، الجنسية، الجنس، الميلاد، الجوال، الهوية، التعيين، الفرع، القسم، المسمى، الراتب، البصمة) — الحفظ بيعين المرشح' : undefined}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
    />
  )
}
