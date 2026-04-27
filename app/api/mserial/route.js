const metadata = {
  name: 'Meow Serial',
  version: '2.0.0',
  schemaVersion: '2026-04-26',
  tagline: 'AI 友好的串口 / WebSocket 调试工作台',
  serialAppPath: '/serial',
  primaryWorkflowImage: '/images/ai-protocol-workflow.png',
  aiEndpoints: [
    '/llms.txt',
    '/.well-known/mserial-ai.json',
    '/ai/protocol-profile.schema.json',
    '/ai/browser-automation.json',
    '/api/mserial'
  ],
  aiDiscovery: {
    firstReadOrder: [
      '/llms.txt',
      '/.well-known/mserial-ai.json',
      '/api/mserial',
      '/ai/protocol-profile.schema.json',
      '/ai/browser-automation.json'
    ],
    endpointDescriptions: {
      '/llms.txt': 'Short natural-language orientation for a new language model.',
      '/.well-known/mserial-ai.json': 'Stable manifest with capabilities, prompt template, and selector summary.',
      '/api/mserial': 'Runtime metadata, command IDs, layout contract, and supported protocol kinds.',
      '/ai/protocol-profile.schema.json': 'JSON Schema for generating directly importable protocol profiles.',
      '/ai/browser-automation.json': 'Selector-level browser automation contract for AI agents.'
    },
    recommendedAgentBehavior: [
      'Treat the live preview as human-facing display content, not the main automation surface.',
      'Prefer data-ai-command selectors for high-level navigation from the home page.',
      'Prefer protocol_form_selectors from /ai/browser-automation.json after entering /serial?tab=protocol.',
      'Generate plain JSON only when preparing an importable protocol profile.'
    ]
  },
  entryActions: [
    {
      id: 'demo.load',
      label: '加载示例看板',
      target: '/serial?tab=canvas',
      selector: '[data-ai="load-demo-workspace"]',
      precondition: 'None. This loads the public vitals demo workspace and synthetic history into the local browser workspace.',
      successSignal: '[data-ai^="canvas-widget-"] exists and the sidebar shows finite channel values.',
      description: '一键进入有图表、有数值、有仪表盘的可视化演示状态。'
    },
    {
      id: 'protocol.import',
      label: '导入协议 JSON',
      target: '/serial?tab=protocol',
      selector: '[data-ai-command="protocol.import"]',
      precondition: 'Have a protocol profile JSON that follows /ai/protocol-profile.schema.json.',
      successSignal: '[data-ai="protocol-test-output"] contains parsed channel labels and numeric values.',
      description: '进入协议页，导入或测试 AI 生成的协议 JSON。'
    },
    {
      id: 'terminal.inspect',
      label: '查看终端',
      target: '/serial?tab=terminal',
      selector: '[data-ai-command="terminal.inspect"]',
      precondition: 'A Web Serial or WebSocket port is connected, or a demo source is available.',
      successSignal: '[data-ai="terminal-log"] contains RX or TX rows and byte counters update.',
      description: '查看串口或 WebSocket 的原始收发数据。'
    },
    {
      id: 'canvas.compose',
      label: '搭建看板',
      target: '/serial?tab=canvas',
      selector: '[data-ai-command="canvas.compose"]',
      precondition: 'At least one parsed channel exists, or examples/workspaces/vitals-dashboard.json is imported.',
      successSignal: '[data-ai="serial-app"] shows canvas widgets and channel values update in the sidebar.',
      description: '把解析后的命名通道绑定到实时控件。'
    }
  ],
  examples: {
    protocols: {
      lineValues: '/examples/protocols/line-values.json',
      jsonLines: '/examples/protocols/json-lines.json',
      tlv: '/examples/protocols/tlv.json'
    },
    samples: {
      lineValues: '/examples/samples/line-values.txt',
      jsonLines: '/examples/samples/json-lines.txt',
      tlvHex: '/examples/samples/tlv.hex'
    },
    workspaces: {
      vitalsDashboard: '/examples/workspaces/vitals-dashboard.json'
    }
  },
  validationHints: {
    localCommand: 'pnpm verify',
    protocolKinds: ['line-values', 'json-lines', 'tlv'],
    successSignals: {
      homeReady: '[data-ai="home-view"] is visible and [data-ai-command] links exist.',
      protocolView: '[data-ai="protocol-view"] is visible after opening /serial?tab=protocol.',
      protocolTestOutput: '[data-ai="protocol-test-output"] contains expected labels such as hr, spo2, bpm, or confidence.',
      terminalActivity: '[data-ai="terminal-log"] contains RX/TX entries after data is received or sent.',
      canvasActivity: 'Canvas widgets render and sidebar channel values are finite numbers.'
    },
    failureChecks: [
      'If Web Serial is unavailable, use WebSocket sources for demo and validation.',
      'If TLV output is empty, check magicWordHex, packetLengthOffset, tlvCountOffset, and whether TLV length includes its header.',
      'If browser automation cannot find text, use data-ai selectors instead of visible labels.'
    ]
  },
  aiLayout: {
    priority: 'AI automation first outside of the live visualization surface.',
    humanPrimaryZone: '[data-ai="home-live-preview"]',
    agentPrimaryZone: '[data-ai="home-ai-command-panel"]',
    endpointZone: '[data-ai="home-ai-endpoints"]',
    workflowZone: '[data-ai-layout="agent-workflow"]',
    responsiveContract: {
      desktop: 'Hero and live preview sit side by side; command and endpoint panels sit below.',
      tablet: 'Sections stack in source order while preserving data-ai selectors.',
      mobile: 'Navigation becomes a compact three-column control row; command rows wrap before truncating critical text.'
    }
  },
  aiCommands: [
    {
      id: 'demo.load',
      href: '/serial?tab=canvas',
      homeSelector: '[data-ai="load-demo-workspace"]',
      expectedUrl: '/serial?tab=canvas',
      precondition: 'None.',
      successSignal: '[data-ai^="canvas-widget-"] exists after clicking the demo loader.',
      outcome: 'Open a populated live dashboard suitable for first-run inspection and visual validation.'
    },
    {
      id: 'protocol.import',
      href: '/serial?tab=protocol',
      homeSelector: '[data-ai-command="protocol.import"]',
      expectedUrl: '/serial?tab=protocol',
      precondition: 'Read /ai/protocol-profile.schema.json and generate a JSON object only.',
      successSignal: '[data-ai="protocol-test-output"] shows parsed labels and values after clicking [data-ai="test-protocol"].',
      outcome: 'Open the protocol editor for import, testing, save, and apply actions.'
    },
    {
      id: 'terminal.inspect',
      href: '/serial?tab=terminal',
      homeSelector: '[data-ai-command="terminal.inspect"]',
      expectedUrl: '/serial?tab=terminal',
      precondition: 'Connect a Web Serial port or add a WebSocket source.',
      successSignal: 'Terminal log shows RX/TX rows and byte counters change.',
      outcome: 'Open raw serial or WebSocket receive/transmit inspection.'
    },
    {
      id: 'canvas.compose',
      href: '/serial?tab=canvas',
      homeSelector: '[data-ai-command="canvas.compose"]',
      expectedUrl: '/serial?tab=canvas',
      precondition: 'Parsed channels exist, or import /examples/workspaces/vitals-dashboard.json.',
      successSignal: 'At least one chart widget is visible and channel values are finite.',
      outcome: 'Open the dashboard canvas for human-facing live charts.'
    },
    {
      id: 'api.describe',
      href: '/api/mserial',
      homeSelector: '[data-ai-command="api.describe"]',
      expectedUrl: '/api/mserial',
      precondition: 'None.',
      successSignal: 'JSON response contains version, schemaVersion, examples, validationHints, and aiCommands.',
      outcome: 'Return this machine-readable API contract.'
    }
  ],
  protocolKinds: [
    {
      kind: 'line-values',
      label: '文本数值行',
      description: '适合 CSV、空格、制表符或分号分隔的逐行数值。'
    },
    {
      kind: 'json-lines',
      label: 'JSON Lines',
      description: '适合每行一个 JSON 对象，并从字段路径提取数值。'
    },
    {
      kind: 'tlv',
      label: 'TLV 二进制',
      description: '适合有 magic word、包长、TLV 类型和 payload 偏移的二进制协议。'
    }
  ]
}

export function GET() {
  return Response.json(metadata, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600'
    }
  })
}
