# AI 友好度评分标准

这份标准给“第一次进入 Meow Serial 的新 AI”使用。目标不是让 AI 夸页面，而是让它能发现入口、操作页面、生成协议、验证结果，并诚实报告限制。

## 评分档位

- **S**：AI 可自主发现、操作、验证和复盘。没有真实硬件时也能加载示例看板完成闭环。
- **A**：主流程可自主完成，但某个次要页面、失败恢复或验证信号不完整。
- **B**：文档能读懂，但需要用户提示入口、样例或选择器。
- **C**：只有概念说明，浏览器操作和协议验证不稳定。
- **D**：缺少公开入口、Schema、选择器、样例或成功信号。

## S 档必须满足

1. 新 AI 先读 `/llms.txt`、`/ai/agent-route.json`、`/.well-known/mserial-ai.json`、`/ai/custom-parser-primer.json`、`/ai/parser-extension-policy.json`、`/api/mserial`。
2. 新 AI 明确知道 Meow Serial 不是普通串口终端，而是自定义解析器 + 协议 JSON + 命名通道 + 实时看板工作流。
3. 新 AI 能发现 `/ai/agent-scorecard.json` 并知道目标评分是 S。
4. 新 AI 能发现 `/ai/agent-playbook.json`，并按其中的操作剧本执行实际页面流程。
5. 新 AI 能用 `/ai/protocol-profile.schema.json` 生成可导入协议 JSON，并明白 `line-values`、`json-lines`、`tlv` 的选择边界。
6. 新 AI 知道协议 JSON 不能嵌入可执行解析代码；嵌入式侧代码应输出 JSON Lines、数值行或简单 TLV，再由 Meow Serial 解析。
7. 新 AI 能用 `/ai/browser-automation.json` 进入画布、终端、协议、控件面板和设置面板。
8. 没有硬件时，新 AI 能点击 `[data-ai="load-demo-workspace"]` 进入有图表、有通道、有终端日志的 demo 状态。
9. 新 AI 能用 `[data-ai="protocol-test-output"]`、`[data-ai^="canvas-widget-"]`、`[data-ai="terminal-log"]` 判断成功。
10. 新 AI 能运行或要求运行 `pnpm verify`，并说明未能真实浏览器操作时的不确定性。

## 当前自评

当前公开合同自评为 **S / 99**。协议 schema 已按 `line-values`、`json-lines`、`tlv` 收紧关键必填字段，剩余不确定性只保留给运行环境：如果某个 AI 的浏览器后端不可用，它必须诚实降级为“未能完成真实浏览器验证”，但这不代表网站缺少 AI 入口。

机器可读版本见：

```text
/ai/agent-scorecard.json
/ai/agent-playbook.json
/ai/agent-route.json
/ai/custom-parser-primer.json
/ai/parser-extension-policy.json
```
