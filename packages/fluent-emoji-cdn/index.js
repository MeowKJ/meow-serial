const DEFAULT_REPO = {
  owner: 'microsoft',
  repo: 'fluentui-emoji',
  ref: 'main'
}

const CDN_PROVIDERS = {
  jsdelivr: (repo, assetPath) =>
    `https://cdn.jsdelivr.net/gh/${repo.owner}/${repo.repo}@${repo.ref}/assets/${assetPath}`,
  rawGithub: (repo, assetPath) =>
    `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.ref}/assets/${assetPath}`
}

const encodeAssetPath = (value) => value
  .split('/')
  .map((segment) => encodeURIComponent(segment))
  .join('/')

const toSnakeCase = (value) => value
  .toLowerCase()
  .replace(/#/g, ' number ')
  .replace(/\*/g, ' star ')
  .replace(/&/g, ' and ')
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')

export const fluentEmojiCatalog = {
  cat: { assetName: 'Cat', fallback: '🐱' },
  grinningCat: { assetName: 'Grinning cat with smiling eyes', fallback: '😸' },
  blackCat: { assetName: 'Black cat', fallback: '🐈‍⬛' },
  catAlt: { assetName: 'Cat', fallback: '🐈' },
  pawPrints: { assetName: 'Paw prints', fallback: '🐾' },
  satelliteAntenna: { assetName: 'Satellite antenna', fallback: '📡' },
  chartIncreasing: { assetName: 'Chart increasing', fallback: '📈' },
  clipboard: { assetName: 'Clipboard', fallback: '📋' },
  inputNumbers: { assetName: 'Input numbers', fallback: '🔢' },
  wrench: { assetName: 'Wrench', fallback: '🔧' },
  artistPalette: { assetName: 'Artist palette', fallback: '🎨' },
  desktopComputer: { assetName: 'Desktop computer', fallback: '🖥️' },
  gear: { assetName: 'Gear', fallback: '⚙️' },
  pageFacingUp: { assetName: 'Page facing up', fallback: '📄' },
  broom: { assetName: 'Broom', fallback: '🧹' },
  wastebasket: { assetName: 'Wastebasket', fallback: '🗑️' },
  puzzlePiece: { assetName: 'Puzzle piece', fallback: '🧩' },
  floppyDisk: { assetName: 'Floppy disk', fallback: '💾' },
  fileFolder: { assetName: 'File folder', fallback: '📁' },
  warning: { assetName: 'Warning', fallback: '⚠️' },
  barChart: { assetName: 'Bar chart', fallback: '📊' },
  stopwatch: { assetName: 'Stopwatch', fallback: '⏱️' },
  antennaBars: { assetName: 'Antenna bars', fallback: '📶' },
  radioButton: { assetName: 'Radio button', fallback: '🔘' },
  levelSlider: { assetName: 'Level slider', fallback: '🎚️' },
  lightBulb: { assetName: 'Light bulb', fallback: '💡' },
  pager: { assetName: 'Pager', fallback: '📟' },
  highVoltage: { assetName: 'High voltage', fallback: '⚡' },
  abacus: { assetName: 'Abacus', fallback: '🧮' },
  hammerAndWrench: { assetName: 'Hammer and wrench', fallback: '🛠️' },
  receipt: { assetName: 'Receipt', fallback: '🧾' },
  lockedWithKey: { assetName: 'Locked with key', fallback: '🔐' },
  counterclockwiseArrows: { assetName: 'Counterclockwise arrows button', fallback: '🔄' },
  magnifyingGlass: { assetName: 'Magnifying glass tilted left', fallback: '🔍' },
  inboxTray: { assetName: 'Inbox tray', fallback: '📥' },
  crescentMoon: { assetName: 'Crescent moon', fallback: '🌙' },
  sun: { assetName: 'Sun', fallback: '☀️' },
  clapperBoard: { assetName: 'Clapper board', fallback: '🎬' },
  openFileFolder: { assetName: 'Open file folder', fallback: '📂' },
  videocassette: { assetName: 'Videocassette', fallback: '📼' },
  electricPlug: { assetName: 'Electric plug', fallback: '🔌' }
}

export const buildFluentEmojiAssetPath = (assetName, { style = '3D' } = {}) => {
  const normalizedStyle = style === '3D' ? '3D' : style
  const extension = normalizedStyle === '3D' ? 'png' : 'svg'
  const suffix = normalizedStyle === '3D'
    ? '3d'
    : toSnakeCase(normalizedStyle)

  return encodeAssetPath(`${assetName}/${normalizedStyle}/${toSnakeCase(assetName)}_${suffix}.${extension}`)
}

export const buildFluentEmojiUrl = (assetName, {
  provider = 'jsdelivr',
  repo = DEFAULT_REPO,
  style = '3D'
} = {}) => {
  const resolver = CDN_PROVIDERS[provider] || CDN_PROVIDERS.jsdelivr
  return resolver(repo, buildFluentEmojiAssetPath(assetName, { style }))
}

export const getFluentEmojiMeta = (name) => fluentEmojiCatalog[name] || null

export const getFluentEmojiUrl = (name, options = {}) => {
  const emoji = getFluentEmojiMeta(name)
  if (!emoji) return ''
  return buildFluentEmojiUrl(emoji.assetName, options)
}

export const hasFluentEmoji = (name) => Boolean(getFluentEmojiMeta(name))

export const createFluentEmojiClient = (defaults = {}) => ({
  url(name, options = {}) {
    return getFluentEmojiUrl(name, {
      ...defaults,
      ...options
    })
  },
  meta(name) {
    return getFluentEmojiMeta(name)
  },
  has(name) {
    return hasFluentEmoji(name)
  }
})
