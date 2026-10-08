'use client'

// B5.9: «بانِي التقارير» — تقرير من قاموس المصادر: مصدر وأعمدة وفلاتر وتجميع، وتشغيله، وحفظه ومشاركته مع أدوار. القاموس بييجي من الخادم بالمصادر
// والأعمدة المتاحة لصلاحيات الحساب بس. ميزة reports.builder (مقفولة افتراضيًا).
import { useCallback, useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { apiFetch } from '@/lib/api'

type ColumnType = 'text' | 'number' | 'date' | 'money'
interface DictColumn { key: string; label: string; type: ColumnType; group: boolean; sum: boolean; ops: string[] }
interface DictSource { key: string; label: string; columns: DictColumn[] }
interface Filter { column: string; op: string; value: string }
interface Definition { source: string; columns: string[]; filters: Array<{ column: string; op: string; value: string | number }>; groupBy: string | null }
interface Saved { id: number; name: string; source: string; mine: boolean; sharedRoles: string[]; available: boolean; definition: Definition | null }
interface Overview { ready: boolean; canSave: boolean; rowsMax: number; opLabels: Record<string, string>; sources: DictSource[]; saved: Saved[]; roles: Array<{ code: string; nameAr: string }> }
interface Result { headers: Array<{ key: string; label: string; type: ColumnType }>; rows: Array<Array<string | number | null>>; truncated: boolean }
const B = '/reports/builder'
const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export default function ReportBuilderPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [source, setSource] = useState('')
  const [columns, setColumns] = useState<string[]>([])
  const [filters, setFilters] = useState<Filter[]>([])
  const [groupBy, setGroupBy] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    apiFetch<Overview>(B).then((overview) => { setData(overview); setSource((current) => current || overview.sources[0]?.key || '') })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل بانِي التقارير'))
  }, [])
  useEffect(load, [load])

  const dict = data?.sources.find((row) => row.key === source) ?? null
  const columnOf = (key: string) => dict?.columns.find((column) => column.key === key) ?? null

  function pickSource(key: string) { setSource(key); setColumns([]); setFilters([]); setGroupBy(''); setResult(null); setEditing(null); setName(''); setRoles([]) }
  function definition(): Definition | null {
    if (!dict || columns.length === 0) { setError('اختار المصدر وعمود واحد على الأقل'); return null }
    const built: Definition['filters'] = []
    for (const filter of filters) {
      const column = columnOf(filter.column)
      if (!column || filter.value.trim() === '') { setError('كمّل الفلاتر أو شيل الفاضي منها'); return null }
      const numeric = column.type === 'number' || column.type === 'money'
      if (numeric && !Number.isFinite(Number(filter.value))) { setError(`قيمة الفلتر على «${column.label}» لازم تكون رقم`); return null }
      built.push({ column: filter.column, op: filter.op, value: numeric ? Number(filter.value) : filter.value.trim() })
    }
    return { source, columns, filters: built, groupBy: groupBy || null }
  }
  async function act(work: () => Promise<void>) {
    setBusy(true); setError(''); setInfo('')
    try { await work() } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ الطلب') } finally { setBusy(false) }
  }
  const run = () => { const built = definition(); if (built) void act(async () => setResult(await apiFetch<Result>(`${B}/run`, json('POST', built)))) }
  const save = () => {
    const built = definition()
    if (!built) return
    if (name.trim().length < 2) return setError('اكتب اسم التقرير')
    void act(async () => {
      await apiFetch(editing === null ? `${B}/saved` : `${B}/saved/${editing}`, json(editing === null ? 'POST' : 'PATCH', { name: name.trim(), definition: built, sharedRoles: roles }))
      setInfo('اتحفظ التقرير'); load()
    })
  }
  const runSaved = (row: Saved) => act(async () => setResult(await apiFetch<Result>(`${B}/saved/${row.id}/run`)))
  const remove = (row: Saved) => act(async () => { await apiFetch(`${B}/saved/${row.id}`, { method: 'DELETE' }); if (editing === row.id) { setEditing(null); setName('') } setInfo('اتمسح التقرير'); load() })
  function open(row: Saved) {
    if (!row.definition) return
    setSource(row.definition.source); setColumns(row.definition.columns); setGroupBy(row.definition.groupBy ?? '')
    setFilters(row.definition.filters.map((filter) => ({ column: filter.column, op: filter.op, value: String(filter.value) })))
    setResult(null); setEditing(row.mine ? row.id : null); setName(row.mine ? row.name : ''); setRoles(row.mine ? row.sharedRoles : [])
  }
  const toggle = (key: string) => setColumns(columns.includes(key) ? columns.filter((item) => item !== key) : [...columns, key])
  const sourceLabel = (key: string) => data?.sources.find((row) => row.key === key)?.label ?? key

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText size={24} className="text-primary-600" />
            بانِي التقارير
          </h1>
          <p className="text-gray-500 mt-1">اختار المصدر والأعمدة والفلاتر، وشغّل التقرير أو احفظه وشاركه. كل واحد بيشوف بيانات نطاقه وصلاحياته بس.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {data && data.sources.length === 0 && <div className="card text-gray-600">مفيش مصدر بيانات متاح لصلاحيات حسابك.</div>}

        {data && data.saved.length > 0 && (
          <div className="card space-y-2" data-builder-saved>
            <h2 className="text-lg font-semibold text-gray-800">التقارير المحفوظة</h2>
            <ul className="text-sm space-y-1">
              {data.saved.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-1">
                  <span className="flex-1 min-w-48 font-medium text-gray-800">{row.name} <span className="text-xs text-gray-500">· {sourceLabel(row.source)}{row.mine ? '' : ' · متشارك معاك'}</span></span>
                  {row.available ? (
                    <>
                      <button type="button" className="text-primary-600 text-xs" disabled={busy} onClick={() => runSaved(row)}>تشغيل</button>
                      {row.definition && data.canSave && <button type="button" className="text-primary-600 text-xs" onClick={() => open(row)}>{row.mine ? 'تعديل' : 'فتح في البانِي'}</button>}
                    </>
                  ) : <span className="text-xs text-gray-400">مش متاح لحسابك</span>}
                  {row.mine && data.canSave && <button type="button" className="text-red-600 text-xs" disabled={busy} onClick={() => remove(row)}>مسح</button>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data && !data.canSave && <div className="card text-gray-600">حسابك بيشغّل التقارير المحفوظة والمتشاركة معاك. بناء تقرير جديد محتاج صلاحية حفظ التقارير.</div>}

        {data && data.canSave && dict && (
          <div className="card space-y-4" data-builder-form>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-gray-600">المصدر
                <select className="input mt-1" value={source} onChange={(event) => pickSource(event.target.value)}>
                  {data.sources.map((row) => <option key={row.key} value={row.key}>{row.label}</option>)}
                </select>
              </label>
              <label className="text-sm text-gray-600">تجميع بـ
                <select className="input mt-1" value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
                  <option value="">من غير تجميع</option>
                  {dict.columns.filter((column) => column.group).map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
                </select>
              </label>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">الأعمدة{groupBy ? ' (في التجميع: العدد ومجموع الأعمدة الرقمية المختارة)' : ''}</div>
              <div className="flex flex-wrap gap-2">
                {dict.columns.map((column) => (
                  <label key={column.key} className="flex items-center gap-1 text-sm bg-gray-50 rounded-lg px-2 py-1 border border-gray-200">
                    <input type="checkbox" checked={columns.includes(column.key)} onChange={() => toggle(column.key)} />{column.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">الفلاتر</div>
              {filters.map((filter, index) => {
                const column = columnOf(filter.column)
                const change = (patch: Partial<Filter>) => setFilters(filters.map((item, at) => at === index ? { ...item, ...patch } : item))
                return (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <select className="input" value={filter.column} onChange={(event) => change({ column: event.target.value, op: columnOf(event.target.value)?.ops[0] ?? 'eq', value: '' })}>
                      {dict.columns.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                    </select>
                    <select className="input" value={filter.op} onChange={(event) => change({ op: event.target.value })}>
                      {(column?.ops ?? []).map((op) => <option key={op} value={op}>{data.opLabels[op] ?? op}</option>)}
                    </select>
                    <input className="input" type={column?.type === 'date' ? 'date' : 'text'} dir={column?.type === 'text' ? undefined : 'ltr'} value={filter.value} onChange={(event) => change({ value: event.target.value })} />
                    <button type="button" className="text-red-600 text-xs" onClick={() => setFilters(filters.filter((_, at) => at !== index))}>شيل</button>
                  </div>
                )
              })}
              <button type="button" className="btn-secondary" onClick={() => setFilters([...filters, { column: dict.columns[0].key, op: dict.columns[0].ops[0], value: '' }])}>إضافة فلتر</button>
            </div>
            <div className="flex flex-wrap items-end gap-3 border-t border-gray-100 pt-3">
              <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={run}>تشغيل</button>
              {(data.ready ? (
                <>
                  <label className="flex-1 min-w-52 text-sm text-gray-600">{editing === null ? 'حفظ باسم' : 'اسم التقرير'}
                    <input className="input w-full mt-1" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
                  </label>
                  <div className="text-sm text-gray-600">
                    <div>مشاركة مع</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {data.roles.map((role) => (
                        <label key={role.code} className="flex items-center gap-1">
                          <input type="checkbox" checked={roles.includes(role.code)} onChange={() => setRoles(roles.includes(role.code) ? roles.filter((code) => code !== role.code) : [...roles, role.code])} />{role.nameAr}
                        </label>
                      ))}
                    </div>
                  </div>
                  <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy} onClick={save}>{editing === null ? 'حفظ' : 'حفظ التعديل'}</button>
                </>
              ) : <span className="text-sm text-amber-700">حفظ التقارير محتاج ترحيل 175 على قاعدة البيانات.</span>)}
            </div>
          </div>
        )}

        {result && (
          <div className="card space-y-2" data-builder-result>
            <div className="text-sm text-gray-600">{result.rows.length} صف{result.truncated ? ` — فيه أكتر من ${data?.rowsMax ?? 2000}، ضيّق الفلاتر` : ''}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>{result.headers.map((header) => <th key={header.key} className={`table-header ${header.type === 'text' ? 'text-start' : 'text-center'}`}>{header.label}</th>)}</tr>
                </thead>
                <tbody>
                  {result.rows.map((row, index) => (
                    <tr key={index} className="border-t border-gray-100">
                      {row.map((cell, at) => <td key={at} className={`table-cell ${result.headers[at].type === 'text' ? '' : 'text-center'}`} dir={result.headers[at].type === 'text' ? undefined : 'ltr'}>{cell ?? '—'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
