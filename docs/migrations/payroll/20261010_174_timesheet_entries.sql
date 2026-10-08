-- 20261010_174: سطور ساعات العمل (خطة التنفيذ — B5.8: ساعات المشاريع).
-- جدول جديد:
--   timesheet_entries: دقايق موظف في يوم على مشروع (ومهمة اختيارية) بملاحظة — وأحد أسبوع اليوم (مفتاح الأسبوع في timesheet_weeks).
-- مفيش صفوف بتتضاف: موديول «ساعات المشاريع» مقفول افتراضيًا.
-- الكود بيشتغل قبل الترحيل: الشاشة بتقول إن الترحيل ناقص.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.timesheet_entries', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'workDate', N'date', 3, 10, 0, 0, 0),
      (N'weekStart', N'date', 3, 10, 0, 0, 0),
      (N'projectId', N'int', 4, 10, 0, 0, 0),
      (N'taskId', N'int', 4, 10, 0, 1, 0),
      (N'minutes', N'int', 4, 10, 0, 0, 0),
      (N'note', N'nvarchar', 600, 0, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.timesheet_entries', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.timesheet_entries', N'U') AND [name] = N'PK_timesheet_entries'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.timesheet_entries', N'U') AND i.[name] = N'PK_timesheet_entries'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 174001, N'20261010_174: جدول timesheet_entries موجود وشكله مش شكل سطور ساعات العمل (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.timesheet_entries', N'U') IS NULL
CREATE TABLE dbo.timesheet_entries (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_timesheet_entries] PRIMARY KEY,
  [employeeId] int NOT NULL,
  [workDate] date NOT NULL,
  [weekStart] date NOT NULL,
  [projectId] int NOT NULL,
  [taskId] int NULL,
  [minutes] int NOT NULL,
  [note] nvarchar(300) NULL,
  [updatedAt] datetime2 NOT NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.timesheet_entries', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'workDate', N'date', 3, 10, 0, 0, 0),
      (N'weekStart', N'date', 3, 10, 0, 0, 0),
      (N'projectId', N'int', 4, 10, 0, 0, 0),
      (N'taskId', N'int', 4, 10, 0, 1, 0),
      (N'minutes', N'int', 4, 10, 0, 0, 0),
      (N'note', N'nvarchar', 600, 0, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.timesheet_entries', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.timesheet_entries', N'U') AND [name] = N'PK_timesheet_entries'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.timesheet_entries', N'U') AND i.[name] = N'PK_timesheet_entries'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 174002, N'20261010_174: جدول timesheet_entries ناقص أو شكله غلط', 1;
GO
