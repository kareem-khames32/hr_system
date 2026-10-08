-- 20261010_169: حوادث السلامة وإصابات العمل (خطة التنفيذ — B5.7: السلامة وإصابات العمل).
-- جدول جديد:
--   safety_incidents: بلاغ حادث — فرعه (فرع المبلّغ وقت البلاغ)، والمبلّغ، ونوعه (INJURY إصابة / PROPERTY تلف / HAZARD خطر)، وتاريخه ومكانه ووصفه،
--     والمصاب (موظف، أو اسم مكتوب)، وشدته (MINOR / MODERATE / SERIOUS)، والأيام المفقودة، وسببه، وحالته (REPORTED / INVESTIGATING / CLOSED)،
--     وإجازة المصاب المربوطة (leaves)، ومهمة إبلاغ الجهة (tasks)، ومين قفله وإمتى.
-- مفيش صفوف بتتضاف: موديول «السلامة وإصابات العمل» مقفول افتراضيًا.
-- الكود بيشتغل قبل الترحيل: الشاشة بتقول إن الترحيل ناقص.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.safety_incidents', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'branchId', N'int', 4, 10, 0, 0, 0),
      (N'reporterEmployeeId', N'int', 4, 10, 0, 0, 0),
      (N'kind', N'nvarchar', 40, 0, 0, 0, 0),
      (N'occurredOn', N'date', 3, 10, 0, 0, 0),
      (N'location', N'nvarchar', 400, 0, 0, 0, 0),
      (N'description', N'nvarchar', 2000, 0, 0, 0, 0),
      (N'injuredEmployeeId', N'int', 4, 10, 0, 1, 0),
      (N'injuredNote', N'nvarchar', 240, 0, 0, 1, 0),
      (N'severity', N'nvarchar', 40, 0, 0, 1, 0),
      (N'lostDays', N'int', 4, 10, 0, 1, 0),
      (N'rootCause', N'nvarchar', 2000, 0, 0, 1, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'leaveId', N'int', 4, 10, 0, 1, 0),
      (N'authorityTaskId', N'int', 4, 10, 0, 1, 0),
      (N'closedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'closedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.safety_incidents', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.safety_incidents', N'U') AND [name] = N'PK_safety_incidents'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.safety_incidents', N'U') AND i.[name] = N'PK_safety_incidents'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 169001, N'20261010_169: جدول safety_incidents موجود وشكله مش شكل حوادث السلامة وإصابات العمل (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.safety_incidents', N'U') IS NULL
CREATE TABLE dbo.safety_incidents (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_safety_incidents] PRIMARY KEY,
  [branchId] int NOT NULL,
  [reporterEmployeeId] int NOT NULL,
  [kind] nvarchar(20) NOT NULL,
  [occurredOn] date NOT NULL,
  [location] nvarchar(200) NOT NULL,
  [description] nvarchar(1000) NOT NULL,
  [injuredEmployeeId] int NULL,
  [injuredNote] nvarchar(120) NULL,
  [severity] nvarchar(20) NULL,
  [lostDays] int NULL,
  [rootCause] nvarchar(1000) NULL,
  [status] nvarchar(20) NOT NULL,
  [leaveId] int NULL,
  [authorityTaskId] int NULL,
  [closedByUserId] int NULL,
  [closedAt] datetime2 NULL,
  [createdAt] datetime2 NOT NULL,
  [updatedAt] datetime2 NOT NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.safety_incidents', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'branchId', N'int', 4, 10, 0, 0, 0),
      (N'reporterEmployeeId', N'int', 4, 10, 0, 0, 0),
      (N'kind', N'nvarchar', 40, 0, 0, 0, 0),
      (N'occurredOn', N'date', 3, 10, 0, 0, 0),
      (N'location', N'nvarchar', 400, 0, 0, 0, 0),
      (N'description', N'nvarchar', 2000, 0, 0, 0, 0),
      (N'injuredEmployeeId', N'int', 4, 10, 0, 1, 0),
      (N'injuredNote', N'nvarchar', 240, 0, 0, 1, 0),
      (N'severity', N'nvarchar', 40, 0, 0, 1, 0),
      (N'lostDays', N'int', 4, 10, 0, 1, 0),
      (N'rootCause', N'nvarchar', 2000, 0, 0, 1, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'leaveId', N'int', 4, 10, 0, 1, 0),
      (N'authorityTaskId', N'int', 4, 10, 0, 1, 0),
      (N'closedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'closedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.safety_incidents', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.safety_incidents', N'U') AND [name] = N'PK_safety_incidents'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.safety_incidents', N'U') AND i.[name] = N'PK_safety_incidents'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 169002, N'20261010_169: جدول safety_incidents ناقص أو شكله غلط', 1;
GO
