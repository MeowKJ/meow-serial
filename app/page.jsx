import { getFluentEmojiUrl } from '@meowkj/fluent-emoji-assets'

const endpoints = [
  { label: 'LLM 入口', value: '/llms.txt' },
  { label: '站点 Manifest', value: '/.well-known/mserial-ai.json' },
  { label: '能力清单', value: '/api/mserial' },
  { label: '协议 Schema', value: '/ai/protocol-profile.schema.json' },
  { label: '浏览器自动化', value: '/ai/browser-automation.json' }
]

const commands = [
  { key: 'protocol.import', label: '生成并导入协议 JSON', href: '/serial?tab=protocol' },
  { key: 'terminal.inspect', label: '查看原始 RX / TX 流', href: '/serial?tab=terminal' },
  { key: 'canvas.compose', label: '把通道放到实时看板', href: '/serial?tab=canvas' },
  { key: 'api.describe', label: '读取 AI 操作合约', href: '/api/mserial' }
]

const channels = [
  { name: 'heart_rate', value: '74', unit: 'bpm', trend: '+2.4%' },
  { name: 'spo2', value: '98.2', unit: '%', trend: 'stable' },
  { name: 'temperature', value: '36.7', unit: 'C', trend: '-0.1' }
]

const aiSteps = [
  '读取 /llms.txt 确认入口',
  '请求 /api/mserial 获取能力和命令',
  '按 Schema 生成协议 JSON',
  '用 data-ai 选择器进入协议页测试',
  '把可视通道交给人类看板'
]

const experienceModes = [
  { label: '人类交互', value: '实时图表 / 终端发送 / 工作区导入' },
  { label: 'AI 交互', value: 'API 索引 / Schema / data-ai 选择器' },
  { label: '初次体验', value: '示例协议 / 样例数据 / verify 闭环' }
]

export default function HomePage() {
  const catFaceUrl = getFluentEmojiUrl('catFace')

  return (
    <main className="home-shell" data-ai="home-view">
      <header className="top-bar" data-ai="home-topbar">
        <a className="brand" href="/" aria-label="Meow Serial 首页" data-ai="home-brand">
          <img src={catFaceUrl} alt="Microsoft Fluent / Windows 11 cat face" width="34" height="34" loading="eager" decoding="sync" fetchPriority="high" />
          <span>Meow Serial</span>
        </a>
        <nav className="nav-actions" aria-label="主要入口">
          <a href="/api/mserial" data-ai="home-open-api">
            AI API
          </a>
          <a href="/serial?tab=protocol" data-ai="home-open-protocol">
            协议
          </a>
          <a className="nav-primary" href="/serial" data-ai="home-enter-serial">
            打开工作台
          </a>
        </nav>
      </header>

      <section className="hero-section" data-ai-layout="hero">
        <div className="hero-copy">
          <div className="cat-orbit" aria-hidden="true">
            <span className="cat-speech">demo ready</span>
            <span className="paw-dot paw-dot-a"></span>
            <span className="paw-dot paw-dot-b"></span>
            <img src={catFaceUrl} alt="" width="88" height="88" loading="eager" decoding="sync" fetchPriority="high" />
          </div>
          <p className="eyebrow">AI-first serial workspace</p>
          <h1>给人类看实时图表，给 AI 留完整操作空间。</h1>
          <p className="hero-lede">
            Meow Serial 把串口、WebSocket、协议 JSON、实时通道和可视化看板放在同一个浏览器工作流里。
            人类负责观察波形和状态，AI 负责读 API、生成协议、操作页面、验证解析结果。
          </p>
          <div className="experience-modes" data-ai="home-experience-modes">
            {experienceModes.map((mode) => (
              <article key={mode.label}>
                <span>{mode.label}</span>
                <strong>{mode.value}</strong>
              </article>
            ))}
          </div>
          <div className="hero-actions" data-ai="home-primary-actions">
            <a className="primary-action" href="/serial?tab=protocol" data-ai="home-start-protocol">
              生成协议工作流
            </a>
            <a className="secondary-action" href="/serial?tab=canvas" data-ai="home-start-canvas">
              查看实时看板
            </a>
          </div>
        </div>

        <div className="console-frame" data-ai="home-live-preview" aria-label="实时信息图表预览">
          <div className="console-top">
            <span></span>
            <span></span>
            <span></span>
            <code>mserial://live-dashboard</code>
          </div>
          <div className="demo-ribbon" aria-hidden="true">
            <span>Human view</span>
            <span>AI ready</span>
            <span>Demo data live</span>
          </div>
          <div className="serial-status" aria-label="串口状态预览">
            <span>WS JSON 行</span>
            <span>115200 baud</span>
            <span>RX 2.4 KB/s</span>
            <span>TX 13 B</span>
          </div>
          <div className="telemetry-grid">
            {channels.map((channel) => (
              <article className="metric-tile" key={channel.name}>
                <span>{channel.name}</span>
                <strong>
                  {channel.value}
                  <small>{channel.unit}</small>
                </strong>
                <em>{channel.trend}</em>
              </article>
            ))}
          </div>
          <div className="wave-panel" aria-hidden="true">
            <div className="wave-line wave-line-a"></div>
            <div className="wave-line wave-line-b"></div>
            <div className="cursor-line"></div>
          </div>
          <div className="event-stream" data-ai="home-event-stream">
            <div>
              <b>RX</b>
              <code>{'{"hr":74,"spo2":98.2,"temp":36.7}'}</code>
            </div>
            <div>
              <b>AI</b>
              <code>schema.validated - 3 channels mapped</code>
            </div>
            <div>
              <b>UI</b>
              <code>canvas widgets receiving named values</code>
            </div>
          </div>
        </div>
      </section>

      <section className="operation-section" data-ai-layout="ai-operations">
        <div className="command-panel" data-ai="home-ai-command-panel">
          <div className="section-kicker">AI command surface</div>
          <h2>自动化代理优先读这里</h2>
          <div className="command-list">
            {commands.map((command) => (
              <a href={command.href} key={command.key} data-ai-command={command.key}>
                <code>{command.key}</code>
                <span>{command.label}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="endpoint-panel" data-ai="home-ai-endpoints">
          <div className="section-kicker">Machine readable</div>
          <h2>公开接口</h2>
          <div className="endpoint-list">
            {endpoints.map((endpoint) => (
              <a href={endpoint.value} key={endpoint.value} data-ai-endpoint={endpoint.value}>
                <span>{endpoint.label}</span>
                <code>{endpoint.value}</code>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="agent-section" data-ai-layout="agent-workflow">
        <div>
          <div className="section-kicker">Agent route</div>
          <h2>一位新 AI 应该怎样使用这个网站</h2>
        </div>
        <ol className="agent-steps">
          {aiSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="workflow-strip" data-ai="home-workflow-image">
        <div>
          <div className="section-kicker">Protocol profile</div>
          <h2>协议资料到实时通道</h2>
          <p>已有流程图保留为辅助材料；实际自动化入口以前面的 API 和选择器为准。</p>
        </div>
        <img src="/images/ai-protocol-workflow.png" alt="Meow Serial AI protocol workflow" />
      </section>
    </main>
  )
}
