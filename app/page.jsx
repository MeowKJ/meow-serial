import { getFluentEmojiUrl } from '@meowkj/fluent-emoji-assets'

const aiEndpoints = [
  '/llms.txt',
  '/.well-known/mserial-ai.json',
  '/ai/protocol-profile.schema.json',
  '/ai/browser-automation.json',
  '/api/mserial'
]

const featureCards = [
  {
    title: 'AI 生成协议 JSON',
    desc: '把设备手册、字段表或样例帧交给 AI，导入生成的协议 JSON 后即可测试解析。',
    href: '/serial?tab=protocol',
    action: '导入协议 JSON'
  },
  {
    title: '串口与 WebSocket 调试',
    desc: '先看终端收发，再决定协议字段，避免一开始就被复杂图表打断。',
    href: '/serial?tab=terminal',
    action: '查看终端'
  },
  {
    title: '实时通道看板',
    desc: '解析后的字段会自动成为通道，可绑定到波形图、数值卡片和仪表盘。',
    href: '/serial',
    action: '搭建看板'
  }
]

export default function HomePage() {
  const catUrl = getFluentEmojiUrl('cat')

  return (
    <main className="home-shell" data-ai="home-view">
      <section className="hero-band">
        <nav className="top-nav">
          <a className="brand" href="/">
            <img src={catUrl} alt="Win11 style cat head" width="32" height="32" />
            <span>Meow Serial</span>
          </a>
          <a className="secondary-link" href="/serial" data-ai="home-enter-serial">
            进入串口工作台
          </a>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-title-row">
              <div className="cat-mark">
                <img src={catUrl} alt="Win11 style cat head" width="78" height="78" />
              </div>
              <div>
                <div className="eyebrow">Meow Serial</div>
                <h1>AI 友好的串口调试工作台</h1>
              </div>
            </div>
            <p>
              用浏览器连接串口或 WebSocket，确认原始收发数据，再把 AI 生成的协议 JSON
              导入为可视化通道。从协议验证到实时看板，尽量少绕路。
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="/serial?tab=protocol" data-ai="home-open-protocol">
                导入协议 JSON
              </a>
              <a className="secondary-action" href="/serial?tab=terminal" data-ai="home-open-terminal">
                查看终端
              </a>
              <a className="secondary-action" href="/serial" data-ai="home-open-canvas">
                搭建看板
              </a>
            </div>
          </div>

          <aside className="api-card">
            <h2>公开给 AI 的入口</h2>
            <div className="endpoint-list">
              {aiEndpoints.map((endpoint) => (
                <code key={endpoint}>{endpoint}</code>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="feature-grid">
        {featureCards.map((card) => (
          <article key={card.title} className="feature-card">
            <h2>{card.title}</h2>
            <p>{card.desc}</p>
            <a href={card.href}>{card.action}</a>
          </article>
        ))}
      </section>

      <section className="workflow-panel">
        <div className="workflow-heading">
          <h2>AI 协议工作流</h2>
          <p>设备资料到协议 JSON，再到命名通道和实时控件。</p>
        </div>
        <img src="/images/ai-protocol-workflow.png" alt="Meow Serial AI protocol workflow" />
      </section>
    </main>
  )
}
