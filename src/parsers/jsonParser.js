export const jsonParser = {
  id: 'json',
  name: 'JSON',
  description: '每行一个 JSON 对象，键名映射为通道',
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
          try {
            const json = JSON.parse(line)
            if (json && typeof json === 'object' && !Array.isArray(json)) {
              const entries = Object.entries(json).filter(
                ([, v]) => typeof v === 'number' && Number.isFinite(v)
              )
              if (entries.length > 0) {
                snapshots.push({
                  labels: entries.map(([k]) => k),
                  values: entries.map(([, v]) => v),
                  summary: line
                })
              }
            }
          } catch {
            // skip non-JSON lines
          }
        }

        return snapshots
      },

      reset() {}
    }
  }
}
