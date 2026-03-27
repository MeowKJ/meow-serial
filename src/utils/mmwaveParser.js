const MMWAVE_MAGIC_WORD = new Uint8Array([0x02, 0x01, 0x04, 0x03, 0x06, 0x05, 0x08, 0x07])
const MMWAVE_HEADER_SIZE = 40
const MMWAVE_TLV_HEADER_SIZE = 8
const MMWAVE_MAX_PACKET_SIZE = 1024 * 1024
const MMWAVE_BREATH_TLV_TYPE = 1001
const MMWAVE_TEMP_TLV_TYPE = 1002

const BREATH_RANGE_NEIGHBOR_COUNT = 5
const BREATH_SPECTRUM_NEIGHBOR_COUNT = 5
const BREATH_RANGE_NEIGHBOR_SIZE = 28
const BREATH_SPECTRUM_NEIGHBOR_SIZE = 28
const BREATH_OUTPUT_SIZE = 332

const concatUint8Arrays = (left, right) => {
  const merged = new Uint8Array(left.length + right.length)
  merged.set(left)
  merged.set(right, left.length)
  return merged
}

const formatNumber = (value, digits = 2) => {
  return Number.isFinite(value) ? value.toFixed(digits) : '--'
}

const toChannelValue = (value) => {
  return Number.isFinite(value) ? value : 0
}

const findMagicWord = (buffer, startIndex = 0) => {
  for (let index = startIndex; index <= buffer.length - MMWAVE_MAGIC_WORD.length; index++) {
    let matched = true
    for (let magicIndex = 0; magicIndex < MMWAVE_MAGIC_WORD.length; magicIndex++) {
      if (buffer[index + magicIndex] !== MMWAVE_MAGIC_WORD[magicIndex]) {
        matched = false
        break
      }
    }

    if (matched) {
      return index
    }
  }

  return -1
}

const readRangeNeighbor = (view, offset) => {
  return {
    binOffset: view.getInt16(offset, true),
    binIndex: view.getUint16(offset + 2, true),
    valid: view.getUint8(offset + 4) !== 0,
    rangeMeters: view.getFloat32(offset + 8, true),
    magnitude: view.getFloat32(offset + 12, true),
    wrappedPhaseRad: view.getFloat32(offset + 16, true),
    unwrappedPhaseRad: view.getFloat32(offset + 20, true),
    energy: view.getFloat32(offset + 24, true)
  }
}

const readSpectrumNeighbor = (view, offset) => {
  return {
    binOffset: view.getInt16(offset, true),
    binIndex: view.getUint16(offset + 2, true),
    valid: view.getUint8(offset + 4) !== 0,
    frequencyHz: view.getFloat32(offset + 8, true),
    breathsPerMinute: view.getFloat32(offset + 12, true),
    magnitude: view.getFloat32(offset + 16, true),
    phaseRad: view.getFloat32(offset + 20, true),
    power: view.getFloat32(offset + 24, true)
  }
}

const parseCachedTemperaturePayload = (payload) => {
  if (!(payload instanceof Uint8Array) || payload.length < 8) {
    return null
  }

  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
  return {
    valid: view.getUint8(0) !== 0,
    pmTempC: view.getFloat32(4, true)
  }
}

