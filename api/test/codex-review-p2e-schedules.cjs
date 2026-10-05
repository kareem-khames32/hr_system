'use strict'
// Preserve the review's network/SQL guards and disabled background services.
// Only mount inert cron objects so the existing screen assertion can inspect
// real nextDate() values from the product's decorator options. No timer starts.
require('./codex-review-round5-harness.cjs')
const assert=require('node:assert/strict')
const {SchedulerOrchestrator}=require('../node_modules/@nestjs/schedule/dist/scheduler.orchestrator')
const {CronJob}=require('../node_modules/cron')
SchedulerOrchestrator.prototype.onApplicationBootstrap=function(){
  for(const [key,{options}] of Object.entries(this.cronJobs)){
    const job=CronJob.from({...options,onTick:()=>{throw new Error('REVIEW_INERT_CRON_MUST_NOT_FIRE')},start:false,runOnInit:false})
    assert.equal(Boolean(job.isActive),false)
    this.cronJobs[key].ref=job
    this.schedulerRegistry.addCronJob(key,job)
  }
  console.log('REVIEW_PROGRESS '+JSON.stringify({inertCronDefinitions:Object.keys(this.cronJobs).length,started:false}))
}
