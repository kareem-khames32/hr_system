-- 20260916_048: «شيل خصم» من تبويب الاستقطاعات في شاشة المسير.
-- جدول جديد فقط: payroll_deduction_waivers (الشهر، نوع الخصم، الاستهداف شركة/فرع/أقسام/فرق/موظفين، السبب، الإلغاء).
-- المسيرات المسودة أو المحسوبة للشهر بتتخطى نوع الخصم ده للموظفين المستهدفين عند الحساب؛ المعتمد والمصروف ما بيتغيرش.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية.
-- أسماء القيود والفهرس مطابقة لما تولّده TypeORM حتى يبقى فرق المخطط صفرًا.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.payroll_deduction_waivers', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.payroll_deduction_waivers (
    [id] int NOT NULL IDENTITY(1,1),
    [period] nvarchar(7) NOT NULL,
    [kind] nvarchar(30) NOT NULL,
    [targetLevel] nvarchar(20) NOT NULL,
    [branchId] int NULL,
    [targetIds] nvarchar(MAX) NULL,
    [reason] nvarchar(500) NOT NULL,
    [status] nvarchar(15) NOT NULL CONSTRAINT [DF_9ab83ded778b9deb20436408537] DEFAULT 'ACTIVE',
    [createdByUserId] int NOT NULL,
    [createdAt] datetime2 NOT NULL CONSTRAINT [DF_0e88b30669027e97a3151b1b68a] DEFAULT SYSUTCDATETIME(),
    [cancelledByUserId] int NULL,
    [cancelledAt] datetime2 NULL,
    CONSTRAINT [PK_payroll_deduction_waivers] PRIMARY KEY ([id])
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_deduction_waivers_period' AND object_id = OBJECT_ID(N'dbo.payroll_deduction_waivers'))
  CREATE INDEX [IX_payroll_deduction_waivers_period] ON dbo.payroll_deduction_waivers ([period], [status]);
GO

-- تحقق: الجدول والفهرس موجودان
IF OBJECT_ID(N'dbo.payroll_deduction_waivers', N'U') IS NULL
  THROW 56481, N'20260916_048: جدول شيل الخصم غير موجود بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_deduction_waivers_period' AND object_id = OBJECT_ID(N'dbo.payroll_deduction_waivers'))
  THROW 56482, N'20260916_048: فهرس شيل الخصم (period, status) غير موجود', 1;
IF COL_LENGTH(N'dbo.payroll_deduction_waivers', N'targetIds') IS NULL OR COL_LENGTH(N'dbo.payroll_deduction_waivers', N'cancelledAt') IS NULL
  THROW 56483, N'20260916_048: أعمدة شيل الخصم ناقصة', 1;
GO
