'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  can,
  fetchInbox,
  getCurrentUser,
  logout,
  type CurrentUser,
} from '@/lib/api'
import { fetchMyPayrollApprovalsCount } from '@/lib/payroll-approval-chain-api'
import { fetchMyTasksCount, TASKS_CHANGED_EVENT } from '@/lib/tasks-api'
import { preboardingPathAllowed, preboardingUntil } from '@/lib/preboarding'
import { fetchDelegations } from '@/lib/delegations-api'
import { fetchTeamManager } from '@/lib/manager-api'
import { fetchMyRaises } from '@/lib/compensation-api'
import { DEFAULT_MODULES, routeAvailable, useModules } from '@/lib/modules'
import { useBranding } from '@/lib/branding'
import { useT } from '@/lib/i18n'
import { BrandLogo } from '@/components/branding/BrandLogo'
import { PoweredBy } from '@/components/branding/PoweredBy'
import { InstallAppButton } from './InstallAppButton'
import {
  LayoutDashboard,
  Hourglass,
  Users,
  Clock,
  Calendar,
  Wallet,
  UserPlus,
  Target,
  GraduationCap,
  LifeBuoy,
  FileText,
  Settings,
  ChevronDown,
  X,
  KeyRound,
  ShieldCheck,
  LogOut,
  ClipboardList,
  Package,
  FolderOpen,
  UserCircle,
  Gift,
  ListChecks,
  Megaphone,
  Building2,
} from 'lucide-react'
import clsx from 'clsx'

// شرط ظهور محسوب في القايمة نفسها (مش صلاحية): المعتمد، اللي عليه مسير، اللي تحته حد في الهيكل…
type MenuFlag = 'inbox' | 'payrollApprovals' | 'team' | 'raises' | 'probation'
// عدّاد جنب البند
type MenuBadge = 'inbox' | 'payrollApprovals' | 'tasks'

export interface ChildItem {
  label: string
  href: string
  // الصلاحية المطلوبة لظهور العنصر — بدونها العنصر مفتوح لكل حساب (بنود بوابة الموظف). مصفوفة = كلها لازمة
  perm?: string | string[]
  when?: MenuFlag
  badge?: MenuBadge
}

export interface MenuGroup {
  id: string
  label: string
  icon: React.ReactNode
  children: ChildItem[]
}

// بند معروض: رابط مباشر، أو مجموعة بتتفتح
interface MenuItem {
  id: string
  label: string
  icon: React.ReactNode
  href?: string
  children?: Array<{ label: string; href: string; badge?: number }>
  badge?: number
}

