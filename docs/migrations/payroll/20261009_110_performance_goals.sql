-- 20261009_110: أهداف الأداء (خطة التنفيذ — B3.6: الأهداف).
-- جدول جديد:
--   performance_goals: هدف — صاحبه (ownerType: EMPLOYEE موظف / DEPARTMENT قسم / COMPANY الشركة) ورقم الموظف أو القسم، وفرع الهدف (فرع الموظف أو
--     القسم وقت الإنشاء؛ الفاضي = هدف شركة)، والهدف الأب (اختياري)، والنوع (KPI مؤشر / GOAL هدف)، والعنوان والوصف، والوزن (0–100)، والمستهدف
--     والوحدة والفعلي (اختياريين)، والفترة، والحالة (PROPOSED مقترح / ACTIVE ساري / DONE اتحقق / CANCELLED ملغي / REJECTED مرفوض)، ومين اقترحه،
--     ومين قرر (اعتماد أو رفض) وإمتى وسببه، وإمتى اتقفل.
-- سجل الهدف (التقدّم والتعديلات والأدلة) في ترحيل 20261009_111 (performance_goal_updates).
-- الكود بيشتغل قبل الترحيلين: قوايم الأهداف بتقول إن الترحيل ناقص، وعمل هدف مرفوض برسالته. والموديول نفسه (performance) مقفول افتراضيًا.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.performance_goals', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'ownerType', N'nvarchar', 40, 0, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 1, 0),
      (N'departmentId', N'int', 4, 10, 0, 1, 0),
      (N'branchId', N'int', 4, 10, 0, 1, 0),
      (N'parentGoalId', N'int', 4, 10, 0, 1, 0),
      (N'kind', N'nvarchar', 20, 0, 0, 0, 0),
      (N'title', N'nvarchar', 400, 0, 0, 0, 0),
      (N'description', N'nvarchar', 2000, 0, 0, 1, 0),
      (N'weight', N'int', 4, 10, 0, 0, 0),
      (N'targetValue', N'decimal', 9, 18, 2, 1, 0),
      (N'unit', N'nvarchar', 60, 0, 0, 1, 0),
      (N'actualValue', N'decimal', 9, 18, 2, 1, 0),
      (N'periodStart', N'date', 3, 10, 0, 0, 0),
      (N'periodEnd', N'date', 3, 10, 0, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'proposedByUserId', N'int', 4, 10, 0, 0, 0),
      (N'decidedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'decidedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'decisionReason', N'nvarchar', 600, 0, 0, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'closedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.performance_goals', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.performance_goals', N'U') AND [name] = N'PK_performance_goals'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.performance_goals', N'U') AND i.[name] = N'PK_performance_goals'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 110001, N'20261009_110: جدول performance_goals موجود وشكله مش شكل أهداف الأداء (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.performance_goals', N'U') IS NULL
CREATE TABLE dbo.performance_goals (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_performance_goals] PRIMARY KEY,
  [ownerType] nvarchar(20) NOT NULL,
  [employeeId] int NULL,
  [departmentId] int NULL,
  [branchId] int NULL,
  [parentGoalId] int NULL,
  [kind] nvarchar(10) NOT NULL,
  [title] nvarchar(200) NOT NULL,
  [description] nvarchar(1000) NULL,
  [weight] int NOT NULL,
  [targetValue] decimal(18,2) NULL,
  [unit] nvarchar(30) NULL,
  [actualValue] decimal(18,2) NULL,
  [periodStart] date NOT NULL,
  [periodEnd] date NOT NULL,
  [status] nvarchar(20) NOT NULL,
  [proposedByUserId] int NOT NULL,
  [decidedByUserId] int NULL,
  [decidedAt] datetime2 NULL,
  [decisionReason] nvarchar(300) NULL,
  [createdAt] datetime2 NOT NULL,
  [closedAt] datetime2 NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.performance_goals', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'ownerType', N'nvarchar', 40, 0, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 1, 0),
      (N'departmentId', N'int', 4, 10, 0, 1, 0),
      (N'branchId', N'int', 4, 10, 0, 1, 0),
      (N'parentGoalId', N'int', 4, 10, 0, 1, 0),
      (N'kind', N'nvarchar', 20, 0, 0, 0, 0),
      (N'title', N'nvarchar', 400, 0, 0, 0, 0),
      (N'description', N'nvarchar', 2000, 0, 0, 1, 0),
      (N'weight', N'int', 4, 10, 0, 0, 0),
      (N'targetValue', N'decimal', 9, 18, 2, 1, 0),
      (N'unit', N'nvarchar', 60, 0, 0, 1, 0),
      (N'actualValue', N'decimal', 9, 18, 2, 1, 0),
      (N'periodStart', N'date', 3, 10, 0, 0, 0),
      (N'periodEnd', N'date', 3, 10, 0, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'proposedByUserId', N'int', 4, 10, 0, 0, 0),
      (N'decidedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'decidedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'decisionReason', N'nvarchar', 600, 0, 0, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'closedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.performance_goals', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.performance_goals', N'U') AND [name] = N'PK_performance_goals'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.performance_goals', N'U') AND i.[name] = N'PK_performance_goals'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 110002, N'20261009_110: جدول performance_goals ناقص أو شكله غلط', 1;
GO
