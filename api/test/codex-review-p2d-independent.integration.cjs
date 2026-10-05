'use strict'
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const ft = require('../src/files/file-type')
const c = require('./fixtures/office-containers.cjs')

// Independent regular-stream container builder. Data sectors can be physically
// permuted; the sole authority for the main stream is its FAT chain.
function regularOle(size, sectorSize = 512, permute = false) {
  assert.ok(size >= 4096)
  const count = Math.ceil(size / sectorSize)
  const b = Buffer.alloc((count + 3) * sectorSize)
  Buffer.from('d0cf11e0a1b11ae1', 'hex').copy(b)
  b.writeUInt16LE(0x3e, 24); b.writeUInt16LE(sectorSize === 512 ? 3 : 4, 26)
  b.writeUInt16LE(0xfffe, 28); b.writeUInt16LE(Math.log2(sectorSize), 30); b.writeUInt16LE(6, 32)
  b.writeUInt32LE(sectorSize === 4096 ? 1 : 0, 40)
  b.writeUInt32LE(1, 44); b.writeUInt32LE(1, 48); b.writeUInt32LE(4096, 56)
  b.writeUInt32LE(c.OLE_END, 60); b.writeUInt32LE(c.OLE_END, 68)
  for (let i = 0; i < 109; i++) b.writeUInt32LE(i ? c.OLE_NONE : 0, 76 + 4 * i)
  b.fill(0xff, sectorSize, 2 * sectorSize)
  b.writeUInt32LE(0xfffffffd, sectorSize); b.writeUInt32LE(c.OLE_END, sectorSize + 4)
  const ids = Array.from({ length: count }, (_, i) => i + 2)
  if (permute) ids.reverse()
  for (let i = 0; i < ids.length; i++) {
    b.writeUInt32LE(ids[i + 1] ?? c.OLE_END, sectorSize + 4 * ids[i])
    b.fill(0x20, (ids[i] + 1) * sectorSize, (ids[i] + 2) * sectorSize)
  }
  function entry(n, name, kind, start, length, child = c.OLE_NONE) {
    const at = 2 * sectorSize + 128 * n, bytes = Buffer.from(name + '\0', 'utf16le')
    bytes.copy(b, at); b.writeUInt16LE(bytes.length, at + 64); b[at + 66] = kind; b[at + 67] = 1
    b.writeUInt32LE(c.OLE_NONE, at + 68); b.writeUInt32LE(c.OLE_NONE, at + 72)
    b.writeUInt32LE(child, at + 76); b.writeUInt32LE(start, at + 116); b.writeUInt32LE(length, at + 120)
  }
  entry(0, 'Root Entry', 5, c.OLE_END, 0, 1)
  entry(1, 'WordDocument', 2, ids[0], size)
  b.writeUInt16LE(0xa5ec, (ids[0] + 1) * sectorSize)
  return { b, ids, sectorSize }
}

test('P2D independent regular OLE chains: 512/4096 sectors, physical permutation, exact last byte', t => {
  let accepted = 0, rejected = 0
  for (const sectorSize of [512, 4096]) for (const size of [4096, 4097, 8191, 8193]) {
    for (const permute of [false, true]) {
      const { b, ids } = regularOle(size, sectorSize, permute)
      assert.equal(ft.detectFileType(b), 'doc', `valid ${sectorSize}/${size}/${permute}`); accepted++
      const loop = Buffer.from(b)
      loop.writeUInt32LE(ids[0], sectorSize + 4 * ids[0])
      // A one-sector stream has all its bytes; its unused tail is deliberately outside the contract.
      if (ids.length > 1) { assert.equal(ft.detectFileType(loop), null); rejected++ }
      const outside = Buffer.from(b)
      outside.writeUInt32LE(0x100000, sectorSize + 4 * ids[0])
      if (ids.length > 1) { assert.equal(ft.detectFileType(outside), null); rejected++ }
    }
    const { b } = regularOle(size, sectorSize)
    const exactEnd = 3 * sectorSize + size
    assert.equal(ft.detectFileType(b.subarray(0, exactEnd)), 'doc', 'Only unused padding removed'); accepted++
    assert.equal(ft.detectFileType(b.subarray(0, exactEnd - 1)), null, 'One required main-stream byte missing'); rejected++
  }
  t.diagnostic(JSON.stringify({ case: 'independent-regular-chain-matrix', accepted, rejected }))
})

