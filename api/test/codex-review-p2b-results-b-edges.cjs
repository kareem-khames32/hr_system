module.exports = {
  "selected": [
    "codex-review-p2b-range-edges"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 7,
      "failed": 0,
      "passed": 7,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 7,
      "suites": 0
    },
    "duration_ms": 14277.0466
  },
  "results": [
    {
      "file": "codex-review-p2b-range-edges.integration.cjs",
      "name": "CR3-E1 night crosses month and dated shift revision inside one accrual batch",
      "ms": 6832.6213,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-range-edges.integration.cjs",
      "name": "CR3-E2 actual dated branch transfer and branch holiday/weekend resolved for each day of same batch",
      "ms": 649.6076,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-range-edges.integration.cjs",
      "name": "CR3-E3 exemption ranges remain exact; overlap outside day does not poison cache, overlap inside day fails both paths",
      "ms": 227.7759,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-range-edges.integration.cjs",
      "name": "CR3-E4 reference cache ends with batch; punches remain live; changed source visible in next transaction",
      "ms": 152.8001,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-range-edges.integration.cjs",
      "name": "CR3-E5 dated holiday removal and branch weekend revision inside range survive batch memoization",
      "ms": 1627.1696,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-range-edges.integration.cjs",
      "name": "CR3-E6 supplied shadow UTC date filtering can omit first local SQL DATE; independent oracle covers all dates",
      "ms": 2.8955,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-range-edges.integration.cjs",
      "name": "P2B B out-of-range employee and edge permission/half-leave retain the old answer; no writes",
      "ms": 441.4771,
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
    "{\"case\":\"range-edge\",\"employee\":6,\"date\":\"2026-08-31\",\"status\":\"late\",\"late\":15,\"work\":135}",
    "{\"case\":\"range-edge\",\"employee\":7,\"date\":\"2026-08-31\",\"status\":\"late\",\"late\":165,\"work\":135}",
    "{\"case\":\"range-edge\",\"employee\":6,\"date\":\"2026-09-01\",\"status\":\"absent\",\"late\":0,\"work\":0}",
    "tests 7",
    "suites 0",
    "pass 7",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 14277.0466"
  ],
  "stdout": [
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2b_range_edges_test_48abb59e26582a04\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2b_range_edges_test_48abb59e26582a04\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2b_range_edges_test_48abb59e26582a04\"}\n"
  ]
}
