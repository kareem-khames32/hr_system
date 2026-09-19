-- 20260919_056: كلمة مرور مؤقتة لحسابات الدخول (الحسابات المنقولة من النظام القديم جات بكلمة غير قابلة للاستخدام).
-- عمودان على users:
--   mustChangePassword  bit NOT NULL افتراضي 0 — المدير عيّن كلمة مؤقتة، وصاحب الحساب لازم يغيّرها بعد أول دخول صح.
--   passwordChangedAt   datetime NULL — آخر تعيين لكلمة المرور على النظام ده (null = لسه ما اتعيّنتش هنا).
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية (كل الحسابات الحالية = 0 / NULL فمحدش يتقفل).
-- اسم القيد الافتراضي مطابق لما تولّده TypeORM حتى يبقى فرق المخطط صفرًا. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.users', N'mustChangePassword') IS NULL
  ALTER TABLE dbo.users ADD [mustChangePassword] bit NOT NULL CONSTRAINT [DF_4a069c6680d61fbb99083c8a0a3] DEFAULT 0;
GO

IF COL_LENGTH(N'dbo.users', N'passwordChangedAt') IS NULL
  ALTER TABLE dbo.users ADD [passwordChangedAt] datetime NULL;
GO

-- تحقق: العمودان موجودان، والقيد الافتراضي باسم TypeORM
IF COL_LENGTH(N'dbo.users', N'mustChangePassword') IS NULL OR COL_LENGTH(N'dbo.users', N'passwordChangedAt') IS NULL
  THROW 56561, N'20260919_056: أعمدة كلمة المرور المؤقتة ناقصة في users', 1;
IF NOT EXISTS (
  SELECT 1 FROM sys.default_constraints dc
  JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
  WHERE dc.parent_object_id = OBJECT_ID(N'dbo.users') AND c.name = N'mustChangePassword' AND dc.name = N'DF_4a069c6680d61fbb99083c8a0a3'
)
  THROW 56562, N'20260919_056: القيد الافتراضي لـ mustChangePassword مش باسم TypeORM', 1;
GO
