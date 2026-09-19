'use strict'
// «مستخدم منقول — محتاج باسورد»: التعريف من سجل المستورد (report.json + idmap.json) مش من الـhash
// Run: node --test api/test/legacy-password-marker.test.cjs
const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { legacyUnusablePasswordUserIds, needsPasswordFromLegacy } = require('../src/auth/legacy-password-marker')

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-legacy-marker-'))
after(() => fs.rmSync(dir, { recursive: true, force: true }))
const write = (report, idmap) => {
  if (report !== undefined) fs.writeFileSync(path.join(dir, 'report.json'), typeof report === 'string' ? report : JSON.stringify(report))
  if (idmap !== undefined) fs.writeFileSync(path.join(dir, 'idmap.json'), typeof idmap === 'string' ? idmap : JSON.stringify(idmap))
}
const ids = () => [...legacyUnusablePasswordUserIds(dir)].sort((a, b) => a - b)

test('missing record → no badges', () => {
  assert.deepEqual([...legacyUnusablePasswordUserIds(path.join(dir, 'nope'))], [])
})

test('only accounts the importer created with an unusable password (linked ones excluded, BOM tolerated)', () => {
  write('﻿' + JSON.stringify({ domains: {
    'users-assets': { flags: {
      USER_PASSWORD_RESET_REQUIRED: [{ legacyId: '7' }, { legacyId: 9 }, { legacyId: 'unmapped' }, { legacyId: null }],
      USER_EMAIL_EXISTS_LINKED: [{ legacyId: '1' }],
    } },
    employees: { flags: {} },
  } }), { user: { 1: 1, 7: 101, 9: 102 }, employee: { 7: 500 } })
  assert.deepEqual(ids(), [101, 102])
  const set = legacyUnusablePasswordUserIds(dir)
  assert.equal(needsPasswordFromLegacy({ id: 101, passwordChangedAt: null }, set), true)
  assert.equal(needsPasswordFromLegacy({ id: 101, passwordChangedAt: new Date() }, set), false) // اتعيّن له كلمة هنا
  assert.equal(needsPasswordFromLegacy({ id: 1 }, set), false)
})

test('record changes are picked up; a corrupt record yields no badges instead of partial ones', () => {
  write({ domains: { 'users-assets': { flags: { USER_PASSWORD_RESET_REQUIRED: [{ legacyId: '7' }] } } } }, { user: { 7: 201 } })
  assert.deepEqual(ids(), [201])
  write('{ not json', undefined)
  assert.deepEqual(ids(), [])
})
