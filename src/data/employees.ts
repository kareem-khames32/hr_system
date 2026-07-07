// طبقة بيانات مشتركة — قائمة الموظفين (Mock موحّد يُستخدم في كل الشاشات بدل التكرار)
// عند بناء الـ Backend تُستبدل هذه القائمة باستدعاء API واحد

export interface EmployeeOption {
  id: string
  name: string
  nameEn: string
  position: string
  department: string
  branchId: string
}

export const employees: EmployeeOption[] = [
  { id: 'EMP001', name: 'محمد أحمد السعيد', nameEn: 'Mohammed Alsaeed', position: 'مدير فرع', department: 'الإدارة', branchId: '1' },
  { id: 'EMP002', name: 'عبدالله محمد العمري', nameEn: 'Abdullah Alamri', position: 'مدير فرع', department: 'الإدارة', branchId: '2' },
  { id: 'EMP003', name: 'سالم عبدالرحمن القحطاني', nameEn: 'Salem Alqahtani', position: 'مدير فرع', department: 'الإدارة', branchId: '3' },
  { id: 'EMP004', name: 'فهد سعد الحربي', nameEn: 'Fahad Alharbi', position: 'مدير فرع', department: 'الإدارة', branchId: '4' },
  { id: 'EMP005', name: 'أحمد محمد علي', nameEn: 'Ahmed Ali', position: 'مطور برمجيات أول', department: 'تقنية المعلومات', branchId: '1' },
  { id: 'EMP006', name: 'سارة أحمد الزهراني', nameEn: 'Sara Alzahrani', position: 'أخصائية موارد بشرية', department: 'الموارد البشرية', branchId: '1' },
  { id: 'EMP007', name: 'خالد عبدالعزيز النمر', nameEn: 'Khaled Alnamer', position: 'محاسب أول', department: 'المالية', branchId: '1' },
  { id: 'EMP008', name: 'نورة سعيد الغامدي', nameEn: 'Noura Alghamdi', position: 'مديرة التسويق', department: 'التسويق', branchId: '2' },
  { id: 'EMP009', name: 'عمر ياسر الشهري', nameEn: 'Omar Alshehri', position: 'مشرف مبيعات', department: 'المبيعات', branchId: '2' },
  { id: 'EMP010', name: 'ليلى حسن العتيبي', nameEn: 'Laila Alotaibi', position: 'محللة أنظمة', department: 'تقنية المعلومات', branchId: '3' },
]

export const getEmployeeById = (id: string) =>
  employees.find((e) => e.id === id)

export const getEmployeeName = (id: string) =>
  getEmployeeById(id)?.name ?? ''
