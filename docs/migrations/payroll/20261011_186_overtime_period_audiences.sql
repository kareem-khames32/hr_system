-- 20261011_186: جمهور فترة الإضافي (إضافات المالك 11 أكتوبر — B-ADD.2: العطلات الرسمية والإضافي بالاستهداف الموحد).
-- جدول جديد:
--   overtime_period_audiences: «على مين؟» لفترة فتح/قفل الإضافي — JSON بنفس شكل «تسري على» للعطلة الرسمية (public_holidays.audience):
--     الفرع كله / إدارات أو أقسام (بأقسامها الفرعية) / فرق / موظفين بالاسم، ومعاه «الكل ماعدا…» (excludeEmployeeIds).
--     صف واحد للفترة (المفتاح رقم الفترة). الفترة اللي مالهاش صف = فرعها كله (أو كل الفروع) زي ما هي بالحرف.
-- مفيش صفوف بتتضاف ولا تعبئة رجعية: كل الفترات الموجودة من غير جمهور = سلوكها الحالي.
-- الكود بيشتغل قبل الترحيل: الفترات بتتحكم بفرعها زي زمان، وتحديد جمهور لفترة مرفوض برسالة إن الترحيل ناقص.
-- إضافي فقط: بلا حذف ولا تعديل لجدول overtime_periods، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.overtime_period_audiences', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'periodId', N'int', 4, 10, 0, 0, 0),
      (N'audience', N'nvarchar', -1, 0, 0, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.overtime_period_audiences', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.overtime_period_audiences', N'U') AND [name] = N'PK_overtime_period_audiences'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'periodId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.overtime_period_audiences', N'U') AND i.[name] = N'PK_overtime_period_audiences'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 186001, N'20261011_186: جدول overtime_period_audiences موجود وشكله مش شكل جمهور فترة الإضافي (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.overtime_period_audiences', N'U') IS NULL
CREATE TABLE dbo.overtime_period_audiences (
  [periodId] int NOT NULL CONSTRAINT [PK_overtime_period_audiences] PRIMARY KEY,
  [audience] nvarchar(max) NOT NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.overtime_period_audiences', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'periodId', N'int', 4, 10, 0, 0, 0),
      (N'audience', N'nvarchar', -1, 0, 0, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.overtime_period_audiences', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.overtime_period_audiences', N'U') AND [name] = N'PK_overtime_period_audiences'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'periodId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.overtime_period_audiences', N'U') AND i.[name] = N'PK_overtime_period_audiences'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 186002, N'20261011_186: جدول overtime_period_audiences ناقص أو شكله غلط', 1;
GO
