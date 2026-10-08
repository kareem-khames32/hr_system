-- 20261009_109: عروض العمل للمرشحين (خطة التنفيذ — B3.5 الجزء أ: العرض).
-- جدول جديد:
--   candidate_offers: عرض عمل لمرشح — المرشح (candidates.id)، والوظيفة الشاغرة لو المرشح عليها، والراتب المعروض وتاريخ البدء وآخر يوم للرد
--     والملاحظات، والحالة (DRAFT مسودة / PENDING مستني الاعتماد / APPROVED معتمد / SENT اتبعت للمرشح / ACCEPTED مقبول / DECLINED مرفوض من
--     المرشح / WITHDRAWN مسحوب)، ومين عمله واعتمده وإمتى، وسبب الإرجاع، وبصمة رمز لينك الرد (الرمز نفسه مابيتخزنش)، ودليل الرد: إمتى،
--     ومن اللينك ولا مسجّل من مسؤول التوظيف، والعنوان والمتصفح، وملاحظة المرشح.
-- الراتب المعروض رقم في العرض بس: مابيدخلش في أي حساب، وبيتعبّى في نموذج التعيين والموارد البشرية بتراجعه.
-- الكود بيشتغل قبل الترحيل ده: قايمة العروض بتقول إن الترحيل ناقص، وعمل عرض مرفوض برسالته.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.candidate_offers', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'candidateId', N'int', 4, 10, 0, 0, 0),
      (N'jobId', N'int', 4, 10, 0, 1, 0),
      (N'salary', N'decimal', 9, 18, 2, 0, 0),
      (N'startDate', N'date', 3, 10, 0, 0, 0),
      (N'expiresOn', N'date', 3, 10, 0, 1, 0),
      (N'notes', N'nvarchar', 2000, 0, 0, 1, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'approvedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'approvedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'returnReason', N'nvarchar', 600, 0, 0, 1, 0),
      (N'tokenHash', N'nvarchar', 128, 0, 0, 1, 0),
      (N'sentAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'respondedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'respondedVia', N'nvarchar', 40, 0, 0, 1, 0),
      (N'respondedIp', N'nvarchar', 128, 0, 0, 1, 0),
      (N'respondedAgent', N'nvarchar', 600, 0, 0, 1, 0),
      (N'respondedNote', N'nvarchar', 1000, 0, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.candidate_offers', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.candidate_offers', N'U') AND [name] = N'PK_candidate_offers'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.candidate_offers', N'U') AND i.[name] = N'PK_candidate_offers'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 109001, N'20261009_109: جدول candidate_offers موجود وشكله مش شكل عروض العمل للمرشحين (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.candidate_offers', N'U') IS NULL
CREATE TABLE dbo.candidate_offers (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_candidate_offers] PRIMARY KEY,
  [candidateId] int NOT NULL,
  [jobId] int NULL,
  [salary] decimal(18,2) NOT NULL,
  [startDate] date NOT NULL,
  [expiresOn] date NULL,
  [notes] nvarchar(1000) NULL,
  [status] nvarchar(20) NOT NULL,
  [createdByUserId] int NOT NULL,
  [createdAt] datetime2 NOT NULL,
  [approvedByUserId] int NULL,
  [approvedAt] datetime2 NULL,
  [returnReason] nvarchar(300) NULL,
  [tokenHash] nvarchar(64) NULL,
  [sentAt] datetime2 NULL,
  [respondedAt] datetime2 NULL,
  [respondedVia] nvarchar(20) NULL,
  [respondedIp] nvarchar(64) NULL,
  [respondedAgent] nvarchar(300) NULL,
  [respondedNote] nvarchar(500) NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.candidate_offers', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'candidateId', N'int', 4, 10, 0, 0, 0),
      (N'jobId', N'int', 4, 10, 0, 1, 0),
      (N'salary', N'decimal', 9, 18, 2, 0, 0),
      (N'startDate', N'date', 3, 10, 0, 0, 0),
      (N'expiresOn', N'date', 3, 10, 0, 1, 0),
      (N'notes', N'nvarchar', 2000, 0, 0, 1, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'approvedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'approvedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'returnReason', N'nvarchar', 600, 0, 0, 1, 0),
      (N'tokenHash', N'nvarchar', 128, 0, 0, 1, 0),
      (N'sentAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'respondedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'respondedVia', N'nvarchar', 40, 0, 0, 1, 0),
      (N'respondedIp', N'nvarchar', 128, 0, 0, 1, 0),
      (N'respondedAgent', N'nvarchar', 600, 0, 0, 1, 0),
      (N'respondedNote', N'nvarchar', 1000, 0, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.candidate_offers', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.candidate_offers', N'U') AND [name] = N'PK_candidate_offers'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.candidate_offers', N'U') AND i.[name] = N'PK_candidate_offers'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 109002, N'20261009_109: جدول candidate_offers ناقص أو شكله غلط', 1;
GO
