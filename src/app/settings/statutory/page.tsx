'use client'

// B4.2: «حزمة الدولة» — القيم القانونية المؤرخة (نسب، حدود، شرائح) لكل دولة بتاريخ سريانها ومصدرها وهل اتأكدت. العرض بصلاحية الإعدادات،
// والتعديل لمدير النظام بس. المفتاح اللي مالوش حاسبة بتقراه بيانات مرجعية: تعديله مابيغيّرش أي مبلغ.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, BookOpen, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { formatDate } from '@/lib/dates'
import { addStatutoryRow, fetchStatutoryPack, updateStatutoryRow, type ApiStatutoryKey, type ApiStatutoryPack, type ApiStatutoryRow } from '@/lib/statutory-api'

export default function StatutoryPackPage() {
  const [data, setData] = useState<ApiStatutoryPack | null>(null)
  const [country, setCountry] = useState<'EG' | 'SA'>('EG')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [editing, setEditing] = useState<{ item: ApiStatutoryKey; row: ApiStatutoryRow | null } | null>(null)

  const load = useCallback(() => {
    fetchStatutoryPack().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل حزمة الدولة'))
  }, [])
  useEffect(load, [load])

  const keys = (data?.keys ?? []).filter((item) => item.country === country)
  const unverified = (data?.keys ?? []).reduce((sum, item) => sum + item.rows.filter((row) => !row.verified).length, 0)

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Link href="/settings" className="text-sm text-primary-600 hover:underline">
            ← الإعدادات
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mt-2">
            <BookOpen size={24} className="text-primary-600" />
            حزمة الدولة
          </h1>
          <p className="text-gray-500 mt-1">القيم القانونية لكل دولة بتاريخ سريانها ومصدرها — القيمة السارية في آخر يوم في فترة المسير هي اللي بتتاخد</p>
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
        {data && !data.available && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            {data.message}
          </div>
        )}
        {data?.available && unverified > 0 && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm flex items-start gap-2" data-statutory-unverified>
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>
              {unverified} صف «محتاج تحقق»: القيم دي من مصادر ثانوية ولسه مااتراجعتش من محاسب أو مستشار قانوني. اللي مكتوب عليه «بيانات مرجعية» مابيدخلش في أي حساب.
              {!data.canEdit && ' التعديل وتعليم «اتأكد» لمدير النظام بس.'}
            </span>
          </div>
        )}
        {data?.available && (
          <div className="flex gap-2" role="tablist">
            {data.countries.map((entry) => (
              <button key={entry.code} role="tab" aria-selected={country === entry.code} onClick={() => setCountry(entry.code)}
                className={`px-4 py-2 rounded-xl text-sm ${country === entry.code ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {entry.label}
              </button>
            ))}
          </div>
        )}
        {data?.available && keys.map((item) => (
          <div key={item.key} className="card space-y-3" data-statutory-key={item.key}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{item.label}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {item.card} · {item.usedBy ? <span className="text-primary-700">بيتقري في: {item.usedBy}</span> : <span>بيانات مرجعية — مابتدخلش في أي حساب لسه</span>}
                </p>
              </div>
              {data.canEdit && (
                <button onClick={() => setEditing({ item, row: null })} className="btn-secondary text-sm">
                  صف بتاريخ جديد
                </button>
              )}
            </div>
            {item.rows.length === 0 && <p className="text-sm text-gray-500">مفيش قيم مسجّلة.</p>}
            {item.rows.map((row) => (
              <div key={row.id} className={`rounded-xl border p-3 ${row.current ? 'border-primary-200 bg-primary-50/40' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm text-gray-700">
                    ساري من <span className="font-medium">{formatDate(row.effectiveFrom)}</span>
                    {row.current && <span className="badge badge-success mr-2">الساري النهارده</span>}
                    <span className={`badge mr-2 ${row.verified ? 'badge-success' : 'badge-warning'}`}>{row.verified ? 'اتأكد' : 'محتاج تحقق'}</span>
                  </p>
                  {data.canEdit && (
                    <button onClick={() => setEditing({ item, row })} className="text-primary-600 hover:underline text-xs">
                      تعديل
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3 text-sm">
                  {item.codes.map((entry) => (
                    <div key={entry.code}>
                      <p className="text-gray-500 text-xs">{entry.label}</p>
                      <p className="font-medium text-gray-800 tabular-nums" dir="ltr">{row.values[entry.code] ?? '—'}</p>
                    </div>
                  ))}
                </div>
                {row.source && <p className="text-xs text-gray-400 mt-2">المصدر: {row.source}</p>}
              </div>
            ))}
          </div>
        ))}
      </div>
      {editing && (
        <RowModal item={editing.item} row={editing.row} onClose={() => setEditing(null)}
          onDone={(next) => { setData(next); setEditing(null); setError(''); setInfo('اتحفظ.') }} />
      )}
    </MainLayout>
  )
}

function RowModal({ item, row, onClose, onDone }: { item: ApiStatutoryKey; row: ApiStatutoryRow | null; onClose: () => void; onDone: (next: ApiStatutoryPack) => void }) {
  // صف جديد بيبدأ من قيم أحدث صف
  const seed = row ?? item.rows[0] ?? null
  const [effectiveFrom, setEffectiveFrom] = useState(row?.effectiveFrom ?? '')
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(item.codes.map((entry) => [entry.code, seed?.values[entry.code] ?? ''])))
  const [source, setSource] = useState(row?.source ?? '')
  const [verified, setVerified] = useState(row?.verified ?? false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      if (!row) {
        onDone(await addStatutoryRow({ country: item.country, key: item.key, effectiveFrom, values, source: source.trim() || null, verified }))
        return
      }
      // في التعديل: اللي اتغيّر بس بيتبعت
      const changed = Object.fromEntries(Object.entries(values).filter(([code, value]) => value.trim() !== (row.values[code] ?? '')))
      const body: { values?: Record<string, string>; source?: string | null; verified?: boolean } = {}
      if (Object.keys(changed).length) body.values = changed
      if (source.trim() !== (row.source ?? '')) body.source = source.trim() || null
      if (verified !== row.verified) body.verified = verified
      if (!Object.keys(body).length) { onClose(); return }
      onDone(await updateStatutoryRow(row.id, body))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ القيم')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label={item.label}>
      <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">{row ? `تعديل «${item.label}»` : `صف جديد «${item.label}»`}</h2>
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
          {item.usedBy && (
            <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">
              المفتاح ده بيتقري في {item.usedBy}: التعديل بيغيّر حساب الفترات اللي لسه مااتحسبتش. المحسوب قيمته متجمّدة.
            </div>
          )}
          <label className="block text-sm text-gray-600">
            ساري من {row && <span className="text-xs text-gray-400">(مابيتعدّلش — اعمل صف بتاريخ جديد)</span>}
            <input type="date" className="input mt-1 w-full" value={effectiveFrom} disabled={!!row} onChange={(event) => setEffectiveFrom(event.target.value)} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {item.codes.map((entry) => (
              <label key={entry.code} className="block text-sm text-gray-600">
                {entry.label}
                <input className="input mt-1 w-full" dir="ltr" inputMode="decimal" value={values[entry.code] ?? ''} onChange={(event) => setValues({ ...values, [entry.code]: event.target.value })} />
              </label>
            ))}
          </div>
          <label className="block text-sm text-gray-600">
            المصدر
            <input className="input mt-1 w-full" maxLength={300} value={source} onChange={(event) => setSource(event.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} />
            اتأكد (اتراجع من محاسب أو مستشار قانوني أو من الجهة نفسها)
          </label>
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">
              إلغاء
            </button>
            <button onClick={save} disabled={busy || (!row && !effectiveFrom)} className="btn-primary text-sm disabled:opacity-50">
              حفظ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
