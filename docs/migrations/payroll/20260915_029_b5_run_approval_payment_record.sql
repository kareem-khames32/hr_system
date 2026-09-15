-- 20260915_029 (مسار path-core، الجزء B5 — خطة المراجعة الخطوات 22 و7 و23): شاشة المسير بالأرقام الحقيقية.
-- إضافي أو حافظ للقيم فقط:
--   payroll_runs: calculatedBy/calculatedAt (من احتسب آخر نسخة — فصل المهام PAYRUN-STATE-003)،
--                 paidBy/payChannel/payReference (قيد الصرف: من صرف والقناة والمرجع — SRS PR-11).
--   تعبئة calculatedBy/calculatedAt للمسيرات غير المسودة من آخر حدث حساب مسجل (CREATED/CALCULATED/RECALCULATED) في payroll_run_events؛
--     أعمدة جديدة فقط، لا تتغير أي قيمة قائمة، والمسير بلا حدث حساب يبقى NULL.
--   requests_config: payroll.approval_self_approval_allowed = false (رخصة الشركة الصغيرة مقفلة افتراضيًا)؛ القيمة القائمة لا تُلمس.
-- لا حذف ولا تعديل لأي عمود أو صف قائم.
SET NOCOUNT ON;

IF COL_LENGTH(N'dbo.payroll_runs', N'calculatedBy') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [calculatedBy] INT NULL;
GO

IF COL_LENGTH(N'dbo.payroll_runs', N'calculatedAt') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [calculatedAt] DATETIME NULL;
GO

IF COL_LENGTH(N'dbo.payroll_runs', N'paidBy') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [paidBy] INT NULL;
GO

IF COL_LENGTH(N'dbo.payroll_runs', N'payChannel') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [payChannel] NVARCHAR(20) NULL;
GO

IF COL_LENGTH(N'dbo.payroll_runs', N'payReference') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [payReference] NVARCHAR(100) NULL;
GO

UPDATE r SET r.[calculatedBy] = e.[actorUserId], r.[calculatedAt] = e.[createdAt]
FROM dbo.[payroll_runs] r
CROSS APPLY (
  SELECT TOP 1 ev.[actorUserId], ev.[createdAt]
  FROM dbo.[payroll_run_events] ev
  WHERE ev.[runId] = r.[id] AND ev.[eventType] IN (N'CREATED', N'CALCULATED', N'RECALCULATED')
  ORDER BY ev.[id] DESC
) e
WHERE r.[calculatedBy] IS NULL AND r.[status] <> N'DRAFT';
GO

INSERT INTO dbo.requests_config ([key], [value])
SELECT N'payroll.approval_self_approval_allowed', N'false'
WHERE NOT EXISTS (SELECT 1 FROM dbo.requests_config c WHERE c.[key] = N'payroll.approval_self_approval_allowed');
GO

IF COL_LENGTH(N'dbo.payroll_runs', N'calculatedBy') IS NULL OR COL_LENGTH(N'dbo.payroll_runs', N'calculatedAt') IS NULL
  OR COL_LENGTH(N'dbo.payroll_runs', N'paidBy') IS NULL OR COL_LENGTH(N'dbo.payroll_runs', N'payChannel') IS NULL
  OR COL_LENGTH(N'dbo.payroll_runs', N'payReference') IS NULL
  THROW 51629, N'20260915_029_b5: أعمدة قيد الحساب والصرف غير مكتملة على payroll_runs', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.requests_config WHERE [key] = N'payroll.approval_self_approval_allowed')
  THROW 51630, N'20260915_029_b5: مفتاح رخصة الشركة الصغيرة غير مسجل في requests_config', 1;
GO
