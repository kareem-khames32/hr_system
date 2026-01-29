'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Download,
  Upload,
  Shield,
  Users,
  DollarSign,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Building2,
  TrendingUp,
} from 'lucide-react'

interface GOSIRecord {
  id: string
  employeeId: string
  employeeName: string
  nationality: 'saudi' | 'expat'
  gosiNumber: string
  basicSalary: number
  housingAllowance: number
  employeeShare: number
  companyShare: number
  totalContribution: number
  status: 'active' | 'pending' | 'suspended'
}

const gosiRecords: GOSIRecord[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'أحمد محمد علي',
    nationality: 'saudi',
    gosiNumber: '1234567890',
    basicSalary: 8000,
    housingAllowance: 2000,
    employeeShare: 990,
    companyShare: 1100,
    totalContribution: 2090,
    status: 'active',
  },
  {
    id: '2',
    employeeId: 'EMP002',
    employeeName: 'سارة أحمد الخالدي',
    nationality: 'saudi',
    gosiNumber: '1234567891',
    basicSalary: 12000,
    housingAllowance: 3000,
    employeeShare: 1485,
    companyShare: 1650,
    totalContribution: 3135,
    status: 'active',
  },
  {
    id: '3',
    employeeId: 'EMP003',
    employeeName: 'محمد خان',
    nationality: 'expat',
    gosiNumber: '1234567892',
    basicSalary: 6000,
    housingAllowance: 1500,
    employeeShare: 0,
    companyShare: 150,
    totalContribution: 150,
    status: 'active',
  },
  {
    id: '4',
    employeeId: 'EMP004',
    employeeName: 'عمر سالم الحربي',
    nationality: 'saudi',
    gosiNumber: '1234567893',
    basicSalary: 15000,
    housingAllowance: 3750,
    employeeShare: 1856,
    companyShare: 2063,
    totalContribution: 3919,
    status: 'active',
  },
  {
    id: '5',
    employeeId: 'EMP005',
    employeeName: 'نورة محمد الدوسري',
    nationality: 'saudi',
    gosiNumber: '1234567894',
    basicSalary: 10000,
    housingAllowance: 2500,
    employeeShare: 1238,
    companyShare: 1375,
    totalContribution: 2613,
    status: 'pending',
  },
]

const statusLabels = {
  active: 'نشط',
  pending: 'قيد المعالجة',
  suspended: 'موقوف',
}

const statusColors = {
  active: 'bg-success-50 text-success-700',
  pending: 'bg-warning-50 text-warning-700',
  suspended: 'bg-red-100 text-red-700',
}

