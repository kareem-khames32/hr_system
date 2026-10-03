-- 20261003_085: بصمة الملفات المرفوعة (خطة التنفيذ — الدفعة B2.2).
-- عمود جديد على stored_files:
--   sha256: بصمة SHA-256 لمحتوى الملف (64 خانة hex) — بتتسجل لكل ملف جديد وقت الرفع أو التوليد. القديم من غير بصمة.
-- الكود بيشتغل قبل الترحيل ده (الرفع شغال من غير تسجيل البصمة، وفحص النوع الحقيقي شغال) وبعده.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار بحراسة COL_LENGTH.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.stored_files', N'sha256') IS NULL
  ALTER TABLE dbo.stored_files ADD [sha256] nvarchar(64) NULL;
GO

-- تحقق: العمود بنوعه وطوله وnullable ومن غير افتراضي
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.stored_files') AND name = N'sha256'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 128 AND is_nullable = 1 AND default_object_id = 0)
  THROW 85001, N'20261003_085: العمود stored_files.sha256 ناقص أو بنوع غلط', 1;
GO
