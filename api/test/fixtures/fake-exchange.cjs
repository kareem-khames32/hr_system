'use strict'
// B-ADD.16: خادم Exchange مزيّف على 127.0.0.1 للاختبارات — مفيش أي اتصال بيطلع برّه الجهاز.
// بيتكلم NTLMv2 فعلًا (بيتحقق من كلمة السر من رد التحدي — كلمة السر نفسها عمرها ما بتعدّي على السلك)، وبيرد على GetFolder بعدد غير المقروء.
// كل طلب وصله متسجّل (الترويسات والجسم) عشان الاختبار يتأكد إن كلمة السر مش في أي حتة منه.
const http = require('node:http'), crypto = require('node:crypto')
const md4 = require('../../node_modules/js-md4')

const CHALLENGE = Buffer.from('0123456789abcdef', 'hex')
const UNICODE = 1 << 0, NTLM = 1 << 9, NTLM2_KEY = 1 << 19, TARGET_INFO = 1 << 23

function type2Message() {
  const name = Buffer.from('FAKE', 'ucs2')
  const info = Buffer.concat([Buffer.from([2, 0, name.length, 0]), name, Buffer.from([0, 0, 0, 0])])
  const buf = Buffer.alloc(48 + info.length)
  buf.write('NTLMSSP\0', 0, 'ascii'); buf.writeUInt32LE(2, 8); buf.writeUInt32LE(48, 16)
  buf.writeUInt32LE(UNICODE | NTLM | NTLM2_KEY | TARGET_INFO, 20)
  CHALLENGE.copy(buf, 24)
  buf.writeUInt16LE(info.length, 40); buf.writeUInt16LE(info.length, 42); buf.writeUInt32LE(48, 44); info.copy(buf, 48)
  return buf.toString('base64')
}

/** الرد التالت: المجال والمستخدم، وهل رد التحدي بتاع كلمة السر دي */
function readType3(base64, passwordOf) {
  const buf = Buffer.from(base64, 'base64')
  const slice = at => buf.subarray(buf.readUInt32LE(at + 4), buf.readUInt32LE(at + 4) + buf.readUInt16LE(at))
  const domain = slice(28).toString('ucs2'), user = slice(36).toString('ucs2'), response = slice(20)
  const password = passwordOf(user, domain)
  if (typeof password !== 'string' || response.length < 16) return { domain, user, ok: false }
  const ntlmHash = Buffer.from(md4.create().update(Buffer.from(password, 'ucs2')).digest())
  const v2Hash = crypto.createHmac('md5', ntlmHash).update(Buffer.from(user.toUpperCase() + domain, 'ucs2')).digest()
  const proof = crypto.createHmac('md5', v2Hash).update(Buffer.concat([CHALLENGE, response.subarray(16)])).digest()
  return { domain, user, ok: crypto.timingSafeEqual(proof, response.subarray(0, 16)) }
}

const folderResponse = unread => '<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Header>' +
  '<h:ServerVersionInfo MajorVersion="15" MinorVersion="1" MajorBuildNumber="2507" MinorBuildNumber="6" Version="V2017_07_11" xmlns:h="http://schemas.microsoft.com/exchange/services/2006/types"/>' +
  '</s:Header><s:Body><m:GetFolderResponse xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages" xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">' +
  '<m:ResponseMessages><m:GetFolderResponseMessage ResponseClass="Success"><m:ResponseCode>NoError</m:ResponseCode><m:Folders><t:Folder>' +
  `<t:FolderId Id="AAMkAGZha2VmYWtlZmFrZWZha2VmYWtlZmFrZQ==" ChangeKey="AQAAABYAAAA="/><t:UnreadCount>${unread}</t:UnreadCount>` +
  '</t:Folder></m:Folders></m:GetFolderResponseMessage></m:ResponseMessages></m:GetFolderResponse></s:Body></s:Envelope>'

/**
 * accounts: خريطة «اسم الدخول بحروف صغيرة ← كلمة السر». بيرجّع: url، وrequests (كل اللي وصل للخادم نصًا)، وlogins (مين دخل وهل اتقبل)، وclose.
 */
async function startFakeExchange(accounts, unread = 3) {
  const requests = [], logins = []
  const server = http.createServer((req, res) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      requests.push(`${req.method} ${req.url}\n${JSON.stringify(req.headers)}\n${body}`)
      const message = /^NTLM (.+)$/.exec(String(req.headers.authorization ?? ''))?.[1]
      const type = message ? Buffer.from(message, 'base64').readUInt32LE(8) : 0
      if (type === 1) { res.writeHead(401, { 'WWW-Authenticate': `NTLM ${type2Message()}` }); return res.end() }
      if (type !== 3) { res.writeHead(401, { 'WWW-Authenticate': 'NTLM' }); return res.end() }
      const login = readType3(message, (user, domain) => accounts.get(`${domain ? `${domain}\\` : ''}${user}`.toLowerCase()))
      logins.push({ user: login.user, domain: login.domain, ok: login.ok, anchor: req.headers['x-anchormailbox'] ?? null })
      if (!login.ok) { res.writeHead(401); return res.end() }
      if (!/GetFolder/.test(body)) { res.writeHead(500); return res.end('fake exchange: only GetFolder is served on the wire') }
      res.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8' }); res.end(folderResponse(unread))
    })
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return {
    url: `http://127.0.0.1:${server.address().port}/EWS/Exchange.asmx`, requests, logins,
    close: () => new Promise(resolve => { server.closeAllConnections?.(); server.close(() => resolve()) }),
  }
}

module.exports = { startFakeExchange }
