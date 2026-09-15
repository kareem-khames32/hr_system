'use client'

import { useEffect, useState } from 'react'
import { Clock, Plus, Trash2, Save, Eye } from 'lucide-react'
import { can } from '../../lib/api'
import {
  createLatenessTierSet, deactivateLatenessTierSet, fetchLatenessTierSets, previewLatenessTierSet, applicableTierSet,
  LATENESS_TIER_MODE_LABELS, type LatenessTierDraftRow, type LatenessTierMode, type LatenessTierSet, type LatenessTierSetPreview, type LatenessTierSetsResponse,
} from '../../lib/payroll-engine-api'

// الخطوة 21: مجموعات شرائح التأخير المؤرخة — كل مجموعة تسري من شهر رواتب؛ الحفظ يرفض التداخل ويحفظ بصمة المحتوى،
// والمسير المحسوب يحتفظ بمجموعته في لقطة السياسة حتى «تحديث اللقطة».
const emptyRow = (): LatenessTierDraftRow => ({ fromMinutes: '', toMinutes: '', mode: 'FRACTION', value: '0.25', label: '' })
const nextMonth = () => { const now = new Date(); now.setMonth(now.getMonth() + 1); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` }
const describeTier = (tier: { mode: LatenessTierMode; value: string }) => tier.mode === 'FRACTION' ? `${Number(tier.value)} يوم × سعر اليوم`
  : tier.mode === 'MULTIPLIER' ? `الدقائق × ${Number(tier.value)} × سعر الدقيقة` : tier.mode === 'MINUTES' ? 'الدقائق × سعر الدقيقة' : 'بلا خصم'
const errorText = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback

export function LatenessTierSetsEditor() {
  const [data, setData] = useState<LatenessTierSetsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null)
  const [period, setPeriod] = useState(nextMonth())
  const [rows, setRows] = useState<LatenessTierDraftRow[]>([emptyRow()])
  const [reason, setReason] = useState('')
  const [preview, setPreview] = useState<LatenessTierSetPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [deactivating, setDeactivating] = useState<{ id: number; reason: string } | null>(null)
  const canManage = can('payroll.policy.manage')

  const load = async () => {
    setLoading(true)
    try { setData(await fetchLatenessTierSets()) } catch (error) { setMessage({ kind: 'error', text: errorText(error, 'تعذر تحميل مجموعات الشرائح') }) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const edit = (index: number, patch: Partial<LatenessTierDraftRow>) => { setPreview(null); setRows(current => current.map((row, i) => i === index ? { ...row, ...patch } : row)) }
  const runPreview = async () => {
    setBusy(true); setMessage(null)
    try { setPreview(await previewLatenessTierSet(period, rows)) } catch (error) { setPreview(null); setMessage({ kind: 'error', text: errorText(error, 'الشرائح غير صالحة') }) }
    finally { setBusy(false) }
  }
  const save = async () => {
    setBusy(true); setMessage(null)
    try {
      const saved = await createLatenessTierSet(period, rows, reason)
      setData(saved); setRows([emptyRow()]); setReason(''); setPreview(null)
      setMessage({ kind: 'ok', text: `حُفظت المجموعة #${saved.savedId} لشهر ${period}` })
    } catch (error) { setMessage({ kind: 'error', text: errorText(error, 'تعذر حفظ المجموعة') }) }
    finally { setBusy(false) }
  }
  const copyFrom = (set: LatenessTierSet) => {
    setPreview(null)
    setRows(set.tiers.map(tier => ({ fromMinutes: String(tier.fromMinutes), toMinutes: tier.toMinutes === null ? '' : String(tier.toMinutes), mode: tier.mode,
      value: ['FRACTION', 'MULTIPLIER'].includes(tier.mode) ? String(Number(tier.value)) : '0', label: tier.label ?? '' })))
  }
  const deactivate = async () => {
    if (!deactivating) return
    setBusy(true); setMessage(null)
    try { setData(await deactivateLatenessTierSet(deactivating.id, deactivating.reason)); setDeactivating(null) }
    catch (error) { setMessage({ kind: 'error', text: errorText(error, 'تعذر إيقاف المجموعة') }) }
    finally { setBusy(false) }
  }
  const current = data ? applicableTierSet(data.sets, period) : null

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center"><Clock size={20} className="text-warning-600" /></div>
        <div>
          <h3 className="font-bold text-gray-800">مجموعات شرائح خصم التأخير (مؤرخة)</h3>
          <p className="text-sm text-gray-400">كل مجموعة تسري من شهر رواتب حتى تحل محلها أحدث. الحدود شاملة (من ≤ الدقائق ≤ إلى) ولا يُقبل تداخل؛ الدقائق بلا شريحة تُخصم بالدقيقة.</p>
        </div>
      </div>
      {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${message.kind === 'error' ? 'bg-red-50 text-red-700' : 'bg-success-50 text-success-700'}`}>{message.text}</p>}

      {loading ? <p className="text-sm text-gray-400">جارِ التحميل…</p> : <div className="space-y-3">
        {!data?.sets.length && <p className="text-sm text-gray-500">لا مجموعات بعد — المسير يخصم التأخير بالدقيقة.</p>}
        {data?.sets.map(set => <div key={set.id} className={`rounded-xl border p-3 ${set.isActive ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-80'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-gray-800">المجموعة #{set.id} — تسري من شهر <span dir="ltr">{set.effectivePeriod}</span>
              {' '}<span className={`badge ${set.isActive ? 'badge-success' : 'bg-gray-100 text-gray-600'}`}>{set.isActive ? 'مفعّلة' : 'موقوفة'}</span>
              {set.source === 'LEGACY_CONVERSION' && <span className="badge bg-blue-50 text-blue-700 mr-1">محوّلة من الشرائح القديمة</span>}
              {set.integrity === 'HASH_MISMATCH' && <span className="badge badge-danger mr-1">المحتوى لا يطابق البصمة</span>}</p>
            <div className="flex gap-2">
              {canManage && <button type="button" onClick={() => copyFrom(set)} className="btn-secondary text-xs">نسخ كبداية لمجموعة جديدة</button>}
              {canManage && set.isActive && <button type="button" onClick={() => setDeactivating({ id: set.id, reason: '' })} className="btn-secondary text-xs">إيقاف</button>}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">{set.reason}{set.deactivationReason ? ` — أُوقفت: ${set.deactivationReason}` : ''} • بصمة <span className="font-mono" dir="ltr">{set.contentHash.slice(0, 12)}</span></p>
          <div className="overflow-x-auto mt-2"><table className="w-full text-sm">
            <thead><tr className="table-header"><th className="p-2 text-center">#</th><th className="p-2 text-center">من دقيقة</th><th className="p-2 text-center">إلى دقيقة</th><th className="p-2 text-center">الخصم</th><th className="p-2 text-center">الوصف</th></tr></thead>
            <tbody>{set.tiers.map(tier => <tr key={tier.sequence} className="border-t border-gray-100">
              <td className="p-2 text-center">{tier.sequence}</td><td className="p-2 text-center font-mono">{tier.fromMinutes}</td><td className="p-2 text-center font-mono">{tier.toMinutes ?? '∞'}</td>
              <td className="p-2 text-center">{describeTier(tier)}</td><td className="p-2 text-center text-gray-500">{tier.label || '—'}</td>
            </tr>)}</tbody>
          </table></div>
          {deactivating?.id === set.id && <div className="flex flex-wrap gap-2 mt-2">
            <input value={deactivating.reason} onChange={e => setDeactivating({ id: set.id, reason: e.target.value })} maxLength={500} className="input-field flex-1 min-w-48" placeholder="سبب الإيقاف (مطلوب)" />
            <button type="button" onClick={deactivate} disabled={busy || deactivating.reason.trim().length < 3} className="btn-primary text-sm disabled:opacity-50">تأكيد الإيقاف</button>
            <button type="button" onClick={() => setDeactivating(null)} className="btn-secondary text-sm">تراجع</button>
          </div>}
        </div>)}
      </div>}

      {canManage ? <div className="pt-4 border-t border-gray-100 space-y-3">
        <h4 className="font-bold text-gray-800">مجموعة جديدة</h4>
        <div className="flex flex-wrap items-end gap-3">
          <div><label className="text-xs text-gray-500" htmlFor="tier-set-period">تسري من شهر الرواتب</label>
            <input id="tier-set-period" type="month" value={period} onChange={e => { setPeriod(e.target.value); setPreview(null) }} className="input-field" /></div>
          <p className="text-xs text-gray-500 pb-2">{current ? `الساري لهذا الشهر الآن: المجموعة #${current.id} (من ${current.effectivePeriod}). الحفظ لنفس الشهر يوقف المجموعة المفعّلة له.` : 'لا مجموعة سارية لهذا الشهر الآن.'}</p>
        </div>
        {rows.map((row, index) => <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
          <div><label className="text-xs text-gray-500">من دقيقة</label><input type="number" min={0} value={row.fromMinutes} onChange={e => edit(index, { fromMinutes: e.target.value })} className="input-field" placeholder="61" /></div>
          <div><label className="text-xs text-gray-500">إلى دقيقة (فارغ = ∞)</label><input type="number" min={0} value={row.toMinutes} onChange={e => edit(index, { toMinutes: e.target.value })} className="input-field" placeholder="120" /></div>
          <div><label className="text-xs text-gray-500">طريقة الخصم</label>
            <select value={row.mode} onChange={e => edit(index, { mode: e.target.value as LatenessTierMode, value: e.target.value === 'MULTIPLIER' ? '1.5' : e.target.value === 'FRACTION' ? '0.25' : '0' })} className="input-field">
              {(Object.keys(LATENESS_TIER_MODE_LABELS) as LatenessTierMode[]).map(mode => <option key={mode} value={mode}>{LATENESS_TIER_MODE_LABELS[mode]}</option>)}
            </select></div>
          <div><label className="text-xs text-gray-500">{row.mode === 'MULTIPLIER' ? 'المضاعف' : 'كسر اليوم'}</label>
            <input type="number" step="0.05" min={0} value={row.value} disabled={!['FRACTION', 'MULTIPLIER'].includes(row.mode)} onChange={e => edit(index, { value: e.target.value })} className="input-field disabled:bg-gray-100" /></div>
          <div><label className="text-xs text-gray-500">وصف (اختياري)</label><input value={row.label} maxLength={200} onChange={e => edit(index, { label: e.target.value })} className="input-field" /></div>
          <button type="button" onClick={() => { setPreview(null); setRows(current => current.length > 1 ? current.filter((_, i) => i !== index) : [emptyRow()]) }} className="text-danger-500 hover:text-danger-700 justify-self-start pb-2" aria-label="حذف الشريحة من المسودة"><Trash2 size={16} /></button>
        </div>)}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setPreview(null); setRows(current => [...current, emptyRow()]) }} className="btn-secondary text-sm flex items-center gap-1"><Plus size={16} />شريحة</button>
          <button type="button" onClick={runPreview} disabled={busy} className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-50"><Eye size={16} />معاينة وتحقق</button>
        </div>
        {preview && <div className="rounded-xl bg-gray-50 p-3 text-sm space-y-2">
          <p className="font-medium text-gray-800">الشرائح بعد الترتيب ({preview.tiers.length}) — بصمة <span className="font-mono" dir="ltr">{preview.contentHash.slice(0, 12)}</span></p>
          <ul className="list-disc pr-5">{preview.tiers.map(tier => <li key={tier.sequence}>{tier.fromMinutes}–{tier.toMinutes ?? '∞'}: {describeTier(tier)}</li>)}</ul>
          {preview.gaps.length > 0 && <ul className="text-amber-800 list-disc pr-5">{preview.gaps.map((gap, index) => <li key={index}>{gap.message}</li>)}</ul>}
          <p className="text-xs text-gray-600">أمثلة: {preview.examples.map(example => `${example.minutes} د ← ${example.effect}`).join(' • ')}</p>
        </div>}
        <div className="flex flex-wrap items-end gap-2">
          <input value={reason} onChange={e => setReason(e.target.value)} maxLength={500} className="input-field flex-1 min-w-64" placeholder="سبب المجموعة الجديدة (مطلوب) — مثل قرار لائحة الجزاءات" />
          <button type="button" onClick={save} disabled={busy || !preview || reason.trim().length < 3} title={preview ? undefined : 'عاين المجموعة وتحقق منها قبل الحفظ'} className="btn-primary flex items-center gap-2 disabled:opacity-50"><Save size={18} />حفظ المجموعة</button>
        </div>
      </div> : <p className="text-xs text-gray-500">إنشاء مجموعات الشرائح يتطلب صلاحية إدارة سياسات الرواتب.</p>}
    </div>
  )
}
