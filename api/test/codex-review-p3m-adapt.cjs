'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
for(const name of ['surveys','policy-pool','knowledge','case-privacy','unit-scope','rewards','penalties','preboarding']){
 let s=fs.readFileSync(path.join(__dirname,'codex-review-p3l-'+name+'.integration.cjs'),'utf8').replaceAll('p3l','p3m').replaceAll('P3L','P3M')
 function change(a,b){assert.ok(s.includes(a),name+': missing replacement '+a);s=s.replace(a,b)}
 if(['rewards','penalties','preboarding'].includes(name)){
  // Reuse the established fixture only; retain independent probes, not stale copied baseline cases.
  const first=s.indexOf('\ntest('),own=s.indexOf(name==='rewards'?'\nasync function newReviewSuggestion':name==='penalties'?'\nconst p3mLatch':"\ntest('P3M-B01")
  assert.ok(own>first);s=s.slice(0,first)+s.slice(own)
 }
 if(name==='rewards'){
  change('assert.equal(result.bonusRequestId,manual.id)','assert.notEqual(result.bonusRequestId,manual.id)')
  change('assert.equal(Number(stored.inputValue),7)','assert.equal(Number(stored.inputValue),123)')
  change("assert.equal(await repo('BonusRequest').count({where:{employeeId:e.id}}),1)\n console.log('REVIEW_MEASURE '+JSON.stringify({case:'R02',suggested:123,linkedValue:Number(stored.inputValue),linkedManual:true,requests:1}))","assert.equal(await repo('BonusRequest').count({where:{employeeId:e.id}}),2)\n console.log('REVIEW_MEASURE '+JSON.stringify({case:'R02',suggested:123,linkedValue:Number(stored.inputValue),linkedManual:false,requests:2}))")
  s=s.slice(0,s.indexOf("\ntest('P3M-R03"))
 }
 if(name==='penalties'){
  change('assert.equal(count,2);assert.equal(rows.length,1)','assert.equal(first.status,409);assert.equal(count,1);assert.equal(rows.length,1)')
  change('assert.equal(result.status,201);assert.equal(result.body.deductionRequestId,manual.id)','assert.equal(result.status,500);assert.equal(await repo(\'EmployeePenalty\').count({where:{employeeId:e.id}}),0)')
  change('assert.equal(result.body.days,1)','assert.equal(await repo(\'DeductionRequest\').count({where:{employeeId:e.id}}),1)')
  change("{case:'P04',manualHttp:201,penaltyHttp:201,penaltyDays:1,linkedFixedAmount:7,wrongFinancialType:true}","{case:'P04',manualHttp:201,penaltyHttp:500,penalties:0,manualLinked:false}")
 }
 if(name==='preboarding'){
  change("assert.equal(shown.status,200);assert.ok(JSON.stringify(shown.body).includes('PRIVATE_SUBORDINATE_TASK'))","assert.equal(shown.status,404);assert.equal(JSON.stringify(shown.body).includes('PRIVATE_SUBORDINATE_TASK'),false)")
  change("console.log('REVIEW_MEASURE '+JSON.stringify({case:'B01'",`for(const route of ['/tasks','/tasks/team','/tasks/report','/tasks/'+task.id+'/log']) assert.equal((await get(session.accessToken,route)).status,403,route)
 const own=await repo('Task').save({...task,id:undefined,title:'OWN_PREBOARDING_CONTROL',assigneeEmployeeId:E.manager.id})
 assert.equal((await get(session.accessToken,'/tasks/'+own.id)).status,200)
 const mine=await get(session.accessToken,'/tasks/mine');assert.equal(mine.status,200);assert.equal(JSON.stringify(mine.body).includes('PRIVATE_SUBORDINATE_TASK'),false)
 assert.equal((await http('POST','/tasks/'+task.id+'/status',{status:'DONE'},bearer(session.accessToken))).status,404)
 assert.equal((await http('POST','/tasks/'+own.id+'/status',{status:'DONE'},bearer(session.accessToken))).status,201)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'B01'`)
 }
 if(name==='policy-pool'){
  change('if(entered<pool.max){entered++;','if(entered<pool.max){assert.equal(args[2]?.queryRunner?.isTransactionActive,true);entered++;')
  change('assert.ok(pendingReads>0)','assert.equal(pendingReads,0)')
  change('assert.ok(replies.some(r=>r.status===500))','assert.ok(replies.every(r=>r.status===200));assert.equal(pool.numUsed(),0)')
 }
 if(name==='surveys'){
  change("assert.equal(b.hidden,true);assert.equal(r.overall[1].answered-a.answered,1)\n const inferred=r.overall[1].counts.map((v,i)=>v.count-a.counts[i].count);assert.deepEqual(inferred,[0,1])\n console.log('REVIEW_MEASURE '+JSON.stringify({case:'S02',groupBHidden:true,inferredAnswerCount:1,inferredCounts:inferred}))","assert.equal(b.hidden,true);assert.equal(a.hidden,true);assert.equal(r.overall[1].answered,6);assert.equal(a.answered,undefined);assert.equal(b.answered,undefined)\n console.log('REVIEW_MEASURE '+JSON.stringify({case:'S02',bothGroupsHidden:true,overallAnswers:6}))")
  s=s.slice(0,s.indexOf("\ntest('P3M-S03"))
 }
 fs.writeFileSync(path.join(__dirname,'codex-review-p3m-'+name+'.integration.cjs'),s)
}
