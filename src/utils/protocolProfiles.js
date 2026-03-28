import { loadFromStorage, saveToStorage } from './storage'

const USER_PROTOCOLS_KEY = 'protocol_profiles'
const USER_PARSER_PREFIX = 'profile:'
const SUPPORTED_PROTOCOL_KINDS = ['line-values', 'json-lines', 'tlv']

const clampNumber = (value, fallback, { min = -Infinity, max = Infinity } = {}) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}

const splitCsvText = (value) => {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean)
  }

  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

const normalizeHexString = (value) => {
  const compact = String(value || '')
    .replace(/0x/gi, '')
    .replace(/[^0-9a-f]/gi, '')
    .toUpperCase()

  if (compact.length <= 2) return compact
  return compact.match(/.{1,2}/g)?.join(' ') || compact
}

const normalizeMapping = (mapping = {}, index = 0) => ({
  id: mapping.id || `mapping-${Date.now()}-${index}`,
  label: String(mapping.label || `字段 ${index + 1}`).trim(),
  tlvType: clampNumber(mapping.tlvType, 1000 + index, { min: 0 }),
  valueOffset: clampNumber(mapping.valueOffset, 0, { min: 0 }),
  valueType: ['u8', 'i8', 'u16', 'i16', 'u32', 'i32', 'f32', 'f64'].includes(mapping.valueType)
    ? mapping.valueType
    : 'f32',
  endian: mapping.endian === 'big' ? 'big' : 'little',
  scale: clampNumber(mapping.scale, 1),
  unit: String(mapping.unit || '').trim()
})

const createDefaultLineConfig = () => ({
  separatorPattern: '[,\\t; ]+',
  channelNames: []
})

const createDefaultJsonConfig = () => ({
  fieldPaths: []
})

const createDefaultTlvConfig = () => ({
  magicWordHex: '',
  headerSize: 40,
  packetLengthOffset: 12,
  packetLengthType: 'u32',
  packetLengthEndian: 'little',
  tlvCountOffset: 32,
  tlvCountType: 'u32',
  tlvCountEndian: 'little',
  tlvHeaderSize: 8,
  tlvTypeOffset: 0,
  tlvTypeType: 'u32',
  tlvLengthOffset: 4,
  tlvLengthType: 'u32',
  tlvHeaderEndian: 'little',
  tlvLengthIncludesHeader: false,
  mappings: []
})

export const createEmptyProtocolProfile = (kind = 'tlv') => {
  const safeKind = SUPPORTED_PROTOCOL_KINDS.includes(kind) ? kind : 'line-values'
  return {
    id: '',
    name: '',
    description: '',
    kind: safeKind,
    defaultBaudRate: safeKind === 'tlv' ? 921600 : 115200,
    heldChannels: [],
    heldWindowMs: 3000,
    line: createDefaultLineConfig(),
    json: createDefaultJsonConfig(),
    tlv: createDefaultTlvConfig()
  }
}

