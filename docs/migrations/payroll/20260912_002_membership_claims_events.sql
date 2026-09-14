-- SPEC①: لا نُنشئ لقطات أو مطالبات تاريخية تخمينًا؛ إضافات schema فقط.
ALTER TABLE dbo.payroll_runs ADD snapshotVersion int NOT NULL CONSTRAINT DF_f3cfa9d03d869d585b500769145 DEFAULT 0;
ALTER TABLE dbo.payroll_run_members ADD snapshot ntext NULL;
ALTER TABLE dbo.payroll_run_members ADD membershipStatus nvarchar(20) NULL CONSTRAINT DF_295442d2a2818f43ced15cef54d DEFAULT 'INCLUDED';
ALTER TABLE dbo.payroll_run_members ADD exclusionReason nvarchar(30) NULL;
ALTER TABLE dbo.payroll_run_members ADD inclusionSource nvarchar(20) NULL CONSTRAINT DF_2562e92ea640d149231f6d082d1 DEFAULT 'SCOPE';

CREATE TABLE dbo.payroll_period_claims (
  id int NOT NULL IDENTITY(1,1), employeeId int NOT NULL, runId int NOT NULL,
  startDate date NOT NULL, endDate date NOT NULL, periodKey nvarchar(7) NOT NULL,
  claimedAt datetime2 NOT NULL CONSTRAINT DF_143aacd0ca22f026fc840d0f17a DEFAULT GETDATE(),
  releasedAt datetime2 NULL,
  CONSTRAINT PK_efce6f3b8f85f5ea6953a1bc33b PRIMARY KEY(id)
);
CREATE UNIQUE INDEX UQ_payroll_claim_active_dates ON dbo.payroll_period_claims(employeeId,startDate,endDate) WHERE releasedAt IS NULL;
CREATE INDEX IDX_payroll_claim_run ON dbo.payroll_period_claims(runId);

CREATE TABLE dbo.payroll_run_events (
  id int NOT NULL IDENTITY(1,1), runId int NOT NULL, eventType nvarchar(30) NOT NULL,
  actorUserId int NOT NULL, reason nvarchar(500) NULL, payload ntext NULL,
  createdAt datetime2 NOT NULL CONSTRAINT DF_07d79509055a397a98ab92a6584 DEFAULT GETDATE(),
  CONSTRAINT PK_bd689974d1e2105ea90b341fe9f PRIMARY KEY(id)
);
CREATE INDEX IDX_payroll_event_run ON dbo.payroll_run_events(runId);
