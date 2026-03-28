import { clearParsers, registerParser } from '../utils/parserRegistry'
import { loadUserProtocolProfiles } from '../utils/protocolProfiles'
import { createProtocolParserDefinition } from './profileParserFactory'
import { rawParser } from './rawParser'

export const syncRegisteredParsers = () => {
  clearParsers()
  registerParser(rawParser)

  for (const profile of loadUserProtocolProfiles()) {
    registerParser(createProtocolParserDefinition(profile))
  }
}

export const registerBuiltinParsers = () => {
  syncRegisteredParsers()
}

export { rawParser }
