module.exports = {
  "selected": [
    "codex-review-round3-cache-edges"
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
    "duration_ms": 7558.4584
  },
  "results": [
    {
      "file": "codex-review-round3-cache-edges.integration.cjs",
      "name": "CR3-E1 night crosses month and dated shift revision inside one accrual batch",
      "ms": 3751.2468,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round3-cache-edges.integration.cjs",
      "name": "CR3-E2 actual dated branch transfer and branch holiday/weekend resolved for each day of same batch",
      "ms": 370.859,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round3-cache-edges.integration.cjs",
      "name": "CR3-E3 exemption ranges remain exact; overlap outside day does not poison cache, overlap inside day fails both paths",
      "ms": 201.6254,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round3-cache-edges.integration.cjs",
      "name": "CR3-E4 reference cache ends with batch; punches remain live; changed source visible in next transaction",
      "ms": 105.6533,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round3-cache-edges.integration.cjs",
      "name": "CR3-E5 dated holiday removal and branch weekend revision inside range survive batch memoization",
      "ms": 1033.7773,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round3-cache-edges.integration.cjs",
      "name": "CR3-E6 supplied shadow UTC date filtering can omit first local SQL DATE; independent oracle covers all dates",
      "ms": 1.6419,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"nightDays\":[{\"date\":\"2026-08-31\",\"late\":10,\"work\":280,\"shortfall\":20},{\"date\":\"2026-09-01\",\"late\":20,\"work\":280,\"shortfall\":20}]}",
    "{\"transferCalendar\":[{\"date\":\"2026-08-28\",\"branch\":1,\"kind\":\"WEEKEND\"},{\"date\":\"2026-08-29\",\"branch\":2,\"kind\":\"WEEKEND\"},{\"date\":\"2026-08-30\",\"branch\":2,\"kind\":\"WORKING\"}]}",
    "{\"calendarBoundaryKinds\":[\"HOLIDAY\",\"HOLIDAY\",\"WORKING\",\"WORKING\",\"WORKING\",\"WEEKEND\"]}",
    "{\"sqlDate\":\"2026-08-31\",\"originalShadowDay\":\"2026-08-30\",\"firstDayOmitted\":true}",
    "tests 6",
    "suites 0",
    "pass 6",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7558.4584"
  ],
  "stdout": [
    "{\"cleanupVerified\":\"hr_codex_r3cacheedges_test_245ab365b2c4f8e1\"}\n",
    "CR3_SHADOW_SUMMARY {\"calls\":3,\"compared\":3,\"rows\":22,\"mismatches\":0,\"equalErrors\":0}\n"
  ]
}
