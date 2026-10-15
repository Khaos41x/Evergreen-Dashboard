import { chromium } from 'playwright-core'

const [url = 'http://127.0.0.1:4310/', output = 'visual-home.png', width = '1776', height = '887'] = process.argv.slice(2)
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) }, deviceScaleFactor: 1 })
await page.goto(url, { waitUntil: 'networkidle' })
await page.screenshot({ path: output, fullPage: false })
await browser.close()
