// طبقة بيانات مشتركة — قائمة الفروع (Mock موحّد يُستخدم في كل الشاشات)
// عند بناء الـ Backend تُستبدل باستدعاء API واحد

export interface BranchOption {
  id: string
  name: string
  code: string
  costCenter: string
}

export const branches: BranchOption[] = [
  { id: '1', name: 'الفرع الرئيسي - الرياض', code: 'RYD-001', costCenter: 'CC-100' },
  { id: '2', name: 'فرع جدة', code: 'JED-001', costCenter: 'CC-200' },
  { id: '3', name: 'فرع الدمام', code: 'DMM-001', costCenter: 'CC-300' },
  { id: '4', name: 'فرع المدينة المنورة', code: 'MED-001', costCenter: 'CC-400' },
]

export const getBranchById = (id: string) => branches.find((b) => b.id === id)
export const getBranchName = (id: string) => getBranchById(id)?.name ?? ''
