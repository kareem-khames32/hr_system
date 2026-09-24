'use strict'
// The original fixture closed a settlement without its final salary line. The current guard correctly rejects it.
// Keep the same one-day employment and concurrency assertions with a not-yet-final settlement instead.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict')
const filename=path.join(__dirname,'attendance-payroll-race.integration.cjs')
let source=fs.readFileSync(filename,'utf8')
const old="lastWorkingDay: date, status: 'CLOSED', terminationReason: 'termination'"
assert.equal(source.split(old).length,2)
source=source.replace(old,"lastWorkingDay: date, status: 'IN_SETTLEMENT', terminationReason: 'termination'")
const fixture=new Module(filename,module);fixture.filename=filename;fixture.paths=module.paths;fixture._compile(source,filename)
