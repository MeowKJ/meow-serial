import { normalizeUserProtocolProfile, toProtocolParserId } from '../utils/protocolProfiles'

const MAX_TLV_PACKET_SIZE = 1024 * 1024
const decoder = new TextDecoder()

const concatUint8Arrays = (left, right) => {
  const merged = new Uint8Array(left.length + right.length)
  merged.set(left)
  merged.set(right, left.length)
  return merged
}

const parseHexBytes = (value) => {
  const compact = String(value || '')
    .replace(/0x/gi, '')
    .replace(/[^0-9a-f]/gi, '')

  if (!compact || compact.length % 2 !== 0) return new Uint8Array(0)

  const bytes = new Uint8Array(compact.length / 2)
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = parseInt(compact.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

const findMagicWord = (buffer, magicWord) => {
  if (!magicWord?.length) return 0

  for (let index = 0; index <= buffer.length - magicWord.length; index++) {
    let matched = true
    for (let inner = 0; inner < magicWord.length; inner++) {
      if (buffer[index + inner] !== magicWord[inner]) {
        matched = false
        break
      }
    }
    if (matched) return index
  }

  return -1
}

const readTypedNumber = (view, offset, type, endian = 'little') => {
  const littleEndian = endian !== 'big'

  switch (type) {
    case 'u8':
      return view.getUint8(offset)
    case 'i8':
      return view.getInt8(offset)
    case 'u16':
      return view.getUint16(offset, littleEndian)
    case 'i16':
      return view.getInt16(offset, littleEndian)
    case 'u32':
      return view.getUint32(offset, littleEndian)
    case 'i32':
      return view.getInt32(offset, littleEndian)
    case 'f32':
      return view.getFloat32(offset, littleEndian)
    case 'f64':
      return view.getFloat64(offset, littleEndian)
    default:
      throw new Error(`不支持的数据类型: ${type}`)
  }
}

const getTypeSize = (type) => {
  switch (type) {
    case 'u8':
    case 'i8':
      return 1
    case 'u16':
    case 'i16':
      return 2
    case 'u32':
    case 'i32':
    case 'f32':
      return 4
    case 'f64':
      return 8
    default:
      return 0
  }
}

const summarizeSnapshot = (labels, values, fallback) => {
  const pairs = labels
    .map((label, index) => ({ label, value: values[index] }))
    .filter(item => Number.isFinite(item.value))
    .slice(0, 3)
    .map(item => `${item.label}: ${item.value}`)

  return pairs.length > 0 ? pairs.join(' | ') : fallback
}

const createLineValuesParserInstance = (profile) => {
  let separator
  try {
    separator = new RegExp(profile.line.separatorPattern)
  } catch {
    separator = /[,\t; ]+/
  }

  return {
    feed(bytes) {
      const text = decoder.decode(bytes)
      const lines = text.includes('\n') || text.includes('\r')
        ? text.split(/\r?\n/).filter(Boolean)
        : [text]

      return lines
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const parts = line.split(separator).map(item => item.trim()).filter(Boolean)
          const values = parts.map(item => Number.parseFloat(item)).filter(Number.isFinite)
          if (!values.length) return null

          const labels = values.map((_, index) => profile.line.channelNames[index] || `CH${index + 1}`)
          return {
            labels,
            values,
            summary: summarizeSnapshot(labels, values, line)
          }
        })
        .filter(Boolean)
    },

    reset() {}
  }
}

const getValueByPath = (source, path) => {
  if (!path) return undefined

  return String(path)
    .split('.')
    .reduce((value, segment) => (value == null ? undefined : value[segment]), source)
}

const createJsonLinesParserInstance = (profile) => {
  return {
    feed(bytes) {
      const text = decoder.decode(bytes)
      const lines = text.includes('\n') || text.includes('\r')
        ? text.split(/\r?\n/).filter(Boolean)
        : [text]

      const snapshots = []

      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line) continue

        try {
          const parsed = JSON.parse(line)
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue

          let entries
          if (profile.json.fieldPaths.length > 0) {
            entries = profile.json.fieldPaths
              .map(path => [path, getValueByPath(parsed, path)])
              .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
          } else {
            entries = Object.entries(parsed)
              .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
          }

          if (!entries.length) continue

          const labels = entries.map(([label]) => label)
          const values = entries.map(([, value]) => value)
          snapshots.push({
            labels,
            values,
            summary: summarizeSnapshot(labels, values, line)
          })
        } catch {
          // Ignore malformed JSON fragments.
        }
      }

      return snapshots
    },

    reset() {}
  }
}

