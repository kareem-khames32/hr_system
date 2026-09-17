-- 20260917_054: ترحيل النظام القديم — مجال الحسابات والعهد (users-assets).
-- عمود واحد على custody_assignments: notes (ملاحظات العهدة كانت في employee_assets.notes بالنظام القديم ولا مكان لها عندنا).
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية (العهد الحالية notes = NULL). عمود nullable بلا قيد افتراضي.
-- يُطبّق قبل تشغيل الـAPI بالكيان الجديد وقبل استيراد users-assets (المستورد يتحقق من وجود العمود ويُنبّه لو غاب).
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.custody_assignments', N'notes') IS NULL
  ALTER TABLE dbo.custody_assignments ADD [notes] nvarchar(1000) NULL;
GO

-- تحقق: العمود موجود
IF COL_LENGTH(N'dbo.custody_assignments', N'notes') IS NULL
  THROW 56541, N'20260917_054: العمود notes ناقص في custody_assignments', 1;
GO
