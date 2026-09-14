-- FX-01/02/09: أعمدة إضافية فقط. NULL يميز المصدر القديم دون نافذة مختلقة.
ALTER TABLE dbo.shifts ADD flexEnabled bit NULL;
ALTER TABLE dbo.shifts ADD flexWindowMinutes int NULL;
ALTER TABLE dbo.shifts ADD requiredWorkMinutes int NULL;
ALTER TABLE dbo.work_schedules ADD flexEnabled bit NULL;
ALTER TABLE dbo.work_schedules ADD flexWindowMinutes int NULL;
ALTER TABLE dbo.work_schedules ADD requiredWorkMinutes int NULL;

CREATE TABLE dbo.attendance_rule_versions (
  id int NOT NULL IDENTITY(1,1), sourceType nvarchar(20) NOT NULL, sourceId int NOT NULL,
  effectiveFrom date NULL, version int NOT NULL, snapshot ntext NOT NULL,
  actorUserId int NULL, reason nvarchar(500) NOT NULL,
  legacyBaseline bit NOT NULL CONSTRAINT DF_4e719019388dd4b4099738fa47f DEFAULT 0,
  createdAt datetime2 NOT NULL CONSTRAINT DF_7250527ef1a5db9d208bcb1c130 DEFAULT GETDATE(),
  CONSTRAINT PK_b163b8a05bc64bc9a22902f7dba PRIMARY KEY(id)
);
CREATE UNIQUE INDEX UX_attendance_rule_source_version ON dbo.attendance_rule_versions(sourceType,sourceId,version);
CREATE INDEX IX_attendance_rule_source_effective ON dbo.attendance_rule_versions(sourceType,sourceId,effectiveFrom);

-- المقادير الجديدة لا تعيد تفسير الأيام السابقة ولا تمحو القيم الأصلية.
ALTER TABLE dbo.attendance_days ADD rawLateMinutes int NULL;
ALTER TABLE dbo.attendance_days ADD unexcusedLateMinutes int NULL;
ALTER TABLE dbo.attendance_days ADD shortfallMinutes int NULL;
ALTER TABLE dbo.attendance_days ADD countedWorkMinutes int NULL;
ALTER TABLE dbo.attendance_days ADD earlyArrivalMinutes int NULL;
ALTER TABLE dbo.attendance_days ADD flexOutcome nvarchar(32) NULL;
ALTER TABLE dbo.attendance_days ADD attendanceReviewRequired bit NOT NULL CONSTRAINT DF_4fa74fd3573f049ae057c780905 DEFAULT 0;
ALTER TABLE dbo.attendance_days ADD attendanceReviewReason nvarchar(500) NULL;
ALTER TABLE dbo.attendance_days ADD attendanceRuleSnapshot ntext NULL;

ALTER TABLE dbo.payroll_items ADD shortfallMinutes int NOT NULL CONSTRAINT DF_23f76ad13a592ecfc58a37abe92 DEFAULT 0;
ALTER TABLE dbo.payroll_items ADD shortfallDeduction decimal(18,2) NOT NULL CONSTRAINT DF_43d0c91e79f7a30a1542635ceb7 DEFAULT 0;
