'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Building2,
  Globe,
  Bell,
  Shield,
  Users,
  Database,
  Palette,
  Clock,
  FileText,
  DollarSign,
  Calendar,
  Mail,
  Smartphone,
  Link,
  Key,
  Settings,
  ChevronLeft,
  Save,
  Upload,
} from 'lucide-react'

const settingsSections = [
  { id: 'company', label: 'الشركة', icon: Building2 },
  { id: 'regional', label: 'الإعدادات الإقليمية', icon: Globe },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'users', label: 'المستخدمين', icon: Users },
  { id: 'security', label: 'الأمان', icon: Shield },
  { id: 'attendance', label: 'الحضور', icon: Clock },
  { id: 'leaves', label: 'الإجازات', icon: Calendar },
  { id: 'payroll', label: 'الرواتب', icon: DollarSign },
  { id: 'documents', label: 'المستندات', icon: FileText },
  { id: 'integrations', label: 'التكاملات', icon: Link },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('company')

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الإعدادات</h1>
          <p className="text-gray-500 mt-1">إدارة إعدادات النظام والشركة</p>
        </div>

        {/* Settings Layout */}
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="card p-2 sticky top-24">
              <nav className="space-y-1">
                {settingsSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      activeSection === section.id
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <section.icon size={20} />
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Company Settings */}
            {activeSection === 'company' && (
              <div className="card space-y-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">معلومات الشركة</h2>
                    <p className="text-sm text-gray-500 mt-1">البيانات الأساسية للشركة</p>
                  </div>
                  <button className="btn-primary flex items-center gap-2">
                    <Save size={18} />
                    حفظ التغييرات
                  </button>
                </div>

                {/* Logo */}
                <div className="flex items-start gap-6">
                  <div className="w-32 h-32 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200">
                    <Building2 size={40} className="text-gray-300" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-700">شعار الشركة</h3>
                    <p className="text-sm text-gray-500">PNG, JPG حتى 2MB</p>
                    <button className="btn-secondary text-sm py-2 flex items-center gap-2">
                      <Upload size={16} />
                      رفع شعار
                    </button>
                  </div>
                </div>

                {/* Company Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">اسم الشركة (عربي) *</label>
                    <input type="text" className="input" defaultValue="شركة التقنية المتقدمة" />
                  </div>
                  <div>
                    <label className="label">اسم الشركة (إنجليزي) *</label>
                    <input type="text" className="input" defaultValue="Advanced Tech Company" dir="ltr" />
                  </div>
                  <div>
                    <label className="label">الاسم المختصر</label>
                    <input type="text" className="input" defaultValue="ATC" dir="ltr" />
                  </div>
                  <div>
                    <label className="label">رقم السجل التجاري</label>
                    <input type="text" className="input" defaultValue="1010123456" dir="ltr" />
                  </div>
                  <div>
                    <label className="label">الرقم الضريبي</label>
                    <input type="text" className="input" defaultValue="300123456789012" dir="ltr" />
                  </div>
                  <div>
                    <label className="label">رقم التأمينات</label>
                    <input type="text" className="input" defaultValue="20012345" dir="ltr" />
                  </div>
                </div>

                {/* Address */}
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="font-medium text-gray-700 mb-4">العنوان</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">البلد</label>
                      <select className="input">
                        <option value="SA">المملكة العربية السعودية</option>
                        <option value="AE">الإمارات</option>
                        <option value="EG">مصر</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">المدينة</label>
                      <input type="text" className="input" defaultValue="الرياض" />
                    </div>
                    <div className="col-span-2">
                      <label className="label">العنوان التفصيلي</label>
                      <input type="text" className="input" defaultValue="حي العليا، شارع الملك فهد" />
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="font-medium text-gray-700 mb-4">معلومات الاتصال</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">الهاتف</label>
                      <input type="tel" className="input" defaultValue="+966 11 123 4567" dir="ltr" />
                    </div>
                    <div>
                      <label className="label">البريد الإلكتروني</label>
                      <input type="email" className="input" defaultValue="info@advtech.com.sa" dir="ltr" />
                    </div>
                    <div>
                      <label className="label">الموقع الإلكتروني</label>
                      <input type="url" className="input" defaultValue="https://www.advtech.com.sa" dir="ltr" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Regional Settings */}
            {activeSection === 'regional' && (
              <div className="card space-y-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">الإعدادات الإقليمية</h2>
                    <p className="text-sm text-gray-500 mt-1">اللغة والتنسيقات</p>
                  </div>
                  <button className="btn-primary flex items-center gap-2">
                    <Save size={18} />
                    حفظ
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">اللغة الافتراضية</label>
                    <select className="input">
                      <option value="ar">العربية</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">العملة الافتراضية</label>
                    <select className="input">
                      <option value="SAR">ريال سعودي (SAR)</option>
                      <option value="AED">درهم إماراتي (AED)</option>
                      <option value="EGP">جنيه مصري (EGP)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">المنطقة الزمنية</label>
                    <select className="input">
                      <option value="Asia/Riyadh">الرياض (UTC+3)</option>
                      <option value="Asia/Dubai">دبي (UTC+4)</option>
                      <option value="Africa/Cairo">القاهرة (UTC+2)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">تنسيق التاريخ</label>
                    <select className="input">
                      <option value="YYYY/MM/DD">YYYY/MM/DD</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">نظام التقويم</label>
                    <select className="input">
                      <option value="gregorian">ميلادي</option>
                      <option value="hijri">هجري</option>
                      <option value="both">الاثنين</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">بداية الأسبوع</label>
                    <select className="input">
                      <option value="sunday">الأحد</option>
                      <option value="saturday">السبت</option>
                      <option value="monday">الاثنين</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h3 className="font-medium text-gray-700 mb-4">أيام العطلة الأسبوعية</h3>
                  <div className="flex flex-wrap gap-2">
                    {['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map(
                      (day, index) => (
                        <label
                          key={day}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer ${
                            index === 4 || index === 5
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            defaultChecked={index === 4 || index === 5}
                            className="rounded"
                          />
                          {day}
                        </label>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeSection === 'notifications' && (
              <div className="card space-y-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">إعدادات الإشعارات</h2>
                    <p className="text-sm text-gray-500 mt-1">التحكم في الإشعارات والتنبيهات</p>
                  </div>
                  <button className="btn-primary flex items-center gap-2">
                    <Save size={18} />
                    حفظ
                  </button>
                </div>

                <div className="space-y-6">
                  {[
                    { title: 'طلبات الإجازات', desc: 'إشعار عند تقديم طلب إجازة جديد', email: true, push: true, sms: false },
                    { title: 'الموافقات', desc: 'إشعار عند الموافقة أو الرفض', email: true, push: true, sms: true },
                    { title: 'انتهاء المستندات', desc: 'تنبيه قبل انتهاء صلاحية المستندات', email: true, push: true, sms: false },
                    { title: 'صرف الرواتب', desc: 'إشعار عند صرف الراتب', email: true, push: true, sms: true },
                    { title: 'الحضور', desc: 'تنبيهات الحضور المتأخر والغياب', email: true, push: false, sms: false },
                    { title: 'أعياد الميلاد', desc: 'تذكير بأعياد ميلاد الموظفين', email: false, push: true, sms: false },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-800">{item.title}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked={item.email} className="rounded" />
                          <Mail size={18} className="text-gray-400" />
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked={item.push} className="rounded" />
                          <Bell size={18} className="text-gray-400" />
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked={item.sms} className="rounded" />
                          <Smartphone size={18} className="text-gray-400" />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users Settings */}
            {activeSection === 'users' && (
              <div className="card space-y-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">إدارة المستخدمين</h2>
                    <p className="text-sm text-gray-500 mt-1">المستخدمين والأدوار والصلاحيات</p>
                  </div>
                  <button className="btn-primary flex items-center gap-2">
                    <Users size={18} />
                    إضافة مستخدم
                  </button>
                </div>

                {/* Roles */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-4">الأدوار</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: 'مدير النظام', users: 2, color: 'bg-danger-500' },
                      { name: 'مدير الموارد البشرية', users: 3, color: 'bg-primary-500' },
                      { name: 'مدير', users: 15, color: 'bg-warning-500' },
                      { name: 'موظف', users: 230, color: 'bg-success-500' },
                    ].map((role) => (
                      <div key={role.name} className="p-4 border border-gray-200 rounded-xl hover:border-primary-300 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${role.color}`} />
                            <span className="font-medium text-gray-800">{role.name}</span>
                          </div>
                          <span className="text-sm text-gray-500">{role.users} مستخدم</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Users */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-4">آخر المستخدمين النشطين</h3>
                  <div className="space-y-3">
                    {[
                      { name: 'أحمد محمد', role: 'مدير النظام', lastActive: 'منذ 5 دقائق' },
                      { name: 'سارة أحمد', role: 'مدير الموارد البشرية', lastActive: 'منذ 15 دقيقة' },
                      { name: 'محمد خالد', role: 'مدير', lastActive: 'منذ ساعة' },
                    ].map((user, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 font-bold">
                            {user.name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.role}</p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-400">{user.lastActive}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeSection === 'security' && (
              <div className="card space-y-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">إعدادات الأمان</h2>
                    <p className="text-sm text-gray-500 mt-1">حماية الحسابات والبيانات</p>
                  </div>
                  <button className="btn-primary flex items-center gap-2">
                    <Save size={18} />
                    حفظ
                  </button>
                </div>

                {/* Password Policy */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-4">سياسة كلمة المرور</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">الحد الأدنى للأحرف</label>
                      <input type="number" className="input" defaultValue={8} />
                    </div>
                    <div>
                      <label className="label">انتهاء كلمة المرور (أيام)</label>
                      <input type="number" className="input" defaultValue={90} />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {[
                      'يجب أن تحتوي على حرف كبير',
                      'يجب أن تحتوي على حرف صغير',
                      'يجب أن تحتوي على رقم',
                      'يجب أن تحتوي على رمز خاص',
                    ].map((rule, index) => (
                      <label key={index} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm text-gray-600">{rule}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Two Factor Auth */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                        <Key size={24} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">المصادقة الثنائية (2FA)</p>
                        <p className="text-sm text-gray-500">طبقة حماية إضافية للحسابات</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                </div>

                {/* Session Settings */}
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="font-medium text-gray-700 mb-4">إعدادات الجلسة</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">انتهاء الجلسة (دقائق)</label>
                      <input type="number" className="input" defaultValue={60} />
                    </div>
                    <div>
                      <label className="label">الحد الأقصى للمحاولات الفاشلة</label>
                      <input type="number" className="input" defaultValue={5} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Attendance Settings */}
            {activeSection === 'attendance' && (
              <div className="card space-y-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">إعدادات الحضور</h2>
                    <p className="text-sm text-gray-500 mt-1">قواعد الحضور والانصراف</p>
                  </div>
                  <button className="btn-primary flex items-center gap-2">
                    <Save size={18} />
                    حفظ
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">فترة السماح للدخول (دقائق)</label>
                    <input type="number" className="input" defaultValue={15} />
                  </div>
                  <div>
                    <label className="label">فترة السماح للخروج (دقائق)</label>
                    <input type="number" className="input" defaultValue={15} />
                  </div>
                  <div>
                    <label className="label">الحد الأدنى لساعات العمل</label>
                    <input type="number" className="input" defaultValue={8} />
                  </div>
                  <div>
                    <label className="label">بداية احتساب Overtime (دقائق)</label>
                    <input type="number" className="input" defaultValue={30} />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h3 className="font-medium text-gray-700 mb-4">طرق تسجيل الحضور</h3>
                  <div className="space-y-3">
                    {[
                      { name: 'التعرف على الوجه', enabled: true },
                      { name: 'تحديد الموقع GPS', enabled: true },
                      { name: 'البصمة', enabled: true },
                      { name: 'QR Code', enabled: false },
                      { name: 'إدخال يدوي', enabled: true },
                    ].map((method) => (
                      <div key={method.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-gray-700">{method.name}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked={method.enabled} />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h3 className="font-medium text-gray-700 mb-4">قواعد خصم التأخير</h3>
                  <div className="space-y-3">
                    {[
                      { range: '0 - 15 دقيقة', deduction: 'بدون خصم (فترة سماح)' },
                      { range: '16 - 30 دقيقة', deduction: 'ربع يوم' },
                      { range: '31 - 60 دقيقة', deduction: 'نصف يوم' },
                      { range: 'أكثر من 60 دقيقة', deduction: 'يوم كامل' },
                    ].map((rule, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-gray-700">{rule.range}</span>
                        <span className="text-danger-600 font-medium">{rule.deduction}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Leaves Settings */}
            {activeSection === 'leaves' && (
              <div className="card space-y-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">إعدادات الإجازات</h2>
                    <p className="text-sm text-gray-500 mt-1">أنواع الإجازات وقواعدها</p>
                  </div>
                  <button className="btn-primary flex items-center gap-2">
                    <Save size={18} />
                    حفظ
                  </button>
                </div>

                <div className="space-y-4">
                  {[
                    { name: 'إجازة سنوية', days: 30, color: 'bg-primary-500', paid: true },
                    { name: 'إجازة مرضية', days: 30, color: 'bg-danger-500', paid: true },
                    { name: 'إجازة طارئة', days: 6, color: 'bg-warning-500', paid: true },
                    { name: 'إجازة زواج', days: 5, color: 'bg-pink-500', paid: true },
                    { name: 'إجازة وفاة', days: 5, color: 'bg-gray-500', paid: true },
                    { name: 'إجازة أمومة', days: 70, color: 'bg-purple-500', paid: true },
                    { name: 'إجازة أبوة', days: 3, color: 'bg-cyan-500', paid: true },
                    { name: 'إجازة بدون راتب', days: 0, color: 'bg-gray-400', paid: false },
                  ].map((leave) => (
                    <div key={leave.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${leave.color}`} />
                        <span className="font-medium text-gray-800">{leave.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-primary-600 font-bold">{leave.days} يوم</span>
                        <span className={`text-xs px-2 py-1 rounded-lg ${leave.paid ? 'bg-success-50 text-success-600' : 'bg-gray-100 text-gray-600'}`}>
                          {leave.paid ? 'مدفوعة' : 'غير مدفوعة'}
                        </span>
                        <button className="text-primary-500 hover:text-primary-600 text-sm">تعديل</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payroll Settings */}
            {activeSection === 'payroll' && (
              <div className="card space-y-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">إعدادات الرواتب</h2>
                    <p className="text-sm text-gray-500 mt-1">قواعد حساب الرواتب</p>
                  </div>
                  <button className="btn-primary flex items-center gap-2">
                    <Save size={18} />
                    حفظ
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">دورة الراتب</label>
                    <select className="input">
                      <option value="monthly">شهري</option>
                      <option value="biweekly">نصف شهري</option>
                      <option value="weekly">أسبوعي</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">يوم صرف الراتب</label>
                    <input type="number" className="input" defaultValue={28} min={1} max={31} />
                  </div>
                  <div>
                    <label className="label">طريقة حساب الأيام</label>
                    <select className="input">
                      <option value="30">30 يوم ثابت</option>
                      <option value="actual">أيام الشهر الفعلية</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">نسبة Overtime العادي</label>
                    <select className="input">
                      <option value="1.5">1.5x</option>
                      <option value="2">2x</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h3 className="font-medium text-gray-700 mb-4">التأمينات الاجتماعية (GOSI)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">نسبة الموظف السعودي</label>
                      <input type="text" className="input" defaultValue="9.75%" dir="ltr" />
                    </div>
                    <div>
                      <label className="label">نسبة الشركة (سعودي)</label>
                      <input type="text" className="input" defaultValue="11.75%" dir="ltr" />
                    </div>
                    <div>
                      <label className="label">نسبة الشركة (غير سعودي)</label>
                      <input type="text" className="input" defaultValue="2%" dir="ltr" />
                    </div>
                    <div>
                      <label className="label">الحد الأقصى للراتب الخاضع</label>
                      <input type="number" className="input" defaultValue={45000} dir="ltr" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Documents Settings */}
            {activeSection === 'documents' && (
              <div className="card space-y-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">إعدادات المستندات</h2>
                    <p className="text-sm text-gray-500 mt-1">أنواع المستندات وتنبيهاتها</p>
                  </div>
                </div>

                <div className="text-center py-8">
                  <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 mb-4">لإدارة أنواع المستندات والتحكم فيها بشكل كامل</p>
                  <a href="/settings/documents" className="btn-primary inline-flex items-center gap-2">
                    <Settings size={18} />
                    انتقل لإدارة أنواع المستندات
                    <ChevronLeft size={18} />
                  </a>
                </div>
              </div>
            )}

            {/* Integrations */}
            {activeSection === 'integrations' && (
              <div className="card space-y-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">التكاملات</h2>
                    <p className="text-sm text-gray-500 mt-1">ربط النظام بخدمات خارجية</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: 'GOSI', desc: 'التأمينات الاجتماعية', status: 'connected', color: 'success' },
                    { name: 'مُدد', desc: 'نظام إدارة الأجور', status: 'connected', color: 'success' },
                    { name: 'ZKTeco', desc: 'أجهزة البصمة', status: 'connected', color: 'success' },
                    { name: 'Microsoft 365', desc: 'البريد الإلكتروني', status: 'not_connected', color: 'gray' },
                    { name: 'WhatsApp', desc: 'الإشعارات', status: 'not_connected', color: 'gray' },
                    { name: 'QuickBooks', desc: 'المحاسبة', status: 'not_connected', color: 'gray' },
                  ].map((integration) => (
                    <div key={integration.name} className="p-4 border border-gray-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-800">{integration.name}</p>
                          <p className="text-sm text-gray-500">{integration.desc}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          integration.status === 'connected'
                            ? 'bg-success-50 text-success-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {integration.status === 'connected' ? 'متصل' : 'غير متصل'}
                        </span>
                      </div>
                      <button className={`mt-3 w-full text-sm py-2 rounded-lg ${
                        integration.status === 'connected'
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-primary-500 text-white hover:bg-primary-600'
                      }`}>
                        {integration.status === 'connected' ? 'إدارة' : 'ربط'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
