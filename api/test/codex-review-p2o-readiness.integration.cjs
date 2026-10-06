'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
const checks=[
 ['audit/audit','auditTableReady','resetAuditTableCache',true,true],
 ['queue/outbox','queueTablesReady','resetQueueTablesCache',false,true],
 ['notifications/notification-store','notificationTablesReady','resetNotificationTablesCache',false,true],
 ['tasks/task-rules','tasksTableReady','resetTasksTableCache',false,true],
 ['requests/execution-tasks','executionSchemaReady','resetExecutionSchemaCache'],
 ['requests/approval-delegations','delegationSchemaReady','resetDelegationSchemaCache'],
 ['policies/policy-rules','policySchemaReady','resetPolicySchemaCache'],
 ['hr-documents/document-acknowledgements','documentAckSchemaReady','resetDocumentAckSchemaCache'],
]
for(const [file,check,reset,id,warns] of checks)test('P2O readiness failures, warning once and out-of-order results: '+check,async()=>{
 const m=require('../src/'+file),Logger=require('@nestjs/common').Logger,original=Logger.prototype.warn,logs=[]
 const rows=present=>id?[{id:present?7:null}]:[{ready:present?1:0}]
 Logger.prototype.warn=function(message){logs.push(message)};m[reset]()
 try{
  const unavailable={query:async()=>{throw Error('Synthetic metadata failure')}}
  await assert.rejects(m[check](unavailable),/Synthetic metadata failure/)
  for(let i=0;i<4;i++)assert.equal(await m[check]({query:async()=>rows(false)}),false)
  assert.equal(logs.length,warns?1:0)
  await assert.rejects(m[check](unavailable),/Synthetic metadata failure/)
  let finishOld
  const old=m[check]({query:()=>new Promise(resolve=>finishOld=resolve)})
  assert.equal(await m[check]({query:async()=>rows(true)}),true)
  finishOld(rows(false));assert.equal(await old,false)
  let rereads=0
  assert.equal(await m[check]({query:async()=>{rereads++;return rows(true)}}),true)
  assert.equal(rereads,1,'A delayed missing result never persists across the next invocation')
  assert.equal(await m[check](unavailable),true,'Known schema is cached')
  assert.equal(logs.length,warns?1:0)
 }finally{m[reset]();Logger.prototype.warn=original}
})
