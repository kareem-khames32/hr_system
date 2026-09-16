-- 20260916_043: تعريفات الفرع (قرار المالك 16 سبتمبر).
-- التعريفات عامة لكل الشركة افتراضيًا، والفرع يقدر يعمل تعريف خاص بيه: أنواع الإجازات، أنواع الطلبات،
-- الورديات، وجداول العمل. (معادلات الرواتب payroll_policies عندها branchId من قبل.)
-- عمود branchId قابل للفراغ: NULL = كل الشركة — فكل الصفوف القائمة تفضل عامة كما هي بلا تعبئة.
-- جمهور نوع الطلب («مين» + «فين») يتخزن في visibleTo نفسه (JSON) بشكل متوافق مع القديم؛ لا تغيير أعمدة له.
-- إضافي فقط: بلا DROP ولا DELETE ولا TRUNCATE ولا UPDATE. قابل لإعادة التشغيل (كل عمود بشرط عدم وجوده).
-- بلا قيود افتراضية (الأعمدة nullable بلا default) فيبقى فرق المخطط مع TypeORM صفرًا.
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.leave_types', 'branchId') IS NULL
  ALTER TABLE dbo.leave_types ADD branchId int NULL;
GO

IF COL_LENGTH('dbo.request_types', 'branchId') IS NULL
  ALTER TABLE dbo.request_types ADD branchId int NULL;
GO

IF COL_LENGTH('dbo.shifts', 'branchId') IS NULL
  ALTER TABLE dbo.shifts ADD branchId int NULL;
GO

IF COL_LENGTH('dbo.work_schedules', 'branchId') IS NULL
  ALTER TABLE dbo.work_schedules ADD branchId int NULL;
GO

IF COL_LENGTH('dbo.leave_types', 'branchId') IS NULL
   OR COL_LENGTH('dbo.request_types', 'branchId') IS NULL
   OR COL_LENGTH('dbo.shifts', 'branchId') IS NULL
   OR COL_LENGTH('dbo.work_schedules', 'branchId') IS NULL
  THROW 56431, N'20260916_043: عمود فرع التعريف ناقص بعد الترحيل', 1;
GO
