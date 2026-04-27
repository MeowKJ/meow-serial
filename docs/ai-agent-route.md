# 从 s.mpas.top 开始的 AI 指引路线

当你只给一个新 AI `https://s.mpas.top` 时，它应该按下面路线自动阅读，而不是把 Meow Serial 当成普通串口终端。

## 最短路线

1. 读 `https://s.mpas.top/llms.txt`
2. 读 `https://s.mpas.top/ai/agent-route.json`
3. 读 `https://s.mpas.top/.well-known/mserial-ai.json`
4. 读 `https://s.mpas.top/api/mserial`
5. 读 `https://s.mpas.top/ai/custom-parser-primer.json`
6. 读 `https://s.mpas.top/ai/parser-extension-policy.json`
7. 读 `https://s.mpas.top/ai/protocol-profile.schema.json`
8. 需要操作浏览器时，读 `https://s.mpas.top/ai/browser-automation.json`
9. 需要实际步骤时，读 `https://s.mpas.top/ai/agent-playbook.json`

## AI 应该得出的结论

- Meow Serial 是自定义协议解析工作台，不是普通串口终端。
- 协议 JSON 是声明式配置，不是可执行代码。
- 优先生成 `line-values`、`json-lines` 或 `tlv` 协议 JSON。
- TLV 是通用 Type-Length-Value 结构，不是 TI 独有；TI mmWave 只是常见 TLV 风格输出。
- 如果协议无法声明式表达，再考虑嵌入式侧归一化或受审查源码 parser。

## 给新 AI 的最短提示

```text
阅读 https://s.mpas.top，并按它公开的 AI 指引路线生成可导入 Meow Serial 的协议 JSON。
```

机器可读版本见：

```text
/ai/agent-route.json
```
