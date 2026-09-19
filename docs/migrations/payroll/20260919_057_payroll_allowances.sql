-- 20260919_057: «تابة البدلات» في شاشة المسير.
-- 3 جداول جديدة فقط:
--   payroll_allowance_types       أنواع البدلات (للشركة كلها افتراضيًا، أو خاصة بفرع branchId)، والكود فريد.
--   payroll_allowance_grants      دفعة صرف: الشهر والنوع (باسمه وقت الصرف) والمبلغ لكل موظف والاستهداف والسبب.
--   payroll_allowance_grant_lines سطر لكل موظف مربوط بإضافة في دفتر المديونيات (employee_obligations: CREDIT / allowance)،
--                                 فتدخل «إضافات أخرى» في مسير الشهر عند الحساب أو إعادة الحساب، والمعتمد والمصروف ما بيتغيرش.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية، ولا تغيير على جداول قائمة.
-- أسماء القيود والفهارس مطابقة لما تولّده TypeORM حتى يبقى فرق المخطط صفرًا. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.payroll_allowance_types', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.payroll_allowance_types (
    [id] int NOT NULL IDENTITY(1,1),
    [code] nvarchar(40) NOT NULL,
    [name] nvarchar(120) NOT NULL,
    [branchId] int NULL,
    [isActive] bit NOT NULL CONSTRAINT [DF_47b384d577be8b2b390be61941a] DEFAULT 1,
    [createdByUserId] int NOT NULL,
    [createdAt] datetime2 NOT NULL CONSTRAINT [DF_dfa600911b9e2a103b49b152f69] DEFAULT SYSUTCDATETIME(),
    [updatedByUserId] int NULL,
    [updatedAt] datetime2 NULL,
    CONSTRAINT [PK_payroll_allowance_types] PRIMARY KEY ([id])
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_payroll_allowance_types_code' AND object_id = OBJECT_ID(N'dbo.payroll_allowance_types'))
  CREATE UNIQUE INDEX [UX_payroll_allowance_types_code] ON dbo.payroll_allowance_types ([code]);
GO

IF OBJECT_ID(N'dbo.payroll_allowance_grants', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.payroll_allowance_grants (
    [id] int NOT NULL IDENTITY(1,1),
    [period] nvarchar(7) NOT NULL,
    [allowanceTypeId] int NOT NULL,
    [typeName] nvarchar(120) NOT NULL,
    [amount] decimal(18,2) NOT NULL,
    [targetLevel] nvarchar(20) NOT NULL,
    [branchId] int NULL,
    [targetIds] nvarchar(MAX) NULL,
    [reason] nvarchar(500) NOT NULL,
    [employeeCount] int NOT NULL,
    [createdByUserId] int NOT NULL,
    [createdAt] datetime2 NOT NULL CONSTRAINT [DF_fe03a67e49f0fba6214b5da4060] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_payroll_allowance_grants] PRIMARY KEY ([id])
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_allowance_grants_period' AND object_id = OBJECT_ID(N'dbo.payroll_allowance_grants'))
  CREATE INDEX [IX_payroll_allowance_grants_period] ON dbo.payroll_allowance_grants ([period]);
GO

IF OBJECT_ID(N'dbo.payroll_allowance_grant_lines', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.payroll_allowance_grant_lines (
    [id] int NOT NULL IDENTITY(1,1),
    [grantId] int NOT NULL,
    [period] nvarchar(7) NOT NULL,
    [employeeId] int NOT NULL,
    [branchId] int NULL,
    [allowanceTypeId] int NOT NULL,
    [amount] decimal(18,2) NOT NULL,
    [obligationId] int NULL,
    [status] nvarchar(15) NOT NULL CONSTRAINT [DF_9907e6ec87441b578acc760bc1e] DEFAULT 'ACTIVE',
    [createdAt] datetime2 NOT NULL CONSTRAINT [DF_244ca7e84ae780140147a13a06d] DEFAULT SYSUTCDATETIME(),
    [cancelledByUserId] int NULL,
    [cancelledAt] datetime2 NULL,
    CONSTRAINT [PK_payroll_allowance_grant_lines] PRIMARY KEY ([id])
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_allowance_grant_lines_employee' AND object_id = OBJECT_ID(N'dbo.payroll_allowance_grant_lines'))
  CREATE INDEX [IX_payroll_allowance_grant_lines_employee] ON dbo.payroll_allowance_grant_lines ([employeeId], [period]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_allowance_grant_lines_grant' AND object_id = OBJECT_ID(N'dbo.payroll_allowance_grant_lines'))
  CREATE INDEX [IX_payroll_allowance_grant_lines_grant] ON dbo.payroll_allowance_grant_lines ([grantId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_allowance_grant_lines_period' AND object_id = OBJECT_ID(N'dbo.payroll_allowance_grant_lines'))
  CREATE INDEX [IX_payroll_allowance_grant_lines_period] ON dbo.payroll_allowance_grant_lines ([period], [status]);
GO

-- تحقق: الجداول والفهارس والأعمدة الأساسية موجودة
IF OBJECT_ID(N'dbo.payroll_allowance_types', N'U') IS NULL OR OBJECT_ID(N'dbo.payroll_allowance_grants', N'U') IS NULL
  OR OBJECT_ID(N'dbo.payroll_allowance_grant_lines', N'U') IS NULL
  THROW 57001, N'20260919_057: جداول البدلات غير موجودة بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_payroll_allowance_types_code' AND is_unique = 1 AND object_id = OBJECT_ID(N'dbo.payroll_allowance_types'))
  THROW 57002, N'20260919_057: فهرس كود نوع البدل الفريد غير موجود', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_allowance_grant_lines_period' AND object_id = OBJECT_ID(N'dbo.payroll_allowance_grant_lines'))
  OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_allowance_grant_lines_grant' AND object_id = OBJECT_ID(N'dbo.payroll_allowance_grant_lines'))
  OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_allowance_grant_lines_employee' AND object_id = OBJECT_ID(N'dbo.payroll_allowance_grant_lines'))
  OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_allowance_grants_period' AND object_id = OBJECT_ID(N'dbo.payroll_allowance_grants'))
  THROW 57003, N'20260919_057: فهارس صرف البدلات ناقصة', 1;
IF COL_LENGTH(N'dbo.payroll_allowance_grant_lines', N'obligationId') IS NULL OR COL_LENGTH(N'dbo.payroll_allowance_grant_lines', N'cancelledAt') IS NULL
  OR COL_LENGTH(N'dbo.payroll_allowance_grants', N'targetIds') IS NULL OR COL_LENGTH(N'dbo.payroll_allowance_types', N'branchId') IS NULL
  THROW 57004, N'20260919_057: أعمدة البدلات ناقصة', 1;
GO
