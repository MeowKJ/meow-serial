/**
 * 内置布局预设模板
 * 每个预设包含完整的多串口配置 + 通道 + Widget 布局
 */

export const layoutPresets = [
  {
    id: 'mmwave-breath',
    name: 'TI mmWave 呼吸监测',
    icon: '📡',
    desc: '双串口: Data 921600 + CLI 115200, 19通道波形+数值',
    snapshot: {
      ports: [
        {
          id: 'port-1',
          label: 'Data',
          baudRate: 921600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          parserId: 'mmwave-breath',
          parserConfig: {},
          channelOffset: 0,
          channelCount: 19,
          autoReconnect: true
        },
        {
          id: 'port-2',
          label: 'CLI',
          baudRate: 115200,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          parserId: 'raw',
          parserConfig: {},
          channelOffset: 19,
          channelCount: 0,
          autoReconnect: false
        }
      ],
      channels: Array.from({ length: 19 }, (_, i) => ({
        id: i,
        name: `ch${i}`,
        color: ['#7DD3FC', '#38BDF8', '#0EA5E9', '#0284C7', '#0369A1',
                '#F59E0B', '#EF4444', '#22C55E', '#8B5CF6', '#EC4899',
                '#14B8A6', '#F97316', '#6366F1', '#84CC16', '#06B6D4',
                '#E11D48', '#A855F7', '#10B981', '#F43F5E'][i],
        enabled: true,
        value: 0,
        portId: 'port-1'
      })),
      widgets: [
        { type: 'waveform', title: '呼吸波形', x: 10, y: 10, w: 500, h: 220, channels: [0, 1, 2], dataSource: { type: 'channels', channelIds: [0, 1, 2] } },
        { type: 'value', title: 'BPM', x: 520, y: 10, w: 150, h: 100, channel: 3, precision: 1 },
        { type: 'value', title: '置信度', x: 520, y: 120, w: 150, h: 100, channel: 4, precision: 2 },
        { type: 'waveform', title: '相位波形', x: 10, y: 240, w: 500, h: 180, channels: [5, 6], dataSource: { type: 'channels', channelIds: [5, 6] } },
        { type: 'gauge', title: 'BPM仪表', x: 680, y: 10, w: 160, h: 140, channel: 3, min: 0, max: 30, unit: 'bpm' },
        { type: 'terminal', title: 'CLI终端', x: 680, y: 160, w: 280, h: 200 }
      ]
    }
  },
  {
    id: 'arduino-csv',
    name: 'Arduino CSV 绘图',
    icon: '📈',
    desc: '单串口 CSV 数据, 3通道波形 + 数值显示',
    snapshot: {
      ports: [
        {
          id: 'port-1',
          label: 'Arduino',
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          parserId: 'csv',
          parserConfig: {},
          channelOffset: 0,
          channelCount: 3,
          autoReconnect: true
        }
      ],
      channels: [
        { id: 0, name: '温度', color: '#EF4444', enabled: true, value: 0, portId: 'port-1' },
        { id: 1, name: '湿度', color: '#3B82F6', enabled: true, value: 0, portId: 'port-1' },
        { id: 2, name: '气压', color: '#22C55E', enabled: true, value: 0, portId: 'port-1' }
      ],
      widgets: [
        { type: 'waveform', title: '传感器波形', x: 10, y: 10, w: 500, h: 250, channels: [0, 1, 2], dataSource: { type: 'channels', channelIds: [0, 1, 2] } },
        { type: 'value', title: '温度', x: 520, y: 10, w: 150, h: 100, channel: 0, precision: 1, unit: '°C' },
        { type: 'value', title: '湿度', x: 520, y: 120, w: 150, h: 100, channel: 1, precision: 1, unit: '%' },
        { type: 'value', title: '气压', x: 520, y: 230, w: 150, h: 100, channel: 2, precision: 1, unit: 'hPa' },
        { type: 'gauge', title: '温度表', x: 680, y: 10, w: 160, h: 140, channel: 0, min: -20, max: 60, unit: '°C' }
      ]
    }
  },
  {
    id: 'esp32-json',
    name: 'ESP32 JSON 监控',
    icon: '📋',
    desc: '单串口 JSON 对象数据, 自动提取 key 为通道',
    snapshot: {
      ports: [
        {
          id: 'port-1',
          label: 'ESP32',
          baudRate: 115200,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          parserId: 'json',
          parserConfig: {},
          channelOffset: 0,
          channelCount: 4,
          autoReconnect: true
        }
      ],
      channels: [
        { id: 0, name: 'temp', color: '#EF4444', enabled: true, value: 0, portId: 'port-1' },
        { id: 1, name: 'humidity', color: '#3B82F6', enabled: true, value: 0, portId: 'port-1' },
        { id: 2, name: 'pressure', color: '#22C55E', enabled: true, value: 0, portId: 'port-1' },
        { id: 3, name: 'battery', color: '#F59E0B', enabled: true, value: 0, portId: 'port-1' }
      ],
      widgets: [
        { type: 'waveform', title: '实时数据', x: 10, y: 10, w: 500, h: 250, channels: [0, 1, 2, 3], dataSource: { type: 'channels', channelIds: [0, 1, 2, 3] } },
        { type: 'value', title: 'Temperature', x: 520, y: 10, w: 150, h: 100, channel: 0, precision: 1, unit: '°C' },
        { type: 'value', title: 'Humidity', x: 680, y: 10, w: 150, h: 100, channel: 1, precision: 1, unit: '%' },
        { type: 'value', title: 'Pressure', x: 520, y: 120, w: 150, h: 100, channel: 2, precision: 0, unit: 'hPa' },
        { type: 'gauge', title: 'Battery', x: 680, y: 120, w: 160, h: 140, channel: 3, min: 0, max: 100, unit: '%' }
      ]
    }
  },
  {
    id: 'justfloat-vofa',
    name: 'JustFloat (VOFA+)',
    icon: '🔢',
    desc: '单串口二进制浮点数组, 高速数据采集',
    snapshot: {
      ports: [
        {
          id: 'port-1',
          label: 'VOFA+',
          baudRate: 115200,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          parserId: 'justfloat',
          parserConfig: {},
          channelOffset: 0,
          channelCount: 4,
          autoReconnect: true
        }
      ],
      channels: [
        { id: 0, name: 'ch0', color: '#EF4444', enabled: true, value: 0, portId: 'port-1' },
        { id: 1, name: 'ch1', color: '#3B82F6', enabled: true, value: 0, portId: 'port-1' },
        { id: 2, name: 'ch2', color: '#22C55E', enabled: true, value: 0, portId: 'port-1' },
        { id: 3, name: 'ch3', color: '#F59E0B', enabled: true, value: 0, portId: 'port-1' }
      ],
      widgets: [
        { type: 'waveform', title: '多通道波形', x: 10, y: 10, w: 600, h: 300, channels: [0, 1, 2, 3], dataSource: { type: 'channels', channelIds: [0, 1, 2, 3] } },
        { type: 'fft', title: 'FFT频谱 (ch0)', x: 620, y: 10, w: 300, h: 200, channel: 0 },
        { type: 'value', title: 'ch0', x: 620, y: 220, w: 140, h: 80, channel: 0, precision: 3 },
        { type: 'value', title: 'ch1', x: 770, y: 220, w: 140, h: 80, channel: 1, precision: 3 }
      ]
    }
  },
  {
    id: 'raw-debug',
    name: '原始调试',
    icon: '🔧',
    desc: '单串口原始数据调试，无解析',
    snapshot: {
      ports: [
        {
          id: 'port-1',
          label: 'Debug',
          baudRate: 115200,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          parserId: 'raw',
          parserConfig: {},
          channelOffset: 0,
          channelCount: 0,
          autoReconnect: false
        }
      ],
      channels: [],
      widgets: [
        { type: 'terminal', title: '终端', x: 10, y: 10, w: 400, h: 300 }
      ]
    }
  }
]

export const getPreset = (id) => layoutPresets.find(p => p.id === id)
