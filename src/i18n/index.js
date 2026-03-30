const LOCALE_STORAGE_KEY = 'meow_serial_locale'
export const DEFAULT_LOCALE = 'zh-CN'
export const SUPPORTED_LOCALES = ['zh-CN', 'en']

export const messages = {
  'zh-CN': {
    app: {
      tabs: {
        canvas: '画布喵',
        terminal: '终端喵',
        protocol: '协议喵'
      },
      contextMenu: {
        editWidget: '编辑控件',
        duplicateWidget: '复制控件',
        clearTrend: '清空趋势数据',
        bringToFront: '置于顶层',
        sendToBack: '置于底层',
        deleteWidget: '删除控件',
        addWidget: '添加控件'
      }
    },
    header: {
      appTitle: '喵喵的串口工具',
      version: 'v2.0',
      buttons: {
        widgets: '控件',
        background: '背景',
        export: '导出',
        import: '导入',
        clearAll: '全局清空'
      },
      backgroundModes: {
        grid: '网格',
        dots: '点点',
        blank: '空白'
      },
      backgroundTitle: '切换画布背景：网格 / 点点 / 空白',
      exportTitle: '导出当前全局配置为 JSON：串口管理、协议库、控件和相关设置',
      importTitle: '从 JSON 导入一整套全局配置：串口管理、协议库、控件和相关设置',
      portsOnline: '{online} / {total} 端口在线',
      websocketOnly: '仅可用 WebSocket',
      confirmImport: '导入 JSON 会覆盖当前全局配置，并写入当前自动保存状态，是否继续？',
      confirmClearAll: '确定要全局清空吗？这会清掉当前所有端口日志和界面数据。',
      notifications: {
        exportSuccess: '已导出全局配置 JSON: {filename}',
        exportError: '全局配置导出失败',
        importSuccess: '已导入全局配置 JSON: {filename}',
        importError: '全局配置导入失败',
        clearAllSuccess: '已全局清空当前数据',
        backgroundChanged: '画布背景已切换为{mode}'
      }
    },
    theme: {
      dark: '深色',
      light: '浅色',
      switchToMode: '切换到{mode}模式',
      rendering: '渲染加速',
      renderingModes: {
        auto: '自动',
        on: '增强',
        off: '省电'
      },
      locale: '语言',
      locales: {
        'zh-CN': '中文',
        en: 'English'
      }
    },
    widgetPanel: {
      title: '控件喵盒',
      subtitle: '选择控件添加到画布'
    },
    settings: {
      title: '控件设置',
      titleLabel: '标题',
      channelLabel: '绑定通道',
      buttonHelp: '按钮控件建议先设置文字、命令和发送格式，这样放到画布上就能直接用。',
      buttonLabel: '按钮文字',
      buttonLabelPlaceholder: '例如：开始采集',
      buttonCommand: '发送命令',
      buttonCommandPlaceholder: '例如：START',
      buttonStyle: '按钮风格',
      buttonSendFormat: '发送格式',
      utf8: 'UTF-8 文本',
      hex: 'HEX 字节',
      lineEnding: '行尾',
      appendCR: '追加 CR',
      appendLF: '追加 LF',
      lineEndingHint: '行尾设置仅对 UTF-8 文本模式生效。',
      width: '宽度',
      height: '高度',
      deleteWidget: '删除控件',
      selectWidget: '选择一个控件进行设置',
      buttonStyles: {
        primary: '主按钮',
        success: '成功',
        warning: '警告',
        danger: '危险'
      }
    },
    widgets: {
      waveform: { name: '波形图', desc: '多通道实时波形' },
      sparkline: { name: '迷你波形图', desc: '单通道迷你趋势线' },
      fft: { name: 'FFT频谱', desc: '频谱分析' },
      histogram: { name: '直方图', desc: '数据分布统计' },
      xyplot: { name: 'XY散点图', desc: '双通道相关性' },
      value: { name: '数值显示', desc: '大字体数值' },
      gauge: { name: '仪表盘', desc: '圆弧仪表' },
      button: { name: '按钮', desc: '发送命令', defaultLabel: '发送喵' },
      slider: { name: '滑块', desc: '参数调节' },
      led: { name: 'LED指示灯', desc: '状态指示' },
      terminal: { name: '迷你终端', desc: '数据日志' },
      trigger: { name: '触发器', desc: '条件触发执行' },
      calculator: { name: '计算器', desc: '数据运算' }
    }
  },
  en: {
    app: {
      tabs: {
        canvas: 'Canvas',
        terminal: 'Terminal',
        protocol: 'Protocols'
      },
      contextMenu: {
        editWidget: 'Edit Widget',
        duplicateWidget: 'Duplicate Widget',
        clearTrend: 'Clear Trend Data',
        bringToFront: 'Bring to Front',
        sendToBack: 'Send to Back',
        deleteWidget: 'Delete Widget',
        addWidget: 'Add Widget'
      }
    },
    header: {
      appTitle: 'Meow Serial Tool',
      version: 'v2.0',
      buttons: {
        widgets: 'Widgets',
        background: 'Background',
        export: 'Export',
        import: 'Import',
        clearAll: 'Clear All'
      },
      backgroundModes: {
        grid: 'Grid',
        dots: 'Dots',
        blank: 'Blank'
      },
      backgroundTitle: 'Cycle canvas background: Grid / Dots / Blank',
      exportTitle: 'Export the current global workspace as JSON: ports, protocols, widgets, and related settings',
      importTitle: 'Import a full global workspace from JSON: ports, protocols, widgets, and related settings',
      portsOnline: '{online} / {total} ports online',
      websocketOnly: 'WebSocket only',
      confirmImport: 'Importing JSON will overwrite the current global workspace and update the autosaved state. Continue?',
      confirmClearAll: 'Clear everything? This will remove current port logs and interface data.',
      notifications: {
        exportSuccess: 'Exported workspace JSON: {filename}',
        exportError: 'Failed to export workspace JSON',
        importSuccess: 'Imported workspace JSON: {filename}',
        importError: 'Failed to import workspace JSON',
        clearAllSuccess: 'Cleared current data',
        backgroundChanged: 'Canvas background switched to {mode}'
      }
    },
    theme: {
      dark: 'Dark',
      light: 'Light',
      switchToMode: 'Switch to {mode} mode',
      rendering: 'Rendering',
      renderingModes: {
        auto: 'Auto',
        on: 'Boost',
        off: 'Eco'
      },
      locale: 'Language',
      locales: {
        'zh-CN': '中文',
        en: 'English'
      }
    },
    widgetPanel: {
      title: 'Widget Box',
      subtitle: 'Pick a widget to place on the canvas'
    },
    settings: {
      title: 'Widget Settings',
      titleLabel: 'Title',
      channelLabel: 'Channel',
      buttonHelp: 'For button widgets, it is best to set the label, command, and send format first so the control is ready to use right away.',
      buttonLabel: 'Button Label',
      buttonLabelPlaceholder: 'Example: Start Capture',
      buttonCommand: 'Command',
      buttonCommandPlaceholder: 'Example: START',
      buttonStyle: 'Button Style',
      buttonSendFormat: 'Send Format',
      utf8: 'UTF-8 Text',
      hex: 'HEX Bytes',
      lineEnding: 'Line Ending',
      appendCR: 'Append CR',
      appendLF: 'Append LF',
      lineEndingHint: 'Line ending options apply only in UTF-8 text mode.',
      width: 'Width',
      height: 'Height',
      deleteWidget: 'Delete Widget',
      selectWidget: 'Select a widget to edit',
      buttonStyles: {
        primary: 'Primary',
        success: 'Success',
        warning: 'Warning',
        danger: 'Danger'
      }
    },
    widgets: {
      waveform: { name: 'Waveform', desc: 'Live multi-channel waveform' },
      sparkline: { name: 'Sparkline', desc: 'Single-channel mini trend line' },
      fft: { name: 'FFT Spectrum', desc: 'Frequency analysis' },
      histogram: { name: 'Histogram', desc: 'Data distribution stats' },
      xyplot: { name: 'XY Plot', desc: 'Two-channel correlation' },
      value: { name: 'Value Display', desc: 'Large live numeric readout' },
      gauge: { name: 'Gauge', desc: 'Arc gauge display' },
      button: { name: 'Button', desc: 'Send a command', defaultLabel: 'Send' },
      slider: { name: 'Slider', desc: 'Parameter control' },
      led: { name: 'LED Indicator', desc: 'Status indicator' },
      terminal: { name: 'Mini Terminal', desc: 'Data logs' },
      trigger: { name: 'Trigger', desc: 'Conditional action runner' },
      calculator: { name: 'Calculator', desc: 'Data math' }
    }
  }
}

export const normalizeLocale = (locale) => (locale === 'en' ? 'en' : DEFAULT_LOCALE)

const getValueByPath = (object, path) => path.split('.').reduce((current, key) => current?.[key], object)

export const getSavedLocale = () => {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY))
}

export const persistLocale = (locale) => {
  if (typeof window === 'undefined') return
  const normalized = normalizeLocale(locale)
  localStorage.setItem(LOCALE_STORAGE_KEY, normalized)
  document.documentElement.lang = normalized === 'en' ? 'en' : 'zh-CN'
}

export const translateWithLocale = (locale, key, params = {}) => {
  const normalized = normalizeLocale(locale)
  const template = getValueByPath(messages[normalized], key)
    ?? getValueByPath(messages[DEFAULT_LOCALE], key)
    ?? key

  return String(template).replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? `{${token}}`))
}

export const tStatic = (key, params = {}, locale = getSavedLocale()) => translateWithLocale(locale, key, params)
