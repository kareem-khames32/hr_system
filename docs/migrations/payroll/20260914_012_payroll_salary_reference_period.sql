-- عقد شهري صريح جديد؛ السجلات السابقة تبقى بلا شهر مفترض أو تغيير لبصماتها.
ALTER TABLE dbo.employee_salary_history_versions ADD contractVersion nvarchar(64) NULL;
ALTER TABLE dbo.employee_salary_history_versions ADD cycleStartDay tinyint NULL;
ALTER TABLE dbo.employee_salary_history ADD effectivePayrollPeriod nvarchar(7) NULL;
ALTER TABLE dbo.employee_salary_history ADD effectiveToPayrollPeriod nvarchar(7) NULL;
