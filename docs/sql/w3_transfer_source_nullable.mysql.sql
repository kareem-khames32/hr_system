-- MySQL deployment migration. Prepared only; not applied or certified by the SQL Server suite.
-- MySQL ALTER TABLE commits implicitly; include this in the versioned deployment/backup plan.
ALTER TABLE transfers MODIFY COLUMN fromTeam int NULL;
UPDATE transfers SET fromTeam = NULL WHERE fromTeam = 0;
