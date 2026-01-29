'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  FileText,
  Save,
} from 'lucide-react'

interface ManualEntry {
  id: string
  employeeId: string
  employeeName: string
  date: string
  checkIn: string
  checkOut: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  submittedBy: string
  submittedAt: string
}

const manualEntries: ManualEntry[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'أحمد محمد علي',
    date: '2024-01-20',
    checkIn: '08:00',
    checkOut: '17:00',
    reason: 'نسيان البصمة',
    status: 'approved',
    submittedBy: 'محمد أحمد',
    submittedAt: '2024-01-20 09:30',
  },
  {
    id: '2',
    employeeId: 'EMP003',
    employeeName: 'عمر سالم الحربي',
    date: '2024-01-19',
    checkIn: '07:45',
    checkOut: '16:30',
    reason: 'عطل في جهاز البصمة',
    status: 'approved',
    submittedBy: 'محمد أحمد',
    submittedAt: '2024-01-19 17:00',
  },
  {
    id: '3',
    employeeId: 'EMP005',
    employeeName: 'فهد عبدالله السعيد',
    date: '2024-01-21',
    checkIn: '09:00',
    checkOut: '18:00',
    reason: 'عمل من موقع خارجي',
    status: 'pending',
    submittedBy: 'محمد أحمد',
    submittedAt: '2024-01-21 10:15',
  },
  {
    id: '4',
    employeeId: 'EMP007',
    employeeName: 'خالد محمد العتيبي',
    date: '2024-01-18',
    checkIn: '08:30',
    checkOut: '16:00',
    reason: 'اجتماع خارجي',
    status: 'rejected',
    submittedBy: 'سارة أحمد',
    submittedAt: '2024-01-18 16:30',
  },
]

const employees = [
  { id: 'EMP001', name: 'أحمد محمد علي' },
  { id: 'EMP002', name: 'سارة أحمد الخالدي' },
  { id: 'EMP003', name: 'عمر سالم الحربي' },
  { id: 'EMP004', name: 'نورة محمد الدوسري' },
  { id: 'EMP005', name: 'فهد عبدالله السعيد' },
]

const statusLabels = {
  pending: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
}

const statusColors = {
  pending: 'bg-warning-50 text-warning-700',
  approved: 'bg-success-50 text-success-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function ManualEntryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    employeeId: '',
    date: '',
    checkIn: '',
    checkOut: '',
    reason: '',
  })

  const filteredEntries = manualEntries.filter(
    (entry) =>
      entry.employeeName.includes(searchTerm) ||
      entry.employeeId.includes(searchTerm)
  )

  const stats = {
    total: manualEntries.length,
    pending: manualEntries.filter((e) => e.status === 'pending').length,
    approved: manualEntries.filter((e) => e.status === 'approved').length,
    rejected: manualEntries.filter((e) => e.status === 'rejected').length,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الإدخال اليدوي للحضور</h1>
            <p className="text-gray-500 mt-1">إدخال سجلات الحضور والانصراف يدوياً</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            إدخال جديد
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <FileText size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الإدخالات</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">قيد المراجعة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">معتمدة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.approved}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
              <AlertCircle size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مرفوضة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.rejected}</p>
            </div>
          </div>
        </div>

        {/* Entry Form */}
        {showForm && (
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-4">إدخال سجل حضور جديد</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الموظف
                </label>
                <select
                  className="input w-full"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                >
                  <option value="">اختر الموظف</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  التاريخ
                </label>
                <input
                  type="date"
                  className="input w-full"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  وقت الحضور
                </label>
                <input
                  type="time"
                  className="input w-full"
                  value={formData.checkIn}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  وقت الانصراف
                </label>
                <input
                  type="time"
                  className="input w-full"
                  value={formData.checkOut}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  سبب الإدخال اليدوي
                </label>
                <textarea
                  className="input w-full"
                  rows={3}
                  placeholder="اكتب سبب الإدخال اليدوي..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button className="btn-primary flex items-center gap-2">
                <Save size={18} />
                حفظ الإدخال
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="card">
          <div className="relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن موظف..."
              className="input pr-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Entries Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الموظف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الحضور</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الانصراف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">السبب</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">بواسطة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 font-bold">
                        {entry.employeeName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{entry.employeeName}</p>
                        <p className="text-sm text-gray-500">{entry.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {new Date(entry.date).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                      {entry.checkIn}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
                      {entry.checkOut}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-600 max-w-[200px] truncate">
                    {entry.reason}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[entry.status]}`}
                    >
                      {statusLabels[entry.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-800">{entry.submittedBy}</p>
                    <p className="text-xs text-gray-500">{entry.submittedAt}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {entry.status === 'pending' && (
                        <>
                          <button className="p-2 bg-success-50 text-success-600 rounded-lg hover:bg-success-100">
                            <CheckCircle2 size={16} />
                          </button>
                          <button className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                            <AlertCircle size={16} />
                          </button>
                        </>
                      )}
                      <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                        <Edit2 size={16} className="text-gray-600" />
                      </button>
                      <button className="p-2 bg-gray-100 rounded-lg hover:bg-red-100">
                        <Trash2 size={16} className="text-gray-600 hover:text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  )
}
