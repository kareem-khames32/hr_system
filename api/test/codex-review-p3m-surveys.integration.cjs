'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-p3m-helpers.cjs')
let f,hr,users=[],da,db
const latch=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const bounded=p=>Promise.race([p,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Survey barrier missed')),10000);timer.unref()})])
before(async()=>{f=await setup('surveys');await f.enable('surveys');hr=await f.account(['surveys.manage']);da=await f.repo('Department').save({code:'DA',name:'Group A',branchId:f.a.id});db=await f.repo('Department').save({code:'DB',name:'Group B',branchId:f.a.id});for(let i=0;i<10;i++)users.push(await f.account([],{employeeId:(await f.emp({departmentId:i<5?da.id:db.id})).id}))},{timeout:120000})
after(async()=>{if(f)await f.close()})
async function make(questions){const s=await f.ok('POST','/surveys',{title:'Independent anonymous survey',kind:'PULSE',audience:{mode:'all',where:{mode:'branches',ids:[f.a.id]}},minGroup:5,questions},hr);await f.ok('POST',`/surveys/${s.id}/open`,{},hr);return s}
const choice={label:'Required choice',type:'choice',options:['A','B']}
test('P3M-S01 control: open results blocked, sparse question hidden, closed survey cannot reopen',async()=>{
 const s=await make([choice,{label:'Optional rating',type:'rating',required:false}])
 for(let i=0;i<5;i++)await f.ok('POST',`/surveys/${s.id}/respond`,{answers:{q1:'A',...(i===0?{q2:2}:{})}},users[i])
 assert.equal((await f.request('GET',`/surveys/${s.id}/results`,null,hr)).status,400)
 await f.ok('POST',`/surveys/${s.id}/close`,{},hr)
 const r=await f.ok('GET',`/surveys/${s.id}/results`,null,hr)
 assert.equal(r.overall[1].hidden,true);assert.equal(r.overall[1].answered,undefined);assert.equal(r.overall[1].average,undefined)
 assert.equal((await f.request('POST',`/surveys/${s.id}/open`,{},hr)).status,400)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'S01',openResults:400,sparseHidden:true,reopen:400}))
})
test('P3M-S02: optional question receives complementary suppression',async()=>{
 const s=await make([choice,{...choice,label:'Optional choice',required:false}])
 for(let i=0;i<10;i++)await f.ok('POST',`/surveys/${s.id}/respond`,{answers:{q1:'A',...(i<5?{q2:'A'}:i===5?{q2:'B'}:{})}},users[i])
 await f.ok('POST',`/surveys/${s.id}/close`,{},hr)
 const r=await f.ok('GET',`/surveys/${s.id}/results`,null,hr),a=r.groups.find(g=>g.name==='Group A').summary[1],b=r.groups.find(g=>g.name==='Group B').summary[1]
 assert.equal(b.hidden,true);assert.equal(a.hidden,true);assert.equal(r.overall[1].answered,6);assert.equal(a.answered,undefined);assert.equal(b.answered,undefined)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'S02',bothGroupsHidden:true,overallAnswers:6}))
})

test('P3M-S03: close waits for the response, times out cleanly, then publishes immutable results',async()=>{
 const s=await make([choice]);for(let i=0;i<5;i++)await f.ok('POST',`/surveys/${s.id}/respond`,{answers:{q1:'A'}},users[i])
 const {Repository,EntityManager}=require('../node_modules/typeorm'),insert=Repository.prototype.insert,query=EntityManager.prototype.query,entered=latch(),release=latch(),timeouts=[];let pending,closing
 Repository.prototype.insert=async function(input){if(this.metadata.name==='SurveyResponse'&&input.surveyId===s.id){entered.resolve();await release.promise}return insert.call(this,input)}
 EntityManager.prototype.query=async function(sql,...args){
  if(!sql.startsWith('SET LOCK_TIMEOUT 5000; SELECT [id] FROM [surveys]'))return query.call(this,sql,...args)
  const before=(await query.call(this,'SELECT @@LOCK_TIMEOUT AS timeout, @@SPID AS spid'))[0];let failed=false
  try{return await query.call(this,sql,...args)}catch(e){failed=true;throw e}finally{const after=(await query.call(this,'SELECT @@LOCK_TIMEOUT AS timeout, @@SPID AS spid'))[0];timeouts.push({before,after,failed})}
 }
 try{
  pending=f.request('POST',`/surveys/${s.id}/respond`,{answers:{q1:'B'}},users[5]);await bounded(Promise.race([entered.promise,pending.then(()=>{throw Error('Missed response insert barrier')})]))
  const started=Date.now(),busy=await f.request('POST',`/surveys/${s.id}/close`,{},hr),elapsed=Date.now()-started
  assert.equal(busy.status,409,JSON.stringify(busy.body));assert.ok(elapsed>=4500&&elapsed<10000)
  assert.equal((await f.request('GET',`/surveys/${s.id}/results`,null,hr)).status,400)
  let done=false;closing=f.request('POST',`/surveys/${s.id}/close`,{},hr).then(r=>{done=true;return r})
  await new Promise(r=>setTimeout(r,250));assert.equal(done,false)
  release.resolve();assert.equal((await pending).status,200);assert.equal((await closing).status,200)
  const one=await f.ok('GET',`/surveys/${s.id}/results`,null,hr),two=await f.ok('GET',`/surveys/${s.id}/results`,null,hr)
  assert.equal(one.total,6);assert.deepEqual(one,two)
  assert.equal((await f.request('POST',`/surveys/${s.id}/respond`,{answers:{q1:'B'}},users[6])).status,400)
  assert.equal(timeouts.length,2);for(const sample of timeouts){assert.equal(sample.before.spid,sample.after.spid);assert.equal(sample.after.timeout,sample.before.timeout)}
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'S03',timeoutStatus:busy.status,elapsedMs:elapsed,waited:true,closedCount:one.total,stable:true,connectionTimeouts:timeouts}))
 }finally{release.resolve();await Promise.allSettled([pending,closing].filter(Boolean));Repository.prototype.insert=insert;EntityManager.prototype.query=query}
})

test('P3M-S04: insertion failure rolls back the invitation mark and permits a single retry',async()=>{
 const s=await make([choice]),{Repository}=require('../node_modules/typeorm'),insert=Repository.prototype.insert
 Repository.prototype.insert=async function(input){if(this.metadata.name==='SurveyResponse'&&input.surveyId===s.id)throw Error('Synthetic response insert failure');return insert.call(this,input)}
 try{assert.equal((await f.request('POST',`/surveys/${s.id}/respond`,{answers:{q1:'A'}},users[0])).status,500)}finally{Repository.prototype.insert=insert}
 const mark=await f.repo('SurveyInvitation').findOneByOrFail({surveyId:s.id,employeeId:users[0].employeeId});assert.equal(mark.respondedOn,null)
 assert.equal(await f.repo('SurveyResponse').count({where:{surveyId:s.id}}),0)
 await f.ok('POST',`/surveys/${s.id}/respond`,{answers:{q1:'A'}},users[0]);assert.equal(await f.repo('SurveyResponse').count({where:{surveyId:s.id}}),1)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'S04',rollback:true,retryRows:1}))
})
