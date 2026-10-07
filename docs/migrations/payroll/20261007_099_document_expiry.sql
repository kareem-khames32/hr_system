-- 20261007_099: صلاحية المستندات والتنبيهات (خطة التنفيذ — B2.15 الجزء أ).
-- أعمدة جديدة بس، كلها تقبل الفراغ ومن غير افتراضي:
--   doc_types.hasExpiry bit: النوع «له تاريخ انتهاء» — تاريخ الانتهاء بيبقى إلزامي لمستنداته. الفاضي أو الصفر = اختياري (السلوك القايم).
--   doc_types.alertDays nvarchar(100): أيام التنبيه قبل الانتهاء («60,30,7»). الفاضي = 30 يوم (نافذة حدث «مستند هينتهي» القايمة).
--   doc_types.ownerRole nvarchar(40): الدور الوظيفي المسؤول عن التجديد — بتتفتح عليه مهمة «تجديد مستند». الفاضي = من غير مهمة.
--   employee_documents.renewalTaskId int: مهمة تجديد المستند المفتوحة (tasks.id). الفاضي = مفيش.
-- الكود بيشتغل قبل الترحيل ده: الأعمدة برّه قراءة وكتابة الكيانات، والإعدادات على افتراضيها (تنبيه على 30 يوم ومن غير مهمة ولا إلزام تاريخ)،
-- وحفظ إعدادات النوع مرفوض برسالة الترحيل.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية (كل الأنواع والمستندات القايمة فاضية = السلوك القايم). آمن للتكرار بحراسات COL_LENGTH.
-- التحقق: كل عمود بنوعه وطوله وقابلية الفراغ ومن غير افتراضي ولا محسوب — مرة قبل أي تغيير (عمود موجود بنفس الاسم وبشكل تاني = الترحيل
-- بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF COL_LENGTH(N'dbo.doc_types', N'hasExpiry') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.doc_types', N'U') AND c.[name] = N'hasExpiry'
    AND c.[system_type_id] = TYPE_ID(N'bit') AND c.[user_type_id] = TYPE_ID(N'bit') AND c.[max_length] = 1 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 99001, N'20261007_099: عمود doc_types.hasExpiry موجود وشكله مش bit NULL من غير افتراضي', 1;
IF COL_LENGTH(N'dbo.doc_types', N'alertDays') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.doc_types', N'U') AND c.[name] = N'alertDays'
    AND c.[system_type_id] = TYPE_ID(N'nvarchar') AND c.[user_type_id] = TYPE_ID(N'nvarchar') AND c.[max_length] = 200 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 99002, N'20261007_099: عمود doc_types.alertDays موجود وشكله مش nvarchar(100) NULL من غير افتراضي', 1;
IF COL_LENGTH(N'dbo.doc_types', N'ownerRole') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.doc_types', N'U') AND c.[name] = N'ownerRole'
    AND c.[system_type_id] = TYPE_ID(N'nvarchar') AND c.[user_type_id] = TYPE_ID(N'nvarchar') AND c.[max_length] = 80 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 99003, N'20261007_099: عمود doc_types.ownerRole موجود وشكله مش nvarchar(40) NULL من غير افتراضي', 1;
IF COL_LENGTH(N'dbo.employee_documents', N'renewalTaskId') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.employee_documents', N'U') AND c.[name] = N'renewalTaskId'
    AND c.[system_type_id] = TYPE_ID(N'int') AND c.[user_type_id] = TYPE_ID(N'int') AND c.[max_length] = 4 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 99004, N'20261007_099: عمود employee_documents.renewalTaskId موجود وشكله مش int NULL من غير افتراضي', 1;
GO

IF COL_LENGTH(N'dbo.doc_types', N'hasExpiry') IS NULL
  ALTER TABLE dbo.doc_types ADD [hasExpiry] bit NULL;
GO

IF COL_LENGTH(N'dbo.doc_types', N'alertDays') IS NULL
  ALTER TABLE dbo.doc_types ADD [alertDays] nvarchar(100) NULL;
GO

IF COL_LENGTH(N'dbo.doc_types', N'ownerRole') IS NULL
  ALTER TABLE dbo.doc_types ADD [ownerRole] nvarchar(40) NULL;
GO

IF COL_LENGTH(N'dbo.employee_documents', N'renewalTaskId') IS NULL
  ALTER TABLE dbo.employee_documents ADD [renewalTaskId] int NULL;
GO

-- تحقق بعد التنفيذ
IF NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.doc_types', N'U') AND c.[name] = N'hasExpiry'
    AND c.[system_type_id] = TYPE_ID(N'bit') AND c.[user_type_id] = TYPE_ID(N'bit') AND c.[max_length] = 1 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 99011, N'20261007_099: عمود doc_types.hasExpiry ناقص أو شكله غلط (المطلوب bit NULL)', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.doc_types', N'U') AND c.[name] = N'alertDays'
    AND c.[system_type_id] = TYPE_ID(N'nvarchar') AND c.[user_type_id] = TYPE_ID(N'nvarchar') AND c.[max_length] = 200 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 99012, N'20261007_099: عمود doc_types.alertDays ناقص أو شكله غلط (المطلوب nvarchar(100) NULL)', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.doc_types', N'U') AND c.[name] = N'ownerRole'
    AND c.[system_type_id] = TYPE_ID(N'nvarchar') AND c.[user_type_id] = TYPE_ID(N'nvarchar') AND c.[max_length] = 80 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 99013, N'20261007_099: عمود doc_types.ownerRole ناقص أو شكله غلط (المطلوب nvarchar(40) NULL)', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.employee_documents', N'U') AND c.[name] = N'renewalTaskId'
    AND c.[system_type_id] = TYPE_ID(N'int') AND c.[user_type_id] = TYPE_ID(N'int') AND c.[max_length] = 4 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 99014, N'20261007_099: عمود employee_documents.renewalTaskId ناقص أو شكله غلط (المطلوب int NULL)', 1;
GO
