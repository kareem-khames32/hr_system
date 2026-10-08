-- 20261011_182: لغة عرض الواجهة لكل حساب (خطة التنفيذ — B6.2: الجزء أ).
-- عمود جديد على users (يقبل الفراغ ومن غير افتراضي):
--   language nvarchar(5): 'ar' أو 'en'. الفاضي = عربي (سلوك النهارده بالحرف).
-- مفيش تعبئة: كل الحسابات الموجودة بتفضل عربي.
-- الكود بيشتغل قبل الترحيل ده: العمود برّه قراءة وكتابة الحساب، وتغيير اللغة بيترفض برسالة.
-- إضافي فقط: بلا حذف. آمن للتكرار. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.users', N'U') IS NULL
  THROW 182001, N'20261011_182: جدول users مش موجود', 1;
IF COL_LENGTH(N'dbo.users', N'language') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.users', N'U') AND c.[name] = N'language'
    AND c.[system_type_id] = TYPE_ID(N'nvarchar') AND c.[user_type_id] = TYPE_ID(N'nvarchar') AND c.[max_length] = 10 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 182002, N'20261011_182: عمود users.language موجود وشكله مش nvarchar(5) NULL من غير افتراضي', 1;
GO

IF COL_LENGTH(N'dbo.users', N'language') IS NULL
  ALTER TABLE dbo.users ADD [language] nvarchar(5) NULL;
GO

-- تحقق بعد التطبيق
IF COL_LENGTH(N'dbo.users', N'language') IS NULL
  THROW 182003, N'20261011_182: العمود ماتضافش', 1;
GO

PRINT N'20261011_182: تم — users.language';
GO
