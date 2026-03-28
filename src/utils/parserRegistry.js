import { reactive } from 'vue'

/**
 * 解析器注册表
 * 管理所有数据解析器（内置 + 用户自定义）
 *
 * 解析器接口:
 * {
 *   id: string,
 *   name: string,
 *   description: string,
 *   defaultBaudRate: number,
 *   defaultProtocol: 'raw' | 'line',
 *   heldChannels?: string[],
 *   heldWindowMs?: number,
 *   createInstance(config?): { feed(bytes): ParsedSnapshot[], reset(): void }
 * }
 *
 * ParsedSnapshot = { labels: string[], values: number[], summary?: string }
 */

const registry = reactive(new Map())

export const registerParser = (parser) => {
  if (!parser?.id) {
    throw new Error('Parser must have an id')
  }
  registry.set(parser.id, parser)
}

export const getParser = (id) => {
  return registry.get(id) || null
}

export const getAllParsers = () => {
  return Array.from(registry.values())
}

export const clearParsers = () => {
  registry.clear()
}

export const hasParser = (id) => {
  return registry.has(id)
}

export const unregisterParser = (id) => {
  return registry.delete(id)
}
