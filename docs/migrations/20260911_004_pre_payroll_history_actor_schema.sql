-- NAM-14/NAM-28: additive structured history; explicit value-preserving renames.
-- Execute only through the guarded review runner after verified backup/restore.
DECLARE @renames TABLE(tableName sysname, oldName sysname, newName sysname);
INSERT INTO @renames VALUES
 (N'transfers',N'fromTeam',N'fromTeamId'), (N'transfers',N'toTeam',N'toTeamId'),
 (N'custody_assignments',N'assignedBy',N'assignedByEmployeeId'),
 (N'offboarding_cases',N'openedBy',N'openedByUserId'),
 (N'offboarding_cases',N'settlementApprovedBy',N'settlementApprovedByUserId'),
 (N'clearance_items',N'doneBy',N'doneByUserId'),
 (N'onboarding_tasks',N'doneBy',N'doneByUserId');
DECLARE @table sysname, @old sysname, @new sysname, @qualified nvarchar(500);
DECLARE rename_cursor CURSOR LOCAL FAST_FORWARD FOR SELECT tableName,oldName,newName FROM @renames;
OPEN rename_cursor;
FETCH NEXT FROM rename_cursor INTO @table,@old,@new;
WHILE @@FETCH_STATUS = 0
BEGIN
 IF COL_LENGTH(N'dbo.'+@table,@old) IS NOT NULL AND COL_LENGTH(N'dbo.'+@table,@new) IS NOT NULL
   THROW 50010,'Both legacy and canonical actor columns exist; manual review required',1;
 IF COL_LENGTH(N'dbo.'+@table,@old) IS NOT NULL
 BEGIN
   SET @qualified=N'dbo.'+@table+N'.'+@old;
   EXEC sys.sp_rename @qualified,@new,N'COLUMN';
 END;
 IF COL_LENGTH(N'dbo.'+@table,@new) IS NULL
   THROW 50011,'Missing source/canonical actor column; no identity value may be guessed',1;
 FETCH NEXT FROM rename_cursor INTO @table,@old,@new;
END;
CLOSE rename_cursor;
DEALLOCATE rename_cursor;

IF COL_LENGTH(N'dbo.employee_status_history',N'changeType') IS NULL
 ALTER TABLE dbo.employee_status_history ADD changeType nvarchar(20) NULL;
IF COL_LENGTH(N'dbo.employee_status_history',N'fieldName') IS NULL
 ALTER TABLE dbo.employee_status_history ADD fieldName nvarchar(60) NULL;
IF COL_LENGTH(N'dbo.employee_status_history',N'oldValue') IS NULL
 ALTER TABLE dbo.employee_status_history ADD oldValue ntext NULL;
IF COL_LENGTH(N'dbo.employee_status_history',N'newValue') IS NULL
 ALTER TABLE dbo.employee_status_history ADD newValue ntext NULL;
IF COL_LENGTH(N'dbo.employee_status_history',N'changedByUserId') IS NULL
 ALTER TABLE dbo.employee_status_history ADD changedByUserId int NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.employee_status_history') AND name=N'IDX_a44c5524a2dc5023b0bef44f41')
 CREATE INDEX IDX_a44c5524a2dc5023b0bef44f41 ON dbo.employee_status_history(changeType);
