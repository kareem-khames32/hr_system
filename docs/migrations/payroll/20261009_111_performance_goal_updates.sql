-- 20261009_111: سجل أهداف الأداء (خطة التنفيذ — B3.6: الأهداف).
-- جدول جديد:
--   performance_goal_updates: سطر لكل حركة على هدف (performance_goals.id) — النوع (PROGRESS تحديث تقدّم / CHANGE تعديل في نص الفترة / STATUS
--     اعتماد أو رفض أو قفل / EVIDENCE مهمة كدليل)، والفعلي وقتها، والتعليق أو السبب، والتعديل قبل وبعد (JSON)، والمهمة الدليل (tasks.id)، ومين وإمتى.
-- بيتطبق بعد ترحيل 20261009_110 (performance_goals).
-- الكود بيشتغل قبل الترحيلين: قوايم الأهداف بتقول إن الترحيل ناقص، وعمل هدف مرفوض برسالته.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.performance_goal_updates', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'goalId', N'int', 4, 10, 0, 0, 0),
      (N'kind', N'nvarchar', 40, 0, 0, 0, 0),
      (N'actualValue', N'decimal', 9, 18, 2, 1, 0),
      (N'note', N'nvarchar', 2000, 0, 0, 1, 0),
      (N'changes', N'nvarchar', 4000, 0, 0, 1, 0),
      (N'taskId', N'int', 4, 10, 0, 1, 0),
      (N'byUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.performance_goal_updates', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.performance_goal_updates', N'U') AND [name] = N'PK_performance_goal_updates'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.performance_goal_updates', N'U') AND i.[name] = N'PK_performance_goal_updates'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 111001, N'20261009_111: جدول performance_goal_updates موجود وشكله مش شكل سجل أهداف الأداء (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.performance_goal_updates', N'U') IS NULL
CREATE TABLE dbo.performance_goal_updates (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_performance_goal_updates] PRIMARY KEY,
  [goalId] int NOT NULL,
  [kind] nvarchar(20) NOT NULL,
  [actualValue] decimal(18,2) NULL,
  [note] nvarchar(1000) NULL,
  [changes] nvarchar(2000) NULL,
  [taskId] int NULL,
  [byUserId] int NOT NULL,
  [createdAt] datetime2 NOT NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.performance_goal_updates', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'goalId', N'int', 4, 10, 0, 0, 0),
      (N'kind', N'nvarchar', 40, 0, 0, 0, 0),
      (N'actualValue', N'decimal', 9, 18, 2, 1, 0),
      (N'note', N'nvarchar', 2000, 0, 0, 1, 0),
      (N'changes', N'nvarchar', 4000, 0, 0, 1, 0),
      (N'taskId', N'int', 4, 10, 0, 1, 0),
      (N'byUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.performance_goal_updates', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.performance_goal_updates', N'U') AND [name] = N'PK_performance_goal_updates'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.performance_goal_updates', N'U') AND i.[name] = N'PK_performance_goal_updates'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 111002, N'20261009_111: جدول performance_goal_updates ناقص أو شكله غلط', 1;
GO
