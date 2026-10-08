-- 20261009_126: الخط الزمني للقضية (خطة التنفيذ — B3.11 الجزء أ: خادم القضايا).
-- جدول جديد:
--   hr_case_events: حدث في قضية (hr_cases.id) — النوع: NOTE ملاحظة / STATEMENT إفادة / EVIDENCE دليل / SESSION جلسة بمحضر / NOTICE إخطار المشكو
--     في حقه / DEFENSE محضر دفاعه / DECISION قرار / OBJECTION اعتراض / STATUS تغيير حالة — ونصه، وصاحب الإفادة أو الدفاع (employees.id)،
--     ومرفقه (stored_files.id)، ومين سجّله وإمتى. السجل بيتزوّد بس: مفيش تعديل ولا حذف.
-- بيتطبق بعد ترحيل 20261009_125 (hr_case_parties).
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.hr_case_events', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'caseId', N'int', 4, 10, 0, 0, 0),
      (N'kind', N'nvarchar', 40, 0, 0, 0, 0),
      (N'body', N'nvarchar', -1, 0, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 1, 0),
      (N'fileId', N'int', 4, 10, 0, 1, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.hr_case_events', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.hr_case_events', N'U') AND [name] = N'PK_hr_case_events'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.hr_case_events', N'U') AND i.[name] = N'PK_hr_case_events'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 126001, N'20261009_126: جدول hr_case_events موجود وشكله مش شكل الخط الزمني للقضية (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.hr_case_events', N'U') IS NULL
CREATE TABLE dbo.hr_case_events (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_hr_case_events] PRIMARY KEY,
  [caseId] int NOT NULL,
  [kind] nvarchar(20) NOT NULL,
  [body] nvarchar(max) NOT NULL,
  [employeeId] int NULL,
  [fileId] int NULL,
  [createdByUserId] int NOT NULL,
  [createdAt] datetime2 NOT NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.hr_case_events', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'caseId', N'int', 4, 10, 0, 0, 0),
      (N'kind', N'nvarchar', 40, 0, 0, 0, 0),
      (N'body', N'nvarchar', -1, 0, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 1, 0),
      (N'fileId', N'int', 4, 10, 0, 1, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.hr_case_events', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.hr_case_events', N'U') AND [name] = N'PK_hr_case_events'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.hr_case_events', N'U') AND i.[name] = N'PK_hr_case_events'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 126002, N'20261009_126: جدول hr_case_events ناقص أو شكله غلط', 1;
GO