// ===== القايمة كلها في ترتيب واحد ثابت (B-ADD.21، كلمة المالك 12 أكتوبر: «كل نقطة في النظام في المكان بتاعها، في الموديول بتاعها») =====
// كل مجموعة = موديول أو موديولات قريبة من بعض: بنود الموظف نفسه الأول (من غير صلاحية)، وبعدها شاشات الإدارة كل واحدة بصلاحيتها.
// كل شاشة في مكان واحد بس، والمسارات زي ما هي. البند بيظهر لو صلاحيته مع الحساب وموديول مساره مفعّل (سجل الموديولات)،
// والمجموعة اللي فاضل فيها بند واحد بتتعرض رابط مباشر باسم البند (الموظف العادي مايفتحش مجموعة عشان بند واحد).
export const MENU: MenuGroup[] = [
  {
    id: 'dashboard',
    label: 'الرئيسية',
    icon: <LayoutDashboard size={20} />,
    children: [
      // الاسم المعروض «لوحة التحكم» للي معاه شاشة إدارية و«لوحتي» لغيره
      { label: 'لوحة التحكم', href: '/' },
    ],
  },
  {
    id: 'account',
    label: 'حسابي',
    icon: <UserCircle size={20} />,
    children: [
      { label: 'ملفي الشخصي', href: '/profile' },
      { label: 'التقويم', href: '/calendar' },
      { label: 'الإشعارات', href: '/notifications' },
    ],
  },
  {
    id: 'requests',
    label: 'الطلبات',
    icon: <ClipboardList size={20} />,
    children: [
      { label: 'طلباتي', href: '/requests' },
      // «بانتظار موافقتي» تظهر لغير الموظف دائماً، وللموظف عندما يكون معتمِداً فعلياً أو طرف تفويض
      { label: 'بانتظار موافقتي', href: '/approvals-inbox', when: 'inbox', badge: 'inbox' },
      { label: 'لوحة الطلبات', href: '/requests-console', perm: 'requests.view_all' },
    ],
  },
  {
    // B2.5: «مهامي» لكل حساب (مهام عامة + تهيئة + إخلاء)، وقايمة كل المهام العامة في نطاق الحساب بصلاحيتها
    id: 'tasks',
    label: 'المهام',
    icon: <ListChecks size={20} />,
    children: [
      { label: 'مهامي', href: '/my/tasks', badge: 'tasks' },
      { label: 'المهام', href: '/tasks', perm: 'tasks.view_all' },
    ],
  },
  {
    id: 'employees',
    label: 'الموظفين',
    icon: <Users size={20} />,
    children: [
      // B2.14: «فريقي» للي تحته حد في الهيكل بس (والموديول مفعّل)
      { label: 'فريقي', href: '/my/team', when: 'team' },
      { label: 'قائمة الموظفين', href: '/employees', perm: 'employees.view' },
      { label: 'إضافة موظف', href: '/employees/add', perm: 'employees.create' },
      { label: 'تهيئة الموظفين الجدد', href: '/employees/onboarding', perm: 'employees.view' },
      // B3.1-ج: قرار فترة التجربة — للمدير (مرؤوسيه) وللموارد البشرية (عرض الموظفين)
      { label: 'فترات التجربة', href: '/my/probation', when: 'probation' },
      { label: 'الهيكل التنظيمي', href: '/employees/org-chart', perm: 'employees.view' },
      { label: 'إدارة العقود', href: '/employees/contracts', perm: 'employees.view' },
      { label: 'سجل النقل', href: '/employees/transfers', perm: 'transfers.view' },
      { label: 'تحديث جماعي من Excel', href: '/employees/bulk-update', perm: 'employees.edit' },
      { label: 'إنهاء الخدمة', href: '/offboarding', perm: 'offboarding.manage' },
      { label: 'المؤرشفون ومنتهو الخدمة', href: '/employees/archived', perm: 'employees.view' },
    ],
  },
  {
    // B2.7: «سياساتي» لكل حساب، ومكتبة السياسات لمديرها، وتقرير الإقرارات لصاحب صلاحيته
    id: 'documents',
    label: 'المستندات والسياسات',
    icon: <FolderOpen size={20} />,
    children: [
      { label: 'مستنداتي', href: '/my/documents' },
      { label: 'سياساتي', href: '/my/policies' },
      { label: 'مستندات الموظفين', href: '/employees/documents', perm: 'documents.manage' },
      { label: 'نواقص مسوغات التعيين', href: '/employees/hiring-documents', perm: 'documents.manage' },
      { label: 'إصدار مستند', href: '/employees/documents/create', perm: 'documents.manage' },
      { label: 'مكتبة السياسات', href: '/policies', perm: 'policies.manage' },
      { label: 'تقرير الإقرارات', href: '/policies/reports', perm: 'policies.report' },
    ],
  },
  {
    id: 'attendance',
    label: 'الحضور والانصراف',
    icon: <Clock size={20} />,
    // الصلاحية لكل عنصر (مطابقة لحارس المسارات): الورديات كتالوج إعدادات والأجهزة للمزامنة
    children: [
      { label: 'حضوري', href: '/my/attendance' },
      // B5.6: تسجيل البصمة من الموبايل (بتظهر لما ميزة «بصمة الموبايل» مفتوحة)
      { label: 'بصمتي', href: '/my/punch' },
      // B5.5 (ج): طلبات تبديل الوردية اللي الموظف طرف تاني فيها (بتظهر لما ميزة «تبديل الوردية بموافقة الطرف التاني» مفتوحة)
      { label: 'تبديل ورديتي', href: '/my/shift-swaps' },
      { label: 'سجل الحضور', href: '/attendance', perm: 'attendance.view_all' },
      { label: 'الإدخال اليدوي', href: '/attendance/manual-entry', perm: 'attendance.view_all' },
      { label: 'الكشف الشهري', href: '/attendance/monthly-sheet', perm: 'attendance.view_all' },
      { label: 'استثناء الحضور', href: '/attendance/exemptions', perm: 'attendance_exemption.view' },
      { label: 'الجدول الأسبوعي', href: '/attendance/weekly-schedule', perm: 'attendance.view_all' },
      // B5.5: نسخ أسبوع وأنماط تدوير ونشر الجدول (بتظهر لما ميزة «الجدولة المتقدمة» مفتوحة)
      { label: 'أدوات الجدولة', href: '/attendance/schedule-tools', perm: 'attendance.manage' },
      { label: 'الورديات', href: '/attendance/shifts', perm: 'settings.manage' },
      { label: 'العمل الإضافي', href: '/attendance/overtime', perm: 'attendance.view_all' },
      { label: 'دوام أيام العطلات', href: '/attendance/holiday-work', perm: 'attendance.view_all' },
      { label: 'أجهزة البصمة', href: '/attendance/devices', perm: 'attendance.sync' },
      // B5.6: مواقع بصمة الموبايل ومحاولاتها (بتظهر لما ميزة «بصمة الموبايل» مفتوحة)
      { label: 'بصمة الموبايل', href: '/attendance/punch-sites', perm: 'attendance.view_all' },
      { label: 'تقارير الحضور', href: '/attendance/reports', perm: 'attendance.view_all' },
    ],
  },
  {
    // B5.8: تسجيل ساعاتي على المشاريع واعتماد ساعات فريقي، ومشاريع ساعات العمل وتقريرها (الموديول مقفول افتراضيًا)
    id: 'timesheets',
    label: 'ساعات المشاريع',
    icon: <Hourglass size={20} />,
    children: [
      { label: 'ساعاتي', href: '/my/timesheets' },
      { label: 'ساعات المشاريع', href: '/timesheets', perm: 'timesheets.manage' },
    ],
  },
  {
    id: 'leaves',
    label: 'الإجازات والأذونات',
    icon: <Calendar size={20} />,
    // أنواع الإجازات والأذونات كتالوجات إعدادات (كتابتها وقراءة الأنواع settings.manage) — مكانها مع موديولها
    children: [
      { label: 'إجازاتي وأرصدتي', href: '/my/leaves' },
      { label: 'سجل الإجازات المعتمدة', href: '/leaves', perm: 'leaves.view_all' },
      { label: 'طلب إجازة', href: '/leaves/request', perm: 'leaves.view_all' },
      { label: 'رصيد الإجازات', href: '/leaves/balance', perm: 'leaves.view_all' },
      { label: 'تقويم الإجازات', href: '/leaves/calendar', perm: 'leaves.view_all' },
      { label: 'الأذونات', href: '/attendance/permissions', perm: 'attendance.view_all' },
      { label: 'إقفال سنة الإجازات', href: '/leaves/year-end', perm: 'leave_balances.manage' },
      { label: 'أنواع الإجازات', href: '/leaves/types', perm: 'settings.manage' },
      { label: 'أنواع الأذونات', href: '/settings/permission-types', perm: 'settings.manage' },
    ],
  },
  {
    id: 'payroll',
    label: 'الرواتب',
    icon: <Wallet size={20} />,
    // تبسيط الرواتب (2026-09-15): الإعفاءات المالية وقسائم الراتب والبدلات أُخفيت (والتأمينات رجعت 16 سبتمبر بإعدادات وتقرير) وروابطها تتحول لـ«مسير الرواتب»؛
    // و«القيم العامة للخصومات» (/payroll/formulas) أُوقفت وصارت داخل «معادلات الرواتب» نفسها — رابطها القديم يحوّل إليها.
    // «إعفاءاتي» أُخفيت كمان: الرابط يتحول لـ«قسائم راتبي» والخصم الملغى يظهر سطرًا في القسيمة
    children: [
      { label: 'قسائم راتبي', href: '/my/payslips' },
      // «مسيرات بانتظار اعتمادي» تظهر بس لما فيه مسير منتظره فعلًا (التسمية في السلسلة هي المنحة، فممكن يكون بلا أي صلاحية رواتب)
      { label: 'مسيرات بانتظار اعتمادي', href: '/payroll/my-approvals', when: 'payrollApprovals', badge: 'payrollApprovals' },
      // B5.1-ب: «زيادات فريقي» للمدير اللي ليه مرؤوسين وفيه دورة زيادات مفتوحة
      { label: 'زيادات فريقي', href: '/my/raises', when: 'raises' },
      { label: 'مسير الرواتب', href: '/payroll', perm: 'payroll.view' },
      // صرف المسير موظف بموظف: بصلاحيته هو لأن موظف المالية حامل payroll.disburse مابيحملش payroll.view
      { label: 'صرف الرواتب', href: '/payroll/disbursement', perm: 'payroll.disburse' },
      { label: 'معادلات الرواتب', href: '/payroll/policies', perm: 'payroll.view' },
      // B4.3: وصف بنود القسيمة وترتيبها (شاشة إعدادات تبع الرواتب)
      { label: 'بنود الراتب', href: '/settings/salary-items', perm: 'settings.manage' },
      { label: 'التأمينات', href: '/payroll/gosi', perm: 'payroll.view' },
      // B5.1: سلّم الرواتب ودورة الزيادات (بتظهر لما موديول تخطيط الزيادات مفتوح)
      { label: 'سلّم الرواتب والزيادات', href: '/compensation', perm: 'payroll.view' },
      { label: 'دورات الزيادات', href: '/compensation/cycles', perm: ['payroll.view', 'compensation.manage'] },
      { label: 'تقرير الرواتب', href: '/payroll/reports', perm: 'payroll.view' },
      { label: 'كشف البنوك', href: '/payroll/bank-sheet', perm: 'payroll.view' },
      // B4.6 (ب): جدول البنوك بأكوادها (شاشة إعدادات تبع الرواتب)
      { label: 'البنوك', href: '/settings/banks', perm: 'settings.manage' },
      // قرار المالك (22 سبتمبر): المالك بيرتب سلسلة اعتماد المسير بنفسه (سلسلة الشركة + سلسلة خاصة بمسير دائم)
      { label: 'سلسلة اعتماد المسير', href: '/payroll/approval-chain', perm: ['payroll.view', 'payroll.chain_manage'] },
    ],
  },
  {
    id: 'money',
    label: 'السلف والمكافآت والخصومات',
    icon: <Gift size={20} />,
    children: [
      { label: 'سلفي', href: '/my/loans' },
      // الخطوة 27: المكافآت المقترحة لي بحالتها، ومساحة المدير لاقتراح مكافآت مرؤوسيه
      { label: 'مكافآتي', href: '/my/bonuses' },
      // الخطوة 25: الخصومات المصنفة عليّ، ومساحة المدير لإنشاء خصومات فريقه ومتابعة اعتمادها
      { label: 'خصوماتي', href: '/my/deductions' },
      // B5.3: تقارير مصروفات الموظف (بتظهر لما ميزة «تقارير المصروفات» مفتوحة)
      { label: 'مصروفاتي', href: '/my/expenses' },
      { label: 'السلف والقروض', href: '/payroll/loans', perm: 'payroll.view' },
      { label: 'المكافآت', href: '/payroll/bonuses', perm: 'payroll.view' },
      { label: 'الخصومات', href: '/payroll/deductions', perm: 'payroll.view' },
      // B5.3: فئات المصروف وتقارير الموظفين (بتظهر لما ميزة «تقارير المصروفات» مفتوحة)
      { label: 'المصروفات', href: '/expenses', perm: 'expenses.manage' },
    ],
  },
  {
    id: 'custody',
    label: 'العهد والأصول',
    icon: <Package size={20} />,
    children: [
      { label: 'عهدي', href: '/my/custody' },
      { label: 'سجل العهد', href: '/employees/custody', perm: 'custody.assign' },
      { label: 'سجل الأصول', href: '/settings/asset-types', perm: 'custody.assign' },
    ],
  },
  {
    id: 'performance',
    label: 'الأداء والمهارات',
    icon: <Target size={20} />,
    children: [
      // B3.6 وB3.7: أهداف الموظف وفريقه وتقييماته — نفس الشاشة للموظف ولإدارة الأداء (الخادم بيرجّع لكل حساب اللي له)
      { label: 'الأهداف', href: '/performance/goals' },
      { label: 'التقييمات', href: '/performance' },
      // B5.10: 360 واجتماعات 1:1 والتقدير (كل بند بيظهر لما ميزته مفتوحة)
      { label: 'تقييم 360', href: '/my/feedback360' },
      { label: 'اجتماعات 1:1', href: '/my/one-on-ones' },
      { label: 'التقدير', href: '/my/recognition' },
      // B5.4: فجوة مهارات الموظف ومصفوفة فريقه (بتظهر لما موديول المهارات مفتوح)
      { label: 'مهاراتي', href: '/my/skills' },
      // B3.7: الدورات والنماذج لإدارة الأداء
      { label: 'دورات التقييم', href: '/performance/cycles', perm: ['employees.view', 'performance.manage'] },
      { label: 'نماذج التقييم', href: '/performance/templates', perm: ['employees.view', 'performance.manage'] },
      // B3.8: المعايرة بصلاحيتها
      { label: 'المعايرة', href: '/performance/calibration', perm: ['employees.view', 'performance.calibrate'] },
      // B5.4: المهارات والإحلال، وخطط الإحلال السرّية بصلاحيتها (الموديول مقفول افتراضيًا)
      { label: 'المهارات والإحلال', href: '/skills', perm: 'skills.manage' },
      { label: 'خطط الإحلال', href: '/skills/succession', perm: 'succession.manage' },
    ],
  },
  {
    id: 'recruitment',
    label: 'التوظيف',
    icon: <UserPlus size={20} />,
    // كلمة المالك 12 أكتوبر: «الوظائف المعتمدة» جوه التوظيف (B2.11؛ الموديول مقفول افتراضيًا: البند بيظهر لما يتفعّل). الصلاحية على كل
    // بند، فصاحب «عرض الوظائف المعتمدة» من غير «إدارة التوظيف» بيشوف بنده بس
    children: [
      // B3.3-أ: الوظائف المنشورة داخليًا في فرع الموظف. B3.4-ب: المقابلات اللي الموظف محاور فيها وبطاقته
      { label: 'وظائف داخلية', href: '/my/jobs' },
      { label: 'مقابلاتي', href: '/my/interviews' },
      { label: 'الوظائف المعتمدة', href: '/positions', perm: 'positions.view' },
      { label: 'الوظائف الشاغرة', href: '/recruitment', perm: 'candidates.manage' },
      { label: 'إدارة الوظائف', href: '/recruitment/jobs', perm: 'candidates.manage' },
      { label: 'المتقدمين', href: '/recruitment/applicants', perm: 'candidates.manage' },
      { label: 'المقابلات', href: '/recruitment/interviews', perm: 'candidates.manage' },
      { label: 'عروض العمل', href: '/recruitment/offers', perm: 'candidates.manage' },
      { label: 'أرقام التوظيف', href: '/recruitment/metrics', perm: 'candidates.manage' },
    ],
  },
  {
    id: 'training',
    label: 'التدريب والتطوير',
    icon: <GraduationCap size={20} />,
    children: [
      // B3.9: «دوراتي» لكل موظف، وشاشات إدارة التدريب بصلاحيتها
      { label: 'دوراتي', href: '/training/my-courses' },
      { label: 'الدورات التدريبية', href: '/training', perm: ['employees.view', 'training.manage'] },
      { label: 'إضافة دورة', href: '/training/add', perm: ['employees.view', 'training.manage'] },
      { label: 'الشهادات', href: '/training/certificates', perm: ['employees.view', 'training.manage'] },
      // B3.9-ج: ميزانية الأقسام والتدريب الإلزامي
      { label: 'خطة التدريب', href: '/training/plan', perm: ['employees.view', 'training.manage'] },
    ],
  },
  {
    // كل بند بيظهر لما موديوله مفتوح: الإعلانات (B2.16)، الاستبيانات (B3.13)، بريد الشركة (B-ADD.16)، اجتماعات الصوت والصورة (B-ADD.15)،
    // والاتصال من جوه النظام (B-ADD.23 — نفس موديول الاجتماعات)
    id: 'communication',
    label: 'التواصل',
    icon: <Megaphone size={20} />,
    children: [
      { label: 'الإعلانات', href: '/announcements' },
      { label: 'الاستبيانات', href: '/surveys' },
      { label: 'البريد', href: '/mail' },
      { label: 'الاجتماعات', href: '/meet' },
      { label: 'الاتصال', href: '/meet/calls' },
    ],
  },
  {
    id: 'services',
    label: 'خدمات الموظفين',
    icon: <LifeBuoy size={20} />,
    children: [
      // B3.10: استفسارات الموظف للموارد البشرية (بتظهر لما موديول مركز الخدمات مفتوح)
      { label: 'مركز الخدمات', href: '/helpdesk' },
      // B6.6: مساعد القراءة (بيظهر لما موديول الذكاء الاصطناعي وميزة المساعد مفتوحين)
      { label: 'المساعد', href: '/assistant' },
      // B3.11: قضايا الحساب (المطّلع عليها) وقضايا الموظف الطرف. B3.12: لائحة الجزاءات وتوقيعها بصلاحيتها
      { label: 'الشكاوى والتحقيقات', href: '/cases' },
      { label: 'لائحة الجزاءات', href: '/cases/penalties', perm: 'cases.penalties' },
      // B5.7: بلاغ حادث ومتابعة بلاغاتي، وسجل حوادث السلامة بصلاحيته
      { label: 'بلاغات السلامة', href: '/my/safety' },
      { label: 'السلامة وإصابات العمل', href: '/safety', perm: 'safety.manage' },
      // B5.2: وثائق التأمين الطبي وفئاتها (بتظهر لما موديول المزايا مفتوح)
      { label: 'المزايا والتأمين الطبي', href: '/benefits', perm: 'benefits.manage' },
    ],
  },
  {
    id: 'reports',
    label: 'التقارير',
    icon: <FileText size={20} />,
    children: [
      { label: 'لوحة التقارير', href: '/reports', perm: 'reports.view' },
      // B5.9: بانِي التقارير (بيظهر لما ميزة «بانِي التقارير» مفتوحة)
      { label: 'بانِي التقارير', href: '/reports/builder', perm: 'reports.view' },
      { label: 'تقرير مراكز التكلفة', href: '/reports/cost-centers', perm: ['reports.view', 'payroll.view'] },
    ],
  },
  {
    // بيانات الشركة وهيكلها والبيانات المرجعية لملفات الموظفين، وتقويم الشركة (أيام العمل والعطلات الرسمية أساسي: مايتقفلش مع موديول)
    id: 'company',
    label: 'الشركة والهيكل',
    icon: <Building2 size={20} />,
    children: [
      { label: 'بيانات الشركة', href: '/settings/company', perm: 'settings.manage' },
      // B4.1: كيان لكل دولة بأرقام تسجيله. B4.2: القيم القانونية المؤرخة لكل دولة
      { label: 'الكيانات القانونية', href: '/settings/legal-entities', perm: 'settings.manage' },
      { label: 'حزمة الدولة', href: '/settings/statutory', perm: 'settings.manage' },
      { label: 'الفروع', href: '/settings/branches', perm: 'org.manage' },
      { label: 'الإدارات والأقسام', href: '/settings/departments', perm: 'org.manage' },
      { label: 'الفرق', href: '/settings/teams', perm: 'org.manage' },
      { label: 'مراكز التكلفة', href: '/settings/cost-centers', perm: 'settings.manage' },
      { label: 'المسميات الوظيفية', href: '/settings/job-titles', perm: 'settings.manage' },
      { label: 'الدرجات الوظيفية', href: '/settings/grades', perm: 'settings.manage' },
      { label: 'حقول ملف الموظف', href: '/settings/employee-fields', perm: 'settings.manage' },
      { label: 'أيام العمل', href: '/settings/work-days', perm: 'settings.manage' },
      { label: 'العطلات الرسمية', href: '/leaves/holidays', perm: 'settings.manage' },
    ],
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    icon: <Settings size={20} />,
    children: [
      { label: 'الإعدادات العامة', href: '/settings', perm: 'settings.manage' },
      { label: 'الموديولات', href: '/settings/modules', perm: 'settings.modules' },
      { label: 'سياسات النظام', href: '/settings/policies', perm: 'settings.manage' },
      { label: 'بانِي الطلبات', href: '/settings/request-types', perm: 'request_types.manage' },
      { label: 'الاعتمادات والموافقات', href: '/settings/approvals', perm: 'approval_chains.manage' },
      { label: 'أنواع المستندات', href: '/settings/documents', perm: 'settings.manage' },
      { label: 'قوالب المستندات', href: '/settings/document-templates', perm: 'settings.manage' },
      { label: 'قوالب الخطابات', href: '/settings/letter-templates', perm: 'settings.manage' },
      // B-ADD.5: البريد والواتساب وقنوات كل حدث وسجل الإرسال (الإعداد لمدير النظام بس — الخادم اللي بيحكم)
      { label: 'قنوات الإشعارات', href: '/settings/notification-channels', perm: 'settings.manage' },
      { label: 'المهام المجدولة', href: '/settings/scheduled-jobs', perm: 'settings.manage' },
      // B6.3: مفاتيح الـAPI العام والـwebhooks (الموديول مقفول افتراضيًا: البند بيظهر لما يتفعّل)
      { label: 'التكاملات', href: '/settings/integrations', perm: 'integrations.manage' },
      // B6.1 (ب): استيراد الهيكل والموظفين من Excel عند تجهيز عميل (لحساب بكل الفروع — الخادم اللي بيحكم)
      { label: 'استيراد بيانات التجهيز', href: '/settings/import', perm: 'settings.manage' },
      // B4.8 (ب): مدد الاحتفاظ بالبيانات وسجل حوادث التسريب
      { label: 'حماية البيانات', href: '/settings/data-protection', perm: 'settings.manage' },
    ],
  },
  {
    id: 'access',
    label: 'المستخدمين والصلاحيات',
    icon: <ShieldCheck size={20} />,
    children: [
      { label: 'المستخدمين', href: '/settings/users', perm: 'users.manage' },
      { label: 'الأدوار والصلاحيات', href: '/settings/roles', perm: 'roles.manage' },
      { label: 'سجل الدخول', href: '/settings/login-log', perm: 'users.manage' },
      { label: 'سجل التدقيق', href: '/settings/audit', perm: 'audit.view' },
    ],
  },
]

