// Convierte los .md de postulaciones/ en PDF para leerlos y enviarlos sin abrir Markdown:
//   - cv*.md y carta*.md → PDF A4 de una página; si no entra, reduce la letra hasta un mínimo legible y avisa.
//   - el resto (README, respuestas, investigación, entrevista, correo, RESUMEN) → PDF de las páginas que necesite.
// Solo regenera los PDF que faltan o que son más viejos que su .md.
// Uso:  node scripts/pdf.mjs                           (todo postulaciones/)
//       node scripts/pdf.mjs postulaciones/2026-10-17
// Navegador: usa Chrome instalado (PW_CHANNEL=chrome por defecto); si no hay, el Chromium de playwright
// (npx playwright-core install chromium).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { marked } from "marked"
import { chromium } from "playwright-core"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ["postulaciones"]
const PAGE_HEIGHT_PX = 1123 // A4 a 96 dpi
const FONT_SIZES = [10.5, 10, 9.5, 9, 8.5]
const ONE_PAGE = /^(cv|carta)(-[a-z]+)?\.md$/

const findMarkdown = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name)
  if (entry.isDirectory()) return findMarkdown(full)
  return entry.name.endsWith(".md") ? [full] : []
})

// En Markdown un salto de línea simple une las líneas en un párrafo. Eso sirve para los párrafos cortados a mano
// (líneas largas), pero rompe direcciones, firmas y la línea de contacto del CV, que son líneas cortas: a esas les
// agrega el salto forzado ("\" al final). También se puede forzar a mano terminando la línea en "\".
const SHORT_LINE = 75
const BLOCK_START = /^\s*([-*+>|#]|\d+[.)]\s|```)/
function keepShortLineBreaks(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n")
  return lines.map((line, i) => {
    const next = lines[i + 1] ?? ""
    const joinsNext = line.trim() && next.trim() && !BLOCK_START.test(line) && !BLOCK_START.test(next)
    const isShortOrList = line.length < SHORT_LINE || line.includes(" · ") // "·" separa datos de contacto
    return joinsNext && isShortOrList && !line.endsWith("\\") ? `${line}\\` : line
  }).join("\n")
}

const isStale = (md) => {
  const pdf = md.replace(/\.md$/, ".pdf")
  return !existsSync(pdf) || statSync(pdf).mtimeMs < statSync(md).mtimeMs
}

const css = (fontSize, isCv) => `
  @page { size: A4; margin: ${isCv ? "0" : "14mm 16mm"} }
  * { box-sizing: border-box }
  body { margin: 0; ${isCv ? "padding: 14mm 16mm;" : ""} font: ${fontSize}pt/1.38 "Segoe UI", "Helvetica Neue", Arial, sans-serif; color: #1f2933 }
  h1 { margin: 0 0 0.3em; font-size: ${isCv ? "2.05em" : "1.7em"}; letter-spacing: -0.01em; color: #0b3d63 }
  ${isCv ? `h1 + p { margin: 0.15em 0 0.35em; font-size: 1.12em; color: #0b3d63 }
  h1 + p + p { margin: 0 0 0.2em; color: #52606d; font-size: 0.95em }` : ""}
  h2 { margin: 0.95em 0 0.35em; padding-bottom: 0.15em; border-bottom: 1.5px solid #0b3d63; font-size: 1.08em;
       text-transform: uppercase; letter-spacing: 0.06em; color: #0b3d63; break-after: avoid }
  h3 { margin: 0.8em 0 0.3em; font-size: 1.02em; color: #0b3d63; break-after: avoid }
  p { margin: 0.35em 0 }
  ul, ol { margin: 0.15em 0 0.45em; padding-left: 1.3em }
  li { margin: 0.1em 0 }
  strong { color: #102a43 }
  a { color: #0b5394; text-decoration: none; word-break: break-all }
  table { width: 100%; border-collapse: collapse; margin: 0.5em 0; font-size: 0.92em }
  th, td { border: 1px solid #cbd2d9; padding: 0.3em 0.45em; text-align: left; vertical-align: top }
  th { background: #f0f4f8 }
  blockquote { margin: 0.5em 0; padding: 0.2em 0.8em; border-left: 3px solid #9fb3c8; color: #486581 }
  code { font-size: 0.92em; background: #f0f4f8; padding: 0 0.2em; border-radius: 3px }
  hr { border: 0; border-top: 1px solid #cbd2d9; margin: 1em 0 }
`

const files = targets.flatMap((target) => findMarkdown(path.resolve(root, target))).filter(isStale)
if (!files.length) {
  console.log("Todos los PDF están al día.")
  process.exit(0)
}

let browser
try {
  browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" })
} catch {
  browser = await chromium.launch()
}
const page = await browser.newPage({ viewport: { width: 794, height: PAGE_HEIGHT_PX } })

for (const md of files) {
  const body = marked.parse(keepShortLineBreaks(readFileSync(md, "utf8")))
  const isOnePage = ONE_PAGE.test(path.basename(md))
  const render = (size) => page.setContent(`<!doctype html><html lang="es"><meta charset="utf-8"><style>${css(size, isOnePage)}</style><body>${body}</body></html>`)
  let fitted = true
  if (isOnePage) {
    fitted = false
    for (const size of FONT_SIZES) {
      await render(size)
      if (await page.evaluate(() => document.documentElement.scrollHeight) <= PAGE_HEIGHT_PX) { fitted = true; break }
    }
  } else {
    await render(FONT_SIZES[0])
  }
  const pdf = md.replace(/\.md$/, ".pdf")
  await page.pdf({ path: pdf, format: "A4", printBackground: true })
  console.log(`${path.relative(root, pdf)}${fitted ? "" : "  ⚠ no cabe en una página: recorta el .md"}`)
}
await browser.close()
