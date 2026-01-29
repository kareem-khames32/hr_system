'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Filter,
  Plus,
  Briefcase,
  MapPin,
  Clock,
  Users,
  Eye,
  Edit2,
  Trash2,
  MoreVertical,
  Building2,
  DollarSign,
  Calendar,
  TrendingUp,
  UserPlus,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'

interface JobPosting {
  id: string
  title: string
  department: string
  location: string
  type: 'full-time' | 'part-time' | 'contract' | 'remote'
  experience: string
  salary: { min: number; max: number }
  applicants: number
  newApplicants: number
  status: 'active' | 'paused' | 'closed'
  postedDate: string
  closingDate: string
}

const jobPostings: JobPosting[] = [
  {
    id: '1',
    title: 'مطور واجهات أمامية Senior',
    department: 'تقنية المعلومات',
    location: 'الرياض',
    type: 'full-time',
    experience: '5+ سنوات',
    salary: { min: 18000, max: 25000 },
    applicants: 45,
    newApplicants: 12,
    status: 'active',
    postedDate: '2024-01-15',
    closingDate: '2024-02-15',
  },
  {
    id: '2',
    title: 'مدير مشاريع',
    department: 'إدارة المشاريع',
    location: 'جدة',
    type: 'full-time',
    experience: '7+ سنوات',
    salary: { min: 22000, max: 30000 },
    applicants: 28,
    newApplicants: 5,
    status: 'active',
    postedDate: '2024-01-10',
    closingDate: '2024-02-10',
  },
  {
    id: '3',
    title: 'أخصائي موارد بشرية',
    department: 'الموارد البشرية',
    location: 'الرياض',
    type: 'full-time',
    experience: '3+ سنوات',
    salary: { min: 12000, max: 16000 },
    applicants: 67,
    newApplicants: 8,
    status: 'active',
    postedDate: '2024-01-20',
    closingDate: '2024-02-20',
  },
  {
    id: '4',
    title: 'مصمم UI/UX',
    department: 'تقنية المعلومات',
    location: 'عن بُعد',
    type: 'remote',
    experience: '4+ سنوات',
    salary: { min: 15000, max: 20000 },
    applicants: 89,
    newApplicants: 23,
    status: 'active',
    postedDate: '2024-01-18',
    closingDate: '2024-02-18',
  },
  {
    id: '5',
    title: 'محاسب',
    department: 'المالية',
    location: 'الرياض',
    type: 'full-time',
    experience: '2+ سنوات',
    salary: { min: 10000, max: 14000 },
    applicants: 34,
    newApplicants: 0,
    status: 'paused',
    postedDate: '2024-01-05',
    closingDate: '2024-02-05',
  },
  {
    id: '6',
    title: 'مندوب مبيعات',
    department: 'المبيعات',
    location: 'الدمام',
    type: 'full-time',
    experience: '1+ سنة',
    salary: { min: 8000, max: 12000 },
    applicants: 56,
    newApplicants: 0,
    status: 'closed',
    postedDate: '2023-12-15',
    closingDate: '2024-01-15',
  },
]

const typeLabels = {
  'full-time': 'دوام كامل',
  'part-time': 'دوام جزئي',
  'contract': 'عقد مؤقت',
  'remote': 'عن بُعد',
}

const typeColors = {
  'full-time': 'bg-blue-100 text-blue-700',
  'part-time': 'bg-purple-100 text-purple-700',
  'contract': 'bg-orange-100 text-orange-700',
  'remote': 'bg-green-100 text-green-700',
}

const statusLabels = {
  active: 'نشط',
  paused: 'متوقف',
  closed: 'مغلق',
}

const statusColors = {
  active: 'bg-success-50 text-success-700',
  paused: 'bg-warning-50 text-warning-700',
  closed: 'bg-gray-100 text-gray-700',
}

