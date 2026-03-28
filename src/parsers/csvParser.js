export const csvParser = {
  id: 'csv',
  name: 'CSV 文本',
  description: '逗号/制表符/分号分隔的数值行',
  defaultBaudRate: 115200,
  defaultProtocol: 'line',
  heldChannels: [],
  heldWindowMs: 0,

  createInstance() {
    return {
      feed(bytes) {
        const text = new TextDecoder().decode(bytes)
        const lines = text.split(/\r?\n/).filter(line => line.trim())
        const snapshots = []

        for (const line of lines) {
          // 尝试 JSON
          try {
            const json = JSON.parse(line)
            if (json && typeof json === 'object') {
              const entries = Object.entries(json).filter(
                ([, v]) => typeof v === 'number' && Number.isFinite(v)
              )
              if (entries.length > 0) {
                snapshots.push({
                  labels: entries.map(([k]) => k),
                  values: entries.map(([, v]) => v),
                  summary: line
                })
                continue
              }
            }
          } catch {
            // not JSON
          }

          // CSV 数值解析
          const values = line.split(/[,\t;]/).map(v => {
            const num = parseFloat(v.trim())
            return isNaN(num) ? null : num
          }).filter(v => v !== null)

          if (values.length > 0) {
            snapshots.push({
              labels: values.map((_, i) => `ch${i}`),
              values,
              summary: line
            })
          }
        }

        return snapshots
      },

      reset() {}
    }
  }
}
