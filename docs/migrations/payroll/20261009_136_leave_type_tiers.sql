-- 20261009_136: شرائح الإجازة السنوية وأقصى مرات الإجازة طول الخدمة (خطة التنفيذ — B4.5: الجزء ج).
-- عمودين جداد على leave_types (يقبلوا الفراغ ومن غير افتراضي):
--   entitlementTiers nvarchar(max): شرائح السنوية بمدة الخدمة والسن (JSON). الفاضي = أيام النوع لكل الموظفين زي الأول.
--   maxTimesInService int: أقصى مرات لإجازة المناسبة طول الخدمة. الفاضي = من غير حد (و«مرة واحدة طول الخدمة» زي ما هي).
-- مفيش تعبئة: كل الأنواع الموجودة بتفضل من غير شرائح ومن غير حد مرات (سلوك النهارده بالحرف).
-- الكود بيشتغل قبل الترحيل ده: العمودين برّه قراءة وكتابة نوع الإجازة، والحفظ بقيمة ليهم بيترفض برسالة.
-- إضافي فقط: بلا حذف. آمن للتكرار. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.leave_types', N'U') IS NULL
  THROW 136001, N'20261009_136: جدول leave_types مش موجود', 1;
IF COL_LENGTH(N'dbo.leave_types', N'entitlementTiers') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.leave_types', N'U') AND c.[name] = N'entitlementTiers'
    AND c.[system_type_id] = TYPE_ID(N'nvarchar') AND c.[user_type_id] = TYPE_ID(N'nvarchar') AND c.[max_length] = -1 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 136002, N'20261009_136: عمود leave_types.entitlementTiers موجود وشكله مش nvarchar(max) NULL من غير افتراضي', 1;
IF COL_LENGTH(N'dbo.leave_types', N'maxTimesInService') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.leave_types', N'U') AND c.[name] = N'maxTimesInService'
    AND c.[system_type_id] = TYPE_ID(N'int') AND c.[user_type_id] = TYPE_ID(N'int') AND c.[max_length] = 4 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 136003, N'20261009_136: عمود leave_types.maxTimesInService موجود وشكله مش int NULL من غير افتراضي', 1;
GO

IF COL_LENGTH(N'dbo.leave_types', N'entitlementTiers') IS NULL
  ALTER TABLE dbo.leave_types ADD [entitlementTiers] nvarchar(max) NULL;
GO

IF COL_LENGTH(N'dbo.leave_types', N'maxTimesInService') IS NULL
  ALTER TABLE dbo.leave_types ADD [maxTimesInService] int NULL;
GO

-- تحقق بعد التطبيق
IF COL_LENGTH(N'dbo.leave_types', N'entitlementTiers') IS NULL OR COL_LENGTH(N'dbo.leave_types', N'maxTimesInService') IS NULL
  THROW 136004, N'20261009_136: العمودين ماتضافوش', 1;
GO

PRINT N'20261009_136: تم — leave_types.entitlementTiers و leave_types.maxTimesInService';
GO
