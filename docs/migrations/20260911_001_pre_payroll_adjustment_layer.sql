-- Version 20260911_001: a zero-valued administrative layer; no leave consumption changes.
IF OBJECT_ID(N'dbo.leave_balance_adjustments',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.leave_balance_adjustments (
    id int NOT NULL IDENTITY(1,1), employeeId int NOT NULL, balanceType nvarchar(50) NOT NULL,
    period nvarchar(20) NOT NULL, idempotencyKey nvarchar(36) NOT NULL,
    delta decimal(8,2) NOT NULL, beforeAdjustment decimal(8,2) NOT NULL, afterAdjustment decimal(8,2) NOT NULL,
    beforeRemaining decimal(8,2) NOT NULL, afterRemaining decimal(8,2) NOT NULL,
    reason nvarchar(500) NOT NULL, actorUserId int NOT NULL,
    createdAt datetime2 NOT NULL CONSTRAINT DF_21ba7c1f50f7e252c384337c669 DEFAULT getdate(),
    CONSTRAINT UQ_leave_adjustment_operation UNIQUE(employeeId,balanceType,period,idempotencyKey),
    CONSTRAINT PK_739992a2c808e6d364d9f2741a1 PRIMARY KEY(id)
  );
  CREATE INDEX IDX_f1b1525474cc501cebd60cd749 ON dbo.leave_balance_adjustments(employeeId);
END;
IF COL_LENGTH(N'dbo.leave_balances',N'adjustmentDays') IS NULL
  ALTER TABLE dbo.leave_balances ADD adjustmentDays decimal(8,2) NOT NULL
    CONSTRAINT DF_08f82bee04ddf93e5f27f4921e2 DEFAULT 0;
