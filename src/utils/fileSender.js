/**
 * 通用逐行文件发送
 *
 * @param {SerialManager} manager - 目标 SerialManager 实例
 * @param {string} text - 文件内容
 * @param {Object} options
 * @param {number} options.delayMs - 行间延迟 (默认 80ms)
 * @param {string[]} options.commentPrefixes - 注释前缀，跳过匹配行 (默认 ['#', '%'])
 * @param {boolean} options.appendCR - 追加 CR (默认 true)
 * @param {boolean} options.appendLF - 追加 LF (默认 true)
 * @param {Function} options.onProgress - 进度回调 (lineIndex, totalLines, lineText)
 * @param {Function} options.onError - 错误回调 (lineIndex, lineText, error)
 * @returns {Promise<boolean>} 是否全部发送成功
 */
export async function sendFileLineByLine(manager, text, options = {}) {
  const {
    delayMs = 80,
    commentPrefixes = ['#', '%'],
    appendCR = true,
    appendLF = true,
    onProgress = null,
    onError = null
  } = options

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false
      return !commentPrefixes.some(prefix => line.startsWith(prefix))
    })

  if (lines.length === 0) return false

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const success = await manager.send(line, {
      appendCR,
      appendLF,
      isHex: false
    })

    if (!success) {
      if (onError) onError(i, line, new Error('send failed'))
      return false
    }

    if (onProgress) onProgress(i, lines.length, line)

    if (delayMs > 0 && i < lines.length - 1) {
      await sleep(delayMs)
    }
  }

  return true
}
