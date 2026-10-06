'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f
before(async()=>{f=await require('./codex-review-p2s-comments-fixture.cjs')('p2s_process_gates')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2S independent in-memory gates still serialize through the database lock on the application pool',async()=>{
 // Separate module state models independent API admission gates; connections and sp_getapplock are real SQL.
 const file=require.resolve('../src/auth/account-edit-lock'),first=require(file),cached=require.cache[file]
 delete require.cache[file];const second=require(file);require.cache[file]=cached
 assert.notEqual(first.accountEditGateState,second.accountEditGateState)
 const id=890001;let release,entered,other=false,pending,firstJob
 const held=new Promise(r=>{release=r}),ready=new Promise(r=>{entered=r})
 try{
  firstJob=first.accountEditLocked(f.ds,id,async()=>{entered();await held})
  await ready
  pending=second.accountEditLocked(f.ds,id,async()=>{other=true},100).catch(e=>e.getStatus())
  assert.equal(await pending,409);assert.equal(other,false)
  assert.deepEqual(first.accountEditGateState(),{open:1,waiting:0});assert.deepEqual(second.accountEditGateState(),{open:0,waiting:0})
  release();await firstJob
  assert.equal(await second.accountEditLocked(f.ds,id,async()=>19),19)
  assert.deepEqual(first.accountEditGateState(),{open:0,waiting:0})
 }finally{release();if(firstJob)await firstJob;if(pending)await pending}
})
