'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Clock,
  Sun,
  Moon,
  Coffee,
  Users,
  Calendar,
  Copy,
  MoreVertical,
} from 'lucide-react'

interface Shift {
  id: string
  name: string
  nameEn: string
  code: string
  type: 'fixed' | 'flexible' | 'rotating' | 'night' | 'remote'
  startTime: string
  endTime: string
  workHours: number
  breakDuration: number
  graceIn: number
  graceOut: number
  color: string
  employeeCount: number
  isActive: boolean
}

const shifts: Shift[] = [
  {
    id: '1',
    name: 'الوردية الصباحية',
    nameEn: 'Morning Shift',
    code: 'MS',
    type: 'fixed',
    startTime: '08:00',
    endTime: '17:00',
    workHours: 8,
    breakDuration: 60,
    graceIn: 15,
    graceOut: 15,
    color: 'bg-primary-500',
    employeeCount: 150,
    isActive: true,
  },
  {
    id: '2',
    name: 'الوردية المسائية',
    nameEn: 'Evening Shift',
    code: 'ES',
    type: 'fixed',
    startTime: '14:00',
    endTime: '23:00',
    workHours: 8,
    breakDuration: 60,
    graceIn: 15,
    graceOut: 15,
    color: 'bg-warning-500',
    employeeCount: 45,
    isActive: true,
  },
  {
    id: '3',
    name: 'الوردية الليلية',
    nameEn: 'Night Shift',
    code: 'NS',
    type: 'night',
    startTime: '22:00',
    endTime: '07:00',
    workHours: 8,
    breakDuration: 60,
    graceIn: 15,
    graceOut: 15,
    color: 'bg-purple-500',
    employeeCount: 20,
    isActive: true,
  },
  {
    id: '4',
    name: 'الدوام المرن',
    nameEn: 'Flexible Shift',
    code: 'FS',
    type: 'flexible',
    startTime: '07:00',
    endTime: '19:00',
    workHours: 8,
    breakDuration: 60,
    graceIn: 0,
    graceOut: 0,
    color: 'bg-success-500',
    employeeCount: 30,
    isActive: true,
  },
  {
    id: '5',
    name: 'العمل عن بُعد',
    nameEn: 'Remote Work',
    code: 'RW',
    type: 'remote',
    startTime: '09:00',
    endTime: '18:00',
    workHours: 8,
    breakDuration: 60,
    graceIn: 30,
    graceOut: 30,
    color: 'bg-cyan-500',
    employeeCount: 15,
    isActive: true,
  },
  {
    id: '6',
    name: 'وردية رمضان',
    nameEn: 'Ramadan Shift',
    code: 'RS',
    type: 'fixed',
    startTime: '10:00',
    endTime: '16:00',
    workHours: 6,
    breakDuration: 0,
    graceIn: 15,
    graceOut: 15,
    color: 'bg-emerald-500',
    employeeCount: 0,
    isActive: false,
  },
]

const getShiftTypeIcon = (type: Shift['type']) => {
  switch (type) {
    case 'fixed':
      return <Clock size={18} />
    case 'flexible':
      return <Coffee size={18} />
    case 'rotating':
      return <Calendar size={18} />
    case 'night':
      return <Moon size={18} />
    case 'remote':
      return <Sun size={18} />
  }
}

const getShiftTypeName = (type: Shift['type']) => {
  switch (type) {
    case 'fixed':
      return 'ثابتة'
    case 'flexible':
      return 'مرنة'
    case 'rotating':
      return 'متناوبة'
    case 'night':
      return 'ليلية'
    case 'remote':
      return 'عن بُعد'
  }
}

