'use client'

interface Department {
  id: string
  name: string
  employees: number
  present: number
  absent: number
  leave: number
}

const departments: Department[] = [
  { id: '1', name: 'تقنية المعلومات', employees: 45, present: 40, absent: 2, leave: 3 },
  { id: '2', name: 'الموارد البشرية', employees: 12, present: 11, absent: 0, leave: 1 },
  { id: '3', name: 'المالية', employees: 18, present: 16, absent: 1, leave: 1 },
  { id: '4', name: 'المبيعات', employees: 52, present: 45, absent: 3, leave: 4 },
  { id: '5', name: 'التسويق', employees: 28, present: 25, absent: 1, leave: 2 },
  { id: '6', name: 'خدمة العملاء', employees: 35, present: 30, absent: 2, leave: 3 },
  { id: '7', name: 'العمليات', employees: 58, present: 48, absent: 4, leave: 6 },
]

export default function DepartmentStats() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800">إحصائيات الأقسام</h3>
        <button className="text-sm text-primary-500 hover:text-primary-600 font-medium">
          عرض التفاصيل
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="text-right px-4 py-3 rounded-r-xl">القسم</th>
              <th className="text-center px-4 py-3">الموظفين</th>
              <th className="text-center px-4 py-3">الحاضرين</th>
              <th className="text-center px-4 py-3">غائب</th>
              <th className="text-center px-4 py-3">إجازة</th>
              <th className="text-center px-4 py-3 rounded-l-xl">نسبة الحضور</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => {
              const attendanceRate = Math.round((dept.present / dept.employees) * 100)
              return (
                <tr key={dept.id} className="table-row">
                  <td className="table-cell font-medium text-gray-800">{dept.name}</td>
                  <td className="table-cell text-center">{dept.employees}</td>
                  <td className="table-cell text-center">
                    <span className="text-success-600 font-medium">{dept.present}</span>
                  </td>
                  <td className="table-cell text-center">
                    <span className="text-danger-600 font-medium">{dept.absent}</span>
                  </td>
                  <td className="table-cell text-center">
                    <span className="text-warning-600 font-medium">{dept.leave}</span>
                  </td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            attendanceRate >= 90
                              ? 'bg-success-500'
                              : attendanceRate >= 75
                              ? 'bg-warning-500'
                              : 'bg-danger-500'
                          }`}
                          style={{ width: `${attendanceRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600">{attendanceRate}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
