-- 20260914_027 (مسار path-core، الجزء B4 — خطة المراجعة الخطوات 19 و20 و21): لقطة السياسة على المسير، ووضع محرك الحساب وتقرير التكافؤ، والشرائح المؤرخة.
-- إضافي فقط:
--   payroll_runs: policySnapshot (JSON اللقطة) وpolicySnapshotHash (البصمة) وengineMode (LEGACY/SHADOW/POLICY، الافتراضي SHADOW للصفوف الجديدة فقط)
--                 وparityReport (تقرير التكافؤ لكل موظف ولكل بند). الصفوف القائمة تبقى NULL = مسير قبل الخطوتين 19 و20.
--   payroll_lateness_tier_sets + payroll_lateness_tier_set_tiers: مجموعات شرائح التأخير المؤرخة (الخطوة 21). تحويل الجدول القديم في 028.
--   payroll_run_parity_explanations: أسباب مكتوبة لفروق التكافؤ (إلحاقي) — شرط التحويل إلى POLICY.
-- لا تعديل ولا حذف لأي صف قائم. أسماء القيود والفهارس مطابقة للكيانات حرفيًا (فرق المخطط = 0).
SET NOCOUNT ON;

IF COL_LENGTH(N'dbo.payroll_runs', N'policySnapshot') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [policySnapshot] NVARCHAR(MAX) NULL;
GO

IF COL_LENGTH(N'dbo.payroll_runs', N'policySnapshotHash') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [policySnapshotHash] NVARCHAR(64) NULL;
GO

-- بلا WITH VALUES: الصفوف القائمة تبقى NULL، والقيمة الافتراضية للمسيرات الجديدة فقط (D13).
IF COL_LENGTH(N'dbo.payroll_runs', N'engineMode') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [engineMode] NVARCHAR(10) NULL CONSTRAINT [DF_804b65046066229ce690a7cb327] DEFAULT 'SHADOW';
GO

IF COL_LENGTH(N'dbo.payroll_runs', N'parityReport') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [parityReport] NVARCHAR(MAX) NULL;
GO

IF OBJECT_ID(N'dbo.payroll_lateness_tier_sets', N'U') IS NULL
CREATE TABLE dbo.[payroll_lateness_tier_sets] (
  [id] INT NOT NULL IDENTITY(1,1),
  [effectivePeriod] NVARCHAR(7) NOT NULL,
  [contentHash] NVARCHAR(64) NOT NULL,
  [source] NVARCHAR(20) NOT NULL,
  [reason] NVARCHAR(500) NOT NULL,
  [isActive] BIT NOT NULL CONSTRAINT [DF_9ec3753b932743fb3b8f58cd96a] DEFAULT 1,
  [createdBy] INT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_5b3061b7a985306531d5210ad8c] DEFAULT getdate(),
  [supersedesSetId] INT NULL,
  [deactivatedBy] INT NULL,
  [deactivatedAt] DATETIME2 NULL,
  [deactivationReason] NVARCHAR(500) NULL,
  CONSTRAINT [PK_5d303aa1b473c1d49eee704d41e] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_lateness_tier_set_period' AND object_id = OBJECT_ID(N'dbo.payroll_lateness_tier_sets'))
  CREATE INDEX [IX_payroll_lateness_tier_set_period] ON dbo.[payroll_lateness_tier_sets] ([effectivePeriod], [isActive]);
GO

IF OBJECT_ID(N'dbo.payroll_lateness_tier_set_tiers', N'U') IS NULL
CREATE TABLE dbo.[payroll_lateness_tier_set_tiers] (
  [id] INT NOT NULL IDENTITY(1,1),
  [setId] INT NOT NULL,
  [sequence] INT NOT NULL,
  [fromMinutes] INT NOT NULL,
  [toMinutes] INT NULL,
  [mode] NVARCHAR(12) NOT NULL,
  [value] DECIMAL(9,3) NOT NULL,
  [label] NVARCHAR(200) NULL,
  CONSTRAINT [PK_366780fbd3f038a1ef86fda12c1] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_payroll_lateness_tier_set_sequence' AND object_id = OBJECT_ID(N'dbo.payroll_lateness_tier_set_tiers'))
  CREATE UNIQUE INDEX [UX_payroll_lateness_tier_set_sequence] ON dbo.[payroll_lateness_tier_set_tiers] ([setId], [sequence]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_payroll_lateness_tier_set_tier_set' AND parent_object_id = OBJECT_ID(N'dbo.payroll_lateness_tier_set_tiers'))
  ALTER TABLE dbo.[payroll_lateness_tier_set_tiers] ADD CONSTRAINT [FK_payroll_lateness_tier_set_tier_set]
    FOREIGN KEY ([setId]) REFERENCES dbo.[payroll_lateness_tier_sets] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

IF OBJECT_ID(N'dbo.payroll_run_parity_explanations', N'U') IS NULL
CREATE TABLE dbo.[payroll_run_parity_explanations] (
  [id] INT NOT NULL IDENTITY(1,1),
  [runId] INT NOT NULL,
  [snapshotVersion] INT NOT NULL,
  [employeeId] INT NOT NULL,
  [component] NVARCHAR(30) NOT NULL,
  [legacyAmount] NVARCHAR(40) NOT NULL,
  [policyAmount] NVARCHAR(40) NULL,
  [differenceKey] NVARCHAR(64) NOT NULL,
  [reason] NVARCHAR(500) NOT NULL,
  [explainedBy] INT NOT NULL,
  [explainedAt] DATETIME2 NOT NULL CONSTRAINT [DF_b4b5c8598a98334a5c3bfd98f3e] DEFAULT getdate(),
  CONSTRAINT [PK_547fbacba52cfb89e5bbfe6364b] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_run_parity_explanation_run' AND object_id = OBJECT_ID(N'dbo.payroll_run_parity_explanations'))
  CREATE INDEX [IX_payroll_run_parity_explanation_run] ON dbo.[payroll_run_parity_explanations] ([runId], [differenceKey]);
GO
