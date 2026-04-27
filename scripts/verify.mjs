import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createProtocolParserDefinition } from '../src/parsers/profileParserFactory.js'
import { GET as getMserialApi } from '../app/api/mserial/route.js'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const encoder = new TextEncoder()

const readJson = async (path) => JSON.parse(await readFile(resolve(rootDir, path), 'utf8'))
const readText = async (path) => readFile(resolve(rootDir, path), 'utf8')

const hexToBytes = (hex) => {
  const compact = hex.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '')
  assert.equal(compact.length % 2, 0, 'hex sample must contain complete bytes')
  return Uint8Array.from(compact.match(/../g).map(byte => Number.parseInt(byte, 16)))
}

const feedProfile = async (profilePath, sampleBytes) => {
  const profile = await readJson(profilePath)
  const parser = createProtocolParserDefinition(profile).createInstance()
  return parser.feed(sampleBytes)
}

const assertSnapshot = (snapshots, expectedLabels, expectedValues) => {
  assert.ok(Array.isArray(snapshots), 'parser must return snapshots')
  assert.ok(snapshots.length > 0, 'parser must produce at least one snapshot')
  const snapshot = snapshots[0]
  assert.deepEqual(snapshot.labels, expectedLabels)
  expectedValues.forEach((expected, index) => {
    assert.ok(Math.abs(snapshot.values[index] - expected) < 0.001, `${snapshot.labels[index]} should be ${expected}`)
  })
}

const verifyProtocolExamples = async () => {
  assertSnapshot(
    await feedProfile('examples/protocols/line-values.json', encoder.encode(await readText('examples/samples/line-values.txt'))),
    ['temperature', 'humidity', 'pressure'],
    [23.5, 48.1, 101.3]
  )

  assertSnapshot(
    await feedProfile('examples/protocols/json-lines.json', encoder.encode(await readText('examples/samples/json-lines.txt'))),
    ['hr', 'spo2', 'data.temperature'],
    [74, 98.2, 36.7]
  )

  assertSnapshot(
    await feedProfile('examples/protocols/tlv.json', hexToBytes(await readText('examples/samples/tlv.hex'))),
    ['bpm', 'confidence'],
    [75, 0.82]
  )
}

const verifyPublicFiles = async () => {
  const llms = await readText('public/llms.txt')
  assert.match(llms, /Meow Serial/i)
  assert.match(llms, /protocol/i)

  const manifest = await readJson('public/.well-known/mserial-ai.json')
  assert.equal(manifest.name, 'Meow Serial')
  assert.ok(manifest.browser_automation?.first_read_order?.includes('/api/mserial'))
  assert.equal(manifest.serial_app, '/serial')
  assert.ok(manifest.examples?.protocols?.json_lines)
  assert.equal(manifest.validation?.local_command, 'pnpm verify')

  const automation = await readJson('public/ai/browser-automation.json')
  assert.ok(automation.protocol_form_selectors?.view)
  assert.ok(automation.home_layout_contract?.ai_facing_area)

  const schema = await readJson('public/ai/protocol-profile.schema.json')
  assert.equal(schema.type, 'object')
  assert.ok(schema.properties?.kind)
}

const verifyApiRoute = async () => {
  const response = await getMserialApi()
  assert.equal(response.status, 200)
  const api = await response.json()
  assert.equal(api.name, 'Meow Serial')
  assert.equal(api.version, '2.0.0')
  assert.equal(api.schemaVersion, '2026-04-26')
  assert.ok(api.examples?.protocols?.lineValues)
  assert.ok(api.validationHints?.successSignals?.protocolTestOutput)
  assert.ok(api.aiCommands?.every(command => command.href && command.successSignal))
}

await verifyProtocolExamples()
await verifyPublicFiles()
await verifyApiRoute()

console.log('verify ok: protocol examples, public AI files, and /api/mserial contract are valid')
