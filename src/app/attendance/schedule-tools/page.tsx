'use client'

// B5.5 (أ): «أدوات الجدولة» — نسخ أسبوع، أنماط تدوير الورديات وتطبيقها، ونشر جدول الأسبوع للموظفين بإشعار. ميزة shifts.advanced (مقفولة افتراضيًا).
// الكتابة كلها بتعدّي من الجدول الأسبوعي القايم بنفس قواعده.
import { useCallback, useEffect, useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { fetchEmployees, type ApiEmployee } from '@/lib/api'
import RulesPanel from './RulesPanel'
import {
  applyShiftRotation, copyScheduleWeek, createShiftRotation, fetchScheduleTools, publishScheduleWeek, updateShiftRotation, type ApiScheduleTools, type ApiShiftRotation, type ScheduleSkip,
} from '@/lib/schedule-tools-api'

const ymd = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
/** بداية الأسبوع (الأحد) بعد n أسبوع من الأسبوع الحالي */
const weekFromNow = (n: number) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - date.getDay() + n * 7); return ymd(date) }
const isSunday = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T12:00:00`).getDay() === 0
const emptyRotation = () => ({ id: null as number | null, name: '', branchId: '', shiftIds: ['', ''] as string[], isActive: true })

export default function ScheduleToolsPage() {
  const [data, setData] = useState<ApiScheduleTools | null>(null)
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [skipped, setSkipped] = useState<ScheduleSkip[]>([])
  const [busy, setBusy] = useState(false)
  const [copy, setCopy] = useState({ fromWeek: weekFromNow(0), toWeek: weekFromNow(1), branchId: '', overwrite: false })
  const [rotation, setRotation] = useState(emptyRotation())
  const [apply, setApply] = useState({ rotationId: '', branchId: '', employeeIds: [] as string[], fromWeek: weekFromNow(1), weeks: '4', startIndex: '0' })
  const [publish, setPublish] = useState({ week: weekFromNow(1), branchId: '', note: '', overrideReason: '' })

  const load = useCallback(() => {
    fetchScheduleTools().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل أدوات الجدولة'))
  }, [])
  useEffect(load, [load])
  useEffect(() => { fetchEmployees().then(setEmployees).catch(() => setEmployees([])) }, [])

  async function run(action: () => Promise<{ skipped?: ScheduleSkip[] } | unknown>, done: (result: never) => string) {
    setBusy(true); setError(''); setInfo(''); setSkipped([])
    try {
      const result = await action()
      setInfo(done(result as never)); setSkipped((result as { skipped?: ScheduleSkip[] })?.skipped ?? []); load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر التنفيذ') } finally { setBusy(false) }
  }

  const doCopy = () => {
    if (!isSunday(copy.fromWeek) || !isSunday(copy.toWeek)) return setError('اختار تاريخ يوم أحد لبداية كل أسبوع')
    return run(() => copyScheduleWeek({ fromWeek: copy.fromWeek, toWeek: copy.toWeek, branchId: copy.branchId ? Number(copy.branchId) : null, overwrite: copy.overwrite }),
      (result: { copied: number; alreadyScheduled: number }) => `اتنسخت ${result.copied} وردية${result.alreadyScheduled ? ` — ${result.alreadyScheduled} موظف له وردية في الأسبوع الهدف واتساب` : ''}`)
  }
  const saveRotation = () => {
    const shiftIds = rotation.shiftIds.map(Number)
    if (rotation.name.trim().length < 2 || shiftIds.some((id) => !id)) return setError('اكتب اسم النمط واختار وردية لكل خانة')
    const body = { name: rotation.name.trim(), branchId: rotation.branchId ? Number(rotation.branchId) : null, shiftIds, isActive: rotation.isActive }
    return run(async () => { if (rotation.id === null) await createShiftRotation(body); else await updateShiftRotation(rotation.id, body); setRotation(emptyRotation()) }, () => 'اتحفظ النمط')
  }
  const editRotation = (row: ApiShiftRotation) => setRotation({ id: row.id, name: row.name, branchId: row.branchId === null ? '' : String(row.branchId), shiftIds: row.shiftIds.map(String), isActive: row.isActive })
  const doApply = () => {
    if (!apply.rotationId || apply.employeeIds.length === 0 || !isSunday(apply.fromWeek)) return setError('اختار النمط والموظفين وأسبوع بداية يبدأ بيوم أحد')
    return run(() => applyShiftRotation({ rotationId: Number(apply.rotationId), employeeIds: apply.employeeIds.map(Number), fromWeek: apply.fromWeek, weeks: Number(apply.weeks), startIndex: Number(apply.startIndex) }),
      (result: { saved: number; weeks: number }) => `اتحفظت ${result.saved} وردية على ${result.weeks} أسبوع`)
  }
  const doPublish = () => {
    if (!publish.branchId || !isSunday(publish.week)) return setError('اختار الفرع وأسبوع يبدأ بيوم أحد')
    return run(() => publishScheduleWeek({ week: publish.week, branchId: Number(publish.branchId), note: publish.note.trim(), ...(publish.overrideReason.trim() ? { overrideReason: publish.overrideReason.trim() } : {}) }),
      (result: { employeesCount: number; warnings: number; blocked: number }) => `اتنشر الجدول واتبعت إشعار لـ${result.employeesCount} موظف${result.warnings || result.blocked ? ` — اتسجّلت ${result.warnings + result.blocked} مخالفة` : ''}`)
  }

  const shiftName = (id: number) => { const shift = data?.shifts.find((row) => row.id === id); return shift ? `${shift.name} (${shift.startTime}–${shift.endTime})` : `وردية #${id}` }
  const branchName = (id: number | null) => (id === null ? 'كل الفروع' : data?.branches.find((row) => row.id === id)?.name ?? `فرع #${id}`)
  const branchEmployees = employees.filter((person) => !apply.branchId || String(person.branchId ?? '') === apply.branchId)
  const chosen = data?.rotations.find((row) => String(row.id) === apply.rotationId)

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarRange size={24} className="text-primary-600" />
            أدوات الجدولة
          </h1>
          <p className="text-gray-500 mt-1">نسخ أسبوع، أنماط تدوير الورديات، ونشر جدول الأسبوع للموظفين. كل تغيير بيتحفظ في الجدول الأسبوعي بنفس قواعده.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {skipped.length > 0 && (
          <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm" data-schedule-skipped>
            موظفين مااتحفظش لهم: {skipped.map((row) => `${employees.find((person) => person.id === row.employeeId)?.fullName ?? `#${row.employeeId}`} (${row.reason})`).join('، ')}
          </div>
        )}
        {data && !data.ready && <div className="card text-amber-800 bg-amber-50">جداول أدوات الجدولة لسه ماتطبّقتش على قاعدة البيانات (ترحيلي 161 و162).</div>}

        {data?.ready && (
          <div className="card space-y-3" data-schedule-copy>
            <h2 className="text-lg font-semibold text-gray-800">نسخ أسبوع</h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-gray-600">من أسبوع (يبدأ الأحد)
                <input type="date" className="input mt-1" value={copy.fromWeek} onChange={(event) => setCopy({ ...copy, fromWeek: event.target.value })} />
              </label>
              <label className="text-sm text-gray-600">إلى أسبوع
                <input type="date" className="input mt-1" value={copy.toWeek} onChange={(event) => setCopy({ ...copy, toWeek: event.target.value })} />
              </label>
              <label className="text-sm text-gray-600">الفرع
                <select className="input mt-1" value={copy.branchId} onChange={(event) => setCopy({ ...copy, branchId: event.target.value })}>
                  <option value="">كل فروع نطاقي</option>
                  {data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </label>
              <label className="text-sm text-gray-600 flex items-center gap-2"><input type="checkbox" checked={copy.overwrite} onChange={(event) => setCopy({ ...copy, overwrite: event.target.checked })} />اكتب فوق اللي له وردية</label>
              <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={doCopy}>نسخ</button>
            </div>
          </div>
        )}

        {data?.ready && (
          <div className="card space-y-3" data-shift-rotations>
            <h2 className="text-lg font-semibold text-gray-800">أنماط التدوير</h2>
            {data.rotations.length > 0 && (
              <ul className="divide-y divide-gray-100 text-sm">
                {data.rotations.map((row) => (
                  <li key={row.id} className="py-2 flex flex-wrap items-center gap-3">
                    <b>{row.name}</b>
                    <span className="text-gray-500">{branchName(row.branchId)}</span>
                    <span className="text-gray-700">{row.shiftIds.map(shiftName).join(' ← ')}</span>
                    {!row.isActive && <span className="text-gray-400">مقفول</span>}
                    <button type="button" className="mr-auto text-primary-600 text-xs" onClick={() => editRotation(row)}>تعديل</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="bg-gray-50 rounded-xl p-3 space-y-2" data-shift-rotation-form>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex-1 min-w-48 text-sm text-gray-600">{rotation.id === null ? 'نمط جديد' : 'تعديل النمط'}
                  <input className="input w-full mt-1" maxLength={120} value={rotation.name} onChange={(event) => setRotation({ ...rotation, name: event.target.value })} />
                </label>
                <label className="text-sm text-gray-600">الفرع
                  <select className="input mt-1" value={rotation.branchId} onChange={(event) => setRotation({ ...rotation, branchId: event.target.value })}>
                    {data.companyWide && <option value="">كل الفروع</option>}
                    {!data.companyWide && <option value="">اختار</option>}
                    {data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </label>
                <label className="text-sm text-gray-600 flex items-center gap-2"><input type="checkbox" checked={rotation.isActive} onChange={(event) => setRotation({ ...rotation, isActive: event.target.checked })} />مفعّل</label>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {rotation.shiftIds.map((value, index) => (
                  <span key={index} className="inline-flex items-center gap-1">
                    <span className="text-gray-500">أسبوع {index + 1}</span>
                    <select className="input" aria-label={`وردية الأسبوع ${index + 1}`} value={value} onChange={(event) => setRotation({ ...rotation, shiftIds: rotation.shiftIds.map((item, at) => (at === index ? event.target.value : item)) })}>
                      <option value="">الوردية</option>
                      {data.shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name} ({shift.startTime}–{shift.endTime})</option>)}
                    </select>
                    {rotation.shiftIds.length > 2 && <button type="button" className="text-red-600 text-xs" onClick={() => setRotation({ ...rotation, shiftIds: rotation.shiftIds.filter((_, at) => at !== index) })}>شيل</button>}
                  </span>
                ))}
                {rotation.shiftIds.length < 12 && <button type="button" className="text-primary-600 text-xs" onClick={() => setRotation({ ...rotation, shiftIds: [...rotation.shiftIds, ''] })}>+ أسبوع</button>}
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn-primary text-xs disabled:opacity-50" disabled={busy} onClick={saveRotation}>حفظ النمط</button>
                {rotation.id !== null && <button type="button" className="btn-secondary text-xs" onClick={() => setRotation(emptyRotation())}>إلغاء</button>}
              </div>
            </div>
          </div>
        )}

        {data?.ready && data.rotations.some((row) => row.isActive) && (
          <div className="card space-y-3" data-rotation-apply>
            <h2 className="text-lg font-semibold text-gray-800">تطبيق نمط على موظفين</h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-gray-600">النمط
                <select className="input mt-1" value={apply.rotationId} onChange={(event) => setApply({ ...apply, rotationId: event.target.value, startIndex: '0' })}>
                  <option value="">اختار</option>
                  {data.rotations.filter((row) => row.isActive).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                </select>
              </label>
              <label className="text-sm text-gray-600">يبدأ من خانة
                <select className="input mt-1" value={apply.startIndex} onChange={(event) => setApply({ ...apply, startIndex: event.target.value })}>
                  {(chosen?.shiftIds ?? []).map((id, index) => <option key={index} value={index}>{index + 1} — {shiftName(id)}</option>)}
                </select>
              </label>
              <label className="text-sm text-gray-600">من أسبوع (يبدأ الأحد)
                <input type="date" className="input mt-1" value={apply.fromWeek} onChange={(event) => setApply({ ...apply, fromWeek: event.target.value })} />
              </label>
              <label className="text-sm text-gray-600">عدد الأسابيع
                <input className="input mt-1 w-20 text-center" dir="ltr" inputMode="numeric" value={apply.weeks} onChange={(event) => setApply({ ...apply, weeks: event.target.value })} />
              </label>
              <label className="text-sm text-gray-600">الفرع
                <select className="input mt-1" value={apply.branchId} onChange={(event) => setApply({ ...apply, branchId: event.target.value, employeeIds: [] })}>
                  <option value="">كل فروع نطاقي</option>
                  {data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-sm text-gray-600">الموظفين ({apply.employeeIds.length} مختار)
              <select multiple className="input w-full mt-1 h-40" value={apply.employeeIds} onChange={(event) => setApply({ ...apply, employeeIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>
                {branchEmployees.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
              </select>
            </label>
            <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={doApply}>تطبيق النمط</button>
          </div>
        )}

        {data?.ready && <RulesPanel tools={data} week={publish.week} branchId={publish.branchId} />}

        {data?.ready && (
          <div className="card space-y-3" data-schedule-publish>
            <h2 className="text-lg font-semibold text-gray-800">نشر جدول الأسبوع</h2>
            <p className="text-xs text-gray-500">النشر بيبعت إشعار لموظفين الفرع اللي لهم وردية في الأسبوع. الجدول نفسه مابيتغيّرش، وتعديله بعد النشر مسموح (انشر تاني عشان يتبلّغوا).</p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-gray-600">الأسبوع (يبدأ الأحد)
                <input type="date" className="input mt-1" value={publish.week} onChange={(event) => setPublish({ ...publish, week: event.target.value })} />
              </label>
              <label className="text-sm text-gray-600">الفرع
                <select className="input mt-1" value={publish.branchId} onChange={(event) => setPublish({ ...publish, branchId: event.target.value })}>
                  <option value="">اختار</option>
                  {data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </label>
              <label className="flex-1 min-w-48 text-sm text-gray-600">ملاحظة
                <input className="input w-full mt-1" maxLength={300} value={publish.note} onChange={(event) => setPublish({ ...publish, note: event.target.value })} />
              </label>
              <label className="flex-1 min-w-48 text-sm text-gray-600">سبب تجاوز مخالفات «منع» (لو فيه)
                <input className="input w-full mt-1" maxLength={300} value={publish.overrideReason} onChange={(event) => setPublish({ ...publish, overrideReason: event.target.value })} />
              </label>
              <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={doPublish}>نشر</button>
            </div>
            {data.publications.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="table-header text-center">الأسبوع</th>
                      <th className="table-header text-right">الفرع</th>
                      <th className="table-header text-center">موظفين</th>
                      <th className="table-header text-right">نشره</th>
                      <th className="table-header text-right">ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.publications.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100">
                        <td className="table-cell text-center" dir="ltr">{row.weekStart}</td>
                        <td className="table-cell">{branchName(row.branchId)}</td>
                        <td className="table-cell text-center">{row.employeesCount}</td>
                        <td className="table-cell text-xs text-gray-500">{row.publishedByName ?? '—'} · <span dir="ltr">{String(row.publishedAt).slice(0, 10)}</span></td>
                        <td className="table-cell">{row.note ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