export default function RecruitmentPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDepartment, setFilterDepartment] = useState('all')

  const filteredJobs = jobPostings.filter((job) => {
    const matchesSearch = job.title.includes(searchTerm) || job.department.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || job.status === filterStatus
    const matchesDepartment = filterDepartment === 'all' || job.department === filterDepartment
    return matchesSearch && matchesStatus && matchesDepartment
  })

  const stats = {
    activeJobs: jobPostings.filter((j) => j.status === 'active').length,
    totalApplicants: jobPostings.reduce((sum, j) => sum + j.applicants, 0),
    newApplicants: jobPostings.reduce((sum, j) => sum + j.newApplicants, 0),
    hiredThisMonth: 8,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إدارة التوظيف</h1>
            <p className="text-gray-500 mt-1">إدارة الوظائف الشاغرة وطلبات التوظيف</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/recruitment/applicants" className="btn-secondary flex items-center gap-2">
              <Users size={18} />
              المتقدمين
            </Link>
            <Link href="/recruitment/add" className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              إضافة وظيفة
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Briefcase size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">وظائف نشطة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.activeJobs}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي المتقدمين</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalApplicants}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <UserPlus size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">متقدمين جدد</p>
              <p className="text-2xl font-bold text-gray-800">{stats.newApplicants}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">تم توظيفهم هذا الشهر</p>
              <p className="text-2xl font-bold text-gray-800">{stats.hiredThisMonth}</p>
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
                placeholder="بحث عن وظيفة..."
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
              <option value="active">نشط</option>
              <option value="paused">متوقف</option>
              <option value="closed">مغلق</option>
            </select>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل الأقسام</option>
              <option value="تقنية المعلومات">تقنية المعلومات</option>
              <option value="الموارد البشرية">الموارد البشرية</option>
              <option value="المبيعات">المبيعات</option>
              <option value="المالية">المالية</option>
              <option value="إدارة المشاريع">إدارة المشاريع</option>
            </select>
          </div>
        </div>

        {/* Job Listings */}
        <div className="grid gap-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-800">{job.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[job.status]}`}>
                      {statusLabels[job.status]}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeColors[job.type]}`}>
                      {typeLabels[job.type]}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Building2 size={16} />
                      <span>{job.department}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={16} />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      <span>{job.experience}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign size={16} />
                      <span>{job.salary.min.toLocaleString()} - {job.salary.max.toLocaleString()} ر.س</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users size={16} />
                        <span className="font-medium">{job.applicants}</span>
                        <span className="text-gray-400">متقدم</span>
                      </div>
                      {job.newApplicants > 0 && (
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                          +{job.newApplicants} جديد
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <Calendar size={14} />
                      <span>نُشرت: {new Date(job.postedDate).toLocaleDateString('ar-SA')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <Clock size={14} />
                      <span>تنتهي: {new Date(job.closingDate).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/recruitment/applicants?job=${job.id}`}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    title="عرض المتقدمين"
                  >
                    <Users size={18} className="text-gray-600" />
                  </Link>
                  <Link
                    href={`/recruitment/${job.id}`}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    title="عرض التفاصيل"
                  >
                    <Eye size={18} className="text-gray-600" />
                  </Link>
                  <button
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    title="تعديل"
                  >
                    <Edit2 size={18} className="text-gray-600" />
                  </button>
                  <button
                    className="p-2 bg-gray-100 rounded-lg hover:bg-red-100 transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={18} className="text-gray-600 hover:text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Hiring Pipeline Summary */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">ملخص مراحل التوظيف</h2>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <FileText size={20} className="text-gray-600" />
              </div>
              <p className="text-2xl font-bold text-gray-800">319</p>
              <p className="text-sm text-gray-500">طلبات جديدة</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <Eye size={20} className="text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-800">156</p>
              <p className="text-sm text-blue-600">قيد المراجعة</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users size={20} className="text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-800">48</p>
              <p className="text-sm text-purple-600">مقابلات</p>
            </div>
            <div className="text-center p-4 bg-success-50 rounded-xl">
              <div className="w-12 h-12 bg-success-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={20} className="text-success-600" />
              </div>
              <p className="text-2xl font-bold text-success-800">23</p>
              <p className="text-sm text-success-600">عروض مقدمة</p>
            </div>
            <div className="text-center p-4 bg-primary-50 rounded-xl">
              <div className="w-12 h-12 bg-primary-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <UserPlus size={20} className="text-primary-600" />
              </div>
              <p className="text-2xl font-bold text-primary-800">8</p>
              <p className="text-sm text-primary-600">تم التوظيف</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
