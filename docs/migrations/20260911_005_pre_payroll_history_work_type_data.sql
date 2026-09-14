-- Reviewed data-only transition. Row IDs, employee IDs, request IDs, dates and
-- reasons are preserved, except replacing a bank account in a reason by ****last4.
-- Unknown actor identity remains NULL: do not mistake requester/creator for executor.
IF EXISTS(SELECT 1 FROM dbo.employees WHERE workType IS NOT NULL AND workType NOT IN
 (N'fulltime',N'parttime',N'full_time',N'part_time',N'contract',N'consultant',N'intern'))
 THROW 50020,'Unknown workType values require a data decision; no automatic mapping',1;

IF EXISTS(SELECT 1 FROM dbo.employee_status_history WHERE changeType IS NULL
 AND CHARINDEX(':',newStatus)>0 AND CHARINDEX(':',oldStatus)>0
 AND LEFT(newStatus,CHARINDEX(':',newStatus)-1)<>LEFT(oldStatus,CHARINDEX(':',oldStatus)-1))
 THROW 50021,'Mismatched legacy history prefixes require review',1;

;WITH source AS (
 SELECT id,oldStatus,newStatus,reason,
 CASE WHEN CHARINDEX(':',newStatus)>0 THEN LEFT(newStatus,CHARINDEX(':',newStatus)-1)
      WHEN newStatus=N'data_update' THEN N'legacy_data_update'
      WHEN newStatus IN(N'active',N'probation',N'suspended',N'notice_period',N'terminated',N'archived',N'on_leave',N'resigned',N'retired') THEN N'status'
      ELSE N'legacy_raw' END AS field,
 CASE WHEN CHARINDEX(':',oldStatus)>0 THEN LTRIM(SUBSTRING(oldStatus,CHARINDEX(':',oldStatus)+1,100)) ELSE oldStatus END AS beforeValue,
 CASE WHEN CHARINDEX(':',newStatus)>0 THEN LTRIM(SUBSTRING(newStatus,CHARINDEX(':',newStatus)+1,100)) ELSE newStatus END AS afterValue
 FROM dbo.employee_status_history WHERE changeType IS NULL
), prepared AS (
 SELECT *,CASE WHEN field=N'iban' AND beforeValue IS NOT NULL AND beforeValue<>N'—' THEN N'****'+RIGHT(REPLACE(REPLACE(beforeValue,N' ',N''),N'-',N''),4) ELSE beforeValue END AS safeBefore,
 CASE WHEN field=N'iban' AND afterValue IS NOT NULL AND afterValue<>N'—' THEN N'****'+RIGHT(REPLACE(REPLACE(afterValue,N' ',N''),N'-',N''),4) ELSE afterValue END AS safeAfter
 FROM source
)
UPDATE h SET
 changeType=CASE WHEN p.field=N'status' THEN N'STATUS'
   WHEN p.field IN(N'iban',N'bankName',N'bankBranch',N'payMethod') THEN N'BANK'
   WHEN p.field IN(N'salary',N'basicSalary',N'housingAllowance',N'transportAllowance',N'phoneAllowance',N'workNatureAllowance',N'otherAllowance',N'gosiBaseSalary',N'salaryCycle') THEN N'SALARY'
   WHEN p.field IN(N'team',N'teamId',N'departmentId',N'branchId',N'managerEmployeeId') THEN N'TEAM'
   WHEN p.field IN(N'title',N'jobTitle') THEN N'TITLE'
   WHEN p.field LIKE N'contract%' THEN N'CONTRACT' WHEN p.field LIKE N'shift%' THEN N'SHIFT' ELSE N'DATA' END,
 fieldName=p.field,
 oldValue=CASE WHEN p.safeBefore IS NULL THEN NULL ELSE N'"'+STRING_ESCAPE(p.safeBefore,'json')+N'"' END,
 newValue=CASE WHEN p.safeAfter IS NULL THEN NULL ELSE N'"'+STRING_ESCAPE(p.safeAfter,'json')+N'"' END,
 oldStatus=CASE WHEN p.field=N'status' THEN h.oldStatus ELSE NULL END,
 newStatus=CASE WHEN p.field=N'status' THEN h.newStatus ELSE N'change' END,
 reason=CASE WHEN p.field=N'iban' THEN
   REPLACE(REPLACE(h.reason,COALESCE(NULLIF(p.beforeValue,N''),NCHAR(1)),COALESCE(p.safeBefore,N'')),COALESCE(NULLIF(p.afterValue,N''),NCHAR(1)),COALESCE(p.safeAfter,N'')) ELSE h.reason END
FROM dbo.employee_status_history h JOIN prepared p ON p.id=h.id;

UPDATE dbo.employees SET workType=N'full_time' WHERE workType=N'fulltime';
UPDATE dbo.employees SET workType=N'part_time' WHERE workType=N'parttime';
