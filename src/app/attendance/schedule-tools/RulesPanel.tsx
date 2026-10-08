'use client'

// B5.5 (ب): قواعد فحص الجدول (راحة وحد ساعات بشدتين) وتغطية الوردية بالمهارة، وفحص أسبوع لفرع بالطلب. جزء من «أدوات الجدولة» (ميزة shifts.advanced).
import { useCallback, useEffect, useState } from 'react'
import {
  checkScheduleWeek, fetchScheduleRules, saveCoverageRule, saveScheduleRule, type ApiScheduleChecks, type ApiScheduleRules, type ApiScheduleTools, type RuleKind, type Severity,
} from '@/lib/schedule-tools-api'

const LEVELS = [{ code: 'beginner', label: 'مبتدئ' }, { code: 'intermediate', label: 'متوسط' }, { code: 'advanced', label: 'متقدم' }, { code: 'expert', label: 'خبير' }]
const emptyRule = () => ({ id: null as number | null, kind: 'MIN_REST_HOURS' as RuleKind, limitHours: '', severity: 'WARN' as Severity, branchId: '', isActive: true })
const emptyCoverage = () => ({ id: null as number | null, shiftId: '', skillId: '', minLevel: 'intermediate', minCount: '1', severity: 'WARN' as Severity, isActive: true })

