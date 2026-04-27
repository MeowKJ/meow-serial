import './style.css'
import { getFluentEmojiUrl } from '@meowkj/fluent-emoji-assets'

const catFaceCdnUrl = getFluentEmojiUrl('catFace')

export const metadata = {
  title: 'Meow Serial',
  description: 'AI 友好的串口 / WebSocket 调试工作台'
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="preload" as="image" href={catFaceCdnUrl} fetchPriority="high" />
      </head>
      <body>{children}</body>
    </html>
  )
}
