import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
const manifest = JSON.parse(await readFile('dist/build-manifest.json', 'utf8'))
const scripts = new Set()
function include(key) {
  const chunk = manifest[key]
  assert(chunk, 'Chunk ausente ' + key)
  if (scripts.has(chunk.file)) return
  if (chunk.file.endsWith('.js')) scripts.add(chunk.file)
  for (const dependency of chunk.imports ?? []) include(dependency)
}
for (const key of ['index.html', 'src/collaboration/Auth.tsx', 'src/collaboration/Collaboration.tsx']) include(key)
const bytes = (await Promise.all([...scripts].map(async file => gzipSync(await readFile('dist/' + file)).length))).reduce((a,b)=>a+b,0)
const baselineFile = 'scripts/build-budget.json'
if (process.argv.includes('--baseline')) {
  const { writeFile } = await import('node:fs/promises')
  await writeFile(baselineFile, JSON.stringify({ initialJavaScriptGzipBytes: bytes, revision: '2a8a24b', includes: 'main, Auth e Collaboration com imports estáticos' }, null, 2)+'\n')
}
const baseline = JSON.parse(await readFile(baselineFile, 'utf8'))
assert(bytes <= baseline.initialJavaScriptGzipBytes, 'JS inicial excedeu a base ' + bytes + ' > ' + baseline.initialJavaScriptGzipBytes)
let scanned = 0
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = directory + '/' + entry.name
    if (entry.isDirectory()) await scan(path)
    else if (/\.(?:[cm]?js|tsx?|css|html|json|sql)$/.test(entry.name)) {
      const source = await readFile(path, 'utf8')
      assert(!/-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----|\b(?:sb_secret_|sk_live_|ghp_|github_pat_)[A-Za-z0-9_-]{16,}/.test(source), 'Assinatura de segredo em ' + path)
      scanned++
    }
  }
}
for (const root of ['src','server','public','dist','supabase']) await scan(root)
console.log(JSON.stringify({ initialJavaScriptGzipBytes: bytes, baseline: baseline.initialJavaScriptGzipBytes, scanned, matchedSecrets: 0 }))