test('P2D mini streams: chained data crosses root sectors, later link loss is refused', t => {
  const results = []
  for (const size of [2, 63, 64, 65, 511, 512, 513, 1025, 4095]) {
    const b = c.ole([{ name: 'WordDocument', size }])
    assert.equal(ft.detectFileType(b), 'doc', `mini size ${size}`)
    if (size > 64) {
      const miniFat = (b.readUInt32LE(60) + 1) * 512
      const earlyEnd = Buffer.from(b); earlyEnd.writeUInt32LE(c.OLE_END, miniFat)
      assert.equal(ft.detectFileType(earlyEnd), null, `mini chain cut at ${size}`)
      const laterLoop = Buffer.from(b), last = Math.ceil(size / 64) - 1
      laterLoop.writeUInt32LE(last - 1, miniFat + 4 * (last - 1))
      assert.equal(ft.detectFileType(laterLoop), null, `mini later self-loop ${size}`)
    }
    results.push(size)
  }
  t.diagnostic(JSON.stringify({ case: 'mini-stream-boundaries', acceptedSizes: results }))
})

test('P2D declared classification limit: root signature required; remaining body is not a document validator', () => {
  for (const [name, head, expected] of [['WordDocument', [0xdc, 0xa5], 'doc'], ['Book', [9, 8], 'xls'], ['Workbook', [9, 8], 'xls']]) {
    assert.equal(ft.detectFileType(c.ole([{ name, head, size: 2 }])), expected)
    assert.equal(ft.detectFileType(c.ole([{ name, head: [1, 2], size: 2 }])), null)
  }
  assert.equal(ft.detectFileType(c.ole([{ name: 'Workbook', head: [1, 2] }, 'Book'])), null, 'Book may not rescue an invalid preferred Workbook')
  assert.equal(ft.detectFileType(c.ole(['Workbook', { name: 'Book', head: [1, 2] }])), 'xls')
  assert.equal(ft.detectFileType(c.ole(['WordDocument', { name: 'worddocument', kind: 'storage' }])), null)
  // A correct type prefix followed by a broken body is explicitly accepted by the owner.
  assert.equal(ft.detectFileType(c.wordPackage({ body: `<w:document xmlns:w="${c.WORD_NS}">BROKEN BODY` })), 'docx')
  assert.equal(ft.detectFileType(c.wordPackage({ body: `<w:body xmlns:w="${c.WORD_NS}"/>` })), null)
})

test('P2D XML metadata: namespace aliases and character references cannot hide duplicate definitions', () => {
  const good = c.contentTypes(['word/document.xml', c.WORD_MAIN])
  const alias = good.replace('<Types ', '<p:Types xmlns:p="http://schemas.openxmlformats.org/package/2006/content-types" ')
    .replace('</Types>', '</p:Types>').replace('<Override ', '<p:Override ')
  assert.equal(ft.detectFileType(c.wordPackage({ types: alias })), 'docx')
  const duplicate = alias.replace('</p:Types>', `<p:Override PartName="/word/document&#x2e;xml" ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/></p:Types>`)
  assert.equal(ft.detectFileType(c.wordPackage({ types: duplicate })), null)
  for (const xml of [alias.replace('</p:Types>', '</Types>'), alias + 'x', alias.replace('<p:Override ', '<undeclared:Override '), alias.replace('</p:Types>', '<!-- -- x --></p:Types>')]) {
    assert.equal(ft.detectFileType(c.wordPackage({ types: xml })), null)
  }
  const utf8 = Buffer.from(good), middle = utf8.indexOf(Buffer.from('Types'))
  const invalid = Buffer.concat([utf8.subarray(0, middle), Buffer.from([0xc0, 0xaf]), utf8.subarray(middle)])
  assert.equal(ft.detectFileType(c.wordPackage({ types: invalid })), null)
})

