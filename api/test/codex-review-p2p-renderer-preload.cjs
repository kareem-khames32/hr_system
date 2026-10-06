'use strict'
require('./codex-review-p2p-regression-preload.cjs')
// Review transport: deterministic PDF bytes only. The unchanged native Chromium
// renderer is outside this fixture; storage, hashing, transactions and access run normally.
require('../node_modules/ts-node').register({project:require('node:path').join(__dirname,'../tsconfig.json'),transpileOnly:true})
require('../node_modules/reflect-metadata')
require('../src/letters/letter-renderer.service').LetterRenderer.prototype.pdf=async snapshot=>{
 const content='BT /F1 12 Tf 50 750 Td (Independent document acknowledgement review) Tj ET'
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`]
 let text='%PDF-1.4\n% '+Buffer.from(JSON.stringify(snapshot)).toString('base64')+'\n',offsets=[0]
 objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${o}\nendobj\n`})
 const start=Buffer.byteLength(text);text+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`
 return Buffer.from(text)
}
console.log('REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim')
