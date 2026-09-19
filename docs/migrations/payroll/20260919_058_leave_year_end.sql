-- 20260919_058: «إقفال سنة الإجازات» + بداية استحقاق السنوية للموظف الجديد.
-- leave_types:
--   entitlementStartMonths int NULL   السنوية: الرصيد يبدأ بعد كام شهر من التعيين (0 = من يوم التعيين؛ NULL = الإعداد العام leave.probation_months كما هو اليوم).
--   firstYearProrated      bit NOT NULL افتراضي 1 — أول سنة يستحق فيها بالنسبة من يوم الاستحقاق (نفس حساب الاستحقاق الشهري/اليومي اليوم).
--                          لو طريقة الاستحقاق الحالية «سنوي» (leave.accrual_mode = yearly) الأنواع القائمة تاخد 0 = أول سنة كاملة، نفس السلوك الحالي.
-- leave_balances:
--   settledDays decimal(8,2) NOT NULL افتراضي 0 — أيام اتسوّت من شاشة الإقفال (اتصرفت بدل أو اتصفّرت)، بتنقص من المتبقي.
-- leave_balance_settlements (جديد): سجل لكل «تسوية رصيد موظف» — الأيام والسبب، وللمصروف: الراتب والمبلغ وشهر المسير وقيد الإضافة في دفتر المديونيات.
-- إضافي فقط: بلا DROP ولا DELETE؛ التعبئة الوحيدة = firstYearProrated للأنواع القائمة عند إضافة العمود أول مرة (والتشغيل التاني مابيعملش حاجة).
-- أسماء القيود والفهارس مطابقة لما تولّده TypeORM حتى يبقى فرق المخطط صفرًا. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.leave_types', N'entitlementStartMonths') IS NULL
  ALTER TABLE dbo.leave_types ADD [entitlementStartMonths] int NULL;
GO

IF COL_LENGTH(N'dbo.leave_types', N'firstYearProrated') IS NULL
BEGIN
  ALTER TABLE dbo.leave_types ADD [firstYearProrated] bit NOT NULL CONSTRAINT [DF_a1c3077785e5dc51059f03141b5] DEFAULT 1;
  -- الاستحقاق «سنوي» كان بيدي أول سنة كاملة: نفس السلوك يفضل للأنواع القائمة
  IF EXISTS (SELECT 1 FROM dbo.requests_config WHERE [key] = N'leave.accrual_mode' AND [value] = N'yearly')
    EXEC(N'UPDATE dbo.leave_types SET [firstYearProrated] = 0');
END
GO

IF COL_LENGTH(N'dbo.leave_balances', N'settledDays') IS NULL
  ALTER TABLE dbo.leave_balances ADD [settledDays] decimal(8,2) NOT NULL CONSTRAINT [DF_10f15487e4293dfbba779a28c5b] DEFAULT 0;
GO

IF OBJECT_ID(N'dbo.leave_balance_settlements', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.leave_balance_settlements (
    [id] int NOT NULL IDENTITY(1,1),
    [employeeId] int NOT NULL,
    [balanceType] nvarchar(50) NOT NULL,
    [period] nvarchar(20) NOT NULL,
    [year] nvarchar(4) NOT NULL,
    [days] decimal(8,2) NOT NULL,
    [mode] nvarchar(10) NOT NULL,
    [reason] nvarchar(500) NOT NULL,
    [beforeRemaining] decimal(8,2) NOT NULL,
    [monthlySalary] decimal(18,2) NULL,
    [amount] decimal(18,2) NULL,
    [payrollPeriod] nvarchar(7) NULL,
    [obligationId] int NULL,
    [idempotencyKey] nvarchar(36) NOT NULL,
    [actorUserId] int NOT NULL,
    [createdAt] datetime2 NOT NULL CONSTRAINT [DF_b5dafe52d490cf5350566fadf64] DEFAULT getdate(),
    CONSTRAINT [UQ_leave_settlement_operation] UNIQUE ([employeeId], [idempotencyKey]),
    CONSTRAINT [PK_8128df3173194740d4f36d2e336] PRIMARY KEY ([id])
  );
  CREATE INDEX [IDX_edbb478a07c1659bca24592042] ON dbo.leave_balance_settlements ([employeeId]);
END
GO

-- تحقق: الأعمدة والجدول موجودين، والقيود الافتراضية بأسماء TypeORM
IF COL_LENGTH(N'dbo.leave_types', N'entitlementStartMonths') IS NULL
   OR COL_LENGTH(N'dbo.leave_types', N'firstYearProrated') IS NULL
   OR COL_LENGTH(N'dbo.leave_balances', N'settledDays') IS NULL
   OR OBJECT_ID(N'dbo.leave_balance_settlements', N'U') IS NULL
  THROW 56581, N'20260919_058: أعمدة أو جدول إقفال سنة الإجازات ناقص', 1;
IF (SELECT COUNT(*) FROM sys.default_constraints WHERE [name] IN (N'DF_a1c3077785e5dc51059f03141b5', N'DF_10f15487e4293dfbba779a28c5b', N'DF_b5dafe52d490cf5350566fadf64')) <> 3
  THROW 56582, N'20260919_058: القيود الافتراضية مش بأسماء TypeORM', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.leave_balance_settlements') AND [name] = N'IDX_edbb478a07c1659bca24592042')
  THROW 56583, N'20260919_058: فهرس الموظف على سجل التسويات ناقص', 1;
GO
