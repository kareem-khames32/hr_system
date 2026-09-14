-- SQL Server only. Run on a restored customer snapshot first, then deploy
-- before starting the API with DB_SYNCHRONIZE=false. No USE/customer DB name.
-- Existing balances and leave consumption remain unchanged (new layer = 0).
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.leave_balances', N'U') IS NULL
    THROW 50001, 'Expected existing dbo.leave_balances table', 1;

IF COL_LENGTH(N'dbo.leave_balances', N'adjustmentDays') IS NULL
    ALTER TABLE dbo.leave_balances ADD adjustmentDays decimal(8,2) NOT NULL
        CONSTRAINT DF_leave_balances_adjustmentDays DEFAULT (0) WITH VALUES;

IF OBJECT_ID(N'dbo.leave_balance_adjustments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.leave_balance_adjustments (
        id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_leave_balance_adjustments PRIMARY KEY,
        employeeId int NOT NULL,
        balanceType nvarchar(50) NOT NULL,
        period nvarchar(20) NOT NULL,
        idempotencyKey nvarchar(36) NOT NULL,
        delta decimal(8,2) NOT NULL,
        beforeAdjustment decimal(8,2) NOT NULL,
        afterAdjustment decimal(8,2) NOT NULL,
        beforeRemaining decimal(8,2) NOT NULL,
        afterRemaining decimal(8,2) NOT NULL,
        reason nvarchar(500) NOT NULL,
        actorUserId int NOT NULL,
        createdAt datetime2 NOT NULL CONSTRAINT DF_leave_adjustment_createdAt DEFAULT (SYSDATETIME()),
        CONSTRAINT UQ_leave_adjustment_operation UNIQUE (employeeId, balanceType, period, idempotencyKey)
    );
    CREATE INDEX IX_leave_adjustment_employee ON dbo.leave_balance_adjustments(employeeId);
END;

COMMIT TRANSACTION;
