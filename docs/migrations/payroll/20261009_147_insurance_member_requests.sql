-- 20261009_147: طلبات شركة التأمين (خطة التنفيذ — B5.2: المزايا والتأمين الطبي).
-- جدول جديد:
--   insurance_member_requests: طلب إضافة (ADD) أو حذف (REMOVE) عضو: الوثيقة والفئة، والموظف والمعال، والاشتراك اللي طلب الحذف بينهيه، وحالته
--     (PENDING مستني الكشف / SENT اتبعت / DONE تم / CANCELLED ملغي)، ومصدره (MANUAL من الشاشة / OFFBOARDING مع إنهاء الخدمة / DEPENDENT مع حذف المعال)،
--     وسببه، وتاريخ السريان ورقم البطاقة من رد الشركة، ومين عمله (0 = النظام) وبعته وقفله وإمتى.
-- مفيش صفوف بتتضاف.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.insurance_member_requests', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'kind', N'nvarchar', 20, 0, 0, 0, 0),
      (N'policyId', N'int', 4, 10, 0, 0, 0),
      (N'classId', N'int', 4, 10, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'dependentId', N'int', 4, 10, 0, 1, 0),
      (N'enrollmentId', N'int', 4, 10, 0, 1, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'origin', N'nvarchar', 40, 0, 0, 0, 0),
      (N'reason', N'nvarchar', 600, 0, 0, 1, 0),
      (N'effectiveDate', N'date', 3, 10, 0, 1, 0),
      (N'cardNumber', N'nvarchar', 120, 0, 0, 1, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'sentByUserId', N'int', 4, 10, 0, 1, 0),
      (N'sentAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'closedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'closedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.insurance_member_requests', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.insurance_member_requests', N'U') AND [name] = N'PK_insurance_member_requests'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.insurance_member_requests', N'U') AND i.[name] = N'PK_insurance_member_requests'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 147001, N'20261009_147: جدول insurance_member_requests موجود وشكله مش شكل طلبات شركة التأمين (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.insurance_member_requests', N'U') IS NULL
CREATE TABLE dbo.insurance_member_requests (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_insurance_member_requests] PRIMARY KEY,
  [kind] nvarchar(10) NOT NULL,
  [policyId] int NOT NULL,
  [classId] int NOT NULL,
  [employeeId] int NOT NULL,
  [dependentId] int NULL,
  [enrollmentId] int NULL,
  [status] nvarchar(20) NOT NULL,
  [origin] nvarchar(20) NOT NULL,
  [reason] nvarchar(300) NULL,
  [effectiveDate] date NULL,
  [cardNumber] nvarchar(60) NULL,
  [createdByUserId] int NOT NULL,
  [createdAt] datetime2 NOT NULL,
  [sentByUserId] int NULL,
  [sentAt] datetime2 NULL,
  [closedByUserId] int NULL,
  [closedAt] datetime2 NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.insurance_member_requests', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'kind', N'nvarchar', 20, 0, 0, 0, 0),
      (N'policyId', N'int', 4, 10, 0, 0, 0),
      (N'classId', N'int', 4, 10, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'dependentId', N'int', 4, 10, 0, 1, 0),
      (N'enrollmentId', N'int', 4, 10, 0, 1, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'origin', N'nvarchar', 40, 0, 0, 0, 0),
      (N'reason', N'nvarchar', 600, 0, 0, 1, 0),
      (N'effectiveDate', N'date', 3, 10, 0, 1, 0),
      (N'cardNumber', N'nvarchar', 120, 0, 0, 1, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'sentByUserId', N'int', 4, 10, 0, 1, 0),
      (N'sentAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'closedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'closedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.insurance_member_requests', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.insurance_member_requests', N'U') AND [name] = N'PK_insurance_member_requests'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.insurance_member_requests', N'U') AND i.[name] = N'PK_insurance_member_requests'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 147002, N'20261009_147: جدول insurance_member_requests ناقص أو شكله غلط', 1;
GO
