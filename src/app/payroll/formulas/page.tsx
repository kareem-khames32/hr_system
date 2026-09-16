import { redirect } from 'next/navigation'

// أ1 (قرار المالك 16 سبتمبر): «القيم العامة للخصومات» انتهت كشاشة — شرائح التأخير صارت داخل كل معادلة رواتب،
// ومعامل الغياب العام صار سطرًا واحدًا في شاشة المعادلات. اللينك القديم يوديك لمكانها الجديد.
export default function PayrollFormulasPage() {
  redirect('/payroll/policies')
}
