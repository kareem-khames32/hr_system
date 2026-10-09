'use strict'

// Index only. The individual result files retain diagnostics and test names.
module.exports = {
  target: 'c197b89227aa393361a199b0ef4285697d326495',
  baseline: '103a5ed6',
  scope: 'CRP6B: proposal claim identity, provider text redaction, pinned webhook completion',
  oldBlockers: {
    'P6A-B05': {
      verdict: 'closed for account employee rebinding',
      tests: ['P6C-A01', 'P6C-A04', 'P6C-A06', 'P6C-A07', 'P6C-A10', 'P6C-A11', 'P6C-A15'],
      evidence: 'Rebinding and unlinking committed before claim reject; SQL action-row wait also rejects. Outcome rejects rebinding. A null employee identity cannot inherit the previous proposal after linking. After-claim rebinding retains the accepted execution boundary.'
    },
    'P6A-B06': {
      verdict: 'open',
      exposureTests: ['P6C-A08', 'P6C-A12'],
      closedExamples: ['P6C-A02', 'P6C-A05'],
      evidence: 'Actual ranking provider receives amount-shaped contact in Candidate.notes and a phone grouped with four spaces. Actual review-draft provider receives a telephone in goal.unit created through POST /performance/goals. Field-shape and bare-key exemptions are not provenance checks.'
    },
    'P6B-B01': {
      verdict: 'closed',
      tests: ['P6C-W02', 'P6C-W03', 'P6C-W04', 'P6C-W05'],
      evidence: 'Interrupted response no longer hangs QueueWorker; the next unrelated task runs. Local HTTPS preserves Host/SNI, rejects a wrong certificate and does not follow redirects. Header-only responses resolve; silent, partial-header and stalled TLS peers hit the total deadline.'
    }
  },
  newBlocker: {
    id: 'P6C-B01',
    severity: 'operational blocker',
    exposureTests: ['P6C-A09', 'P6C-A13', 'P6C-A14'],
    evidence: 'Real PATCH /users disables the actor or revokes the HR role before claim. Claim still succeeds using the old request identity. A13 and A14 each create an APPROVED bonus; A14 observes session tokenVersion 2 and current tokenVersion 3. The current users subquery checks employeeId only.',
    boundary: 'The accepted claim boundary requires the account to exist, remain active and have the current authorization version at claim, rather than merely retaining its employee link.',
    affected: ['B6.7', 'B6.8'],
    sameClassToCheck: 'AiAssistService.outcome contains the same employee-only current-account predicate.'
  },
  semantics: {
    testsWhoseSuccessProvesABug: ['P6C-A08', 'P6C-A09', 'P6C-A12', 'P6C-A13', 'P6C-A14'],
    remainingTests: 'Regression controls or assertions that the original defect is closed.',
    sourceEdits: 'Only new codex-review-p6c-* evidence files; no product or existing test edits.',
    authorizationRaces: 'Deterministic barriers pause the real in-process HTTP request after its guards and before claim; the intervening account changes use the actual HTTP controller and commit before release.'
  },
  finalRuns: [
    { result: 'codex-review-p6c-results-regression.cjs', tests: 37, description: 'Eight original affected integration files, unchanged.' },
    { result: 'codex-review-p6c-results-identity-final.cjs', tests: 14, description: 'Final action-assistant evidence file.' },
    { result: 'codex-review-p6c-results-extended.cjs', useFiles: ['codex-review-p6c-ai-assist.integration.cjs'], tests: 10, description: 'Final assist evidence; the action-assistant portion of this run was superseded by identity-final.' },
    { result: 'codex-review-p6c-results-closures.cjs', useFiles: ['codex-review-p6c-ai-read.integration.cjs', 'codex-review-p6c-webhooks.integration.cjs'], tests: 13 },
    { result: 'codex-review-p6c-unit-results.cjs', tests: 100, description: 'Fifteen selected unit files.' },
    { results: ['codex-review-p6c-pinned-transport-result.cjs', 'codex-review-p6c-transport-abort-result.cjs', 'codex-review-p6c-transport-boundaries-result.cjs'], tests: 3 },
    { result: 'codex-review-p6c-static-checks.cjs', description: 'API and frontend tsc --noEmit --incremental false, exit 0.' }
  ],
  commands: [
    "$env:REVIEW_PRELOAD='codex-review-p6c-local-preload.cjs'",
    "$env:REVIEW_RESULT_SUFFIX='reproduce'",
    'node api/test/codex-review-p6c-suite.cjs codex-review-p6c-ai codex-review-p6c-ai-assist codex-review-p6c-ai-read codex-review-p6c-webhooks',
    'node --test api/test/codex-review-p6c-pinned-transport.test.cjs api/test/codex-review-p6c-transport-abort.test.cjs api/test/codex-review-p6c-transport-boundaries.test.cjs',
    'node api/test/codex-review-p6c-units.cjs',
    'node api/test/codex-review-p6c-static.cjs'
  ],
  safety: [
    'Mail send/isConfigured replaced on the actual service instance before app.init.',
    'AI_PROVIDER and AI_API_KEY cleared; providers are fake.',
    'No API listener: the harness dispatches through actual Nest guards/controllers in process.',
    'HTTP/TLS receiver sockets bind ephemeral 127.0.0.1 ports; outside DNS/HTTP is denied.',
    'Owned disposable databases only; final-verification checks absence in sys.databases.',
    'No service lifecycle commands and no owner ports 3000/4000.'
  ],
  limitations: ['No whole-project integration rerun.', 'No real provider, external network or browser review.']
}
