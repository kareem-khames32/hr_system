-- 20260915_032 (مسار money-run، الجزء C8 — خطة المراجعة الخطوة 31): مسار العكس والمسير التكميلي بعد الصرف (SRS PR-06 قاعدة 4، PR-11، DD-12، AD).
-- إضافي فقط:
--   payroll_runs: runType (REGULAR|REVERSAL|SUPPLEMENTARY؛ NULL للمسيرات القائمة = أصلي) وparentRunId (المسير المصروف المرتبط) وcorrectionReason، وفهرس parentRunId.
--   payroll_run_reversal_lines: سطر عكس لكل بند موظف معكوس بلقطة مبالغه وبصمتها وحالته وما نفّذه؛ فهرس فريد مفلتر يمنع عكس البند مرتين.
--   loan_installment_allocations: reversalRunId/reversedAt — الحجز المنشور المعكوس يبقى POSTED تاريخيًا ويُحرر.
--   employee_obligations: payrollReversalRunId (على القيد المستهلك الذي عُكس صرفه) وpayrollReversalOfObligationId (على قيد الإعادة الجديد)، وفهرساهما.
--   roles: إلحاق payroll.reverse بدور hr_manager النشط (بآخر المصفوفة دون حذف أو إعادة ترتيب) ورفع tokenVersion لمستخدمي الدور الذي تغيّر فعلًا.
-- لا تغيير لأي قيمة قائمة في المسيرات أو بنودها أو الأقساط أو الدفتر أو الإضافي؛ الأعمدة الجديدة NULL للصفوف القائمة.
SET NOCOUNT ON;

IF COL_LENGTH(N'dbo.payroll_runs', N'runType') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [runType] NVARCHAR(20) NULL;
GO

IF COL_LENGTH(N'dbo.payroll_runs', N'parentRunId') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [parentRunId] INT NULL;
GO

IF COL_LENGTH(N'dbo.payroll_runs', N'correctionReason') IS NULL
  ALTER TABLE dbo.[payroll_runs] ADD [correctionReason] NVARCHAR(1000) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_runs_parent' AND object_id = OBJECT_ID(N'dbo.payroll_runs'))
  CREATE INDEX [IX_payroll_runs_parent] ON dbo.[payroll_runs] ([parentRunId]);
GO

