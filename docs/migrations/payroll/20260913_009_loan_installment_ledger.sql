-- AD-10/11/12: تتبع السداد الجزئي والحجز على القسط القائم، دون تعبئة تاريخية أو تعديل أعمدة قديمة.

ALTER TABLE dbo.loan_installments ADD paidAmount DECIMAL(18,2) NULL;

ALTER TABLE dbo.loan_installments ADD financialStatus NVARCHAR(20) NULL;

ALTER TABLE dbo.loan_installments ADD financialRevision INT NULL;

ALTER TABLE dbo.loan_installments ADD parentInstallmentId INT NULL;

ALTER TABLE dbo.loan_installments ADD originalDueDate DATE NULL;

ALTER TABLE dbo.loan_installments ADD paidAt DATETIME2 NULL;

CREATE UNIQUE INDEX [UX_loan_installments_parent] ON dbo.[loan_installments] ([parentInstallmentId]) WHERE [parentInstallmentId] IS NOT NULL;

CREATE TABLE dbo.[loan_installment_allocations] (
  [id] INT NOT NULL IDENTITY(1,1),
  [installmentId] INT NOT NULL,
  [employeeId] INT NOT NULL,
  [payrollRunId] INT NOT NULL,
  [payrollSnapshotVersion] INT NOT NULL,
  [sourceRevision] INT NOT NULL,
  [deductedAmount] DECIMAL(18,2) NOT NULL,
  [carriedAmount] DECIMAL(18,2) NOT NULL,
  [continuationDueDate] DATE NULL,
  [outcome] NVARCHAR(30) NOT NULL,
  [status] NVARCHAR(16) NOT NULL,
  [sourceSnapshot] NVARCHAR(MAX) NOT NULL,
  [createdByUserId] INT NULL,
  [claimedAt] DATETIME2 NOT NULL CONSTRAINT [DF_84b02785e5b1677e4f401ec8f48] DEFAULT SYSUTCDATETIME(),
  [releasedAt] DATETIME2 NULL,
  [postedAt] DATETIME2 NULL,
  CONSTRAINT [CK_loan_installment_allocation_amounts] CHECK ([deductedAmount] >= 0 AND [carriedAmount] >= 0),
  CONSTRAINT [CK_loan_installment_allocation_status] CHECK ([status] IN ('HELD','POSTED','RELEASED')),
  CONSTRAINT [PK_loan_installment_allocations] PRIMARY KEY ([id])
);

CREATE UNIQUE INDEX [UX_loan_installment_allocation_active] ON dbo.[loan_installment_allocations] ([installmentId]) WHERE [releasedAt] IS NULL;

CREATE INDEX [IDX_loan_installment_allocation_run] ON dbo.[loan_installment_allocations] ([payrollRunId]);

CREATE TABLE dbo.[loan_installment_events] (
  [id] INT NOT NULL IDENTITY(1,1),
  [employeeId] INT NOT NULL,
  [loanId] INT NOT NULL,
  [installmentId] INT NOT NULL,
  [allocationId] INT NULL,
  [payrollRunId] INT NULL,
  [requestId] INT NULL,
  [actorId] INT NULL,
  [action] NVARCHAR(40) NOT NULL,
  [actionKey] NVARCHAR(150) NOT NULL,
  [reason] NVARCHAR(500) NULL,
  [payload] NVARCHAR(MAX) NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_16c296610f3f372996d010ca503] DEFAULT SYSUTCDATETIME(),
  CONSTRAINT [FK_loan_installment_event_allocation] FOREIGN KEY ([allocationId]) REFERENCES dbo.[loan_installment_allocations] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [PK_loan_installment_events] PRIMARY KEY ([id])
);

CREATE UNIQUE INDEX [UX_loan_installment_event_action_key] ON dbo.[loan_installment_events] ([actionKey]);
