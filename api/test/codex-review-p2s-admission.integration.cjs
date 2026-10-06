'use strict'
require('../node_modules/ts-node/register/transpile-only')
const {test}=require('node:test'),assert=require('node:assert/strict')
const {accountEditLocked:lock,accountEditGateState:state,accountEditLockLimit:limit}=require('../src/auth/account-edit-lock')
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve()}
function fake(query=async()=>[{result:0}],after=async()=>{}){return{driver:{master:{pool:{max:2}}},transaction:async work=>{const result=await work({query});await after();return result}}}
test('P2S gate FIFO cannot be stolen on handoff; expired head/middle/tail do not leak places',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:10000})
 const ds=fake(),order=[];let release
 const first=lock(ds,1,()=>new Promise(r=>{release=r}));await flush()
 const expA=lock(ds,2,async()=>order.push('expired-A'),20).catch(e=>e.getStatus())
 const second=lock(ds,3,async()=>{order.push('second');throw Error('handler failure')},100).catch(e=>e.message)
 const expB=lock(ds,4,async()=>order.push('expired-B'),20).catch(e=>e.getStatus())
 const third=lock(ds,5,async()=>order.push('third'),100)
 const expC=lock(ds,6,async()=>order.push('expired-C'),20).catch(e=>e.getStatus())
 assert.deepEqual(state(),{open:1,waiting:5})
 t.mock.timers.tick(20);await flush();assert.deepEqual(await Promise.all([expA,expB,expC]),[409,409,409]);assert.deepEqual(state(),{open:1,waiting:2})
 release();const newcomer=lock(ds,7,async()=>order.push('newcomer'),100)
 await Promise.all([first,second,third,newcomer]);assert.deepEqual(order,['second','third','newcomer']);assert.deepEqual(state(),{open:0,waiting:0})
})
test('P2S simultaneous expiration and release resolve each waiter exactly once',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:10000})
 for(const expireFirst of [true,false]){
  let release;const ds=fake(),a=lock(ds,1,()=>new Promise(r=>{release=r}));await flush()
  let entered=0;const b=lock(ds,2,async()=>++entered,50).catch(e=>e.getStatus())
  if(expireFirst){t.mock.timers.tick(50);release()}else{release();await flush();t.mock.timers.tick(50)}
  await a;assert.equal(await b,expireFirst?409:1);assert.equal(entered,expireFirst?0:1);assert.deepEqual(state(),{open:0,waiting:0})
 }
})
test('P2S database rejection, thrown query and commit failure release admission; queue time is deducted',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:10000})
 const asked=[],ds=fake(async sql=>{asked.push(Number(/@LockTimeout = (\d+)/.exec(sql)[1]));return[{result:0}]})
 let release;const a=lock(ds,1,()=>new Promise(r=>{release=r}));await flush()
 const b=lock(ds,2,async()=>11,5000);t.mock.timers.tick(700);release();await a;assert.equal(await b,11);assert.deepEqual(asked,[15000,4300])
 for(const bad of [fake(async()=>[{result:-1}]),fake(async()=>{throw Error('query failed')}),fake(undefined,async()=>{throw Error('commit failed')})]){
  await assert.rejects(lock(bad,10,async()=>1));assert.deepEqual(state(),{open:0,waiting:0});assert.equal(await lock(ds,11,async()=>2),2)
 }
})
test('P2S limits for unknown and single connection pools preserve the documented local-only fallback',async()=>{
 assert.deepEqual([undefined,NaN,0,1,2,3,7,10].map(max=>limit({driver:{master:{pool:{max}}}})),[1,1,1,0,1,1,3,5])
 const ds={driver:{master:{pool:{max:1}}},transaction:()=>{throw Error('cannot reserve sole connection')}},order=[];let release
 const first=lock(ds,1,()=>new Promise(r=>{order.push('first');release=r}));await flush()
 const second=lock(ds,1,async()=>order.push('second'));assert.deepEqual(order,['first']);release();await Promise.all([first,second]);assert.deepEqual(order,['first','second']);assert.deepEqual(state(),{open:0,waiting:0})
})
