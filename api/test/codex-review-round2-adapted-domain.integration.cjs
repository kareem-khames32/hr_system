'use strict'
// Existing live login scenarios. Skip the two child-process CLI tests; all domain/mail boundaries stay fake.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict')
const filename=path.join(__dirname,'domain-login-two-factor.integration.cjs')
let source=fs.readFileSync(filename,'utf8')
const original="const { test, before, after } = require('node:test')"
assert.ok(source.includes(original))
source=source.replace(original,"const { test: originalTest, before, after } = require('node:test')\nconst test=(name,...args)=> /^K[12] /.test(name) ? originalTest.skip(name,...args) : originalTest(name,...args)")
const fixture=new Module(filename,module);fixture.filename=filename;fixture.paths=module.paths;fixture._compile(source,filename)
