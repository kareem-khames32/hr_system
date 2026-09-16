-- 20260916_053: الهيكل التنظيمي — «الإدارة التنفيذية» والسكرتير التنفيذي.
-- عمودان على departments: isExecutive (قسم واحد في الشركة، مديره الرئيس التنفيذي) وexecutiveSecretaryEmployeeId
-- (السكرتير التنفيذي، تابع للرئيس التنفيذي بس ومش أب لحد). بيتضبطوا من إعدادات الأقسام بحساب على مستوى الشركة.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية (كل الأقسام الحالية isExecutive = 0).
-- اسم قيد القيمة الافتراضية مطابق لما تولّده TypeORM حتى يبقى فرق المخطط صفرًا.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.departments', N'isExecutive') IS NULL
  ALTER TABLE dbo.departments ADD [isExecutive] bit NOT NULL CONSTRAINT [DF_bdeab06f597bf08bd6cba892c35] DEFAULT 0;
GO

IF COL_LENGTH(N'dbo.departments', N'executiveSecretaryEmployeeId') IS NULL
  ALTER TABLE dbo.departments ADD [executiveSecretaryEmployeeId] int NULL;
GO

-- تحقق: العمودان موجودان
IF COL_LENGTH(N'dbo.departments', N'isExecutive') IS NULL OR COL_LENGTH(N'dbo.departments', N'executiveSecretaryEmployeeId') IS NULL
  THROW 56531, N'20260916_053: أعمدة الإدارة التنفيذية ناقصة في departments', 1;
GO
