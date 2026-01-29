'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import {
  ArrowRight,
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Calendar,
  Share2,
  Edit2,
  Trash2,
  Eye,
  FileText,
  CheckCircle2,
  XCircle,
  Building2,
  GraduationCap,
  Star,
} from 'lucide-react'

const jobDetails = {
  id: '1',
  title: 'مطور واجهات أمامية',
  titleEn: 'Frontend Developer',
  department: 'تقنية المعلومات',
  location: 'الرياض',
  type: 'دوام كامل',
  experience: '3-5 سنوات',
  salary: '15,000 - 20,000 ر.س',
  status: 'active',
  postedDate: '2024-01-01',
  deadline: '2024-02-15',
  applicantsCount: 45,
  viewsCount: 320,
  description: `
نبحث عن مطور واجهات أمامية موهوب للانضمام إلى فريقنا التقني. ستكون مسؤولاً عن تطوير وصيانة تطبيقات الويب باستخدام أحدث التقنيات.

المهام والمسؤوليات:
- تطوير واجهات مستخدم تفاعلية وسريعة الاستجابة
- التعاون مع فريق التصميم لتنفيذ التصاميم بدقة
- تحسين أداء التطبيقات وتجربة المستخدم
- كتابة كود نظيف وقابل للصيانة
- المشاركة في مراجعة الكود وتحسين الممارسات البرمجية
  `,
  requirements: [
    'خبرة 3-5 سنوات في تطوير الواجهات الأمامية',
    'إتقان React.js أو Vue.js أو Angular',
    'معرفة جيدة بـ TypeScript',
    'خبرة في CSS وأطر العمل مثل Tailwind CSS',
    'فهم جيد لمبادئ UI/UX',
    'مهارات تواصل ممتازة',
    'القدرة على العمل ضمن فريق',
  ],
  benefits: [
    'راتب تنافسي',
    'تأمين طبي شامل',
    'بدل سكن ومواصلات',
    'إجازة سنوية 21 يوم',
    'تدريب وتطوير مستمر',
    'بيئة عمل مرنة',
  ],
}

const applicants = [
  { id: '1', name: 'محمد أحمد', status: 'interview', appliedDate: '2024-01-15', experience: '4 سنوات' },
  { id: '2', name: 'سارة علي', status: 'review', appliedDate: '2024-01-18', experience: '3 سنوات' },
  { id: '3', name: 'أحمد خالد', status: 'shortlisted', appliedDate: '2024-01-20', experience: '5 سنوات' },
  { id: '4', name: 'نورة محمد', status: 'new', appliedDate: '2024-01-21', experience: '3 سنوات' },
]

const statusColors = {
  new: 'bg-blue-100 text-blue-700',
  review: 'bg-warning-50 text-warning-700',
  shortlisted: 'bg-purple-100 text-purple-700',
  interview: 'bg-primary-100 text-primary-700',
  offered: 'bg-success-50 text-success-700',
  rejected: 'bg-red-100 text-red-700',
}

const statusLabels = {
  new: 'جديد',
  review: 'قيد المراجعة',
  shortlisted: 'مرشح',
  interview: 'مقابلة',
  offered: 'تم العرض',
  rejected: 'مرفوض',
}

export default function JobDetailsPage() {
  const params = useParams()
  const [activeTab, setActiveTab] = useState<'details' | 'applicants'>('details')

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/recruitment"
              className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <ArrowRight size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{jobDetails.title}</h1>
              <p className="text-gray-500">{jobDetails.titleEn}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Share2 size={18} />
              مشاركة
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <Edit2 size={18} />
              تعديل
            </button>
            <button className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100">
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Quick Info */}
        <div className="card">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2 text-gray-600">
              <Building2 size={18} className="text-primary-500" />
              <span>{jobDetails.department}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin size={18} className="text-primary-500" />
              <span>{jobDetails.location}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock size={18} className="text-primary-500" />
              <span>{jobDetails.type}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <GraduationCap size={18} className="text-primary-500" />
              <span>{jobDetails.experience}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <DollarSign size={18} className="text-primary-500" />
              <span>{jobDetails.salary}</span>
            </div>
            <span className="px-3 py-1 bg-success-50 text-success-700 rounded-full text-sm font-medium">
              نشط
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">المتقدمين</p>
              <p className="text-2xl font-bold text-gray-800">{jobDetails.applicantsCount}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Eye size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">المشاهدات</p>
              <p className="text-2xl font-bold text-gray-800">{jobDetails.viewsCount}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">تاريخ النشر</p>
              <p className="text-lg font-bold text-gray-800">
                {new Date(jobDetails.postedDate).toLocaleDateString('ar-SA')}
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">آخر موعد</p>
              <p className="text-lg font-bold text-gray-800">
                {new Date(jobDetails.deadline).toLocaleDateString('ar-SA')}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card">
          <div className="flex items-center gap-4 border-b border-gray-100 pb-4 mb-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'details'
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              تفاصيل الوظيفة
            </button>
            <button
              onClick={() => setActiveTab('applicants')}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'applicants'
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              المتقدمين ({applicants.length})
            </button>
          </div>

          {activeTab === 'details' ? (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-bold text-gray-800 mb-3">الوصف الوظيفي</h3>
                <div className="text-gray-600 whitespace-pre-line">{jobDetails.description}</div>
              </div>

              {/* Requirements */}
              <div>
                <h3 className="font-bold text-gray-800 mb-3">المتطلبات</h3>
                <ul className="space-y-2">
                  {jobDetails.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 size={18} className="text-success-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Benefits */}
              <div>
                <h3 className="font-bold text-gray-800 mb-3">المزايا</h3>
                <div className="grid grid-cols-2 gap-3">
                  {jobDetails.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-success-50 rounded-xl">
                      <Star size={18} className="text-success-600" />
                      <span className="text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {applicants.map((applicant) => (
                <div
                  key={applicant.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 font-bold">
                      {applicant.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{applicant.name}</h4>
                      <p className="text-sm text-gray-500">
                        {applicant.experience} خبرة • تقدم في{' '}
                        {new Date(applicant.appliedDate).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusColors[applicant.status as keyof typeof statusColors]
                      }`}
                    >
                      {statusLabels[applicant.status as keyof typeof statusLabels]}
                    </span>
                    <Link
                      href={`/recruitment/applicants/${applicant.id}`}
                      className="btn-secondary text-sm py-2"
                    >
                      عرض الملف
                    </Link>
                  </div>
                </div>
              ))}

              <Link
                href="/recruitment/applicants"
                className="block text-center text-primary-600 hover:text-primary-700 font-medium mt-4"
              >
                عرض جميع المتقدمين →
              </Link>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
