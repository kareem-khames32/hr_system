-- 20261009_137: الإيقاف الاحتياطي بأجر (خطة التنفيذ — B4.5: الجزء د).
-- عمود جديد على employee_suspensions (يقبل الفراغ ومن غير افتراضي):
--   isPaid bit: 1 = إيقاف احتياطي بأجر (أيامه ماتتخصمش في المسير). الفاضي أو 0 = إيقاف من غير أجر زي الأول.
-- مفيش تعبئة: كل الإيقافات الموجودة بتفضل من غير أجر (سلوك النهارده بالحرف).
-- الكود بيشتغل قبل الترحيل ده: العمود برّه قراءة وكتابة الإيقاف، وتسجيل إيقاف «بأجر» بيترفض برسالة.
-- إضافي فقط: بلا حذف. آمن للتكرار. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.employee_suspensions', N'U') IS NULL
  THROW 137001, N'20261009_137: جدول employee_suspensions مش موجود — طبّق ترحيل 20260916_044 الأول', 1;
IF COL_LENGTH(N'dbo.employee_suspensions', N'isPaid') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.employee_suspensions', N'U') AND c.[name] = N'isPaid'
    AND c.[system_type_id] = TYPE_ID(N'bit') AND c.[user_type_id] = TYPE_ID(N'bit') AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 137002, N'20261009_137: عمود employee_suspensions.isPaid موجود وشكله مش bit NULL من غير افتراضي', 1;
GO

IF COL_LENGTH(N'dbo.employee_suspensions', N'isPaid') IS NULL
  ALTER TABLE dbo.employee_suspensions ADD [isPaid] bit NULL;
GO

-- تحقق بعد التطبيق
IF COL_LENGTH(N'dbo.employee_suspensions', N'isPaid') IS NULL
  THROW 137003, N'20261009_137: العمود ماتضافش', 1;
GO

PRINT N'20261009_137: تم — employee_suspensions.isPaid';
GO
