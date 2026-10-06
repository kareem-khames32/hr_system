-- 20261006_094: الحقول المخصصة على ملف الموظف (خطة التنفيذ — الدفعة B2.9 الجزء ب).
-- جدولين جداد:
--   employee_custom_fields: تعريف الحقل — مفتاحه، واسمه، ونوعه (TEXT، NUMBER، DATE، CHOICE، YESNO)، واختياراته (JSON للقايمة)،
--     وإلزامي، ومقيّد (للي يعدّل الملف بس)، وترتيبه، ونشط. المفتاح فريد.
--   employee_custom_values: قيمة موظف في حقل — بعمود حسب النوع (نص، رقم، تاريخ)، ومين عدّلها وإمتى. سطر واحد لكل موظف وحقل.
-- الكود بيشتغل قبل الترحيل ده (ملف الموظف زي ما هو، والحقول مش ظاهرة، وحفظها مرفوض برسالته) وبعده.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيانات). آمن للتكرار بحراسة OBJECT_ID وsys.indexes.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير: جدول قديم بنفس الاسم وبشكل تاني = الترحيل بيقف هنا من غير ما يلمسه
IF OBJECT_ID(N'dbo.employee_custom_fields', N'U') IS NOT NULL AND ((SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_custom_fields')) <> 10
   OR COL_LENGTH(N'dbo.employee_custom_fields', N'fieldKey') IS NULL OR COL_LENGTH(N'dbo.employee_custom_fields', N'restricted') IS NULL)
  THROW 94001, N'20261006_094: جدول employee_custom_fields موجود وأعمدته مش أعمدة تعريف الحقول الـ10', 1;
IF OBJECT_ID(N'dbo.employee_custom_values', N'U') IS NOT NULL AND ((SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_custom_values')) <> 8
   OR COL_LENGTH(N'dbo.employee_custom_values', N'fieldId') IS NULL OR COL_LENGTH(N'dbo.employee_custom_values', N'numberValue') IS NULL)
  THROW 94002, N'20261006_094: جدول employee_custom_values موجود وأعمدته مش أعمدة قيم الحقول الـ8', 1;
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

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.employee_custom_fields') AND name = N'UX_employee_custom_fields_key')
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

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.employee_custom_values') AND name = N'UX_employee_custom_values_employee_field')
  CREATE UNIQUE INDEX [UX_employee_custom_values_employee_field] ON dbo.employee_custom_values ([employeeId], [fieldId]);
GO

-- تحقق: الأعمدة بأنواعها، والفهرسين
IF (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_custom_fields')) <> 10
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_custom_fields') AND name = N'fieldKey'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 80 AND is_nullable = 0)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_custom_fields') AND name = N'label'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 200 AND is_nullable = 0)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_custom_fields') AND name = N'type'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 20 AND is_nullable = 0)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_custom_fields') AND name = N'options'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = -1 AND is_nullable = 1)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_custom_fields') AND name = N'restricted'
               AND system_type_id = TYPE_ID(N'bit') AND is_nullable = 0 AND default_object_id = 0)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_custom_fields') AND name = N'sortOrder'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 0 AND default_object_id = 0)
  THROW 94003, N'20261006_094: أعمدة جدول employee_custom_fields ناقصة أو بنوع غلط', 1;
IF (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_custom_values')) <> 8
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_custom_values') AND name = N'textValue'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 1000 AND is_nullable = 1)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_custom_values') AND name = N'numberValue'
               AND system_type_id = TYPE_ID(N'decimal') AND [precision] = 18 AND scale = 4 AND is_nullable = 1)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_custom_values') AND name = N'dateValue'
               AND system_type_id = TYPE_ID(N'date') AND is_nullable = 1)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_custom_values') AND name = N'updatedByUserId'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1)
  THROW 94004, N'20261006_094: أعمدة جدول employee_custom_values ناقصة أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.employee_custom_fields') AND name = N'UX_employee_custom_fields_key' AND is_unique = 1)
   OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.employee_custom_values') AND name = N'UX_employee_custom_values_employee_field' AND is_unique = 1)
  THROW 94005, N'20261006_094: فهرس فريد ناقص (مفتاح الحقل، أو الموظف والحقل)', 1;
GO
