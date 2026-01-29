'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  FileText,
  DollarSign,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Eye,
  Edit2,
  Download,
  Mail,
  Phone,
  Briefcase,
  Building2,
} from 'lucide-react'

interface JobOffer {
  id: string
  candidateName: string
  candidateEmail: string
  candidatePhone: string
  position: string
  department: string
  salary: number
  startDate: string
  offerDate: string
  expiryDate: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'negotiating'
  benefits: string[]
}

const jobOffers: JobOffer[] = [
  {
    id: '1',
    candidateName: 'محمد أحمد الشمري',
    candidateEmail: 'mohammed@email.com',
    candidatePhone: '0501234567',
    position: 'مطور واجهات أمامية',
    department: 'تقنية المعلومات',
    salary: 18000,
    startDate: '2024-02-01',
    offerDate: '2024-01-15',
    expiryDate: '2024-01-25',
    status: 'accepted',
    benefits: ['تأمين طبي', 'بدل سكن', 'بدل مواصلات'],
  },
  {
    id: '2',
    candidateName: 'سارة علي الخالد',
    candidateEmail: 'sara@email.com',
    candidatePhone: '0509876543',
    position: 'محلل بيانات',
    department: 'تقنية المعلومات',
    salary: 15000,
    startDate: '2024-02-15',
    offerDate: '2024-01-18',
    expiryDate: '2024-01-28',
    status: 'sent',
    benefits: ['تأمين طبي', 'بدل سكن'],
  },
  {
    id: '3',
    candidateName: 'أحمد خالد العتيبي',
    candidateEmail: 'ahmed@email.com',
    candidatePhone: '0551122334',
    position: 'مدير مشاريع',
    department: 'إدارة المشاريع',
    salary: 25000,
    startDate: '2024-02-01',
    offerDate: '2024-01-10',
    expiryDate: '2024-01-20',
    status: 'negotiating',
    benefits: ['تأمين طبي', 'بدل سكن', 'بدل مواصلات', 'سيارة'],
  },
  {
    id: '4',
    candidateName: 'نورة محمد السعيد',
    candidateEmail: 'noura@email.com',
    candidatePhone: '0556677889',
    position: 'أخصائي موارد بشرية',
    department: 'الموارد البشرية',
    salary: 12000,
    startDate: '2024-02-01',
    offerDate: '2024-01-05',
    expiryDate: '2024-01-15',
    status: 'rejected',
    benefits: ['تأمين طبي', 'بدل مواصلات'],
  },
  {
    id: '5',
    candidateName: 'فهد عبدالله الدوسري',
    candidateEmail: 'fahad@email.com',
    candidatePhone: '0543216789',
    position: 'مصمم جرافيك',
    department: 'التسويق',
    salary: 10000,
    startDate: '2024-03-01',
    offerDate: '2024-01-20',
    expiryDate: '2024-01-30',
    status: 'draft',
    benefits: ['تأمين طبي'],
  },
]

const statusLabels = {
  draft: 'مسودة',
  sent: 'مرسل',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  expired: 'منتهي',
  negotiating: 'قيد التفاوض',
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-success-50 text-success-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-600',
  negotiating: 'bg-warning-50 text-warning-700',
}

export default function OffersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const filteredOffers = jobOffers.filter((offer) => {
    const matchesSearch =
      offer.candidateName.includes(searchTerm) ||
      offer.position.includes(searchTerm) ||
      offer.candidateEmail.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || offer.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: jobOffers.length,
    sent: jobOffers.filter((o) => o.status === 'sent').length,
    accepted: jobOffers.filter((o) => o.status === 'accepted').length,
    rejected: jobOffers.filter((o) => o.status === 'rejected').length,
    negotiating: jobOffers.filter((o) => o.status === 'negotiating').length,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">عروض العمل</h1>
            <p className="text-gray-500 mt-1">إدارة عروض العمل المقدمة للمرشحين</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إنشاء عرض جديد
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <FileText size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي العروض</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Send size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مرسلة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.sent}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مقبولة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.accepted}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">قيد التفاوض</p>
              <p className="text-2xl font-bold text-gray-800">{stats.negotiating}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
              <XCircle size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مرفوضة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.rejected}</p>
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
                placeholder="بحث عن مرشح أو وظيفة..."
                className="input pr-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل الحالات</option>
              <option value="draft">مسودة</option>
              <option value="sent">مرسل</option>
              <option value="accepted">مقبول</option>
              <option value="rejected">مرفوض</option>
              <option value="negotiating">قيد التفاوض</option>
            </select>
          </div>
        </div>

        {/* Offers List */}
        <div className="space-y-4">
          {filteredOffers.map((offer) => (
            <div key={offer.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-600 font-bold text-xl">
                    {offer.candidateName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{offer.candidateName}</h3>
                    <p className="text-primary-600 font-medium">{offer.position}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Building2 size={14} />
                        {offer.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail size={14} />
                        {offer.candidateEmail}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone size={14} />
                        {offer.candidatePhone}
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  className={`px-4 py-1.5 rounded-full text-sm font-medium ${statusColors[offer.status]}`}
                >
                  {statusLabels[offer.status]}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-100">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <DollarSign size={16} />
                    الراتب المعروض
                  </div>
                  <p className="font-bold text-gray-800">{offer.salary.toLocaleString()} ر.س</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Calendar size={16} />
                    تاريخ البدء
                  </div>
                  <p className="font-bold text-gray-800">
                    {new Date(offer.startDate).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <FileText size={16} />
                    تاريخ العرض
                  </div>
                  <p className="font-bold text-gray-800">
                    {new Date(offer.offerDate).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Clock size={16} />
                    صالح حتى
                  </div>
                  <p className="font-bold text-gray-800">
                    {new Date(offer.expiryDate).toLocaleDateString('ar-SA')}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">المزايا المقدمة:</p>
                <div className="flex flex-wrap gap-2">
                  {offer.benefits.map((benefit, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-success-50 text-success-700 rounded-full text-sm"
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                <button className="btn-secondary flex items-center gap-2">
                  <Eye size={16} />
                  عرض
                </button>
                <button className="btn-secondary flex items-center gap-2">
                  <Edit2 size={16} />
                  تعديل
                </button>
                <button className="btn-secondary flex items-center gap-2">
                  <Download size={16} />
                  تحميل PDF
                </button>
                {offer.status === 'draft' && (
                  <button className="btn-primary flex items-center gap-2">
                    <Send size={16} />
                    إرسال العرض
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}
