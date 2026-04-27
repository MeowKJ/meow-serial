import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
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

const assertHasKeys = (object, keys, context) => {
  keys.forEach(key => assert.ok(Object.hasOwn(object, key), `${context} must include ${key}`))
}

const verifyProtocolProfilesMatchSchemaContract = async () => {
  const schema = await readJson('public/ai/protocol-profile.schema.json')
  const lineProfile = await readJson('examples/protocols/line-values.json')
  const jsonProfile = await readJson('examples/protocols/json-lines.json')
  const tlvProfile = await readJson('examples/protocols/tlv.json')

  assert.deepEqual(schema.required, ['name', 'kind', 'defaultBaudRate'])
  assert.deepEqual(schema.properties?.line?.required, ['channelNames'])
  assert.equal(schema.properties?.line?.properties?.channelNames?.minItems, 1)
  assert.deepEqual(schema.properties?.json?.required, ['fieldPaths'])
  assert.equal(schema.properties?.json?.properties?.fieldPaths?.minItems, 1)

  const requiredTlvKeys = [
    'headerSize',
    'packetLengthOffset',
    'packetLengthType',
    'packetLengthEndian',
    'tlvCountOffset',
    'tlvCountType',
    'tlvCountEndian',
    'tlvHeaderSize',
    'tlvTypeOffset',
    'tlvTypeType',
    'tlvLengthOffset',
    'tlvLengthType',
    'tlvHeaderEndian',
    'tlvLengthIncludesHeader',
    'mappings'
  ]
  assert.deepEqual(schema.properties?.tlv?.required, requiredTlvKeys)
  assert.equal(schema.properties?.tlv?.properties?.mappings?.minItems, 1)

  ;[
    ['line-values profile', lineProfile],
    ['json-lines profile', jsonProfile],
    ['tlv profile', tlvProfile]
  ].forEach(([context, profile]) => {
    assertHasKeys(profile, schema.required, context)
    assert.ok(['line-values', 'json-lines', 'tlv'].includes(profile.kind), `${context} must use a supported kind`)
    assert.equal(typeof profile.name, 'string', `${context} name must be a string`)
    assert.equal(typeof profile.defaultBaudRate, 'number', `${context} defaultBaudRate must be a number`)
  })

  assertHasKeys(lineProfile.line, schema.properties.line.required, 'line-values profile line block')
  assert.ok(lineProfile.line.channelNames.length >= schema.properties.line.properties.channelNames.minItems)

  assertHasKeys(jsonProfile.json, schema.properties.json.required, 'json-lines profile json block')
  assert.ok(jsonProfile.json.fieldPaths.length >= schema.properties.json.properties.fieldPaths.minItems)

  assertHasKeys(tlvProfile.tlv, requiredTlvKeys, 'tlv profile tlv block')
  assert.ok(tlvProfile.tlv.mappings.length >= schema.properties.tlv.properties.mappings.minItems)
  tlvProfile.tlv.mappings.forEach((mapping, index) => {
    assertHasKeys(mapping, schema.properties.tlv.properties.mappings.items.required, `tlv mapping ${index}`)
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
  assert.match(llms, /agent-scorecard/i)
  assert.match(llms, /agent-playbook/i)
  assert.match(llms, /agent-route/i)
  assert.match(llms, /custom-parser-primer/i)
  assert.match(llms, /parser-extension-policy/i)
  assert.match(llms, /generic serial terminal/i)
  assert.match(llms, /TLV Binary/i)
  assert.match(llms, /not a TI-only protocol/i)
  assert.match(llms, /import-workspace-url/i)
  assert.match(llms, /send-file-start/i)

  const manifest = await readJson('public/.well-known/mserial-ai.json')
  assert.equal(manifest.name, 'Meow Serial')
  assert.equal(manifest.agent_route, '/ai/agent-route.json')
  assert.equal(manifest.validation?.agent_route, '/ai/agent-route.json')
  assert.equal(manifest.custom_protocol_json?.agent_route_url, '/ai/agent-route.json')
  assert.ok(manifest.browser_automation?.first_read_order?.includes('/api/mserial'))
  assert.ok(manifest.browser_automation?.first_read_order?.includes('/ai/agent-route.json'))
  assert.ok(manifest.browser_automation?.first_read_order?.includes('/ai/custom-parser-primer.json'))
  assert.ok(manifest.browser_automation?.first_read_order?.includes('/ai/parser-extension-policy.json'))
  assert.ok(manifest.browser_automation?.first_read_order?.includes('/ai/agent-scorecard.json'))
  assert.ok(manifest.browser_automation?.first_read_order?.includes('/ai/agent-playbook.json'))
  assert.equal(manifest.serial_app, '/serial')
  assert.equal(manifest.custom_parser_primer, '/ai/custom-parser-primer.json')
  assert.equal(manifest.parser_extension_policy, '/ai/parser-extension-policy.json')
  assert.equal(manifest.agent_readiness?.grade, 'S')
  assert.ok(manifest.examples?.protocols?.json_lines)
  assert.equal(manifest.validation?.local_command, 'pnpm verify')
  assert.equal(manifest.validation?.target_grade, 'S')
  assert.equal(manifest.custom_protocol_json?.primer_url, '/ai/custom-parser-primer.json')
  assert.equal(manifest.custom_protocol_json?.extension_policy_url, '/ai/parser-extension-policy.json')
  assert.equal(manifest.custom_protocol_json?.playbook_url, '/ai/agent-playbook.json')
  assert.deepEqual(manifest.parser_extension_policy_summary?.registered_builtin_parsers, ['raw'])

  const automation = await readJson('public/ai/browser-automation.json')
  assert.ok(automation.protocol_form_selectors?.view)
  assert.ok(automation.home_layout_contract?.ai_facing_area)
  assert.ok(automation.new_agent_s_checklist?.length >= 5)
  assert.equal(automation.navigation?.agent_route_path, '/ai/agent-route.json')
  assert.equal(automation.navigation?.import_workspace_url, '[data-ai="import-workspace-url"]')
  assert.equal(automation.navigation?.workspace_url_param, '/serial?workspace=/examples/workspaces/vitals-dashboard.json')
  assert.equal(automation.navigation?.custom_parser_primer_path, '/ai/custom-parser-primer.json')
  assert.equal(automation.navigation?.parser_extension_policy_path, '/ai/parser-extension-policy.json')
  assert.equal(automation.navigation?.playbook_path, '/ai/agent-playbook.json')
  assert.equal(automation.serial_workbench_selectors?.send_file_input, '[data-ai="send-file-input"]')
  assert.equal(automation.actions?.import_workspace_url, '[data-ai="import-workspace-url"]')
  assert.ok(automation.fallbacks?.browser_backend_unavailable)

  const scorecard = await readJson('public/ai/agent-scorecard.json')
  assert.equal(scorecard.target_grade, 'S')
  assert.equal(scorecard.current_assessment?.grade, 'S')
  assert.ok(scorecard.first_read_order?.includes('/ai/agent-route.json'))
  assert.ok(scorecard.first_read_order?.includes('/ai/custom-parser-primer.json'))
  assert.ok(scorecard.first_read_order?.includes('/ai/parser-extension-policy.json'))
  assert.ok(scorecard.first_read_order?.includes('/ai/agent-playbook.json'))
  assert.ok(scorecard.criteria?.length >= 7)
  assert.ok(scorecard.s_grade_required_checks?.some(item => item.includes('/api/mserial')))
  assert.ok(scorecard.s_grade_required_checks?.some(item => item.includes('not a generic serial terminal')))
  assert.ok(scorecard.s_grade_required_checks?.some(item => item.includes('workspaceJsonContract')))

  const agentRoute = await readJson('public/ai/agent-route.json')
  assert.equal(agentRoute.canonical_start_url, 'https://s.mpas.top')
  assert.match(agentRoute.route_principle, /protocol JSON/i)
  assert.ok(agentRoute.route?.some(item => item.read === 'https://s.mpas.top/ai/protocol-profile.schema.json'))
  assert.deepEqual(
    agentRoute.protocol_json_generation_route?.decision_order?.map(item => item.kind),
    ['line-values', 'json-lines', 'tlv']
  )
  assert.equal(agentRoute.browser_operation_route?.selectors?.test_output, '[data-ai="protocol-test-output"]')
  assert.equal(agentRoute.workspace_json_route?.url_import_selector, '[data-ai="import-workspace-url"]')
  assert.equal(agentRoute.workspace_json_route?.direct_import_path, 'https://s.mpas.top/serial?workspace=/examples/workspaces/vitals-dashboard.json')
  assert.equal(agentRoute.file_send_route?.selectors?.start, '[data-ai="send-file-start"]')
  assert.ok(agentRoute.fallbacks?.some(item => item.action.includes('firmware-side normalization')))

  const primer = await readJson('public/ai/custom-parser-primer.json')
  assert.equal(primer.canonical_site, 'https://s.mpas.top')
  assert.equal(primer.route_from_site_root?.machine_readable_route, '/ai/agent-route.json')
  assert.match(primer.one_sentence_identity, /custom protocol JSON/i)
  assert.ok(primer.do_not_misclassify_as?.includes('generic serial monitor'))
  assert.deepEqual(primer.protocol_kind_decision.map(item => item.kind), ['line-values', 'json-lines', 'tlv'])
  assert.equal(primer.embedded_parser_code_policy?.details, '/ai/parser-extension-policy.json')
  assert.match(primer.tlv_binary_quick_answer?.short_answer, /fixed TLV payload offsets/i)
  assert.match(primer.tlv_binary_quick_answer?.definition, /not exclusive to TI/i)
  assert.equal(primer.browser_import_path?.test_output, '[data-ai="protocol-test-output"]')
  assert.match(primer.minimal_prompt_for_external_ai, /s\.mpas\.top/)

  const extensionPolicy = await readJson('public/ai/parser-extension-policy.json')
  assert.deepEqual(extensionPolicy.current_runtime?.registered_builtin_parsers, ['raw'])
  assert.deepEqual(extensionPolicy.current_runtime?.profile_generated_parser_kinds, ['line-values', 'json-lines', 'tlv'])
  assert.match(extensionPolicy.security_boundary?.rule, /data, not executable code/i)
  assert.ok(extensionPolicy.security_boundary?.forbidden_in_imported_json?.includes('JavaScript source strings'))
  assert.equal(extensionPolicy.embedded_device_parser_code?.supported_direction?.includes('firmware-side'), true)
  assert.equal(extensionPolicy.tlv_binary_protocol_support?.profile_kind_to_generate, 'tlv')
  assert.match(extensionPolicy.tlv_binary_protocol_support?.definition, /not a TI-only protocol/i)
  assert.ok(extensionPolicy.tlv_binary_protocol_support?.ask_user_for?.some(item => item.includes('magicWordHex')))
  assert.ok(extensionPolicy.tlv_binary_protocol_support?.cannot_parse_directly_when?.some(item => item.includes('byte stuffing')))

  const playbook = await readJson('public/ai/agent-playbook.json')
  assert.equal(playbook.schema_version, '1.0')
  assert.ok(playbook.entry_sequence?.some(item => item.read === '/ai/agent-route.json'))
  assert.ok(playbook.entry_sequence?.some(item => item.read === '/ai/custom-parser-primer.json'))
  assert.ok(playbook.entry_sequence?.some(item => item.read === '/ai/parser-extension-policy.json'))
  assert.ok(playbook.entry_sequence?.some(item => item.read === '/api/mserial'))
  assert.ok(playbook.entry_sequence?.some(item => item.read === '/ai/browser-automation.json'))
  assert.match(playbook.plain_serial_misclassification_guard?.correct_answer_pattern, /custom protocol parser/i)
  assert.deepEqual(
    playbook.custom_protocol_json_decision_tree.map(item => item.choose_kind),
    ['line-values', 'json-lines', 'tlv']
  )
  assert.ok(playbook.browser_recipes?.some(item => item.id === 'load_demo_dashboard'))
  assert.ok(playbook.browser_recipes?.some(item => item.id === 'test_custom_protocol_json'))
  assert.ok(playbook.browser_recipes?.some(item => item.id === 'import_workspace_json_online'))
  assert.ok(playbook.browser_recipes?.some(item => item.id === 'send_file_line_by_line'))
  assert.match(playbook.embedded_parser_code_guidance?.recommended_path, /firmware/i)
  assert.match(playbook.tlv_binary_recipe?.definition, /general binary structure/i)
  assert.match(playbook.tlv_binary_recipe?.first_answer, /fixed-offset TLV/i)
  assert.ok(playbook.tlv_binary_recipe?.ask_for?.some(item => item.includes('sample hex frame')))
  assert.ok(playbook.honest_reporting_rules?.some(item => item.includes('browser automation')))

  const schema = await readJson('public/ai/protocol-profile.schema.json')
  assert.equal(schema.type, 'object')
  assert.equal(schema['x-ai-route'], '/ai/agent-route.json')
  assert.ok(schema.properties?.kind)
}

const verifyDocumentedSelectors = async () => {
  const home = await readText('app/page.jsx')
  const layout = await readText('app/layout.jsx')
  const app = await readText('src/App.vue')
  const header = await readText('src/components/HeaderBar.vue')
  const sidebar = await readText('src/components/Sidebar.vue')
  const canvas = await readText('src/components/CanvasView.vue')
  const terminal = await readText('src/components/TerminalView.vue')
  const protocol = await readText('src/components/ProtocolView.vue')

  assertTextIncludes(home, 'data-ai="home-ai-command-panel"')
  assertTextIncludes(home, 'data-ai="home-custom-parser-primer"')
  assertTextIncludes(home, '/ai/agent-route.json')
  assertTextIncludes(home, '/ai/custom-parser-primer.json')
  assertTextIncludes(home, '/ai/parser-extension-policy.json')
  assertTextIncludes(home, "key: 'protocol.import'")
  assertTextIncludes(home, 'data-ai-command={command.key}')
  assertTextIncludes(app, 'workspaceUrl')
  assertTextIncludes(app, 'importWorkspaceConfigFromUrl')
  assertTextIncludes(layout, 'ai-primary-task')
  assertTextIncludes(layout, '/ai/agent-route.json')
  assertTextIncludes(layout, '/ai/custom-parser-primer.json')
  assertTextIncludes(layout, '/ai/parser-extension-policy.json')
  assertTextIncludes(header, 'data-ai="load-demo-workspace"')
  assertTextIncludes(header, 'data-ai="import-workspace-url"')
  assertTextIncludes(header, 'data-ai="open-widget-panel"')
  assertTextIncludes(sidebar, 'data-ai="send-file-port-select"')
  assertTextIncludes(sidebar, 'data-ai="send-file-delay-ms"')
  assertTextIncludes(sidebar, 'data-ai="send-file-input"')
  assertTextIncludes(sidebar, 'data-ai="send-file-start"')
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
  assert.ok(api.agentReadiness?.sEvidence?.includes('/ai/agent-route.json'))
  assert.ok(api.agentReadiness?.sEvidence?.includes('/ai/custom-parser-primer.json'))
  assert.ok(api.agentReadiness?.sEvidence?.includes('/ai/parser-extension-policy.json'))
  assert.ok(api.agentReadiness?.sEvidence?.includes('/ai/agent-playbook.json'))
  assert.equal(api.customProtocolJsonContract?.primerUrl, '/ai/custom-parser-primer.json')
  assert.equal(api.customProtocolJsonContract?.agentRouteUrl, '/ai/agent-route.json')
  assert.equal(api.customProtocolJsonContract?.extensionPolicyUrl, '/ai/parser-extension-policy.json')
  assert.equal(api.customProtocolJsonContract?.playbookUrl, '/ai/agent-playbook.json')
  assert.deepEqual(api.customProtocolJsonContract?.supportedKinds, ['line-values', 'json-lines', 'tlv'])
  assert.equal(api.workspaceJsonContract?.urlImportButton, '[data-ai="import-workspace-url"]')
  assert.equal(api.workspaceJsonContract?.urlImportParam, '/serial?workspace=/examples/workspaces/vitals-dashboard.json')
  assert.equal(api.fileSendContract?.selectors?.fileInput, '[data-ai="send-file-input"]')
  assert.equal(api.fileSendContract?.selectors?.startButton, '[data-ai="send-file-start"]')
  assert.deepEqual(api.parserExtensionPolicy?.currentRuntime?.registeredBuiltinParsers, ['raw'])
  assert.match(api.parserExtensionPolicy?.tlvBinarySupport?.definition, /general binary encoding pattern/i)
  assert.match(api.parserExtensionPolicy?.tlvBinarySupport?.canParseWhen, /fixed TLV payload offsets/i)
  assert.ok(api.examples?.protocols?.lineValues)
  assert.ok(api.validationHints?.successSignals?.protocolTestOutput)
  assert.ok(api.aiCommands?.every(command => command.href && command.successSignal))
}

const verifyNoLegacyParserFiles = async () => {
  const parserFiles = (await readdir(resolve(rootDir, 'src/parsers'))).sort()
  assert.deepEqual(parserFiles, ['index.js', 'profileParserFactory.js', 'rawParser.js'])
}

await verifyProtocolExamples()
await verifyProtocolProfilesMatchSchemaContract()
await verifyPublicFiles()
await verifyDocumentedSelectors()
await verifyApiRoute()
await verifyNoLegacyParserFiles()

console.log('verify ok: protocol examples, AI docs, real UI selectors, and /api/mserial contract are valid')
