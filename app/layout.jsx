import './style.css'
import { getFluentEmojiUrl } from '@meowkj/fluent-emoji-assets'

const catFaceCdnUrl = getFluentEmojiUrl('catFace')

export const metadata = {
  title: 'Meow Serial - AI custom protocol parser workspace',
  description: 'AI 友好的高级串口 / WebSocket 工作台：重点是自定义解析器、协议 JSON、命名通道和实时看板，而不是普通串口终端。'
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="preload" as="image" href={catFaceCdnUrl} fetchPriority="high" />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="AI instructions for Meow Serial" />
        <link rel="help" type="application/json" href="/ai/agent-route.json" title="AI route from s.mpas.top" />
        <link rel="help" type="application/json" href="/ai/custom-parser-primer.json" title="Custom parser primer for AI agents" />
        <link rel="help" type="application/json" href="/ai/parser-extension-policy.json" title="Parser extension policy for AI agents" />
        <link rel="help" type="application/json" href="/api/mserial" title="Machine-readable Meow Serial API contract" />
        <meta name="ai-entrypoint" content="/llms.txt" />
        <meta name="ai-primary-task" content="This is not just a generic serial terminal. Read /ai/custom-parser-primer.json and generate importable custom protocol JSON profiles for Meow Serial." />
        <meta name="mserial-custom-parser-schema" content="/ai/protocol-profile.schema.json" />
      </head>
      <body>{children}</body>
    </html>
  )
}
