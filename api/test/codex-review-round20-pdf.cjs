'use strict'
// Review-only boundary: actual content/template/authorization/storage logic runs; Chromium PDF generation is unavailable here.
const path=require('node:path')
const {LetterRenderer}=require(path.join(__dirname,'codex-review-round20-snapshot/api/src/letters/letter-renderer.service'))
LetterRenderer.prototype.pdf=async function(snapshot){
  if(!snapshot||!snapshot.content)throw Error('Missing document snapshot')
  console.log('CR20_PDF_RENDER_STUB '+JSON.stringify({contentReceived:true}))
  return Buffer.from('%PDF-1.4\n% review-only renderer substitute; layout not verified\n%%EOF\n')
}
