'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Download,
  Eye,
  Award,
  Calendar,
  User,
  GraduationCap,
  CheckCircle2,
  Clock,
  Filter,
  FileText,
  Share2,
  Printer,
} from 'lucide-react'

interface Certificate {
  id: string
  employeeId: string
  employeeName: string
  courseName: string
  courseCategory: string
  issueDate: string
  expiryDate?: string
  certificateNumber: string
  score: number
  status: 'valid' | 'expired' | 'revoked'
  instructor: string
  duration: string
}

const certificates: Certificate[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'أحمد محمد علي',
    courseName: 'أساسيات React.js',
    courseCategory: 'البرمجة والتقنية',
    issueDate: '2024-01-15',
    certificateNumber: 'CERT-2024-001',
    score: 92,
    status: 'valid',
    instructor: 'م. محمد العلي',
    duration: '20 ساعة',
  },
  {
    id: '2',
    employeeId: 'EMP002',
    employeeName: 'سارة أحمد الخالدي',
    courseName: 'القيادة الفعالة',
    courseCategory: 'القيادة والإدارة',
    issueDate: '2024-01-10',
    expiryDate: '2025-01-10',
    certificateNumber: 'CERT-2024-002',
    score: 88,
    status: 'valid',
    instructor: 'أ. سارة الخالد',
    duration: '15 ساعة',
  },
  {
    id: '3',
    employeeId: 'EMP003',
    employeeName: 'عمر سالم الحربي',
    courseName: 'إدارة المشاريع الاحترافية',
    courseCategory: 'القيادة والإدارة',
    issueDate: '2023-06-20',
    expiryDate: '2024-06-20',
    certificateNumber: 'CERT-2023-045',
    score: 95,
    status: 'valid',
    instructor: 'د. أحمد محمد',
    duration: '40 ساعة',
  },
  {
    id: '4',
    employeeId: 'EMP004',
    employeeName: 'نورة محمد الدوسري',
    courseName: 'مهارات التواصل',
    courseCategory: 'التواصل والمهارات الشخصية',
    issueDate: '2023-03-15',
    expiryDate: '2024-01-15',
    certificateNumber: 'CERT-2023-022',
    score: 85,
    status: 'expired',
    instructor: 'أ. نورة السعيد',
    duration: '10 ساعات',
  },
  {
    id: '5',
    employeeId: 'EMP001',
    employeeName: 'أحمد محمد علي',
    courseName: 'TypeScript المتقدم',
    courseCategory: 'البرمجة والتقنية',
    issueDate: '2024-01-20',
    certificateNumber: 'CERT-2024-003',
    score: 90,
    status: 'valid',
    instructor: 'م. محمد العلي',
    duration: '25 ساعة',
  },
]

const statusLabels = {
  valid: 'سارية',
  expired: 'منتهية',
  revoked: 'ملغاة',
}

const statusColors = {
  valid: 'bg-success-50 text-success-700',
  expired: 'bg-red-100 text-red-700',
  revoked: 'bg-gray-100 text-gray-600',
}

export default function CertificatesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  const filteredCertificates = certificates.filter((cert) => {
    const matchesSearch =
      cert.employeeName.includes(searchTerm) ||
      cert.courseName.includes(searchTerm) ||
      cert.certificateNumber.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || cert.status === filterStatus
    const matchesCategory = filterCategory === 'all' || cert.courseCategory === filterCategory
    return matchesSearch && matchesStatus && matchesCategory
  })

  const stats = {
    total: certificates.length,
    valid: certificates.filter((c) => c.status === 'valid').length,
    expired: certificates.filter((c) => c.status === 'expired').length,
    thisMonth: certificates.filter((c) => {
      const issueDate = new Date(c.issueDate)
      const now = new Date()
      return issueDate.getMonth() === now.getMonth() && issueDate.getFullYear() === now.getFullYear()
    }).length,
  }

  const categories = [...new Set(certificates.map((c) => c.courseCategory))]

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الشهادات</h1>
            <p className="text-gray-500 mt-1">إدارة شهادات إتمام الدورات التدريبية</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Download size={18} />
            تصدير التقرير
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Award size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الشهادات</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">سارية</p>
              <p className="text-2xl font-bold text-gray-800">{stats.valid}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">منتهية</p>
              <p className="text-2xl font-bold text-gray-800">{stats.expired}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">هذا الشهر</p>
              <p className="text-2xl font-bold text-gray-800">{stats.thisMonth}</p>
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
                placeholder="بحث عن شهادة أو موظف..."
                className="input pr-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-40"
            >
              <option value="all">كل الحالات</option>
              <option value="valid">سارية</option>
              <option value="expired">منتهية</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل التصنيفات</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Certificates Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredCertificates.map((cert) => (
            <div key={cert.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center">
                  <Award size={32} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800">{cert.courseName}</h3>
                      <p className="text-sm text-gray-500">{cert.courseCategory}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[cert.status]}`}
                    >
                      {statusLabels[cert.status]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 font-bold">
                    {cert.employeeName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{cert.employeeName}</p>
                    <p className="text-sm text-gray-500">{cert.employeeId}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">رقم الشهادة</p>
                    <p className="text-sm font-mono text-gray-800">{cert.certificateNumber}</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">الدرجة</p>
                    <p className="text-sm font-bold text-primary-600">{cert.score}%</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">تاريخ الإصدار</p>
                    <p className="text-sm text-gray-800">
                      {new Date(cert.issueDate).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">صالحة حتى</p>
                    <p className="text-sm text-gray-800">
                      {cert.expiryDate
                        ? new Date(cert.expiryDate).toLocaleDateString('ar-SA')
                        : 'غير محددة'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <GraduationCap size={14} />
                  <span>{cert.instructor}</span>
                  <span className="text-gray-300">•</span>
                  <Clock size={14} />
                  <span>{cert.duration}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm py-2">
                    <Eye size={16} />
                    عرض
                  </button>
                  <button className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm py-2">
                    <Download size={16} />
                    تحميل
                  </button>
                  <button className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200">
                    <Printer size={18} className="text-gray-600" />
                  </button>
                  <button className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200">
                    <Share2 size={18} className="text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Verification Info */}
        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <FileText size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-blue-800 mb-2">التحقق من الشهادات</h3>
              <p className="text-sm text-blue-700 mb-3">
                يمكن التحقق من صحة أي شهادة عبر إدخال رقم الشهادة في صفحة التحقق العامة
              </p>
              <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                صفحة التحقق من الشهادات ←
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