export const parseBreathOutputPayload = (payload) => {
  if (!(payload instanceof Uint8Array) || payload.length < BREATH_OUTPUT_SIZE) {
    return null
  }

  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
  let offset = 0

  const parsed = {
    ready: view.getUint8(offset) !== 0,
    hasSelection: view.getUint8(offset + 1) !== 0,
    spectrumValid: view.getUint8(offset + 2) !== 0,
    selectedAntenna: view.getUint8(offset + 3),
    rangeBin: view.getUint16(offset + 4, true),
    historyCount: view.getUint16(offset + 6, true),
    peakSpectrumBin: view.getUint16(offset + 8, true),
    sampleRateHz: view.getFloat32(offset + 12, true),
    rangeMeters: view.getFloat32(offset + 16, true),
    wrappedPhaseRad: view.getFloat32(offset + 20, true),
    unwrappedPhaseRad: view.getFloat32(offset + 24, true),
    breathsPerMinute: view.getFloat32(offset + 28, true),
    confidence: view.getFloat32(offset + 32, true),
    peakFrequencyHz: view.getFloat32(offset + 36, true),
    peakMagnitude: view.getFloat32(offset + 40, true),
    peakPhaseRad: view.getFloat32(offset + 44, true),
    peakPower: view.getFloat32(offset + 48, true),
    rangeNeighbors: [],
    spectrumNeighbors: []
  }

  offset = 52
  for (let index = 0; index < BREATH_RANGE_NEIGHBOR_COUNT; index++) {
    parsed.rangeNeighbors.push(readRangeNeighbor(view, offset))
    offset += BREATH_RANGE_NEIGHBOR_SIZE
  }

  for (let index = 0; index < BREATH_SPECTRUM_NEIGHBOR_COUNT; index++) {
    parsed.spectrumNeighbors.push(readSpectrumNeighbor(view, offset))
    offset += BREATH_SPECTRUM_NEIGHBOR_SIZE
  }

  return parsed
}

const buildPacketSummary = (packet) => {
  if (packet.breathSummary) {
    const breath = packet.breathSummary
    return `Frame ${packet.header.frameNumber} | bpm ${formatNumber(breath.breathsPerMinute)} | phase ${formatNumber(breath.unwrappedPhaseRad, 3)} rad | power ${formatNumber(breath.peakPower, 3)} | range ${formatNumber(breath.rangeMeters)} m`
  }

  return `Frame ${packet.header.frameNumber} | obj ${packet.header.numDetectedObj} | tlv ${packet.header.numTLVs}`
}

const getRangeNeighborByOffset = (breath, offset) => {
  if (!breath?.rangeNeighbors) {
    return null
  }

  return breath.rangeNeighbors.find(item => item?.valid && item.binOffset === offset) || null
}

const buildChannelSnapshot = (packet) => {
  if (!packet.breathSummary) {
    return {
      labels: ['Frame', 'Obj', 'TLV'],
      values: [
        packet.header.frameNumber,
        packet.header.numDetectedObj,
        packet.header.numTLVs
      ]
    }
  }

  const breath = packet.breathSummary
  const left2 = getRangeNeighborByOffset(breath, -2)
  const left1 = getRangeNeighborByOffset(breath, -1)
  const center = getRangeNeighborByOffset(breath, 0)
  const right1 = getRangeNeighborByOffset(breath, 1)
  const right2 = getRangeNeighborByOffset(breath, 2)
  const hasValidBreathRate = Boolean(breath.ready && breath.spectrumValid && Number.isFinite(breath.breathsPerMinute) && breath.breathsPerMinute > 0)

  const temperatureC = packet.temperature?.valid ? packet.temperature.pmTempC : Number.NaN

  return {
    labels: [
      '主bin解缠绕相位(rad)',
      '主bin原始相位(rad)',
      '峰值相位(rad)',
      '峰值能量',
      '峰值幅值',
      'BPM',
      '置信度',
      '距离(m)',
      '邻-2解缠绕相位',
      '邻-1解缠绕相位',
      '当前bin解缠绕相位',
      '邻+1解缠绕相位',
      '邻+2解缠绕相位',
      '邻-2能量',
      '邻-1能量',
      '当前bin能量',
      '邻+1能量',
      '邻+2能量',
      '温度(°C)'
    ],
    values: [
      toChannelValue(breath.unwrappedPhaseRad),
      toChannelValue(breath.wrappedPhaseRad),
      toChannelValue(breath.peakPhaseRad),
      toChannelValue(breath.peakPower),
      toChannelValue(breath.peakMagnitude),
      hasValidBreathRate ? breath.breathsPerMinute : Number.NaN,
      hasValidBreathRate ? breath.confidence : Number.NaN,
      toChannelValue(breath.rangeMeters),
      toChannelValue(left2?.unwrappedPhaseRad),
      toChannelValue(left1?.unwrappedPhaseRad),
      toChannelValue(center?.unwrappedPhaseRad),
      toChannelValue(right1?.unwrappedPhaseRad),
      toChannelValue(right2?.unwrappedPhaseRad),
      toChannelValue(left2?.energy),
      toChannelValue(left1?.energy),
      toChannelValue(center?.energy),
      toChannelValue(right1?.energy),
      toChannelValue(right2?.energy),
      temperatureC
    ]
  }
}

