module.exports = {
  "target": "103a5ed67f4c82cc113321475258b4b46c43b622",
  "base": "0866386a",
  "verdict": "REJECT",
  "closed": [
    "P6A-B01",
    "P6A-B02",
    "P6A-B03",
    "P6A-B04"
  ],
  "open": [
    "P6A-B05",
    "P6A-B06"
  ],
  "newBlockers": [
    "P6B-B01"
  ],
  "positiveDefectTests": [
    "A04",
    "A05",
    "A07",
    "W03",
    "W04"
  ],
  "finalResults": [
    "codex-review-p6b-results-regression.cjs",
    "codex-review-p6b-results-final-independent.cjs",
    "codex-review-p6b-results-assist-race.cjs",
    "codex-review-p6b-results-webhook-abort.cjs",
    "codex-review-p6b-unit-results.cjs",
    "codex-review-p6b-static-checks.cjs",
    "codex-review-p6b-pinned-transport-result.cjs",
    "codex-review-p6b-transport-abort-result.cjs",
    "codex-review-p6b-customer-routing-result.cjs"
  ],
  "counts": {
    "originalIntegration": 37,
    "adaptedIntegrationUnique": 45,
    "standalone": 3,
    "selectedUnits": 99
  },
  "commands": [
    "REVIEW_PRELOAD=codex-review-p6b-local-preload.cjs REVIEW_RESULT_SUFFIX=review node api/test/codex-review-p6b-suite.cjs codex-review-p6b-setup codex-review-p6b-public codex-review-p6b-ai-read codex-review-p6b-ai codex-review-p6b-ai-assist codex-review-p6b-webhooks",
    "node --test api/test/codex-review-p6b-customer-routing.test.cjs api/test/codex-review-p6b-pinned-transport.test.cjs api/test/codex-review-p6b-transport-abort.test.cjs",
    "node api/test/codex-review-p6b-units.cjs",
    "node api/test/codex-review-p6b-static.cjs"
  ],
  "method": {
    "http": "Nest in-process transport runs real guards/pipes/controllers, no API listener",
    "receivers": "ephemeral loopback only",
    "tls": "generated disposable certificate; hostname verification enabled; wrong-name rejected",
    "dns": "service resolver mocked; native transport uses provided loopback; no outside lookup",
    "mail": "actual MailService send/isConfigured replaced before initialization",
    "ai": "environment provider/key cleared before app creation and actual service uses fake provider",
    "database": "separate random disposable database for each fixture; no company migration",
    "initialHarnessCorrections": "First independent run had two test-only errors (GET instead of POST template, missing helper). Both corrected and full final rerun passed.",
    "transportExploration": "An initial crash hypothesis was disproved: response abort leaves a pending promise. Final W03/W04 assert observed hang; no crash is claimed."
  },
  "classAudit": [
    {
      "area": "import gates",
      "sources": [
        "setup-import.service.ts:42-73",
        "setup-import.service.ts:217-278"
      ],
      "result": "all four kinds template/preview/apply covered; original service writes retained"
    },
    {
      "area": "customer upgrade",
      "sources": [
        "customer.cjs:108-124",
        "db-migrate.cjs:534-548"
      ],
      "result": "environment equality plus explicit database; mismatch rejected before child process; migration class guard rejects changed company target"
    },
    {
      "area": "public refs",
      "sources": [
        "public-api.service.ts:20-32",
        "public-api.service.ts:89-130"
      ],
      "result": "current referenced branch enforced for department/team/manager and parent; list/single/unrestricted controls pass"
    },
    {
      "area": "AI identity",
      "sources": [
        "ai.service.ts:109-164",
        "ai-assist.service.ts:116-133"
      ],
      "result": "fresh session link/null changes rejected; claim/dismiss share stale JWT comparison; outcome has same stale comparison proven A07"
    },
    {
      "area": "provider ingress",
      "sources": [
        "ai.service.ts:69-91",
        "ai-assist.service.ts:57-107",
        "ai-rules.ts:88-117"
      ],
      "result": "tool results/ranking/review use redaction; initial user question and authorized full CV are separate declared inputs; free-text representations still leak in actual ranking"
    },
    {
      "area": "webhook transport",
      "sources": [
        "webhooks.service.ts:147-190",
        "webhooks.ts:125-141",
        "queue.service.ts:121-142",
        "queue.worker.ts:31-43"
      ],
      "result": "DNS pinning closed; partial response abort strands shared queue worker"
    }
  ]
}
