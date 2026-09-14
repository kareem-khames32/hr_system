-- 20260914_024 (مسار R2 — إعادة العمل بعد مراجعة S9-data، خطة المراجعة الخطوة 9): تصحيح ما كتبه ترحيل 021 بلا قرار صريح.
-- (1)(2) القيمتان المؤقتتان لاسم الشركة والمسمى الوظيفي ظهرتا كبيانات حقيقية (مستندات HR، تنبيه قوالب الخطابات، بيانات الشركة،
--        قسيمة الراتب، لقطات أعضاء المسير)؛ تُعاد القيمة الأصلية المسجلة في سطر تدقيق 021 (فارغ/NULL) مع سطر تدقيق جديد.
-- (3) أرضية الصافي وسقف الخصم 50/50 كُتبا بلا قرار من المالك (يُسقطان خصومات حضور فوق 50%، والنسخة المنشورة #1 والبذرة null)؛
--     تعود null كما كانت قبل 021 حتى يقرر المالك (PAYROLL_DECISIONS_2026-09-14.md القسم 13).
-- (4) الموظف 1: بيانات فحص كُتبت 13:33 UTC في ثانية واحدة (راتب 19,000 EGP وتعيين وعقد، سبب «0» ومرجع «2») تُعاد لقيم نسخة
--     التجميد 13:24 UTC والقيم القديمة في أسطر التدقيق نفسها، فقط لو القيم الحالية هي قيم الفحص بالضبط ولم يُتخذ قرار أجر بعدها.
-- لا يُحذف أي صف (سجل الأجر اليومي للفحص يبقى سجلًا ملحقًا)، وكل تحديث مشروط بالقيمة القديمة بالضبط؛ إعادة التشغيل لا تغير شيئًا.
-- الإثبات: node api/scripts/db-step9-check.cjs — الاختبار: api/test/r2b-step9-restore-migration.integration.cjs
SET NOCOUNT ON;

-- (1) اسم الشركة: القيمة المؤقتة ← الفارغ الأصلي (نسخة 13:24 UTC: '').
UPDATE dbo.requests_config SET [value] = N''
WHERE [key] = N'company.name' AND LTRIM(RTRIM([value])) = N'اسم الشركة غير مُدخل (يُستكمل من الإعدادات)';
GO

-- (2) المسمى الوظيفي: القيمة المؤقتة ← القيمة القديمة في آخر سطر تدقيق لترحيل 021 (NULL لكل الـ158 على hr_system).
--     لو لم يكن آخر سطر للمسمى من 021 (قيمة مؤقتة حُفظت يدويًا) فالمسمى الحقيقي غير معروف ← NULL.
INSERT INTO dbo.employee_status_history (employeeId, oldStatus, newStatus, changedAt, reason, requestId, changeType, fieldName, oldValue, newValue, changedByUserId)
SELECT e.id, NULL, N'change', GETDATE(),
  N'ترحيل 20260914_024 (الخطوة 9): إرجاع المسمى الأصلي بدل القيمة المؤقتة لترحيل 021 — القيمة المؤقتة ليست مسمى حقيقيًا',
  NULL, N'TITLE', N'jobTitle', e.jobTitle,
  CASE WHEN h.reason LIKE N'ترحيل 20260914[_]021%' THEN h.oldValue ELSE NULL END, NULL
FROM dbo.employees e
OUTER APPLY (SELECT TOP (1) x.reason, CAST(x.oldValue AS nvarchar(max)) AS oldValue FROM dbo.employee_status_history x
  WHERE x.employeeId = e.id AND x.fieldName = N'jobTitle' ORDER BY x.id DESC) h
WHERE LTRIM(RTRIM(e.jobTitle)) = N'مسمى وظيفي غير مُدخل (يُستكمل)';

UPDATE e SET jobTitle = CAST(h.newValue AS nvarchar(100))
FROM dbo.employees e
CROSS APPLY (SELECT TOP (1) x.reason, CAST(x.newValue AS nvarchar(max)) AS newValue FROM dbo.employee_status_history x
  WHERE x.employeeId = e.id AND x.fieldName = N'jobTitle' ORDER BY x.id DESC) h
WHERE LTRIM(RTRIM(e.jobTitle)) = N'مسمى وظيفي غير مُدخل (يُستكمل)' AND h.reason LIKE N'ترحيل 20260914[_]024%';
GO

-- (3) أرضية الصافي وسقف الخصم: '50' الذي كتبه 021 ← 'null' (قيمة البذرة ونسخة 13:24 UTC). أي قيمة أخرى لا تُلمس.
UPDATE dbo.requests_config SET [value] = N'null'
WHERE [key] IN (N'payroll.policy.net_floor_pct', N'payroll.policy.max_deduction_pct_of_gross') AND LTRIM(RTRIM([value])) = N'50';
GO

-- (4) الموظف 1: بيانات فحص 13:33 UTC ← قيم ما قبلها. الشرط: القيم الحالية = قيم الفحص بالضبط، وآخر مراجعة أجر هي مراجعة الفحص
--     اليومية (1، سبب «0»، مرجع «2»)، وآخر تدقيق راتب هو تدقيق الفحص. لا يُلمس لو كان الموظف مشمولًا في مسير غير ملغى.
IF EXISTS (SELECT 1 FROM dbo.employees e
    CROSS APPLY (SELECT TOP (1) v.revision, v.reason, v.evidenceReference, v.contractVersion FROM dbo.employee_salary_history_versions v
      WHERE v.employeeId = e.id ORDER BY v.revision DESC) v
    CROSS APPLY (SELECT TOP (1) a.reason FROM dbo.employee_status_history a WHERE a.employeeId = e.id AND a.changeType = N'SALARY' ORDER BY a.id DESC) a
    WHERE e.id = 1 AND e.basicSalary = 10000 AND e.housingAllowance = 5000 AND e.transportAllowance = 2500 AND e.phoneAllowance = 1000
      AND e.workNatureAllowance = 200 AND e.otherAllowance = 300 AND e.currency = N'EGP'
      AND e.joinDate = '2026-09-01' AND e.contractStart = '2026-09-01' AND e.contractEnd = '2027-08-31' AND e.contractType IS NULL
      AND v.revision = 1 AND v.reason = N'0' AND v.evidenceReference = N'2' AND v.contractVersion IS NULL
      AND a.reason = N'0 — سريان 2026-09-01 — 2')
BEGIN
  IF EXISTS (SELECT 1 FROM dbo.payroll_run_members m JOIN dbo.payroll_runs r ON r.id = m.runId
      WHERE m.employeeId = 1 AND m.membershipStatus = N'INCLUDED' AND r.status <> N'CANCELLED')
    THROW 54112, N'ترحيل 024: الموظف 1 مشمول في مسير غير ملغى بقيم الفحص؛ ألغِ المسير أو قرر الأجر قبل الإرجاع', 1;

  INSERT INTO dbo.employee_status_history (employeeId, oldStatus, newStatus, changedAt, reason, requestId, changeType, fieldName, oldValue, newValue, changedByUserId)
  SELECT 1, NULL, N'change', GETDATE(),
    N'ترحيل 20260914_024 (الخطوة 9): إرجاع بيانات فحص 13:33 UTC (سبب «0» ومرجع «2») إلى قيم ما قبلها — لا راتب مخترع؛ سجل الأجر اليومي للفحص يبقى ملحقًا',
    NULL, f.changeType, f.fieldName, f.oldValue, f.newValue, NULL
  FROM (VALUES
    (N'SALARY', N'basicSalary', N'"10000.00"', CAST(NULL AS nvarchar(40))),
    (N'SALARY', N'housingAllowance', N'"5000.00"', N'"0.00"'),
    (N'SALARY', N'transportAllowance', N'"2500.00"', N'"0.00"'),
    (N'SALARY', N'phoneAllowance', N'"1000.00"', CAST(NULL AS nvarchar(40))),
    (N'SALARY', N'workNatureAllowance', N'"200.00"', CAST(NULL AS nvarchar(40))),
    (N'SALARY', N'otherAllowance', N'"300.00"', N'"0.00"'),
    (N'SALARY', N'currency', N'"EGP"', CAST(NULL AS nvarchar(40))),
    (N'CONTRACT', N'contractStart', N'"2026-09-01"', CAST(NULL AS nvarchar(40))),
    (N'CONTRACT', N'contractEnd', N'"2027-08-31"', CAST(NULL AS nvarchar(40))),
    (N'DATA', N'joinDate', N'"2026-09-01"', CAST(NULL AS nvarchar(40)))
  ) AS f(changeType, fieldName, oldValue, newValue);

  UPDATE dbo.employees SET basicSalary = NULL, housingAllowance = 0, transportAllowance = 0, phoneAllowance = NULL, workNatureAllowance = NULL,
    otherAllowance = 0, currency = NULL, joinDate = NULL, contractStart = NULL, contractEnd = NULL
  WHERE id = 1 AND basicSalary = 10000 AND housingAllowance = 5000 AND transportAllowance = 2500 AND phoneAllowance = 1000
    AND workNatureAllowance = 200 AND otherAllowance = 300 AND currency = N'EGP'
    AND joinDate = '2026-09-01' AND contractStart = '2026-09-01' AND contractEnd = '2027-08-31' AND contractType IS NULL;
END
GO

-- (5) فحص نهائي داخل معاملة الملف: لا قيمة مؤقتة باقية في بيانات الشركة أو المسميات.
IF EXISTS (SELECT 1 FROM dbo.requests_config WHERE [key] LIKE N'company.%'
    AND LTRIM(RTRIM([value])) IN (N'اسم الشركة غير مُدخل (يُستكمل من الإعدادات)', N'مسمى وظيفي غير مُدخل (يُستكمل)'))
  OR EXISTS (SELECT 1 FROM dbo.employees WHERE LTRIM(RTRIM(jobTitle)) IN (N'اسم الشركة غير مُدخل (يُستكمل من الإعدادات)', N'مسمى وظيفي غير مُدخل (يُستكمل)'))
  THROW 54111, N'ترحيل 024: بقيت قيمة مؤقتة في بيانات الشركة أو المسميات الوظيفية', 1;
