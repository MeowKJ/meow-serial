// JustFloat: 二进制 float32 数组，以 0x00 0x00 0x80 0x7F 结尾 (NaN 帧标记)
const FRAME_END_MARKER = new Uint8Array([0x00, 0x00, 0x80, 0x7F])

const findFrameEnd = (buffer, start = 0) => {
  for (let i = start; i <= buffer.length - FRAME_END_MARKER.length; i++) {
    if (
      buffer[i] === FRAME_END_MARKER[0] &&
      buffer[i + 1] === FRAME_END_MARKER[1] &&
      buffer[i + 2] === FRAME_END_MARKER[2] &&
      buffer[i + 3] === FRAME_END_MARKER[3]
    ) {
      return i
    }
  }
  return -1
}

export const justfloatParser = {
  id: 'justfloat',
  name: 'JustFloat',
  description: '二进制 float32 数组 (VOFA+ 兼容)',
  defaultBaudRate: 115200,
  defaultProtocol: 'raw',
  heldChannels: [],
  heldWindowMs: 0,

  createInstance() {
    let buffer = new Uint8Array(0)

    return {
      feed(bytes) {
        const merged = new Uint8Array(buffer.length + bytes.length)
        merged.set(buffer)
        merged.set(bytes, buffer.length)
        buffer = merged

        const snapshots = []

        while (true) {
          const endIndex = findFrameEnd(buffer)
          if (endIndex < 0) break

          // 帧结束标记前的所有 float32
          const floatCount = Math.floor(endIndex / 4)
          if (floatCount > 0) {
            const view = new DataView(buffer.buffer, buffer.byteOffset, endIndex)
            const values = []
            for (let i = 0; i < floatCount; i++) {
              values.push(view.getFloat32(i * 4, true))
            }
            snapshots.push({
              labels: values.map((_, i) => `ch${i}`),
              values,
              summary: `${floatCount} floats`
            })
          }

          buffer = buffer.slice(endIndex + FRAME_END_MARKER.length)
        }

        return snapshots
      },

      reset() {
        buffer = new Uint8Array(0)
      }
    }
  }
}
