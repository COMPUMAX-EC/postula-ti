// Panel local de postulaciones: sirve seguimiento.html y los archivos de postulaciones/ en http://127.0.0.1:4321
// y guarda lo que marcas en la página ("Ya postulé", cambiar etapa, descartar) en el ficha.json correspondiente.
// Cada cambio regenera el seguimiento y se sube a GitHub (commit sin coautor). Solo escucha en esta PC.
// Uso:  node scripts/panel.mjs     (cerrar la ventana lo apaga)
import { execFile, execFileSync, spawn } from "node:child_process"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { createServer } from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PORT = 4321
const ETAPAS = ["Preparada", "Enviada", "En revisión", "Entrevista", "Oferta", "Aceptada", "Rechazada", "Descartada", "Vencida"]
const TIPOS = { ".html": "text/html; charset=utf-8", ".pdf": "application/pdf", ".md": "text/plain; charset=utf-8", ".json": "application/json; charset=utf-8" }
const PUBLICOS = new Set(["seguimiento.html", "HABILIDADES.md", "cambios.md", "SEGUIMIENTO.md"])

const node = (...args) => execFileSync(process.execPath, args, { cwd: root, encoding: "utf8" })
node("scripts/seguimiento.mjs")

// Sube a GitHub sin bloquear la página; si falla (sin red), queda guardado en la PC y lo sube la tarea nocturna.
function subir(mensaje) {
  execFile("git", ["add", "-A", "--", "postulaciones", "registro.md", "SEGUIMIENTO.md", "seguimiento.html"], { cwd: root }, () =>
    execFile("git", ["commit", "-q", "-m", mensaje], { cwd: root }, () =>
      execFile("git", ["push", "-q"], { cwd: root }, (err) => console.log(err ? "  (sin subir a GitHub; se subirá después)" : "  subido a GitHub"))))
}

function listado(rel, abs) {
  const items = readdirSync(abs).filter((n) => n.endsWith(".pdf")).sort()
  return `<!doctype html><meta charset="utf-8"><title>${rel}</title><body style="font:15px system-ui;padding:24px">
<h2>${rel}</h2><ul>${items.map((n) => `<li><a href="${encodeURIComponent(n)}">${n}</a></li>`).join("")}</ul>`
}

createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  if (req.method === "POST" && url.pathname === "/api/etapa") {
    let body = ""
    req.on("data", (c) => (body += c))
    req.on("end", () => {
      try {
        const { id, etapa, nota } = JSON.parse(body)
        if (!/^\d{4}-\d{2}-\d{2}\/[a-z0-9-]+$/.test(id) || !existsSync(path.join(root, "postulaciones", id, "ficha.json"))) throw new Error("postulación desconocida")
        if (!ETAPAS.includes(etapa)) throw new Error("etapa inválida")
        node("scripts/seguimiento.mjs", "etapa", id, etapa, ...(nota ? [String(nota).slice(0, 200)] : []))
        console.log(`${id} → ${etapa}`)
        subir(`Etapa ${etapa}: ${id}`)
        res.writeHead(200).end("ok")
      } catch (e) {
        res.writeHead(400).end(e.message)
      }
    })
    return
  }
  // Archivos: solo seguimiento y lo que está dentro de postulaciones/ (nunca documentos/privados).
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "seguimiento.html"
  const abs = path.resolve(root, rel)
  const permitido = PUBLICOS.has(rel) || abs.startsWith(path.join(root, "postulaciones") + path.sep)
  if (!permitido || !existsSync(abs)) return res.writeHead(404).end("No encontrado")
  if (statSync(abs).isDirectory()) return res.writeHead(200, { "content-type": TIPOS[".html"] }).end(listado(rel, abs))
  res.writeHead(200, { "content-type": TIPOS[path.extname(abs)] ?? "application/octet-stream" }).end(readFileSync(abs))
}).listen(PORT, "127.0.0.1", () => {
  const direccion = `http://127.0.0.1:${PORT}/`
  console.log(`Panel de postulaciones en ${direccion}\nDeja esta ventana abierta mientras lo usas; ciérrala para apagarlo.\n`)
  if (!process.argv.includes("--sin-navegador")) spawn("cmd", ["/c", "start", "", direccion], { detached: true, stdio: "ignore" }).unref()
}).on("error", (e) => {
  if (e.code !== "EADDRINUSE") throw e
  console.log("El panel ya está abierto: lo muestro en el navegador.")
  spawn("cmd", ["/c", "start", "", `http://127.0.0.1:${PORT}/`], { detached: true, stdio: "ignore" }).unref()
})
