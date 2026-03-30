// 基础控件
export * from './base'
import { tStatic } from '../i18n'

// 控件组件索引
export { default as WaveformWidget } from './WaveformWidget.vue'
export { default as ValueWidget } from './ValueWidget.vue'
export { default as GaugeWidget } from './GaugeWidget.vue'
export { default as ButtonWidget } from './ButtonWidget.vue'
export { default as SliderWidget } from './SliderWidget.vue'
export { default as LedWidget } from './LedWidget.vue'
export { default as FFTWidget } from './FFTWidget.vue'
export { default as TerminalWidget } from './TerminalWidget.vue'
export { default as TriggerWidget } from './TriggerWidget.vue'
export { default as CalculatorWidget } from './CalculatorWidget.vue'
export { default as HistogramWidget } from './HistogramWidget.vue'
export { default as XYPlotWidget } from './XYPlotWidget.vue'
export { default as SparklineWidget } from './SparklineWidget.vue'

// 控件类型配置
export const widgetTypes = [
  { 
    type: 'waveform', 
    nameKey: 'widgets.waveform.name',
    descKey: 'widgets.waveform.desc',
    name: '波形图', 
    emojiName: 'chartIncreasing',
    icon: '📈', 
    desc: '多通道实时波形', 
    category: '显示',
    defaultW: 400, 
    defaultH: 200,
    minW: 200,
    minH: 100
  },
  {
    type: 'sparkline',
    nameKey: 'widgets.sparkline.name',
    descKey: 'widgets.sparkline.desc',
    name: '迷你波形图',
    emojiName: 'chartIncreasing',
    icon: '〰️',
    desc: '单通道迷你趋势线',
    category: '显示',
    defaultW: 180,
    defaultH: 72,
    minW: 110,
    minH: 48
  },
  { 
    type: 'fft', 
    nameKey: 'widgets.fft.name',
    descKey: 'widgets.fft.desc',
    name: 'FFT频谱', 
    emojiName: 'barChart',
    icon: '📊', 
    desc: '频谱分析', 
    category: '显示',
    defaultW: 300, 
    defaultH: 180,
    minW: 200,
    minH: 100
  },
  { 
    type: 'histogram', 
    nameKey: 'widgets.histogram.name',
    descKey: 'widgets.histogram.desc',
    name: '直方图', 
    emojiName: 'antennaBars',
    icon: '📶', 
    desc: '数据分布统计', 
    category: '显示',
    defaultW: 250, 
    defaultH: 180,
    minW: 150,
    minH: 100
  },
  { 
    type: 'xyplot', 
    nameKey: 'widgets.xyplot.name',
    descKey: 'widgets.xyplot.desc',
    name: 'XY散点图', 
    icon: '⚬', 
    desc: '双通道相关性', 
    category: '显示',
    defaultW: 200, 
    defaultH: 200,
    minW: 150,
    minH: 150
  },
  { 
    type: 'value', 
    nameKey: 'widgets.value.name',
    descKey: 'widgets.value.desc',
    name: '数值显示', 
    emojiName: 'inputNumbers',
    icon: '🔢', 
    desc: '大字体数值', 
    category: '显示',
    defaultW: 220, 
    defaultH: 140,
    minW: 140,
    minH: 90
  },
  { 
    type: 'gauge', 
    nameKey: 'widgets.gauge.name',
    descKey: 'widgets.gauge.desc',
    name: '仪表盘', 
    emojiName: 'stopwatch',
    icon: '⏱️', 
    desc: '圆弧仪表', 
    category: '显示',
    defaultW: 150, 
    defaultH: 130,
    minW: 100,
    minH: 100
  },
  { 
    type: 'button', 
    nameKey: 'widgets.button.name',
    descKey: 'widgets.button.desc',
    name: '按钮', 
    emojiName: 'radioButton',
    icon: '🔘', 
    desc: '发送命令', 
    category: '控制',
    defaultW: 180, 
    defaultH: 88,
    minW: 128,
    minH: 64
  },
  { 
    type: 'slider', 
    nameKey: 'widgets.slider.name',
    descKey: 'widgets.slider.desc',
    name: '滑块', 
    emojiName: 'levelSlider',
    icon: '🎚️', 
    desc: '参数调节', 
    category: '控制',
    defaultW: 200, 
    defaultH: 80,
    minW: 150,
    minH: 60
  },
  { 
    type: 'led', 
    nameKey: 'widgets.led.name',
    descKey: 'widgets.led.desc',
    name: 'LED指示灯', 
    emojiName: 'lightBulb',
    icon: '💡', 
    desc: '状态指示', 
    category: '显示',
    defaultW: 180, 
    defaultH: 70,
    minW: 120,
    minH: 50
  },
  { 
    type: 'terminal', 
    nameKey: 'widgets.terminal.name',
    descKey: 'widgets.terminal.desc',
    name: '迷你终端', 
    emojiName: 'pager',
    icon: '📟', 
    desc: '数据日志', 
    category: '工具',
    defaultW: 280, 
    defaultH: 150,
    minW: 200,
    minH: 100
  },
  { 
    type: 'trigger', 
    nameKey: 'widgets.trigger.name',
    descKey: 'widgets.trigger.desc',
    name: '触发器', 
    emojiName: 'highVoltage',
    icon: '⚡', 
    desc: '条件触发执行', 
    category: '高级',
    defaultW: 250, 
    defaultH: 100,
    minW: 200,
    minH: 80
  },
  { 
    type: 'calculator', 
    nameKey: 'widgets.calculator.name',
    descKey: 'widgets.calculator.desc',
    name: '计算器', 
    emojiName: 'abacus',
    icon: '🧮', 
    desc: '数据运算', 
    category: '高级',
    defaultW: 200, 
    defaultH: 120,
    minW: 150,
    minH: 100
  }
]

