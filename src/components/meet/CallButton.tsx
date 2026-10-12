'use client'

// B-ADD.23: زرار «اتصال» جنب رقم تحويلة شخص (ملف الموظف) — بيظهر لما موديول الاجتماعات مفتوح للحساب والرقم أرقام فعلًا. المكالمة نفسها عند
// MeetSessionProvider (في الإطار الدائم)، ورفض الخادم (مشغول، مفيش حد بالتحويلة…) بيطلع رسالة فوق الشاشة.
import { useState } from 'react'
import { Phone } from 'lucide-react'
import { meetErrorText } from '@/lib/meet-api'
import { useModuleEnabled } from '@/lib/modules'
import { useOptionalMeetSession } from './MeetSession'
import { meetNotify } from './meetState'

export default function CallButton({ extension }: { extension: string | null | undefined }) {
  const enabled = useModuleEnabled('meet')
  const session = useOptionalMeetSession()
  const [busy, setBusy] = useState(false)
  const number = String(extension ?? '').trim()
  if (!enabled || !session || !/^\d{1,10}$/.test(number)) return null

  const call = async () => {
    if (busy) return
    setBusy(true)
    try {
      await session.dial({ extension: number })
    } catch (error) {
      meetNotify(meetErrorText(error, 'تعذر الاتصال'), 'danger')
    } finally {
      setBusy(false)
    }
  }
  return (
    <button type="button" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-500 disabled:opacity-50" onClick={() => void call()}
      disabled={busy || !!session.call} data-call-button>
      <Phone size={14} /> اتصال
    </button>
  )
}
