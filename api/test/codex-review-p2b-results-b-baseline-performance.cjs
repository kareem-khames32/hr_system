module.exports = {
  "selected": [
    "codex-review-p2b-performance"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 2,
      "failed": 0,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 484699.6577
  },
  "results": [
    {
      "file": "codex-review-p2b-performance.integration.cjs",
      "name": "PF-01: حساب 500 موظف بالمجموع اليدوي، والاعتماد أقل من 30 ثانية",
      "ms": 460940.8778,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-performance.integration.cjs",
      "name": "PF-04: الحضور اليومي (النهارده بالغياب اللحظي) أقل من 3 ثواني",
      "ms": 20074.5755,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"staff\":500,\"calculateMs\":187365,\"calculateBytes\":12877718,\"approveMs\":252899,\"approveBytes\":991}",
    "Wall-clock target observed, not asserted under concurrent suite load",
    "{\"todayMs\":8846,\"todayAgainMs\":8514,\"todayRows\":500,\"pastMs\":2431,\"pastRows\":500}",
    "Wall-clock target observed, not asserted under concurrent suite load",
    "Wall-clock target observed, not asserted under concurrent suite load",
    "Cleanup verified: hr_payroll_perf_test_f752e992392f7990 is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 484699.6577"
  ],
  "stdout": [
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"658e15f\",\"sourceFiles\":432}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_perf_test_f752e992392f7990\"}\n",
    "REVIEW_MEASURE {\"ref\":\"658e15f\",\"staff\":500,\"method\":\"POST\",\"route\":\"/payroll/policies\",\"status\":201,\"queries\":16,\"bytes\":2060,\"ms\":86}\n",
    "REVIEW_MEASURE {\"ref\":\"658e15f\",\"staff\":500,\"method\":\"POST\",\"route\":\"/payroll/policies/1/versions/1/publish\",\"status\":200,\"queries\":19,\"bytes\":2428,\"ms\":75}\n",
    "REVIEW_MEASURE {\"ref\":\"658e15f\",\"staff\":500,\"method\":\"POST\",\"route\":\"/payroll/runs\",\"status\":201,\"queries\":539,\"bytes\":2763,\"ms\":918}\n",
    "REVIEW_MEASURE {\"ref\":\"658e15f\",\"staff\":500,\"method\":\"POST\",\"route\":\"/payroll/runs/1/calculate\",\"status\":201,\"queries\":123164,\"bytes\":12877718,\"ms\":187350}\n",
    "REVIEW_MEASURE {\"ref\":\"658e15f\",\"staff\":500,\"method\":\"GET\",\"route\":\"/payroll/runs/1/unassigned\",\"status\":200,\"queries\":20,\"bytes\":492,\"ms\":166}\n",
    "REVIEW_MEASURE {\"ref\":\"658e15f\",\"staff\":500,\"method\":\"POST\",\"route\":\"/payroll/runs/1/unassigned-ack\",\"status\":201,\"queries\":47,\"bytes\":982,\"ms\":392}\n",
    "REVIEW_MEASURE {\"ref\":\"658e15f\",\"staff\":500,\"method\":\"GET\",\"route\":\"/payroll/runs/1\",\"status\":200,\"queries\":18,\"bytes\":12877292,\"ms\":533}\n",
    "REVIEW_MEASURE {\"ref\":\"658e15f\",\"staff\":500,\"method\":\"POST\",\"route\":\"/payroll/runs/1/approve\",\"status\":201,\"queries\":289677,\"bytes\":991,\"ms\":252899}\n",
    "REVIEW_MEASURE {\"ref\":\"658e15f\",\"staff\":500,\"method\":\"GET\",\"route\":\"/attendance/daily?date=2026-10-05\",\"status\":200,\"queries\":12510,\"bytes\":338785,\"ms\":8845}\n",
    "REVIEW_MEASURE {\"ref\":\"658e15f\",\"staff\":500,\"method\":\"GET\",\"route\":\"/attendance/daily?date=2026-10-05\",\"status\":200,\"queries\":12513,\"bytes\":338785,\"ms\":8513}\n",
    "REVIEW_MEASURE {\"ref\":\"658e15f\",\"staff\":500,\"method\":\"GET\",\"route\":\"/attendance/daily?date=2026-07-01\",\"status\":200,\"queries\":1509,\"bytes\":376520,\"ms\":2430}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_perf_test_f752e992392f7990\"}\n"
  ]
}
