-- OT-04/08/10: أعمدة جديدة بلا تعبئة رجعية؛ لا نغير قيمة إضافي قديم أو نخترع له دليلاً.
ALTER TABLE dbo.overtime_entries ADD calculationSnapshot ntext NULL;
ALTER TABLE dbo.overtime_entries ADD approvedMinutes int NULL;
ALTER TABLE dbo.overtime_entries ADD hourlyRateSnapshot decimal(18,6) NULL;
ALTER TABLE dbo.overtime_entries ADD amountSnapshot decimal(18,2) NULL;
ALTER TABLE dbo.overtime_entries ADD originalPeriod nvarchar(7) NULL;
ALTER TABLE dbo.overtime_entries ADD deferredFromRunId int NULL;

CREATE TABLE dbo.overtime_day_claims (
  id int NOT NULL IDENTITY(1,1), employeeId int NOT NULL, workDate date NOT NULL, entryId int NOT NULL,
  claimedAt datetime2 NOT NULL CONSTRAINT DF_1967f427d68c1f4de859fff02e8 DEFAULT GETDATE(),
  releasedAt datetime2 NULL,
  CONSTRAINT PK_c2db80c7458ca7dd9508af33151 PRIMARY KEY(id)
);
-- فصل الحجز يسمح بفحص التعارضات القديمة عند الاستخدام دون حذف تكرار قديم أثناء الترحيل.
CREATE UNIQUE INDEX UQ_overtime_day_claim_active ON dbo.overtime_day_claims(employeeId,workDate) WHERE releasedAt IS NULL;
CREATE INDEX IX_overtime_day_claim_entry ON dbo.overtime_day_claims(entryId);

CREATE TABLE dbo.overtime_entry_events (
  id int NOT NULL IDENTITY(1,1), entryId int NOT NULL, requestId int NULL, actorUserId int NULL,
  eventType nvarchar(30) NOT NULL, stepOrder int NULL, reason nvarchar(500) NULL, payload ntext NULL,
  createdAt datetime2 NOT NULL CONSTRAINT DF_55c05a733399f7a474ae21a0096 DEFAULT GETDATE(),
  CONSTRAINT PK_bc90417013175a30683f399263e PRIMARY KEY(id)
);
CREATE INDEX IX_overtime_event_entry ON dbo.overtime_entry_events(entryId);
