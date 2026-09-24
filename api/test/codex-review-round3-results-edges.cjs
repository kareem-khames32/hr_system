module.exports = {
  "selected": [
    "codex-review-round3-cache-edges"
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
    "duration_ms": 7116.9016
  },
  "results": [
    {
      "file": "codex-review-round3-cache-edges.integration.cjs",
      "name": "CR3-E1 night crosses month and dated shift revision inside one accrual batch",
      "ms": 4226.8395,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round3-cache-edges.integration.cjs",
      "name": "CR3-E2 actual dated branch transfer and branch holiday/weekend resolved for each day of same batch",
      "ms": 422.7534,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round3-cache-edges.integration.cjs",
      "name": "CR3-E3 exemption ranges remain exact; overlap outside day does not poison cache, overlap inside day fails both paths",
      "ms": 183.1408,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round3-cache-edges.integration.cjs",
      "name": "CR3-E4 reference cache ends with batch; punches remain live; changed source visible in next transaction",
      "ms": 112.0239,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"nightDays\":[{\"date\":\"2026-08-31\",\"late\":10,\"work\":280,\"shortfall\":20},{\"date\":\"2026-09-01\",\"late\":20,\"work\":280,\"shortfall\":20}]}",
    "{\"transferCalendar\":[{\"date\":\"2026-08-28\",\"branch\":1,\"kind\":\"WEEKEND\"},{\"date\":\"2026-08-29\",\"branch\":2,\"kind\":\"WEEKEND\"},{\"date\":\"2026-08-30\",\"branch\":2,\"kind\":\"WORKING\"}]}",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7116.9016"
  ],
  "stdout": [
    "{\"cleanupVerified\":\"hr_codex_r3cacheedges_test_db3ec3f40b69449f\"}\n",
    "CR3_SHADOW_SUMMARY {\"calls\":2,\"compared\":2,\"rows\":10,\"mismatches\":0,\"equalErrors\":0}\n"
  ]
}
