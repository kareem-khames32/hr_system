'use client'

// B3.5-أ: «عروض العمل» — مسودة ← طلب اعتماد ← اعتماد (لغير اللي عمل العرض) ← إرسال للمرشح بلينك رد ← قبول أو رفض (من اللينك أو مسجّل هنا).
// (كانت شاشة عرض ببيانات وهمية؛ بقت على الخادم.)
import { useCallback, useEffect, useState } from 'react'
import { FileSignature, Plus, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { can, fetchCandidates, type ApiCandidate } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { actOnOffer, createOffer, fetchOffers, updateOffer, type ApiOffer, type ApiOffersList, type OfferAction, type OfferStatus } from '@/lib/offers-api'

const statusStyle: Record<OfferStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', PENDING: 'bg-amber-50 text-amber-800', APPROVED: 'bg-blue-50 text-blue-700', SENT: 'bg-purple-50 text-purple-700',
  ACCEPTED: 'bg-green-50 text-green-700', DECLINED: 'bg-red-50 text-red-700', WITHDRAWN: 'bg-gray-100 text-gray-500',
}

export default function OffersPage() {
  const [data, setData] = useState<ApiOffersList | null>(null)
  const [candidates, setCandidates] = useState<ApiCandidate[]>([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<ApiOffer | 'new' | null>(null)
  const [busy, setBusy] = useState(0)
  const [link, setLink] = useState<{ name: string; url: string } | null>(null)
  const [asking, setAsking] = useState<{ offer: ApiOffer; action: 'return' | 'record' } | null>(null)
  const manager = can('candidates.manage')

  const load = useCallback(() => {
    setError('')
    fetchOffers()
      .then(setData)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل العروض'))
  }, [])
  useEffect(load, [load])
  useEffect(() => {
    if (!manager) return
    fetchCandidates()
      .then((rows) => setCandidates(rows.filter((row) => row.stage !== 'hired' && row.stage !== 'rejected')))
      .catch(() => setCandidates([]))
  }, [manager])

  const act = async (offer: ApiOffer, action: OfferAction, extra: { reason?: string; answer?: 'ACCEPT' | 'DECLINE'; note?: string } = {}) => {
    setBusy(offer.id)
    setError('')
    try {
      const result = await actOnOffer(offer.id, action, extra)
      if (result.linkToken) setLink({ name: offer.candidateName, url: `${window.location.origin}/careers/offers/${result.linkToken}` })
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ الإجراء')
    } finally {
      setBusy(0)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileSignature size={24} className="text-primary-600" />
              عروض العمل
            </h1>
            <p className="text-gray-500 mt-1">عرض المرشح: الراتب وتاريخ البدء — بيتعتمد قبل ما يتبعت، والمرشح بيرد من لينكه</p>
          </div>
          {data?.available && manager && (
            <button onClick={() => setEditing('new')} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              عرض جديد
            </button>
          )}
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {link && (
          <div role="status" className="bg-green-50 text-green-800 rounded-xl p-4 space-y-2" data-offer-link>
            <p className="font-medium">العرض اتبعت لـ{link.name}. ده لينك الرد — بيظهر مرة واحدة، انسخه وابعته للمرشح:</p>
            <p dir="ltr" className="text-sm break-all select-all bg-white rounded-lg p-2 border border-green-200">{link.url}</p>
            <p className="text-xs">اللينك بيشتغل لما ميزة «صفحة الوظائف العامة» مفتوحة. غير كده سجّل رد المرشح من هنا.</p>
            <button onClick={() => setLink(null)} className="btn-secondary text-sm">
              تمام
            </button>
          </div>
        )}
        {data && !data.available && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            {data.message}
          </div>
        )}
        {data?.available && data.offers.length === 0 && <EmptyState title="مفيش عروض عمل لسه" icon={FileSignature} />}
        {data?.available && data.offers.length > 0 && (
          <div className="card p-0 overflow-x-auto" data-offers>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">المرشح</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">الراتب المعروض</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">البدء</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.offers.map((offer) => (
                  <tr key={offer.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{offer.candidateName}</div>
                      <div className="text-xs text-gray-500">{offer.positionTitle ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <div className="text-gray-800">{formatMoney(offer.salary)}</div>
                      {offer.rangeFrom !== null || offer.rangeTo !== null ? (
                        <div className={`text-xs ${offer.outOfRange ? 'text-red-600' : 'text-gray-500'}`}>
                          نطاق الوظيفة: {offer.rangeFrom ? formatMoney(offer.rangeFrom) : '—'} – {offer.rangeTo ? formatMoney(offer.rangeTo) : '—'}
                          {offer.outOfRange ? ' · برّه النطاق' : ''}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {offer.startDate ? formatDate(offer.startDate) : '—'}
                      {offer.expiresOn && <div className="text-xs text-gray-500">الرد قبل {formatDate(offer.expiresOn)}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusStyle[offer.status]}`}>{offer.statusLabel}</span>
                      {offer.returnReason && offer.status === 'DRAFT' && <div className="text-xs text-amber-700 mt-1">اترجّع: {offer.returnReason}</div>}
                      {offer.respondedNote && <div className="text-xs text-gray-500 mt-1">{offer.respondedNote}</div>}
                      {offer.respondedVia && <div className="text-xs text-gray-400 mt-1">{offer.respondedVia === 'LINK' ? 'رد المرشح من اللينك' : 'الرد مسجّل من مسؤول التوظيف'}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {manager && offer.status === 'DRAFT' && (
                          <>
                            <button onClick={() => setEditing(offer)} className="btn-secondary text-sm">
                              تعديل
                            </button>
                            <button onClick={() => act(offer, 'submit')} disabled={busy === offer.id} className="btn-primary text-sm disabled:opacity-50">
                              طلب اعتماد
                            </button>
                          </>
                        )}
                        {offer.canApprove && (
                          <>
                            <button onClick={() => act(offer, 'approve')} disabled={busy === offer.id} className="btn-primary text-sm disabled:opacity-50">
                              اعتماد
                            </button>
                            <button onClick={() => setAsking({ offer, action: 'return' })} className="btn-secondary text-sm">
                              إرجاع
                            </button>
                          </>
                        )}
                        {offer.status === 'PENDING' && !offer.canApprove && data.canApprove && offer.mine && <span className="text-xs text-gray-400">الاعتماد لحد غيرك</span>}
                        {manager && offer.status === 'APPROVED' && (
                          <button onClick={() => act(offer, 'send')} disabled={busy === offer.id} className="btn-primary text-sm disabled:opacity-50">
                            إرسال للمرشح
                          </button>
                        )}
                        {manager && offer.status === 'SENT' && (
                          <button onClick={() => setAsking({ offer, action: 'record' })} className="btn-secondary text-sm">
                            تسجيل رد المرشح
                          </button>
                        )}
                        {manager && ['DRAFT', 'PENDING', 'APPROVED', 'SENT'].includes(offer.status) && (
                          <button onClick={() => act(offer, 'withdraw')} disabled={busy === offer.id} className="btn-secondary text-sm disabled:opacity-50">
                            سحب
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && (
        <OfferModal
          offer={editing === 'new' ? null : editing}
          candidates={candidates}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null)
            load()
          }}
        />
      )}
      {asking && (
        <AskModal
          ask={asking}
          onClose={() => setAsking(null)}
          onDone={(extra) => {
            const { offer, action } = asking
            setAsking(null)
            void act(offer, action, extra)
          }}
        />
      )}
    </MainLayout>
  )
}

function OfferModal({ offer, candidates, onClose, onDone }: { offer: ApiOffer | null; candidates: ApiCandidate[]; onClose: () => void; onDone: () => void }) {
  const [candidateId, setCandidateId] = useState(offer ? String(offer.candidateId) : '')
  const [salary, setSalary] = useState(offer?.salary ?? '')
  const [startDate, setStartDate] = useState(offer?.startDate ?? '')
  const [expiresOn, setExpiresOn] = useState(offer?.expiresOn ?? '')
  const [notes, setNotes] = useState(offer?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const salaryOk = /^\d{1,12}(\.\d{1,2})?$/.test(salary.trim()) && Number(salary) > 0
  const valid = candidateId !== '' && salaryOk && startDate !== ''

  const submit = async () => {
    setSaving(true)
    setError('')
    const fields = { salary: salary.trim(), startDate, expiresOn: expiresOn || null, notes: notes.trim() || null }
    try {
      if (offer) await updateOffer(offer.id, fields)
      else await createOffer({ candidateId: Number(candidateId), ...fields })
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ العرض')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label={offer ? 'تعديل عرض' : 'عرض جديد'}>
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">{offer ? 'تعديل عرض' : 'عرض جديد'}</h2>
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
          <label className="block text-sm text-gray-700">
            المرشح
            <select className="input w-full mt-1 disabled:bg-gray-50" value={candidateId} disabled={!!offer} onChange={(e) => setCandidateId(e.target.value)}>
              <option value="">اختر المرشح</option>
              {offer && !candidates.some((row) => row.id === offer.candidateId) && <option value={offer.candidateId}>{offer.candidateName}</option>}
              {candidates.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.fullName} · {row.positionTitle}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block text-sm text-gray-700">
              الراتب المعروض
              <input inputMode="decimal" className="input w-full mt-1" value={salary} onChange={(e) => setSalary(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              تاريخ البدء
              <input type="date" className="input w-full mt-1" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              الرد قبل (اختياري)
              <input type="date" className="input w-full mt-1" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
            </label>
          </div>
          {offer && (offer.rangeFrom !== null || offer.rangeTo !== null) && (
            <p className="text-xs text-gray-500">
              نطاق راتب الوظيفة: {offer.rangeFrom ? formatMoney(offer.rangeFrom) : '—'} – {offer.rangeTo ? formatMoney(offer.rangeTo) : '—'}
            </p>
          )}
          <label className="block text-sm text-gray-700">
            ملاحظات (اختياري)
            <textarea className="input w-full mt-1" rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <p className="text-xs text-gray-500">الراتب رقم في العرض بس — بيتعبّى في نموذج التعيين والموارد البشرية بتراجعه قبل الحفظ.</p>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            إلغاء
          </button>
          <button onClick={submit} disabled={!valid || saving} title="المرشح والراتب وتاريخ البدء مطلوبين" className="btn-primary disabled:opacity-50">
            حفظ
          </button>
        </div>
      </div>
    </div>
  )
}

function AskModal({ ask, onClose, onDone }: { ask: { offer: ApiOffer; action: 'return' | 'record' }; onClose: () => void; onDone: (extra: { reason?: string; answer?: 'ACCEPT' | 'DECLINE'; note?: string }) => void }) {
  const [text, setText] = useState('')
  const [answer, setAnswer] = useState<'ACCEPT' | 'DECLINE' | ''>('')
  const returning = ask.action === 'return'
  const valid = returning ? text.trim().length >= 3 : answer !== ''
  const title = returning ? 'إرجاع العرض' : 'تسجيل رد المرشح'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-white rounded-2xl w-full max-w-md mx-4">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">{ask.offer.candidateName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {!returning && (
            <div className="grid grid-cols-2 gap-2">
              {(['ACCEPT', 'DECLINE'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setAnswer(key)}
                  aria-pressed={answer === key}
                  className={`rounded-xl border p-3 text-sm font-medium ${answer === key ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  {key === 'ACCEPT' ? 'قبل العرض' : 'رفض العرض'}
                </button>
              ))}
            </div>
          )}
          <label className="block text-sm text-gray-700">
            {returning ? 'سبب الإرجاع' : 'ملاحظة (اختياري)'}
            <textarea className="input w-full mt-1" rows={3} maxLength={returning ? 300 : 500} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            إلغاء
          </button>
          <button
            onClick={() => onDone(returning ? { reason: text.trim() } : { answer: answer as 'ACCEPT' | 'DECLINE', ...(text.trim() ? { note: text.trim() } : {}) })}
            disabled={!valid}
            className="btn-primary disabled:opacity-50"
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>
  )
}
