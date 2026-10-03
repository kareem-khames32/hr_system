module.exports = {
  "selected": [
    "profile-self-service"
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
    "duration_ms": 9696.786
  },
  "results": [
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-01: the request applies nothing until the final approval, then writes only the changed fields with one change-log row each",
      "ms": 5317.8998,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-02: invalid values are refused at submission with an Arabic message and leave no request; a request invalid at approval applies nothing",
      "ms": 639.5561,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-03: national ID and passport stay unique — checked at the final approval only (no oracle for the employee), and under two simultaneous approvals",
      "ms": 507.382,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-03b: the final approval of an identity change waits on the same identity lock as the HR edit (hr:employees:identity)",
      "ms": 125.5419,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-04: bank, salary, org, codes, dates and the work email are refused — even when configured as a field of the type",
      "ms": 133.1379,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-05: the self photo endpoint — own employee only, image only, uploaded by the caller; the owner and in-scope HR see it",
      "ms": 305.8334,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_profile_test_1bb4da9cd86c0d9f is absent from sys.databases.",
    "tests 6",
    "suites 0",
    "pass 6",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9696.786"
  ],
  "stdout": [
    "CR42_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_profile_test_1bb4da9cd86c0d9f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_profile_test_1bb4da9cd86c0d9f\"}\n"
  ]
}
