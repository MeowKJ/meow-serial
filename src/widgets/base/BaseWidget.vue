<script setup>
import { computed, provide } from 'vue'
import { useSerialStore } from '../../stores/serial'

/**
 * 基础控件组件
 * 所有控件都应该继承此组件，以获得基础属性和功能
 */
const props = defineProps({
  widget: {
    type: Object,
    required: true,
    validator: (widget) => {
      // 验证基础必需属性
      return widget && 
             typeof widget.id !== 'undefined' &&
             typeof widget.type !== 'undefined' &&
             typeof widget.w !== 'undefined' &&
             typeof widget.h !== 'undefined' &&
             typeof widget.x !== 'undefined' &&
             typeof widget.y !== 'undefined'
    }
  }
})

const store = useSerialStore()

// ===== 基础属性 =====

/**
 * 尺寸属性
 */
const dimensions = computed(() => ({
  width: props.widget.w || 100,
  height: props.widget.h || 100
}))

/**
 * 最小尺寸
 */
const minDimensions = computed(() => ({
  width: props.widget.minW || 100,
  height: props.widget.minH || 60
}))

/**
 * 位置属性
 */
const position = computed(() => ({
  x: props.widget.x || 0,
  y: props.widget.y || 0
}))

/**
 * 数据源配置
 * 支持多种数据源类型：
 * - channel: 单个通道ID
 * - channels: 通道ID数组
 * - dataSource: 自定义数据源配置对象
 */
const dataSource = computed(() => {
  // 如果明确指定了dataSource，使用它
  if (props.widget.dataSource) {
    return props.widget.dataSource
  }
  
  // 兼容旧版本的channel属性
  if (typeof props.widget.channel !== 'undefined') {
    return {
      type: 'channel',
      channelId: props.widget.channel
    }
  }
  
  // 兼容旧版本的channels属性
  if (Array.isArray(props.widget.channels)) {
    return {
      type: 'channels',
      channelIds: props.widget.channels
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
  return props.widget.visible !== false
})

/**
 * 控件是否启用
 */
const isEnabled = computed(() => {
  return props.widget.enabled !== false && store.connected
})

/**
 * 控件标题
 */
const title = computed(() => {
  return props.widget.title || props.widget.type || '控件'
})

/**
 * 控件ID
 */
const widgetId = computed(() => {
  return props.widget.id
})

/**
 * 控件类型
 */
const widgetType = computed(() => {
  return props.widget.type
})

// 向子组件提供基础功能
provide('widgetBase', {
  dimensions,
  minDimensions,
  position,
  dataSource,
  getChannelData,
  getChannelsData,
  getDataSourceData,
  getHistoryData,
  isVisible,
  isEnabled,
  title,
  widgetId,
  widgetType,
  store
})
</script>

<template>
  <div 
    v-if="isVisible"
    class="base-widget"
    :class="{
      'widget-disabled': !isEnabled
    }"
  >
    <!-- 基础控件内容由子组件实现 -->
    <slot />
  </div>
</template>

<style scoped>
.base-widget {
  width: 100%;
  height: 100%;
}

.widget-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
