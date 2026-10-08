'use client'
// B4.1: تحذير المسيرات المفتوحة اللي تعريفها بيجمع أكتر من كيان قانوني — تحذير بس: المسير القايم مابيتمنعش لحد ما يتقسّم لمسير لكل كيان.
import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { fetchPayrollEntityWarnings, type ApiEntityWarning } from '../../lib/legal-entities-api'

export default function PayrollEntityWarnings({ refreshKey }: { refreshKey?: unknown }) {
  const [rows, setRows] = useState<ApiEntityWarning[]>([])

  useEffect(() => {
    let alive = true
    fetchPayrollEntityWarnings().then((data) => { if (alive) setRows(data.warnings) }).catch(() => { if (alive) setRows([]) })
    return () => { alive = false }
  }, [refreshKey])

  if (!rows.length) return null
  return (
    <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm" data-payroll-entity-warnings>
      <p className="font-medium flex items-center gap-2">
        <AlertTriangle size={16} />
        مسيرات بتجمع أكتر من كيان قانوني — قسّمها لمسير لكل كيان
      </p>
      <ul className="mt-2 space-y-1">
        {rows.map((row) => (
          <li key={row.runId}>
            «{row.name ?? `مسير رقم ${row.runId}`}» ({row.period}): {row.entities.join(' + ')}
          </li>
        ))}
      </ul>
    </div>
  )
}
