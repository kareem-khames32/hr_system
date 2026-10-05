'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const target=path.join(__dirname,'codex-review-p2a-documents.integration.cjs');assert.equal(fs.existsSync(target),false)
let text=fs.readFileSync(path.join(__dirname,'hr-documents.integration.cjs'),'utf8')
text=text.replace("path.resolve(apiRoot, '../output/pdf/hr-general-document-sample.pdf')","path.resolve(__dirname, 'codex-review-p2a-tmp/hr-general-document-sample.pdf')")
text+='\n// Review-only renderer fixture: no native Chromium/rendering claim. Real storage, SQL, guards, and issuer are retained.\n'
text+="require('../src/letters/letter-renderer.service').LetterRenderer.prototype.pdf=async snapshot=>Buffer.from('%PDF-1.4\\n% review renderer fixture\\n'+JSON.stringify(snapshot)+'\\n%%EOF\\n')\n"
text+="test('P2A every generated archived document stores the SHA256 of its actual bytes',async()=>{const rows=await ds.query('SELECT storedName,sha256 FROM stored_files WHERE entityType=@0',['hr_document']);assert.ok(rows.length>0);for(const row of rows)assert.equal(row.sha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(uploads,row.storedName))).digest('hex'))})\n"
fs.writeFileSync(target,text)
