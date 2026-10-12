-- 20261012_188: «رقم التحويلة / رقم العمل» على الموظف (إضافات المالك — الدفعة B-ADD.8، 12 أكتوبر 2026).
-- عمود workExtension (nvarchar(10) NULL) على employees: أرقام بس، ومابيتكررش (فهرس فريد على غير الفاضي). هو اللي «الاتصال الداخلي» هيتعمل عليه بعدين.
-- الكود بيشتغل قبل الترحيل ده (الخانة فاضية وحفظ رقم بيقول إن الترحيل ناقص) وبعده.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية. آمن للتكرار بحراسة COL_LENGTH وsys.indexes. متوافق مع SQL Server 2019.
-- اسم الفهرس بالحرف اللي الكيان بيطلعه عشان فرق المخطط يبقى صفرًا: UX_employees_workExtension.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.employees', N'workExtension') IS NULL
  ALTER TABLE dbo.employees ADD [workExtension] nvarchar(10) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_employees_workExtension' AND object_id = OBJECT_ID(N'dbo.employees'))
  CREATE UNIQUE INDEX [UX_employees_workExtension] ON dbo.employees ([workExtension]) WHERE [workExtension] IS NOT NULL;
GO