export default function RulesPanel({ tools, week, branchId }: { tools: ApiScheduleTools; week: string; branchId: string }) {
  const [data, setData] = useState<ApiScheduleRules | null>(null)
  const [checks, setChecks] = useState<ApiScheduleChecks | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [rule, setRule] = useState(emptyRule())
  const [coverage, setCoverage] = useState(emptyCoverage())

  const load = useCallback(() => {
    fetchScheduleRules().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل القواعد'))
  }, [])
  useEffect(load, [load])

  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError('')
    try { await action(); load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر التنفيذ') } finally { setBusy(false) }
  }
  const saveRule = () => {
    const limitHours = Number(rule.limitHours)
    if (!(limitHours > 0)) return setError('اكتب الحد بالساعات')
    return run(async () => { await saveScheduleRule({ kind: rule.kind, limitHours, severity: rule.severity, branchId: rule.branchId ? Number(rule.branchId) : null, isActive: rule.isActive }, rule.id ?? undefined); setRule(emptyRule()) })
  }
  const saveCoverage = () => {
    if (!coverage.shiftId || !coverage.skillId || !(Number(coverage.minCount) >= 1)) return setError('اختار الوردية والمهارة واكتب أقل عدد')
    return run(async () => {
      await saveCoverageRule({ shiftId: Number(coverage.shiftId), skillId: Number(coverage.skillId), minLevel: coverage.minLevel, minCount: Number(coverage.minCount), severity: coverage.severity, isActive: coverage.isActive }, coverage.id ?? undefined)
      setCoverage(emptyCoverage())
    })
  }
  const check = () => {
    if (!branchId) return setError('اختار الفرع في «نشر جدول الأسبوع» الأول')
    return run(async () => setChecks(await checkScheduleWeek(week, Number(branchId))))
  }

  if (!data) return error ? <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div> : null
  const kindLabel = (code: string) => data.kinds.find((kind) => kind.code === code)?.label ?? code
  const severityLabel = (code: string) => data.severities.find((item) => item.code === code)?.label ?? code
  const shiftName = (id: number) => tools.shifts.find((row) => row.id === id)?.name ?? `وردية #${id}`
  const branchName = (id: number | null) => (id === null ? 'كل الفروع' : tools.branches.find((row) => row.id === id)?.name ?? `فرع #${id}`)
  return (
    <div className="card space-y-3" data-schedule-rules>
      <h2 className="text-lg font-semibold text-gray-800">قواعد فحص الجدول</h2>
      <p className="text-xs text-gray-500">الفحص عند النشر وبالطلب. «تحذير» بيتسجّل مع النشر، و«منع» بيوقّف النشر إلا بسبب تجاوز. من غير قواعد مفيش فحص.</p>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {!data.ready ? <p className="text-amber-800">جداول فحص الجدول لسه ماتطبّقتش (ترحيلات 163 و164 و165).</p> : (
        <>
          {data.rules.length > 0 && (
            <ul className="divide-y divide-gray-100 text-sm">
              {data.rules.map((row) => (
                <li key={row.id} className="py-2 flex flex-wrap items-center gap-3">
                  <b>{kindLabel(row.kind)}</b><span className="font-mono">{row.limitHours}</span>
                  <span className={row.severity === 'BLOCK' ? 'text-red-700' : 'text-amber-700'}>{severityLabel(row.severity)}</span>
                  <span className="text-gray-500">{branchName(row.branchId)}</span>
                  {!row.isActive && <span className="text-gray-400">مقفولة</span>}
                  <button type="button" className="mr-auto text-primary-600 text-xs" onClick={() => setRule({ id: row.id, kind: row.kind, limitHours: String(row.limitHours), severity: row.severity, branchId: row.branchId === null ? '' : String(row.branchId), isActive: row.isActive })}>تعديل</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3" data-schedule-rule-form>
            <label className="text-sm text-gray-600">{rule.id === null ? 'قاعدة جديدة' : 'تعديل القاعدة'}
              <select className="input mt-1" value={rule.kind} onChange={(event) => setRule({ ...rule, kind: event.target.value as RuleKind })}>
                {data.kinds.map((kind) => <option key={kind.code} value={kind.code}>{kind.label}</option>)}
              </select>
            </label>
            <label className="text-sm text-gray-600">الحد (ساعات)
              <input className="input mt-1 w-24 text-center" dir="ltr" inputMode="decimal" value={rule.limitHours} onChange={(event) => setRule({ ...rule, limitHours: event.target.value })} />
            </label>
            <label className="text-sm text-gray-600">الشدة
              <select className="input mt-1" value={rule.severity} onChange={(event) => setRule({ ...rule, severity: event.target.value as Severity })}>
                {data.severities.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-sm text-gray-600">الفرع
              <select className="input mt-1" value={rule.branchId} onChange={(event) => setRule({ ...rule, branchId: event.target.value })}>
                {tools.companyWide ? <option value="">كل الفروع</option> : <option value="">اختار</option>}
                {tools.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
            <label className="text-sm text-gray-600 flex items-center gap-2"><input type="checkbox" checked={rule.isActive} onChange={(event) => setRule({ ...rule, isActive: event.target.checked })} />مفعّلة</label>
            <button type="button" className="btn-primary text-xs disabled:opacity-50" disabled={busy} onClick={saveRule}>حفظ القاعدة</button>
          </div>

          {tools.companyWide && data.skills.length > 0 && (
            <div className="space-y-2" data-shift-coverage>
              <h3 className="font-semibold text-gray-700">تغطية الوردية بالمهارة</h3>
              {data.coverage.map((row) => (
                <p key={row.id} className="text-sm flex flex-wrap items-center gap-3">
                  <span>{shiftName(row.shiftId)} محتاجة {row.minCount} بمهارة «{data.skills.find((skill) => skill.id === row.skillId)?.name ?? `#${row.skillId}`}» ({LEVELS.find((level) => level.code === row.minLevel)?.label ?? row.minLevel})</span>
                  <span className={row.severity === 'BLOCK' ? 'text-red-700' : 'text-amber-700'}>{severityLabel(row.severity)}</span>
                  {!row.isActive && <span className="text-gray-400">مقفولة</span>}
                  <button type="button" className="text-primary-600 text-xs" onClick={() => setCoverage({ id: row.id, shiftId: String(row.shiftId), skillId: String(row.skillId), minLevel: row.minLevel, minCount: String(row.minCount), severity: row.severity, isActive: row.isActive })}>تعديل</button>
                </p>
              ))}
              <div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3" data-shift-coverage-form>
                <select className="input" aria-label="وردية التغطية" value={coverage.shiftId} onChange={(event) => setCoverage({ ...coverage, shiftId: event.target.value })}>
                  <option value="">الوردية</option>
                  {tools.shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}
                </select>
                <select className="input" aria-label="مهارة التغطية" value={coverage.skillId} onChange={(event) => setCoverage({ ...coverage, skillId: event.target.value })}>
                  <option value="">المهارة</option>
                  {data.skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                </select>
                <select className="input" aria-label="أقل مستوى" value={coverage.minLevel} onChange={(event) => setCoverage({ ...coverage, minLevel: event.target.value })}>
                  {LEVELS.map((level) => <option key={level.code} value={level.code}>{level.label}</option>)}
                </select>
                <input className="input w-20 text-center" dir="ltr" inputMode="numeric" aria-label="أقل عدد" value={coverage.minCount} onChange={(event) => setCoverage({ ...coverage, minCount: event.target.value })} />
                <select className="input" aria-label="شدة التغطية" value={coverage.severity} onChange={(event) => setCoverage({ ...coverage, severity: event.target.value as Severity })}>
                  {data.severities.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                </select>
                <button type="button" className="btn-primary text-xs disabled:opacity-50" disabled={busy} onClick={saveCoverage}>حفظ التغطية</button>
              </div>
            </div>
          )}

          <div className="space-y-2" data-schedule-checks>
            <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy} onClick={check}>افحص أسبوع النشر المختار</button>
            {checks && (checks.violations.length === 0 ? <p className="text-green-700 text-sm">مفيش مخالفات في أسبوع <span dir="ltr">{checks.week}</span>.</p> : (
              <ul className="text-sm space-y-1">
                {checks.violations.map((row, index) => (
                  <li key={index} className={row.severity === 'BLOCK' ? 'text-red-700' : 'text-amber-700'}>
                    [{row.severityLabel}] {row.employeeName ?? row.shiftName ?? '—'}: {row.detail}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