const parsePacket = (packetBytes) => {
  if (packetBytes.length < MMWAVE_HEADER_SIZE) {
    return null
  }

  const view = new DataView(packetBytes.buffer, packetBytes.byteOffset, packetBytes.byteLength)
  const header = {
    version: view.getUint32(8, true),
    totalPacketLen: view.getUint32(12, true),
    platform: view.getUint32(16, true),
    frameNumber: view.getUint32(20, true),
    timeCpuCycles: view.getUint32(24, true),
    numDetectedObj: view.getUint32(28, true),
    numTLVs: view.getUint32(32, true),
    subFrameNumber: view.getUint32(36, true)
  }

  const tlvs = []
  let breathSummary = null
  let temperature = null
  let offset = MMWAVE_HEADER_SIZE

  for (let tlvIndex = 0; tlvIndex < header.numTLVs; tlvIndex++) {
    if (offset + MMWAVE_TLV_HEADER_SIZE > packetBytes.length) {
      break
    }

    const type = view.getUint32(offset, true)
    const length = view.getUint32(offset + 4, true)
    const payloadStart = offset + MMWAVE_TLV_HEADER_SIZE
    const payloadEnd = payloadStart + length

    if (payloadEnd > packetBytes.length) {
      break
    }

    const payload = packetBytes.slice(payloadStart, payloadEnd)
    const tlv = { type, length }

    if (type === MMWAVE_BREATH_TLV_TYPE) {
      const parsed = parseBreathOutputPayload(payload)
      if (parsed) {
        tlv.parsed = parsed
        breathSummary = parsed
      }
    } else if (type === MMWAVE_TEMP_TLV_TYPE) {
      const parsed = parseCachedTemperaturePayload(payload)
      if (parsed) {
        tlv.parsed = parsed
        temperature = parsed
      }
    }

    tlvs.push(tlv)
    offset = payloadEnd
  }

  const packet = {
    type: 'mmwave',
    header,
    tlvs,
    breathSummary,
    temperature,
    rawBytes: packetBytes
  }

  const snapshot = buildChannelSnapshot(packet)
  packet.summary = buildPacketSummary(packet)
  packet.channelLabels = snapshot.labels
  packet.channelValues = snapshot.values

  return packet
}

export const parseMmwavePacketsFromBuffer = (existingBuffer, incomingBytes) => {
  let buffer = concatUint8Arrays(existingBuffer, incomingBytes)
  const packets = []

  while (buffer.length >= MMWAVE_MAGIC_WORD.length) {
    const magicIndex = findMagicWord(buffer)

    if (magicIndex < 0) {
      buffer = buffer.slice(Math.max(0, buffer.length - (MMWAVE_MAGIC_WORD.length - 1)))
      break
    }

    if (magicIndex > 0) {
      buffer = buffer.slice(magicIndex)
    }

    if (buffer.length < MMWAVE_HEADER_SIZE) {
      break
    }

    const totalPacketLen = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength
    ).getUint32(12, true)

    if (totalPacketLen < MMWAVE_HEADER_SIZE || totalPacketLen > MMWAVE_MAX_PACKET_SIZE) {
      buffer = buffer.slice(1)
      continue
    }

    if (buffer.length < totalPacketLen) {
      break
    }

    const packetBytes = buffer.slice(0, totalPacketLen)
    const packet = parsePacket(packetBytes)
    if (packet) {
      packets.push(packet)
    }

    buffer = buffer.slice(totalPacketLen)
  }

  return {
    packets,
    remainingBuffer: buffer
  }
}

export const getMmwaveMagicWord = () => MMWAVE_MAGIC_WORD
