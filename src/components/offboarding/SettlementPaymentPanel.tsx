'use client'

import { useState } from 'react'
import { Banknote } from 'lucide-react'
import {
  recordSettlementPayment,
  SETTLEMENT_PAYMENT_METHOD_OPTIONS,
  settlementPaymentSummary,
  type ApiSettlementPayment,
  type SettlementPaymentMethod,
} from '@/lib/settlement-payment-api'

const today = () => {
  const now = new Date()
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
}

// B1.8c: صرف التصفية المعتمدة — المتسجل بيظهر سطر، ولصاحب «اعتماد التصفية» فورم التسجيل (مرة واحدة)
export function SettlementPaymentPanel({ caseId, payment, ready, canRecord, onRecorded }: {
  caseId: number
  payment: ApiSettlementPayment | null | undefined
  ready: boolean | undefined
  canRecord: boolean
  onRecorded: () => Promise<void> | void
}) {
  const [date, setDate] = useState(today())
  const [method, setMethod] = useState<SettlementPaymentMethod>('BANK_TRANSFER')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (payment) {
    return (
      <div className="card flex items-start gap-3">
        <Banknote size={20} className="text-success-600 shrink-0 mt-0.5" />
        <p className="text-sm text-gray-700">{settlementPaymentSummary(payment)}</p>
      </div>
    )
  }
  if (ready === false) {
    return (
      <div className="card text-sm text-gray-500">
        تسجيل صرف التصفية محتاج ترحيل 20261003_083 على قاعدة البيانات.
      </div>
    )
  }
  if (!canRecord) {
    return <div className="card text-sm text-gray-500">صرف التصفية لسه ماتسجلش.</div>
  }

  const submit = async () => {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      await recordSettlementPayment(caseId, { date, method, ...(reference.trim() ? { reference: reference.trim() } : {}) })
      await onRecorded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الصرف')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2">
        <Banknote size={20} className="text-primary-600" />
        <h3 className="font-bold text-gray-800">تسجيل صرف التصفية</h3>
      </div>
      <p className="text-xs text-gray-500">
        الاعتماد مش إثبات صرف. سجّل هنا إمتى وإزاي اتصرفت المستحقات (وراتب آخر شهر جواها). التسجيل مرة واحدة.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-sm text-gray-600 space-y-1">
          <span>تاريخ الصرف</span>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className="input w-full" />
        </label>
        <label className="text-sm text-gray-600 space-y-1">
          <span>الطريقة</span>
          <select value={method} onChange={(e) => setMethod(e.target.value as SettlementPaymentMethod)} className="input w-full">
            {SETTLEMENT_PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-600 space-y-1">
          <span>المرجع {method === 'CASH' ? '(اختياري)' : '(رقم التحويل أو الشيك)'}</span>
          <input type="text" value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} className="input w-full" dir="ltr" />
        </label>
      </div>
      {error && <p className="text-sm text-danger-600">{error}</p>}
      <button type="button" onClick={submit} disabled={saving} className="btn-primary text-sm px-4 py-2">
        {saving ? 'جاري التسجيل…' : 'تسجيل الصرف'}
      </button>
    </div>
  )
}
