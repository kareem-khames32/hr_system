-- 20261012_198: مكالمات النظام (إضافات المالك — B-ADD.23: الاتصال من جوه النظام فوق موديول الاجتماعات وعلى نفس خادم LiveKit).
-- جدول واحد جديد:
--   meet_calls: المكالمة بين حسابين — كودها العشوائي (رقمها واسم غرفتها على خادم الاجتماعات)، والمتصل واللي بيتّصلوا بيه (users.id)، ووقت
--     الاتصال، ووقت الرد (الفاضي = ماتردّش عليها)، ووقت الانتهاء، وهل اترفضت. حالتها (بترن / شغالة / اتردّ عليها / فايتة / مرفوضة) من الأوقات دي.
-- مفيش أي محتوى بيتخزّن: لا صوت ولا صورة. ومفيش صفوف بتتضاف: موديول «الاجتماعات» مقفول افتراضيًا.
-- جدول لوحده مش عمود على meetings: جداول ترحيل 191 شكلها ثابت (الترحيل بيرفض أي عمود زيادة)، والمكالمة مالهاش صف اجتماع أصلًا.
-- الكود بيشتغل قبل الترحيل: شاشة «الاتصال» بتقول إن الترحيل ناقص، والاتصال بيرد بنفس الرسالة، والاجتماعات نفسها مابتتأثرش.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح والفهارس (الفريد والعادي)
-- باسمهم وأعمدتهم — مرة قبل أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- meet_calls: تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.meet_calls', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'code', N'nvarchar', 72, 0, 0, 0, 0),
      (N'callerUserId', N'int', 4, 10, 0, 0, 0),
      (N'calleeUserId', N'int', 4, 10, 0, 0, 0),
      (N'startedAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'answeredAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'endedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'rejected', N'bit', 1, 1, 0, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.meet_calls', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND [name] = N'PK_meet_calls'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND i.[name] = N'PK_meet_calls'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
    OR (EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND [name] = N'UX_meet_calls_code')
      AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND [name] = N'UX_meet_calls_code'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'code')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND i.[name] = N'UX_meet_calls_code'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
    OR (EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND [name] = N'IX_meet_calls_caller')
      AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND [name] = N'IX_meet_calls_caller'
      AND [is_unique] = 0 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'callerUserId'), (2, N'startedAt')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND i.[name] = N'IX_meet_calls_caller'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
    OR (EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND [name] = N'IX_meet_calls_callee')
      AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND [name] = N'IX_meet_calls_callee'
      AND [is_unique] = 0 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'calleeUserId'), (2, N'startedAt')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND i.[name] = N'IX_meet_calls_callee'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))))
  THROW 198001, N'20261012_198: جدول meet_calls موجود وشكله مش شكل مكالمات النظام (الأعمدة أو المفتاح أو الفهارس)', 1;
GO

IF OBJECT_ID(N'dbo.meet_calls', N'U') IS NULL
CREATE TABLE dbo.meet_calls (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_meet_calls] PRIMARY KEY,
  [code] nvarchar(36) NOT NULL,
  [callerUserId] int NOT NULL,
  [calleeUserId] int NOT NULL,
  [startedAt] datetime2 NOT NULL,
  [answeredAt] datetime2 NULL,
  [endedAt] datetime2 NULL,
  [rejected] bit NOT NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND [name] = N'UX_meet_calls_code')
  CREATE UNIQUE INDEX [UX_meet_calls_code] ON dbo.meet_calls ([code]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND [name] = N'IX_meet_calls_caller')
  CREATE INDEX [IX_meet_calls_caller] ON dbo.meet_calls ([callerUserId], [startedAt]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND [name] = N'IX_meet_calls_callee')
  CREATE INDEX [IX_meet_calls_callee] ON dbo.meet_calls ([calleeUserId], [startedAt]);
GO

-- meet_calls: تحقق بعد التنفيذ — نفس الشكل كامل
IF OBJECT_ID(N'dbo.meet_calls', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'code', N'nvarchar', 72, 0, 0, 0, 0),
      (N'callerUserId', N'int', 4, 10, 0, 0, 0),
      (N'calleeUserId', N'int', 4, 10, 0, 0, 0),
      (N'startedAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'answeredAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'endedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'rejected', N'bit', 1, 1, 0, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.meet_calls', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND [name] = N'PK_meet_calls'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND i.[name] = N'PK_meet_calls'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND [name] = N'UX_meet_calls_code'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'code')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND i.[name] = N'UX_meet_calls_code'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND [name] = N'IX_meet_calls_caller'
      AND [is_unique] = 0 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'callerUserId'), (2, N'startedAt')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND i.[name] = N'IX_meet_calls_caller'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND [name] = N'IX_meet_calls_callee'
      AND [is_unique] = 0 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'calleeUserId'), (2, N'startedAt')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.meet_calls', N'U') AND i.[name] = N'IX_meet_calls_callee'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 198002, N'20261012_198: جدول meet_calls ناقص أو شكله غلط', 1;
GO