// أسماء الأدوار للعرض
const roleLabels: Record<string, string> = {
  super_admin: 'مدير النظام',
  hr_manager: 'مدير الموارد البشرية',
  branch_manager: 'مدير فرع',
  employee: 'موظف',
  // الأدوار التشغيلية (حزمها في api/src/auth/permissions.ts) — من غيرها كان بيظهر الكود الإنجليزي تحت اسم المستخدم
  payroll_manager: 'مسؤول الرواتب',
  payroll_disburser: 'مسؤول صرف الرواتب',
  asset_officer: 'مسؤول الأصول',
  hr_officer: 'مسؤول موارد بشرية',
  data_entry: 'مدخل بيانات',
  read_only: 'قراءة فقط',
}

// المجموعة المفتوحة تُحفظ (تفضيل عرض فقط) — مجموعة واحدة مفتوحة في كل مرة حتى تبقى القائمة قصيرة
const OPEN_GROUP_KEY = 'hr_sidebar_open_group'
const readOpenGroup = (): string | null => {
  try { return localStorage.getItem(OPEN_GROUP_KEY) } catch { return null }
}
const saveOpenGroup = (id: string | null) => {
  try {
    if (id) localStorage.setItem(OPEN_GROUP_KEY, id)
    else localStorage.removeItem(OPEN_GROUP_KEY)
  } catch { /* تخزين غير متاح */ }
}

