export const getPreferredCanvasDpr = (renderingStore) => {
  const deviceDpr = window.devicePixelRatio || 1
  const maxDpr = renderingStore?.qualityPreset?.maxDpr || 1
  return Math.max(1, Math.min(deviceDpr, maxDpr))
}

export const getCanvasContextOptions = (renderingStore) => ({
  alpha: false,
  desynchronized: Boolean(renderingStore?.qualityPreset?.desynchronized),
  willReadFrequently: false
})

export const getAccelerated2DContext = (canvas, renderingStore) => {
  const options = getCanvasContextOptions(renderingStore)
  return canvas.getContext('2d', options) || canvas.getContext('2d')
}

export const resizeCanvasToContainer = (canvas, container, renderingStore, { heightOffset = 0 } = {}) => {
  if (!canvas || !container) return null

  const dpr = getPreferredCanvasDpr(renderingStore)
  const width = Math.max(1, Math.floor(container.clientWidth * dpr))
  const height = Math.max(1, Math.floor(Math.max(container.clientHeight - heightOffset, 1) * dpr))

  canvas.width = width
  canvas.height = height
  canvas.style.width = `${container.clientWidth}px`
  canvas.style.height = `${Math.max(container.clientHeight - heightOffset, 1)}px`

  return {
    dpr,
    width: width / dpr,
    height: height / dpr
  }
}

export const createRafLoop = (callback, renderingStore) => {
  let frameId = null
  let lastFrameTime = 0
  let running = false

  const tick = (timestamp) => {
    if (!running) return

    const fpsLimit = renderingStore?.qualityPreset?.targetFps || 60
    const minDelta = fpsLimit >= 59 ? 0 : 1000 / fpsLimit

    if (timestamp - lastFrameTime >= minDelta) {
      lastFrameTime = timestamp
      callback(timestamp)
    }

    frameId = requestAnimationFrame(tick)
  }

  return {
    start() {
      if (running) return
      running = true
      lastFrameTime = 0
      frameId = requestAnimationFrame(tick)
    },
    stop() {
      running = false
      if (frameId) cancelAnimationFrame(frameId)
      frameId = null
    }
  }
}