export default function GOSIPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterNationality, setFilterNationality] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('2024-01')

  const filteredRecords = gosiRecords.filter((record) => {
    const matchesSearch =
      record.employeeName.includes(searchTerm) ||
      record.employeeId.includes(searchTerm) ||
      record.gosiNumber.includes(searchTerm)
    const matchesNationality =
      filterNationality === 'all' || record.nationality === filterNationality
    return matchesSearch && matchesNationality
  })

  const stats = {
    totalEmployees: gosiRecords.length,
    saudiEmployees: gosiRecords.filter((r) => r.nationality === 'saudi').length,
    expatEmployees: gosiRecords.filter((r) => r.nationality === 'expat').length,
    totalCompanyShare: gosiRecords.reduce((sum, r) => sum + r.companyShare, 0),
    totalEmployeeShare: gosiRecords.reduce((sum, r) => sum + r.employeeShare, 0),
    totalContribution: gosiRecords.reduce((sum, r) => sum + r.totalContribution, 0),
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">التأمينات الاجتماعية (GOSI)</h1>
            <p className="text-gray-500 mt-1">إدارة اشتراكات التأمينات الاجتماعية للموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input"
            >
              <option value="2024-01">يناير 2024</option>
              <option value="2023-12">ديسمبر 2023</option>
              <option value="2023-11">نوفمبر 2023</option>
            </select>
            <button className="btn-secondary flex items-center gap-2">
              <Upload size={18} />
              رفع ملف
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Download size={18} />
              تصدير التقرير
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Shield size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الاشتراكات</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.totalContribution.toLocaleString()} ر.س
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Building2 size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">حصة المنشأة</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.totalCompanyShare.toLocaleString()} ر.س
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">حصة الموظفين</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.totalEmployeeShare.toLocaleString()} ر.س
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">الموظفين المسجلين</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalEmployees}</p>
            </div>
          </div>
        </div>

        {/* Contribution Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-4">توزيع الاشتراكات حسب الجنسية</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Users size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">الموظفين السعوديين</p>
                    <p className="text-sm text-gray-500">{stats.saudiEmployees} موظف</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm text-gray-500">نسبة الاشتراك: 21.5%</p>
                  <p className="font-bold text-green-600">
                    {gosiRecords
                      .filter((r) => r.nationality === 'saudi')
                      .reduce((sum, r) => sum + r.totalContribution, 0)
                      .toLocaleString()}{' '}
                    ر.س
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">الموظفين غير السعوديين</p>
                    <p className="text-sm text-gray-500">{stats.expatEmployees} موظف</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm text-gray-500">نسبة الاشتراك: 2%</p>
                  <p className="font-bold text-blue-600">
                    {gosiRecords
                      .filter((r) => r.nationality === 'expat')
                      .reduce((sum, r) => sum + r.totalContribution, 0)
                      .toLocaleString()}{' '}
                    ر.س
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-gray-800 mb-4">نسب الاشتراك</h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-800 mb-3">الموظفين السعوديين</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">حصة الموظف</span>
                    <span className="font-medium text-gray-800">9.75%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">حصة المنشأة</span>
                    <span className="font-medium text-gray-800">11.75%</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
                    <span className="font-medium text-gray-700">الإجمالي</span>
                    <span className="font-bold text-primary-600">21.5%</span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-800 mb-3">الموظفين غير السعوديين</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">حصة الموظف</span>
                    <span className="font-medium text-gray-800">0%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">حصة المنشأة (أخطار مهنية)</span>
                    <span className="font-medium text-gray-800">2%</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
                    <span className="font-medium text-gray-700">الإجمالي</span>
                    <span className="font-bold text-primary-600">2%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث برقم الموظف أو الاسم أو رقم التأمينات..."
                className="input pr-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterNationality}
              onChange={(e) => setFilterNationality(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل الجنسيات</option>
              <option value="saudi">سعودي</option>
              <option value="expat">غير سعودي</option>
            </select>
          </div>
        </div>

        {/* Records Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الموظف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">رقم التأمينات</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الراتب الخاضع</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">حصة الموظف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">حصة المنشأة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الإجمالي</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 font-bold">
                        {record.employeeName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{record.employeeName}</p>
                        <p className="text-sm text-gray-500">
                          {record.employeeId} •{' '}
                          <span
                            className={
                              record.nationality === 'saudi' ? 'text-green-600' : 'text-blue-600'
                            }
                          >
                            {record.nationality === 'saudi' ? 'سعودي' : 'غير سعودي'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600 font-mono">{record.gosiNumber}</td>
                  <td className="px-4 py-4">
                    <p className="text-gray-800">
                      {(record.basicSalary + record.housingAllowance).toLocaleString()} ر.س
                    </p>
                    <p className="text-xs text-gray-500">
                      أساسي: {record.basicSalary.toLocaleString()} + سكن:{' '}
                      {record.housingAllowance.toLocaleString()}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {record.employeeShare.toLocaleString()} ر.س
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {record.companyShare.toLocaleString()} ر.س
                  </td>
                  <td className="px-4 py-4 font-bold text-primary-600">
                    {record.totalContribution.toLocaleString()} ر.س
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusColors[record.status]
                      }`}
                    >
                      {statusLabels[record.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info Card */}
        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <AlertCircle size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-blue-800 mb-2">معلومات مهمة عن التأمينات الاجتماعية</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• يجب سداد الاشتراكات قبل اليوم 15 من الشهر التالي</li>
                <li>• الحد الأدنى للراتب الخاضع للاشتراك هو 1,500 ر.س</li>
                <li>• الحد الأقصى للراتب الخاضع للاشتراك هو 45,000 ر.س</li>
                <li>• تأخير السداد يترتب عليه غرامات تصل إلى 2% شهرياً</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
