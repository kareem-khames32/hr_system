'use client'

import { Check, X, Eye, Calendar, Clock, DollarSign } from 'lucide-react'

interface Approval {
  id: string
  type: 'leave' | 'permission' | 'loan' | 'overtime'
  employee: string
  employeeAvatar: string
  department: string
  details: string
  date: string
  status: 'pending'
}

const approvals: Approval[] = [
  {
    id: '1',
    type: 'leave',
    employee: 'أحمد محمد علي',
    employeeAvatar: 'أ',
    department: 'تقنية المعلومات',
    details: 'إجازة سنوية - 5 أيام',
    date: '2026/02/01 - 2026/02/05',
    status: 'pending',
  },
  {
    id: '2',
    type: 'permission',
    employee: 'سارة أحمد',
    employeeAvatar: 'س',
    department: 'الموارد البشرية',
    details: 'إذن خروج - 3 ساعات',
    date: '2026/01/30 - 12:00 م',
    status: 'pending',
  },
  {
    id: '3',
    type: 'loan',
    employee: 'محمد خالد',
    employeeAvatar: 'م',
    department: 'المبيعات',
    details: 'سلفة راتب - 5,000 ر.س',
    date: 'مقدم في 2026/01/28',
    status: 'pending',
  },
  {
    id: '4',
    type: 'overtime',
    employee: 'فاطمة علي',
    employeeAvatar: 'ف',
    department: 'المحاسبة',
    details: 'عمل إضافي - 4 ساعات',
    date: '2026/01/27',
    status: 'pending',
  },
]

const getTypeIcon = (type: Approval['type']) => {
  switch (type) {
    case 'leave':
      return <Calendar size={16} className="text-primary-500" />
    case 'permission':
      return <Clock size={16} className="text-warning-500" />
    case 'loan':
      return <DollarSign size={16} className="text-success-500" />
    case 'overtime':
      return <Clock size={16} className="text-purple-500" />
  }
}

const getTypeName = (type: Approval['type']) => {
  switch (type) {
    case 'leave':
      return 'إجازة'
    case 'permission':
      return 'إذن'
    case 'loan':
      return 'سلفة'
    case 'overtime':
      return 'عمل إضافي'
  }
}

export default function PendingApprovals() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-gray-800">طلبات في الانتظار</h3>
          <span className="bg-danger-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {approvals.length}
          </span>
        </div>
        <button className="text-sm text-primary-500 hover:text-primary-600 font-medium">
          عرض الكل
        </button>
      </div>

      <div className="space-y-3">
        {approvals.map((approval) => (
          <div
            key={approval.id}
            className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            {/* Avatar */}
            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {approval.employeeAvatar}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-800">{approval.employee}</p>
                <span className="badge badge-primary flex items-center gap-1">
                  {getTypeIcon(approval.type)}
                  {getTypeName(approval.type)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{approval.department}</p>
              <p className="text-sm text-gray-600 mt-1">{approval.details}</p>
              <p className="text-xs text-gray-400 mt-1">{approval.date}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button className="p-2 bg-white rounded-lg hover:bg-gray-200 transition-colors border border-gray-200">
                <Eye size={18} className="text-gray-500" />
              </button>
              <button className="p-2 bg-success-500 rounded-lg hover:bg-success-600 transition-colors text-white">
                <Check size={18} />
              </button>
              <button className="p-2 bg-danger-500 rounded-lg hover:bg-danger-600 transition-colors text-white">
                <X size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
