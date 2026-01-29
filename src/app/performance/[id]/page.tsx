'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import {
  ArrowRight,
  User,
  Calendar,
  Target,
  Star,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  Clock,
  Award,
  FileText,
  Edit2,
  Download,
  Building2,
  Briefcase,
} from 'lucide-react'

const reviewData = {
  id: '1',
  employeeName: 'أحمد محمد علي',
  employeeId: 'EMP001',
  position: 'مطور برمجيات أول',
  department: 'تقنية المعلومات',
  manager: 'محمد أحمد الشمري',
  reviewPeriod: 'الربع الرابع 2023',
  reviewDate: '2024-01-15',
  status: 'completed',
  overallScore: 4.2,

  categories: [
    { name: 'الإنتاجية', score: 4.5, weight: 25 },
    { name: 'جودة العمل', score: 4.0, weight: 25 },
    { name: 'العمل الجماعي', score: 4.3, weight: 20 },
    { name: 'المبادرة', score: 4.0, weight: 15 },
    { name: 'الالتزام', score: 4.5, weight: 15 },
  ],

  goals: [
    { id: '1', title: 'إنهاء مشروع المنصة الجديدة', status: 'completed', progress: 100 },
    { id: '2', title: 'تحسين أداء النظام بنسبة 30%', status: 'completed', progress: 100 },
    { id: '3', title: 'تدريب الفريق على التقنيات الجديدة', status: 'in_progress', progress: 75 },
    { id: '4', title: 'توثيق جميع العمليات التقنية', status: 'in_progress', progress: 60 },
  ],

  strengths: [
    'مهارات تقنية عالية',
    'القدرة على حل المشكلات المعقدة',
    'التزام بالمواعيد النهائية',
    'تعاون ممتاز مع الفريق',
  ],

  improvements: [
    'تحسين مهارات التواصل مع الأقسام الأخرى',
    'المشاركة أكثر في الاجتماعات',
    'تطوير مهارات القيادة',
  ],

  managerComments: 'أحمد موظف متميز وملتزم. أظهر تحسناً ملحوظاً في الأداء خلال هذا الربع. يحتاج للعمل على مهارات التواصل مع الأقسام الأخرى.',
  employeeComments: 'أشكر الإدارة على الدعم المستمر. سأعمل على تحسين نقاط الضعف المذكورة.',
}

const getScoreColor = (score: number) => {
  if (score >= 4.5) return 'text-success-600'
  if (score >= 3.5) return 'text-blue-600'
  if (score >= 2.5) return 'text-warning-600'
  return 'text-red-600'
}

const getScoreBgColor = (score: number) => {
  if (score >= 4.5) return 'bg-success-50'
  if (score >= 3.5) return 'bg-blue-50'
  if (score >= 2.5) return 'bg-warning-50'
  return 'bg-red-50'
}

const getScoreLabel = (score: number) => {
  if (score >= 4.5) return 'ممتاز'
  if (score >= 3.5) return 'جيد جداً'
  if (score >= 2.5) return 'جيد'
  if (score >= 1.5) return 'مقبول'
  return 'ضعيف'
}

export default function PerformanceDetailsPage() {
  const params = useParams()

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/performance"
              className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <ArrowRight size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">تقييم الأداء</h1>
              <p className="text-gray-500">{reviewData.reviewPeriod}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير PDF
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Edit2 size={18} />
              تعديل التقييم
            </button>
          </div>
        </div>

        {/* Employee Info */}
        <div className="card">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-600 font-bold text-2xl">
                {reviewData.employeeName.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{reviewData.employeeName}</h2>
                <p className="text-primary-600 font-medium">{reviewData.position}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Building2 size={14} />
                    {reviewData.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <User size={14} />
                    المدير: {reviewData.manager}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(reviewData.reviewDate).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              </div>
            </div>
            <div className={`text-center p-4 rounded-2xl ${getScoreBgColor(reviewData.overallScore)}`}>
              <p className={`text-4xl font-bold ${getScoreColor(reviewData.overallScore)}`}>
                {reviewData.overallScore}
              </p>
              <p className="text-sm text-gray-600 mt-1">من 5</p>
              <p className={`text-sm font-medium mt-1 ${getScoreColor(reviewData.overallScore)}`}>
                {getScoreLabel(reviewData.overallScore)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Categories Scores */}
          <div className="col-span-2 space-y-6">
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Star size={20} className="text-primary-500" />
                التقييم حسب المعايير
              </h3>
              <div className="space-y-4">
                {reviewData.categories.map((category) => (
                  <div key={category.name}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700">{category.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">الوزن: {category.weight}%</span>
                        <span className={`font-bold ${getScoreColor(category.score)}`}>
                          {category.score}/5
                        </span>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          category.score >= 4.5
                            ? 'bg-success-500'
                            : category.score >= 3.5
                            ? 'bg-blue-500'
                            : category.score >= 2.5
                            ? 'bg-warning-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${(category.score / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Goals */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Target size={20} className="text-primary-500" />
                الأهداف
              </h3>
              <div className="space-y-3">
                {reviewData.goals.map((goal) => (
                  <div key={goal.id} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800">{goal.title}</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          goal.status === 'completed'
                            ? 'bg-success-50 text-success-700'
                            : 'bg-warning-50 text-warning-700'
                        }`}
                      >
                        {goal.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            goal.progress === 100 ? 'bg-success-500' : 'bg-primary-500'
                          }`}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600">{goal.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MessageSquare size={20} className="text-primary-500" />
                التعليقات
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm font-medium text-blue-800 mb-2">تعليق المدير</p>
                  <p className="text-gray-700">{reviewData.managerComments}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-800 mb-2">تعليق الموظف</p>
                  <p className="text-gray-700">{reviewData.employeeComments}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Strengths */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-success-500" />
                نقاط القوة
              </h3>
              <div className="space-y-2">
                {reviewData.strengths.map((strength, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-success-50 rounded-xl">
                    <CheckCircle2 size={18} className="text-success-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{strength}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Areas for Improvement */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Award size={20} className="text-warning-500" />
                فرص التحسين
              </h3>
              <div className="space-y-2">
                {reviewData.improvements.map((improvement, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-warning-50 rounded-xl">
                    <Clock size={18} className="text-warning-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{improvement}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Legend */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">مقياس التقييم</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-success-50 rounded-lg">
                  <span className="text-sm text-gray-700">ممتاز</span>
                  <span className="text-sm font-medium text-success-700">4.5 - 5.0</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                  <span className="text-sm text-gray-700">جيد جداً</span>
                  <span className="text-sm font-medium text-blue-700">3.5 - 4.4</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-warning-50 rounded-lg">
                  <span className="text-sm text-gray-700">جيد</span>
                  <span className="text-sm font-medium text-warning-700">2.5 - 3.4</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <span className="text-sm text-gray-700">يحتاج تحسين</span>
                  <span className="text-sm font-medium text-red-700">أقل من 2.5</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
