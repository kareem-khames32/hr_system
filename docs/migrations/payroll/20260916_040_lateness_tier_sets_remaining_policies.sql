-- 20260916_040 (مسار الحساب — إصلاح مراجعة موجة 16 سبتمبر، القرار أ1): المعادلات الموقوفة تأخذ مجموعة شرائحها أيضًا.
-- ترحيل 034 عبّأ المعادلات النشطة وحدها، فبقيت الموقوفة (2 و9 و10 على قاعدة الشركة) بـNULL.
-- ومعنى NULL بعد أ1 صار «بلا شرائح: التأخير يُخصم بالدقيقة»، فإعادة تفعيل أي معادلة منها كانت تغيّر خصم التأخير صامتًا.
-- هذا الملف يطبّق على المتبقي نفس قاعدة 034 بالضبط: أحدث مجموعة مفعّلة يسري شهرها في آخر شهر مسير غير ملغى لتلك
-- المعادلة (أو الشهر الجاري لمعادلة بلا مسيرات) — وهو ما كانت تحلّه readPayrollLatenessTierSetForPeriod قبل الموجة.
-- إضافي فقط: UPDATE واحد. بلا DROP وبلا حذف، ولا يمس معادلة تحمل اختيارًا صريحًا (latenessTierSetId غير NULL).
SET NOCOUNT ON;

IF COL_LENGTH(N'dbo.payroll_policies', N'latenessTierSetId') IS NULL
  THROW 56501, N'العمود payroll_policies.latenessTierSetId غير موجود؛ يجب تطبيق ترحيل 20260915_033 قبل هذا الملف', 1;
GO

UPDATE p
   SET [latenessTierSetId] = (
         SELECT TOP (1) s.[id]
           FROM dbo.[payroll_lateness_tier_sets] s
          WHERE s.[isActive] = 1
            AND s.[effectivePeriod] <= COALESCE(
                  (SELECT MAX(r.[period]) FROM dbo.[payroll_runs] r
                    WHERE r.[policyId] = p.[id] AND r.[status] <> N'CANCELLED'),
                  CONVERT(nchar(7), GETDATE(), 126))
          ORDER BY s.[effectivePeriod] DESC, s.[id] DESC)
  FROM dbo.[payroll_policies] p
 WHERE p.[latenessTierSetId] IS NULL
   AND EXISTS (
         SELECT 1
           FROM dbo.[payroll_lateness_tier_sets] s2
          WHERE s2.[isActive] = 1
            AND s2.[effectivePeriod] <= COALESCE(
                  (SELECT MAX(r2.[period]) FROM dbo.[payroll_runs] r2
                    WHERE r2.[policyId] = p.[id] AND r2.[status] <> N'CANCELLED'),
                  CONVERT(nchar(7), GETDATE(), 126)));
GO

-- تحقق: ما دامت هناك مجموعة مفعّلة واحدة على الأقل، لا تبقى معادلة بلا مجموعة شرائح.
IF EXISTS (SELECT 1 FROM dbo.[payroll_lateness_tier_sets] WHERE [isActive] = 1)
   AND EXISTS (SELECT 1 FROM dbo.[payroll_policies] WHERE [latenessTierSetId] IS NULL)
  THROW 56502, N'بقيت معادلة رواتب بلا مجموعة شرائح تأخير بعد الترحيل', 1;
GO
