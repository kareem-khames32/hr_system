-- 20260916_044: الإيقاف عن العمل لفترة (قرار المالك 16 سبتمبر).
-- جدول جديد فقط: employee_suspensions (من تاريخ، إلى تاريخ، السبب، والإنهاء المبكر) — سجل كامل على ملف الموظف.
-- الحالة «موقوف» مشتقة من التواريخ في الخادم، فلا يُلمس employees.status ولا isActive لأي موظف،
-- ويبقى الموقوف القديم (status = 'suspended') مقروءًا كما هو. أيام الإيقاف ليست غيابًا وتُخصم في المسير يومًا بيوم.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية.
-- أسماء القيود والفهرس مطابقة لما تولّده TypeORM حتى يبقى فرق المخطط صفرًا.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.employee_suspensions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.employee_suspensions (
    [id] int NOT NULL IDENTITY(1,1),
    [employeeId] int NOT NULL,
    [fromDate] date NOT NULL,
    [toDate] date NOT NULL,
    [plannedToDate] date NOT NULL,
    [reason] nvarchar(500) NOT NULL,
    [status] nvarchar(20) NOT NULL CONSTRAINT [DF_94ca48e4c59d347d3d3af20e042] DEFAULT 'ACTIVE',
    [endReason] nvarchar(500) NULL,
    [endedAt] datetime NULL,
    [endedByUserId] int NULL,
    [createdByUserId] int NULL,
    [createdAt] datetime2 NOT NULL CONSTRAINT [DF_90456d3d0afb740027831fced09] DEFAULT getdate(),
    CONSTRAINT [PK_ad752868dc5a7f0f6e5d2165113] PRIMARY KEY ([id])
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IDX_539d2cd7ea6e2036e8051bc7ff' AND object_id = OBJECT_ID(N'dbo.employee_suspensions'))
  CREATE INDEX [IDX_539d2cd7ea6e2036e8051bc7ff] ON dbo.employee_suspensions ([employeeId], [fromDate]);
GO

-- تحقق: الجدول والفهرس موجودان، ولم يُكتب أي صف، وحالات الموظفين المحفوظة لم تُلمس
IF OBJECT_ID(N'dbo.employee_suspensions', N'U') IS NULL
  THROW 56441, N'20260916_044: جدول الإيقاف عن العمل غير موجود بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IDX_539d2cd7ea6e2036e8051bc7ff' AND object_id = OBJECT_ID(N'dbo.employee_suspensions'))
  THROW 56442, N'20260916_044: فهرس الإيقاف (employeeId, fromDate) غير موجود', 1;
IF COL_LENGTH(N'dbo.employee_suspensions', N'plannedToDate') IS NULL OR COL_LENGTH(N'dbo.employee_suspensions', N'endReason') IS NULL
  THROW 56443, N'20260916_044: أعمدة الإيقاف ناقصة', 1;
GO
