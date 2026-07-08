// تصفير بيانات التشغيل — يمسح كل البيانات التجريبية ويبقي:
// حساب الأدمن + الفرع الرئيسي + قسم HR + كتالوجات النظام
// (أنواع الطلبات/السلاسل/الإجازات/الورديات/العطلات/الإعدادات)
// التشغيل: npm run reset
import 'reflect-metadata'
import * as dotenv from 'dotenv'
dotenv.config()

import { DataSource } from 'typeorm'

const ds = new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '1433', 10),
  username: process.env.DB_USERNAME ?? 'sa',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'hr_system',
  options: { trustServerCertificate: true, encrypt: false },
})

// الترتيب مهم — التوابع قبل الأصول (FK)
const WIPE_ALL = [
  'request_approvals',
  'request_attachments',
  'letter_requests',
  'loan_installments',
  'loans',
  'custody_assignments',
  'assets',
  'employee_documents',
  'transfers',
  'promotions',
  'employee_status_history',
  'overtime_entries',
  'attendance_corrections',
  'attendance_days',
  'attendance_punches',
  'weekly_schedule_entries',
  'payroll_items',
  'payroll_runs',
  'leaves',
  'leave_balances',
  'requests',
  'candidates',
]

async function main() {
  await ds.initialize()
  console.log('✓ الاتصال ناجح — بدء التصفير')

  for (const table of WIPE_ALL) {
    await ds.query(`DELETE FROM ${table}`)
    console.log(`  ✓ ${table} فُرِّغ`)
  }

  // المستخدمون: يبقى الأدمن فقط
  await ds.query(`DELETE FROM users WHERE email <> 'admin@company.com'`)
  // الموظفون: يبقى موظف الأدمن فقط (EMP001)
  await ds.query(`DELETE FROM employees WHERE employeeCode <> 'EMP001'`)
  // الفرق كلها، والأقسام غير HR، والفروع غير الرئيسي
  await ds.query(`DELETE FROM teams`)
  await ds.query(`DELETE FROM departments WHERE code <> 'HR'`)
  await ds.query(`DELETE FROM branches WHERE code <> 'CAI-001'`)
  // فك أي إسناد مدير قديم على الفرع/القسم المتبقيين
  const [emp] = await ds.query(
    `SELECT id FROM employees WHERE employeeCode = 'EMP001'`
  )
  await ds.query(
    `UPDATE branches SET managerEmployeeId = ${emp.id} WHERE code = 'CAI-001'`
  )
  await ds.query(
    `UPDATE departments SET managerEmployeeId = ${emp.id} WHERE code = 'HR'`
  )
  console.log('✓ بقي: الأدمن + الفرع الرئيسي + قسم HR')

  // رصيد السنة الحالية لموظف الأدمن (نظيف)
  const year = String(new Date().getFullYear())
  await ds.query(
    `INSERT INTO leave_balances (employeeId, balanceType, entitled, taken, period, openingDays, openingTaken)
     VALUES (${emp.id}, 'annual', 21, 0, '${year}', 0, 0), (${emp.id}, 'sick', 180, 0, '${year}', 0, 0)`
  )

  await ds.destroy()
  console.log('✅ التصفير اكتمل — النظام جاهز لبياناتك الحقيقية')
  console.log('   الدخول: admin@company.com / Admin@123')
}

main().catch((err) => {
  console.error('❌ فشل التصفير:', err.message)
  process.exit(1)
})