// الرابط النشط = أطول رابط في القائمة يطابق المسار أو يسبقه بمقطع كامل
// (/employees/12/edit ← «قائمة الموظفين»، /payroll/payslip/5 ← «مسير الرواتب»)؛ الرئيسية بالتطابق فقط
const activeHrefFor = (pathname: string, items: Array<{ href?: string; children?: Array<{ href: string }> }>): string | null => {
  let best: string | null = null
  const consider = (href?: string) => {
    if (!href) return
    const hit = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
    if (hit && (!best || href.length > best.length)) best = href
  }
  for (const item of items) {
    consider(item.href)
    item.children?.forEach((child) => consider(child.href))
  }
  if (best) return best
  // شاشات تُفتح من بوابة الموظف بلا عنصر خاص بها (طلب إجازة، قسيمة راتب): يُميَّز العنصر الذي فُتحت منه
  const alias = PATH_ALIASES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1]
  return alias && items.some((item) => item.href === alias || item.children?.some((child) => child.href === alias)) ? alias : null
}
const PATH_ALIASES: Array<[prefix: string, href: string]> = [
  ['/leaves/request', '/my/leaves'],
  ['/payroll/payslip', '/my/payslips'],
  ['/my/exemptions', '/my/payslips'],
]

interface SidebarProps {
  // أقل من lg القائمة درج: مفتوح ولا لأ، وقفله (الخلفية المعتمة وEsc والانتقال في AppShell)
  open?: boolean
  onClose?: () => void
}