test('P2D OOXML main type is relationship plus namespace, independent of path and compression', () => {
  for (const deflate of [false, true]) for (const strict of [false, true]) {
    const relType = strict ? 'http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument' : c.OFFICE_DOCUMENT
    const part = 'word/document.xml'
    const namespace = strict ? 'http://purl.oclc.org/ooxml/spreadsheetml/main' : c.EXCEL_NS
    const body = `<s:workbook xmlns:s="${namespace}"><s:sheets/></s:workbook>`
    const bytes = c.officePackage(part, c.EXCEL_MAIN, { deflate, rels: c.relationships(part, relType), body })
    assert.equal(ft.detectFileType(bytes), 'xlsx')
    assert.ok('error' in ft.classifyUpload(bytes, 'pretend.docx', ['docx', 'xlsx']))
    assert.deepEqual(ft.classifyUpload(bytes, 'actual.xlsx', ['xlsx']), { type: 'xlsx' })
    const mismatched = c.officePackage(part, c.WORD_MAIN, { deflate, body })
    assert.equal(ft.detectFileType(mismatched), null)
  }
})

test('P2D ZIP missing main bytes and encrypted main parts cannot upload as Office', () => {
  const good = c.wordPackage({ deflate: true })
  let at = good.readUInt32LE(good.length - 6)
  while (good.toString('utf8', at + 46, at + 46 + good.readUInt16LE(at + 28)) !== 'word/document.xml') {
    at += 46 + good.readUInt16LE(at + 28) + good.readUInt16LE(at + 30) + good.readUInt16LE(at + 32)
  }
  const missing = Buffer.from(good); missing.writeUInt32LE(good.length + 1, at + 20)
  assert.equal(ft.detectFileType(missing), null)
  const encrypted = Buffer.from(good); encrypted.writeUInt16LE(1, at + 8)
  assert.equal(ft.detectFileType(encrypted), null)
  const differentName = Buffer.from(good), local = differentName.readUInt32LE(at + 42)
  differentName[local + 30] = 'x'.charCodeAt(0)
  assert.equal(ft.detectFileType(differentName), null)
})

let fixture, token
before(async () => {
  fixture = await require('./codex-review-p2d-fixture.cjs')('p2d_independent')
  token = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret: process.env.JWT_SECRET }).sign({ sub: fixture.admin.id, role: 'super_admin', permissions: ['*'], tokenVersion: 0 })
}, { timeout: 120000 })
after(async () => { if (fixture) await fixture.close() })
test('P2D actual upload boundary: rejected containers create no row; accepted bytes/hash are unchanged', async t => {
  await fixture.setting('files.allowed_types', 'doc,docx,xls,xlsx')
  const good = regularOle(8193, 4096, true).b
  const bad = Buffer.from(good); bad.writeUInt32LE(c.OLE_END, 4096 + 4 * 4)
  const before = await fixture.ds.query('SELECT COUNT(*) AS n FROM stored_files')
  const upload = async (bytes, name) => {
    const form = new FormData(); form.append('file', new Blob([bytes]), name)
    const r = await fetch('http://127.0.0.1:1/api/files/upload?entityType=document', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form })
    return { status: r.status, body: await r.json() }
  }
  const rejected = await upload(bad, 'missing-tail.doc'); assert.equal(rejected.status, 400)
  assert.deepEqual(await fixture.ds.query('SELECT COUNT(*) AS n FROM stored_files'), before)
  const accepted = await upload(good, 'permuted-v4.doc'); assert.equal(accepted.status, 201, JSON.stringify(accepted.body))
  const [row] = await fixture.ds.query('SELECT sha256,mime FROM stored_files WHERE id=@0', [accepted.body.id])
  assert.equal(row.sha256, crypto.createHash('sha256').update(good).digest('hex'))
  assert.equal(row.mime, ft.FILE_TYPE_MIME.doc)
  t.diagnostic(JSON.stringify({ case: 'independent-http-boundary', rejected: rejected.status, accepted: accepted.status, hashUnchanged: true, noRejectedRow: true }))
})
