'use strict'
// Same existing assertions. Only bring the disposable name into the mandated safe pattern.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict')
const filename=path.join(__dirname,'request-decision-race.integration.cjs')
let source=fs.readFileSync(filename,'utf8')
assert.ok(source.includes('hr_decision_race_'))
source=source.replaceAll('hr_decision_race_','hr_decision_race_test_')
source=source.replace('const secret =',"require('./codex-review-round2-harness.cjs').safeDatabase(database)\nconst secret =")
const fixture=new Module(filename,module);fixture.filename=filename;fixture.paths=module.paths;fixture._compile(source,filename)
