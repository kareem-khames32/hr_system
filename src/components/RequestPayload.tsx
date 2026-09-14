'use client'

import { useEffect, useState } from 'react'
import { fetchEmployeeDirectory, fetchTeams, fetchFileObjectUrl } from '@/lib/api'
import { useLeaveCatalog } from '@/lib/leave-catalog'
import { employeeStatusLabels } from '@/lib/status-labels'
import { payloadFieldLabel, payloadValueLabel } from '@/lib/request-payload'

/** Full request payload for review: every field, array member and attachment remains visible. */
export default function RequestPayload({ payload }: { payload?: string | null }) {
  const catalog = useLeaveCatalog()
  const [employees, setEmployees] = useState<Record<number, string>>({})
  const [teams, setTeams] = useState<Record<number, string>>({})
  const [error, setError] = useState('')
  const [busyFile, setBusyFile] = useState<number | null>(null)
  let data: Record<string, unknown> = {}
  let invalid = false
  try {
    const parsed: unknown = JSON.parse(payload || '{}')
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed as Record<string, unknown>
    else invalid = true
  } catch { invalid = true }

  useEffect(() => {
    let cancelled = false
    const needsEmployees = /(?:employeeId|toEmployeeId|withEmployeeId|managerEmployeeId)"/i.test(payload ?? '')
    const needsTeams = /(?:teamId|toTeamId|fromTeamId)"/i.test(payload ?? '')
    Promise.allSettled([
      needsEmployees ? fetchEmployeeDirectory() : Promise.resolve([]),
      needsTeams ? fetchTeams() : Promise.resolve([]),
    ]).then(([employeeResult, teamResult]) => {
      if (cancelled) return
      if (employeeResult.status === 'fulfilled') setEmployees(Object.fromEntries(employeeResult.value.map((row) => [row.id, `${row.fullName} (${row.employeeCode})`])))
      if (teamResult.status === 'fulfilled') setTeams(Object.fromEntries(teamResult.value.map((row) => [row.id, row.name])))
      if (employeeResult.status === 'rejected' || teamResult.status === 'rejected') setError('تعذر تحميل بعض الأسماء المرجعية؛ أرقام السجلات ظاهرة أدناه.')
    })
    return () => { cancelled = true }
  }, [payload])

  const openFile = async (id: number) => {
    const preview = window.open('', '_blank')
    if (preview) preview.opener = null
    setBusyFile(id)
    setError('')
    try {
      const url = await fetchFileObjectUrl(id)
      if (!url) throw new Error('تعذر فتح المرفق؛ قد لا تملك صلاحية الاطلاع عليه.')
      if (preview) preview.location.href = url
      else {
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `attachment-${id}`
        anchor.click()
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      preview?.close()
      setError(err instanceof Error ? err.message : 'تعذر فتح المرفق')
    } finally { setBusyFile(null) }
  }

  const renderValue = (key: string, value: unknown): React.ReactNode => {
    if (value == null || value === '') return <span className="text-gray-500">فارغ</span>
    if (typeof value === 'boolean') return value ? 'نعم' : 'لا'
    if (Array.isArray(value)) return value.length ? <ul className="list-disc list-inside space-y-1">{value.map((item, index) => <li key={index}>{renderValue(key, item)}</li>)}</ul> : 'قائمة فارغة'
    if (typeof value === 'object') return <dl className="space-y-2">{Object.entries(value).map(([child, item]) => <div key={child}><dt className="text-gray-500">{payloadFieldLabel(child)}</dt><dd>{renderValue(child, item)}</dd></div>)}</dl>
    const text = String(value)
    const file = /^file:(\d+)$/.exec(text)
    if (file) return <button type="button" onClick={() => openFile(Number(file[1]))} disabled={busyFile !== null} className="text-primary-600 underline">{busyFile === Number(file[1]) ? 'جارٍ فتح المرفق...' : `فتح المرفق #${file[1]}`}</button>
    if (key === 'leaveType' || key === 'leaveTypeCode') return catalog.label(text)
    if (key === 'period') return ({ FULL: 'يوم كامل', MORNING: 'نصف يوم صباحي', EVENING: 'نصف يوم مسائي' } as Record<string, string>)[text.toUpperCase()] ?? text
    if (key === 'newStatus') return employeeStatusLabels[text] ?? text
    if (['employeeId', 'toEmployeeId', 'withEmployeeId', 'managerEmployeeId'].includes(key)) return employees[Number(value)] ?? `موظف #${text}`
    if (['teamId', 'toTeamId', 'fromTeamId'].includes(key)) return teams[Number(value)] ?? `فريق #${text}`
    if (key === 'punchType') return ({ IN: 'دخول', OUT: 'خروج', in: 'دخول', out: 'خروج' } as Record<string, string>)[text] ?? text
    return <span className="whitespace-pre-wrap break-words" dir="auto">{payloadValueLabel(key, value)}</span>
  }

  if (invalid) return <p role="alert" className="text-red-700">تعذر قراءة بيانات الطلب. لا يمكن مراجعة حمولة غير صالحة.</p>
  return <div className="space-y-3">
    {(error || catalog.error) && <p role="alert" className="text-sm text-amber-700">{error || `تعذر تحميل أسماء أنواع الإجازات: ${catalog.error}`}</p>}
    {Object.keys(data).length === 0 ? <p className="text-gray-500">لا توجد حقول إضافية.</p> : <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Object.entries(data).map(([key, value]) => <div key={key} className="min-w-0 rounded-lg bg-gray-50 p-3"><dt className="text-xs text-gray-500 mb-1">{payloadFieldLabel(key)}</dt><dd className="text-sm text-gray-800">{renderValue(key, value)}</dd></div>)}</dl>}
  </div>
}
