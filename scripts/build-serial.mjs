import { copyFile, rm } from 'node:fs/promises'
import { build } from 'vite'

await rm('public/serial', { recursive: true, force: true })

process.env.VITE_SERIAL_BASE = '/serial/'

await build({
  base: '/serial/',
  publicDir: false,
  build: {
    outDir: 'public/serial',
    emptyOutDir: true
  }
})

await copyFile('public/serial/index.html', 'public/serial/404.html')