const createTlvParserInstance = (profile) => {
  const magicWord = parseHexBytes(profile.tlv.magicWordHex)
  let buffer = new Uint8Array(0)
  let packetCounter = 0

  const parsePacket = (packetBytes) => {
    const view = new DataView(packetBytes.buffer, packetBytes.byteOffset, packetBytes.byteLength)
    const tlvConfig = profile.tlv
    const tlvCountEnabled = tlvConfig.tlvCountOffset >= 0
    const expectedTlvCount = tlvCountEnabled
      ? readTypedNumber(view, tlvConfig.tlvCountOffset, tlvConfig.tlvCountType, tlvConfig.tlvCountEndian)
      : Number.POSITIVE_INFINITY

    const valuesByLabel = new Map(profile.tlv.mappings.map(mapping => [mapping.label, Number.NaN]))
    const labels = profile.tlv.mappings.map(mapping => mapping.label)
    let offset = tlvConfig.headerSize
    let tlvIndex = 0

    while (offset + tlvConfig.tlvHeaderSize <= packetBytes.length && tlvIndex < expectedTlvCount) {
      const tlvType = readTypedNumber(
        view,
        offset + tlvConfig.tlvTypeOffset,
        tlvConfig.tlvTypeType,
        tlvConfig.tlvHeaderEndian
      )
      const tlvLengthRaw = readTypedNumber(
        view,
        offset + tlvConfig.tlvLengthOffset,
        tlvConfig.tlvLengthType,
        tlvConfig.tlvHeaderEndian
      )

      const payloadStart = offset + tlvConfig.tlvHeaderSize
      const payloadLength = tlvConfig.tlvLengthIncludesHeader
        ? tlvLengthRaw - tlvConfig.tlvHeaderSize
        : tlvLengthRaw
      const payloadEnd = payloadStart + payloadLength

      if (payloadLength < 0 || payloadEnd > packetBytes.length) break

      const payload = packetBytes.slice(payloadStart, payloadEnd)
      const payloadView = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)

      for (const mapping of profile.tlv.mappings) {
        if (mapping.tlvType !== tlvType) continue

        const valueSize = getTypeSize(mapping.valueType)
        if (mapping.valueOffset + valueSize > payload.length) continue

        const rawValue = readTypedNumber(payloadView, mapping.valueOffset, mapping.valueType, mapping.endian)
        const scaledValue = Number.isFinite(rawValue) ? rawValue * mapping.scale : Number.NaN
        valuesByLabel.set(mapping.label, scaledValue)
      }

      offset = payloadEnd
      tlvIndex += 1
    }

    if (labels.length === 0) return null

    const values = labels.map(label => valuesByLabel.get(label))
    packetCounter += 1
    return {
      labels,
      values,
      summary: summarizeSnapshot(labels, values, `Packet ${packetCounter}`)
    }
  }

  return {
    feed(bytes) {
      buffer = concatUint8Arrays(buffer, bytes)
      const packets = []

      while (buffer.length >= (magicWord.length || profile.tlv.headerSize)) {
        const magicIndex = magicWord.length > 0 ? findMagicWord(buffer, magicWord) : 0

        if (magicIndex < 0) {
          buffer = buffer.slice(Math.max(0, buffer.length - Math.max(1, magicWord.length - 1)))
          break
        }

        if (magicIndex > 0) {
          buffer = buffer.slice(magicIndex)
        }

        if (buffer.length < profile.tlv.headerSize) break

        const headerView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
        const packetLength = readTypedNumber(
          headerView,
          profile.tlv.packetLengthOffset,
          profile.tlv.packetLengthType,
          profile.tlv.packetLengthEndian
        )

        if (!Number.isFinite(packetLength) || packetLength < profile.tlv.headerSize || packetLength > MAX_TLV_PACKET_SIZE) {
          buffer = buffer.slice(1)
          continue
        }

        if (buffer.length < packetLength) break

        const packet = parsePacket(buffer.slice(0, packetLength))
        if (packet) {
          packets.push(packet)
        }

        buffer = buffer.slice(packetLength)
      }

      return packets
    },

    reset() {
      buffer = new Uint8Array(0)
      packetCounter = 0
    }
  }
}

const buildDescription = (profile) => {
  if (profile.description) return profile.description

  switch (profile.kind) {
    case 'line-values':
      return '按行读取文本，并提取分隔的数值字段'
    case 'json-lines':
      return '按行读取 JSON，对象中的数值字段会被映射为通道'
    case 'tlv':
      return '按二进制 TLV 包解析，并按字段映射输出通道'
    default:
      return '用户自定义协议'
  }
}

const getProfileChannelLabels = (profile) => {
  switch (profile.kind) {
    case 'line-values':
      return profile.line.channelNames.filter(Boolean)
    case 'json-lines':
      return profile.json.fieldPaths.filter(Boolean)
    case 'tlv':
      return profile.tlv.mappings.map(mapping => mapping.label).filter(Boolean)
    default:
      return []
  }
}

export const createProtocolParserDefinition = (profileInput, parserId = null) => {
  const profile = normalizeUserProtocolProfile(profileInput)

  return {
    id: parserId || toProtocolParserId(profile.id),
    name: profile.name,
    description: buildDescription(profile),
    defaultBaudRate: profile.defaultBaudRate,
    defaultProtocol: profile.kind === 'tlv' ? 'raw' : 'line',
    heldChannels: profile.heldChannels,
    heldWindowMs: profile.heldWindowMs,
    profileId: profile.id,
    profileKind: profile.kind,
    channelLabels: getProfileChannelLabels(profile),
    builtin: false,

    createInstance() {
      switch (profile.kind) {
        case 'line-values':
          return createLineValuesParserInstance(profile)
        case 'json-lines':
          return createJsonLinesParserInstance(profile)
        case 'tlv':
          return createTlvParserInstance(profile)
        default:
          return { feed: () => [], reset() {} }
      }
    }
  }
}
