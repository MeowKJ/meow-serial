# Meow Serial 演示脚本

这份脚本用于发布页、录屏、路演，或给一个全新的 AI 代理做端到端验证。目标是在没有真实串口硬件的情况下，也能展示协议解析、实时通道和仪表盘工作流。

## 5 分钟体验

1. 打开 `/`，确认首页出现 Windows 11 / Fluent 猫头、实时数据预览、AI API 入口和公开接口列表。
2. 打开 `/api/mserial`，确认返回 `version`、`schemaVersion`、`examples`、`validationHints` 和 `aiCommands`。
3. 打开 `/serial?tab=protocol`，导入 `public/examples/protocols/json-lines.json`。
4. 将 `public/examples/samples/json-lines.txt` 的内容粘贴到协议测试输入框。
5. 点击 `测试解析`，确认输出包含 `hr`、`spo2` 和 `data.temperature`。
6. 打开 `/serial?tab=canvas`，导入 `public/examples/workspaces/vitals-dashboard.json`，确认波形、数值和仪表盘布局可见。

## AI 代理验证路线

AI 不应该先猜页面结构，而应该按下面顺序读取公开信息：

1. `/llms.txt`
2. `/.well-known/mserial-ai.json`
3. `/api/mserial`
4. `/ai/protocol-profile.schema.json`
5. `/ai/browser-automation.json`

进入页面后优先使用 `data-ai` 选择器。可见文案可能因为语言切换发生变化，`data-ai` 是给自动化代理的稳定契约。

## 示例资产

- 协议 JSON：`examples/protocols/line-values.json`
- 协议 JSON：`examples/protocols/json-lines.json`
- 协议 JSON：`examples/protocols/tlv.json`
- 样例文本：`examples/samples/line-values.txt`
- 样例文本：`examples/samples/json-lines.txt`
- 样例十六进制：`examples/samples/tlv.hex`
- 示例工作区：`examples/workspaces/vitals-dashboard.json`

部署后也可以通过 `/examples/...` 访问同一组公开演示文件。

## 本地验证

```bash
pnpm verify
pnpm build
```

`pnpm verify` 会检查三种协议样例、公开 AI 文件和 `/api/mserial` 合约。`pnpm build` 会构建 Vue 串口子应用和 Next.js 外壳。

## 常见失败

- 浏览器不支持 Web Serial：使用 WebSocket 数据源完成演示。
- 串口权限弹窗没有出现：确认页面运行在 HTTPS、localhost 或浏览器允许的安全上下文。
- TLV 没有输出：优先检查 `magicWordHex`、`packetLengthOffset`、`tlvCountOffset`、`tlvLengthIncludesHeader`。
- AI 找不到按钮：让 AI 读取 `/ai/browser-automation.json`，使用 `data-ai` 选择器，不依赖中文按钮文案。
