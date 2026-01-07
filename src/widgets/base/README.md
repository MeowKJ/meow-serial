# 基础控件系统

## 概述

基础控件系统为所有控件提供了统一的属性定义和功能接口，包括：
- **尺寸管理**：宽度、高度、最小尺寸
- **数据源管理**：统一的通道数据访问接口
- **状态管理**：可见性、启用状态等

## 基础属性

所有控件都应该包含以下基础属性：

### 必需属性
- `id` (Number): 控件唯一标识
- `type` (String): 控件类型
- `x`, `y` (Number): 控件位置
- `w`, `h` (Number): 控件尺寸

### 可选属性
- `minW`, `minH` (Number): 最小尺寸，默认 100x60
- `title` (String): 控件标题
- `visible` (Boolean): 是否可见，默认 true
- `enabled` (Boolean): 是否启用，默认 true
- `zIndex` (Number): 层级，默认 0
- `locked` (Boolean): 是否锁定，默认 false

### 数据源配置

数据源可以通过以下方式配置：

#### 方式1：使用 dataSource 对象（推荐）
```javascript
{
  dataSource: {
    type: 'channel',      // 'channel' | 'channels' | 'custom'
    channelId: 0          // 单个通道ID
  }
}
```

```javascript
{
  dataSource: {
    type: 'channels',
    channelIds: [0, 1, 2]  // 多个通道ID
  }
}
```

#### 方式2：兼容旧版本属性
```javascript
{
  channel: 0              // 单个通道
}
```

```javascript
{
  channels: [0, 1, 2]     // 多个通道
}
```

## 使用方式

### 在控件中使用 useBaseWidget

```vue
<script setup>
import { computed, toRef } from 'vue'
import { useBaseWidget } from './base'

const props = defineProps({
  widget: Object
})

// 使用基础控件功能
const widgetRef = toRef(props, 'widget')
const {
  dimensions,        // 尺寸 { width, height }
  minDimensions,     // 最小尺寸 { width, height }
  position,          // 位置 { x, y }
  dataSource,        // 数据源配置
  getChannelData,    // 获取单个通道数据
  getChannelsData,   // 获取多个通道数据
  getDataSourceData, // 根据数据源获取数据
  getHistoryData,    // 获取历史数据
  isVisible,         // 是否可见
  isEnabled,         // 是否启用
  title,             // 控件标题
  widgetId,          // 控件ID
  widgetType,        // 控件类型
  store              // SerialStore 引用
} = useBaseWidget(widgetRef)

// 获取当前通道数据
const channel = computed(() => {
  return getDataSourceData()
})

// 获取历史数据
const history = computed(() => {
  return getHistoryData(100) // 最近100个数据点
})
</script>

<template>
  <div class="widget-content">
    <!-- 使用 channel 数据 -->
    <div>{{ channel?.value }}</div>
  </div>
</template>
```

## 控件类型配置

在 `src/widgets/index.js` 中配置控件类型时，应该包含最小尺寸：

```javascript
{
  type: 'mywidget',
  name: '我的控件',
  icon: '🎨',
  desc: '控件描述',
  category: '显示',
  defaultW: 200,
  defaultH: 150,
  minW: 150,    // 最小宽度
  minH: 100     // 最小高度
}
```

## 创建新控件

1. 在 `src/widgets/` 目录下创建新的控件文件，例如 `MyWidget.vue`
2. 使用 `useBaseWidget` composable 获取基础功能
3. 在 `src/widgets/index.js` 中注册控件
4. 在 `src/components/CanvasView.vue` 中添加控件组件映射

示例：

```vue
<!-- MyWidget.vue -->
<script setup>
import { computed, toRef } from 'vue'
import { useBaseWidget } from './base'

const props = defineProps({
  widget: Object
})

const widgetRef = toRef(props, 'widget')
const { getDataSourceData } = useBaseWidget(widgetRef)

const channel = computed(() => getDataSourceData())
</script>

<template>
  <div class="my-widget">
    <div>{{ channel?.value }}</div>
  </div>
</template>
```

## 工具函数

### createBaseWidgetConfig

创建基础控件配置：

```javascript
import { createBaseWidgetConfig } from './base'

const config = createBaseWidgetConfig('mywidget', {
  title: '我的控件',
  w: 200,
  h: 150,
  dataSource: {
    type: 'channel',
    channelId: 0
  }
})
```

### mergeWidgetConfig

合并控件配置：

```javascript
import { mergeWidgetConfig } from './base'

const merged = mergeWidgetConfig(baseConfig, {
  title: '新标题',
  w: 300
})
```

### validateWidgetConfig

验证控件配置：

```javascript
import { validateWidgetConfig } from './base'

if (validateWidgetConfig(config)) {
  // 配置有效
}
```

## 最佳实践

1. **始终使用 useBaseWidget**：所有控件都应该使用此 composable
2. **使用 dataSource 配置**：优先使用新的 dataSource 配置方式
3. **设置合理的最小尺寸**：确保控件在不同尺寸下都能正常显示
4. **保持向后兼容**：支持旧的 channel/channels 属性
5. **验证配置**：在创建控件时验证配置的有效性
