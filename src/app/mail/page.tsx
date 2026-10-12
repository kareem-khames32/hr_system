'use client'

// B-ADD.16: «البريد» — بريد الشركة (Exchange) جوه النظام: الموظف بيقرا ويبعت من صندوقه بدخوله هو، والنظام مابيخزنش أي رسالة.
// الشاشة بتسأل الخادم عن حالة البريد للجلسة: مش مضبوط ← رسالة؛ مقفول ← «افتح بريدك»؛ مفتوح ← الصندوق.
import { useCallback, useEffect, useState } from 'react'
import { Inbox, Lock, Mail } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { getCurrentUser, sessionMark } from '@/lib/api'
import { fetchMailStatus, lockMailbox, type MailStatus } from '@/lib/mail-api'
import { ownCaches } from './cache'
import MailClient from './MailClient'
import SharedMailboxesManager from './SharedMailboxesManager'
import UnlockForm from './UnlockForm'

export default function MailPage() {
  const [status, setStatus] = useState<MailStatus | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [manage, setManage] = useState(false)
  const [revision, setRevision] = useState(0)

  const load = useCallback(() => {
    setError('')
    fetchMailStatus().then(setStatus).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذّر تحميل حالة البريد'))
  }, [])
  useEffect(load, [load])

  // البريد اتقفل (من الخادم أو بزرار القفل): الكاش بيتمسح والشاشة بترجع لنموذج الفتح
  const locked = useCallback((message: string) => {
    ownCaches(null)
    setNotice(message)
    setStatus((current) => (current ? { ...current, unlocked: false } : current))
  }, [])

  const lock = async () => {
    try {
      await lockMailbox()
    } catch {
      /* الخادم مش رادد: الشاشة بتتقفل برضه، والنص المخزّن بيخلص عمره لوحده */
    }
    locked('')
  }

  const user = getCurrentUser()
  const me = status ? [...new Set([status.address, status.login, user?.email ?? ''].map((value) => value.trim().toLowerCase()).filter(Boolean))] : []

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Mail size={24} className="text-primary-600" />
              البريد
            </h1>
            <p className="text-gray-500 mt-1">بريد الشركة من جوه النظام — الرسايل بتفضل على خادم البريد، والنظام مابيحفظش منها حاجة</p>
          </div>
          <div className="flex items-center gap-2">
            {status?.canManageShared && (
              <button type="button" className="btn-secondary text-sm flex items-center gap-2" onClick={() => setManage(true)}>
                <Inbox size={16} />
                الصناديق المشتركة
              </button>
            )}
            {status?.unlocked && (
              <button type="button" className="btn-secondary text-sm flex items-center gap-2" onClick={() => void lock()} title="اقفل البريد للجلسة دي من غير ما تخرج من النظام">
                <Lock size={16} />
                قفل البريد
              </button>
            )}
          </div>
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {!status && !error && <div className="text-sm text-gray-500">جاري التحميل…</div>}
        {status && !status.configured && (
          <div className="card text-center space-y-2" data-mail-not-configured>
            <Mail size={40} className="mx-auto text-gray-300" />
            <p className="text-gray-700 font-medium">البريد مش مضبوط على الخادم لسه</p>
            <p className="text-sm text-gray-500">مدير النظام يكتب عنوان خادم البريد في إعدادات الخادم (MAIL_EWS_URL) ويعيد تشغيله</p>
          </div>
        )}
        {status?.configured && !status.unlocked && (
          <UnlockForm login={status.login} notice={notice} onUnlocked={() => { setNotice(''); setStatus({ ...status, unlocked: true }) }} />
        )}
        {status?.configured && status.unlocked && <MailClient key={revision} owner={sessionMark() ?? 'session'} me={me} onLocked={locked} />}
        {/* بعد إدارة الصناديق المشتركة: الصندوق بيتحمّل من جديد عشان الصناديق تظهر تحت المجلدات */}
        {manage && <SharedMailboxesManager onClose={() => { setManage(false); setRevision((value) => value + 1) }} />}
      </div>
    </MainLayout>
  )
}
