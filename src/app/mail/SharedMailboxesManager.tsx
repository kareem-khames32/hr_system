'use client'

// B-ADD.16: إدارة الصناديق المشتركة (بصلاحية «إدارة صناديق البريد المشتركة»): عنوان الصندوق واسمه ومين من الحسابات يفتحه من جوه النظام.
// التعريف ده بيحدد اللي بيظهر للموظف بس — خادم البريد نفسه هو اللي بيسمح أو يرفض بدخول الموظف (لازم يكون له صلاحية على الصندوق هناك).
import { useCallback, useEffect, useState } from 'react'
import { Inbox, Plus, X } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import {
  createSharedMailbox, fetchSharedMailboxes, removeSharedMailbox, searchSharedMailboxUsers, updateSharedMailbox, type ManagedSharedMailbox, type SharedMailboxUser,
} from '@/lib/mail-api'

interface Draft { id: number | null; address: string; name: string; isActive: boolean; users: SharedMailboxUser[] }
const errorText = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback)

export default function SharedMailboxesManager({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<ManagedSharedMailbox[] | null>(null)
  const [unavailable, setUnavailable] = useState('')
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [term, setTerm] = useState('')
  const [hits, setHits] = useState<SharedMailboxUser[]>([])

  const apply = (view: { available: boolean; message?: string; mailboxes: ManagedSharedMailbox[] }) => {
    setRows(view.mailboxes)
    setUnavailable(view.available ? '' : view.message ?? 'الصناديق المشتركة مش متاحة')
  }
  const load = useCallback(() => {
    setError('')
    fetchSharedMailboxes().then(apply).catch((cause) => setError(errorText(cause, 'تعذّر تحميل الصناديق المشتركة')))
  }, [])
  useEffect(load, [load])

  useEffect(() => {
    const q = term.trim()
    if (q.length < 2) return setHits([])
    const id = setTimeout(() => searchSharedMailboxUsers(q).then(setHits).catch(() => setHits([])), 200)
    return () => clearTimeout(id)
  }, [term])

  const save = async () => {
    if (!draft) return
    setBusy(true)
    setError('')
    try {
      const userIds = draft.users.map((user) => user.id)
      apply(draft.id === null
        ? await createSharedMailbox({ address: draft.address.trim(), name: draft.name.trim(), userIds })
        : await updateSharedMailbox(draft.id, { name: draft.name.trim(), isActive: draft.isActive, userIds }))
      setDraft(null)
      setTerm('')
    } catch (cause) {
      setError(errorText(cause, 'تعذّر حفظ الصندوق'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (row: ManagedSharedMailbox) => {
    if (!window.confirm(`حذف تعريف الصندوق «${row.name}» من النظام؟ الصندوق نفسه على خادم البريد زي ما هو.`)) return
    setError('')
    try {
      apply(await removeSharedMailbox(row.id))
    } catch (cause) {
      setError(errorText(cause, 'تعذّر حذف الصندوق'))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="الصناديق المشتركة">
      <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800">الصناديق المشتركة</h2>
            <p className="text-sm text-gray-500 mt-1">الصندوق بيظهر للحسابات المضافة عليه تحت مجلداتها — وخادم البريد هو اللي بيسمح بفتحه</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {unavailable && (
            <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">
              {unavailable}
            </div>
          )}
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}
          {!draft && (
            <>
              {!unavailable && (
                <button type="button" className="btn-primary text-sm flex items-center gap-2" onClick={() => setDraft({ id: null, address: '', name: '', isActive: true, users: [] })}>
                  <Plus size={16} />
                  صندوق مشترك جديد
                </button>
              )}
              {rows && rows.length === 0 && !unavailable && <EmptyState title="مفيش صناديق مشتركة متعرّفة لسه" icon={Inbox} />}
              {rows && rows.length > 0 && (
                <div className="space-y-2" data-shared-mailboxes>
                  {rows.map((row) => (
                    <div key={row.id} className="border border-gray-100 rounded-xl p-3 flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-bold text-gray-800 flex items-center gap-2">
                          {row.name}
                          {!row.isActive && <span className="badge bg-gray-100 text-gray-500">موقوف</span>}
                        </div>
                        <div className="text-sm text-gray-500" dir="ltr">{row.address}</div>
                        <div className="text-xs text-gray-500 mt-1">{row.users.length ? row.users.map((user) => user.displayName).join('، ') : 'مفيش حسابات مضافة'}</div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <button type="button" className="text-primary-600 hover:underline" onClick={() => setDraft({ id: row.id, address: row.address, name: row.name, isActive: row.isActive, users: row.users })}>
                          تعديل
                        </button>
                        <button type="button" className="text-red-600 hover:underline" onClick={() => void remove(row)}>
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {draft && (
            <div className="space-y-4" data-shared-mailbox-form>
              <label className="block text-sm text-gray-600">
                عنوان بريد الصندوق
                <input className="input mt-1 w-full" dir="ltr" maxLength={200} value={draft.address} disabled={draft.id !== null} onChange={(event) => setDraft({ ...draft, address: event.target.value })} />
              </label>
              <label className="block text-sm text-gray-600">
                الاسم الظاهر
                <input className="input mt-1 w-full" maxLength={200} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </label>
              {draft.id !== null && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />
                  مفعّل (بيظهر للمضافين عليه)
                </label>
              )}
              <div className="text-sm text-gray-600 space-y-2">
                مين يفتحه
                <div className="flex flex-wrap gap-1">
                  {draft.users.map((user) => (
                    <span key={user.id} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs">
                      {user.displayName}
                      <button type="button" onClick={() => setDraft({ ...draft, users: draft.users.filter((item) => item.id !== user.id) })} aria-label="شيل الحساب">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
                <input className="input w-full" placeholder="ابحث بالاسم أو البريد (حرفين على الأقل)" value={term} maxLength={100} onChange={(event) => setTerm(event.target.value)} />
                {hits.length > 0 && (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    {hits.filter((hit) => !draft.users.some((user) => user.id === hit.id)).map((hit) => (
                      <button key={hit.id} type="button" className="w-full text-start px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                        onClick={() => { setDraft({ ...draft, users: [...draft.users, hit] }); setTerm('') }}>
                        <strong className="text-gray-800">{hit.displayName}</strong>
                        <span className="text-gray-500" dir="ltr">{hit.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => { setDraft(null); setTerm('') }} className="btn-secondary text-sm">
                  إلغاء
                </button>
                <button type="button" onClick={() => void save()} disabled={busy || draft.name.trim().length < 2 || !draft.address.includes('@')} className="btn-primary text-sm disabled:opacity-50">
                  حفظ الصندوق
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
