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
- 🐱 **三套猫咪主题** - 布偶猫/暹罗猫/三花猫，支持深色/浅色模式
- 🔤 **智能HEX翻译** - 悬停HEX字节实时显示UTF-8字符
- 🔄 **进制转换工具** - 二进制/八进制/十进制/十六进制实时转换

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
│   │   ├── CatMascot.vue    # 猫咪助手
│   │   └── terminal/        # 终端子组件
│   │       └── BaseConverter.vue  # 进制转换器
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
│   │   ├── serial.js        # 串口Store
│   │   └── theme.js         # 主题Store
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

## 📟 终端功能

### 显示模式
- **UTF-8模式** - 标准文本显示，支持中文等多字节字符
- **HEX模式** - 十六进制显示，悬停可查看UTF-8翻译
- **混合模式** - HEX + UTF-8 双行显示，同步高亮

### HEX翻译功能
悬停在HEX字节上，自动显示：
- 对应的UTF-8字符
- Unicode码点
- 字节数（多字节字符）
- 特殊字符名称（如 `\r` `\n` `\t`）

### 消息地图
- 可视化显示TX/RX消息分布
- 拖拽视窗快速定位
- 点击消息类型筛选

### 工具面板
- **进制转换器** - 支持二/八/十/十六进制实时转换
- 智能输入验证（如二进制只允许0和1）
- 一键复制转换结果

## 🎨 主题系统

| 主题 | 浅色模式 | 深色模式 | 风格 |
|------|----------|----------|------|
| 🐱 布偶猫 | 天蓝色系 | 🐈‍⬛ 黑猫（琥珀强调色） | 清新可爱 |
| 🐈 暹罗猫 | 黑白灰 | VSCode风格 | 简约大气 |
| 🐾 三花猫 | 粉橙黄 | 深棕暖色 | 活泼多彩 |

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
- [x] 主题自定义（已完成：三套主题 + 深色/浅色模式）
- [ ] 多语言支持

## 📄 许可证

MIT License

---

Made with 💕 by 喵喵工作室 🐱
