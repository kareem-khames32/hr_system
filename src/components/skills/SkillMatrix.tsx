'use client'

// B5.4 (أ): مصفوفة المهارات — موظف × مهارات وظيفته المطلوبة، بحكم كل مهارة (مستوفاة، أقل، مش متقيّمة، شهادة منتهية)، وتقييم المهارة من نفس الصف.
// مشتركة بين «المهارات» (صاحب الصلاحية) و«مهاراتي» (المدير على مرؤوسيه).
import { useState } from 'react'
import { assessEmployeeSkill, type ApiSkillRow, type GapStatus, type SkillLevel, type SkillSource } from '@/lib/skills-api'

const STATUS_STYLE: Record<GapStatus, string> = { MET: 'bg-green-50 text-green-700', BELOW: 'bg-amber-50 text-amber-800', MISSING: 'bg-gray-100 text-gray-600', EXPIRED: 'bg-red-50 text-red-700' }

interface Props {
  rows: ApiSkillRow[]
  levels: Array<{ code: SkillLevel; label: string }>
  /** بيسمح بتقييم المهارة من الصف */
  canAssess: boolean
  onChanged: () => void
}

export default function SkillMatrix({ rows, levels, canAssess, onChanged }: Props) {
  const [draft, setDraft] = useState<{ employeeId: number; skillId: number; level: SkillLevel; source: SkillSource; validUntil: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!draft) return
    setBusy(true); setError('')
    try {
      await assessEmployeeSkill(draft.employeeId, draft.skillId, { level: draft.level, source: draft.source, validUntil: draft.source === 'CERTIFICATE' && draft.validUntil ? draft.validUntil : null })
      setDraft(null); onChanged()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر حفظ التقييم') } finally { setBusy(false) }
  }

  if (rows.length === 0) return <p className="text-gray-500">مفيش موظفين في المصفوفة.</p>
  return (
    <div className="space-y-3" data-skill-matrix>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {rows.map((row) => (
        <div key={row.employeeId} className="border border-gray-100 rounded-xl p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <b className="text-gray-800">{row.fullName}</b>
            {row.employeeCode && <span className="text-xs text-gray-500" dir="ltr">{row.employeeCode}</span>}
            <span className="text-sm text-gray-600">{row.positionTitle ?? 'من غير وظيفة معتمدة'}</span>
            {row.cells.length > 0 && <span className={`mr-auto text-xs rounded-full px-3 py-1 ${row.gaps ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-700'}`}>{row.gaps ? `${row.gaps} فجوة` : 'مستوفي'}</span>}
          </div>
          {row.cells.length === 0 ? <p className="text-xs text-gray-500">مفيش مهارات مطلوبة متعرّفة لوظيفته.</p> : (
            <div className="flex flex-wrap gap-2">
              {row.cells.map((cell) => (
                <div key={cell.skillId} className={`rounded-lg px-3 py-2 text-xs ${STATUS_STYLE[cell.status]}`}>
                  <span className="block font-semibold">{cell.skillName}</span>
                  <span className="block">المطلوب: {cell.requiredLabel} · عنده: {cell.levelLabel ?? '—'}</span>
                  <span className="block">{cell.statusLabel}{cell.validUntil ? <span dir="ltr"> ({cell.validUntil})</span> : null}</span>
                  {canAssess && <button type="button" className="underline mt-1" onClick={() => setDraft({ employeeId: row.employeeId, skillId: cell.skillId, level: cell.level ?? cell.required, source: cell.source ?? 'ASSESSMENT', validUntil: cell.validUntil ?? '' })}>تقييم</button>}
                </div>
              ))}
            </div>
          )}
          {row.extra.length > 0 && <p className="text-xs text-gray-500">مهارات تانية متقيّمة: {row.extra.map((item) => `${item.skillName} (${item.levelLabel ?? '—'})`).join('، ')}</p>}
          {draft && draft.employeeId === row.employeeId && (
            <div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3" data-skill-assess-form>
              <span className="text-sm text-gray-700">تقييم «{row.cells.find((cell) => cell.skillId === draft.skillId)?.skillName}»</span>
              <label className="text-sm text-gray-600">المستوى
                <select className="input mt-1" value={draft.level} onChange={(event) => setDraft({ ...draft, level: event.target.value as SkillLevel })}>
                  {levels.map((level) => <option key={level.code} value={level.code}>{level.label}</option>)}
                </select>
              </label>
              <label className="text-sm text-gray-600">المصدر
                <select className="input mt-1" value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value as SkillSource })}>
                  <option value="ASSESSMENT">تقييم</option>
                  <option value="CERTIFICATE">شهادة</option>
                </select>
              </label>
              {draft.source === 'CERTIFICATE' && (
                <label className="text-sm text-gray-600">صالحة لحد (اختياري)
                  <input type="date" className="input mt-1" value={draft.validUntil} onChange={(event) => setDraft({ ...draft, validUntil: event.target.value })} />
                </label>
              )}
              <button type="button" className="btn-primary text-xs disabled:opacity-50" disabled={busy} onClick={save}>حفظ التقييم</button>
              <button type="button" className="btn-secondary text-xs" onClick={() => setDraft(null)}>إلغاء</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
