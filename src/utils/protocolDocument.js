import { normalizeUserProtocolProfile } from './protocolProfiles'

const DOCUMENT_VERSION = 'meow-serial-protocol@1'

const cloneJson = (value) => JSON.parse(JSON.stringify(value))

const extractFirstJsonObject = (text) => {
  const start = text.indexOf('{')
  if (start < 0) {
    throw new Error('没有找到 JSON 对象，请粘贴协议 JSON 或带 ```json 代码块的文档')
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index++) {
    const char = text[index]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') {
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return text.slice(start, index + 1)
      }
    }
  }

  throw new Error('JSON 对象不完整，请检查粘贴内容')
}

const extractJsonCandidate = (input) => {
  const text = String(input || '').trim()
  if (!text) {
    throw new Error('请先粘贴协议文档')
  }

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  if (text.startsWith('{') && text.endsWith('}')) {
    return text
  }

  return extractFirstJsonObject(text)
}

const toDocumentObject = (profileInput) => {
  const profile = normalizeUserProtocolProfile(profileInput)

  return {
    format: DOCUMENT_VERSION,
    name: profile.name,
    description: profile.description,
    kind: profile.kind,
    defaultBaudRate: profile.defaultBaudRate,
    heldChannels: profile.heldChannels,
    heldWindowMs: profile.heldWindowMs,
    line: {
      separatorPattern: profile.line.separatorPattern,
      channelNames: [...profile.line.channelNames]
    },
    json: {
      fieldPaths: [...profile.json.fieldPaths]
    },
    tlv: {
      magicWordHex: profile.tlv.magicWordHex,
      headerSize: profile.tlv.headerSize,
      packetLengthOffset: profile.tlv.packetLengthOffset,
      packetLengthType: profile.tlv.packetLengthType,
      packetLengthEndian: profile.tlv.packetLengthEndian,
      tlvCountOffset: profile.tlv.tlvCountOffset,
      tlvCountType: profile.tlv.tlvCountType,
      tlvCountEndian: profile.tlv.tlvCountEndian,
      tlvHeaderSize: profile.tlv.tlvHeaderSize,
      tlvTypeOffset: profile.tlv.tlvTypeOffset,
      tlvTypeType: profile.tlv.tlvTypeType,
      tlvLengthOffset: profile.tlv.tlvLengthOffset,
      tlvLengthType: profile.tlv.tlvLengthType,
      tlvHeaderEndian: profile.tlv.tlvHeaderEndian,
      tlvLengthIncludesHeader: profile.tlv.tlvLengthIncludesHeader,
      fields: profile.tlv.mappings.map(mapping => ({
        label: mapping.label,
        tlvType: mapping.tlvType,
        valueOffset: mapping.valueOffset,
        valueType: mapping.valueType,
        endian: mapping.endian,
        scale: mapping.scale,
        unit: mapping.unit
      }))
    }
  }
}

export const stringifyProtocolDocument = (profileInput) => {
  const docObject = toDocumentObject(profileInput)
  const json = JSON.stringify(docObject, null, 2)

  return [
    '# Meow Serial Protocol Document',
    '',
    '将下面的 JSON 交给 AI 修改后，可以整段粘贴回“协议喵 -> AI 文档配置”导入。',
    '如果只需要协议体，也可以只粘贴 ```json 代码块里的内容。',
    '',
    '```json',
    json,
    '```'
  ].join('\n')
}

export const parseProtocolDocument = (input) => {
  const jsonCandidate = extractJsonCandidate(input)
  const parsed = JSON.parse(jsonCandidate)

  const nextProfile = {
    name: parsed.name,
    description: parsed.description,
    kind: parsed.kind || parsed.type,
    defaultBaudRate: parsed.defaultBaudRate ?? parsed.baudRate,
    heldChannels: parsed.heldChannels ?? parsed.holdChannels,
    heldWindowMs: parsed.heldWindowMs ?? parsed.holdWindowMs,
    line: {
      separatorPattern: parsed.line?.separatorPattern ?? parsed.line?.separator,
      channelNames: parsed.line?.channelNames ?? parsed.line?.labels
    },
    json: {
      fieldPaths: parsed.json?.fieldPaths ?? parsed.json?.paths
    },
    tlv: {
      magicWordHex: parsed.tlv?.magicWordHex ?? parsed.tlv?.magicWord,
      headerSize: parsed.tlv?.headerSize,
      packetLengthOffset: parsed.tlv?.packetLengthOffset,
      packetLengthType: parsed.tlv?.packetLengthType,
      packetLengthEndian: parsed.tlv?.packetLengthEndian,
      tlvCountOffset: parsed.tlv?.tlvCountOffset,
      tlvCountType: parsed.tlv?.tlvCountType,
      tlvCountEndian: parsed.tlv?.tlvCountEndian,
      tlvHeaderSize: parsed.tlv?.tlvHeaderSize,
      tlvTypeOffset: parsed.tlv?.tlvTypeOffset,
      tlvTypeType: parsed.tlv?.tlvTypeType,
      tlvLengthOffset: parsed.tlv?.tlvLengthOffset,
      tlvLengthType: parsed.tlv?.tlvLengthType,
      tlvHeaderEndian: parsed.tlv?.tlvHeaderEndian,
      tlvLengthIncludesHeader: parsed.tlv?.tlvLengthIncludesHeader,
      mappings: cloneJson(parsed.tlv?.mappings ?? parsed.tlv?.fields ?? [])
    }
  }

  return normalizeUserProtocolProfile(nextProfile)
}
