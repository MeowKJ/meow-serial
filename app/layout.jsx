import './style.css'

export const metadata = {
  title: 'Meow Serial',
  description: 'AI 友好的串口 / WebSocket 调试工作台'
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
