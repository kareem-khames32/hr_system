'use strict'
require('./codex-review-p8b-local-preload.cjs')
const {ReportPdfRenderer}=require('../src/reports/report-pdf.renderer')
const original=ReportPdfRenderer.prototype.pdf
ReportPdfRenderer.prototype.pdf=async function(...args){
  try{return await original.apply(this,args)}catch(error){console.log('REVIEW_PDF_ERROR '+JSON.stringify({message:error?.message}));throw error}
}
