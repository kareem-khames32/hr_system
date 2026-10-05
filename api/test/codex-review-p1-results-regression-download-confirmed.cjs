module.exports = {
  "selected": [
    "security-permission-gaps"
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
    "duration_ms": 9967.6939
  },
  "results": [
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-05: sensitive payroll/attendance grants are super-admin-only for accounts, overrides and roles",
      "ms": 6648.3505,
      "pass": true,
      "skip": false
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-06: salary change and its context need payroll.approve on top of employees.edit",
      "ms": 158.2118,
      "pass": true,
      "skip": false
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-07: salary letters need the finance read check on /letters download and /files",
      "ms": 380.5441,
      "pass": true,
      "skip": false
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-04: /obligations read, create and cancel enforce the employee branch scope",
      "ms": 104.6868,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_sec1_perm_test_595f03b9425b695f removed.",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9967.6939"
  ],
  "stdout": [
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_sec1_perm_test_595f03b9425b695f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_sec1_perm_test_595f03b9425b695f\"}\n"
  ]
}
