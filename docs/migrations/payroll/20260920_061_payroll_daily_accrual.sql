-- 20260920_061: تراكم المسير يومًا بيوم (قرار المالك 20 سبتمبر).
-- جدول واحد جديد:
--   payroll_daily_accrual  حقائق اليوم-موظف المحسوبة (دقائق الشغل والتأخير والنقص والإضافي، وأعلام
--                          الإجازة والإيقاف ودوام العطلة والاستثناء، ومبالغ اليوم الاسترشادية)،
--                          مع بصمة المدخلات اللي اتحسب منها (inputsHash) وعلامة «متسخ» (isDirty).
-- ليه: حساب شهر كامل لـ580 موظف كان بيعيد حساب كل يوم-موظف مرة واحدة آخر الشهر (~2.6 ساعة).
-- بعد ده الجار الليلي بيحسب «أمس» لكل مسير مفتوح، وإقفال الشهر بيقرأ الأيام المتراكمة النضيفة
-- ويحسب الناقص والمتسخ بس — نفس النتيجة بالحرف، في دقائق.
-- المفتاح الفريد (employeeId, period, date)، و runId فهرس للمسير المفتوح.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية، ولا تغيير على أي جدول قائم.
-- أسماء القيود والفهارس مطابقة لما يولّده TypeORM حتى يبقى فرق المخطط صفرًا. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.payroll_daily_accrual', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.payroll_daily_accrual (
    [id] int NOT NULL IDENTITY(1,1),
    [runId] int NULL,
    [employeeId] int NOT NULL,
    [period] nvarchar(7) NOT NULL,
    [date] date NOT NULL,
    [attendanceStatus] nvarchar(20) NULL,
    [workMinutes] int NOT NULL CONSTRAINT [DF_06d0b512568395e941ded174432] DEFAULT ((0)),
    [lateMinutes] int NOT NULL CONSTRAINT [DF_c112b8f437a56610a86adbb7a44] DEFAULT ((0)),
    [deductibleMinutes] int NOT NULL CONSTRAINT [DF_f274468b656f582e93340bdd16e] DEFAULT ((0)),
    [shortfallMinutes] int NOT NULL CONSTRAINT [DF_144d29e95ce59e44b985397d875] DEFAULT ((0)),
    [earlyLeaveMinutes] int NOT NULL CONSTRAINT [DF_07e2a2e329883ad512aaf25c948] DEFAULT ((0)),
    [overtimeMinutes] int NOT NULL CONSTRAINT [DF_bb972e15db327bda5c2c1b318cd] DEFAULT ((0)),
    [overtimeAmount] decimal(18,2) NOT NULL CONSTRAINT [DF_b5c75e6d8188de4c82ae5b4a2ec] DEFAULT ((0)),
    [isAbsent] bit NOT NULL CONSTRAINT [DF_6208b95a64bf579b3d63d4315f2] DEFAULT ((0)),
    [isLeave] bit NOT NULL CONSTRAINT [DF_0c3f08a7d97b055fa367f94b1c6] DEFAULT ((0)),
    [isUnpaidLeave] bit NOT NULL CONSTRAINT [DF_e59075bd13684ec3e8a7ef86ef2] DEFAULT ((0)),
    [isSickLeave] bit NOT NULL CONSTRAINT [DF_4b23cf8ee61483da2ad91ddd697] DEFAULT ((0)),
    [isSuspended] bit NOT NULL CONSTRAINT [DF_657d008b32eccbd94211affca32] DEFAULT ((0)),
    [isHolidayWork] bit NOT NULL CONSTRAINT [DF_9228e30ac672b3216fed93ceaa7] DEFAULT ((0)),
    [isExempt] bit NOT NULL CONSTRAINT [DF_bfcdcd3c4234889b0c8c3a10ee5] DEFAULT ((0)),
    [isWorkday] bit NOT NULL CONSTRAINT [DF_2c0cfbb2e4d5558d44e20c1c700] DEFAULT ((0)),
    [earningsAmount] decimal(18,2) NOT NULL CONSTRAINT [DF_77c6acdd1070e946a94544d165c] DEFAULT ((0)),
    [latenessAmount] decimal(18,2) NOT NULL CONSTRAINT [DF_3620cbddde695edc10bce9672b9] DEFAULT ((0)),
    [shortfallAmount] decimal(18,2) NOT NULL CONSTRAINT [DF_b8dbcf3a904e31aafe48bd3db93] DEFAULT ((0)),
    [absenceAmount] decimal(18,2) NOT NULL CONSTRAINT [DF_58093cfb26dcd857db4ff0a49ac] DEFAULT ((0)),
    [leaveAmount] decimal(18,2) NOT NULL CONSTRAINT [DF_9b26f90e258baecad86f450b7df] DEFAULT ((0)),
    [suspensionAmount] decimal(18,2) NOT NULL CONSTRAINT [DF_fb0cf9a02300880ebd1a392ba37] DEFAULT ((0)),
    [components] nvarchar(MAX) NULL,
    [inputsHash] nvarchar(64) NULL,
    [isDirty] bit NOT NULL CONSTRAINT [DF_71be0abc774127166ece1608e00] DEFAULT ((0)),
    [dirtyReason] nvarchar(200) NULL,
    [computedAt] datetime2 NULL,
    [dirtyAt] datetime2 NULL,
    CONSTRAINT [PK_payroll_daily_accrual] PRIMARY KEY ([id])
  );
END
GO

-- يوم واحد لكل موظف في الشهر: يمنع تكرار الصف لو اتنين تراكم اشتغلوا مع بعض
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_payroll_daily_accrual_day' AND object_id = OBJECT_ID(N'dbo.payroll_daily_accrual'))
  CREATE UNIQUE INDEX [UX_payroll_daily_accrual_day] ON dbo.payroll_daily_accrual ([employeeId], [period], [date]);
GO

-- «آخر يوم محسوب» لمسير في شاشة المسير
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_daily_accrual_run' AND object_id = OBJECT_ID(N'dbo.payroll_daily_accrual'))
  CREATE INDEX [IX_payroll_daily_accrual_run] ON dbo.payroll_daily_accrual ([runId], [date]);
GO

-- الأيام المتسخة في الشهر (الجار الليلي وزرار «حدّث الحساب»)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_daily_accrual_dirty' AND object_id = OBJECT_ID(N'dbo.payroll_daily_accrual'))
  CREATE INDEX [IX_payroll_daily_accrual_dirty] ON dbo.payroll_daily_accrual ([period], [isDirty]);
GO
