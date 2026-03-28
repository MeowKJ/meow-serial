import { parseMmwavePacketsFromBuffer } from '../utils/mmwaveParser'

export const mmwaveBreathParser = {
  id: 'mmwave-breath',
  name: 'TI mmWave 呼吸检测',
  description: '921600 baud, TLV 二进制数据包 (呼吸/温度)',
  defaultBaudRate: 921600,
  defaultProtocol: 'raw',
  heldChannels: ['BPM', '置信度'],
  heldWindowMs: 3000,

  createInstance() {
    let buffer = new Uint8Array(0)

    return {
      feed(bytes) {
        const { packets, remainingBuffer } = parseMmwavePacketsFromBuffer(buffer, bytes)
        buffer = remainingBuffer

        return packets.map(packet => ({
          labels: packet.channelLabels,
          values: packet.channelValues,
          summary: packet.summary
        }))
      },

      reset() {
        buffer = new Uint8Array(0)
      }
    }
  }
}
