'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Briefcase,
  Edit2,
  Camera,
  Lock,
  Bell,
  Shield,
  FileText,
  Award,
  Clock,
} from 'lucide-react'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('info')

  const user = {
    name: 'أحمد محمد علي',
    position: 'مطور برمجيات أول',
    department: 'تقنية المعلومات',
    employeeId: 'EMP001',
    email: 'ahmed.m@company.com',
    phone: '+966 55 123 4567',
    joinDate: '2022-03-01',
    manager: 'سالم العتيبي',
    location: 'الرياض، المقر الرئيسي',
    birthDate: '1990-05-15',
    nationalId: '1234567890',
  }

  const tabs = [
    { id: 'info', label: 'المعلومات الشخصية', icon: User },
    { id: 'security', label: 'الأمان', icon: Shield },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
    { id: 'documents', label: 'المستندات', icon: FileText },
  ]

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="card">
          <div className="flex items-start gap-6">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center text-white text-5xl font-bold shadow-xl">
                أ
              </div>
              <button className="absolute -bottom-2 -left-2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
                <Camera size={18} className="text-gray-600" />
              </button>
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{user.name}</h1>
                  <p className="text-primary-600 font-medium">{user.position}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Building2 size={14} />
                      {user.department}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {user.location}
                    </span>
                  </div>
                </div>
                <button className="btn-primary flex items-center gap-2">
                  <Edit2 size={18} />
                  تعديل الملف
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">الرقم الوظيفي</p>
                  <p className="font-bold text-gray-800">{user.employeeId}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">تاريخ الالتحاق</p>
                  <p className="font-bold text-gray-800">{new Date(user.joinDate).toLocaleDateString('ar-SA')}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">المدير المباشر</p>
                  <p className="font-bold text-gray-800">{user.manager}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">مدة الخدمة</p>
                  <p className="font-bold text-gray-800">سنتين و 10 أشهر</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <User size={20} className="text-primary-600" />
                البيانات الشخصية
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">الاسم الكامل</span>
                  <span className="font-medium text-gray-800">{user.name}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">تاريخ الميلاد</span>
                  <span className="font-medium text-gray-800">{new Date(user.birthDate).toLocaleDateString('ar-SA')}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">رقم الهوية</span>
                  <span className="font-medium text-gray-800">{user.nationalId}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">الجنسية</span>
                  <span className="font-medium text-gray-800">سعودي</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-gray-500">الحالة الاجتماعية</span>
                  <span className="font-medium text-gray-800">متزوج</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Mail size={20} className="text-primary-600" />
                معلومات التواصل
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">البريد الإلكتروني</span>
                  <span className="font-medium text-gray-800">{user.email}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">رقم الجوال</span>
                  <span className="font-medium text-gray-800" dir="ltr">{user.phone}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">رقم الطوارئ</span>
                  <span className="font-medium text-gray-800" dir="ltr">+966 50 987 6543</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-gray-500">العنوان</span>
                  <span className="font-medium text-gray-800">الرياض، حي النرجس</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Briefcase size={20} className="text-primary-600" />
                المعلومات الوظيفية
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">المسمى الوظيفي</span>
                  <span className="font-medium text-gray-800">{user.position}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">القسم</span>
                  <span className="font-medium text-gray-800">{user.department}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">نوع العقد</span>
                  <span className="font-medium text-gray-800">دائم</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-gray-500">موقع العمل</span>
                  <span className="font-medium text-gray-800">{user.location}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Award size={20} className="text-primary-600" />
                الإنجازات والشهادات
              </h2>
              <div className="space-y-3">
                <div className="p-3 bg-success-50 rounded-xl flex items-center gap-3">
                  <Award size={20} className="text-success-600" />
                  <div>
                    <p className="font-medium text-gray-800">موظف الشهر</p>
                    <p className="text-sm text-gray-500">نوفمبر 2023</p>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl flex items-center gap-3">
                  <FileText size={20} className="text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-800">شهادة AWS</p>
                    <p className="text-sm text-gray-500">صالحة حتى 2025</p>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl flex items-center gap-3">
                  <Clock size={20} className="text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-800">5 سنوات خدمة</p>
                    <p className="text-sm text-gray-500">مارس 2027</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="card max-w-2xl">
            <h2 className="text-lg font-bold text-gray-800 mb-6">إعدادات الأمان</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Lock size={20} className="text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-800">كلمة المرور</p>
                    <p className="text-sm text-gray-500">آخر تغيير: 15 ديسمبر 2023</p>
                  </div>
                </div>
                <button className="btn-secondary">تغيير</button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-800">المصادقة الثنائية</p>
                    <p className="text-sm text-success-600">مفعّلة</p>
                  </div>
                </div>
                <button className="btn-secondary">إدارة</button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-800">جلسات تسجيل الدخول</p>
                    <p className="text-sm text-gray-500">3 أجهزة نشطة</p>
                  </div>
                </div>
                <button className="btn-secondary">عرض الكل</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="card max-w-2xl">
            <h2 className="text-lg font-bold text-gray-800 mb-6">إعدادات الإشعارات</h2>
            <div className="space-y-4">
              {[
                { label: 'إشعارات البريد الإلكتروني', description: 'استلام الإشعارات عبر البريد', enabled: true },
                { label: 'إشعارات الموافقات', description: 'عند الحاجة لموافقتك على طلب', enabled: true },
                { label: 'إشعارات الإجازات', description: 'تذكيرات الإجازات والأرصدة', enabled: true },
                { label: 'إشعارات الرواتب', description: 'عند صدور قسيمة الراتب', enabled: true },
                { label: 'إشعارات التدريب', description: 'دورات جديدة ومواعيد نهائية', enabled: false },
                { label: 'إشعارات الأداء', description: 'تذكيرات التقييم والأهداف', enabled: true },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={item.enabled}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-6">المستندات الشخصية</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: 'عقد العمل', date: '2022-03-01', type: 'pdf' },
                { name: 'صورة الهوية', date: '2023-06-15', type: 'image' },
                { name: 'الشهادة الجامعية', date: '2022-03-01', type: 'pdf' },
                { name: 'شهادات الخبرة', date: '2022-03-01', type: 'pdf' },
              ].map((doc, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                  <FileText size={32} className="text-primary-600 mb-2" />
                  <p className="font-medium text-gray-800">{doc.name}</p>
                  <p className="text-sm text-gray-500">{new Date(doc.date).toLocaleDateString('ar-SA')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
