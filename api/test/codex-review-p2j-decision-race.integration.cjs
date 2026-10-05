'use strict'
// Adapt the disposable database name only. All production calls, race barriers,
// expected results, and cleanup remain those of the unchanged existing test.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const source=fs.readFileSync(path.join(__dirname,'request-decision-race.integration.cjs'),'utf8')
assert.equal((source.match(/hr_decision_race_/g)||[]).length,2)
module._compile(source.replaceAll('hr_decision_race_','hr_codex_p2j_decision_race_test_'),__filename)
