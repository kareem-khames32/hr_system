-- SRS EX-09/13: نوافذ معتمدة مستقلة؛ لا علم دائم أو تعديل بيانات على employees.
CREATE TABLE dbo.attendance_exemptions (
  id int NOT NULL IDENTITY(1,1), employeeId int NOT NULL,
  effectiveFrom date NOT NULL, effectiveTo date NULL,
  reasonCode nvarchar(30) NOT NULL, reason nvarchar(500) NOT NULL,
  status nvarchar(20) NOT NULL CONSTRAINT DF_dba7c9a2cd72d8318f1f350fd58 DEFAULT 'PENDING',
  createdByUserId int NOT NULL, approvedByUserId int NULL, approvedAt datetime2 NULL,
  executiveApprovedByUserId int NULL, executiveApprovedAt datetime2 NULL,
  terminatedFrom date NULL, terminationReason nvarchar(500) NULL, terminatedByUserId int NULL,
  overtimeEligibleOverride bit NULL, unpaidLeaveDeductibleOverride bit NULL,
  requiresCheckinForPresence bit NOT NULL CONSTRAINT DF_3532bff2c70f1fc1101af365bb9 DEFAULT 0,
  createdAt datetime2 NOT NULL CONSTRAINT DF_b2e4ef68b00e62eb64803bc85ef DEFAULT GETDATE(),
  updatedAt datetime2 NOT NULL CONSTRAINT DF_b8a3f6b35a22f6a57b9084bf175 DEFAULT GETDATE(),
  CONSTRAINT PK_7a090579135887ba7cbe6e1e726 PRIMARY KEY(id)
);
CREATE INDEX IDX_attendance_exemption_employee ON dbo.attendance_exemptions(employeeId);

CREATE TABLE dbo.attendance_exemption_events (
  id int NOT NULL IDENTITY(1,1), exemptionId int NOT NULL, actorUserId int NOT NULL,
  eventType nvarchar(30) NOT NULL, reason nvarchar(500) NULL, payload ntext NULL,
  createdAt datetime2 NOT NULL CONSTRAINT DF_e541c513855c903009967395c56 DEFAULT GETDATE(),
  CONSTRAINT PK_6071847add0d95efad58258b3dd PRIMARY KEY(id)
);
CREATE INDEX IDX_attendance_exemption_event ON dbo.attendance_exemption_events(exemptionId);
