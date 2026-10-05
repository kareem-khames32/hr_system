module.exports = {
  "selected": [
    "codex-review-p2b-performance"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 4,
      "failed": 0,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 243776.6105
  },
  "results": [
    {
      "file": "codex-review-p2b-performance.integration.cjs",
      "name": "PF-01: حساب 500 موظف بالمجموع اليدوي، والاعتماد أقل من 30 ثانية",
      "ms": 231193.9611,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-performance.integration.cjs",
      "name": "PF-02: رد التفاصيل للشاشة أقل من 2 ميجا وفيه اللي الشاشة بتقراه؛ والرد الكامل والقسيمة بالتفصيل كله",
      "ms": 1085.7684,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-performance.integration.cjs",
      "name": "PF-03: حدث «محسوب» من غير تفصيل البنود، وبصمة كل تفصيل مطابقة للمخزن",
      "ms": 221.4063,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-performance.integration.cjs",
      "name": "PF-04: الحضور اليومي (النهارده بالغياب اللحظي) أقل من 3 ثواني",
      "ms": 8454.8919,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"staff\":500,\"calculateMs\":203149,\"calculateBytes\":12877718,\"approveMs\":8589,\"approveBytes\":991}",
    "Wall-clock target observed, not asserted under concurrent suite load",
    "{\"fullBytes\":12877306,\"fullMs\":607,\"screenBytes\":970022,\"screenMs\":400}",
    "{\"screenParts\":{\"items\":457285,\"members\":509175},\"oneItem\":910,\"oneItemBreakdown\":395,\"oneMember\":1012,\"memberSnapshotKeys\":{\"version\":1,\"capturedAt\":26,\"fullName\":21,\"employeeCode\":8,\"jobTitle\":4,\"branchId\":1,\"branchName\":34,\"departmentId\":4,\"departmentName\":4,\"teamId\":4,\"teamName\":4,\"costCenterId\":4,\"costCenterName\":4,\"orgDate\":12,\"coverFrom\":12,\"coverTo\":12,\"coverDays\":2,\"hireDate\":12,\"leaveDate\":4,\"prorataFactor\":1,\"monthlyDays\":2,\"basicSalary\":4,\"allowances\":4,\"gross\":4,\"grossEarned\":4,\"salarySource\":557,\"salaryIssue\":4,\"suspensionNote\":4,\"settlementPayout\":4,\"monthlyComponents\":21,\"earnedComponents\":21,\"salaryComponents\":718,\"attendanceExemptions\":2,\"exemptDays\":1,\"isAttendanceExempt\":5,\"salaryMode\":18}}",
    "{\"calculatedEventBytes\":2634080}",
    "{\"todayMs\":2956,\"todayAgainMs\":2689,\"todayRows\":500,\"pastMs\":2524,\"pastRows\":500}",
    "Wall-clock target observed, not asserted under concurrent suite load",
    "Wall-clock target observed, not asserted under concurrent suite load",
    "Cleanup verified: hr_payroll_perf_test_7c2d38d51405ffb5 is absent from sys.databases.",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 243776.6105"
  ],
  "stdout": [
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_perf_test_7c2d38d51405ffb5\"}\n",
    "REVIEW_MEASURE {\"ref\":\"73d5643\",\"staff\":500,\"method\":\"POST\",\"route\":\"/payroll/policies\",\"status\":201,\"queries\":16,\"bytes\":2060,\"ms\":76}\n",
    "REVIEW_MEASURE {\"ref\":\"73d5643\",\"staff\":500,\"method\":\"POST\",\"route\":\"/payroll/policies/1/versions/1/publish\",\"status\":200,\"queries\":19,\"bytes\":2428,\"ms\":70}\n",
    "REVIEW_MEASURE {\"ref\":\"73d5643\",\"staff\":500,\"method\":\"POST\",\"route\":\"/payroll/runs\",\"status\":201,\"queries\":539,\"bytes\":2763,\"ms\":923}\n",
    "REVIEW_MEASURE {\"ref\":\"73d5643\",\"staff\":500,\"method\":\"POST\",\"route\":\"/payroll/runs/1/calculate\",\"status\":201,\"queries\":123173,\"bytes\":12877718,\"ms\":203131}\n",
    "REVIEW_MEASURE {\"ref\":\"73d5643\",\"staff\":500,\"method\":\"GET\",\"route\":\"/payroll/runs/1/unassigned\",\"status\":200,\"queries\":20,\"bytes\":492,\"ms\":163}\n",
    "REVIEW_MEASURE {\"ref\":\"73d5643\",\"staff\":500,\"method\":\"POST\",\"route\":\"/payroll/runs/1/unassigned-ack\",\"status\":201,\"queries\":47,\"bytes\":982,\"ms\":413}\n",
    "REVIEW_MEASURE {\"ref\":\"73d5643\",\"staff\":500,\"method\":\"GET\",\"route\":\"/payroll/runs/1\",\"status\":200,\"queries\":18,\"bytes\":12877292,\"ms\":509}\n",
    "REVIEW_MEASURE {\"ref\":\"73d5643\",\"staff\":500,\"method\":\"POST\",\"route\":\"/payroll/runs/1/approve\",\"status\":201,\"queries\":5542,\"bytes\":991,\"ms\":8588}\n",
    "REVIEW_MEASURE {\"ref\":\"73d5643\",\"staff\":500,\"method\":\"GET\",\"route\":\"/payroll/runs/1\",\"status\":200,\"queries\":17,\"bytes\":12877306,\"ms\":592}\n",
    "REVIEW_MEASURE {\"ref\":\"73d5643\",\"staff\":500,\"method\":\"GET\",\"route\":\"/payroll/runs/1?view=screen\",\"status\":200,\"queries\":20,\"bytes\":970022,\"ms\":398}\n",
    "REVIEW_MEASURE {\"ref\":\"73d5643\",\"staff\":500,\"method\":\"GET\",\"route\":\"/payroll/items/1\",\"status\":200,\"queries\":10,\"bytes\":27476,\"ms\":36}\n",
    "REVIEW_MEASURE {\"ref\":\"73d5643\",\"staff\":500,\"method\":\"GET\",\"route\":\"/attendance/daily?date=2026-10-05\",\"status\":200,\"queries\":3030,\"bytes\":338785,\"ms\":2955}\n",
    "REVIEW_MEASURE {\"ref\":\"73d5643\",\"staff\":500,\"method\":\"GET\",\"route\":\"/attendance/daily?date=2026-10-05\",\"status\":200,\"queries\":3030,\"bytes\":338785,\"ms\":2688}\n",
    "REVIEW_MEASURE {\"ref\":\"73d5643\",\"staff\":500,\"method\":\"GET\",\"route\":\"/attendance/daily?date=2026-07-01\",\"status\":200,\"queries\":1509,\"bytes\":376520,\"ms\":2523}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_perf_test_7c2d38d51405ffb5\"}\n"
  ]
}
