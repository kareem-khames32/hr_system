-- 20260926_070: «تسري على» للعطلة الرسمية (طلب المالك 26 سبتمبر: «اقدر اخصص الاجازات الرسمية علي ناس معينه»).
-- المشكلة: العطلة الرسمية كانت بتسري على كل الناس في دولتها — مفيش طريقة تقول «العطلة دي لفرع المعادي بس» أو «لقسم
--   المبيعات» أو «للموظفين دول بالاسم» (زي عيد ديني لموظفين بعينهم). فكانت يا للكل يا مفيش.
-- الحل: عمود واحد public_holidays.audience nvarchar(max) NULL = JSON بنفس شكل منتقي الاستهداف الموحّد:
--   {"level":"branch","branchId":3} أو أقسام/فرق/موظفين من الفرع (api/src/attendance/holiday-audience.ts).
--   التقويم بيحسب العطلة المخصصة لمين تخصه بس؛ الباقي يومه عادي (شغل ← غياب لو مابصمش، والإجازة بتعدّه).
--   بيدخل في نسخة التقويم العام المؤرخة (attendance_rule_versions / CALENDAR_GLOBAL) للعطلة المخصصة بس.
-- NULL = للكل: السلوك القديم بالحرف لكل العطلات الموجودة — ولقطة العطلة اللي للكل مابتاخدش المفتاح خالص،
--   فبصمات نسخ التقويم الموجودة والقيم الحالية ماتتغيرش (لا انحراف، والحساب المالي الصارم شغال زي ما هو).
-- إضافي فقط: بلا حذف ولا تعبئة رجعية ولا تغيير على أي عمود أو صف قائم. آمن للتكرار بحارس COL_LENGTH.
-- عمود nullable بلا قيد افتراضي عشان فرق المخطط يبقى صفرًا مع الكيان (PublicHoliday.audience). متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.public_holidays', N'audience') IS NULL
  ALTER TABLE dbo.public_holidays ADD [audience] nvarchar(max) NULL;
GO

-- تحقق: العمود موجود بنوعه (nvarchar(max) = max_length -1) ويقبل الفراغ ومن غير قيمة افتراضية
IF COL_LENGTH(N'dbo.public_holidays', N'audience') IS NULL
  THROW 70001, N'20260926_070: عمود audience ناقص في public_holidays', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.public_holidays')
               AND name = N'audience' AND system_type_id = TYPE_ID(N'nvarchar'))
  THROW 70002, N'20260926_070: audience لازم يكون nvarchar', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.public_holidays')
               AND name = N'audience' AND max_length = -1)
  THROW 70003, N'20260926_070: audience لازم يكون nvarchar(max)', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.public_holidays')
               AND name = N'audience' AND is_nullable = 1 AND default_object_id = 0)
  THROW 70004, N'20260926_070: audience لازم يقبل الفراغ من غير قيمة افتراضية (NULL = للكل)', 1;
GO
