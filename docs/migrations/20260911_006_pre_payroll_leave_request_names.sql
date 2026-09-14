-- NAM-16/NAM-29. Run only in the guarded review migration transaction.
-- Preserve every request_type profile, approval chain, resolved step and audit row.
-- No default profile or balance classification is guessed.
IF COL_LENGTH(N'dbo.leaves',N'leaveType') IS NOT NULL AND COL_LENGTH(N'dbo.leaves',N'leaveTypeCode') IS NOT NULL
 THROW 50020,'Both leave type columns exist; review the mapping before migration',1;
IF COL_LENGTH(N'dbo.leave_types',N'balanceSource') IS NOT NULL AND COL_LENGTH(N'dbo.leave_types',N'balanceType') IS NOT NULL
 THROW 50021,'Both balance type columns exist; review the mapping before migration',1;
IF COL_LENGTH(N'dbo.leaves',N'leaveType') IS NOT NULL
 EXEC sys.sp_rename N'dbo.leaves.leaveType',N'leaveTypeCode',N'COLUMN';
IF COL_LENGTH(N'dbo.leave_types',N'balanceSource') IS NOT NULL
 EXEC sys.sp_rename N'dbo.leave_types.balanceSource',N'balanceType',N'COLUMN';
IF COL_LENGTH(N'dbo.leaves',N'leaveTypeCode') IS NULL OR COL_LENGTH(N'dbo.leave_types',N'balanceType') IS NULL
 THROW 50022,'A required leave column is missing; no replacement values may be inferred',1;
IF COL_LENGTH(N'dbo.requests',N'definitionCode') IS NULL
 ALTER TABLE dbo.requests ADD definitionCode nvarchar(50) NULL;

-- Dynamic batch allows the newly added column to be bound after ALTER TABLE.
EXEC sys.sp_executesql N'
 IF EXISTS(SELECT 1 FROM dbo.requests r LEFT JOIN dbo.request_types t
   ON t.code=COALESCE(NULLIF(r.definitionCode,N''''),r.typeCode)
   WHERE t.id IS NULL AND (r.definitionCode IS NOT NULL OR r.typeCode=N''LEAVE'' OR r.typeCode LIKE N''LEAVE[_]%''))
  THROW 50029,''A leave request references a missing profile; no substitute profile may be guessed'',1;
 IF EXISTS(SELECT 1 FROM dbo.requests r WHERE r.definitionCode IS NOT NULL
   AND r.typeCode<>N''LEAVE'' AND r.typeCode<>r.definitionCode)
  THROW 50030,''Stored request family conflicts with its original definition code'',1;
 SELECT r.id,r.status,r.typeCode,r.definitionCode,t.code AS profileCode,
   CAST(r.payload AS nvarchar(max)) AS originalPayload,
   CASE WHEN ISJSON(CAST(r.payload AS nvarchar(max)))=1 THEN CAST(r.payload AS nvarchar(max)) ELSE N''{}'' END AS validPayload,
   CASE WHEN t.code LIKE N''LEAVE[_]%'' AND t.code<>N''LEAVE_MODIFY_CANCEL'' THEN SUBSTRING(t.code,7,50) ELSE NULL END AS fixedCode
 INTO #leave_requests
 FROM dbo.requests r
 JOIN dbo.request_types t ON t.code=COALESCE(NULLIF(r.definitionCode,N''''),r.typeCode)
 WHERE t.destinationHandler IN(N''leave_deduct_balance'',N''leave_no_balance'',N''leave_calendar_balance'',N''leave_calendar'',N''leave_calendar_payroll'',N''leave_calendar_once'');

 IF EXISTS(SELECT 1 FROM #leave_requests WHERE originalPayload IS NOT NULL AND LTRIM(RTRIM(originalPayload))<>N'''' AND ISJSON(originalPayload)<>1)
  THROW 50023,''Invalid leave payload JSON; migration stopped without guessing'',1;
 IF EXISTS(SELECT 1 FROM #leave_requests WHERE definitionCode IS NOT NULL AND definitionCode<>profileCode)
  THROW 50024,''Conflicting leave definition reference'',1;
 IF EXISTS(SELECT 1 FROM #leave_requests
   WHERE JSON_VALUE(validPayload,''$.leaveTypeCode'') IS NOT NULL AND JSON_VALUE(validPayload,''$.leaveType'') IS NOT NULL
     AND JSON_VALUE(validPayload,''$.leaveTypeCode'')<>JSON_VALUE(validPayload,''$.leaveType''))
  THROW 50025,''Conflicting canonical and legacy leave codes; review required'',1;
 IF EXISTS(SELECT 1 FROM #leave_requests
   WHERE fixedCode IS NOT NULL AND COALESCE(JSON_VALUE(validPayload,''$.leaveTypeCode''),JSON_VALUE(validPayload,''$.leaveType''),fixedCode)<>fixedCode)
  THROW 50026,''Payload leave code conflicts with its original request profile; review required'',1;
 IF EXISTS(SELECT 1 FROM #leave_requests WHERE status<>N''DRAFT''
   AND NULLIF(COALESCE(JSON_VALUE(validPayload,''$.leaveTypeCode''),JSON_VALUE(validPayload,''$.leaveType''),fixedCode),N'''') IS NULL)
  THROW 50027,''A submitted leave lacks its leave type; no default may be guessed'',1;
 IF EXISTS(SELECT 1 FROM #leave_requests WHERE LEN(COALESCE(JSON_VALUE(validPayload,''$.leaveTypeCode''),JSON_VALUE(validPayload,''$.leaveType''),fixedCode))>50)
  THROW 50028,''Leave type code exceeds the persisted column length'',1;

 UPDATE r SET definitionCode=c.profileCode,typeCode=N''LEAVE'',
   payload=CASE WHEN NULLIF(v.leaveCode,N'''') IS NULL THEN r.payload
     ELSE JSON_MODIFY(JSON_MODIFY(c.validPayload,''$.leaveTypeCode'',v.leaveCode),''$.leaveType'',v.leaveCode) END
 FROM dbo.requests r JOIN #leave_requests c ON c.id=r.id
 CROSS APPLY(SELECT COALESCE(JSON_VALUE(c.validPayload,''$.leaveTypeCode''),JSON_VALUE(c.validPayload,''$.leaveType''),c.fixedCode) AS leaveCode) v
 WHERE r.typeCode<>N''LEAVE'' OR ISNULL(r.definitionCode,N'''')<>c.profileCode
   OR (v.leaveCode IS NOT NULL AND (JSON_VALUE(c.validPayload,''$.leaveTypeCode'') IS NULL OR JSON_VALUE(c.validPayload,''$.leaveType'') IS NULL));
 DROP TABLE #leave_requests;
';
