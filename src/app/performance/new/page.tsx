'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import {
  ArrowRight,
  User,
  Calendar,
  Star,
  Target,
  MessageSquare,
  Save,
  Send,
  Plus,
  Trash2,
} from 'lucide-react'

const employees = [
  { id: 'EMP001', name: 'أحمد محمد علي', department: 'تقنية المعلومات', position: 'مطور برمجيات أول' },
  { id: 'EMP002', name: 'سارة أحمد الخالدي', department: 'تقنية المعلومات', position: 'محلل نظم' },
  { id: 'EMP003', name: 'عمر سالم الحربي', department: 'المالية', position: 'محاسب أول' },
  { id: 'EMP004', name: 'نورة محمد الدوسري', department: 'الموارد البشرية', position: 'أخصائي توظيف' },
]

const reviewCycles = [
  { id: '1', name: 'الربع الأول 2024', period: 'يناير - مارس 2024' },
  { id: '2', name: 'الربع الرابع 2023', period: 'أكتوبر - ديسمبر 2023' },
  { id: '3', name: 'السنوي 2023', period: 'يناير - ديسمبر 2023' },
]

const defaultCategories = [
  { id: '1', name: 'الإنتاجية', weight: 25, score: 0 },
  { id: '2', name: 'جودة العمل', weight: 25, score: 0 },
  { id: '3', name: 'العمل الجماعي', weight: 20, score: 0 },
  { id: '4', name: 'المبادرة', weight: 15, score: 0 },
  { id: '5', name: 'الالتزام', weight: 15, score: 0 },
]

