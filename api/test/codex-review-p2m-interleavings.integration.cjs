'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
const {PolicyGate}=require('../src/policies/policy-gate'),rules=require('../src/policies/policy-rules')
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}}
const turn=()=>new Promise(resolve=>setImmediate(resolve))
async function rig(){
 rules.resetPolicySchemaCache()
 const scripted=[],started=[]
 const ds={manager:{query:async()=>[{ready:1}]},query:()=>{const d=scripted.shift();assert.ok(d,'Every flag read is controlled');started.push(d);return d.promise}}
 const gate=new PolicyGate(ds)
 const stage=()=>{const d=deferred();scripted.push(d);return d}
 const finish=(d,value)=>value===null?d.reject(Error('synthetic flag failure')):d.resolve(value?[{id:1}]:[])
 const read=async value=>{const d=stage(),r=gate.refresh();finish(d,value);await r}
 let checks=0,blocked=false,checkError=false
 gate.bind(async()=>{checks++;if(checkError)throw Error('synthetic account check failure');return blocked})
 const user={sub:1,employeeId:11,tokenVersion:0}
 return{gate,stage,finish,read,started,user,get checks(){return checks},set blocked(v){blocked=v},set checkError(v){checkError=v}}
}

test('P2M interleavings: later completed flag read wins for every true/false/failure pair and return order',async t=>{
 let cases=0
 for(const old of [false,true,null])for(const newer of [false,true,null])for(const order of [[0,1],[1,0]]){
  const r=await rig(),d=[r.stage(),r.stage()],a=r.gate.refresh(),b=r.gate.refresh(),promises=[a,b],values=[old,newer]
  await turn();assert.equal(r.started.length,2)
  for(const i of order){r.finish(d[i],values[i]);await promises[i]}
  assert.equal(r.gate.active(),newer!==false,JSON.stringify({old,newer,order}))
  r.blocked=true;assert.equal(await r.gate.blocks(r.user),newer!==false)
  await r.read(false);assert.equal(r.gate.active(),false);cases++
 }
 t.diagnostic(JSON.stringify({case:'flag-order-matrix',cases}))
})

test('P2M interleavings: two overlapping writes, either failure and either finish order release all write state',async t=>{
 let cases=0
 for(const fails of [[false,false],[false,true],[true,false],[true,true]])for(const order of [[0,1],[1,0]]){
  const r=await rig();await r.read(true);assert.equal(await r.gate.blocks(r.user),false);assert.equal(r.checks,1)
  const work=[deferred(),deferred()]
  const writes=work.map(d=>r.gate.write(()=>d.promise).then(value=>({value}),error=>({error:error.message})))
  assert.equal(r.gate.active(),true)
  // The previous clear result is invalidated; no new result may be cached in-flight.
  assert.equal(await r.gate.blocks(r.user),false);assert.equal(await r.gate.blocks(r.user),false);assert.equal(r.checks,3)
  await r.read(false);assert.equal(r.gate.active(),true,'A periodic false reading during writes must be discarded')
  for(let index=0;index<order.length;index++){
   const i=order[index],read=r.stage()
   if(fails[i])work[i].reject(Error('synthetic write '+i));else work[i].resolve('written '+i)
   await turn();r.finish(read,false)
   const result=await writes[i]
   assert.deepEqual(result,fails[i]?{error:'synthetic write '+i}:{value:'written '+i})
   assert.equal(r.gate.active(),index===0,'Only the final write releases the unknown state')
  }
  await r.read(true);r.blocked=true;assert.equal(await r.gate.blocks(r.user),true)
  await r.read(false);assert.equal(r.gate.active(),false);cases++
 }
 t.diagnostic(JSON.stringify({case:'overlapping-writes',cases}))
})

test('P2M interleavings: failed post-write probe preserves success and error; delayed pre-write read and check cannot seed cache',async()=>{
 const r=await rig();await r.read(true)
 const check=deferred();r.gate.bind(()=>check.promise)
 const checking=r.gate.blocks(r.user),old=r.stage(),oldReading=r.gate.refresh();await turn()
 const result=r.stage(),writing=r.gate.write(async()=>42);await turn();r.finish(result,null)
 assert.equal(await writing,42);assert.equal(r.gate.active(),true)
 r.finish(old,false);await oldReading;assert.equal(r.gate.active(),true)
 check.resolve(false);assert.equal(await checking,false)
 r.gate.bind(async()=>true);assert.equal(await r.gate.blocks(r.user),true,'Pre-write clear check cannot be cached afterwards')
 const fault=r.stage(),failing=r.gate.write(async()=>{throw Error('original write error')});const observed=assert.rejects(failing,/original write error/)
 await turn();r.finish(fault,null);await observed;assert.equal(r.gate.active(),true)
 await r.read(false);assert.equal(r.gate.active(),false)
})

test('P2M identity cache: account, employee and token version are independent cache boundaries; a declined account check is not cached',async()=>{
 const r=await rig();await r.read(true)
 assert.equal(await r.gate.blocks(r.user),false);assert.equal(await r.gate.blocks(r.user),false);assert.equal(r.checks,1)
 r.blocked=true
 for(const user of [{...r.user,employeeId:12},{...r.user,tokenVersion:1},{...r.user,sub:2}]){
  assert.equal(await r.gate.blocks(user),true);assert.equal(await r.gate.blocks(user),true)
 }
 assert.equal(r.checks,7)
 const noEmployee={...r.user,employeeId:null};r.checkError=true;assert.equal(await r.gate.blocks(noEmployee),false)
 r.gate.reset();await assert.rejects(r.gate.blocks(r.user),/account check failure/)
 r.checkError=false;assert.equal(await r.gate.blocks(r.user),true)
})
