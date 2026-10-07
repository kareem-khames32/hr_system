'use strict'
module.exports={
 reviewed:['3a7140d','2eeb197'],head:'1221285fd6e7b041c6bcb77ae2dc5d6478aebe21',
 finalRuns:['core','controls-final','independent-final'],
 setupRuns:{independent:'Initial fixture used /org/departments and /org/teams instead of /departments and /teams. Corrected only the new review test.',controls:'Second disposable application in the same test process failed during initialization. Split RCSI into a separate test process; final two isolation tests pass.'},
 additionalObservedDatabases:['hr_codex_p3a_independent_test_d82265a2f8418c1d'],
 note:'The initial valid independent run logged CREATE and DROP for the additional database above. Its result file was replaced by the final run after relaxing redaction assertions to accept any non-identifying representation. Final verification checks the additional database explicitly as well.',
 expectedFailures:['P3A-I01','P3A-I02','P3A-I03','P3A-I04'],
 productDiffBetweenPartBAndHead:'empty for api/src, src, api/test, docs/migrations'
}
