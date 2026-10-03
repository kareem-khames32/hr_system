module.exports = {
  "selected": [
    "codex-review-round40-key-boundary",
    "codex-review-round40-scope-controls"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 8,
      "failed": 0,
      "passed": 8,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 30362.6662
  },
  "results": [
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 line rendering controls: hidden text, stable row/column keys, unchanged totals, company/self and stored history",
      "ms": 10545.0103,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 payslip: a masked key must not allow recovering the hidden payroll period offline",
      "ms": 72.0847,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 run-lines: a masked key must not allow recovering the hidden payroll period offline",
      "ms": 49.9465,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 adjacent overview-lines: old foreign period must not survive in another line reader",
      "ms": 88.8293,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 adjacent approval-review: old foreign period must not survive in another line reader",
      "ms": 104.1167,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 TEAM: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 7759.3694,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 CUSTOM: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 2115.7335,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 COST_CENTER: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 1891.8986,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"line-key-rendering-controls\",\"hiddenKeys\":[\"BASIC\",\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~6673d7f7e4191d29\"],\"rowColumnMapping\":true,\"stableReads\":true,\"net\":9067.89,\"companySelfPreserved\":true,\"storedUnchanged\":true}",
    "{\"case\":\"recover-hidden-period-from-key\",\"route\":\"payslip\",\"directForeignRead\":403,\"currentRead\":200,\"key\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~6673d7f7e4191d29\",\"readerOnlyCandidateSpace\":432,\"decoded\":[],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"recover-hidden-period-from-key\",\"route\":\"run-lines\",\"directForeignRead\":403,\"currentRead\":200,\"key\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~6673d7f7e4191d29\",\"readerOnlyCandidateSpace\":432,\"decoded\":[],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"adjacent-reader-foreign-period\",\"route\":\"overview-lines\",\"url\":\"/payroll/overview/lines?period=2026-11\",\"foreignRead\":403,\"currentRead\":200,\"leaks\":[],\"companyRefs\":[{\"path\":\"$.columns.earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"},{\"path\":\"$.columns.earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"},{\"path\":\"$.rows[0].earnings[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"},{\"path\":\"$.rows[0].earnings[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"}],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"adjacent-reader-foreign-period\",\"route\":\"approval-review\",\"url\":\"/payroll/approval-chain/runs/3/review\",\"foreignRead\":403,\"currentRead\":200,\"leaks\":[],\"companyRefs\":[{\"path\":\"$.rows[0].earningLines[1].key\",\"text\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"},{\"path\":\"$.rows[0].earningLines[1].name\",\"text\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance\"}],\"net\":9067.89,\"storedUnchanged\":true}",
    "{\"case\":\"extended-scope-label-controls\",\"kind\":\"TEAM\",\"branchLabel\":\"فريق: CR40 allowed team، وغيرها خارج نطاق صلاحيتك\",\"companyLabel\":\"فريق: CR40 allowed team، CR40 private team\",\"multiLabel\":\"فريق: CR40 allowed team، CR40 private team\",\"localTotal\":\"6000.00\",\"companyTotal\":\"15000.00\",\"branchHeader\":[null,null],\"companyHeader\":[null,null],\"storedUnchanged\":true}",
    "{\"case\":\"extended-scope-label-controls\",\"kind\":\"CUSTOM\",\"branchLabel\":\"قائمة مخصّصة\",\"companyLabel\":\"قائمة مخصّصة (2 موظف)\",\"multiLabel\":\"قائمة مخصّصة\",\"localTotal\":\"6000.00\",\"companyTotal\":\"15000.00\",\"branchHeader\":[null,null],\"companyHeader\":[2,\"فرع باء المحجوب\"],\"storedUnchanged\":true}",
    "{\"case\":\"extended-scope-label-controls\",\"kind\":\"COST_CENTER\",\"branchLabel\":\"مركز تكلفة: CR40 company cost center\",\"companyLabel\":\"مركز تكلفة: CR40 company cost center\",\"multiLabel\":\"مركز تكلفة: CR40 company cost center\",\"localTotal\":\"6000.00\",\"companyTotal\":\"15000.00\",\"branchHeader\":[null,null],\"companyHeader\":[null,null],\"storedUnchanged\":true}",
    "tests 8",
    "suites 0",
    "pass 8",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 30362.6662"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r40_payslip_test_d5813601467c0df6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r40_payslip_test_d5813601467c0df6\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r40_payslip_test_d5813601467c0df6\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r40_scopes_test_5017a0237fadbc3f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r40_scopes_test_5017a0237fadbc3f\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r40_scopes_test_5017a0237fadbc3f\"}\n"
  ]
}
