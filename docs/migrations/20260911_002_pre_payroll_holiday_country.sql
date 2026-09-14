-- Version 20260911_002: remove a schema default without changing holiday countries.
DECLARE @defaultName sysname;
SELECT @defaultName=d.name FROM sys.default_constraints d
JOIN sys.columns c ON c.default_object_id=d.object_id
WHERE d.parent_object_id=OBJECT_ID(N'dbo.public_holidays') AND c.name=N'country';
IF @defaultName IS NOT NULL
BEGIN
  DECLARE @dropDefault nvarchar(max)=N'ALTER TABLE dbo.public_holidays DROP CONSTRAINT '+QUOTENAME(@defaultName);
  EXEC sp_executesql @dropDefault;
END;
