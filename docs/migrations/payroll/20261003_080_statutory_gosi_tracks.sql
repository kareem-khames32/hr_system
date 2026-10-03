-- 20261003_080: التأمينات السعودية بمسارين وحدود أجر التأمين المصري بتواريخ سريان (خطة التنفيذ — الدفعة B1.5).
-- (1) عمود gosiFirstRegisteredAt (date NULL) على employees: «تاريخ أول تسجيل في التأمينات». فاضي = المسار القديم = الحساب الحالي بالحرف.
-- (2) جدولين بشكل «حزمة الدولة» (B4.2): statutory_definitions (دولة، مفتاح، ساري من، متأكد منها؟، المصدر) وstatutory_values (كود وقيمة).
--     الصفوف نفسها (نسب المسار الجديد وحدود الأجر المصري) بيضيفها الـAPI وقت الإقلاع لو ناقصة — الترحيل ده بيعمل المخطط بس.
-- الكود بيشتغل قبل الترحيل ده (المسار القديم والحدود من شاشة التأمينات، زي النهارده) وبعده.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية. آمن للتكرار بحراسة COL_LENGTH وOBJECT_ID. متوافق مع SQL Server 2019.
-- الأسماء بالحرف اللي الكيانات بتطلعها عشان فرق المخطط يبقى صفرًا: PK_statutory_definitions وUX_statutory_definitions_key
-- وDF_5ebd7b4ee9ed71cf7162d2c581d (اسم TypeORM لافتراضي statutory_definitions.verified) وPK_statutory_values وUX_statutory_values_code.
SET NOCOUNT ON;
GO

-- (1) تاريخ أول تسجيل في التأمينات
IF COL_LENGTH(N'dbo.employees', N'gosiFirstRegisteredAt') IS NULL
  ALTER TABLE dbo.employees ADD [gosiFirstRegisteredAt] date NULL;
GO

-- (2) القيم القانونية المؤرخة
IF OBJECT_ID(N'dbo.statutory_definitions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.statutory_definitions (
    [id] int NOT NULL IDENTITY(1,1),
    [country] nvarchar(2) NOT NULL,
    [key] nvarchar(80) NOT NULL,
    [effectiveFrom] date NOT NULL,
    [verified] bit NOT NULL CONSTRAINT [DF_5ebd7b4ee9ed71cf7162d2c581d] DEFAULT 0,
    [source] nvarchar(300) NULL,
    CONSTRAINT [PK_statutory_definitions] PRIMARY KEY ([id])
  );
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_statutory_definitions_key' AND object_id = OBJECT_ID(N'dbo.statutory_definitions'))
  CREATE UNIQUE INDEX [UX_statutory_definitions_key] ON dbo.statutory_definitions ([country], [key], [effectiveFrom]);
GO
IF OBJECT_ID(N'dbo.statutory_values', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.statutory_values (
    [id] int NOT NULL IDENTITY(1,1),
    [definitionId] int NOT NULL,
    [code] nvarchar(60) NOT NULL,
    [value] decimal(18,4) NOT NULL,
    CONSTRAINT [PK_statutory_values] PRIMARY KEY ([id])
  );
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_statutory_values_code' AND object_id = OBJECT_ID(N'dbo.statutory_values'))
  CREATE UNIQUE INDEX [UX_statutory_values_code] ON dbo.statutory_values ([definitionId], [code]);
GO

-- تحقق: العمود والجدولين بأعمدتهم ومفاتيحهم وفهارسهم والافتراضي بأسمائهم
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employees') AND name = N'gosiFirstRegisteredAt'
               AND system_type_id = TYPE_ID(N'date') AND is_nullable = 1)
  THROW 80001, N'20261003_080: عمود employees.gosiFirstRegisteredAt ناقص أو بنوع غلط', 1;
IF OBJECT_ID(N'dbo.statutory_definitions', N'U') IS NULL OR OBJECT_ID(N'dbo.statutory_values', N'U') IS NULL
  THROW 80002, N'20261003_080: جدولي القيم القانونية المؤرخة مش موجودين بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.statutory_definitions') AND name = N'id'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 0 AND is_identity = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.statutory_definitions') AND name = N'country'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 4 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.statutory_definitions') AND name = N'key'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 160 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.statutory_definitions') AND name = N'effectiveFrom'
               AND system_type_id = TYPE_ID(N'date') AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.statutory_definitions') AND name = N'verified'
               AND system_type_id = TYPE_ID(N'bit') AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.statutory_definitions') AND name = N'source'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 600 AND is_nullable = 1)
  THROW 80003, N'20261003_080: أعمدة statutory_definitions ناقصة أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.statutory_values') AND name = N'id'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 0 AND is_identity = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.statutory_values') AND name = N'definitionId'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.statutory_values') AND name = N'code'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 120 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.statutory_values') AND name = N'value'
               AND system_type_id = TYPE_ID(N'decimal') AND precision = 18 AND scale = 4 AND is_nullable = 0)
  THROW 80004, N'20261003_080: أعمدة statutory_values ناقصة أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'PK_statutory_definitions' AND type = 'PK' AND parent_object_id = OBJECT_ID(N'dbo.statutory_definitions'))
  OR NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'PK_statutory_values' AND type = 'PK' AND parent_object_id = OBJECT_ID(N'dbo.statutory_values'))
  THROW 80005, N'20261003_080: المفتاحين الأساسيين للجدولين مش موجودين بأسمائهم', 1;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
               WHERE d.name = N'DF_5ebd7b4ee9ed71cf7162d2c581d' AND d.parent_object_id = OBJECT_ID(N'dbo.statutory_definitions') AND c.name = N'verified')
  THROW 80006, N'20261003_080: افتراضي statutory_definitions.verified مش موجود باسمه', 1;
IF (SELECT COUNT(*) FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.name = N'UX_statutory_definitions_key' AND i.object_id = OBJECT_ID(N'dbo.statutory_definitions') AND i.is_unique = 1
      AND ((ic.key_ordinal = 1 AND c.name = N'country') OR (ic.key_ordinal = 2 AND c.name = N'key') OR (ic.key_ordinal = 3 AND c.name = N'effectiveFrom'))) <> 3
  OR (SELECT COUNT(*) FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.name = N'UX_statutory_values_code' AND i.object_id = OBJECT_ID(N'dbo.statutory_values') AND i.is_unique = 1
      AND ((ic.key_ordinal = 1 AND c.name = N'definitionId') OR (ic.key_ordinal = 2 AND c.name = N'code'))) <> 2
  THROW 80007, N'20261003_080: الفهرسين الفريدين للجدولين ناقصين أو بأعمدة غلط', 1;
GO
