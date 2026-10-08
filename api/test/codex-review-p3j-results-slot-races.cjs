module.exports = {
  "selected": [
    "codex-review-p3j-slot-races"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 7,
      "failed": 2,
      "passed": 5,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 7,
      "suites": 0
    },
    "duration_ms": 7616.9441
  },
  "results": [
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-create: manual writer rejects a directory account that won the employee slot",
      "ms": 4442.9892,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-rebind: manual writer rejects a directory account that won the employee slot",
      "ms": 144.8089,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-archive-first: a first login waiting on an archive sees the committed closed employee",
      "ms": 151.2068,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-slot-first-archive: employee mutation waits behind account creation and updates that new account",
      "ms": 144.8658,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-slot-first-transfer: employee mutation waits behind account creation and updates that new account",
      "ms": 87.7585,
      "pass": false,
      "error": "Cannot find module '../src/common/local-date'\nRequire stack:\n- D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs",
      "cause": "Cannot find module '../src/common/local-date'\nRequire stack:\n- D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs",
      "stack": "Error: Cannot find module '../src/common/local-date'\nRequire stack:\n- D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs\n    at Module.<anonymous> (node:internal/modules/cjs/loader:1421:15)\n    at Module._resolveFilename.sharedData.moduleResolveFilenameHook.installedValue [as _resolveFilename] (D:\\projects\\hr_system\\api\\node_modules\\@cspotcode\\source-map-support\\source-map-support.js:811:30)\n    at defaultResolveImpl (node:internal/modules/cjs/loader:1059:19)\n    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1064:22)\n    at Module._load (node:internal/modules/cjs/loader:1227:37)\n    at TracingChannel.traceSync (node:diagnostics_channel:328:14)\n    at wrapModuleLoad (node:internal/modules/cjs/loader:245:24)\n    at Module.require (node:internal/modules/cjs/loader:1504:12)\n    at require (node:internal/modules/helpers:152:16)\n    at transfer (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs:15:143)"
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-transfer-first: stale directory match creates in the employee current branch",
      "ms": 110.8236,
      "pass": false,
      "error": "Cannot find module '../src/common/local-date'\nRequire stack:\n- D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs",
      "cause": "Cannot find module '../src/common/local-date'\nRequire stack:\n- D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs",
      "stack": "Error: Cannot find module '../src/common/local-date'\nRequire stack:\n- D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs\n    at Module.<anonymous> (node:internal/modules/cjs/loader:1421:15)\n    at Module._resolveFilename.sharedData.moduleResolveFilenameHook.installedValue [as _resolveFilename] (D:\\projects\\hr_system\\api\\node_modules\\@cspotcode\\source-map-support\\source-map-support.js:811:30)\n    at defaultResolveImpl (node:internal/modules/cjs/loader:1059:19)\n    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1064:22)\n    at Module._load (node:internal/modules/cjs/loader:1227:37)\n    at TracingChannel.traceSync (node:diagnostics_channel:328:14)\n    at wrapModuleLoad (node:internal/modules/cjs/loader:245:24)\n    at Module.require (node:internal/modules/cjs/loader:1504:12)\n    at require (node:internal/modules/helpers:152:16)\n    at transfer (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs:15:143)"
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-rebind-archive: linking an existing account and archiving its new employee follow one order",
      "ms": 85.6646,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-slot-first-transfer: employee mutation waits behind account creation and updates that new account",
      "ms": 87.7585,
      "pass": false,
      "error": "Cannot find module '../src/common/local-date'\nRequire stack:\n- D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs",
      "cause": "Cannot find module '../src/common/local-date'\nRequire stack:\n- D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs",
      "stack": "Error: Cannot find module '../src/common/local-date'\nRequire stack:\n- D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs\n    at Module.<anonymous> (node:internal/modules/cjs/loader:1421:15)\n    at Module._resolveFilename.sharedData.moduleResolveFilenameHook.installedValue [as _resolveFilename] (D:\\projects\\hr_system\\api\\node_modules\\@cspotcode\\source-map-support\\source-map-support.js:811:30)\n    at defaultResolveImpl (node:internal/modules/cjs/loader:1059:19)\n    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1064:22)\n    at Module._load (node:internal/modules/cjs/loader:1227:37)\n    at TracingChannel.traceSync (node:diagnostics_channel:328:14)\n    at wrapModuleLoad (node:internal/modules/cjs/loader:245:24)\n    at Module.require (node:internal/modules/cjs/loader:1504:12)\n    at require (node:internal/modules/helpers:152:16)\n    at transfer (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs:15:143)"
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-transfer-first: stale directory match creates in the employee current branch",
      "ms": 110.8236,
      "pass": false,
      "error": "Cannot find module '../src/common/local-date'\nRequire stack:\n- D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs",
      "cause": "Cannot find module '../src/common/local-date'\nRequire stack:\n- D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs",
      "stack": "Error: Cannot find module '../src/common/local-date'\nRequire stack:\n- D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs\n    at Module.<anonymous> (node:internal/modules/cjs/loader:1421:15)\n    at Module._resolveFilename.sharedData.moduleResolveFilenameHook.installedValue [as _resolveFilename] (D:\\projects\\hr_system\\api\\node_modules\\@cspotcode\\source-map-support\\source-map-support.js:811:30)\n    at defaultResolveImpl (node:internal/modules/cjs/loader:1059:19)\n    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1064:22)\n    at Module._load (node:internal/modules/cjs/loader:1227:37)\n    at TracingChannel.traceSync (node:diagnostics_channel:328:14)\n    at wrapModuleLoad (node:internal/modules/cjs/loader:245:24)\n    at Module.require (node:internal/modules/cjs/loader:1504:12)\n    at require (node:internal/modules/helpers:152:16)\n    at transfer (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs:15:143)"
    }
  ],
  "diagnostics": [
    "tests 7",
    "suites 0",
    "pass 5",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7616.9441"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_slot_races_test_bc2e5f93ede13f7b\"}\n",
    "REVIEW_MEASURE {\"case\":\"manual-after-domain\",\"kind\":\"create\",\"status\":409,\"accounts\":1}\n",
    "REVIEW_MEASURE {\"case\":\"manual-after-domain\",\"kind\":\"rebind\",\"status\":409,\"accounts\":1}\n",
    "REVIEW_MEASURE {\"case\":\"archive-before-slot\",\"sqlWait\":true,\"archive\":201,\"login\":401,\"accounts\":0}\n",
    "REVIEW_MEASURE {\"case\":\"slot-before-employee-mutation\",\"mutation\":\"archive\",\"sqlWait\":true,\"change\":201,\"login\":201,\"version\":1,\"active\":false,\"branchUpdated\":false}\n",
    "(node:30140) PromiseRejectionHandledWarning: Promise rejection was handled asynchronously (rejection id: 1)\n",
    "(Use `node --trace-warnings ...` to show where the warning was created)\n",
    "REVIEW_MEASURE {\"case\":\"rebind-before-archive\",\"sqlWait\":true,\"statuses\":[200,201],\"version\":2}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_slot_races_test_bc2e5f93ede13f7b\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_slot_races_test_bc2e5f93ede13f7b\"}\n"
  ]
}
