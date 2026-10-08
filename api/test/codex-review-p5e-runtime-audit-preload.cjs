'use strict'
require('./codex-review-p5e-lfsql-preload.cjs')
const {AsyncLocalStorage}=require('node:async_hooks'),{NestFactory}=require('../node_modules/@nestjs/core'),{DataSource}=require('../node_modules/typeorm')
const scope=new AsyncLocalStorage(),create=NestFactory.create.bind(NestFactory),stats={transactions:0,probes:0,unexpected:[]}
NestFactory.create=async(...args)=>{
 const app=await create(...args),ds=app.get(DataSource),transaction=ds.transaction,obtain=ds.driver.master._acquire
 const requests=app.get(require('../src/requests/requests.service').RequestsService)
 for(const name of ['submit','resubmit','act','executeDestination','retryExecution','runEscalations']){if(typeof requests[name]!=='function')continue;const fn=requests[name];requests[name]=function(...args){return scope.run({root:name},()=>fn.apply(this,args))}}
 ds.transaction=function(...args){const callback=args.pop();return transaction.apply(this,[...args,em=>scope.run({...scope.getStore(),em},()=>{if(scope.getStore()?.root)stats.transactions++;return callback(em)})])}
 ds.driver.master._acquire=function(...args){const context=scope.getStore();if(context?.root&&context.em?.queryRunner?.isTransactionActive){const issue={message:'POOL_CONNECTION_INSIDE_TRANSACTION',stack:new Error().stack.split('\n').slice(1,12)};if(context.probe)stats.probes++;else{stats.unexpected.push(issue);console.log('REVIEW_MEASURE '+JSON.stringify(issue))}return Promise.reject(Error(issue.message))}return obtain.apply(this,args)}
 return app
}
global.__p5eAuditProbe=work=>scope.run({root:'probe',probe:true},work)
process.on('exit',()=>{console.log('REVIEW_MEASURE '+JSON.stringify({connectionAudit:stats}));if(stats.unexpected.length)process.exitCode=1})
