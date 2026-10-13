'use strict'
// Recorded from completed tool sessions; integration logs are in results-*.cjs.
module.exports = {
  target: '40b42e3a01e23c3091fde2ec78071164a228f308',
  unitCheck: {
    passed: 64, failed: 0, exitCode: 0,
    files: ['codex-review-p8a-defaults.test.cjs','missing-punch-deduction.test.cjs','mailbox.test.cjs','request-holder.test.cjs','task-scope.test.cjs','task-attachments.test.cjs','module-map.test.cjs','dashboard-cards.test.cjs','meet.test.cjs','meet-calls.test.cjs','meet-audience.test.cjs','mobile-punch-audience.test.cjs','work-extension.test.cjs','compensation-cycles.test.cjs'],
  },
  typeChecks: [
    { cwd: 'api', command: 'node node_modules/typescript/bin/tsc --noEmit --incremental false', exitCode: 0 },
    { cwd: '.', command: 'node node_modules/typescript/bin/tsc --noEmit --incremental false', exitCode: 0 },
  ],
  authoritativeIndependentRun: 'codex-review-p8a-results-final.cjs',
  note: 'Earlier evidence runs retain fixture-development failures. Final run has six bug witnesses and four controls.',
}
