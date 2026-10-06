-- 20261006_094: الحقول المخصصة على ملف الموظف (خطة التنفيذ — الدفعة B2.9 الجزء ب).
-- جدولين جداد:
--   employee_custom_fields: تعريف الحقل — مفتاحه، واسمه، ونوعه (TEXT، NUMBER، DATE، CHOICE، YESNO)، واختياراته (JSON للقايمة)،
--     وإلزامي، ومقيّد (للي يعدّل الملف بس)، وترتيبه، ونشط. المفتاح فريد.
--   employee_custom_values: قيمة موظف في حقل — بعمود حسب النوع (نص، رقم، تاريخ)، ومين عدّلها وإمتى. سطر واحد لكل موظف وحقل.
-- الكود بيشتغل قبل الترحيل ده (ملف الموظف زي ما هو، والحقول مش ظاهرة، وحفظها مرفوض برسالته) وبعده.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيانات). آمن للتكرار.
-- التحقق كامل (Codex CRP2T-B-B03): كل عمود بنوعه وطوله ودقته وإلزامه وهويته، والمفتاحين، والفهرسين الفريدين بأعمدتهم بالترتيب —
-- مرة قبل أي تغيير (جدول أو فهرس موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يلمس حاجة)، ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.employee_custom_fields', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'fieldKey', N'nvarchar', 80, 0, 0, 0, 0),
      (N'label', N'nvarchar', 200, 0, 0, 0, 0),
      (N'type', N'nvarchar', 20, 0, 0, 0, 0),
      (N'options', N'nvarchar', -1, 0, 0, 1, 0),
      (N'required', N'bit', 1, 1, 0, 0, 0),
      (N'restricted', N'bit', 1, 1, 0, 0, 0),
      (N'sortOrder', N'int', 4, 10, 0, 0, 0),
      (N'isActive', N'bit', 1, 1, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.employee_custom_fields', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_custom_fields', N'U') AND [name] = N'PK_employee_custom_fields'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.employee_custom_fields', N'U') AND i.[name] = N'PK_employee_custom_fields'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 94001, N'20261006_094: جدول employee_custom_fields موجود وشكله مش شكل تعريف الحقول (الأعمدة أو المفتاح)', 1;
IF OBJECT_ID(N'dbo.employee_custom_values', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'fieldId', N'int', 4, 10, 0, 0, 0),
      (N'textValue', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'numberValue', N'decimal', 9, 18, 4, 1, 0),
      (N'dateValue', N'date', 3, 10, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.employee_custom_values', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_custom_values', N'U') AND [name] = N'PK_employee_custom_values'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.employee_custom_values', N'U') AND i.[name] = N'PK_employee_custom_values'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 94002, N'20261006_094: جدول employee_custom_values موجود وشكله مش شكل قيم الحقول (الأعمدة أو المفتاح)', 1;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_custom_fields', N'U') AND [name] = N'UX_employee_custom_fields_key') AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_custom_fields', N'U') AND [name] = N'UX_employee_custom_fields_key'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'fieldKey')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.employee_custom_fields', N'U') AND i.[name] = N'UX_employee_custom_fields_key'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 94003, N'20261006_094: فهرس UX_employee_custom_fields_key موجود ومش فريد على مفتاح الحقل لوحده', 1;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_custom_values', N'U') AND [name] = N'UX_employee_custom_values_employee_field') AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_custom_values', N'U') AND [name] = N'UX_employee_custom_values_employee_field'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'employeeId'), (2, N'fieldId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.employee_custom_values', N'U') AND i.[name] = N'UX_employee_custom_values_employee_field'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 94004, N'20261006_094: فهرس UX_employee_custom_values_employee_field موجود ومش فريد على الموظف والحقل بالترتيب', 1;
GO

IF OBJECT_ID(N'dbo.employee_custom_fields', N'U') IS NULL
CREATE TABLE dbo.employee_custom_fields (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_employee_custom_fields] PRIMARY KEY,
  [fieldKey] nvarchar(40) NOT NULL,
  [label] nvarchar(100) NOT NULL,
  [type] nvarchar(10) NOT NULL,
  [options] nvarchar(max) NULL,
  [required] bit NOT NULL,
  [restricted] bit NOT NULL,
  [sortOrder] int NOT NULL,
  [isActive] bit NOT NULL,
  [createdAt] datetime2 NOT NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_custom_fields', N'U') AND [name] = N'UX_employee_custom_fields_key')
  CREATE UNIQUE INDEX [UX_employee_custom_fields_key] ON dbo.employee_custom_fields ([fieldKey]);
GO

IF OBJECT_ID(N'dbo.employee_custom_values', N'U') IS NULL
CREATE TABLE dbo.employee_custom_values (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_employee_custom_values] PRIMARY KEY,
  [employeeId] int NOT NULL,
  [fieldId] int NOT NULL,
  [textValue] nvarchar(500) NULL,
  [numberValue] decimal(18,4) NULL,
  [dateValue] date NULL,
  [updatedAt] datetime2 NOT NULL,
  [updatedByUserId] int NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_custom_values', N'U') AND [name] = N'UX_employee_custom_values_employee_field')
  CREATE UNIQUE INDEX [UX_employee_custom_values_employee_field] ON dbo.employee_custom_values ([employeeId], [fieldId]);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.employee_custom_fields', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'fieldKey', N'nvarchar', 80, 0, 0, 0, 0),
      (N'label', N'nvarchar', 200, 0, 0, 0, 0),
      (N'type', N'nvarchar', 20, 0, 0, 0, 0),
      (N'options', N'nvarchar', -1, 0, 0, 1, 0),
      (N'required', N'bit', 1, 1, 0, 0, 0),
      (N'restricted', N'bit', 1, 1, 0, 0, 0),
      (N'sortOrder', N'int', 4, 10, 0, 0, 0),
      (N'isActive', N'bit', 1, 1, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.employee_custom_fields', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_custom_fields', N'U') AND [name] = N'PK_employee_custom_fields'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.employee_custom_fields', N'U') AND i.[name] = N'PK_employee_custom_fields'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 94005, N'20261006_094: جدول employee_custom_fields ناقص أو شكله غلط', 1;
IF OBJECT_ID(N'dbo.employee_custom_values', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'fieldId', N'int', 4, 10, 0, 0, 0),
      (N'textValue', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'numberValue', N'decimal', 9, 18, 4, 1, 0),
      (N'dateValue', N'date', 3, 10, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.employee_custom_values', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_custom_values', N'U') AND [name] = N'PK_employee_custom_values'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.employee_custom_values', N'U') AND i.[name] = N'PK_employee_custom_values'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 94006, N'20261006_094: جدول employee_custom_values ناقص أو شكله غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_custom_fields', N'U') AND [name] = N'UX_employee_custom_fields_key') OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_custom_fields', N'U') AND [name] = N'UX_employee_custom_fields_key'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'fieldKey')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.employee_custom_fields', N'U') AND i.[name] = N'UX_employee_custom_fields_key'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
   OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_custom_values', N'U') AND [name] = N'UX_employee_custom_values_employee_field') OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_custom_values', N'U') AND [name] = N'UX_employee_custom_values_employee_field'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'employeeId'), (2, N'fieldId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.employee_custom_values', N'U') AND i.[name] = N'UX_employee_custom_values_employee_field'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 94007, N'20261006_094: فهرس فريد ناقص أو شكله غلط (مفتاح الحقل، أو الموظف والحقل)', 1;
GO
