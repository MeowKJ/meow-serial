# AI Public API

Meow Serial is deployed on Vercel with Next.js. The public homepage is served by Next.js, the serial workspace is built as a Vue sub-application under `/serial`, and the AI-facing API is exposed through both public metadata files and a Next.js API route.

## Published Files

- `/llms.txt`: human-readable AI overview and minimal workflow
- `/.well-known/mserial-ai.json`: machine-readable app manifest
- `/ai/protocol-profile.schema.json`: JSON Schema for importable protocol profiles
- `/ai/browser-automation.json`: stable selector map for browser agents
- `/api/mserial`: dynamic Next.js API route with app metadata used by the landing page and AI agents

## How An AI Should Use The Site

1. Fetch `/llms.txt`.
2. Fetch `/.well-known/mserial-ai.json`.
3. Fetch `/ai/protocol-profile.schema.json` before generating a protocol JSON profile.
4. If controlling the UI, fetch `/ai/browser-automation.json` and use `data-ai` selectors.
5. Use `/serial`, `/serial?tab=terminal`, or `/serial?tab=protocol` for direct app navigation.

## Protocol Generation Rule

When the user asks an AI to support a device protocol, the AI should first generate an importable protocol JSON profile. Source code changes are the fallback, not the default.

The generated JSON should use one of:

- `line-values`
- `json-lines`
- `tlv`

## Browser Automation Rule

Browser agents should prefer selectors like `[data-ai="protocol-name"]` instead of visible labels. Visible labels may change with locale; `data-ai` selectors are intended to stay stable.
