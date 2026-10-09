'use strict'
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),ts=require('../node_modules/typescript'),files=['benefits-insurance','payroll-financial-exemptions','fulltest-leaves-payroll','fulltest-reports']
function assertions(text,file){const tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),calls=[];const visit=n=>{if(ts.isCallExpression(n)&&(/^(assert\.|expect$|expectStatus$|test$)/.test(n.expression.getText(tree)))){if(n.expression.getText(tree)!=='test')calls.push(n.getText(tree).replace(/\s+/g,' '))}ts.forEachChild(n,visit)};visit(tree);return calls}
async function main(){
 const unchanged=files.map(name=>{const file='api/test/'+name+'.integration.cjs',before=cp.execFileSync('git',['show','b7ef9826:'+file],{cwd:root,encoding:'utf8'}),after=fs.readFileSync(path.join(root,file),'utf8');const old=assertions(before,file),now=assertions(after,file);assert.deepEqual(now,old);return {file,assertionsUnchanged:old.length}})
 require('../node_modules/ts-node').register({project:path.join(root,'api/tsconfig.json'),transpileOnly:true});require('../node_modules/reflect-metadata')
 const {pin}=require('./fixtures/pinned-clock.cjs'),{describeOvertimeSubmission}=require('../src/requests/overtime-day-claims'),{policyState}=require('../src/benefits/insurance')
 const Real=Date,evidence={employeeId:1,workDate:'2026-09-08',policy:{backdateDays:30,maxClosedPeriods:1}},em={getRepository:()=>({find:async()=>[]}),query:async()=>[]},overtime=[]
 for(const [now,expected] of [['2026-10-06T10:00:00',[]],['2026-10-09T10:00:00',['OVERTIME_BACKDATE_LIMIT']]]){const clock=pin(now);try{const issues=(await describeOvertimeSubmission(em,evidence)).map(x=>x.code);assert.deepEqual(issues,expected);overtime.push({now,issues})}finally{clock.restore()}}
 const previousTz=process.env.TZ;process.env.TZ='Africa/Cairo';let insurance
 const clock=pin('2026-10-09T02:15:00');try{
  const current=new Date(),local=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const next=new Date();next.setDate(next.getDate()+20);const oldEnd=new Date(Date.now()+20*86400000).toISOString().slice(0,10),newEnd=local(next),today=local(current);
  const oldDays=policyState({startDate:'2026-01-01',endDate:oldEnd,isActive:true},today).daysLeft,newDays=policyState({startDate:'2026-01-01',endDate:newEnd,isActive:true},today).daysLeft;
  assert.equal(oldDays,19);assert.equal(newDays,20);insurance={localTime:'02:15 Africa/Cairo',oldDays,newDays};
  const explicit=new Date('2026-09-08T12:00:00Z');assert.equal(explicit.toISOString(),'2026-09-08T12:00:00.000Z');assert.ok(new Real() instanceof Date);const start=Date.now();await new Promise(r=>setTimeout(r,20));assert.ok(Date.now()>start)
 }finally{clock.restore();if(previousTz===undefined)delete process.env.TZ;else process.env.TZ=previousTz}
 const workdays=[];for(let month=0;month<12;month++){const days=Array.from({length:new Date(2026,month+1,0).getDate()},(_,i)=>i+1).filter(n=>![5,6].includes(new Date(2026,month,n).getDay()));assert.ok(days.length>=12);for(const n of [3,4,5,6,8,9,10,12])assert.equal([5,6].includes(new Date(2026,month,days[n-1]).getDay()),false);workdays.push({month:month+1,eighth:days[7],ninth:days[8]})}
 const result={unchanged,overtime,insurance,workdayDates:workdays,pinnedClock:'Explicit Date constructors preserved; native driver dates still pass instanceof; clock advances; process restoration verified.'};assert.equal(Date,Real)
 fs.writeFileSync(path.join(__dirname,'codex-review-p6e-date-audit-result.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
}
main().catch(e=>{console.error(e);process.exitCode=1})