export default function NewPerformanceReviewPage() {
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedCycle, setSelectedCycle] = useState('')
  const [categories, setCategories] = useState(defaultCategories)
  const [goals, setGoals] = useState([{ id: '1', title: '', progress: 0 }])
  const [strengths, setStrengths] = useState([''])
  const [improvements, setImprovements] = useState([''])
  const [managerComments, setManagerComments] = useState('')

  const updateCategoryScore = (id: string, score: number) => {
    setCategories(categories.map((c) => (c.id === id ? { ...c, score } : c)))
  }

  const addGoal = () => {
    setGoals([...goals, { id: Date.now().toString(), title: '', progress: 0 }])
  }

  const removeGoal = (id: string) => {
    setGoals(goals.filter((g) => g.id !== id))
  }

  const updateGoal = (id: string, field: string, value: string | number) => {
    setGoals(goals.map((g) => (g.id === id ? { ...g, [field]: value } : g)))
  }

  const calculateOverallScore = () => {
    const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0)
    const weightedSum = categories.reduce((sum, c) => sum + c.score * c.weight, 0)
    return totalWeight > 0 ? (weightedSum / totalWeight).toFixed(1) : '0.0'
  }

  const selectedEmployeeData = employees.find((e) => e.id === selectedEmployee)

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
              <h1 className="text-2xl font-bold text-gray-800">تقييم أداء جديد</h1>
              <p className="text-gray-500">إنشاء تقييم أداء جديد لموظف</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="col-span-2 space-y-6">
            {/* Employee Selection */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <User size={20} className="text-primary-500" />
                معلومات التقييم
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الموظف
                  </label>
                  <select
                    className="input w-full"
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                  >
                    <option value="">اختر الموظف</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} - {emp.position}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    دورة التقييم
                  </label>
                  <select
                    className="input w-full"
                    value={selectedCycle}
                    onChange={(e) => setSelectedCycle(e.target.value)}
                  >
                    <option value="">اختر الدورة</option>
                    {reviewCycles.map((cycle) => (
                      <option key={cycle.id} value={cycle.id}>
                        {cycle.name} ({cycle.period})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {selectedEmployeeData && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">القسم: {selectedEmployeeData.department}</p>
                  <p className="text-sm text-gray-500">المسمى الوظيفي: {selectedEmployeeData.position}</p>
                </div>
              )}
            </div>

            {/* Rating Categories */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Star size={20} className="text-primary-500" />
                التقييم حسب المعايير
              </h3>
              <div className="space-y-4">
                {categories.map((category) => (
                  <div key={category.id} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-800">{category.name}</span>
                      <span className="text-sm text-gray-500">الوزن: {category.weight}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          onClick={() => updateCategoryScore(category.id, score)}
                          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                            category.score === score
                              ? 'bg-primary-500 text-white'
                              : 'bg-white text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Goals */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Target size={20} className="text-primary-500" />
                  الأهداف
                </h3>
                <button
                  onClick={addGoal}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                >
                  <Plus size={16} />
                  إضافة هدف
                </button>
              </div>
              <div className="space-y-4">
                {goals.map((goal, index) => (
                  <div key={goal.id} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="text"
                        className="input flex-1"
                        placeholder={`الهدف ${index + 1}`}
                        value={goal.title}
                        onChange={(e) => updateGoal(goal.id, 'title', e.target.value)}
                      />
                      {goals.length > 1 && (
                        <button
                          onClick={() => removeGoal(goal.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">نسبة الإنجاز:</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={goal.progress}
                        onChange={(e) => updateGoal(goal.id, 'progress', parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium text-gray-700 w-12">{goal.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-2 gap-6">
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-4">نقاط القوة</h3>
                <div className="space-y-2">
                  {strengths.map((strength, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        className="input flex-1"
                        placeholder={`نقطة قوة ${index + 1}`}
                        value={strength}
                        onChange={(e) => {
                          const newStrengths = [...strengths]
                          newStrengths[index] = e.target.value
                          setStrengths(newStrengths)
                        }}
                      />
                      {strengths.length > 1 && (
                        <button
                          onClick={() => setStrengths(strengths.filter((_, i) => i !== index))}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setStrengths([...strengths, ''])}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus size={16} />
                    إضافة نقطة قوة
                  </button>
                </div>
              </div>

              <div className="card">
                <h3 className="font-bold text-gray-800 mb-4">فرص التحسين</h3>
                <div className="space-y-2">
                  {improvements.map((improvement, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        className="input flex-1"
                        placeholder={`فرصة تحسين ${index + 1}`}
                        value={improvement}
                        onChange={(e) => {
                          const newImprovements = [...improvements]
                          newImprovements[index] = e.target.value
                          setImprovements(newImprovements)
                        }}
                      />
                      {improvements.length > 1 && (
                        <button
                          onClick={() => setImprovements(improvements.filter((_, i) => i !== index))}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setImprovements([...improvements, ''])}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus size={16} />
                    إضافة فرصة تحسين
                  </button>
                </div>
              </div>
            </div>

            {/* Manager Comments */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MessageSquare size={20} className="text-primary-500" />
                تعليقات المدير
              </h3>
              <textarea
                className="input w-full"
                rows={4}
                placeholder="أضف تعليقاتك وملاحظاتك حول أداء الموظف..."
                value={managerComments}
                onChange={(e) => setManagerComments(e.target.value)}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="card bg-primary-50">
              <h3 className="font-bold text-gray-800 mb-4 text-center">التقييم الإجمالي</h3>
              <div className="text-center">
                <p className="text-6xl font-bold text-primary-600">{calculateOverallScore()}</p>
                <p className="text-gray-600 mt-2">من 5</p>
              </div>
            </div>

            {/* Score Distribution */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">توزيع الدرجات</h3>
              <div className="space-y-3">
                {categories.map((category) => (
                  <div key={category.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">{category.name}</span>
                      <span className="font-medium text-gray-800">{category.score}/5</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${(category.score / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">الإجراءات</h3>
              <div className="space-y-3">
                <button className="w-full btn-secondary flex items-center justify-center gap-2">
                  <Save size={18} />
                  حفظ كمسودة
                </button>
                <button className="w-full btn-primary flex items-center justify-center gap-2">
                  <Send size={18} />
                  إرسال التقييم
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
