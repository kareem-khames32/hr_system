'use client'

// B3.9: «الدورات التدريبية» (لإدارة التدريب) — جلسات التدريب بسعتها وتسجيلاتها، وكتالوج الدورات. (كانت شاشة عرض ببيانات وهمية؛ بقت على الخادم.)
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { GraduationCap, Plus, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { fetchBranches, type ApiBranch } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import {
  createTrainingSession, fetchTrainingCourses, fetchTrainingSessions, updateTrainingCourse, type ApiTrainingCourse, type ApiTrainingSession, type TrainingSessionStatus,
} from '@/lib/training-api'

const statusStyle: Record<TrainingSessionStatus, string> = { PLANNED: 'bg-blue-50 text-blue-700', DONE: 'bg-green-50 text-green-700', CANCELLED: 'bg-gray-100 text-gray-500' }

export default function TrainingPage() {
  const [sessions, setSessions] = useState<ApiTrainingSession[] | null>(null)
  const [courses, setCourses] = useState<ApiTrainingCourse[]>([])
  const [canCompany, setCanCompany] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(() => {
    setError('')
    Promise.all([fetchTrainingSessions(), fetchTrainingCourses()])
      .then(([sessionData, courseData]) => {
        setSessions(sessionData.sessions)
        setCanCompany(sessionData.canCompany)
        setCourses(courseData.courses)
        setNotice(sessionData.available ? '' : sessionData.message ?? '')
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل التدريب'))
  }, [])
  useEffect(load, [load])

  const toggle = async (course: ApiTrainingCourse) => {
    setError('')
    try {
      await updateTrainingCourse(course.id, { isActive: !course.isActive })
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تعديل الدورة')
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <GraduationCap size={24} className="text-primary-600" />
              الدورات التدريبية
            </h1>
            <p className="text-gray-500 mt-1">جلسات التدريب بسعتها وتسجيلاتها، وكتالوج الدورات</p>
          </div>
          {sessions && !notice && (
            <div className="flex items-center gap-2">
              <Link href="/training/add" className="btn-secondary flex items-center gap-2">
                <Plus size={18} />
                دورة جديدة
              </Link>
              <button onClick={() => setAdding(true)} disabled={!courses.some((course) => course.isActive)} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                <Plus size={18} />
                جلسة جديدة
              </button>
            </div>
          )}
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            {notice}
          </div>
        )}
        {sessions && !notice && sessions.length === 0 && <EmptyState title="مفيش جلسات تدريب لسه" icon={GraduationCap} />}
        {sessions && sessions.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2" data-sessions>
            {sessions.map((session) => (
              <Link key={session.id} href={`/training/${session.id}`} className="card block hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-gray-800">{session.courseName}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(session.startDate)} – {formatDate(session.endDate)} · {session.branchName ?? 'كل الشركة'}
                      {session.location ? ` · ${session.location}` : ''}
                    </p>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusStyle[session.status]}`}>{session.statusLabel}</span>
                </div>
                <p className="text-sm text-gray-600 mt-3 tabular-nums">
                  مسجّلين {session.counts.seats}
                  {session.capacity !== null ? ` من ${session.capacity}` : ''} · حضروا {session.counts.attended} · أكملوا {session.counts.completed}
                </p>
              </Link>
            ))}
          </div>
        )}
        {courses.length > 0 && (
          <div className="card overflow-x-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-3">كتالوج الدورات</h2>
            <table className="w-full text-sm" data-courses>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">الدورة</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">النوع</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">المدة</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">المزوّد</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">الشهادة</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {courses.map((course) => (
                  <tr key={course.id} className={course.isActive ? '' : 'opacity-60'}>
                    <td className="px-3 py-2 text-gray-800">{course.name}</td>
                    <td className="px-3 py-2 text-gray-600">{course.kindLabel}</td>
                    <td className="px-3 py-2 tabular-nums">{course.durationHours !== null ? `${course.durationHours} ساعة` : '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{course.provider ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{course.givesCertificate ? (course.certificateValidMonths ? `صالحة ${course.certificateValidMonths} شهر` : 'من غير انتهاء') : '—'}</td>
                    <td className="px-3 py-2 text-left">
                      <button onClick={() => toggle(course)} className="text-primary-600 hover:underline text-xs">
                        {course.isActive ? 'إيقاف' : 'إتاحة'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {adding && <SessionModal courses={courses.filter((course) => course.isActive)} canCompany={canCompany} onClose={() => setAdding(false)} onDone={() => { setAdding(false); load() }} />}
    </MainLayout>
  )
}

function SessionModal({ courses, canCompany, onClose, onDone }: { courses: ApiTrainingCourse[]; canCompany: boolean; onClose: () => void; onDone: () => void }) {
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [courseId, setCourseId] = useState(courses[0]?.id ?? 0)
  const [branchId, setBranchId] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [trainer, setTrainer] = useState('')
  const [capacity, setCapacity] = useState('')
  const [cost, setCost] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBranches().then((rows) => { setBranches(rows); if (!canCompany && rows.length) setBranchId(rows[0].id) }).catch(() => setBranches([]))
  }, [canCompany])

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await createTrainingSession({ courseId, branchId: branchId || null, startDate, endDate: endDate || startDate, location: location.trim() || null, trainer: trainer.trim() || null,
        capacity: capacity.trim() ? Number(capacity) : null, costPerSeat: cost.trim() || null })
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ الجلسة')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="جلسة جديدة">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">جلسة تدريب جديدة</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}
          <label className="block text-sm text-gray-600">
            الدورة
            <select className="input mt-1 w-full" value={courseId} onChange={(e) => setCourseId(Number(e.target.value))}>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-gray-600">
            الفرع
            <select className="input mt-1 w-full" value={branchId} onChange={(e) => setBranchId(Number(e.target.value))}>
              {canCompany && <option value={0}>كل الشركة</option>}
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-gray-600">
              من يوم
              <input type="date" className="input mt-1 w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-600">
              إلى يوم
              <input type="date" className="input mt-1 w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-600">
              المكان
              <input className="input mt-1 w-full" maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-600">
              المدرب
              <input className="input mt-1 w-full" maxLength={200} value={trainer} onChange={(e) => setTrainer(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-600">
              السعة (فاضية = من غير حد)
              <input className="input mt-1 w-full" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))} />
            </label>
            <label className="block text-sm text-gray-600">
              تكلفة المقعد (للتقرير بس)
              <input className="input mt-1 w-full" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">
              إلغاء
            </button>
            <button onClick={save} disabled={busy || !courseId || !startDate} className="btn-primary text-sm disabled:opacity-50">
              حفظ الجلسة
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
