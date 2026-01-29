'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Star,
  Eye,
  MessageSquare,
  UserCheck,
  UserX,
  Clock,
  FileText,
  ChevronDown,
  MoreVertical,
  GraduationCap,
  Building2,
} from 'lucide-react'
import Link from 'next/link'

interface Applicant {
  id: string
  name: string
  avatar: string
  email: string
  phone: string
  location: string
  appliedFor: string
  appliedDate: string
  experience: string
  education: string
  currentCompany: string
  currentPosition: string
  expectedSalary: number
  status: 'new' | 'reviewing' | 'interview' | 'offer' | 'hired' | 'rejected'
  rating: number
  notes: string
  resumeUrl: string
}

const applicants: Applicant[] = [
  {
    id: '1',
    name: 'عبدالله محمد السعيد',
    avatar: 'ع',
    email: 'abdullah.m@email.com',
    phone: '+966 55 123 4567',
    location: 'الرياض',
    appliedFor: 'مطور واجهات أمامية Senior',
    appliedDate: '2024-01-20',
    experience: '6 سنوات',
    education: 'بكالوريوس علوم حاسب',
    currentCompany: 'شركة التقنية المتقدمة',
    currentPosition: 'مطور واجهات أمامية',
    expectedSalary: 22000,
    status: 'interview',
    rating: 4,
    notes: 'مرشح ممتاز، خبرة قوية في React',
    resumeUrl: '#',
  },
  {
    id: '2',
    name: 'سارة أحمد العتيبي',
    avatar: 'س',
    email: 'sara.a@email.com',
    phone: '+966 50 234 5678',
    location: 'جدة',
    appliedFor: 'مصمم UI/UX',
    appliedDate: '2024-01-19',
    experience: '4 سنوات',
    education: 'بكالوريوس تصميم جرافيك',
    currentCompany: 'وكالة الإبداع',
    currentPosition: 'مصممة UI',
    expectedSalary: 18000,
    status: 'reviewing',
    rating: 5,
    notes: 'محفظة أعمال مميزة جداً',
    resumeUrl: '#',
  },
  {
    id: '3',
    name: 'محمد خالد الحربي',
    avatar: 'م',
    email: 'mohammed.k@email.com',
    phone: '+966 54 345 6789',
    location: 'الرياض',
    appliedFor: 'مدير مشاريع',
    appliedDate: '2024-01-18',
    experience: '8 سنوات',
    education: 'ماجستير إدارة أعمال',
    currentCompany: 'شركة البناء الحديث',
    currentPosition: 'مدير مشاريع',
    expectedSalary: 28000,
    status: 'offer',
    rating: 5,
    notes: 'شهادة PMP، خبرة واسعة',
    resumeUrl: '#',
  },
  {
    id: '4',
    name: 'نورة سعد الدوسري',
    avatar: 'ن',
    email: 'noura.s@email.com',
    phone: '+966 56 456 7890',
    location: 'الرياض',
    appliedFor: 'أخصائي موارد بشرية',
    appliedDate: '2024-01-17',
    experience: '3 سنوات',
    education: 'بكالوريوس إدارة موارد بشرية',
    currentCompany: 'مجموعة الخليج',
    currentPosition: 'أخصائي توظيف',
    expectedSalary: 14000,
    status: 'new',
    rating: 0,
    notes: '',
    resumeUrl: '#',
  },
  {
    id: '5',
    name: 'فهد عبدالرحمن',
    avatar: 'ف',
    email: 'fahad.a@email.com',
    phone: '+966 55 567 8901',
    location: 'الدمام',
    appliedFor: 'مطور واجهات أمامية Senior',
    appliedDate: '2024-01-16',
    experience: '5 سنوات',
    education: 'بكالوريوس هندسة برمجيات',
    currentCompany: 'شركة الحلول الذكية',
    currentPosition: 'مطور Full Stack',
    expectedSalary: 20000,
    status: 'rejected',
    rating: 2,
    notes: 'خبرة غير كافية في React',
    resumeUrl: '#',
  },
  {
    id: '6',
    name: 'ريم محمد الشمري',
    avatar: 'ر',
    email: 'reem.m@email.com',
    phone: '+966 50 678 9012',
    location: 'الرياض',
    appliedFor: 'مصمم UI/UX',
    appliedDate: '2024-01-15',
    experience: '5 سنوات',
    education: 'بكالوريوس تصميم تفاعلي',
    currentCompany: 'استوديو الفن',
    currentPosition: 'Lead Designer',
    expectedSalary: 19000,
    status: 'hired',
    rating: 5,
    notes: 'تم التوظيف بتاريخ 25/01/2024',
    resumeUrl: '#',
  },
]

const statusLabels = {
  new: 'جديد',
  reviewing: 'قيد المراجعة',
  interview: 'مقابلة',
  offer: 'عرض وظيفي',
  hired: 'تم التوظيف',
  rejected: 'مرفوض',
}

