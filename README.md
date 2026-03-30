# Meow Serial Tool

[English](README.md) | [简体中文](readme_zh.md)

> A cute serial debugging workspace for people who want to connect fast, inspect data, and build small live dashboards without wrestling with a giant toolchain.

![Version](https://img.shields.io/badge/version-2.0.0-ffb3c7)
![Vue](https://img.shields.io/badge/Vue-3.4-42b883)
![Vite](https://img.shields.io/badge/Vite-5.x-646cff)
![License](https://img.shields.io/badge/license-MIT-8bd3dd)

## What It Does

Meow Serial Tool is a browser-based serial / WebSocket debugging app with three main work areas:

- `Canvas`: build a live dashboard with draggable widgets
- `Terminal`: inspect raw traffic and send commands
- `Protocols`: configure parsers so incoming data becomes named channels

It is aimed at actual usage first: connect hardware, watch data, tweak settings, save the workspace, and come back later.

## Before You Start

- Node.js 18+
- A Chromium-based browser if you want to use Web Serial
- Or a WebSocket endpoint if your device is exposed over the network

## Install and Run

### Install dependencies

```bash
pnpm install
```

Or:

```bash
npm install
```

### Start the app

```bash
pnpm dev
```

Then open the local Vite URL shown in the terminal.

## How to Use

### 1. Add or configure a port

Use the left sidebar to:

- add a serial port or WebSocket port
- set baud rate and transport settings
- choose the target device
- connect or disconnect

### 2. Choose a parser

Open the `Protocols` tab when your incoming data is not just plain text.

You can:

- keep `raw` for plain terminal-style debugging
- choose a built-in parser
- create or edit protocol profiles
- map parsed fields into named channels

Once a parser is active, parsed values show up as channels and can be used by widgets.

### 3. Inspect traffic in Terminal

Use the `Terminal` tab to:

- inspect RX / TX logs
- switch display formats
- send text or HEX commands
- use append `CR` / `LF`
- export logs when needed

This is the best place to verify that the device is talking before you spend time building a dashboard.

### 4. Build a dashboard in Canvas

Use the `Widgets` button in the top bar to add widgets such as:

- waveform
- sparkline
- value card
- gauge
- FFT
- histogram
- XY plot
- button
- slider
- trigger
- mini terminal

Widgets can be dragged, resized, duplicated, layered, and configured from the right-side settings panel.

### 5. Configure control widgets

Control widgets are meant to be useful immediately, not just decorative.

For example, the button widget now supports:

- better default size for direct clicking
- label and command editing
- style presets
- UTF-8 text or HEX send mode
- `CR` / `LF` options

When you add a button widget, its settings panel opens automatically so you can configure it right away.

### 6. Save your workspace

Workspace JSON can preserve:

- widgets and layout
- ports and parser choices
- theme settings
- canvas background mode
- UI locale

Use export / import from the top bar when you want to move setups between machines or keep named snapshots.

## Useful Workflow

For most devices, the smoothest flow is:

1. Connect the port
2. Confirm traffic in `Terminal`
3. Pick or build a parser in `Protocols`
4. Verify channels are updating
5. Add widgets in `Canvas`
6. Export the workspace once it looks good

## i18n

The app includes lightweight built-in i18n support.

- Supported locales: `zh-CN`, `en`
- Switch language from the top-right language toggle
- Locale is saved locally
- Locale is also stored in workspace JSON

Current coverage focuses on the app shell, widget catalog, and key setup flows.

## Development

Development is intentionally simple.

### Common commands

```bash
pnpm dev
pnpm build
pnpm preview
```

### Main folders

```text
src/
├── components/   # App shell and views
├── widgets/      # Dashboard widgets
├── stores/       # Pinia state
├── parsers/      # Parser registry and built-ins
├── utils/        # Serial, storage, export helpers
├── i18n/         # Translation messages and helpers
└── styles/       # Global styles
```

If you are extending the project, the usual entry points are:

- `src/components/` for app-level UI
- `src/widgets/` for new dashboard controls
- `src/parsers/` for protocol support
- `src/i18n/` for translation coverage

## License

MIT

---

Made with paws, packets, and a healthy respect for debugging sessions.
