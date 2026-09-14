-- 20260914_025 (مسار path-core، الجزء B3 — خطة المراجعة الخطوات 16 و17 و18): تعريف المسير كمسودة، ومعاينة العضوية، وإقرار تقرير «بلا مسير».
-- إضافي فقط:
--   payroll_runs: عمود policyVersionId (nullable + مفتاح أجنبي لنسخة السياسة) وعمود definition (JSON: الفلاتر والقائمة والاستبعادات بأسبابها وتأكيد النطاق الفارغ).
--   فهرس فريد مُرشَّح UX_payroll_run_period_name: اسم المسير فريد داخل شهر المسير لغير الملغى؛ الأسماء الفارغة للمسيرات القديمة خارج الفهرس.
--   جدول payroll_run_unassigned_acks: إقرارات الاطلاع على تقرير «موظفون بلا مسير» لكل نسخة حساب (إلحاقي).
-- لا تعديل ولا حذف لأي صف قائم. قبل الفهرس: فحص صريح لأي اسمين متكررين لغير الملغى في الشهر نفسه (THROW 51601 برسالة واضحة).
SET NOCOUNT ON;

IF COL_LENGTH(N'dbo.payroll_runs', N'policyVersionId') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [policyVersionId] INT NULL;
GO

IF COL_LENGTH(N'dbo.payroll_runs', N'definition') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [definition] NVARCHAR(MAX) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_payroll_run_policy_version' AND parent_object_id = OBJECT_ID(N'dbo.payroll_runs'))
  ALTER TABLE dbo.[payroll_runs] ADD CONSTRAINT [FK_payroll_run_policy_version]
    FOREIGN KEY ([policyVersionId]) REFERENCES dbo.[payroll_policy_versions] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

IF EXISTS (SELECT 1 FROM dbo.[payroll_runs] WHERE [name] IS NOT NULL AND [status] <> 'CANCELLED' GROUP BY [period], [name] HAVING COUNT(*) > 1)
  THROW 51601, N'يوجد مسيران غير ملغيين بنفس الاسم في الشهر نفسه؛ غيّر اسم أحدهما قبل إضافة قيد تفرد اسم المسير', 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_payroll_run_period_name' AND object_id = OBJECT_ID(N'dbo.payroll_runs'))
  CREATE UNIQUE INDEX [UX_payroll_run_period_name] ON dbo.[payroll_runs] ([period], [name])
    WHERE [name] IS NOT NULL AND [status] <> 'CANCELLED';
GO

IF OBJECT_ID(N'dbo.payroll_run_unassigned_acks', N'U') IS NULL
CREATE TABLE dbo.[payroll_run_unassigned_acks] (
  [id] INT NOT NULL IDENTITY(1,1),
  [runId] INT NOT NULL,
  [snapshotVersion] INT NOT NULL,
  [period] NVARCHAR(7) NOT NULL,
  [startDate] DATE NOT NULL,
  [endDate] DATE NOT NULL,
  [scopeBranchId] INT NULL,
  [reportHash] NVARCHAR(64) NOT NULL,
  [reportRowCount] INT NOT NULL,
  [note] NVARCHAR(500) NULL,
  [acknowledgedBy] INT NOT NULL,
  [acknowledgedAt] DATETIME2 NOT NULL CONSTRAINT [DF_96ca5540d2ab53153c3591d2b71] DEFAULT SYSUTCDATETIME(),
  CONSTRAINT [PK_payroll_run_unassigned_acks] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_unassigned_ack_run' AND object_id = OBJECT_ID(N'dbo.payroll_run_unassigned_acks'))
  CREATE INDEX [IX_payroll_unassigned_ack_run] ON dbo.[payroll_run_unassigned_acks] ([runId], [id]);
GO