export default function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname() ?? ''
  // B6.2: بنود القايمة بتتعرض بلغة الحساب (المفتاح هو الاسم العربي)
  const t = useT()
  // القائمة تُركَّب بعد التحقق من الجلسة على العميل — قراءة التخزين المحلي هنا آمنة وتمنع وميض قائمة فارغة
  // المفتوحة = مجموعة الشاشة الحالية من أول رسم (بلا وميض مجموعة مغلقة)، وإلا آخر مجموعة فتحها المستخدم
  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    const href = activeHrefFor(pathname, MENU)
    // (المجموعة أم بند واحد — «الرئيسية» — بتتعرض رابط مباشر، فمش هي اللي بتتفتح)
    return MENU.find((item) => item.children.length > 1 && item.children.some((child) => child.href === href))?.id ?? readOpenGroup()
  })
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => getCurrentUser())
  // الموديولات المفعّلة للمستخدم (الإعدادات ← الموديولات): بند الموديول المقفول مابيظهرش — ولحد ما تتقري، افتراضي السجل
  const enabledModules = useModules() ?? DEFAULT_MODULES
  const payrollOn = enabledModules.modules.includes('payroll')
  // اسم الشركة وشعارها من «بيانات الشركة» — بيتحدثوا لوحدهم بعد الحفظ (BRANDING_CHANGED)
  const brand = useBranding()
  const navRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [inboxError, setInboxError] = useState(false)
  const [inboxRevision, setInboxRevision] = useState(0)
  const [inboxCount, setInboxCount] = useState<number>(0)
  // سلسلة اعتماد المسير: عدد المسيرات اللي الدور فيها على المستخدم (التسمية في السلسلة هي المنحة، فممكن يكون بلا أي صلاحية رواتب)
  const [payrollApprovals, setPayrollApprovals] = useState<number>(0)
  // B2.5: عدد اللي على الحساب في «مهامي» (مهام عامة + تهيئة + إخلاء)
  const [tasksCount, setTasksCount] = useState<number>(0)
  const [tasksRevision, setTasksRevision] = useState(0)
  // B2.14: بند «فريقي» للي تحته حد في الهيكل بس (والموديول مفعّل). فشل النداء = البند مايظهرش
  const [teamManager, setTeamManager] = useState(false)
  const managerOn = enabledModules.modules.includes('manager')
  useEffect(() => {
    if (!managerOn || !getCurrentUser()) return setTeamManager(false)
    let live = true
    fetchTeamManager().then((manager) => { if (live) setTeamManager(manager) }).catch(() => { if (live) setTeamManager(false) })
    return () => { live = false }
  }, [managerOn])
  // B5.1-ب: بند «زيادات فريقي» للمدير اللي ليه مرؤوسين وفيه دورة زيادات مفتوحة (والموديول مفعّل). فشل النداء = البند مايظهرش
  const [raisesOpen, setRaisesOpen] = useState(false)
  const compensationOn = enabledModules.modules.includes('compensation')
  useEffect(() => {
    if (!compensationOn || !getCurrentUser()) return setRaisesOpen(false)
    let live = true
    fetchMyRaises().then((sheet) => { if (live) setRaisesOpen(sheet.cycles.length > 0) }).catch(() => { if (live) setRaisesOpen(false) })
    return () => { live = false }
  }, [compensationOn])
  // B2.6-ب: المعتمد الهيكلي وطرف التفويض بيلاقوا «بانتظار موافقتي» حتى والصندوق فاضي — منها بيسجّل تفويضه قبل إجازته وبيلغيه
  const [delegationEntry, setDelegationEntry] = useState(false)
  useEffect(() => {
    if (getCurrentUser()?.role !== 'employee') return
    fetchDelegations()
      .then((data) => setDelegationEntry(data.available && (data.approver || data.toMe.length > 0 || data.mine.some((row) => row.canRevoke))))
      .catch(() => setDelegationEntry(false))
  }, [])

  // الإطار ثابت بين الصفحات: الجلسة تُقرأ من جديد وعدّاد الموافقات يتحدث مع كل انتقال
  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
    if (user) {
      // «بانتظار موافقتي» تظهر لغير الموظف دائماً، وللموظف عندما يكون معتمِداً فعلياً
      fetchInbox()
        .then((rows) => { setInboxCount(rows.length); setInboxError(false) })
        .catch(() => setInboxError(true))
      // «مسيرات بانتظار اعتمادي» تظهر بس لما فيه مسير منتظره فعلًا؛ فشل النداء مايظهرش حاجة. والرواتب مقفولة = مفيش نداء أصلًا
      if (!payrollOn) setPayrollApprovals(0)
      else fetchMyPayrollApprovalsCount()
        .then((result) => setPayrollApprovals(result.count))
        .catch(() => setPayrollApprovals(0))
    }
  }, [inboxRevision, pathname, payrollOn])

  // عدّاد «مهامي»: مع كل انتقال، وبعد أي تغيير في المهام من أي شاشة (TASKS_CHANGED_EVENT). فشل النداء = البند ظاهر من غير عدّاد
  useEffect(() => {
    if (!getCurrentUser()) return
    fetchMyTasksCount()
      .then((result) => setTasksCount(result.open))
      .catch(() => setTasksCount(0))
  }, [pathname, tasksRevision])
  useEffect(() => {
    const bump = () => setTasksRevision((value) => value + 1)
    window.addEventListener(TASKS_CHANGED_EVENT, bump)
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, bump)
  }, [])

  // القائمة تُبنى من صلاحيات المستخدم الحالي والموديولات المفعّلة — الفرض الحقيقي في الباك إند
  const menuItems = useMemo<MenuItem[]>(() => {
    if (!currentUser) return []
    // البند يظهر لو موديول مساره مفعّل (والميزة لو المسار ورا ميزة) — من سجل الموديولات
    const available = (href?: string) => !href || routeAvailable(href, enabledModules)

    const showInbox = currentUser.role !== 'employee' || inboxCount > 0 || inboxError || delegationEntry
    // شروط الظهور المحسوبة وعدّادات البنود (القايمة نفسها في MENU فوق)
    const flags: Record<MenuFlag, boolean> = {
      inbox: showInbox,
      // «مسيرات بانتظار اعتمادي» تظهر بس لما فيه مسير منتظره فعلًا
      payrollApprovals: payrollApprovals > 0,
      team: teamManager,
      raises: raisesOpen,
      probation: teamManager || can('employees.view'),
    }
    const badges: Record<MenuBadge, number> = { inbox: inboxCount, payrollApprovals, tasks: tasksCount }
    const permitted = (perm?: string | string[]) => !perm || (Array.isArray(perm) ? perm : [perm]).every((key) => can(key))

    // البند يظهر بصلاحيته وشرطه وموديول مساره؛ والمجموعة تظهر إذا بقي فيها عنصر واحد على الأقل
    const groups = MENU
      .map((group) => ({ ...group, children: group.children.filter((c) => permitted(c.perm) && (!c.when || flags[c.when]) && available(c.href)) }))
      .filter((group) => group.children.length > 0)

    // حساب معاه شاشة إدارية واحدة على الأقل (بند بصلاحية): لوحته «لوحة التحكم»، وغيره «لوحتي»
    const isPrivileged = groups.some((group) => group.children.some((c) => !!c.perm))
    const labelOf = (c: ChildItem) => (c.href === '/' ? (isPrivileged ? 'لوحة التحكم' : 'لوحتي') : c.label)
    const badgeOf = (c: ChildItem) => (c.badge ? badges[c.badge] : undefined)
    const linkOf = (group: MenuGroup, c: ChildItem): MenuItem => ({ id: `${group.id}:${c.href}`, label: labelOf(c), icon: group.icon, href: c.href, badge: badgeOf(c) })

    // B3.1-ب: حساب في بوابة التهيئة: شاشات التهيئة بس (مهامي، مستنداتي، سياساتي، الإشعارات) — روابط مباشرة من غير مجموعات
    if (preboardingUntil(currentUser)) {
      return groups.flatMap((group) => group.children.filter((c) => !c.perm && preboardingPathAllowed(c.href)).map((c) => linkOf(group, c)))
    }
    // مجموعة فاضل فيها بند واحد = رابط مباشر باسم البند؛ وعدّاد المجموعة مجموع عدّادات بنودها
    return groups.map((group): MenuItem => (group.children.length === 1
      ? { ...linkOf(group, group.children[0]), id: group.id }
      : {
          id: group.id,
          label: group.label,
          icon: group.icon,
          children: group.children.map((c) => ({ label: labelOf(c), href: c.href, badge: badgeOf(c) })),
          badge: group.children.reduce((sum, c) => sum + (badgeOf(c) ?? 0), 0),
        }))
  }, [currentUser, inboxCount, inboxError, delegationEntry, payrollApprovals, tasksCount, teamManager, raisesOpen, enabledModules])

  const activeHref = activeHrefFor(pathname, menuItems)
  const activeGroup = menuItems.find((item) => item.children?.some((child) => child.href === activeHref))?.id

  // الانتقال لشاشة في مجموعة أخرى (ولو من رابط خارج القائمة) يفتح مجموعتها؛ التنقل داخل المجموعة لا يغلقها
  useEffect(() => {
    if (!activeGroup) return
    setOpenGroup(activeGroup)
    saveOpenGroup(activeGroup)
  }, [activeGroup])

  // العنصر النشط ظاهر داخل القائمة (مجموعات الإدارة أسفل بوابة الموظف): يُمرَّر إليه فقط لو كان خارج المنطقة الظاهرة
  useEffect(() => {
    const nav = navRef.current
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!nav || !active) return
    const navBox = nav.getBoundingClientRect()
    const box = active.getBoundingClientRect()
    if (box.top < navBox.top) nav.scrollTop -= navBox.top - box.top + 48
    else if (box.bottom > navBox.bottom - 8) nav.scrollTop += box.bottom - navBox.bottom + 48
  }, [activeHref])

  // الدرج لما يتفتح التركيز يدخل جوّاه (زرار القفل) — لقارئ الشاشة والكيبورد
  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true })
  }, [open])
  // أي رابط جوّه الدرج بيقفله — حتى رابط الصفحة المفتوحة (مفيش انتقال يقفله من AppShell)
  const closeOnLink = (event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('a')) onClose?.()
  }

  const toggleExpanded = (id: string) => {
    const next = openGroup === id ? null : id
    setOpenGroup(next)
    saveOpenGroup(next)
  }
  const isExpanded = (id: string) => openGroup === id

  const isActive = (href: string) => href === activeHref
  const isChildActive = (children?: { href: string }[]) =>
    children?.some((child) => child.href === activeHref)

  return (
    <aside
      id="app-sidebar"
      className={clsx(
        'fixed start-0 top-0 h-screen w-72 bg-white border-e border-gray-100 flex flex-col z-50',
        // أقل من lg: درج من اليمين بطول الشاشة الظاهرة، وهو مقفول برّه الشاشة ومخفي عن التركيز (invisible بعد ما يخلص الانزلاق)؛
        // من lg وفوق مفيش ولا كلاس من دول — القائمة ثابتة زي ما هي بالظبط
        'max-lg:bottom-0 max-lg:h-auto max-lg:duration-200 max-lg:ease-out max-lg:motion-reduce:transition-none',
        open ? 'max-lg:transition-transform' : 'max-lg:invisible max-lg:translate-x-full max-lg:transition-[transform,visibility]'
      )}
    >
      {/* قفل الدرج (أقل من lg بس) */}
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="إغلاق القائمة"
        className="lg:hidden absolute top-3 end-3 p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <X size={20} />
      </button>
      {/* هوية الشركة لكل المستخدمين: الشعار (أو علامة بالحروف) والاسم — الطويل على سطرين والكامل في التلميح،
          والشعار العريض بينزّل الاسم لسطر تحته (flex-wrap) */}
      <div className="px-6 py-5 border-b border-gray-100 max-lg:pe-14">
        {brand.ready ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <BrandLogo brand={brand} size="md" />
            <div className="flex-1 min-w-[8rem]">
              <p title={brand.companyName} className="font-bold text-gray-800 leading-snug line-clamp-2 break-words">
                <bdi>{brand.companyName}</bdi>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{t('الموارد البشرية')}</p>
            </div>
          </div>
        ) : (
          <div aria-hidden className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 motion-safe:animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded-lg bg-gray-100 motion-safe:animate-pulse" />
              <div className="h-3 w-1/3 rounded-lg bg-gray-100 motion-safe:animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav ref={navRef} onClick={closeOnLink} className="flex-1 overflow-y-auto p-4 space-y-1">
        {inboxError && <div role="alert" className="text-xs text-amber-700 p-2">{t('تعذر تحديث صندوق الموافقات. ')}<button type="button" className="underline" onClick={() => setInboxRevision(value => value + 1)}>{t('إعادة المحاولة')}</button></div>}
        {menuItems.map((item) => (
          <div key={item.id}>
            {item.href ? (
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={clsx('sidebar-item', isActive(item.href) && 'active')}
              >
                {item.icon}
                <span className="font-medium">{t(item.label)}</span>
                {(item.badge ?? 0) > 0 && (
                  <span
                    className={clsx(
                      'ms-auto text-xs font-bold px-2 py-0.5 rounded-full',
                      isActive(item.href)
                        ? 'bg-white/20 text-white'
                        : 'bg-primary-500 text-white'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  aria-expanded={isExpanded(item.id)}
                  onClick={() => toggleExpanded(item.id)}
                  className={clsx(
                    'sidebar-item w-full justify-between',
                    isChildActive(item.children) && 'bg-primary-50 text-primary-600'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="font-medium">{t(item.label)}</span>
                    {(item.badge ?? 0) > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-500 text-white">{item.badge}</span>
                    )}
                  </div>
                  <ChevronDown
                    size={18}
                    className={clsx(
                      'transition-transform duration-200',
                      isExpanded(item.id) && 'rotate-180'
                    )}
                  />
                </button>
                {isExpanded(item.id) && item.children && (
                  <div className="ms-8 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        aria-current={isActive(child.href) ? 'page' : undefined}
                        className={clsx(
                          'flex items-center px-4 py-2.5 rounded-xl text-sm transition-all',
                          isActive(child.href)
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                            : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'
                        )}
                      >
                        {t(child.label)}
                        {(child.badge ?? 0) > 0 && (
                          <span
                            className={clsx(
                              'ms-auto text-xs font-bold px-2 py-0.5 rounded-full',
                              isActive(child.href) ? 'bg-white/20 text-white' : 'bg-primary-500 text-white'
                            )}
                          >
                            {child.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>

      {/* المستخدم الحالي من الجلسة الحقيقية + خروج فعلي */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
            {currentUser?.displayName?.charAt(0) ?? '؟'}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-800 text-sm">
              {currentUser?.displayName ?? '—'}
            </p>
            <p className="text-xs text-gray-400">
              {roleLabels[currentUser?.role ?? ''] ?? currentUser?.role ?? ''}
            </p>
          </div>
          {/* B2.17: «الأمان» — جلسات الحساب المفتوحة */}
          {currentUser && (
            <Link href="/profile/security" title="الأمان والجلسات" aria-label="الأمان والجلسات"
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors" data-account-security-link>
              <ShieldCheck size={18} className="text-gray-400" />
            </Link>
          )}
          {/* B1.2: «تغيير كلمة المرور» — مش لحساب الدخول بحساب الشركة (كلمة سره في الويندوز) */}
          {currentUser && !currentUser.domainAccount && (
            <Link href="/login/change-password" title="تغيير كلمة المرور" aria-label="تغيير كلمة المرور"
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors" data-change-password-link>
              <KeyRound size={18} className="text-gray-400" />
            </Link>
          )}
          <button
            onClick={() => {
              // B2.17: الخادم بيمسح cookie الجلسة، وبعدها بيانات الحساب من المتصفح
              void logout().then(() => { window.location.href = '/login' })
            }}
            title="تسجيل الخروج"
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <LogOut size={18} className="text-gray-400" />
          </button>
        </div>
        {/* B2.12: «ثبّت التطبيق» — بيظهر لما المتصفح يعرض التثبيت بس */}
        <InstallAppButton className="mt-3" />
        {/* اسم المنتج صغير في الآخر — الاسم الكبير فوق للشركة */}
        <PoweredBy className="mt-3" />
      </div>
    </aside>
  )
}
