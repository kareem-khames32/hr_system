-- 20260926_069: استثناءات أيام الراحة جوه جدول العمل نفسه (قرار المالك 26 سبتمبر).
-- المشكلة: جدول «الجمعة والسبت راحة ماعدا آخر سبت في الشهر» ماكانش ليه مكان يتحفظ فيه «ماعدا آخر سبت» —
--   جدول العمل بيشيل أيام الراحة بس، والقاعدة الاستثنائية («آخر سبت = دوام») أصغر مستوى ليها الفرع. فلو اتعملت
--   للشركة بتقلب آخر سبت يوم شغل لأي حد السبت عنده راحة، ولو اتشالت آخر سبت بيرجع راحة لموظفي الجدول ده والجدول
--   الأسبوعي بيكتب عليه «إجازة» ومايسمحش بوردية.
-- الحل: عمود JSON على work_schedules بيشيل استثناءات الجدول (اليوم، التكرار: كل/الأول…الرابع/الأخير، دوام/راحة،
--   وأساس الشهر: المالي 23→22 أو الميلادي). بيدخل في نسخة الجدول المؤرخة (attendance_rule_versions) زي weekendDays
--   بالظبط، فتعديله بتاريخ سريان وسبب، والتقويم بيطبقه لموظفي الجدول بس بعد قواعد الشركة والفرع.
-- NULL = جدول بلا استثناءات: السلوك القديم بالحرف لكل الجداول الموجودة.
-- إضافي فقط: بلا DROP ولا DELETE ولا TRUNCATE ولا تعبئة رجعية ولا تغيير على أي عمود قائم. آمن للتكرار بحارس COL_LENGTH.
-- عمود nullable بلا قيد افتراضي عشان فرق المخطط يبقى صفرًا مع الكيان. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.work_schedules', N'weekendExceptions') IS NULL
  ALTER TABLE dbo.work_schedules ADD [weekendExceptions] nvarchar(1000) NULL;
GO

-- تحقق: العمود موجود بنوعه وطوله وnullable
IF COL_LENGTH(N'dbo.work_schedules', N'weekendExceptions') IS NULL
  THROW 69001, N'20260926_069: عمود weekendExceptions ناقص في work_schedules', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.work_schedules')
               AND name = N'weekendExceptions' AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 2000 AND is_nullable = 1)
  THROW 69002, N'20260926_069: weekendExceptions لازم nvarchar(1000) NULL', 1;
GO
