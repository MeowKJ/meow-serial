# AI Handoff Guide

This project is a Vue 3 + Vite serial/WebSocket debugging workspace. The main user-facing areas are Canvas, Terminal, and Protocols. The Protocols area turns incoming bytes into named numeric channels that widgets can display.

## Fast Orientation

- App bootstrap: `src/main.js`
- Root layout/tabs: `src/App.vue`
- Port and transport state: `src/stores/ports.js`
- Global channels, widgets, workspace persistence: `src/stores/serial.js`
- Protocol UI: `src/components/ProtocolView.vue`
- Parser registry: `src/utils/parserRegistry.js`
- User protocol profile storage/schema: `src/utils/protocolProfiles.js`
- Profile-to-parser implementation: `src/parsers/profileParserFactory.js`
- Registered parser entrypoint: `src/parsers/index.js`

## Package Manager

Use pnpm for all dependency and script commands. The repo intentionally keeps `pnpm-lock.yaml` and should not add `package-lock.json` or `yarn.lock`.

## Protocol Data Path

1. A `SerialManager` or `WebSocketManager` receives raw bytes.
2. The active parser definition decides the manager packet mode through `defaultProtocol`.
3. `ports` store calls `portState._parser.feed(data.raw)`.
4. A parser returns snapshots shaped as `{ labels, values, summary? }`.
5. `serial` store maps labels and values into auto-created global channels.
6. Widgets consume those channels.

## Adding A Protocol

Prefer configuration before code:

- Use an importable/exportable protocol JSON profile when the device fits `line-values`, `json-lines`, or generic binary `tlv`. This is the primary AI workflow: generate JSON for the user to import from the Protocols page.
- Add a custom parser only when framing or field extraction cannot be represented by the profile schema.

Detailed instructions, templates, and verification steps live in `docs/ai-protocol-guide.md`.

## Current Gotchas

- `src/parsers/index.js` currently registers only `raw` plus user profiles loaded from localStorage. Some legacy parser files exist (`csvParser`, `jsonParser`, `justfloatParser`, `mmwaveBreathParser`) but are not registered unless you explicitly import and register them.
- Parser IDs stored in workspaces must remain stable. Changing an ID can make saved ports fall back to `raw`.
- `defaultProtocol: 'line'` causes manager-level newline buffering; `defaultProtocol: 'raw'` passes byte chunks directly to the parser.
- If a parser can declare its channel names up front, expose `channelLabels`; this lets the UI create channels before the first packet arrives.
- Run `pnpm build` after code changes. There is no test script in `package.json` at the moment.
