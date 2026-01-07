# 🐱 喵喵的串口工具 v2.0

> 一款清晰、实用、高性能的现代串口调试助手

![Version](https://img.shields.io/badge/version-2.0.0-E8A0BF)
![Vue](https://img.shields.io/badge/Vue-3.4-42b883)
![License](https://img.shields.io/badge/license-MIT-BA90C6)

## ✨ 特点

- 🎨 **清晰大气的界面** - 简洁实用，无花哨霓虹效果
- 🚀 **高刷新率** - 60FPS流畅渲染，高性能Canvas绑定
- 🧩 **模块化控件系统** - 12种控件，自由拖拽、缩放、配置
- 📋 **多协议支持** - Raw/FireWater/JustFloat/JSON/自定义
- 🐱 **猫咪主题** - 可爱的猫咪元素贯穿始终

## 📁 项目结构

```
meow-serial-v2/
├── src/
│   ├── components/          # 页面组件
│   │   ├── HeaderBar.vue    # 顶部工具栏
│   │   ├── Sidebar.vue      # 左侧配置面板
│   │   ├── CanvasView.vue   # 画布视图
│   │   ├── TerminalView.vue # 终端视图
│   │   ├── ProtocolView.vue # 协议配置
│   │   ├── ReplayView.vue   # 数据回放
│   │   ├── WidgetPanel.vue  # 控件选择面板
│   │   ├── SettingsPanel.vue# 控件设置面板
│   │   ├── ContextMenu.vue  # 右键菜单
│   │   └── CatMascot.vue    # 猫咪助手
│   │
│   ├── widgets/             # 控件组件
│   │   ├── WaveformWidget.vue   # 📈 波形图
│   │   ├── FFTWidget.vue        # 📊 FFT频谱
│   │   ├── HistogramWidget.vue  # 📶 直方图
│   │   ├── XYPlotWidget.vue     # ⚬ XY散点图
│   │   ├── ValueWidget.vue      # 🔢 数值显示
│   │   ├── GaugeWidget.vue      # ⏱️ 仪表盘
│   │   ├── ButtonWidget.vue     # 🔘 按钮
│   │   ├── SliderWidget.vue     # 🎚️ 滑块
│   │   ├── LedWidget.vue        # 💡 LED指示灯
│   │   ├── TerminalWidget.vue   # 📟 迷你终端
│   │   ├── TriggerWidget.vue    # ⚡ 触发器
│   │   ├── CalculatorWidget.vue # 🧮 计算器
│   │   └── index.js             # 控件索引
│   │
│   ├── stores/              # 状态管理
│   │   └── serial.js        # Pinia Store
│   │
│   ├── utils/               # 工具函数
│   │   ├── dataParser.js    # 数据解析
│   │   ├── storage.js       # 本地存储
│   │   ├── dataExport.js    # 数据导出
│   │   └── index.js
│   │
│   ├── styles/
│   │   └── main.css         # 全局样式
│   │
│   ├── App.vue              # 根组件
│   └── main.js              # 入口文件
│
├── public/
│   └── favicon.svg          # 猫咪图标
│
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 🧩 控件列表

### 显示类
| 控件 | 图标 | 说明 |
|------|------|------|
| 波形图 | 📈 | 多通道实时波形显示 |
| FFT频谱 | 📊 | 频谱分析可视化 |
| 直方图 | 📶 | 数据分布统计 |
| XY散点图 | ⚬ | 双通道相关性分析 |
| 数值显示 | 🔢 | 大字体实时数值 |
| 仪表盘 | ⏱️ | 圆弧仪表显示 |
| LED指示灯 | 💡 | 状态指示灯组 |

### 控制类
| 控件 | 图标 | 说明 |
|------|------|------|
| 按钮 | 🔘 | 发送自定义命令 |
| 滑块 | 🎚️ | 参数调节控制 |

### 高级功能
| 控件 | 图标 | 说明 |
|------|------|------|
| 触发器 | ⚡ | 条件触发自动执行 |
| 计算器 | 🧮 | 多通道数据运算 |
| 迷你终端 | 📟 | 内嵌数据日志 |

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build
```

## 📋 协议支持

### FireWater (默认)
```
25.5,60.2,101.3\n
```

### JustFloat
```
[float32][float32]...[0x00 0x00 0x80 0x7F]
```

### JSON
```json
{"temp":25.5,"humi":60.2,"pressure":101.3}
```

### 自定义
支持自定义分隔符、结束符、解析函数

## 🐱 猫咪元素

- 😺 连接按钮: "连接喵!"
- 😿 断开按钮: "断开连接喵"
- 🐾 发送按钮: "发送喵 🐾"
- 🧩 控件面板: "控件喵盒"
- 📋 协议页面: "协议喵"
- 🎬 回放页面: "回放喵"
- 右下角猫咪助手陪伴~

## 🎯 后续计划

- [ ] Electron集成真实串口
- [ ] 数据录制与回放
- [ ] Python脚本扩展
- [ ] 更多控件类型
- [ ] 主题自定义
- [ ] 多语言支持

## 📄 许可证

MIT License

---

Made with 💕 by 喵喵工作室 🐱
