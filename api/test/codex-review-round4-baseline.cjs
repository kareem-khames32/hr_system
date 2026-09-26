'use strict'
// Serve the original product sources from Git objects in memory. No checkout or product edits.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),baseline='6b20663'
const files=execFileSync('git',['diff','--diff-filter=M','--name-only',baseline,'ce9ee15','--','api/src'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean)
const saved=new Map()
for(const file of files){assert.match(file,/^api\/src\/[a-z0-9/_.-]+\.ts$/);saved.set(path.resolve(root,file).toLowerCase(),execFileSync('git',['show',`${baseline}:${file}`],{cwd:root}))}
// The old product uses legacy one-branch claims; use the original independent fixture token.
const legacyFixture=fs.readFileSync(path.join(__dirname,'codex-review-round2-fixture.cjs'),'utf8').replace('employeeId: actor.employeeId ?? null,','scopeAllBranches: actor.scopeAllBranches === true, employeeId: actor.employeeId ?? null,')
saved.set(path.join(__dirname,'codex-review-round4-fixture.cjs').toLowerCase(),Buffer.from(legacyFixture))
const read=fs.readFileSync
fs.readFileSync=function(file,options){const value=typeof file==='string'?saved.get(path.resolve(file).toLowerCase()):null;if(!value)return read.apply(this,arguments);const encoding=typeof options==='string'?options:options?.encoding;return encoding?value.toString(encoding):Buffer.from(value)}
console.log('CR4_BASELINE '+JSON.stringify({commit:baseline,productFilesInMemory:files.length,legacyTokenFixture:true,productFilesWritten:0}))
process.nextTick(()=>{const {branchScopeOf}=require('../src/auth/guards');assert.equal(branchScopeOf({role:'employee',branchId:7}),7);console.log('CR4_BASELINE_VERIFIED legacy numeric branch scope')})