export default function ShiftsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const filteredShifts = shifts.filter(
    (shift) =>
      shift.name.includes(searchQuery) ||
      shift.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shift.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeShifts = shifts.filter((s) => s.isActive)
  const totalEmployees = shifts.reduce((sum, s) => sum + s.employeeCount, 0)

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إدارة الورديات</h1>
            <p className="text-gray-500 mt-1">تعريف وإدارة ورديات العمل</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            إضافة وردية
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الورديات</p>
              <p className="text-2xl font-bold text-gray-800">{shifts.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ورديات نشطة</p>
              <p className="text-2xl font-bold text-success-600">{activeShifts.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الموظفين</p>
              <p className="text-2xl font-bold text-warning-600">{totalEmployees}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Moon size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ورديات ليلية</p>
              <p className="text-2xl font-bold text-purple-600">
                {shifts.filter((s) => s.type === 'night').length}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card">
          <div className="relative w-96">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن وردية..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-10"
            />
          </div>
        </div>

        {/* Shifts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShifts.map((shift) => (
            <div
              key={shift.id}
              className={`card relative overflow-hidden ${!shift.isActive ? 'opacity-60' : ''}`}
            >
              {/* Color Bar */}
              <div className={`absolute top-0 right-0 left-0 h-1.5 ${shift.color}`} />

              {/* Header */}
              <div className="flex items-start justify-between mt-2">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${shift.color} bg-opacity-10 rounded-2xl flex items-center justify-center`}>
                    <span className={`${shift.color.replace('bg-', 'text-')}`}>
                      {getShiftTypeIcon(shift.type)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{shift.name}</h3>
                    <p className="text-sm text-gray-400">{shift.nameEn}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${shift.color} bg-opacity-10 ${shift.color.replace('bg-', 'text-')}`}>
                    {shift.code}
                  </span>
                </div>
              </div>

              {/* Time Info */}
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-xs text-gray-400">بداية الدوام</p>
                    <p className="text-xl font-bold text-success-600 font-mono">{shift.startTime}</p>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-20 h-0.5 bg-gray-200 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                        <span className="text-xs text-gray-400">{shift.workHours} ساعات</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">نهاية الدوام</p>
                    <p className="text-xl font-bold text-danger-600 font-mono">{shift.endTime}</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400">الاستراحة</p>
                  <p className="font-medium text-gray-700">{shift.breakDuration} د</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400">سماح الدخول</p>
                  <p className="font-medium text-gray-700">{shift.graceIn} د</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400">سماح الخروج</p>
                  <p className="font-medium text-gray-700">{shift.graceOut} د</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600">{shift.employeeCount} موظف</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      shift.isActive ? 'bg-success-50 text-success-600' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {shift.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center gap-2">
                <button className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-1">
                  <Edit size={16} />
                  تعديل
                </button>
                <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  <Copy size={16} className="text-gray-500" />
                </button>
                <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  <MoreVertical size={16} className="text-gray-500" />
                </button>
              </div>
            </div>
          ))}

          {/* Add New Shift Card */}
          <button
            onClick={() => setShowAddModal(true)}
            className="card border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all flex flex-col items-center justify-center gap-4 min-h-[300px]"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Plus size={32} className="text-gray-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-600">إضافة وردية جديدة</p>
              <p className="text-sm text-gray-400 mt-1">أنشئ وردية عمل جديدة</p>
            </div>
          </button>
        </div>

        {/* Shift Assignment Section */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4">تعيين الورديات للموظفين</h3>
          <div className="grid grid-cols-3 gap-4">
            <button className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-right">
              <Calendar size={24} className="text-primary-500 mb-2" />
              <p className="font-medium text-gray-800">الجدول الأسبوعي</p>
              <p className="text-sm text-gray-500 mt-1">عرض وتعديل جدول الورديات الأسبوعي</p>
            </button>
            <button className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-right">
              <Users size={24} className="text-success-500 mb-2" />
              <p className="font-medium text-gray-800">تعيين جماعي</p>
              <p className="text-sm text-gray-500 mt-1">تعيين وردية لمجموعة موظفين</p>
            </button>
            <button className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-right">
              <Copy size={24} className="text-warning-500 mb-2" />
              <p className="font-medium text-gray-800">نسخ من أسبوع سابق</p>
              <p className="text-sm text-gray-500 mt-1">نسخ جدول الورديات من أسبوع سابق</p>
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
