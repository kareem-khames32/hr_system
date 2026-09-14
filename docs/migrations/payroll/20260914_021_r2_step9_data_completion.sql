-- 20260914_021 (مسار R2، خطة المراجعة الخطوة 9): استكمال بنود بيانات التشغيل التي تركها ترحيل 015 «بلا تغيير».
-- قرار المالك 14 سبتمبر: بيانات hr_system الحالية بيانات اختبار؛ نصلح ما يوقف أول مسير حقيقي ولا نحذف ولا نخترع قيمًا مالية لموظف.
-- كل تعديل مشروط بالحالة القديمة بالضبط (إعادة التشغيل لا تغير شيئًا)، ولا يُحذف أي صف.
-- التفصيل والأسباب: PAYROLL_DECISIONS_2026-09-14.md القسم 13. الإثبات: node api/scripts/db-step9-check.cjs
SET NOCOUNT ON;

-- (1) اسم الشركة فارغ: قيمة مؤقتة واضحة (نفس COMPANY_NAME_PLACEHOLDER في api/src/common/data-placeholders.ts).
--     الخطاب الرسمي يعاملها كحقل ناقص (letter-issuance.ts) فلا يُصدر خطاب باسم مؤقت؛ الشاشات لا تظهر فارغة.
IF NOT EXISTS (SELECT 1 FROM dbo.requests_config WHERE [key] = N'company.name')
  INSERT INTO dbo.requests_config ([key], [value]) VALUES (N'company.name', N'اسم الشركة غير مُدخل (يُستكمل من الإعدادات)');

UPDATE dbo.requests_config SET [value] = N'اسم الشركة غير مُدخل (يُستكمل من الإعدادات)'
WHERE [key] = N'company.name' AND ([value] IS NULL OR LTRIM(RTRIM([value])) = N'');
GO

-- (2) المسمى الوظيفي الفارغ: قيمة مؤقتة واضحة (نفس JOB_TITLE_PLACEHOLDER) مع سطر تدقيق TITLE لكل موظف
--     في سجل تغييرات الملف (نفس شكل recordEmployeeChange). المسمى الحقيقي يُدخل من ملف الموظف أو طلب تغيير المسمى.
INSERT INTO dbo.employee_status_history (employeeId, oldStatus, newStatus, changedAt, reason, requestId, changeType, fieldName, oldValue, newValue, changedByUserId)
SELECT e.id, NULL, N'change', GETDATE(),
  N'ترحيل 20260914_021 (الخطوة 9): المسمى الوظيفي كان فارغًا؛ كُتبت قيمة مؤقتة واضحة حتى إدخال المسمى الحقيقي',
  NULL, N'TITLE', N'jobTitle', e.jobTitle, N'مسمى وظيفي غير مُدخل (يُستكمل)', NULL
FROM dbo.employees e
WHERE e.jobTitle IS NULL OR LTRIM(RTRIM(e.jobTitle)) = N'';

UPDATE dbo.employees SET jobTitle = N'مسمى وظيفي غير مُدخل (يُستكمل)'
WHERE jobTitle IS NULL OR LTRIM(RTRIM(jobTitle)) = N'';
GO

-- (3) بيانات العقود ناقصة لمعظم الموظفين النشطين (نوع العقد و/أو نهايته): يُعطَّل «تجديد عقد» حتى تكتمل.
--     «تغيير نوع العقد» يبقى مفعّلًا لأنه طريق استكمال البيانات. الصف باقٍ ويُعاد تفعيله من «الإعدادات ← أنواع الطلبات».
--     لا يُعطَّل النوع وعليه طلب مفتوح (يبقى الطلب بلا مسار)؛ الحالة تُرفض صراحةً.
IF EXISTS (SELECT 1 FROM dbo.requests WHERE typeCode = N'CONTRACT_RENEWAL'
    AND status IN (N'DRAFT', N'SUBMITTED', N'UNDER_REVIEW', N'RETURNED_FOR_INFO', N'APPROVED', N'IN_EXECUTION'))
  AND EXISTS (SELECT 1 FROM dbo.request_types WHERE code = N'CONTRACT_RENEWAL' AND isActive = 1)
  THROW 54101, N'ترحيل 021: يوجد طلب تجديد عقد مفتوح؛ أغلقه قبل تعطيل النوع', 1;

UPDATE dbo.request_types SET isActive = 0
WHERE code = N'CONTRACT_RENEWAL' AND isActive = 1
  AND EXISTS (SELECT 1 FROM dbo.employees
    WHERE status = N'active' AND (contractType IS NULL OR (contractType IN (N'fixed_term', N'seasonal') AND contractEnd IS NULL)));
GO

-- (4) أرضية الصافي وسقف الخصم قبل أول مسير فيه أقساط (SRS DD-11: السقف 50% من الأجر الثابت المستحق؛
--     التقرير: الصافي لا يقل عن 50% منه). الحد الأدنى المطلق للصافي يبقى null (لا مبلغ مخترع بعملة الموظف).
--     القيمة null فقط تُستبدل؛ أي قيمة ضبطها المالك لا تُلمس. الحدود تُتحقق في PATCH /settings/config.
IF NOT EXISTS (SELECT 1 FROM dbo.requests_config WHERE [key] = N'payroll.policy.net_floor_pct')
  INSERT INTO dbo.requests_config ([key], [value]) VALUES (N'payroll.policy.net_floor_pct', N'50');
IF NOT EXISTS (SELECT 1 FROM dbo.requests_config WHERE [key] = N'payroll.policy.max_deduction_pct_of_gross')
  INSERT INTO dbo.requests_config ([key], [value]) VALUES (N'payroll.policy.max_deduction_pct_of_gross', N'50');

UPDATE dbo.requests_config SET [value] = N'50'
WHERE [key] IN (N'payroll.policy.net_floor_pct', N'payroll.policy.max_deduction_pct_of_gross')
  AND ([value] IS NULL OR LTRIM(RTRIM([value])) IN (N'', N'null'));
GO

-- (5) فحص نهائي داخل معاملة الملف: أي بند لم يصل لحالته يرجّع الملف كله.
IF EXISTS (SELECT 1 FROM dbo.requests_config WHERE [key] = N'company.name' AND ([value] IS NULL OR LTRIM(RTRIM([value])) = N''))
  OR EXISTS (SELECT 1 FROM dbo.employees WHERE jobTitle IS NULL OR LTRIM(RTRIM(jobTitle)) = N'')
  OR EXISTS (SELECT 1 FROM dbo.requests_config WHERE [key] IN (N'payroll.policy.net_floor_pct', N'payroll.policy.max_deduction_pct_of_gross')
    AND ([value] IS NULL OR LTRIM(RTRIM([value])) IN (N'', N'null')))
  THROW 54102, N'ترحيل 021: أحد بنود الخطوة 9 لم يصل لحالته المقررة', 1;
