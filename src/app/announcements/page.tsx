'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { CheckCircle2, Megaphone, Pin } from 'lucide-react'
import { can } from '@/lib/api'
import { loadOrgFilterContext } from '@/lib/org-filter'
import {
  ANNOUNCEMENT_STATUS_LABELS, announcementAudienceText, branchesAudience, createAnnouncement, fetchAnnouncementReport, fetchAnnouncements,
  fetchAnnouncementsBoard, markAnnouncementRead, publishAnnouncement, withdrawAnnouncement,
  type AnnouncementReport, type BoardAnnouncement, type ManagedAnnouncement,
} from '@/lib/announcements-api'

// B2.16: الإعلانات — اللوحة لكل موظف (الإعلانات السارية اللي هو في جمهورها، المثبّت أولًا)، وقسم الإدارة للي معاه «إدارة الإعلانات»
// (مسودة ← نشر ← سحب، وتقرير مين قرا). الجمهور من الشاشة: كل الشركة أو فروع محددة.
export default function AnnouncementsPage() {
  const [board, setBoard] = useState<BoardAnnouncement[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [manager, setManager] = useState(false)
  const [managed, setManaged] = useState<{ available: boolean; message: string | null; items: ManagedAnnouncement[] } | null>(null)
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([])
  const [report, setReport] = useState<AnnouncementReport | null>(null)
  const [form, setForm] = useState({ title: '', body: '', branchIds: [] as number[], publishDate: '', expiryDate: '', pinned: false, requiresRead: false })

  const fail = (err: unknown, fallback: string) => setError(err instanceof Error ? err.message : fallback)
  const loadBoard = () => fetchAnnouncementsBoard().then((data) => setBoard(data.items)).catch((err) => fail(err, 'تعذر تحميل الإعلانات'))
  const loadManaged = () => fetchAnnouncements().then(setManaged).catch((err) => fail(err, 'تعذر تحميل إعلانات الإدارة'))
  useEffect(() => {
    loadBoard()
    const manages = can('announcements.manage')
    setManager(manages)
    if (manages) {
      loadManaged()
      loadOrgFilterContext().then((context) => setBranches(context.branches)).catch(() => undefined)
    }
  }, [])

  // كل إجراء: تنفيذ ثم تحديث القايمتين، والرفض برسالة الخادم
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
      await Promise.all([loadBoard(), manager ? loadManaged() : Promise.resolve()])
    } catch (err) {
      fail(err, 'تعذر تنفيذ الإجراء')
    } finally {
      setBusy(false)
    }
  }
  const save = () => run(async () => {
    await createAnnouncement({ title: form.title, body: form.body, audience: branchesAudience(form.branchIds), publishDate: form.publishDate || null,
      expiryDate: form.expiryDate || null, pinned: form.pinned, requiresRead: form.requiresRead })
    setForm({ title: '', body: '', branchIds: [], publishDate: '', expiryDate: '', pinned: false, requiresRead: false })
  })
  const toggleBranch = (id: number) => setForm((current) => ({ ...current, branchIds: current.branchIds.includes(id) ? current.branchIds.filter((item) => item !== id) : [...current.branchIds, id] }))
  const branchName = (id: number) => branches.find((branch) => branch.id === id)?.name
  const field = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الإعلانات</h1>
          <p className="text-sm text-gray-500">إعلانات الشركة اللي تخصك</p>
        </div>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        <div className="space-y-3" data-announcements-board>
          {board === null && !error && <div className="card text-center text-gray-400 py-8">جارٍ التحميل…</div>}
          {board?.length === 0 && <div className="card text-center text-gray-500 py-10">مفيش إعلانات دلوقتي.</div>}
          {board?.map((item) => (
            <div key={item.id} className={`card ${item.pinned ? 'border border-primary-200' : ''}`} data-announcement={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 break-words">
                  {item.pinned ? <Pin size={16} className="text-primary-600 shrink-0" /> : <Megaphone size={16} className="text-gray-400 shrink-0" />}
                  {item.title}
                </h2>
                <span className="text-xs text-gray-400"><bdi>{item.publishDate}</bdi></span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mt-2">{item.body}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                {item.read ? (
                  <span className="flex items-center gap-1 text-success-700"><CheckCircle2 size={16} /> {item.requiresRead ? 'أقرّيت بالقراءة' : 'مقري'}</span>
                ) : (
                  <button type="button" disabled={busy} onClick={() => run(() => markAnnouncementRead(item.id))} className={item.requiresRead ? 'btn-primary' : 'btn-secondary'}>
                    {item.requiresRead ? 'أقرّ بالقراءة' : 'قريت'}
                  </button>
                )}
                {item.expiryDate && <span className="text-xs text-gray-400">ساري لحد <bdi>{item.expiryDate}</bdi></span>}
              </div>
            </div>
          ))}
        </div>

        {manager && managed && (
          <div className="card space-y-4" data-announcements-manage>
            <h2 className="text-lg font-bold text-gray-800">إدارة الإعلانات</h2>
            {!managed.available && <p className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">{managed.message}</p>}
            {managed.available && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block md:col-span-2">
                  <span className="text-xs text-gray-500">العنوان</span>
                  <input value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} className={field} />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-xs text-gray-500">نص الإعلان</span>
                  <textarea value={form.body} maxLength={4000} rows={4} onChange={(e) => setForm({ ...form, body: e.target.value })} className={field} />
                </label>
                <div className="md:col-span-2">
                  <span className="text-xs text-gray-500">لمين (من غير اختيار = كل الشركة)</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {branches.map((branch) => (
                      <label key={branch.id} className="flex items-center gap-1 text-sm bg-gray-50 rounded-lg px-2 py-1">
                        <input type="checkbox" checked={form.branchIds.includes(branch.id)} onChange={() => toggleBranch(branch.id)} />
                        {branch.name}
                      </label>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="text-xs text-gray-500">تاريخ النشر (الفاضي = النهارده)</span>
                  <input type="date" value={form.publishDate} onChange={(e) => setForm({ ...form, publishDate: e.target.value })} className={field} />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">تاريخ الانتهاء (اختياري)</span>
                  <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className={field} />
                </label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> مثبّت أول اللوحة</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requiresRead} onChange={(e) => setForm({ ...form, requiresRead: e.target.checked })} /> محتاج إقرار قراءة</label>
                <div className="md:col-span-2">
                  <button type="button" onClick={save} disabled={busy || form.title.trim().length < 2 || !form.body.trim()} className="btn-primary disabled:opacity-50">حفظ كمسودة</button>
                </div>
              </div>
            )}
            {managed.items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-right text-gray-500 border-b border-gray-100">
                      <th className="py-2 px-2 font-medium">الإعلان</th>
                      <th className="py-2 px-2 font-medium">لمين</th>
                      <th className="py-2 px-2 font-medium">النشر / الانتهاء</th>
                      <th className="py-2 px-2 font-medium">الحالة</th>
                      <th className="py-2 px-2 font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managed.items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-50">
                        <td className="py-2 px-2 text-gray-800">{item.title}{item.pinned ? ' 📌' : ''}</td>
                        <td className="py-2 px-2 text-gray-600">{announcementAudienceText(item.audience, branchName)}</td>
                        <td className="py-2 px-2 text-gray-600"><bdi>{item.publishDate}</bdi>{item.expiryDate ? <> ← <bdi>{item.expiryDate}</bdi></> : null}</td>
                        <td className="py-2 px-2">{ANNOUNCEMENT_STATUS_LABELS[item.status] ?? item.status}</td>
                        <td className="py-2 px-2">
                          <div className="flex flex-wrap gap-2">
                            {item.status === 'DRAFT' && <button type="button" disabled={busy} onClick={() => run(() => publishAnnouncement(item.id))} className="btn-primary">نشر</button>}
                            {item.status === 'PUBLISHED' && <button type="button" disabled={busy} onClick={() => run(() => withdrawAnnouncement(item.id))} className="btn-secondary">سحب</button>}
                            {item.status !== 'DRAFT' && (
                              <button type="button" disabled={busy} onClick={() => run(async () => setReport(await fetchAnnouncementReport(item.id)))} className="btn-secondary">مين قرا</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {report && (
              <div className="rounded-xl bg-gray-50 p-3 space-y-2" data-announcement-report>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-gray-800">تقرير القراءة: {report.announcement.title} — قرا {report.summary.read} من {report.summary.audience}</p>
                  <button type="button" onClick={() => setReport(null)} className="text-sm text-gray-500 hover:text-gray-700">إغلاق</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {report.rows.map((row) => (
                        <tr key={row.employeeId} className="border-b border-gray-100">
                          <td className="py-1.5 px-2 text-gray-800">{row.fullName} <span className="text-xs text-gray-400"><bdi>{row.employeeCode}</bdi></span></td>
                          <td className="py-1.5 px-2 text-gray-600">{row.branchName ?? '—'}</td>
                          <td className="py-1.5 px-2">{row.readAt ? <span className="text-success-700">قرا <bdi>{String(row.readAt).slice(0, 10)}</bdi></span> : <span className="text-gray-400">لسه</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
