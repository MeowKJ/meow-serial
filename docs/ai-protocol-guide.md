# AI Protocol Extension Guide

This guide is for an AI or developer adding a new protocol to Meow Serial. It explains how the current project works and how to choose the smallest correct change.

## Project Shape

Meow Serial is a browser-based serial/WebSocket debugging app:

- `Canvas`: dashboard widgets that read numeric channels
- `Terminal`: raw RX/TX inspection and command sending
- `Protocols`: parser selection, protocol profile editing, and channel creation

The app is built with Vue 3, Pinia, Vite, and Tailwind. Protocol support is frontend-only and runs in the browser.

## Protocol Data Flow

Incoming bytes follow this path:

1. Transport manager receives bytes:
   - `src/utils/serialManager.js`
   - `src/utils/websocketManager.js`
2. The manager emits raw chunks through `onChunk` for terminal logging.
3. The manager emits parser input through `onData`.
4. `src/stores/ports.js` calls the active parser instance:

   ```js
   const snapshots = portState._parser.feed(data.raw)
   ```

5. Each snapshot should look like this:

   ```js
   {
     labels: ['BPM', 'confidence'],
     values: [16.8, 2.74],
     summary: 'optional short text for logs/debugging'
   }
   ```

6. `src/stores/serial.js` auto-creates or updates global channels from `labels` and `values`.
7. Widgets read those global channels.

## Parser Definition Contract

Parser definitions are registered in `src/utils/parserRegistry.js`. A parser definition has this shape:

```js
{
  id: 'stable-parser-id',
  name: 'Human readable name',
  description: 'What the parser expects',
  defaultBaudRate: 115200,
  defaultProtocol: 'raw', // or 'line'
  heldChannels: [],
  heldWindowMs: 0,
  channelLabels: ['known', 'labels'], // optional but recommended
  builtin: true,
  createInstance(config = {}) {
    return {
      feed(bytes) {
        return []
      },
      reset() {}
    }
  }
}
```

Important details:

- `id` must be stable because saved workspaces refer to it.
- `defaultProtocol: 'raw'` passes byte chunks directly to `feed`.
- `defaultProtocol: 'line'` makes the manager buffer until newline and pass complete lines.
- `feed(bytes)` may return zero, one, or many snapshots.
- Stateful binary parsers should keep an internal `Uint8Array` buffer and clear it in `reset`.
- Only finite numbers should be emitted as real values. Use `Number.NaN` for intentionally missing held values.
- `heldChannels` is useful when a packet sometimes omits a value but the UI should keep the last valid value briefly.

## Recommended AI Workflow

The preferred workflow is not to edit source code first. Meow Serial already supports exporting and importing protocol JSON from the Protocols page, so an AI should usually generate a protocol JSON document that the user can import.

When the site is deployed, AI agents can discover this workflow from `/llms.txt`, `/.well-known/mserial-ai.json`, and `/ai/custom-parser-primer.json`. The machine-readable JSON Schema is published at `/ai/protocol-profile.schema.json`.

If the user only gives an AI `https://s.mpas.top`, the AI should still infer that Meow Serial is an advanced custom parser workflow. It should read the public AI files before answering, then generate an importable protocol JSON profile instead of giving generic serial-terminal advice.

Use this order:

1. Ask the user for the protocol document, sample frames, field table, or device manual excerpt.
2. Decide whether the protocol fits `line-values`, `json-lines`, or `tlv`.
3. Generate a single JSON object matching the profile schema in this guide.
4. Tell the user to import it from the Protocols page with `导入 JSON`.
5. Use the Protocols page `测试解析` box with sample input before connecting real hardware.
6. Only change source code if the protocol cannot fit the JSON profile schema.

Good AI output should be import-ready JSON, with no comments inside the JSON.

### Prompt Template For Generating Protocol JSON

Give this to a new AI when you want it to generate a protocol profile:

```text
You are generating an importable Meow Serial protocol JSON profile.

Return only one valid JSON object. Do not include comments or Markdown.

The profile must use one of these kinds:
- line-values
- json-lines
- tlv

Use these constraints:
- name: short protocol name
- description: concise explanation
- defaultBaudRate: numeric baud rate
- heldChannels: channel names that should keep the last valid value briefly
- heldWindowMs: hold window in milliseconds
- For line-values, fill line.separatorPattern and line.channelNames.
- For json-lines, fill json.fieldPaths. Use dotted paths for nested fields.
- For tlv, fill tlv.magicWordHex, headerSize, packetLengthOffset, packetLengthType, packetLengthEndian, tlvCountOffset, tlvCountType, tlvCountEndian, tlvHeaderSize, tlvTypeOffset, tlvTypeType, tlvLengthOffset, tlvLengthType, tlvHeaderEndian, tlvLengthIncludesHeader, and tlv.mappings.
- TLV mappings must use label, tlvType, valueOffset, valueType, endian, scale, and unit.
- Supported numeric value types: u8, i8, u16, i16, u32, i32, f32, f64.

Device/protocol information:
[paste protocol manual, field table, sample frames, and expected values here]
```

