-- SQL Server deployment migration. Prepared only; not applied to the customer database.
-- Run against the intended restored/test database first, then use the approved deployment plan.
-- Converts the documented legacy sentinel 0 to SQL NULL; other historical team references stay intact.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.transfers', N'U') IS NULL
    THROW 50001, 'Expected dbo.transfers was not found in this database', 1;
ALTER TABLE dbo.transfers ALTER COLUMN fromTeam int NULL;
UPDATE dbo.transfers SET fromTeam = NULL WHERE fromTeam = 0;
COMMIT TRANSACTION;
