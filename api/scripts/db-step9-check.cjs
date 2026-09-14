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
  // مسار R2 (ترحيل 20260914_021 + قاعدة الراتب الصفري في payroll-run-salary.ts): البنود التي تركها 015 «بلا تغيير»
  // الراتب لا يُخترع: الفحص يعرض مكونات الراتب الست والسجل الشهري؛ الاستبعاد NO_SALARY_DEFINED يثبته حساب المسير (اختبار + فحص حي).
  ['zeroSalary', 'الموظفان 1 و154: بلا راتب معرّف لشهر المسير يُستبعدان بسبب ظاهر (لا يُخترع راتب)', `SELECT e.id, e.status,
      CASE WHEN ISNULL(e.basicSalary,0) + ISNULL(e.housingAllowance,0) + ISNULL(e.transportAllowance,0) + ISNULL(e.phoneAllowance,0)
        + ISNULL(e.workNatureAllowance,0) + ISNULL(e.otherAllowance,0) = 0 THEN 1 ELSE 0 END AS fileGrossZero,
      (SELECT COUNT(*) FROM dbo.employee_salary_history_versions v WHERE v.employeeId = e.id AND v.contractVersion IS NOT NULL) AS monthlyHistoryVersions,
      (SELECT COUNT(*) FROM dbo.employee_salary_history_versions v WHERE v.employeeId = e.id AND v.contractVersion IS NULL) AS dailyHistoryVersions
    FROM dbo.employees e WHERE e.id IN (1, 154) ORDER BY e.id`,
    r => r.length === 2 && r.every(x => x.fileGrossZero === 1 && x.monthlyHistoryVersions === 0)],
  ['employee1CheckDataRestored', 'الموظف 1: بيانات فحص 13:33 UTC (راتب 19,000 وتعيين وعقد، سبب «0» ومرجع «2») أُعيدت لما قبلها بترحيل 024 بعشرة أسطر تدقيق؛ سجل الأجر اليومي باقٍ ملحقًا', `SELECT
      (SELECT COUNT(*) FROM dbo.employee_status_history WHERE employeeId = 1 AND reason LIKE N'ترحيل 20260914[_]024%') AS restoreAuditRows,
      (SELECT CASE WHEN joinDate IS NULL AND contractStart IS NULL AND contractEnd IS NULL AND currency IS NULL THEN 1 ELSE 0 END FROM dbo.employees WHERE id = 1) AS fileRestored,
      (SELECT [value] FROM dbo.requests_config WHERE [key] = N'payroll.salary_evidence_mode') AS salaryEvidenceMode`,
    r => r.length === 1 && r[0].restoreAuditRows === 10 && r[0].fileRestored === 1],
  ['companyAndTitles', 'اسم الشركة والمسميات بيانات المالك: لا قيمة مؤقتة أو مخترعة (024 أعاد الأصل)؛ الخطابات ومستندات HR ترفض الناقص برسالة عربية', `SELECT
      (SELECT LEN(ISNULL(LTRIM(RTRIM([value])), '')) FROM dbo.requests_config WHERE [key] = N'company.name') AS companyNameLength,
      (SELECT COUNT(*) FROM dbo.requests_config WHERE [key] LIKE N'company.%' AND LTRIM(RTRIM([value])) IN (N'اسم الشركة غير مُدخل (يُستكمل من الإعدادات)', N'مسمى وظيفي غير مُدخل (يُستكمل)')) AS companyPlaceholders,
      (SELECT COUNT(*) FROM dbo.employees WHERE status = N'active') AS active,
      (SELECT COUNT(*) FROM dbo.employees WHERE jobTitle IS NULL OR LTRIM(RTRIM(jobTitle)) = N'') AS withoutJobTitle,
      (SELECT COUNT(*) FROM dbo.employees WHERE status = N'active' AND (jobTitle IS NULL OR LTRIM(RTRIM(jobTitle)) = N'')) AS activeWithoutJobTitle,
      (SELECT COUNT(*) FROM dbo.employees WHERE LTRIM(RTRIM(jobTitle)) IN (N'اسم الشركة غير مُدخل (يُستكمل من الإعدادات)', N'مسمى وظيفي غير مُدخل (يُستكمل)')) AS titlePlaceholders,
      (SELECT COUNT(*) FROM dbo.employee_status_history WHERE changeType = N'TITLE' AND fieldName = N'jobTitle' AND reason LIKE N'ترحيل 20260914[_]024%') AS titleRestoreRows,
      (SELECT COUNT(*) FROM dbo.employees WHERE status = N'active' AND joinDate IS NULL) AS activeWithoutJoinDate`,
    r => r.length === 1 && r[0].companyPlaceholders === 0 && r[0].titlePlaceholders === 0],
  ['contracts', 'بيانات العقود ناقصة ← «تجديد عقد» معطّل حتى تكتمل، و«تغيير نوع العقد» مفعّل لاستكمالها', `SELECT
      (SELECT COUNT(*) FROM dbo.employees WHERE status = N'active') AS active,
      (SELECT COUNT(*) FROM dbo.employees WHERE status = N'active' AND (contractType IS NULL OR (contractType IN (N'fixed_term', N'seasonal') AND contractEnd IS NULL))) AS activeIncomplete,
      (SELECT isActive FROM dbo.request_types WHERE code = N'CONTRACT_RENEWAL') AS renewalActive,
      (SELECT isActive FROM dbo.request_types WHERE code = N'CONTRACT_TYPE_CHANGE') AS typeChangeActive,
      (SELECT COUNT(*) FROM dbo.requests WHERE typeCode = N'CONTRACT_RENEWAL' AND status IN (N'DRAFT', N'SUBMITTED', N'UNDER_REVIEW', N'RETURNED_FOR_INFO', N'APPROVED', N'IN_EXECUTION')) AS openRenewalRequests`,
    r => r.length === 1 && r[0].typeChangeActive === true && (r[0].activeIncomplete === 0 || r[0].renewalActive === false)],
  ['floorAndCap', 'أرضية الصافي وسقف الخصم: null حتى قرار المالك (لا نسبة مخترعة) — مطابقة للبذرة ولنسخة السياسة المنشورة، والحماية الحالية صافٍ غير سالب', `SELECT c.[key], c.[value],
      (SELECT COUNT(*) FROM dbo.payroll_policy_versions v WHERE v.status = N'ACTIVE' AND (v.netFloorPct IS NOT NULL OR v.maxDeductionPctOfGross IS NOT NULL)) AS activeVersionsWithFloorOrCap
    FROM dbo.requests_config c
    WHERE c.[key] IN (N'payroll.policy.net_floor_pct', N'payroll.policy.max_deduction_pct_of_gross', N'payroll.policy.min_net_guarantee', N'loan.insufficient_net_behavior') ORDER BY c.[key]`,
    r => ['payroll.policy.net_floor_pct', 'payroll.policy.max_deduction_pct_of_gross', 'payroll.policy.min_net_guarantee'].every(key => r.find(x => x.key === key)?.value === 'null')
      && r.every(x => x.activeVersionsWithFloorOrCap === 0)],
  // SEC2: المنح بعد إغلاق 8-أ (ترحيلات 016_c1 و017_b2 و019_sec2) — الدور النشط وحده يمنح؛ '*' خارج الفحص
  ['roleGrants', 'منح الأدوار بأقل امتياز: hr_manager يعيد فتح المسير ويلغيه وينشر السياسات ويعتمد الاستثناء، مدير الفرع يطلب الاستثناء فقط، والاعتماد التنفيذي لمدير النظام وحده', `SELECT r.code, r.isActive,
      (SELECT STRING_AGG(CAST(j.[value] AS nvarchar(100)), N',') FROM OPENJSON(r.permissions) j
        WHERE j.[value] IN (N'payroll.reopen', N'payroll.cancel', N'payroll.policy.manage', N'overtime.adjust', N'attendance_exemption.view',
          N'attendance_exemption.manage', N'attendance_exemption.approve', N'attendance_exemption.approve_executive')) AS sensitive
    FROM dbo.roles r WHERE ISJSON(r.permissions) = 1 AND r.permissions NOT LIKE N'%"*"%' ORDER BY r.id`,
    r => {
      const held = code => (r.find(x => x.code === code && x.isActive)?.sensitive ?? '').split(',').filter(Boolean).sort().join(',')
      return held('hr_manager') === 'attendance_exemption.approve,attendance_exemption.manage,attendance_exemption.view,overtime.adjust,payroll.cancel,payroll.policy.manage,payroll.reopen'
        && held('branch_manager') === 'attendance_exemption.manage,attendance_exemption.view'
        && r.filter(x => x.isActive && !['hr_manager', 'branch_manager'].includes(x.code)).every(x => !x.sensitive)
    }],
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