const statusColors = {
  new: 'bg-gray-100 text-gray-700',
  reviewing: 'bg-blue-100 text-blue-700',
  interview: 'bg-purple-100 text-purple-700',
  offer: 'bg-warning-50 text-warning-700',
  hired: 'bg-success-50 text-success-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function ApplicantsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterJob, setFilterJob] = useState('all')
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)

  const filteredApplicants = applicants.filter((applicant) => {
    const matchesSearch =
      applicant.name.includes(searchTerm) ||
      applicant.email.includes(searchTerm) ||
      applicant.appliedFor.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || applicant.status === filterStatus
    const matchesJob = filterJob === 'all' || applicant.appliedFor === filterJob
    return matchesSearch && matchesStatus && matchesJob
  })

  const uniqueJobs = [...new Set(applicants.map((a) => a.appliedFor))]

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">المتقدمين للوظائف</h1>
            <p className="text-gray-500 mt-1">إدارة ومتابعة طلبات التوظيف</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-6 gap-4">
          {Object.entries(statusLabels).map(([key, label]) => {
            const count = applicants.filter((a) => a.status === key).length
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`card text-center hover:shadow-lg transition-all ${
                  filterStatus === key ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                <p className="text-2xl font-bold text-gray-800">{count}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث عن متقدم..."
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
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={filterJob}
              onChange={(e) => setFilterJob(e.target.value)}
              className="input w-56"
            >
              <option value="all">كل الوظائف</option>
              {uniqueJobs.map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Applicants Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredApplicants.map((applicant) => (
            <div
              key={applicant.id}
              className={`card hover:shadow-lg transition-all cursor-pointer ${
                selectedApplicant?.id === applicant.id ? 'ring-2 ring-primary-500' : ''
              }`}
              onClick={() => setSelectedApplicant(applicant)}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {applicant.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-800">{applicant.name}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusColors[applicant.status]
                      }`}
                    >
                      {statusLabels[applicant.status]}
                    </span>
                  </div>
                  <p className="text-sm text-primary-600 mb-2">{applicant.appliedFor}</p>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Briefcase size={14} />
                      <span>{applicant.experience}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      <span>{applicant.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 size={14} />
                      <span className="truncate">{applicant.currentCompany}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{new Date(applicant.appliedDate).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>

                  {applicant.rating > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={
                            i < applicant.rating
                              ? 'text-warning-500 fill-warning-500'
                              : 'text-gray-300'
                          }
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-sm text-gray-500">
                      الراتب المتوقع:{' '}
                      <span className="font-medium text-gray-700">
                        {applicant.expectedSalary.toLocaleString()} ر.س
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        <FileText size={16} className="text-gray-600" />
                      </button>
                      <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        <Mail size={16} className="text-gray-600" />
                      </button>
                      <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        <Phone size={16} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Applicant Details Panel */}
        {selectedApplicant && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">تفاصيل المتقدم</h2>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Profile Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
                    {selectedApplicant.avatar}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{selectedApplicant.name}</h3>
                    <p className="text-primary-600">{selectedApplicant.currentPosition}</p>
                    <p className="text-sm text-gray-500">{selectedApplicant.currentCompany}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail size={16} className="text-gray-400" />
                    <span>{selectedApplicant.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={16} className="text-gray-400" />
                    <span dir="ltr">{selectedApplicant.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin size={16} className="text-gray-400" />
                    <span>{selectedApplicant.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <GraduationCap size={16} className="text-gray-400" />
                    <span>{selectedApplicant.education}</span>
                  </div>
                </div>
              </div>

              {/* Application Info */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">معلومات الطلب</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">الوظيفة:</span>
                    <span className="font-medium text-gray-800">{selectedApplicant.appliedFor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">تاريخ التقديم:</span>
                    <span className="font-medium text-gray-800">
                      {new Date(selectedApplicant.appliedDate).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">سنوات الخبرة:</span>
                    <span className="font-medium text-gray-800">{selectedApplicant.experience}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">الراتب المتوقع:</span>
                    <span className="font-medium text-gray-800">
                      {selectedApplicant.expectedSalary.toLocaleString()} ر.س
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">الحالة:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusColors[selectedApplicant.status]
                      }`}
                    >
                      {statusLabels[selectedApplicant.status]}
                    </span>
                  </div>
                </div>

                {selectedApplicant.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">{selectedApplicant.notes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">الإجراءات</h4>
                <div className="space-y-2">
                  <button className="w-full btn-primary flex items-center justify-center gap-2">
                    <Calendar size={18} />
                    جدولة مقابلة
                  </button>
                  <button className="w-full btn-secondary flex items-center justify-center gap-2">
                    <FileText size={18} />
                    عرض السيرة الذاتية
                  </button>
                  <button className="w-full btn-secondary flex items-center justify-center gap-2">
                    <Mail size={18} />
                    إرسال بريد
                  </button>
                  <button className="w-full btn-secondary flex items-center justify-center gap-2">
                    <MessageSquare size={18} />
                    إضافة ملاحظة
                  </button>
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-2">
                  <button className="w-full py-2 px-4 bg-success-50 text-success-700 rounded-lg hover:bg-success-100 transition-colors flex items-center justify-center gap-2">
                    <UserCheck size={18} />
                    قبول المتقدم
                  </button>
                  <button className="w-full py-2 px-4 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                    <UserX size={18} />
                    رفض المتقدم
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