export const normalizeUserProtocolProfile = (profile = {}) => {
  const defaults = createEmptyProtocolProfile(profile.kind)
  const kind = SUPPORTED_PROTOCOL_KINDS.includes(profile.kind) ? profile.kind : defaults.kind

  return {
    id: String(profile.id || '').trim(),
    name: String(profile.name || '').trim(),
    description: String(profile.description || '').trim(),
    kind,
    defaultBaudRate: clampNumber(profile.defaultBaudRate, defaults.defaultBaudRate, { min: 1 }),
    heldChannels: splitCsvText(profile.heldChannels),
    heldWindowMs: clampNumber(profile.heldWindowMs, defaults.heldWindowMs, { min: 0 }),
    line: {
      separatorPattern: String(profile.line?.separatorPattern || defaults.line.separatorPattern).trim() || defaults.line.separatorPattern,
      channelNames: splitCsvText(profile.line?.channelNames)
    },
    json: {
      fieldPaths: splitCsvText(profile.json?.fieldPaths)
    },
    tlv: {
      magicWordHex: normalizeHexString(profile.tlv?.magicWordHex),
      headerSize: clampNumber(profile.tlv?.headerSize, defaults.tlv.headerSize, { min: 8 }),
      packetLengthOffset: clampNumber(profile.tlv?.packetLengthOffset, defaults.tlv.packetLengthOffset, { min: 0 }),
      packetLengthType: ['u16', 'u32'].includes(profile.tlv?.packetLengthType) ? profile.tlv.packetLengthType : defaults.tlv.packetLengthType,
      packetLengthEndian: profile.tlv?.packetLengthEndian === 'big' ? 'big' : defaults.tlv.packetLengthEndian,
      tlvCountOffset: profile.tlv?.tlvCountOffset === '' || profile.tlv?.tlvCountOffset === null || profile.tlv?.tlvCountOffset === undefined
        ? defaults.tlv.tlvCountOffset
        : clampNumber(profile.tlv?.tlvCountOffset, defaults.tlv.tlvCountOffset, { min: -1 }),
      tlvCountType: ['u16', 'u32'].includes(profile.tlv?.tlvCountType) ? profile.tlv.tlvCountType : defaults.tlv.tlvCountType,
      tlvCountEndian: profile.tlv?.tlvCountEndian === 'big' ? 'big' : defaults.tlv.tlvCountEndian,
      tlvHeaderSize: clampNumber(profile.tlv?.tlvHeaderSize, defaults.tlv.tlvHeaderSize, { min: 4 }),
      tlvTypeOffset: clampNumber(profile.tlv?.tlvTypeOffset, defaults.tlv.tlvTypeOffset, { min: 0 }),
      tlvTypeType: ['u16', 'u32'].includes(profile.tlv?.tlvTypeType) ? profile.tlv.tlvTypeType : defaults.tlv.tlvTypeType,
      tlvLengthOffset: clampNumber(profile.tlv?.tlvLengthOffset, defaults.tlv.tlvLengthOffset, { min: 0 }),
      tlvLengthType: ['u16', 'u32'].includes(profile.tlv?.tlvLengthType) ? profile.tlv.tlvLengthType : defaults.tlv.tlvLengthType,
      tlvHeaderEndian: profile.tlv?.tlvHeaderEndian === 'big' ? 'big' : defaults.tlv.tlvHeaderEndian,
      tlvLengthIncludesHeader: Boolean(profile.tlv?.tlvLengthIncludesHeader),
      mappings: Array.isArray(profile.tlv?.mappings)
        ? profile.tlv.mappings.map(normalizeMapping)
        : []
    }
  }
}

export const loadUserProtocolProfiles = () => {
  const profiles = loadFromStorage(USER_PROTOCOLS_KEY, [])
  if (!Array.isArray(profiles)) return []

  return profiles
    .map(normalizeUserProtocolProfile)
    .filter(profile => profile.id && profile.name)
}

export const saveUserProtocolProfiles = (profiles) => {
  const normalized = Array.isArray(profiles)
    ? profiles.map(normalizeUserProtocolProfile).filter(profile => profile.id && profile.name)
    : []

  return saveToStorage(USER_PROTOCOLS_KEY, normalized)
}

export const upsertUserProtocolProfile = (profile) => {
  const normalized = normalizeUserProtocolProfile(profile)
  if (!normalized.id || !normalized.name) {
    throw new Error('协议名称不能为空')
  }

  const profiles = loadUserProtocolProfiles()
  const index = profiles.findIndex(item => item.id === normalized.id)

  if (index >= 0) {
    profiles.splice(index, 1, normalized)
  } else {
    profiles.push(normalized)
  }

  saveUserProtocolProfiles(profiles)
  return normalized
}

export const deleteUserProtocolProfile = (profileId) => {
  const profiles = loadUserProtocolProfiles().filter(profile => profile.id !== profileId)
  return saveUserProtocolProfiles(profiles)
}

export const createProtocolProfileId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `protocol-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

export const toProtocolParserId = (profileId) => `${USER_PARSER_PREFIX}${profileId}`

export const getProtocolIdFromParserId = (parserId) => {
  if (typeof parserId !== 'string' || !parserId.startsWith(USER_PARSER_PREFIX)) return null
  return parserId.slice(USER_PARSER_PREFIX.length)
}

export const isUserProtocolParserId = (parserId) => Boolean(getProtocolIdFromParserId(parserId))
