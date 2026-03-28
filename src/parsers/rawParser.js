export const rawParser = {
  id: 'raw',
  name: 'Raw 原始数据',
  description: '默认模式。不做结构化解析，只显示原始文本或字节流。',
  defaultBaudRate: 115200,
  defaultProtocol: 'raw',
  builtin: true,
  heldChannels: [],
  heldWindowMs: 0,

  createInstance() {
    return {
      feed(_bytes) {
        // 原始模式不产生通道数据，只用于终端显示
        return []
      },

      reset() {}
    }
  }
}
