import { SearchX, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'

// حالة فارغة موحدة للقوائم (نفس شكل «لا توجد عهد/مستندات/طلبات مطابقة» في باقي الشاشات)
export default function EmptyState({
  title,
  icon: Icon = SearchX,
  className,
}: {
  title: string
  icon?: LucideIcon
  className?: string
}) {
  return (
    <div className={clsx('card p-12 text-center', className)}>
      <Icon size={48} className="mx-auto text-gray-300 mb-4" />
      <p className="text-gray-500">{title}</p>
    </div>
  )
}
