'use strict'
// ===== فحص قرارات الخطوة 9 على قاعدة الشركة (قراءة فقط) =====
// SELECT لكل بند يثبت حالته بعد ترحيل 20260914_015 وإجراءات الـAPI الموثقة في PAYROLL_DECISIONS_2026-09-14.md.
// لا يطبع أي قيمة شخصية أو بنكية أو سرية: معرفات وحالات وأعداد وأطوال فقط.
// التشغيل: node api/scripts/db-step9-check.cjs [--json]
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const mssql = require('../node_modules/mssql')

const CHECKS = [
  ['tier10', 'شريحة التأخير 10 معطلة والشريحتان 6 و8 فعالتان', `SELECT id, fromMinutes, toMinutes, isActive FROM dbo.lateness_tiers ORDER BY id`,
    r => r.find(x => x.id === 10)?.isActive === false && r.filter(x => [6, 8].includes(x.id)).every(x => x.isActive === true)],
  ['overtimeHours', 'قيود الإضافي المسبق السبعة لها ساعات مستحقة مثبتة وحدث LEGACY_HOURS_RESOLVED', `SELECT o.id, o.status, o.hoursRequested, o.hoursActual, o.payableHours,
      (SELECT COUNT(*) FROM dbo.overtime_entry_events e WHERE e.entryId = o.id AND e.eventType = N'LEGACY_HOURS_RESOLVED') AS events
    FROM dbo.overtime_entries o WHERE o.id IN (2, 30, 31, 34, 38, 39, 51) ORDER BY o.id`,
    r => r.length === 7 && r.every(x => x.status === 'APPROVED' && x.payableHours !== null && x.events === 1)],
  ['overtimeUnresolved', 'لا قيد إضافي معتمد بلا ساعات مستحقة (OT_LEGACY_HOURS_UNRESOLVED)', `SELECT COUNT(*) AS n FROM dbo.overtime_entries WHERE status = N'APPROVED' AND payableHours IS NULL AND amountSnapshot IS NULL`,
    r => r[0].n === 0],
  ['overtimeRejectedAligned', 'القيدان 19 و26 مرفوضان بحالة طلبيهما', `SELECT o.id, o.status, r.id AS requestId, r.status AS requestStatus,
      (SELECT COUNT(*) FROM dbo.overtime_entry_events e WHERE e.entryId = o.id AND e.eventType = N'LEGACY_STATUS_ALIGNED') AS events
    FROM dbo.overtime_entries o JOIN dbo.requests r ON r.id = o.requestId WHERE o.id IN (19, 26) ORDER BY o.id`,
    r => r.length === 2 && r.every(x => x.status === 'REJECTED' && x.requestStatus === 'REJECTED' && x.events === 1)],
  ['overtimeSubmittedMismatch', 'لا قيد إضافي SUBMITTED وطلبه مغلق', `SELECT COUNT(*) AS n FROM dbo.overtime_entries o JOIN dbo.requests r ON r.id = o.requestId
    WHERE o.status IN (N'SUBMITTED', N'DETECTED') AND r.status IN (N'REJECTED', N'CANCELLED', N'COMPLETED')`, r => r[0].n === 0],
  ['obligation1', 'القيد المالي 1 ملغى بلا مسير', `SELECT id, type, status, appliedPayrollRunId, appliedAt FROM dbo.employee_obligations WHERE id = 1`,
    r => r.length === 1 && r[0].status === 'CANCELLED' && r[0].appliedPayrollRunId === null],
  ['obligationsAppliedWithoutRun', 'لا قيد مالي APPLIED بلا مسير', `SELECT COUNT(*) AS n FROM dbo.employee_obligations WHERE status = N'APPLIED' AND appliedPayrollRunId IS NULL`, r => r[0].n === 0],
  ['stuckRequests', 'الطلبات 292 و295 و303 لم تعد APPROVED بلا تنفيذ', `SELECT r.id, r.typeCode, r.status, r.destinationRef,
      (SELECT COUNT(*) FROM dbo.request_approvals a WHERE a.requestId = r.id) AS approvals FROM dbo.requests r WHERE r.id IN (292, 295, 303) ORDER BY r.id`,
    r => r.length === 3 && r.every(x => x.status !== 'APPROVED')],
  ['testRole', 'دور الاختبار pr_test_42103 معطل وبلا مستخدمين', `SELECT code, isActive, (SELECT COUNT(*) FROM dbo.users u WHERE u.[role] = r.code) AS users FROM dbo.roles r WHERE code = N'pr_test_42103'`,
    r => r.length === 1 && r[0].isActive === false && r[0].users === 0],
  ['deviceKey', 'مفتاح جهاز البصمة ≥24 حرفًا وليس القيمة المنشورة', `SELECT LEN([value]) AS len, CASE WHEN [value] = N'zk-device-key-change-me' THEN 1 ELSE 0 END AS isPlaceholder
    FROM dbo.requests_config WHERE [key] = N'attendance.device_key'`, r => r.length === 1 && r[0].len >= 24 && r[0].isPlaceholder === 0],
  // بنود قرارها «بلا تغيير حتى بيانات المالك» — الفحص يثبت أن الحالة كما وُثقت (لا قيم مخترعة)
  ['zeroSalary', 'الموظفان 1 و154 بلا راتب أساسي (بلا تغيير — بيانات المالك)', `SELECT id, status, CASE WHEN basicSalary IS NULL THEN 1 ELSE 0 END AS salaryMissing FROM dbo.employees WHERE id IN (1, 154) ORDER BY id`,
    r => r.length === 2, 'recorded'],
  ['companyAndTitles', 'اسم الشركة والمسميات وتاريخ التعيين (بلا تغيير — بيانات المالك)', `SELECT (SELECT LEN(ISNULL([value], '')) FROM dbo.requests_config WHERE [key] = N'company.name') AS companyNameLength,
      (SELECT COUNT(*) FROM dbo.employees WHERE status = N'active') AS active,
      (SELECT COUNT(*) FROM dbo.employees WHERE status = N'active' AND (jobTitle IS NULL OR LTRIM(jobTitle) = N'')) AS activeWithoutJobTitle,
      (SELECT COUNT(*) FROM dbo.employees WHERE status = N'active' AND joinDate IS NULL) AS activeWithoutJoinDate`, r => r.length === 1, 'recorded'],
  ['contracts', 'بيانات العقود (بلا تغيير — بيانات المالك)', `SELECT COUNT(*) AS activeWithoutContract, (SELECT COUNT(*) FROM dbo.employees WHERE status = N'active') AS active
    FROM dbo.employees WHERE status = N'active' AND contractType IS NULL AND contractEnd IS NULL`, r => r.length === 1, 'recorded'],
  ['floorAndCap', 'أرضية الصافي وسقف الخصم (بلا قيمة — قرار المالك/مسار السلف D10)', `SELECT [key], [value] FROM dbo.requests_config
    WHERE [key] IN (N'payroll.policy.net_floor_pct', N'payroll.policy.max_deduction_pct_of_gross', N'payroll.policy.min_net_guarantee', N'loan.insufficient_net_behavior') ORDER BY [key]`,
    r => r.length >= 3, 'recorded'],
  ['roleGrants', 'منح payroll.reopen/cancel وattendance_exemption.* لأدوار (مؤجل لما بعد 8-أ)', `SELECT code, isActive,
      CASE WHEN permissions LIKE N'%payroll.reopen%' THEN 1 ELSE 0 END AS reopen, CASE WHEN permissions LIKE N'%payroll.cancel%' THEN 1 ELSE 0 END AS cancel,
      CASE WHEN permissions LIKE N'%attendance_exemption%' THEN 1 ELSE 0 END AS exemption FROM dbo.roles WHERE permissions NOT LIKE N'%"*"%' ORDER BY id`, r => r.length >= 1, 'recorded'],
  ['runsState', 'حالة المسيرات (لا مسير معتمد أو مصروف قبل استكمال المرحلة ب)', `SELECT status, COUNT(*) AS n FROM dbo.payroll_runs GROUP BY status`, r => r.length >= 1, 'recorded'],
  ['overdueInstallments', 'الأقساط المتأخرة غير المدفوعة (معاينة التحصيل — قرار D10)', `SELECT COUNT(*) AS overdue, COUNT(DISTINCT l.employeeId) AS employees, CONVERT(varchar(10), MIN(i.dueDate), 23) AS oldest
    FROM dbo.loan_installments i JOIN dbo.loans l ON l.id = i.loanId WHERE i.paid = 0 AND i.dueDate < CAST(SYSDATETIME() AS date)`, r => r.length === 1, 'recorded'],
  ['scheduledTransfers', 'النقل المجدول (#3 مرفوض بقاعدة العهدة، #4/#5 مكرران — الخطوة 7)', `SELECT id, employeeId, status, CONVERT(varchar(10), effectiveDate, 23) AS effectiveDate FROM dbo.transfers WHERE status = N'SCHEDULED' ORDER BY id`,
    r => r.length >= 0, 'recorded'],
]

async function main() {
  const pool = await new mssql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD,
    database: env.DB_DATABASE || 'hr_system', options: { encrypt: false, trustServerCertificate: true, appName: 'HR Step9 Check (read-only)' }, connectionTimeout: 15000 }).connect()
  const results = []
  try {
    for (const [id, label, query, predicate, kind = 'decision'] of CHECKS) {
      const rows = (await pool.request().query(query)).recordset
      results.push({ id, label, kind, ok: !!predicate(rows), rows })
    }
  } finally { await pool.close() }
  if (process.argv.includes('--json')) console.log(JSON.stringify({ database: env.DB_DATABASE, checkedAt: new Date().toISOString(), results }, null, 2))
  else for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'} [${r.kind}] ${r.id}: ${r.label}\n     ${JSON.stringify(r.rows)}`)
  if (results.some(r => !r.ok)) process.exitCode = 1
}

main().catch(error => { console.error('ERROR: ' + String(error.message).split(env.DB_PASSWORD || ' ').join('***')); process.exitCode = 1 })
