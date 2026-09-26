-- 20260926_071: «البدل الثابت الشهري» في «تابة البدلات» (طلب المالك 26 سبتمبر — أول استخدام «بدل ضغط عمل»).
-- جدول جديد واحد فقط:
--   payroll_recurring_allowances  إسناد نوع بدل لموظف بمبلغ شهري ثابت من شهر رواتب (fromPeriod) ولحد شهر اختياري (untilPeriod)،
--                                 والإيقاف بسببه ومين وإمتى (stoppedFromPeriod = أول شهر ما يتصرفش). صف لكل موظف.
-- القيد الشهري نفسه في دفتر المديونيات القائم (employee_obligations: CREDIT / allowance) بمرجع ثابت recurring-allowance:<id>:<الشهر>،
-- بيتعمل وقت حساب مسير الشهر — مفيش أعمدة جديدة على أي جدول قائم.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية. آمن للتكرار بحراسات OBJECT_ID وsys.indexes.
-- أسماء القيود والفهارس مطابقة لما تولّده TypeORM (قيم DF_ الافتراضية من DefaultNamingStrategy) حتى يبقى فرق المخطط صفرًا.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.payroll_recurring_allowances', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.payroll_recurring_allowances (
    [id] int NOT NULL IDENTITY(1,1),
    [employeeId] int NOT NULL,
    [branchId] int NULL,
    [allowanceTypeId] int NOT NULL,
    [typeName] nvarchar(120) NOT NULL,
    [amount] decimal(18,2) NOT NULL,
    [fromPeriod] nvarchar(7) NOT NULL,
    [untilPeriod] nvarchar(7) NULL,
    [targetLevel] nvarchar(20) NOT NULL,
    [reason] nvarchar(500) NOT NULL,
    [status] nvarchar(15) NOT NULL CONSTRAINT [DF_225c8c1cc8f767d1a3ca0e70ee5] DEFAULT 'ACTIVE',
    [stoppedFromPeriod] nvarchar(7) NULL,
    [stopReason] nvarchar(500) NULL,
    [stoppedByUserId] int NULL,
    [stoppedAt] datetime2 NULL,
    [createdByUserId] int NOT NULL,
    [createdAt] datetime2 NOT NULL CONSTRAINT [DF_6e085202ba7cdf7f78663abf7c2] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_payroll_recurring_allowances] PRIMARY KEY ([id])
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_recurring_allowances_employee' AND object_id = OBJECT_ID(N'dbo.payroll_recurring_allowances'))
  CREATE INDEX [IX_payroll_recurring_allowances_employee] ON dbo.payroll_recurring_allowances ([employeeId], [status]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_recurring_allowances_type' AND object_id = OBJECT_ID(N'dbo.payroll_recurring_allowances'))
  CREATE INDEX [IX_payroll_recurring_allowances_type] ON dbo.payroll_recurring_allowances ([allowanceTypeId]);
GO

-- تحقق: الجدول ومفتاحه وفهرساه وقيمه الافتراضية بأسمائها، والأعمدة الأساسية بأنواعها
IF OBJECT_ID(N'dbo.payroll_recurring_allowances', N'U') IS NULL
  THROW 71001, N'20260926_071: جدول payroll_recurring_allowances غير موجود بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'PK_payroll_recurring_allowances' AND [type] = 'PK'
               AND parent_object_id = OBJECT_ID(N'dbo.payroll_recurring_allowances'))
  THROW 71002, N'20260926_071: المفتاح الأساسي PK_payroll_recurring_allowances ناقص', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_recurring_allowances_employee' AND object_id = OBJECT_ID(N'dbo.payroll_recurring_allowances'))
  OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_recurring_allowances_type' AND object_id = OBJECT_ID(N'dbo.payroll_recurring_allowances'))
  THROW 71003, N'20260926_071: فهارس البدل الثابت الشهري ناقصة', 1;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_225c8c1cc8f767d1a3ca0e70ee5' AND parent_object_id = OBJECT_ID(N'dbo.payroll_recurring_allowances'))
  OR NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_6e085202ba7cdf7f78663abf7c2' AND parent_object_id = OBJECT_ID(N'dbo.payroll_recurring_allowances'))
  THROW 71004, N'20260926_071: القيم الافتراضية للحالة وتاريخ الإنشاء ناقصة', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.payroll_recurring_allowances') AND name = N'amount'
               AND system_type_id = TYPE_ID(N'decimal') AND [precision] = 18 AND scale = 2 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.payroll_recurring_allowances') AND name = N'fromPeriod'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 14 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.payroll_recurring_allowances') AND name = N'untilPeriod'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 14 AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.payroll_recurring_allowances') AND name = N'stoppedFromPeriod'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 14 AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.payroll_recurring_allowances') AND name = N'status'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 30 AND is_nullable = 0)
  THROW 71005, N'20260926_071: أعمدة البدل الثابت الشهري ناقصة أو بنوع غلط', 1;
GO
