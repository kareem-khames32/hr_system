// طبقة بيانات مشتركة — الأقسام والفرق ومسارات الاعتماد (Mock موحّد)
// تُستبدل باستدعاءات API عند بناء الـ Backend

export interface DepartmentOption {
  id: string
  name: string
  branchId: string
}

export interface TeamOption {
  id: string
  name: string
  departmentId: string
}

export interface WorkflowOption {
  id: string
  name: string
  requestType: string
  branchId: string // 'all' أو معرف فرع
}

export const departments: DepartmentOption[] = [
  { id: '1', name: 'الإدارة العامة', branchId: '1' },
  { id: '2', name: 'تقنية المعلومات', branchId: '1' },
  { id: '3', name: 'الموارد البشرية', branchId: '1' },
  { id: '4', name: 'المالية', branchId: '1' },
  { id: '5', name: 'المبيعات', branchId: '2' },
  { id: '6', name: 'التسويق', branchId: '2' },
  { id: '7', name: 'خدمة العملاء', branchId: '3' },
]

export const teams: TeamOption[] = [
  { id: 't1', name: 'فريق التطوير', departmentId: '2' },
  { id: 't2', name: 'فريق الدعم الفني', departmentId: '2' },
  { id: 't3', name: 'فريق التوظيف', departmentId: '3' },
  { id: 't4', name: 'فريق المبيعات الميدانية', departmentId: '5' },
  { id: 't5', name: 'فريق التسويق الرقمي', departmentId: '6' },
]

// مرآة خفيفة لمسارات الاعتماد المعرّفة في شاشة الاعتمادات
export const approvalWorkflows: WorkflowOption[] = [
  { id: '1', name: 'اعتماد الإجازات - قصيرة', requestType: 'leave', branchId: 'all' },
  { id: '2', name: 'اعتماد الإجازات - طويلة', requestType: 'leave', branchId: 'all' },
  { id: '3', name: 'اعتماد المصاريف - صغيرة', requestType: 'expense', branchId: 'all' },
  { id: '4', name: 'اعتماد المصاريف - متوسطة', requestType: 'expense', branchId: 'all' },
  { id: '5', name: 'اعتماد المصاريف - كبيرة', requestType: 'expense', branchId: 'all' },
  { id: '6', name: 'اعتماد السلف', requestType: 'loan', branchId: 'all' },
  { id: '7', name: 'اعتماد العمل الإضافي - فرع جدة', requestType: 'overtime', branchId: '2' },
  { id: '8', name: 'اعتماد الترقيات', requestType: 'promotion', branchId: 'all' },
]
