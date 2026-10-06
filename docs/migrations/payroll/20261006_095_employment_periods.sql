-- 20261006_095: فترات الخدمة (خطة التنفيذ — الدفعة B2.10).
-- جدول جديد employment_periods: فترة خدمة مقفولة لموظف اتعيّن تاني — رقمها، وبدايتها ونهايتها، وسبب الخروج، وملف الإنهاء بتاعها،
-- وسبب إعادة التعيين ومين عملها. الفترة المفتوحة مش هنا: هي صف الموظف نفسه (تاريخ تعيينه الحالي). سطر واحد لكل موظف ورقم فترة.
-- الكود بيشتغل قبل الترحيل ده (ملف الموظف والإرجاع القديم زي ما هم، و«إعادة تعيين» مرفوضة برسالتها) وبعده.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، والمفتاح، والفهرس الفريد بأعمدته بالترتيب — مرة قبل أي تغيير
-- (جدول أو فهرس موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يلمس حاجة)، ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.employment_periods', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'periodNo', N'int', 4, 10, 0, 0, 0),
      (N'startDate', N'date', 3, 10, 0, 0, 0),
      (N'endDate', N'date', 3, 10, 0, 0, 0),
      (N'exitReason', N'nvarchar', 120, 0, 0, 1, 0),
      (N'offboardingCaseId', N'int', 4, 10, 0, 1, 0),
      (N'rehireReason', N'nvarchar', 1000, 0, 0, 0, 0),
      (N'rehiredByUserId', N'int', 4, 10, 0, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.employment_periods', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employment_periods', N'U') AND [name] = N'PK_employment_periods'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.employment_periods', N'U') AND i.[name] = N'PK_employment_periods'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 95001, N'20261006_095: جدول employment_periods موجود وشكله مش شكل فترات الخدمة (الأعمدة أو المفتاح)', 1;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employment_periods', N'U') AND [name] = N'UX_employment_periods_employee_no') AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employment_periods', N'U') AND [name] = N'UX_employment_periods_employee_no'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'employeeId'), (2, N'periodNo')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.employment_periods', N'U') AND i.[name] = N'UX_employment_periods_employee_no'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 95002, N'20261006_095: فهرس UX_employment_periods_employee_no موجود ومش فريد على الموظف ورقم الفترة بالترتيب', 1;
GO

IF OBJECT_ID(N'dbo.employment_periods', N'U') IS NULL
CREATE TABLE dbo.employment_periods (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_employment_periods] PRIMARY KEY,
  [employeeId] int NOT NULL,
  [periodNo] int NOT NULL,
  [startDate] date NOT NULL,
  [endDate] date NOT NULL,
  [exitReason] nvarchar(60) NULL,
  [offboardingCaseId] int NULL,
  [rehireReason] nvarchar(500) NOT NULL,
  [rehiredByUserId] int NULL,
  [createdAt] datetime2 NOT NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employment_periods', N'U') AND [name] = N'UX_employment_periods_employee_no')
  CREATE UNIQUE INDEX [UX_employment_periods_employee_no] ON dbo.employment_periods ([employeeId], [periodNo]);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.employment_periods', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'periodNo', N'int', 4, 10, 0, 0, 0),
      (N'startDate', N'date', 3, 10, 0, 0, 0),
      (N'endDate', N'date', 3, 10, 0, 0, 0),
      (N'exitReason', N'nvarchar', 120, 0, 0, 1, 0),
      (N'offboardingCaseId', N'int', 4, 10, 0, 1, 0),
      (N'rehireReason', N'nvarchar', 1000, 0, 0, 0, 0),
      (N'rehiredByUserId', N'int', 4, 10, 0, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.employment_periods', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employment_periods', N'U') AND [name] = N'PK_employment_periods'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.employment_periods', N'U') AND i.[name] = N'PK_employment_periods'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 95003, N'20261006_095: جدول employment_periods ناقص أو شكله غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employment_periods', N'U') AND [name] = N'UX_employment_periods_employee_no') OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employment_periods', N'U') AND [name] = N'UX_employment_periods_employee_no'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'employeeId'), (2, N'periodNo')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.employment_periods', N'U') AND i.[name] = N'UX_employment_periods_employee_no'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 95004, N'20261006_095: فهرس الموظف ورقم الفترة الفريد ناقص أو شكله غلط', 1;
GO
