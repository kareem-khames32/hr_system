'use strict'
// Review transport only: real Chromium and renderer, with CDP over pipes instead
// of opening a localhost debugging socket blocked by the disposable-DB harness.
require('./codex-review-p3d-transport-preload.cjs')
const p = require('../node_modules/puppeteer')
const target = p.default || p
const launch = target.launch.bind(target)
target.launch = async options => {
  console.log('REVIEW_PROGRESS PDF launch via pipes')
  const browser=await launch({ ...options, pipe: true })
  console.log('REVIEW_PROGRESS PDF browser launched')
  const newPage=browser.newPage.bind(browser)
  browser.newPage=async()=>{const page=await newPage();for(const method of ['setJavaScriptEnabled','setRequestInterception','setContent','pdf']){const original=page[method].bind(page);page[method]=async(...args)=>{console.log('REVIEW_PROGRESS PDF '+method+' start');try{const result=await original(...args);console.log('REVIEW_PROGRESS PDF '+method+' complete');return result}catch(error){console.log('REVIEW_PROGRESS PDF '+method+' failed '+error.name);throw error}}}return page}
  return browser
}
