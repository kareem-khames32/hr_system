-- 20261009_116: مكافآت مقترحة من نتيجة تقييم الأداء (خطة التنفيذ — B3.8 الجزء ب: الربط بالفلوس).
-- جدول جديد:
--   review_reward_suggestions: اقتراح مكافأة لموظف من نتيجة تقييمه في دورة — الدورة (review_cycles.id)، والتكليف (review_assignments.id)، والموظف،
--     والمدير المباشر اللي الاقتراح موجّه له (هو اللي بيقدّم طلب المكافأة)، ونوع المكافأة (bonus_types.id)، والتقدير والدرجة وقت الاقتراح،
--     وقيمة المكافأة المقترحة (بطريقة حساب النوع)، وشهر المسير المستهدف (YYYY-MM)، والحالة
--     (SUGGESTED مقترح / CLAIMED جاري التقديم / SUBMITTED اتقدّم / DISMISSED اتصرف عنه النظر)، وطلب المكافأة اللي اتعمل (bonus_requests.id)،
--     ومين اقترح وإمتى، ومين قدّم أو صرف النظر وإمتى.
-- الاقتراح نفسه مالوش أثر مالي: مفيش قيد في الدفتر غير لما طلب المكافأة يتقدّم من المدير ويعدّي سلسلة اعتماده.
-- بيتطبق بعد ترحيل 20261009_114 (review_assignments).
-- الكود بيشتغل قبل الترحيل: شاشة مكافآت الدورة بتقول إن الترحيل ناقص، والاقتراح مرفوض برسالته.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.review_reward_suggestions', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'cycleId', N'int', 4, 10, 0, 0, 0),
      (N'assignmentId', N'int', 4, 10, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'managerEmployeeId', N'int', 4, 10, 0, 0, 0),
      (N'bonusTypeId', N'int', 4, 10, 0, 0, 0),
      (N'band', N'nvarchar', 4, 0, 0, 0, 0),
      (N'finalScore', N'decimal', 5, 5, 2, 0, 0),
      (N'inputValue', N'decimal', 9, 18, 4, 0, 0),
      (N'targetPeriod', N'nvarchar', 14, 0, 0, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'bonusRequestId', N'int', 4, 10, 0, 1, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'decidedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'decidedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.review_reward_suggestions', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.review_reward_suggestions', N'U') AND [name] = N'PK_review_reward_suggestions'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.review_reward_suggestions', N'U') AND i.[name] = N'PK_review_reward_suggestions'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 116001, N'20261009_116: جدول review_reward_suggestions موجود وشكله مش شكل مكافآت مقترحة من نتيجة التقييم (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.review_reward_suggestions', N'U') IS NULL
CREATE TABLE dbo.review_reward_suggestions (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_review_reward_suggestions] PRIMARY KEY,
  [cycleId] int NOT NULL,
  [assignmentId] int NOT NULL,
  [employeeId] int NOT NULL,
  [managerEmployeeId] int NOT NULL,
  [bonusTypeId] int NOT NULL,
  [band] nvarchar(2) NOT NULL,
  [finalScore] decimal(5,2) NOT NULL,
  [inputValue] decimal(18,4) NOT NULL,
  [targetPeriod] nvarchar(7) NOT NULL,
  [status] nvarchar(20) NOT NULL,
  [bonusRequestId] int NULL,
  [createdByUserId] int NOT NULL,
  [createdAt] datetime2 NOT NULL,
  [decidedByUserId] int NULL,
  [decidedAt] datetime2 NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.review_reward_suggestions', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'cycleId', N'int', 4, 10, 0, 0, 0),
      (N'assignmentId', N'int', 4, 10, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'managerEmployeeId', N'int', 4, 10, 0, 0, 0),
      (N'bonusTypeId', N'int', 4, 10, 0, 0, 0),
      (N'band', N'nvarchar', 4, 0, 0, 0, 0),
      (N'finalScore', N'decimal', 5, 5, 2, 0, 0),
      (N'inputValue', N'decimal', 9, 18, 4, 0, 0),
      (N'targetPeriod', N'nvarchar', 14, 0, 0, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'bonusRequestId', N'int', 4, 10, 0, 1, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'decidedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'decidedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.review_reward_suggestions', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.review_reward_suggestions', N'U') AND [name] = N'PK_review_reward_suggestions'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.review_reward_suggestions', N'U') AND i.[name] = N'PK_review_reward_suggestions'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 116002, N'20261009_116: جدول review_reward_suggestions ناقص أو شكله غلط', 1;
GO
