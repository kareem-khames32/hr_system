'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  UserPlus,
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  Laptop,
  FileText,
  KeyRound,
  GraduationCap,
  Users,
  Package,
  AlertTriangle,
} from 'lucide-react'
import { getBranchName } from '@/data/branches'

type TaskOwner = 'hr' | 'it' | 'manager' | 'finance'

interface OnboardingTask {
  id: string
  title: string
  owner: TaskOwner
  dueDate: string
  done: boolean
  icon: typeof FileText
}

interface OnboardingEmployee {
  id: string
  name: string
  position: string
  branchId: string
  startDate: string
  buddy: string
  tasks: OnboardingTask[]
}

const ownerLabels: Record<TaskOwner, string> = {
  hr: 'الموارد البشرية',
  it: 'تقنية المعلومات',
  manager: 'المدير المباشر',
  finance: 'المالية',
}

const ownerColors: Record<TaskOwner, string> = {
  hr: 'bg-primary-50 text-primary-700',
  it: 'bg-blue-50 text-blue-700',
  manager: 'bg-indigo-50 text-indigo-700',
  finance: 'bg-teal-50 text-teal-700',
}

const defaultChecklist = (start: string): OnboardingTask[] => [
  { id: 't1', title: 'استلام المستندات الأصلية والتحقق منها', owner: 'hr', dueDate: start, done: false, icon: FileText },
  { id: 't2', title: 'توقيع العقد وسياسات الشركة', owner: 'hr', dueDate: start, done: false, icon: FileText },
  { id: 't3', title: 'إنشاء البريد الإلكتروني وحسابات الأنظمة', owner: 'it', dueDate: start, done: false, icon: KeyRound },
  { id: 't4', title: 'تسليم العهدة (لابتوب + بطاقة دخول)', owner: 'it', dueDate: start, done: false, icon: Laptop },
  { id: 't5', title: 'إضافة بصمة الموظف على جهاز الفرع', owner: 'hr', dueDate: start, done: false, icon: Package },
  { id: 't6', title: 'فتح ملف الراتب والحساب البنكي', owner: 'finance', dueDate: start, done: false, icon: FileText },
  { id: 't7', title: 'جولة تعريفية وتقديم للفريق', owner: 'manager', dueDate: start, done: false, icon: Users },
  { id: 't8', title: 'التدريب التعريفي الإلزامي', owner: 'hr', dueDate: start, done: false, icon: GraduationCap },
]

const initialOnboarding: OnboardingEmployee[] = [
  {
    id: 'EMP011',
    name: 'ياسمين عادل مصطفى',
    position: 'محاسبة',
    branchId: '1',
    startDate: '2026-07-06',
    buddy: 'خالد عبدالعزيز النمر',
    tasks: defaultChecklist('2026-07-06').map((t, i) => ({ ...t, done: i < 5 })),
  },
  {
    id: 'EMP012',
    name: 'محمود سامي رضوان',
    position: 'مندوب مبيعات',
    branchId: '2',
    startDate: '2026-07-12',
    buddy: 'عمر ياسر الشهري',
    tasks: defaultChecklist('2026-07-12').map((t, i) => ({ ...t, done: i < 1 })),
  },
  {
    id: 'EMP013',
    name: 'هند إبراهيم الشافعي',
    position: 'أخصائية تسويق رقمي',
    branchId: '2',
    startDate: '2026-07-01',
    buddy: 'نورة سعيد الغامدي',
    tasks: defaultChecklist('2026-07-01').map((t) => ({ ...t, done: true })),
  },
]