### Importable JSON Rules

The Protocols page import path goes through `normalizeUserProtocolProfile`, so it is forgiving about missing optional fields, but a good generated profile should still include the fields relevant to its kind.

Do:

- Return a single JSON object.
- Use double quotes, no trailing commas, and no comments.
- Use decimal numbers for offsets, sizes, type IDs, scale, and baud rate.
- Use spaced uppercase hex for `magicWordHex`, for example `02 01 04 03 06 05 08 07`.
- Use stable human-readable labels because those labels become widget channel names.

Avoid:

- Markdown around the JSON when the user wants to import directly.
- JavaScript expressions such as `0x3E9`; use `1001` instead.
- Units inside numeric values; put units in `unit`.
- Inventing fields that are not supported by the schema.

## Decision Tree

Use an importable protocol JSON profile if the protocol is one of these:

- Text line of numbers: `12.3, 45.6, 78.9`
- JSON line with numeric fields: `{"bpm":16.8,"confidence":2.74}`
- Binary packet with magic word, packet length, TLV headers, and numeric fields at fixed payload offsets

Add a custom code parser only if:

- Packet length is computed by checksum, escape decoding, varint, or another custom rule.
- Frames use byte stuffing or nested structures.
- One TLV contains arrays, matrices, compressed values, bitfields, or non-fixed offsets.
- Output channels need derived calculations across packets.
- The protocol needs custom validation, checksum, or resynchronization.

## Adding A JSON Profile Protocol

Profiles are defined in `src/utils/protocolProfiles.js`, imported/exported from `src/components/ProtocolView.vue`, and executed by `src/parsers/profileParserFactory.js`.

Profile IDs become parser IDs through:

```js
profile:<profile-id>
```

Profiles are stored in browser localStorage under `meow_serial_protocol_profiles`, and exported workspaces include them as `protocolProfiles`.

### Text Numeric Lines

Use this when each line contains separated numeric fields.

```json
{
  "name": "Example CSV Sensor",
  "description": "Three numeric fields per line: temperature, humidity, pressure.",
  "kind": "line-values",
  "defaultBaudRate": 115200,
  "heldChannels": [],
  "heldWindowMs": 0,
  "line": {
    "separatorPattern": "[,\\t; ]+",
    "channelNames": ["temperature", "humidity", "pressure"]
  }
}
```

Import this JSON from the Protocols page, then test with:

```text
23.5, 48.1, 101.3
```

### JSON Lines

Use this when each line is a JSON object.

```json
{
  "name": "Example JSON Sensor",
  "description": "One JSON object per line.",
  "kind": "json-lines",
  "defaultBaudRate": 115200,
  "heldChannels": ["bpm"],
  "heldWindowMs": 3000,
  "json": {
    "fieldPaths": ["bpm", "confidence", "data.temperature"]
  }
}
```

If `fieldPaths` is empty, all top-level numeric fields are emitted.

Import this JSON from the Protocols page, then test with:

```json
{"bpm":16.8,"confidence":2.74,"data":{"temperature":36.5}}
```

### Generic Binary TLV

Use this when a packet has a fixed header, packet length field, optional TLV count, and repeated TLV records.

```json
{
  "name": "Example TLV Device",
  "description": "Binary TLV packet with float values.",
  "kind": "tlv",
  "defaultBaudRate": 921600,
  "heldChannels": ["BPM", "confidence"],
  "heldWindowMs": 3000,
  "tlv": {
    "magicWordHex": "02 01 04 03 06 05 08 07",
    "headerSize": 40,
    "packetLengthOffset": 12,
    "packetLengthType": "u32",
    "packetLengthEndian": "little",
    "tlvCountOffset": 32,
    "tlvCountType": "u32",
    "tlvCountEndian": "little",
    "tlvHeaderSize": 8,
    "tlvTypeOffset": 0,
    "tlvTypeType": "u32",
    "tlvLengthOffset": 4,
    "tlvLengthType": "u32",
    "tlvHeaderEndian": "little",
    "tlvLengthIncludesHeader": false,
    "mappings": [
      {
        "label": "BPM",
        "tlvType": 1001,
        "valueOffset": 0,
        "valueType": "f32",
        "endian": "little",
        "scale": 1,
        "unit": "bpm"
      },
      {
        "label": "confidence",
        "tlvType": 1001,
        "valueOffset": 4,
        "valueType": "f32",
        "endian": "little",
        "scale": 1,
        "unit": ""
      }
    ]
  }
}
```

Supported value types are `u8`, `i8`, `u16`, `i16`, `u32`, `i32`, `f32`, and `f64`.

Import this JSON from the Protocols page, then test with a complete packet as spaced hex bytes. The packet must include the magic word if `magicWordHex` is configured, enough header bytes for the configured offsets, and enough TLV payload bytes for each mapping.

