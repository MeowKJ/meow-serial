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

const assertTextIncludes = (text, expected, message) => {
  assert.ok(text.includes(expected), message ?? `expected text to include ${expected}`)
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
  assert.match(llms, /agent-scorecard/i)
  assert.match(llms, /agent-playbook/i)
  assert.match(llms, /custom-parser-primer/i)
  assert.match(llms, /generic serial terminal/i)

  const manifest = await readJson('public/.well-known/mserial-ai.json')
  assert.equal(manifest.name, 'Meow Serial')
  assert.ok(manifest.browser_automation?.first_read_order?.includes('/api/mserial'))
  assert.ok(manifest.browser_automation?.first_read_order?.includes('/ai/custom-parser-primer.json'))
  assert.ok(manifest.browser_automation?.first_read_order?.includes('/ai/agent-scorecard.json'))
  assert.ok(manifest.browser_automation?.first_read_order?.includes('/ai/agent-playbook.json'))
  assert.equal(manifest.serial_app, '/serial')
  assert.equal(manifest.custom_parser_primer, '/ai/custom-parser-primer.json')
  assert.equal(manifest.agent_readiness?.grade, 'S')
  assert.ok(manifest.examples?.protocols?.json_lines)
  assert.equal(manifest.validation?.local_command, 'pnpm verify')
  assert.equal(manifest.validation?.target_grade, 'S')
  assert.equal(manifest.custom_protocol_json?.primer_url, '/ai/custom-parser-primer.json')
  assert.equal(manifest.custom_protocol_json?.playbook_url, '/ai/agent-playbook.json')

  const automation = await readJson('public/ai/browser-automation.json')
  assert.ok(automation.protocol_form_selectors?.view)
  assert.ok(automation.home_layout_contract?.ai_facing_area)
  assert.ok(automation.new_agent_s_checklist?.length >= 5)
  assert.equal(automation.navigation?.custom_parser_primer_path, '/ai/custom-parser-primer.json')
  assert.equal(automation.navigation?.playbook_path, '/ai/agent-playbook.json')
  assert.ok(automation.fallbacks?.browser_backend_unavailable)

  const scorecard = await readJson('public/ai/agent-scorecard.json')
  assert.equal(scorecard.target_grade, 'S')
  assert.equal(scorecard.current_assessment?.grade, 'S')
  assert.ok(scorecard.first_read_order?.includes('/ai/custom-parser-primer.json'))
  assert.ok(scorecard.first_read_order?.includes('/ai/agent-playbook.json'))
  assert.ok(scorecard.criteria?.length >= 7)
  assert.ok(scorecard.s_grade_required_checks?.some(item => item.includes('/api/mserial')))
  assert.ok(scorecard.s_grade_required_checks?.some(item => item.includes('not a generic serial terminal')))

  const primer = await readJson('public/ai/custom-parser-primer.json')
  assert.equal(primer.canonical_site, 'https://s.mpas.top')
  assert.match(primer.one_sentence_identity, /custom protocol JSON/i)
  assert.ok(primer.do_not_misclassify_as?.includes('generic serial monitor'))
  assert.deepEqual(primer.protocol_kind_decision.map(item => item.kind), ['line-values', 'json-lines', 'tlv'])
  assert.equal(primer.browser_import_path?.test_output, '[data-ai="protocol-test-output"]')
  assert.match(primer.minimal_prompt_for_external_ai, /s\.mpas\.top/)

  const playbook = await readJson('public/ai/agent-playbook.json')
  assert.equal(playbook.schema_version, '1.0')
  assert.ok(playbook.entry_sequence?.some(item => item.read === '/ai/custom-parser-primer.json'))
  assert.ok(playbook.entry_sequence?.some(item => item.read === '/api/mserial'))
  assert.ok(playbook.entry_sequence?.some(item => item.read === '/ai/browser-automation.json'))
  assert.match(playbook.plain_serial_misclassification_guard?.correct_answer_pattern, /custom protocol parser/i)
  assert.deepEqual(
    playbook.custom_protocol_json_decision_tree.map(item => item.choose_kind),
    ['line-values', 'json-lines', 'tlv']
  )
  assert.ok(playbook.browser_recipes?.some(item => item.id === 'load_demo_dashboard'))
  assert.ok(playbook.browser_recipes?.some(item => item.id === 'test_custom_protocol_json'))
  assert.ok(playbook.honest_reporting_rules?.some(item => item.includes('browser automation')))

  const schema = await readJson('public/ai/protocol-profile.schema.json')
  assert.equal(schema.type, 'object')
  assert.ok(schema.properties?.kind)
}

