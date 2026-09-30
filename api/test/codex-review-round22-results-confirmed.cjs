module.exports = {
  "selected": [
    "codex-review-round22-independent"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 6,
      "failed": 0,
      "passed": 6,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 10215.5996
  },
  "results": [
    {
      "file": "codex-review-round22-independent.integration.cjs",
      "name": "CR22 real payroll filtered totals and register equal the hand sum; excluded department and branch add nothing",
      "ms": 6680.2291,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round22-independent.integration.cjs",
      "name": "CR22 new query inputs reject injection and overflow; read/write permissions remain independent",
      "ms": 72.1299,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round22-independent.integration.cjs",
      "name": "CR22 mark-filtered serializes two stale callers and writes exactly the filtered employees once",
      "ms": 176.4472,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round22-independent.integration.cjs",
      "name": "CR22 old request counts must not reveal the transferred requester department or team outside viewer scope",
      "ms": 323.7332,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round22-independent.integration.cjs",
      "name": "CR22 server bank sheet and actual CSV and Excel exports match the register after employee transfer",
      "ms": 181.0465,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round22-independent.integration.cjs",
      "name": "CR22 bank filters intersect snapshot placement; foreign and nonexistent organization cannot change counts",
      "ms": 471.6429,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"filtered-real-payroll\",\"netAmounts\":[6000.11,3000.22,2000.33],\"filteredHandSum\":9000.33,\"report\":{\"id\":1,\"name\":\"مسير فلتر أ\",\"period\":\"2026-09\",\"status\":\"APPROVED\",\"scopeType\":\"BRANCH\",\"scopeLabel\":\"فرع: فرع أ\",\"runType\":\"REGULAR\",\"parentRunId\":null,\"branchId\":null,\"branchName\":null,\"startDate\":\"2026-08-23\",\"endDate\":\"2026-09-22\",\"storedTotalNet\":null,\"employees\":2,\"excluded\":0,\"totalNet\":\"9000.33\",\"reversedEmployees\":0,\"reversedNet\":\"0.00\",\"partial\":true},\"disbursement\":{\"paid\":{\"count\":0,\"total\":0,\"bank\":0,\"cash\":0},\"unpaid\":{\"count\":2,\"total\":9000.33,\"bank\":6000.11,\"cash\":3000.22},\"payable\":{\"count\":2,\"total\":9000.33,\"bank\":6000.11,\"cash\":3000.22},\"settlement\":{\"count\":0,\"total\":0},\"noAmount\":0,\"issues\":0}}",
    "{\"case\":\"query-and-permission-guards\",\"queriesRejected\":18,\"unauthenticated\":401,\"unauthorized\":403}",
    "{\"case\":\"mark-filtered-race\",\"sqlWaiters\":2,\"statuses\":[201,409],\"markedIds\":[1,2],\"events\":1}",
    "{\"case\":\"request-count-org-oracle\",\"all\":2,\"foreignDepartment\":{\"byType\":[]},\"foreignTeam\":{\"byType\":[]},\"missingDepartment\":{\"byType\":[]}}",
    "{\"case\":\"bank-filter-after-transfer\",\"frontendRequest\":\"/payroll/runs/1/bank-sheet?branchId=1&departmentIds=1%2C2\",\"registerEmployeeIds\":[1,2],\"bankEmployeeIds\":[1,2],\"registerTotal\":9000.33,\"bankTotal\":9000.33,\"registerBank\":6000.11,\"shownBank\":6000.11,\"csvEmployeeCount\":2,\"csvSum\":9000.33,\"excelSum\":9000.33,\"excelIncludesTransferredEmployee\":true}",
    "{\"case\":\"bank-filter-edges\",\"matchingRegisterQueries\":6,\"foreignDepartmentAndTeamEqualMissing\":true,\"foreignAndMissingBranchStatus\":403}",
    "tests 6",
    "suites 0",
    "pass 6",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10215.5996"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r22_independent_test_fb7cfca099123142\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r22_independent_test_fb7cfca099123142\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r22_independent_test_fb7cfca099123142\"}\n"
  ]
}