export default function OnboardingPage() {
  const [list, setList] = useState(initialOnboarding)
  const [expanded, setExpanded] = useState<string | null>('EMP011')

  const progress = (e: OnboardingEmployee) =>
    Math.round((e.tasks.filter((t) => t.done).length / e.tasks.length) * 100)

  const toggleTask = (empId: string, taskId: string) => {
    setList(
      list.map((e) =>
        e.id === empId
          ? {
              ...e,
              tasks: e.tasks.map((t) =>
                t.id === taskId ? { ...t, done: !t.done } : t
              ),
            }
          : e
      )
    )
  }

  const inProgress = list.filter((e) => progress(e) < 100).length
  const overdueTasks = list.reduce(
    (s, e) =>
      s +
      e.tasks.filter((t) => !t.done && t.dueDate < '2026-07-07').length,
    0
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/employees" className="hover:text-primary-600">
            إدارة الموظفين
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">تهيئة الموظفين الجدد</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              تهيئة الموظفين الجدد (Onboarding)
            </h1>
            <p className="text-gray-500 mt-1">
              قائمة مهام لكل موظف جديد — موزّعة على HR وتقنية المعلومات والمدير والمالية
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
              <UserPlus size={24} className="text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">قيد التهيئة</p>
              <p className="text-2xl font-bold text-gray-800">{inProgress}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-success-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">اكتملت تهيئتهم</p>
              <p className="text-2xl font-bold text-success-600">
                {list.length - inProgress}
              </p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مهام متأخرة</p>
              <p className="text-2xl font-bold text-red-600">{overdueTasks}</p>
            </div>
          </div>
        </div>

        {/* Employees */}
        <div className="space-y-4">
          {list.map((emp) => {
            const pct = progress(emp)
            const isOpen = expanded === emp.id
            return (
              <div key={emp.id} className="card overflow-hidden">
                {/* رأس الموظف */}
                <button
                  onClick={() => setExpanded(isOpen ? null : emp.id)}
                  className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                      {emp.name.charAt(0)}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800">{emp.name}</h3>
                        <span className="badge text-xs bg-indigo-100 text-indigo-700">
                          {getBranchName(emp.branchId)}
                        </span>
                        {pct === 100 && (
                          <span className="badge badge-success text-xs">مكتمل ✓</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {emp.position} • مباشرة: <span dir="ltr">{emp.startDate}</span> •
                        المرافق: {emp.buddy}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-40">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-400">
                          {emp.tasks.filter((t) => t.done).length}/{emp.tasks.length} مهام
                        </span>
                        <span
                          className={`font-bold ${
                            pct === 100 ? 'text-success-600' : 'text-gray-600'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct === 100 ? 'bg-success-500' : 'bg-primary-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`text-gray-400 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* قائمة المهام */}
                {isOpen && (
                  <div className="border-t border-gray-100 p-5 bg-gray-50/40">
                    <div className="grid grid-cols-2 gap-3">
                      {emp.tasks.map((task) => {
                        const TaskIcon = task.icon
                        const overdue = !task.done && task.dueDate < '2026-07-07'
                        return (
                          <button
                            key={task.id}
                            onClick={() => toggleTask(emp.id, task.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl border text-right transition-all ${
                              task.done
                                ? 'bg-success-50/50 border-success-100'
                                : overdue
                                ? 'bg-red-50/50 border-red-200'
                                : 'bg-white border-gray-100 hover:border-primary-200'
                            }`}
                          >
                            {task.done ? (
                              <CheckCircle2 size={20} className="text-success-500 shrink-0" />
                            ) : (
                              <Circle size={20} className="text-gray-300 shrink-0" />
                            )}
                            <TaskIcon size={18} className="text-gray-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-medium ${
                                  task.done
                                    ? 'text-gray-400 line-through'
                                    : 'text-gray-700'
                                }`}
                              >
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-lg ${ownerColors[task.owner]}`}
                                >
                                  {ownerLabels[task.owner]}
                                </span>
                                <span
                                  className={`text-xs flex items-center gap-1 ${
                                    overdue ? 'text-red-500 font-medium' : 'text-gray-400'
                                  }`}
                                >
                                  <Clock size={10} />
                                  {task.dueDate}
                                  {overdue && ' — متأخرة!'}
                                </span>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </MainLayout>
  )
}
