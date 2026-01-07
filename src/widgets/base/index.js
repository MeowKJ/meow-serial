/**
 * 基础控件模块
 */
export { default as BaseWidget } from './BaseWidget.vue'
export { useBaseWidget } from './useBaseWidget.js'

/**
 * 基础控件属性定义
 * 所有控件都应该包含这些基础属性
 */
export const baseWidgetProps = {
  // 基础标识
  id: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  
  // 位置和尺寸
  x: {
    type: Number,
    default: 0
  },
  y: {
    type: Number,
    default: 0
  },
  w: {
    type: Number,
    default: 100
  },
  h: {
    type: Number,
    default: 100
  },
  
  // 最小尺寸
  minW: {
    type: Number,
    default: 100
  },
  minH: {
    type: Number,
    default: 60
  },
  
  // 数据源配置
  dataSource: {
    type: Object,
    default: null,
    validator: (value) => {
      if (!value) return true
      return value.type && ['channel', 'channels', 'custom'].includes(value.type)
    }
  },
  
  // 兼容旧版本的channel属性
  channel: {
    type: Number,
    default: null
  },
  
  // 兼容旧版本的channels属性
  channels: {
    type: Array,
    default: null
  },
  
  // 状态属性
  visible: {
    type: Boolean,
    default: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  
  // 其他通用属性
  zIndex: {
    type: Number,
    default: 0
  },
  locked: {
    type: Boolean,
    default: false
  }
}

/**
 * 创建基础控件配置
 */
export function createBaseWidgetConfig(type, overrides = {}) {
  return {
    type,
    title: '',
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    minW: 100,
    minH: 60,
    visible: true,
    enabled: true,
    zIndex: 0,
    locked: false,
    dataSource: {
      type: 'channel',
      channelId: 0
    },
    ...overrides
  }
}

/**
 * 验证控件配置
 */
export function validateWidgetConfig(config) {
  const required = ['id', 'type', 'x', 'y', 'w', 'h']
  const missing = required.filter(key => typeof config[key] === 'undefined')
  
  if (missing.length > 0) {
    console.warn(`控件配置缺少必需属性: ${missing.join(', ')}`)
    return false
  }
  
  // 验证尺寸
  if (config.w < (config.minW || 100) || config.h < (config.minH || 60)) {
    console.warn(`控件尺寸小于最小尺寸: ${config.w}x${config.h}`)
    return false
  }
  
  return true
}

/**
 * 合并控件配置，确保包含所有基础属性
 */
export function mergeWidgetConfig(base, overrides) {
  const merged = {
    ...createBaseWidgetConfig(base.type || overrides.type || 'unknown'),
    ...base,
    ...overrides
  }
  
  // 确保最小尺寸合理
  if (merged.w < merged.minW) merged.w = merged.minW
  if (merged.h < merged.minH) merged.h = merged.minH
  
  return merged
}
