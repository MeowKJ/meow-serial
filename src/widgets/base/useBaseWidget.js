import { computed } from 'vue'
import { useSerialStore } from '../../stores/serial'

/**
 * 基础控件 Composable
 * 所有控件都应该使用此 composable 来获取基础功能
 */
export function useBaseWidget(widget) {
  const store = useSerialStore()

  // ===== 基础属性 =====

  /**
   * 尺寸属性
   */
  const dimensions = computed(() => ({
    width: widget.value?.w || 100,
    height: widget.value?.h || 100
  }))

  /**
   * 最小尺寸
   */
  const minDimensions = computed(() => ({
    width: widget.value?.minW || 100,
    height: widget.value?.minH || 60
  }))

  /**
   * 位置属性
   */
  const position = computed(() => ({
    x: widget.value?.x || 0,
    y: widget.value?.y || 0
  }))

  /**
   * 数据源配置
   * 支持多种数据源类型：
   * - channel: 单个通道ID
   * - channels: 通道ID数组
   * - custom: 自定义数据源
   */
  const dataSource = computed(() => {
    // 如果明确指定了dataSource，使用它
    if (widget.value?.dataSource) {
      return widget.value.dataSource
    }
    
    // 兼容旧版本的channel属性
    if (typeof widget.value?.channel !== 'undefined') {
      return {
        type: 'channel',
        channelId: widget.value.channel
      }
    }
    
    // 兼容旧版本的channels属性
    if (Array.isArray(widget.value?.channels)) {
      return {
        type: 'channels',
        channelIds: widget.value.channels
      }
    }
    
    // 默认使用第一个通道
    return {
      type: 'channel',
      channelId: 0
    }
  })

  /**
   * 获取单个通道数据
   */
  const getChannelData = (channelId) => {
    const channel = store.channels.find(ch => ch.id === channelId)
    return channel || store.channels[0] || null
  }

  /**
   * 获取多个通道数据
   */
  const getChannelsData = (channelIds) => {
    return channelIds.map(id => getChannelData(id)).filter(Boolean)
  }

  /**
   * 根据数据源获取数据
   */
  const getDataSourceData = () => {
    const source = dataSource.value
    
    switch (source.type) {
      case 'channel':
        return getChannelData(source.channelId)
      case 'channels':
        return getChannelsData(source.channelIds)
      case 'custom':
        // 自定义数据源，由子组件实现
        return source.data || null
      default:
        return getChannelData(0)
    }
  }

  /**
   * 获取历史数据
   */
  const getHistoryData = (limit = 100) => {
    return store.dataHistory.slice(-limit)
  }

  /**
   * 控件是否可见
   */
  const isVisible = computed(() => {
    return widget.value?.visible !== false
  })

  /**
   * 控件是否启用
   */
  const isEnabled = computed(() => {
    return widget.value?.enabled !== false && store.connected
  })

  /**
   * 控件标题
   */
  const title = computed(() => {
    return widget.value?.title || widget.value?.type || '控件'
  })

  /**
   * 控件ID
   */
  const widgetId = computed(() => {
    return widget.value?.id
  })

  /**
   * 控件类型
   */
  const widgetType = computed(() => {
    return widget.value?.type
  })

  return {
    // 属性
    dimensions,
    minDimensions,
    position,
    dataSource,
    isVisible,
    isEnabled,
    title,
    widgetId,
    widgetType,
    
    // 方法
    getChannelData,
    getChannelsData,
    getDataSourceData,
    getHistoryData,
    
    // Store引用
    store
  }
}