const verifyDocumentedSelectors = async () => {
  const home = await readText('app/page.jsx')
  const layout = await readText('app/layout.jsx')
  const header = await readText('src/components/HeaderBar.vue')
  const canvas = await readText('src/components/CanvasView.vue')
  const terminal = await readText('src/components/TerminalView.vue')
  const protocol = await readText('src/components/ProtocolView.vue')

  assertTextIncludes(home, 'data-ai="home-ai-command-panel"')
  assertTextIncludes(home, 'data-ai="home-custom-parser-primer"')
  assertTextIncludes(home, '/ai/custom-parser-primer.json')
  assertTextIncludes(home, "key: 'protocol.import'")
  assertTextIncludes(home, 'data-ai-command={command.key}')
  assertTextIncludes(layout, 'ai-primary-task')
  assertTextIncludes(layout, '/ai/custom-parser-primer.json')
  assertTextIncludes(header, 'data-ai="load-demo-workspace"')
  assertTextIncludes(header, 'data-ai="open-widget-panel"')
  assertTextIncludes(canvas, 'data-ai="canvas-load-demo-workspace"')
  assertTextIncludes(canvas, 'data-ai="canvas-open-widget-panel"')
  assertTextIncludes(terminal, "'terminal-mode-analysis'")
  assertTextIncludes(terminal, 'data-ai="terminal-log"')
  assertTextIncludes(protocol, 'data-ai="import-protocol-json"')
  assertTextIncludes(protocol, 'data-ai="protocol-json-file-input"')
  assertTextIncludes(protocol, 'data-ai="protocol-test-input"')
  assertTextIncludes(protocol, 'data-ai="protocol-test-output"')
  assertTextIncludes(protocol, 'data-ai="save-and-apply-protocol"')
}

const verifyApiRoute = async () => {
  const response = await getMserialApi()
  assert.equal(response.status, 200)
  const api = await response.json()
  assert.equal(api.name, 'Meow Serial')
  assert.equal(api.version, '2.0.0')
  assert.equal(api.schemaVersion, '2026-04-26')
  assert.match(api.identityWarning, /plain serial terminal/i)
  assert.equal(api.agentReadiness?.grade, 'S')
  assert.equal(api.agentReadiness?.scorecardUrl, '/ai/agent-scorecard.json')
  assert.ok(api.agentReadiness?.sEvidence?.includes('/ai/custom-parser-primer.json'))
  assert.ok(api.agentReadiness?.sEvidence?.includes('/ai/agent-playbook.json'))
  assert.equal(api.customProtocolJsonContract?.primerUrl, '/ai/custom-parser-primer.json')
  assert.equal(api.customProtocolJsonContract?.playbookUrl, '/ai/agent-playbook.json')
  assert.deepEqual(api.customProtocolJsonContract?.supportedKinds, ['line-values', 'json-lines', 'tlv'])
  assert.ok(api.examples?.protocols?.lineValues)
  assert.ok(api.validationHints?.successSignals?.protocolTestOutput)
  assert.ok(api.aiCommands?.every(command => command.href && command.successSignal))
}

await verifyProtocolExamples()
await verifyPublicFiles()
await verifyDocumentedSelectors()
await verifyApiRoute()

console.log('verify ok: protocol examples, AI docs, real UI selectors, and /api/mserial contract are valid')
