'use strict'
// Keep real cron parsing/registry metadata without starting timers or application services.
require('./codex-review-round5-harness.cjs')
const {SchedulerOrchestrator}=require('../node_modules/@nestjs/schedule/dist/scheduler.orchestrator'),{CronJob}=require('../node_modules/cron')
SchedulerOrchestrator.prototype.onApplicationBootstrap=function(){
 for(const [key,{options,target}] of Object.entries(this.cronJobs)){
  const job=CronJob.from({...options,onTick:target,start:false})
  this.cronJobs[key].ref=job;this.schedulerRegistry.addCronJob(key,job)
 }
}
console.log('CRP1_SCHEDULER real schedule metadata registered; no cron timers, startup catch-up or listeners started')