## Adding A Custom Code Parser

Create a new file in `src/parsers`, for example `src/parsers/myDeviceParser.js`.

```js
const concatBytes = (left, right) => {
  const merged = new Uint8Array(left.length + right.length)
  merged.set(left)
  merged.set(right, left.length)
  return merged
}

export const myDeviceParser = {
  id: 'my-device',
  name: 'My Device',
  description: 'Custom binary frames for My Device',
  defaultBaudRate: 115200,
  defaultProtocol: 'raw',
  heldChannels: [],
  heldWindowMs: 0,
  channelLabels: ['temperature', 'humidity'],
  builtin: true,

  createInstance() {
    let buffer = new Uint8Array(0)

    return {
      feed(bytes) {
        buffer = concatBytes(buffer, bytes)
        const snapshots = []

        while (buffer.length >= 8) {
          if (buffer[0] !== 0xaa || buffer[1] !== 0x55) {
            buffer = buffer.slice(1)
            continue
          }

          const frameLength = buffer[2]
          if (frameLength < 8) {
            buffer = buffer.slice(1)
            continue
          }
          if (buffer.length < frameLength) break

          const frame = buffer.slice(0, frameLength)
          const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
          const temperature = view.getInt16(3, true) / 100
          const humidity = view.getUint16(5, true) / 100

          snapshots.push({
            labels: ['temperature', 'humidity'],
            values: [temperature, humidity],
            summary: `T=${temperature}, H=${humidity}`
          })

          buffer = buffer.slice(frameLength)
        }

        return snapshots
      },

      reset() {
        buffer = new Uint8Array(0)
      }
    }
  }
}
```

Then register it in `src/parsers/index.js`:

```js
import { clearParsers, registerParser } from '../utils/parserRegistry'
import { loadUserProtocolProfiles } from '../utils/protocolProfiles'
import { createProtocolParserDefinition } from './profileParserFactory'
import { rawParser } from './rawParser'
import { myDeviceParser } from './myDeviceParser'

export const syncRegisteredParsers = () => {
  clearParsers()
  registerParser(rawParser)
  registerParser(myDeviceParser)

  for (const profile of loadUserProtocolProfiles()) {
    registerParser(createProtocolParserDefinition(profile))
  }
}
```

If you register legacy parser files such as `csvParser`, `jsonParser`, `justfloatParser`, or `mmwaveBreathParser`, import and register them the same way. At the time this guide was written, only `raw` and user profiles are registered by default.

## Updating The Protocol UI

Most new protocols do not need UI changes. Update `src/components/ProtocolView.vue` only when adding a new profile `kind` or a new profile field.

If adding a new profile kind:

1. Add the kind to `SUPPORTED_PROTOCOL_KINDS` in `src/utils/protocolProfiles.js`.
2. Add defaults in `createEmptyProtocolProfile`.
3. Normalize the new fields in `normalizeUserProtocolProfile`.
4. Add parser creation logic in `src/parsers/profileParserFactory.js`.
5. Add labels, descriptions, form controls, and test input handling in `ProtocolView.vue`.
6. Make sure `channelLabels` can be derived for auto-created channels.

## AI-Friendly Protocol Documents

`src/utils/protocolDocument.js` can already convert protocol profiles to and from an AI-editable Markdown/JSON document:

- `stringifyProtocolDocument(profile)`
- `parseProtocolDocument(input)`

The helper accepts either raw JSON or a Markdown document containing a fenced JSON block. It currently supports the profile schema and also maps `tlv.fields` to `tlv.mappings`.

If the product needs an "AI document import/export" UI, this helper is the intended starting point.

## Verification Checklist

After adding or changing protocol support:

1. Run a production build:

   ```bash
   pnpm build
   ```

2. In the app, open the Protocols tab and confirm the parser appears in the protocol library.
3. Apply the parser to a port and confirm the port baud rate changes if `defaultBaudRate` is set.
4. Feed representative data through the Protocols test box for profile-based protocols.
5. Confirm global channels appear in the sidebar with the expected labels.
6. Confirm Canvas widgets can bind to those channels and update values.
7. Export a workspace JSON and check that `ports[].parserId` and `protocolProfiles` are preserved.

## Common Failure Modes

- Parser does not appear: it was not registered in `src/parsers/index.js`, or registration was overwritten by `clearParsers`.
- Saved workspace falls back to Raw: parser ID changed or the parser is no longer registered before stores initialize.
- No parsed channels appear: `feed` returned an empty array, values were not finite numbers, or labels are missing/mismatched.
- Binary parser loses frames: internal buffering/resynchronization is incomplete.
- Text parser receives partial lines: use `defaultProtocol: 'line'` when newline framing is required.
- Terminal looks quiet on high baud rates: ports above `460800` baud default to silent terminal RX, but parsing continues.
