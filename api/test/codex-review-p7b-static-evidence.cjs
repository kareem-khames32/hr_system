module.exports = {
  "target": "43f7b9ec",
  "typecheck": [
    {
      "command": "api/node_modules/.bin/tsc.cmd --noEmit --incremental false -p api/tsconfig.json",
      "exitCode": 0
    },
    {
      "command": "node_modules/.bin/tsc.cmd --noEmit --incremental false -p tsconfig.json",
      "exitCode": 0
    }
  ],
  "review": {
    "remaining": [
      "P7A-B01: ModulesService.subjectOf caches employee org facts for 30000ms; org team update does not invalidate subjects.",
      "P7A-B08: sendDigestsNow caches event.email across recipients, not just a single message."
    ],
    "closures": [
      "Malformed new audience writers reject without persisting broad defaults; legacy decisions identical.",
      "Group task and WhatsApp writers lock employee row and authorize under lock.",
      "Overtime audience helpers and branch existence reads bind EntityManager in update/delete; creation probes precede transaction.",
      "Overtime labels filter by current reference branch; response create/update has no added private name.",
      "Dashboard people/tree reread per request; day-only cache joined to current people; foreign assignees are combined.",
      "Request dashboard uses definition/type/loan deferral confidentiality for organization drilldown."
    ],
    "limitations": [
      "No browser",
      "No full integration suite",
      "No product mutation"
    ]
  }
}
