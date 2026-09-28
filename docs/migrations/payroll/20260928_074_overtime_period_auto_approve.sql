-- 20260928_074: «اعتماد تلقائي» لفترات الإضافي المفتوحة (قرار المالك 28 سبتمبر: الإضافي اللي بيتكشف من البصمة في فترة مفتوحة
--   عليها العلامة بيتعتمد لوحده بعد ما اليوم يخلص — بنفس الاعتماد النهائي والتسعير وسقوف الإضافي — من غير سلسلة الاعتماد).
-- عمود bit NOT NULL بقيمة افتراضية صفر:
--   overtime_periods.autoApprove — العلامة على الفترة؛ معناها للفترة المفتوحة (OPEN) بس، والخادم بيرفضها على المقفولة
-- الصفوف القائمة بتاخد الصفر الافتراضي وقت الإضافة نفسها (NOT NULL + DEFAULT) — مفيش UPDATE ولا تعبئة رجعية:
--   كل فترة قديمة = من غير اعتماد تلقائي = الإضافي المكتشف فيها بيمشي في سلسلة الاعتماد بالحرف زي الأول.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE. آمن للتكرار بحارس COL_LENGTH. متوافق مع SQL Server 2019.
-- اسم القيد الافتراضي = اللي بيولّده TypeORM للكيان (DF_ + أول 27 حرف من sha1 «overtime_periods_autoApprove») عشان فرق المخطط يبقى صفرًا.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.overtime_periods', N'autoApprove') IS NULL
  ALTER TABLE dbo.overtime_periods ADD [autoApprove] bit NOT NULL
    CONSTRAINT [DF_c7cb6d2665b3c861c183e772c16] DEFAULT 0;
GO

-- تحقق: العمود موجود بنوعه ومش بيقبل الفراغ، وقيمته الافتراضية صفر باسم قيد TypeORM، ومفيش فترة مقفولة عليها اعتماد تلقائي
IF COL_LENGTH(N'dbo.overtime_periods', N'autoApprove') IS NULL
  THROW 74001, N'20260928_074: عمود autoApprove ناقص في overtime_periods', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.overtime_periods') AND name = N'autoApprove'
               AND system_type_id = TYPE_ID(N'bit') AND is_nullable = 0)
  THROW 74002, N'20260928_074: overtime_periods.autoApprove لازم bit NOT NULL', 1;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints d
               JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
               WHERE d.parent_object_id = OBJECT_ID(N'dbo.overtime_periods') AND c.name = N'autoApprove'
                 AND d.name = N'DF_c7cb6d2665b3c861c183e772c16' AND d.definition = N'((0))')
  THROW 74003, N'20260928_074: القيمة الافتراضية لـ overtime_periods.autoApprove لازم صفر باسم DF_c7cb6d2665b3c861c183e772c16', 1;
IF EXISTS (SELECT 1 FROM dbo.overtime_periods WHERE [autoApprove] = 1 AND [effect] <> N'OPEN')
  THROW 74004, N'20260928_074: «اعتماد تلقائي» للفترة المفتوحة بس — فيه فترة مقفولة عليها العلامة', 1;
GO
