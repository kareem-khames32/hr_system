'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-p3l-helpers.cjs')
let f,hr,users=[],da,db
const latch=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const bounded=p=>Promise.race([p,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Survey barrier missed')),10000);timer.unref()})])
before(async()=>{f=await setup('surveys');await f.enable('surveys');hr=await f.account(['surveys.manage']);da=await f.repo('Department').save({code:'DA',name:'Group A',branchId:f.a.id});db=await f.repo('Department').save({code:'DB',name:'Group B',branchId:f.a.id});for(let i=0;i<10;i++)users.push(await f.account([],{employeeId:(await f.emp({departmentId:i<5?da.id:db.id})).id}))},{timeout:120000})
after(async()=>{if(f)await f.close()})
async function make(questions){const s=await f.ok('POST','/surveys',{title:'Independent anonymous survey',kind:'PULSE',audience:{mode:'all',where:{mode:'branches',ids:[f.a.id]}},minGroup:5,questions},hr);await f.ok('POST',`/surveys/${s.id}/open`,{},hr);return s}
const choice={label:'Required choice',type:'choice',options:['A','B']}
test('P3L-S01 control: open results blocked, sparse question hidden, closed survey cannot reopen',async()=>{
 const s=await make([choice,{label:'Optional rating',type:'rating',required:false}])
 for(let i=0;i<5;i++)await f.ok('POST',`/surveys/${s.id}/respond`,{answers:{q1:'A',...(i===0?{q2:2}:{})}},users[i])
 assert.equal((await f.request('GET',`/surveys/${s.id}/results`,null,hr)).status,400)
 await f.ok('POST',`/surveys/${s.id}/close`,{},hr)
 const r=await f.ok('GET',`/surveys/${s.id}/results`,null,hr)
 assert.equal(r.overall[1].hidden,true);assert.equal(r.overall[1].answered,undefined);assert.equal(r.overall[1].average,undefined)
 assert.equal((await f.request('POST',`/surveys/${s.id}/open`,{},hr)).status,400)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'S01',openResults:400,sparseHidden:true,reopen:400}))
})
test('P3L-S02: optional question leaks hidden group by complementary subtraction',async()=>{
 const s=await make([choice,{...choice,label:'Optional choice',required:false}])
 for(let i=0;i<10;i++)await f.ok('POST',`/surveys/${s.id}/respond`,{answers:{q1:'A',...(i<5?{q2:'A'}:i===5?{q2:'B'}:{})}},users[i])
 await f.ok('POST',`/surveys/${s.id}/close`,{},hr)
 const r=await f.ok('GET',`/surveys/${s.id}/results`,null,hr),a=r.groups.find(g=>g.name==='Group A').summary[1],b=r.groups.find(g=>g.name==='Group B').summary[1]
 assert.equal(b.hidden,true);assert.equal(r.overall[1].answered-a.answered,1)
 const inferred=r.overall[1].counts.map((v,i)=>v.count-a.counts[i].count);assert.deepEqual(inferred,[0,1])
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'S02',groupBHidden:true,inferredAnswerCount:1,inferredCounts:inferred}))
})
test('P3L-S03: response inserted after close changes already published anonymous result',async()=>{
 const s=await make([choice]);for(let i=0;i<5;i++)await f.ok('POST',`/surveys/${s.id}/respond`,{answers:{q1:'A'}},users[i])
 const {Repository}=require('../node_modules/typeorm'),original=Repository.prototype.insert,entered=latch(),release=latch();let pending
 Repository.prototype.insert=async function(input){if(this.metadata.name==='SurveyResponse'&&input.surveyId===s.id){entered.resolve();await release.promise}return original.call(this,input)}
 try{
  pending=f.request('POST',`/surveys/${s.id}/respond`,{answers:{q1:'B'}},users[5]);await bounded(Promise.race([entered.promise,pending.then(()=>{throw Error('Response finished before insert barrier')})]))
  await f.ok('POST',`/surveys/${s.id}/close`,{},hr)
  const before=await f.ok('GET',`/surveys/${s.id}/results`,null,hr)
  release.resolve();assert.equal((await pending).status,200)
  const after=await f.ok('GET',`/surveys/${s.id}/results`,null,hr),delta=after.overall[0].counts.map((v,i)=>v.count-before.overall[0].counts[i].count)
  assert.equal(before.survey.status,'CLOSED');assert.equal(after.survey.status,'CLOSED');assert.deepEqual(delta,[0,1])
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'S03',beforeStatus:before.survey.status,afterStatus:after.survey.status,before:before.total,after:after.total,delta}))
 }finally{release.resolve();if(pending)await pending;Repository.prototype.insert=original}
})
