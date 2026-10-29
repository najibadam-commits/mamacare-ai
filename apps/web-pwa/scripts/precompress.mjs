#!/usr/bin/env node
// Pre-compress static build output (gzip + brotli) so nginx can serve small files without CPU cost.
// Usage: node scripts/precompress.mjs dist
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const root = process.argv[2] ?? 'dist'
const compressible = /\.(js|css|html|svg|json|webmanifest|txt|xml|map)$/i
let files = 0
let saved = 0

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (compressible.test(name) && statSync(path).size >= 256) {
      const data = readFileSync(path)
      const gz = gzipSync(data, { level: 9 })
      const br = brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })
      writeFileSync(`${path}.gz`, gz)
      writeFileSync(`${path}.br`, br)
      files++
      saved += data.length - br.length
    }
  }
}

walk(root)
console.log(`precompress: ${files} files, ~${Math.round(saved / 1024)} KB saved by brotli`)
