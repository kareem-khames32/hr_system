'use client'

// B3.9: «خطة التدريب» (لإدارة التدريب) — ميزانية كل قسم للسنة والتكلفة الفعلية مقابلها، والتدريب الإلزامي (لمسمى أو قسم) والناقص منه.
// الأرقام للتقرير بس: مفيش قيد مالي.
import { useCallback, useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { fetchDepartments, type ApiDepartment } from '@/lib/api'
import {
  addTrainingRequirement, fetchTrainingBudget, fetchTrainingCourses, fetchTrainingRequirements, removeTrainingRequirement, setTrainingBudget,
  type ApiTrainingBudget, type ApiTrainingCourse, type ApiTrainingRequirements,
} from '@/lib/training-api'

export default function TrainingPlanPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [report, setReport] = useState<ApiTrainingBudget | null>(null)
  const [mandatory, setMandatory] = useState<ApiTrainingRequirements | null>(null)
  const [courses, setCourses] = useState<ApiTrainingCourse[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [draft, setDraft] = useState<Record<number, string>>({})
  const [courseId, setCourseId] = useState(0)
  const [jobTitle, setJobTitle] = useState('')
  const [departmentId, setDepartmentId] = useState(0)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setError('')
    fetchTrainingBudget(year).then(setReport).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الميزانية'))
  }, [year])
  useEffect(load, [load])
  useEffect(() => {
    fetchTrainingRequirements().then(setMandatory).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل التدريب الإلزامي'))
    fetchTrainingCourses().then((data) => { const active = data.courses.filter((course) => course.isActive); setCourses(active); setCourseId(active[0]?.id ?? 0) }).catch(() => setCourses([]))
    fetchDepartments().then(setDepartments).catch(() => setDepartments([]))
  }, [])

  const run = async (work: () => Promise<string>) => {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      setInfo(await work())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ الإجراء')
    } finally {
      setBusy(false)
    }
  }
  const saveBudget = (id: number, name: string) => run(async () => {
    setReport(await setTrainingBudget(year, id, (draft[id] ?? '').trim()))
    setDraft((prev) => { const next = { ...prev }; delete next[id]; return next })
    return `اتحفظت ميزانية «${name}» لسنة ${year}.`
  })
  const add = () => run(async () => {
    setMandatory(await addTrainingRequirement({ courseId, ...(jobTitle.trim() ? { jobTitle: jobTitle.trim() } : {}), ...(departmentId ? { departmentId } : {}) }))
    setJobTitle('')
    return 'اتضاف الإلزام.'
  })
  const remove = (id: number) => run(async () => { setMandatory(await removeTrainingRequirement(id)); return 'اتشال الإلزام.' })
  const notice = report && !report.available ? report.message : mandatory && !mandatory.available ? mandatory.message : ''

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ClipboardList size={24} className="text-primary-600" />
              خطة التدريب
            </h1>
            <p className="text-gray-500 mt-1">ميزانية كل قسم والتكلفة الفعلية مقابلها، والتدريب الإلزامي والناقص منه — أرقام للتقرير بس</p>
          </div>
          <label className="text-sm text-gray-600">
            السنة
            <input className="input mt-1 w-28" inputMode="numeric" value={year} onChange={(e) => { const next = Number(e.target.value.replace(/\D/g, '').slice(0, 4)); if (next >= 2000 && next <= 2100) setYear(next) }} />
          </label>
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {info && (
          <div role="status" className="bg-green-50 text-green-800 rounded-xl p-4">
            {info}
          </div>
        )}
        {notice && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            {notice}
          </div>
        )}
        {report?.available && (
          <div className="card overflow-x-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-3">التكلفة مقابل الميزانية — {report.year}</h2>
            <table className="w-full text-sm" data-budget>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">القسم</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">الميزانية</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">التكلفة الفعلية</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">الباقي</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">المقاعد</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.rows.map((row) => (
                  <tr key={row.departmentId}>
                    <td className="px-3 py-2 text-gray-800">
                      {row.departmentName}
                      {row.branchName ? <span className="text-xs text-gray-400"> · {row.branchName}</span> : null}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.departmentId ? (
                        <input className="input w-32 text-sm" inputMode="decimal" value={draft[row.departmentId] ?? (row.hasBudget ? row.budget : '')} placeholder="من غير ميزانية"
                          onChange={(e) => setDraft((prev) => ({ ...prev, [row.departmentId]: e.target.value }))} />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{row.spent}</td>
                    <td className={`px-3 py-2 tabular-nums ${row.over ? 'text-red-600 font-medium' : ''}`}>{row.hasBudget ? row.remaining : '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{row.seats}</td>
                    <td className="px-3 py-2 text-left">
                      {row.departmentId > 0 && draft[row.departmentId] !== undefined && draft[row.departmentId].trim() !== '' && (
                        <button onClick={() => saveBudget(row.departmentId, row.departmentName)} disabled={busy} className="btn-secondary text-xs disabled:opacity-50">
                          حفظ
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-medium">
                  <td className="px-3 py-2">الإجمالي</td>
                  <td className="px-3 py-2 tabular-nums">{report.totals.budget}</td>
                  <td className="px-3 py-2 tabular-nums">{report.totals.spent}</td>
                  <td className="px-3 py-2 tabular-nums">{report.totals.remaining}</td>
                  <td className="px-3 py-2 tabular-nums">{report.totals.seats}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {mandatory?.available && (
          <div className="card space-y-4">
            <h2 className="text-lg font-bold text-gray-800">التدريب الإلزامي</h2>
            <div className="flex items-end gap-3 flex-wrap" data-requirement-form>
              <label className="text-sm text-gray-600">
                الدورة
                <select className="input mt-1 min-w-48" value={courseId} onChange={(e) => setCourseId(Number(e.target.value))}>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-gray-600">
                المسمى الوظيفي
                <input className="input mt-1 w-48" maxLength={200} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </label>
              <label className="text-sm text-gray-600">
                القسم
                <select className="input mt-1 min-w-40" value={departmentId} onChange={(e) => setDepartmentId(Number(e.target.value))}>
                  <option value={0}>{mandatory.canCompany ? 'كل الشركة' : 'اختار قسم'}</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={add} disabled={busy || !courseId || (!jobTitle.trim() && !departmentId)} className="btn-primary text-sm disabled:opacity-50">
                إضافة إلزام
              </button>
            </div>
            {mandatory.requirements.length > 0 && (
              <ul className="divide-y divide-gray-100 text-sm" data-requirements>
                {mandatory.requirements.map((row) => (
                  <li key={row.id} className="py-2 flex items-center justify-between gap-3">
                    <span className="text-gray-700">
                      {row.courseName} — {[row.jobTitle ? `المسمى: ${row.jobTitle}` : '', row.departmentName ? `القسم: ${row.departmentName}` : 'كل الشركة'].filter(Boolean).join(' · ')}
                    </span>
                    {row.canRemove && (
                      <button onClick={() => remove(row.id)} disabled={busy} className="text-red-600 hover:underline text-xs disabled:opacity-50">
                        شيل
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div>
              <h3 className="font-medium text-gray-800 mb-2">الناقص ({mandatory.missing.length})</h3>
              {mandatory.missing.length === 0 ? (
                <p className="text-sm text-gray-500">مفيش تدريب إلزامي ناقص.</p>
              ) : (
                <ul className="text-sm text-gray-700 space-y-1" data-missing>
                  {mandatory.missing.map((row, index) => (
                    <li key={index}>
                      {row.employeeName}
                      {row.departmentName ? ` (${row.departmentName})` : ''} — {row.courseName}
                      {row.enrolled ? <span className="text-xs text-blue-700"> · مسجّل في جلسة</span> : <span className="text-xs text-amber-700"> · لسه مااتسجّلش</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
