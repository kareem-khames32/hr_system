// B-ADD.17 (طلب المالك 12 أكتوبر): سطر «واقف عند» في قايمة وتفاصيل الطلب (طلباتي، لوحة الطلبات، بانتظار موافقتي) — اسم الشخص اللي
// الخطوة الحالية مستنياه ومسمّاه ومن إمتى، مش اسم الدور بس. البيانات من الخادم مع الطلب نفسه (waitingAt)؛ الطلب اللي مش قيد المراجعة
// والسري المحجوب مابيرجعش معاهم حاجة، فالسطر مابيظهرش أصلًا.
import { UserRound } from 'lucide-react'
import { waitingNobodyText, waitingPersonName, waitingPersonTitle, waitingSinceText, type ApiRequestWaitingAt } from '../../lib/request-waiting'

export default function RequestWaitingAt({ waitingAt, roleLabels, compact }: {
  waitingAt?: ApiRequestWaitingAt | null
  /** أسماء الأدوار زي ما الشاشة بتكتبها في سلسلة الاعتماد */
  roleLabels: Record<string, string>
  /** سطر صغير جوه صف في قايمة */
  compact?: boolean
}) {
  if (!waitingAt) return null
  const people = waitingAt.people
  const since = waitingSinceText(waitingAt.since)
  return (
    <p data-waiting-at className={compact ? 'text-xs text-gray-600 break-words' : 'flex items-start gap-2 rounded-xl bg-warning-50 text-warning-800 px-3 py-2 text-sm break-words'}>
      {!compact && <UserRound size={16} className="mt-0.5 shrink-0" />}
      <span>
        واقف عند:{' '}
        {!people.length && <span>{waitingNobodyText(waitingAt, roleLabels)}</span>}
        {people.map((person, index) => (
          <span key={index}>
            {index > 0 && '، '}
            <strong className="font-bold">{waitingPersonName(person)}</strong>
            {people.length === 1 ? ` — ${waitingPersonTitle(person, roleLabels)}` : ` (${waitingPersonTitle(person, roleLabels)})`}
          </span>
        ))}
        {people.length > 0 && waitingAt.more > 0 && <span> +{waitingAt.more}</span>}
        {since && <span className={compact ? 'text-gray-400' : undefined}> — {since}</span>}
      </span>
    </p>
  )
}
