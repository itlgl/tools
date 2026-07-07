import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const distDir = join(projectRoot, 'dist')
const indexFile = join(distDir, 'index.html')

const routes = [
  'hash',
  'base64',
  'base',
  'aes',
  'url',
  'time',
  'timestamp',
  'uuid',
  'json',
  'regex',
  'regexp',
  'diff',
  'compare',
  'unicode',
  'escape',
  'password',
  'pwd',
  'hex',
  'qr',
  'qrcode',
]

await readFile(indexFile)

await Promise.all(
  routes.map(async (route) => {
    const routeDir = join(distDir, route)
    await mkdir(routeDir, { recursive: true })
    await copyFile(indexFile, join(routeDir, 'index.html'))
  }),
)

console.log(`Generated ${routes.length} static route entry files.`)
