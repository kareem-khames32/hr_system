'use strict'
// Real headless PDF renderer probe: no API listener, no database, no mail.
require('./codex-review-p3d-preload.cjs')
require('./codex-review-p3d-pdf-preload.cjs')
const fs=require('node:fs'),path=require('node:path')
;(async()=>{
 const result={transport:'CDP pipes',realRenderer:true}
 try{const {ReportPdfRenderer}=require('../src/reports/report-pdf.renderer');const renderer=new ReportPdfRenderer();const font=await renderer.font();const bytes=await renderer.pdf('<html><head><style>@font-face{font-family:r;src:url(data:font/ttf;base64,'+font+')}</style></head><body dir="rtl" style="font-family:r">تقرير تجريبي</body></html>');result.pdfHeader=Buffer.from(bytes).subarray(0,5).toString();result.ok=result.pdfHeader==='%PDF-'}
 catch(error){result.ok=false;result.errorName=error.name;result.errorMessage=String(error.message).slice(0,600);result.frames=String(error.stack).split('\n').slice(1,5)}
 fs.writeFileSync(path.join(__dirname,'codex-review-p3d-pdf-diagnostic-result.cjs'),'module.exports = '+JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));process.exitCode=result.ok?0:1
})()
