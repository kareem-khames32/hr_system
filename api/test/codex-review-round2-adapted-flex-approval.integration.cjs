'use strict'
// Keep all assertions of the approval/retroactive-edit test. Its one-day settlement fixture
// must remain unfinalized; a CLOSED case without its salary line is correctly rejected now.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict')
const filename=path.join(__dirname,'payroll-flex.integration.cjs')
let source=fs.readFileSync(filename,'utf8')
const declaration="const { test, before, after } = require('node:test')",old="lastWorkingDay: f.day, status: 'CLOSED', terminationReason: 'termination'"
assert.ok(source.includes(declaration));assert.equal(source.split(old).length,2)
source=source.replace(declaration,"const { test: originalTest, before, after } = require('node:test')\nconst test=(name,...args)=>name.startsWith('FX-09: approved payroll')?originalTest(name,...args):originalTest.skip(name,...args)")
source=source.replace(old,"lastWorkingDay: f.day, status: 'IN_SETTLEMENT', terminationReason: 'termination'")
const fixture=new Module(filename,module);fixture.filename=filename;fixture.paths=module.paths;fixture._compile(source,filename)
