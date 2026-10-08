-- 20261011_185: سجل استخدام الذكاء الاصطناعي (خطة التنفيذ — B6.6: حوكمة الـAI ومساعد القراءة).
-- جدول جديد:
--   ai_actions: كل سؤال للمساعد — مين سأل (الحساب وملف الموظف)، ونوع الاستخدام، ونص السؤال، والأدوات اللي اتنادت (JSON: الاسم والمدخلات ونجحت ولا لأ،
--     من غير بياناتها)، والرد، واقتراح مستني تأكيد إن وُجد ومين أكّده وإمتى (مساعد التنفيذ — B6.7)، والمزوّد والنموذج، والحالة (OK / FAILED)، والوقت.
-- مفيش صفوف بتتضاف: موديول «الذكاء الاصطناعي» مقفول افتراضيًا وميزة مساعد القراءة مقفولة.
-- الكود بيشتغل قبل الترحيل: المساعد بيقول إنه مش متاح، ومفيش سؤال بيتبعت للمزوّد.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.ai_actions', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'userId', N'int', 4, 10, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 1, 0),
      (N'kind', N'nvarchar', 60, 0, 0, 0, 0),
      (N'question', N'nvarchar', 2000, 0, 0, 0, 0),
      (N'tools', N'nvarchar', -1, 0, 0, 0, 0),
      (N'answer', N'nvarchar', -1, 0, 0, 1, 0),
      (N'suggestion', N'nvarchar', -1, 0, 0, 1, 0),
      (N'confirmed', N'bit', 1, 1, 0, 1, 0),
      (N'confirmedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'confirmedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'provider', N'nvarchar', 80, 0, 0, 0, 0),
      (N'model', N'nvarchar', 160, 0, 0, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.ai_actions', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.ai_actions', N'U') AND [name] = N'PK_ai_actions'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.ai_actions', N'U') AND i.[name] = N'PK_ai_actions'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 185001, N'20261011_185: جدول ai_actions موجود وشكله مش شكل سجل استخدام الذكاء الاصطناعي (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.ai_actions', N'U') IS NULL
CREATE TABLE dbo.ai_actions (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_ai_actions] PRIMARY KEY,
  [userId] int NOT NULL,
  [employeeId] int NULL,
  [kind] nvarchar(30) NOT NULL,
  [question] nvarchar(1000) NOT NULL,
  [tools] nvarchar(max) NOT NULL,
  [answer] nvarchar(max) NULL,
  [suggestion] nvarchar(max) NULL,
  [confirmed] bit NULL,
  [confirmedByUserId] int NULL,
  [confirmedAt] datetime2 NULL,
  [provider] nvarchar(40) NOT NULL,
  [model] nvarchar(80) NOT NULL,
  [status] nvarchar(20) NOT NULL,
  [createdAt] datetime2 NOT NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.ai_actions', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'userId', N'int', 4, 10, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 1, 0),
      (N'kind', N'nvarchar', 60, 0, 0, 0, 0),
      (N'question', N'nvarchar', 2000, 0, 0, 0, 0),
      (N'tools', N'nvarchar', -1, 0, 0, 0, 0),
      (N'answer', N'nvarchar', -1, 0, 0, 1, 0),
      (N'suggestion', N'nvarchar', -1, 0, 0, 1, 0),
      (N'confirmed', N'bit', 1, 1, 0, 1, 0),
      (N'confirmedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'confirmedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'provider', N'nvarchar', 80, 0, 0, 0, 0),
      (N'model', N'nvarchar', 160, 0, 0, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.ai_actions', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.ai_actions', N'U') AND [name] = N'PK_ai_actions'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.ai_actions', N'U') AND i.[name] = N'PK_ai_actions'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 185002, N'20261011_185: جدول ai_actions ناقص أو شكله غلط', 1;
GO