// 按类别分组
export const widgetCategories = {
  '显示': widgetTypes.filter(w => w.category === '显示'),
  '控制': widgetTypes.filter(w => w.category === '控制'),
  '高级': widgetTypes.filter(w => w.category === '高级'),
  '工具': widgetTypes.filter(w => w.category === '工具')
}

// 获取控件默认配置
export const getWidgetDefaults = (type) => {
  const widgetType = widgetTypes.find(w => w.type === type)
  if (!widgetType) return {}
  
  const defaults = {
    type: widgetType.type,
    title: tStatic(widgetType.nameKey || widgetType.name, {}, undefined),
    w: widgetType.defaultW,
    h: widgetType.defaultH,
    minW: widgetType.minW || 100,
    minH: widgetType.minH || 60,
    // 使用新的数据源配置
    dataSource: {
      type: 'channel',
      channelId: 0
    },
    // 兼容旧版本
    channel: 0,
    visible: true,
    enabled: true,
    zIndex: 0,
    locked: false
  }
  
  // 特定类型的默认值
  switch (type) {
    case 'button':
      defaults.label = tStatic('widgets.button.defaultLabel')
      defaults.command = ''
      defaults.style = 'primary'
      defaults.isHex = false
      defaults.appendCR = false
      defaults.appendLF = true
      break
    case 'slider':
      defaults.label = '参数'
      defaults.value = 50
      defaults.min = 0
      defaults.max = 100
      break
    case 'gauge':
      defaults.min = 0
      defaults.max = 100
      defaults.unit = '%'
      break
    case 'value':
      defaults.precision = 2
      defaults.unit = ''
      break
    case 'trigger':
      defaults.condition = '>'
      defaults.threshold = 50
      defaults.action = ''
      break
    case 'calculator':
      defaults.expression = ''
      defaults.precision = 2
      break
    case 'histogram':
      defaults.bins = 20
      break
    case 'fft':
      defaults.channel = 0
      defaults.fftSize = 128
      defaults.minFreq = 0
      defaults.maxFreq = 2
      defaults.sampleRateHz = 0
      defaults.unit = 'Hz'
      break
    case 'xyplot':
      defaults.xChannel = 0
      defaults.yChannel = 1
      defaults.dataSource = {
        type: 'channels',
        channelIds: [0, 1]
      }
      break
    case 'waveform':
      defaults.dataSource = {
        type: 'channels',
        channelIds: [0, 1, 2]
      }
      defaults.channels = [0, 1, 2]
      break
    case 'sparkline':
      defaults.channel = 0
      defaults.drawMode = 'trend'
      defaults.fullHistory = true
      defaults.historyLength = 120
      defaults.precision = 2
      defaults.unit = ''
      break
  }
  
  return defaults
}
