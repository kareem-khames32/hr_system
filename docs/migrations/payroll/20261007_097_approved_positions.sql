-- 20261007_097: الوظائف المعتمدة (خطة التنفيذ — الدفعة B2.11، موديول positions الاختياري).
-- جدولين جداد:
--   positions: الوظيفة المعتمدة — وظيفة في وحدة بعدد معتمد (مش صف لكل كرسي):
--     jobTitleId / gradeId / costCenterId: المسمى والدرجة ومركز التكلفة بأرقامهم من الكتالوج.
--     branchId / departmentId / teamId: وحدة الوظيفة (الفرع، والقسم والفريق اختياريين).
--     headcount: العدد المعتمد. status: ACTIVE نشطة / FROZEN مجمّدة / CANCELLED ملغية (القيم بتتفحص في الكود).
--     budget: ميزانية اختيارية للعرض بس (بعملة الفرع — مابتدخلش في أي حساب). createdAt: وقت إنشاء الوظيفة.
--   position_holders: ربط الموظف بوظيفته — صف واحد للموظف، ومفتاحه رقم الموظف (موظف = وظيفة واحدة):
--     positionId: الوظيفة. assignedByUserId / assignedAt: مين ربطه وإمتى.
--     فهرس فريد (positionId، employeeId): قراءة شاغلي وظيفة.
--     في جدوله مش عمود على employees: كيان الموظف بيتقري في كل استعلام موظفين، فعمود جديد عليه كان هيوقّف النظام قبل ما الترحيل يتطبق.
-- «المشغول» محسوب مش متخزّن: المربوط بالوظيفة، وخدمته ماانتهتش، ولسه في وحدتها.
-- الكود بيشتغل قبل الترحيل ده (الموديول مقفول افتراضيًا؛ ولو اتفعّل قبل الترحيل شاشته بتقول إن الترحيل ناقص والتعيين زي ما هو) وبعده.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيانات). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده، والفهرس
-- الفريد بأعمدته بالترتيب — مرة قبل أي تغيير (جدول أو فهرس موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يلمس حاجة)، ومرة بعد
-- التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.positions', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'jobTitleId', N'int', 4, 10, 0, 0, 0),
      (N'gradeId', N'int', 4, 10, 0, 1, 0),
      (N'branchId', N'int', 4, 10, 0, 0, 0),
      (N'departmentId', N'int', 4, 10, 0, 1, 0),
      (N'teamId', N'int', 4, 10, 0, 1, 0),
      (N'costCenterId', N'int', 4, 10, 0, 1, 0),
      (N'headcount', N'int', 4, 10, 0, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'budget', N'decimal', 9, 18, 2, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.positions', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.positions', N'U') AND [name] = N'PK_positions'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.positions', N'U') AND i.[name] = N'PK_positions'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 97001, N'20261007_097: جدول positions موجود وشكله مش شكل الوظائف المعتمدة (الأعمدة أو المفتاح)', 1;
IF OBJECT_ID(N'dbo.position_holders', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'positionId', N'int', 4, 10, 0, 0, 0),
      (N'assignedByUserId', N'int', 4, 10, 0, 0, 0),
      (N'assignedAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.position_holders', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.position_holders', N'U') AND [name] = N'PK_position_holders'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'employeeId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.position_holders', N'U') AND i.[name] = N'PK_position_holders'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 97002, N'20261007_097: جدول position_holders موجود وشكله مش شكل ربط الموظف بوظيفته (الأعمدة أو المفتاح)', 1;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.position_holders', N'U') AND [name] = N'UX_position_holders_position') AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.position_holders', N'U') AND [name] = N'UX_position_holders_position'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'positionId'), (2, N'employeeId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.position_holders', N'U') AND i.[name] = N'UX_position_holders_position'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 97003, N'20261007_097: فهرس UX_position_holders_position موجود ومش فريد على الوظيفة والموظف بالترتيب', 1;
GO

IF OBJECT_ID(N'dbo.positions', N'U') IS NULL
CREATE TABLE dbo.positions (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_positions] PRIMARY KEY,
  [jobTitleId] int NOT NULL,
  [gradeId] int NULL,
  [branchId] int NOT NULL,
  [departmentId] int NULL,
  [teamId] int NULL,
  [costCenterId] int NULL,
  [headcount] int NOT NULL,
  [status] nvarchar(20) NOT NULL,
  [budget] decimal(18,2) NULL,
  [createdAt] datetime2 NOT NULL
);
GO

IF OBJECT_ID(N'dbo.position_holders', N'U') IS NULL
CREATE TABLE dbo.position_holders (
  [employeeId] int NOT NULL CONSTRAINT [PK_position_holders] PRIMARY KEY,
  [positionId] int NOT NULL,
  [assignedByUserId] int NOT NULL,
  [assignedAt] datetime2 NOT NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.position_holders', N'U') AND [name] = N'UX_position_holders_position')
  CREATE UNIQUE INDEX [UX_position_holders_position] ON dbo.position_holders ([positionId], [employeeId]);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.positions', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'jobTitleId', N'int', 4, 10, 0, 0, 0),
      (N'gradeId', N'int', 4, 10, 0, 1, 0),
      (N'branchId', N'int', 4, 10, 0, 0, 0),
      (N'departmentId', N'int', 4, 10, 0, 1, 0),
      (N'teamId', N'int', 4, 10, 0, 1, 0),
      (N'costCenterId', N'int', 4, 10, 0, 1, 0),
      (N'headcount', N'int', 4, 10, 0, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'budget', N'decimal', 9, 18, 2, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.positions', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.positions', N'U') AND [name] = N'PK_positions'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.positions', N'U') AND i.[name] = N'PK_positions'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 97004, N'20261007_097: جدول positions ناقص أو شكله غلط', 1;
IF OBJECT_ID(N'dbo.position_holders', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'positionId', N'int', 4, 10, 0, 0, 0),
      (N'assignedByUserId', N'int', 4, 10, 0, 0, 0),
      (N'assignedAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.position_holders', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.position_holders', N'U') AND [name] = N'PK_position_holders'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'employeeId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.position_holders', N'U') AND i.[name] = N'PK_position_holders'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 97005, N'20261007_097: جدول position_holders ناقص أو شكله غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.position_holders', N'U') AND [name] = N'UX_position_holders_position') OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.position_holders', N'U') AND [name] = N'UX_position_holders_position'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'positionId'), (2, N'employeeId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.position_holders', N'U') AND i.[name] = N'UX_position_holders_position'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 97006, N'20261007_097: فهرس شاغلي الوظيفة الفريد ناقص أو شكله غلط', 1;
GO
