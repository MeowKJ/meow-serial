const metadata = {
  name: 'Meow Serial',
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
  entryActions: [
    {
      label: '导入协议 JSON',
      target: '/serial?tab=protocol',
      description: '进入协议页，导入或测试 AI 生成的协议 JSON。'
    },
    {
      label: '查看终端',
      target: '/serial?tab=terminal',
      description: '查看串口或 WebSocket 的原始收发数据。'
    },
    {
      label: '搭建看板',
      target: '/serial?tab=canvas',
      description: '把解析后的命名通道绑定到实时控件。'
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
