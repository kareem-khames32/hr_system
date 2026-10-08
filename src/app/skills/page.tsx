'use client'

// B5.4 (أ): «المهارات والإحلال» — مكتبة المهارات (التعديل لحساب بكل الفروع)، والمهارات المطلوبة لكل وظيفة معتمدة في نطاق الحساب، ومصفوفة فجوة الموظفين.
// موديول skills (مقفول افتراضيًا).
import { useCallback, useEffect, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import SkillMatrix from '@/components/skills/SkillMatrix'
import {
  createSkill, fetchSkillCatalog, fetchSkillMatrix, fetchSkillPositions, setPositionSkills, updateSkill, type ApiSkill, type ApiSkillCatalog, type ApiSkillPosition, type ApiSkillRow, type SkillLevel,
} from '@/lib/skills-api'

const emptySkill = () => ({ id: null as number | null, name: '', category: '', description: '', isActive: true })

export default function SkillsPage() {
  const [catalog, setCatalog] = useState<ApiSkillCatalog | null>(null)
  const [positions, setPositions] = useState<ApiSkillPosition[]>([])
  const [rows, setRows] = useState<ApiSkillRow[]>([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(emptySkill())
  const [editing, setEditing] = useState<{ positionId: number; requirements: Array<{ skillId: string; level: SkillLevel }> } | null>(null)

  const load = useCallback(() => {
    fetchSkillCatalog().then((data) => {
      setCatalog(data)
      if (!data.ready) return
      fetchSkillPositions().then((result) => setPositions(result.positions)).catch(() => setPositions([]))
      fetchSkillMatrix().then((result) => setRows(result.rows)).catch(() => setRows([]))
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل المهارات'))
  }, [])
  useEffect(load, [load])

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true); setError(''); setInfo('')
    try { await action(); setInfo(done); load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر التنفيذ') } finally { setBusy(false) }
  }

  const saveSkill = () => {
    if (form.name.trim().length < 2) return setError('اكتب اسم المهارة')
    const body = { name: form.name.trim(), category: form.category.trim(), description: form.description.trim(), isActive: form.isActive }
    return run(async () => { if (form.id === null) await createSkill(body); else await updateSkill(form.id, body); setForm(emptySkill()) }, 'اتحفظت المهارة')
  }
  const editSkill = (row: ApiSkill) => setForm({ id: row.id, name: row.name, category: row.category ?? '', description: row.description ?? '', isActive: row.isActive })
  const saveRequirements = () => {
    if (!editing) return
    const requirements = editing.requirements.map((row) => ({ skillId: Number(row.skillId), level: row.level }))
    if (requirements.some((row) => !row.skillId) || new Set(requirements.map((row) => row.skillId)).size !== requirements.length) return setError('اختار مهارة مختلفة لكل صف')
    return run(async () => { await setPositionSkills(editing.positionId, requirements); setEditing(null) }, 'اتحفظت متطلبات الوظيفة')
  }
  const skillName = (id: number) => catalog?.skills.find((skill) => skill.id === id)?.name ?? `مهارة #${id}`
  const levelLabel = (code: string) => catalog?.levels.find((level) => level.code === code)?.label ?? code
  const active = (catalog?.skills ?? []).filter((skill) => skill.isActive)

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <GraduationCap size={24} className="text-primary-600" />
            المهارات والإحلال
          </h1>
          <p className="text-gray-500 mt-1">مكتبة مهارات الشركة، والمهارات المطلوبة لكل وظيفة معتمدة، وفجوة كل موظف عن المطلوب لوظيفته.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {catalog && !catalog.ready && <div className="card text-amber-800 bg-amber-50">جداول المهارات لسه ماتطبّقتش على قاعدة البيانات (ترحيلات 155 و156 و157).</div>}

        {catalog?.ready && (
          <div className="card space-y-3" data-skill-catalog>
            <h2 className="text-lg font-semibold text-gray-800">مكتبة المهارات</h2>
            {!catalog.canEdit && <p className="text-xs text-gray-500">المكتبة تعريف للشركة كلها — تعديلها لحساب نطاقه كل الفروع.</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="table-header text-start">المهارة</th>
                    <th className="table-header text-start">التصنيف</th>
                    <th className="table-header text-start">الوصف</th>
                    <th className="table-header text-center">الحالة</th>
                    <th className="table-header" />
                  </tr>
                </thead>
                <tbody>
                  {catalog.skills.length === 0 && <tr><td colSpan={5} className="table-cell text-center text-gray-500">مفيش مهارات في المكتبة لسه.</td></tr>}
                  {catalog.skills.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="table-cell">{row.name}</td>
                      <td className="table-cell">{row.category ?? '—'}</td>
                      <td className="table-cell">{row.description ?? '—'}</td>
                      <td className="table-cell text-center">{row.isActive ? 'مفعّلة' : <span className="text-gray-400">مقفولة</span>}</td>
                      <td className="table-cell text-end">{catalog.canEdit && <button type="button" className="text-primary-600 text-xs" onClick={() => editSkill(row)}>تعديل</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {catalog.canEdit && (
              <div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3" data-skill-form>
                <label className="flex-1 min-w-44 text-sm text-gray-600">{form.id === null ? 'مهارة جديدة' : 'تعديل المهارة'}
                  <input className="input w-full mt-1" maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                </label>
                <label className="text-sm text-gray-600">التصنيف
                  <input className="input mt-1 w-40" maxLength={80} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
                </label>
                <label className="flex-1 min-w-44 text-sm text-gray-600">الوصف
                  <input className="input w-full mt-1" maxLength={300} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                </label>
                <label className="text-sm text-gray-600 flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />مفعّلة</label>
                <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={saveSkill}>حفظ</button>
                {form.id !== null && <button type="button" className="btn-secondary" onClick={() => setForm(emptySkill())}>إلغاء</button>}
              </div>
            )}
          </div>
        )}

        {catalog?.ready && (
          <div className="card space-y-3" data-skill-positions>
            <h2 className="text-lg font-semibold text-gray-800">المهارات المطلوبة للوظائف المعتمدة</h2>
            {positions.length === 0 ? <p className="text-gray-500">مفيش وظائف معتمدة في نطاقك.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="table-header text-start">الوظيفة</th>
                      <th className="table-header text-start">الفرع / القسم</th>
                      <th className="table-header text-center">شاغلين</th>
                      <th className="table-header text-start">المطلوب</th>
                      <th className="table-header" />
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100 align-top">
                        <td className="table-cell">{row.title}<span className="block text-xs text-gray-500 font-mono" dir="ltr">{row.code}</span></td>
                        <td className="table-cell">{row.branchName ?? '—'}{row.departmentName ? ` / ${row.departmentName}` : ''}</td>
                        <td className="table-cell text-center">{row.holders}</td>
                        <td className="table-cell">{row.requirements.length === 0 ? <span className="text-gray-400">مش متحدد</span> : row.requirements.map((item) => `${skillName(item.skillId)} (${levelLabel(item.level)})`).join('، ')}</td>
                        <td className="table-cell text-end">
                          <button type="button" className="text-primary-600 text-xs" onClick={() => setEditing({ positionId: row.id, requirements: row.requirements.map((item) => ({ skillId: String(item.skillId), level: item.level })) })}>تحديد</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {editing && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-2" data-skill-requirements-form>
                <p className="text-sm text-gray-700">متطلبات الوظيفة <span className="font-mono" dir="ltr">{positions.find((row) => row.id === editing.positionId)?.code}</span> — {positions.find((row) => row.id === editing.positionId)?.title}</p>
                {editing.requirements.map((row, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2 text-sm">
                    <select className="input" aria-label={`المهارة ${index + 1}`} value={row.skillId} onChange={(event) => setEditing({ ...editing, requirements: editing.requirements.map((item, at) => (at === index ? { ...item, skillId: event.target.value } : item)) })}>
                      <option value="">المهارة</option>
                      {active.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                    </select>
                    <select className="input" aria-label={`مستوى المهارة ${index + 1}`} value={row.level} onChange={(event) => setEditing({ ...editing, requirements: editing.requirements.map((item, at) => (at === index ? { ...item, level: event.target.value as SkillLevel } : item)) })}>
                      {catalog.levels.map((level) => <option key={level.code} value={level.code}>{level.label}</option>)}
                    </select>
                    <button type="button" className="text-red-600 text-xs" onClick={() => setEditing({ ...editing, requirements: editing.requirements.filter((_, at) => at !== index) })}>شيل</button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" className="text-primary-600 text-xs" onClick={() => setEditing({ ...editing, requirements: [...editing.requirements, { skillId: '', level: 'intermediate' }] })}>+ مهارة مطلوبة</button>
                  <button type="button" className="btn-primary text-xs disabled:opacity-50" disabled={busy} onClick={saveRequirements}>حفظ المتطلبات</button>
                  <button type="button" className="btn-secondary text-xs" onClick={() => setEditing(null)}>إلغاء</button>
                </div>
              </div>
            )}
          </div>
        )}

        {catalog?.ready && (
          <div className="card space-y-3" data-skill-gaps>
            <h2 className="text-lg font-semibold text-gray-800">مصفوفة الفجوة</h2>
            <SkillMatrix rows={rows} levels={catalog.levels} canAssess onChanged={load} />
          </div>
        )}
      </div>
    </MainLayout>
  )
}