IF OBJECT_ID(N'dbo.payroll_run_reversal_lines', N'U') IS NULL
CREATE TABLE dbo.[payroll_run_reversal_lines] (
  [id] INT NOT NULL IDENTITY(1,1),
  [reversalRunId] INT NOT NULL,
  [originalRunId] INT NOT NULL,
  [originalItemId] INT NOT NULL,
  [employeeId] INT NOT NULL,
  [status] NVARCHAR(16) NOT NULL,
  [netPay] DECIMAL(18,2) NOT NULL,
  [itemSnapshot] NVARCHAR(MAX) NOT NULL,
  [itemHash] NVARCHAR(64) NOT NULL,
  [effects] NVARCHAR(MAX) NULL,
  [createdByUserId] INT NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_2c497137b43201cd35db4857c8a] DEFAULT SYSUTCDATETIME(),
  [postedByUserId] INT NULL,
  [postedAt] DATETIME2 NULL,
  [cancelledAt] DATETIME2 NULL,
  CONSTRAINT [PK_payroll_run_reversal_lines] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_payroll_reversal_line_active_item' AND object_id = OBJECT_ID(N'dbo.payroll_run_reversal_lines'))
  CREATE UNIQUE INDEX [UX_payroll_reversal_line_active_item] ON dbo.[payroll_run_reversal_lines] ([originalItemId]) WHERE [status] <> 'CANCELLED';
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_reversal_line_original' AND object_id = OBJECT_ID(N'dbo.payroll_run_reversal_lines'))
  CREATE INDEX [IX_payroll_reversal_line_original] ON dbo.[payroll_run_reversal_lines] ([originalRunId], [employeeId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_reversal_line_reversal_run' AND object_id = OBJECT_ID(N'dbo.payroll_run_reversal_lines'))
  CREATE INDEX [IX_payroll_reversal_line_reversal_run] ON dbo.[payroll_run_reversal_lines] ([reversalRunId]);
GO

IF COL_LENGTH(N'dbo.loan_installment_allocations', N'reversalRunId') IS NULL
  ALTER TABLE dbo.[loan_installment_allocations] ADD [reversalRunId] INT NULL;
GO

IF COL_LENGTH(N'dbo.loan_installment_allocations', N'reversedAt') IS NULL
  ALTER TABLE dbo.[loan_installment_allocations] ADD [reversedAt] DATETIME2 NULL;
GO

IF COL_LENGTH(N'dbo.employee_obligations', N'payrollReversalRunId') IS NULL
  ALTER TABLE dbo.[employee_obligations] ADD [payrollReversalRunId] INT NULL;
GO

IF COL_LENGTH(N'dbo.employee_obligations', N'payrollReversalOfObligationId') IS NULL
  ALTER TABLE dbo.[employee_obligations] ADD [payrollReversalOfObligationId] INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_employee_obligations_payroll_reversal_run' AND object_id = OBJECT_ID(N'dbo.employee_obligations'))
  CREATE INDEX [IX_employee_obligations_payroll_reversal_run] ON dbo.[employee_obligations] ([payrollReversalRunId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_employee_obligations_payroll_reversal_of' AND object_id = OBJECT_ID(N'dbo.employee_obligations'))
  CREATE INDEX [IX_employee_obligations_payroll_reversal_of] ON dbo.[employee_obligations] ([payrollReversalOfObligationId]);
GO

-- صلاحية عكس الصرف: لدور hr_manager فقط (نفس دور الاعتماد وإعادة الفتح والإلغاء — SEC2)، وتبقى في SUPER_ADMIN_ONLY_GRANTS فلا يمررها لغيره.
IF EXISTS (SELECT 1 FROM dbo.roles WHERE code = N'hr_manager' AND ISJSON(permissions) <> 1)
  THROW 51801, N'20260915_032_c8: صلاحيات دور hr_manager ليست مصفوفة JSON صالحة؛ راجعها قبل منح عكس صرف المسير', 1;

CREATE TABLE #c8_changed (roleCode nvarchar(50) NOT NULL PRIMARY KEY);

UPDATE r SET r.permissions = JSON_MODIFY(r.permissions, N'append $', N'payroll.reverse')
FROM dbo.roles r
WHERE r.code = N'hr_manager' AND ISNULL(r.isActive, 1) = 1 AND ISJSON(r.permissions) = 1
  AND NOT EXISTS (SELECT 1 FROM OPENJSON(r.permissions) j WHERE j.[value] IN (N'payroll.reverse', N'*'));
IF @@ROWCOUNT > 0 INSERT INTO #c8_changed (roleCode) VALUES (N'hr_manager');

UPDATE u SET u.tokenVersion = ISNULL(u.tokenVersion, 0) + 1
FROM dbo.users u
JOIN #c8_changed c ON c.roleCode = u.[role];

DROP TABLE #c8_changed;
GO

-- تحقق بعد التطبيق
IF COL_LENGTH(N'dbo.payroll_runs', N'runType') IS NULL OR COL_LENGTH(N'dbo.payroll_runs', N'parentRunId') IS NULL OR COL_LENGTH(N'dbo.payroll_runs', N'correctionReason') IS NULL
  THROW 51802, N'20260915_032_c8: أعمدة نوع المسير وربطه وسبب التصحيح غير مكتملة على payroll_runs', 1;
IF OBJECT_ID(N'dbo.payroll_run_reversal_lines', N'U') IS NULL
  OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_payroll_reversal_line_active_item' AND object_id = OBJECT_ID(N'dbo.payroll_run_reversal_lines') AND is_unique = 1 AND has_filter = 1)
  THROW 51803, N'20260915_032_c8: جدول سطور العكس أو فهرس منع عكس البند مرتين غير موجود', 1;
IF COL_LENGTH(N'dbo.loan_installment_allocations', N'reversalRunId') IS NULL OR COL_LENGTH(N'dbo.loan_installment_allocations', N'reversedAt') IS NULL
  OR COL_LENGTH(N'dbo.employee_obligations', N'payrollReversalRunId') IS NULL OR COL_LENGTH(N'dbo.employee_obligations', N'payrollReversalOfObligationId') IS NULL
  THROW 51804, N'20260915_032_c8: أعمدة العكس على حجوزات الأقساط أو دفتر المديونيات غير مكتملة', 1;
IF EXISTS (SELECT 1 FROM dbo.payroll_runs WHERE [runType] IS NOT NULL OR [parentRunId] IS NOT NULL OR [correctionReason] IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM dbo.payroll_run_reversal_lines)
  AND NOT EXISTS (SELECT 1 FROM dbo.payroll_runs WHERE [runType] = N'SUPPLEMENTARY')
  THROW 51805, N'20260915_032_c8: مسير قائم اكتسب نوعًا أو ربطًا دون مسار تصحيح؛ الترحيل لا يغيّر المسيرات القائمة', 1;
IF EXISTS (SELECT 1 FROM dbo.roles r WHERE r.code = N'hr_manager' AND ISNULL(r.isActive, 1) = 1 AND ISJSON(r.permissions) = 1
    AND NOT EXISTS (SELECT 1 FROM OPENJSON(r.permissions) j WHERE j.[value] IN (N'payroll.reverse', N'*')))
  THROW 51806, N'20260915_032_c8: تعذر منح payroll.reverse لدور hr_manager', 1;
GO
