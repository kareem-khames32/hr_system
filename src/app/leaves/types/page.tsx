'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Settings,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

interface LeaveType {
  id: string
  name: string
  nameEn: string
  defaultDays: number
  maxDays: number
  carryOver: boolean
  carryOverLimit: number
  requiresApproval: boolean
  requiresAttachment: boolean
  paidLeave: boolean
  color: string
  active: boolean
}

const leaveTypes: LeaveType[] = [
  {
    id: '1',
    name: 'إجازة سنوية',
    nameEn: 'Annual Leave',
    defaultDays: 21,
    maxDays: 30,
    carryOver: true,
    carryOverLimit: 10,
    requiresApproval: true,
    requiresAttachment: false,
    paidLeave: true,
    color: '#3B82F6',
    active: true,
  },
  {
    id: '2',
    name: 'إجازة مرضية',
    nameEn: 'Sick Leave',
    defaultDays: 30,
    maxDays: 120,
    carryOver: false,
    carryOverLimit: 0,
    requiresApproval: true,
    requiresAttachment: true,
    paidLeave: true,
    color: '#EF4444',
    active: true,
  },
  {
    id: '3',
    name: 'إجازة طارئة',
    nameEn: 'Emergency Leave',
    defaultDays: 5,
    maxDays: 5,
    carryOver: false,
    carryOverLimit: 0,
    requiresApproval: true,
    requiresAttachment: false,
    paidLeave: true,
    color: '#F97316',
    active: true,
  },
  {
    id: '4',
    name: 'إجازة بدون راتب',
    nameEn: 'Unpaid Leave',
    defaultDays: 0,
    maxDays: 90,
    carryOver: false,
    carryOverLimit: 0,
    requiresApproval: true,
    requiresAttachment: false,
    paidLeave: false,
    color: '#6B7280',
    active: true,
  },
  {
    id: '5',
    name: 'إجازة زواج',
    nameEn: 'Marriage Leave',
    defaultDays: 5,
    maxDays: 5,
    carryOver: false,
    carryOverLimit: 0,
    requiresApproval: true,
    requiresAttachment: true,
    paidLeave: true,
    color: '#EC4899',
    active: true,
  },
  {
    id: '6',
    name: 'إجازة أمومة',
    nameEn: 'Maternity Leave',
    defaultDays: 70,
    maxDays: 70,
    carryOver: false,
    carryOverLimit: 0,
    requiresApproval: true,
    requiresAttachment: true,
    paidLeave: true,
    color: '#A855F7',
    active: true,
  },
  {
    id: '7',
    name: 'إجازة أبوة',
    nameEn: 'Paternity Leave',
    defaultDays: 3,
    maxDays: 3,
    carryOver: false,
    carryOverLimit: 0,
    requiresApproval: true,
    requiresAttachment: true,
    paidLeave: true,
    color: '#6366F1',
    active: true,
  },
  {
    id: '8',
    name: 'إجازة حج',
    nameEn: 'Hajj Leave',
    defaultDays: 15,
    maxDays: 15,
    carryOver: false,
    carryOverLimit: 0,
    requiresApproval: true,
    requiresAttachment: false,
    paidLeave: true,
    color: '#10B981',
    active: true,
  },
]

export default function LeaveTypesPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">أنواع الإجازات</h1>
            <p className="text-gray-500 mt-1">إدارة وتكوين أنواع الإجازات</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إضافة نوع
          </button>
        </div>

        {/* Leave Types Grid */}
        <div className="grid grid-cols-2 gap-4">
          {leaveTypes.map((type) => (
            <div key={type.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${type.color}20` }}
                  >
                    <Calendar size={24} style={{ color: type.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{type.name}</h3>
                    <p className="text-sm text-gray-500">{type.nameEn}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                    <Edit2 size={16} className="text-gray-600" />
                  </button>
                  <button className="p-2 bg-gray-100 rounded-lg hover:bg-red-100">
                    <Trash2 size={16} className="text-gray-600 hover:text-red-600" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">الأيام الافتراضية</p>
                  <p className="text-lg font-bold text-gray-800">{type.defaultDays} يوم</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">الحد الأقصى</p>
                  <p className="text-lg font-bold text-gray-800">{type.maxDays} يوم</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    type.paidLeave
                      ? 'bg-success-50 text-success-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {type.paidLeave ? 'مدفوعة' : 'غير مدفوعة'}
                </span>
                {type.carryOver && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    قابلة للترحيل ({type.carryOverLimit} يوم)
                  </span>
                )}
                {type.requiresAttachment && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-warning-50 text-warning-700">
                    تتطلب مرفقات
                  </span>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  {type.active ? (
                    <>
                      <CheckCircle2 size={16} className="text-success-600" />
                      <span className="text-success-600">مفعّل</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={16} className="text-gray-400" />
                      <span className="text-gray-400">معطّل</span>
                    </>
                  )}
                </div>
                <button className="text-primary-600 text-sm font-medium hover:underline">
                  إعدادات متقدمة
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}
