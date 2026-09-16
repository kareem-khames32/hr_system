-- 20260916_034 (مسار الحساب — موجة 16 سبتمبر، القرار أ1): شرائح التأخير تعيش داخل معادلة الرواتب وحدها.
-- قبل هذه الموجة: المعادلة التي تترك latenessTierSetId فارغًا كانت تأخذ «مجموعة شرائح شهر المسير» (الاختيار بالشهر).
-- بعدها: اللقطة تقرأ latenessTierSetId من المعادلة فقط، وفارغ = بلا شرائح (الخصم بالدقيقة).
-- لذلك يعبّئ هذا الترحيل كل معادلة نشطة قيمتها NULL بالجدول الذي كانت مسيراتها تحلّه اليوم بالضبط:
-- أحدث مجموعة مفعّلة يسري شهرها في آخر شهر مسير غير ملغى لتلك المعادلة (أو الشهر الجاري لمعادلة بلا مسيرات) —
-- وهو نفس ما كانت ترجعه readPayrollLatenessTierSetForPeriod، فلا يتغير أي حساب قائم ولا أي لقطة محفوظة.
-- إضافي فقط: UPDATE واحد بقرار موثق. بلا DROP وبلا حذف؛ جدولا الشرائح يبقيان لأن لقطات المسيرات المعتمدة تشير إليهما.
-- المعادلات غير النشطة تُترك كما هي، والمعادلة التي تحمل اختيارًا صريحًا (13 و14 حيًّا) لا تُمس.
SET NOCOUNT ON;

IF COL_LENGTH(N'dbo.payroll_policies', N'latenessTierSetId') IS NULL
  THROW 56101, N'العمود payroll_policies.latenessTierSetId غير موجود؛ يجب تطبيق ترحيل 20260915_033 قبل هذا الملف', 1;
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
 WHERE p.[isActive] = 1
   AND p.[latenessTierSetId] IS NULL
   AND EXISTS (
         SELECT 1
           FROM dbo.[payroll_lateness_tier_sets] s2
          WHERE s2.[isActive] = 1
            AND s2.[effectivePeriod] <= COALESCE(
                  (SELECT MAX(r2.[period]) FROM dbo.[payroll_runs] r2
                    WHERE r2.[policyId] = p.[id] AND r2.[status] <> N'CANCELLED'),
                  CONVERT(nchar(7), GETDATE(), 126)));
GO
