'use client'

// B3.9: جلسة تدريب — المسجّلين وحضورهم وإكمالهم (والشهادة بتتسجّل مستند للموظف)، وتسجيل موظفين، وحالة الجلسة.
// (كانت شاشة عرض ببيانات وهمية؛ بقت على الخادم.)
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { fetchEmployees, type ApiEmployee } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { enrollInTraining, fetchTrainingSession, markTrainingEnrollment, updateTrainingSession, type ApiSessionDetail, type ApiTrainingEnrollment, type TrainingEnrollmentStatus } from '@/lib/training-api'

const OPEN: TrainingEnrollmentStatus[] = ['ENROLLED', 'ATTENDED', 'ABSENT']

export default function TrainingSessionPage() {
  const params = useParams<{ id: string }>()
  const id = Number(params?.id)
  const [data, setData] = useState<ApiSessionDetail | null>(null)
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [picked, setPicked] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Record<number, string>>({})
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) {
      setError('الجلسة غير موجودة')
      return
    }
    fetchTrainingSession(id).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الجلسة'))
    fetchEmployees().then(setEmployees).catch(() => setEmployees([]))
  }, [id])

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
  const mark = (row: ApiTrainingEnrollment, status: Exclude<TrainingEnrollmentStatus, 'ENROLLED'>) => run(async () => {
    // النتيجة (اختيارية) من خانتها في الصف — بتتبعت مع «أكمل» بس
    const result = status === 'COMPLETED' ? results[row.id] ?? '' : ''
    setData(await markTrainingEnrollment(row.id, status, result.trim() || undefined))
    return status === 'COMPLETED' ? `اتسجّل إكمال ${row.employeeName ?? ''}.` : 'اتحدّثت الحالة.'
  })
  const enroll = () => run(async () => {
    const made = await enrollInTraining(id, picked)
    setData(made)
    setPicked([])
    return `اتسجّل ${made.enrolled} موظف${made.already ? ` (${made.already} مسجّل قبل كده)` : ''}.`
  })
  const setStatus = (status: 'DONE' | 'CANCELLED') => run(async () => { setData(await updateTrainingSession(id, { status })); return status === 'DONE' ? 'الجلسة اتعملت.' : 'الجلسة اتلغت.' })

  const taken = useMemo(() => new Set((data?.enrollments ?? []).filter((row) => row.status !== 'CANCELLED').map((row) => row.employeeId)), [data])
  const candidates = useMemo(() => {
    const term = search.trim()
    return employees.filter((employee) => !taken.has(employee.id) && (!term || employee.fullName.includes(term) || employee.employeeCode.includes(term))).slice(0, 30)
  }, [employees, taken, search])
  const session = data?.session

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Link href="/training" className="text-sm text-primary-600 hover:underline">
            ← الدورات التدريبية
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mt-2">
            <GraduationCap size={24} className="text-primary-600" />
            {session ? session.courseName : 'جلسة تدريب'}
          </h1>
          {session && (
            <p className="text-gray-500 mt-1">
              {formatDate(session.startDate)} – {formatDate(session.endDate)} · {session.branchName ?? 'كل الشركة'}
              {session.location ? ` · ${session.location}` : ''}
              {session.trainer ? ` · المدرب: ${session.trainer}` : ''} · {session.statusLabel}
            </p>
          )}
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
        {session && (
          <div className="card flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-gray-600 tabular-nums">
              مسجّلين {session.counts.seats}
              {session.capacity !== null ? ` من ${session.capacity}` : ''} · حضروا {session.counts.attended} · أكملوا {session.counts.completed}
              {session.costPerSeat !== null ? ` · تكلفة المقعد ${session.costPerSeat}` : ''}
              {data && data.hidden > 0 ? ` · ${data.hidden} برّه نطاقك` : ''}
            </p>
            {session.status === 'PLANNED' && (
              <div className="flex items-center gap-2">
                <button onClick={() => setStatus('DONE')} disabled={busy} className="btn-secondary text-sm disabled:opacity-50">
                  الجلسة اتعملت
                </button>
                <button onClick={() => setStatus('CANCELLED')} disabled={busy} className="btn-secondary text-sm text-red-600 disabled:opacity-50">
                  إلغاء الجلسة
                </button>
              </div>
            )}
          </div>
        )}
        {data && data.enrollments.length > 0 && (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm" data-enrollments>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-start font-medium text-gray-600">الموظف</th>
                  <th className="px-3 py-2 text-start font-medium text-gray-600">الحالة</th>
                  <th className="px-3 py-2 text-start font-medium text-gray-600">النتيجة</th>
                  <th className="px-3 py-2 text-start font-medium text-gray-600">الشهادة</th>
                  <th className="px-3 py-2 text-start font-medium text-gray-600">تقييمه</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.enrollments.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 text-gray-800">
                      {row.employeeName}
                      {row.fromRequest && <span className="text-xs text-gray-400"> · من طلب</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{row.statusLabel}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {OPEN.includes(row.status) && session?.status !== 'CANCELLED' ? (
                        <input className="input w-32 text-xs" maxLength={200} placeholder="النتيجة (اختياري)" value={results[row.id] ?? ''} onChange={(e) => setResults((prev) => ({ ...prev, [row.id]: e.target.value }))} />
                      ) : (
                        row.result ?? '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{row.certificate ? (row.certificate.expiryDate ? `لحد ${formatDate(row.certificate.expiryDate)}` : 'من غير انتهاء') : '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{row.rating !== null ? `${row.rating} / 5` : '—'}</td>
                    <td className="px-3 py-2 text-end whitespace-nowrap">
                      {OPEN.includes(row.status) && session?.status !== 'CANCELLED' && (
                        <span className="inline-flex items-center gap-2 text-xs">
                          {row.status !== 'ATTENDED' && (
                            <button onClick={() => mark(row, 'ATTENDED')} disabled={busy} className="text-primary-600 hover:underline disabled:opacity-50">
                              حضر
                            </button>
                          )}
                          <button onClick={() => mark(row, 'COMPLETED')} disabled={busy} className="text-green-700 hover:underline disabled:opacity-50">
                            أكمل
                          </button>
                          {row.status !== 'ABSENT' && (
                            <button onClick={() => mark(row, 'ABSENT')} disabled={busy} className="text-amber-700 hover:underline disabled:opacity-50">
                              غاب
                            </button>
                          )}
                          <button onClick={() => mark(row, 'CANCELLED')} disabled={busy} className="text-red-600 hover:underline disabled:opacity-50">
                            إلغاء
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {session?.status === 'PLANNED' && (
          <div className="card space-y-3" data-enroll>
            <h2 className="font-bold text-gray-800">تسجيل موظفين</h2>
            <input className="input w-full" placeholder="ابحث بالاسم أو الكود" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {candidates.map((employee) => {
                const on = picked.includes(employee.id)
                return (
                  <button
                    key={employee.id}
                    onClick={() => setPicked((prev) => (on ? prev.filter((value) => value !== employee.id) : [...prev, employee.id]))}
                    className={`px-3 py-1 rounded-full text-sm ${on ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {employee.fullName}
                  </button>
                )
              })}
            </div>
            <button onClick={enroll} disabled={busy || picked.length === 0} className="btn-primary text-sm disabled:opacity-50">
              سجّل المختارين ({picked.length})
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
