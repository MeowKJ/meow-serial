# AI Public API

Meow Serial is deployed on Vercel with Next.js. The public homepage is served by Next.js, the serial workspace is built as a Vue sub-application under `/serial`, and the AI-facing API is exposed through both public metadata files and a Next.js API route.

## Published Files

- `/llms.txt`: human-readable AI overview and minimal workflow
- `/ai/agent-route.json`: shortest machine-readable route for agents starting from `https://s.mpas.top`
- `/.well-known/mserial-ai.json`: machine-readable app manifest
- `/ai/custom-parser-primer.json`: short machine-readable warning that Meow Serial is a custom protocol parser workflow, not a generic serial terminal
- `/ai/parser-extension-policy.json`: machine-readable boundary between declarative protocol JSON, embedded-side normalization code, and reviewed browser parser modules
- `/ai/agent-scorecard.json`: S/A/B/C/D AI-readiness rubric for a new agent
- `/ai/agent-playbook.json`: executable new-agent workflow for custom JSON, browser operation, and success signals
- `/ai/protocol-profile.schema.json`: JSON Schema for importable protocol profiles
- `/ai/browser-automation.json`: stable selector map for browser agents
- `/api/mserial`: dynamic Next.js API route with app metadata used by the landing page and AI agents

## How An AI Should Use The Site

1. Fetch `/llms.txt`.
2. Fetch `/ai/agent-route.json`.
3. Fetch `/.well-known/mserial-ai.json`.
4. Fetch `/ai/custom-parser-primer.json` so the site is not mistaken for a plain serial terminal.
5. Fetch `/ai/parser-extension-policy.json` before recommending executable parser code.
6. Fetch `/api/mserial` and confirm `agentReadiness.grade` is `S`.
7. Fetch `/ai/agent-scorecard.json` before assigning an S/A/B/C/D grade.
8. Fetch `/ai/agent-playbook.json` before executing browser operations or choosing a custom protocol JSON kind.
9. Fetch `/ai/protocol-profile.schema.json` before generating a protocol JSON profile.
10. If controlling the UI, fetch `/ai/browser-automation.json` and use `data-ai` selectors.
11. Use `/serial`, `/serial?tab=terminal`, or `/serial?tab=protocol` for direct app navigation.

If an external AI only receives `https://s.mpas.top`, it should infer that the site itself contains the instructions. It should read the public AI files and describe Meow Serial as an advanced custom parser workspace.

## Protocol Generation Rule

When the user asks an AI to support a device protocol, the AI should first generate an importable protocol JSON profile. Source code changes are the fallback, not the default.

Protocol JSON is data, not executable code. If the user asks for embedded parser code, the preferred design is firmware-side normalization: make the device emit JSON Lines, separated numeric values, or a simple TLV frame, then import a matching Meow Serial protocol profile. Browser-side source parser modules should be reviewed code changes, not code strings inside imported JSON.

The generated JSON should use one of:

- `line-values`
- `json-lines`
- `tlv`

## Browser Automation Rule

Browser agents should prefer selectors like `[data-ai="protocol-name"]` instead of visible labels. Visible labels may change with locale; `data-ai` selectors are intended to stay stable.

The practical operation order is published in `/ai/agent-playbook.json`. It ties each recipe to real selectors and success signals, so documentation and browser operation stay aligned.

## Workspace JSON

The global workspace JSON can be exported with `[data-ai="export-workspace"]`, imported from a local file with `[data-ai="import-workspace"]`, or imported from an online URL with `[data-ai="import-workspace-url"]`.

Repository-hosted JSON can also be loaded directly:

```text
/serial?workspace=/examples/workspaces/vitals-dashboard.json
```

This imports ports, protocol profiles, channels, widgets, canvas settings, theme, and UI language.

## File Sending

The line-by-line file sender is exposed through stable selectors:

```text
[data-ai="sidebar-send-file"]
[data-ai="send-file-port-select"]
[data-ai="send-file-delay-ms"]
[data-ai="send-file-input"]
[data-ai="send-file-start"]
```

Sending data to a connected device is a side-effectful action, so an AI should confirm user intent before pressing `[data-ai="send-file-start"]`.

## AI Readiness Score

The current target and self-assessment are published in `/ai/agent-scorecard.json`.

S means a new AI can discover the app, understand supported protocol kinds, load a no-hardware demo, operate the canvas/terminal/protocol surfaces, verify success signals, and honestly report environment limitations.
