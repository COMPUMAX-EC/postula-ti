// Revisa solo, sin iniciar sesión, si cambió algo en las postulaciones abiertas:
//   - Empleos: si la vacante sigue abierta. Lever, Greenhouse y Workable por su API pública (404 = cerrada);
//     Get on Board, Banco Pichincha y Hiring Room por el botón de postular en la página.
//   - Becas: si la página oficial cambió (huella del texto) y si aparecen palabras de resultados o adjudicación.
//   - Fechas de resultados (`resultados` en ficha.json): avisa cuando llegan, para revisar correo y portal.
// Guarda el resultado en ficha.json (`revision`) y anota los cambios en cambios.md.
// Una vacante con cierre confirmado (API 404 o HTTP 404/410) que seguía en "Preparada" pasa sola a "Vencida".
// Uso:  node scripts/revisar.mjs     (luego node scripts/seguimiento.mjs)
import { createHash } from "node:crypto"
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const POST = path.join(root, "postulaciones")
const CERRADAS = new Set(["Aceptada", "Rechazada", "Descartada", "Vencida"])
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(new Date())
const HEADERS = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36", "accept-language": "es,en" }
const PALABRAS_RESULTADOS = /(resultados|adjudicad|adjudicaci|beneficiarios|seleccionados|admitted|selected candidates|results? (are|have been) (published|announced)|shortlist)/gi

const get = (url) => fetch(url, { headers: HEADERS, redirect: "follow", signal: AbortSignal.timeout(25000) })
const texto = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

// Devuelve { estado: "abierta" | "cerrada" | "dudosa" | "error", seguro, detalle, huella?, palabras? }
async function revisarEmpleo(url) {
  let m
  if ((m = url.match(/jobs\.lever\.co\/([^/]+)\/([0-9a-f-]{36})/))) {
    const r = await get(`https://api.lever.co/v0/postings/${m[1]}/${m[2]}`)
    return r.status === 404 ? { estado: "cerrada", seguro: true, detalle: "Lever: la vacante ya no existe" } : { estado: r.ok ? "abierta" : "error", detalle: `Lever HTTP ${r.status}` }
  }
  if ((m = url.match(/greenhouse\.io\/([^/]+)\/jobs\/(\d+)/))) {
    const r = await get(`https://boards-api.greenhouse.io/v1/boards/${m[1]}/jobs/${m[2]}`)
    return r.status === 404 ? { estado: "cerrada", seguro: true, detalle: "Greenhouse: la vacante ya no existe" } : { estado: r.ok ? "abierta" : "error", detalle: `Greenhouse HTTP ${r.status}` }
  }
  const r = await get(url)
  if (r.status === 404 || r.status === 410) return { estado: "cerrada", seguro: true, detalle: `HTTP ${r.status}` }
  if (!r.ok) return { estado: "error", detalle: `HTTP ${r.status}` }
  if ((m = r.url.match(/apply\.workable\.com\/([^/]+)\/j\/([A-Z0-9]+)/))) {
    const api = await get(`https://apply.workable.com/api/v1/accounts/${m[1]}/jobs/${m[2]}`)
    return api.status === 404 ? { estado: "cerrada", seguro: true, detalle: "Workable: la vacante ya no existe" } : { estado: api.ok ? "abierta" : "error", detalle: `Workable HTTP ${api.status}` }
  }
  const html = await r.text()
  const boton = /(apply now|aplicar ahora|postularse|\bpostular\b)/i.test(html)
  return boton ? { estado: "abierta", detalle: "botón de postular visible" } : { estado: "dudosa", detalle: "no se ve el botón de postular: revisa a mano" }
}

async function revisarBeca(url, anterior) {
  const r = await get(url)
  if (!r.ok) return { estado: r.status === 404 ? "dudosa" : "error", detalle: `HTTP ${r.status}` }
  // Sin números (fechas, contadores, tokens) para que el contenido dinámico no cuente como cambio.
  const t = texto(await r.text())
  const huella = createHash("sha256").update(t.replace(/\d+/g, "")).digest("hex").slice(0, 16)
  const palabras = [...new Set((t.match(PALABRAS_RESULTADOS) ?? []).map((p) => p.toLowerCase()))].sort()
  const nuevas = palabras.filter((p) => !(anterior?.palabras ?? []).includes(p))
  if (!anterior?.huella || anterior.huella === huella) return { estado: "abierta", huella, palabras, detalle: "sin cambios" }
  // Un cambio cuenta solo si la nueva versión se repite en la revisión siguiente (descarta páginas que rotan contenido).
  if (anterior.huella_nueva !== huella) return { estado: "abierta", huella: anterior.huella, huella_nueva: huella, palabras: anterior.palabras ?? [], detalle: "sin cambios (posible cambio, se confirma en la próxima revisión)" }
  return { estado: "abierta", huella, palabras, detalle: `la página cambió${nuevas.length ? `; palabras nuevas: ${nuevas.join(", ")}` : ""}` }
}

const ids = readdirSync(POST).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().flatMap((fecha) =>
  readdirSync(path.join(POST, fecha), { withFileTypes: true }).filter((e) => e.isDirectory())
    .map((e) => `${fecha}/${e.name}`).filter((id) => existsSync(path.join(POST, id, "ficha.json"))))

const cambios = []
for (const id of ids) {
  const file = path.join(POST, id, "ficha.json")
  const f = JSON.parse(readFileSync(file, "utf8"))
  if (CERRADAS.has(f.etapa) || !f.enlace) continue
  const anterior = f.revision
  let rev
  try {
    rev = f.tipo === "Beca" ? await revisarBeca(f.enlace, anterior) : await revisarEmpleo(f.enlace)
  } catch (e) {
    rev = { estado: "error", detalle: e.cause?.code ?? e.name }
  }
  const avisos = []
  if (f.tipo === "Beca" && rev.detalle.startsWith("la página cambió")) avisos.push(`Página oficial: ${rev.detalle}`)
  if (f.tipo !== "Beca" && rev.estado === "cerrada" && anterior?.estado !== "cerrada") avisos.push(`La vacante se cerró (${rev.detalle})`)
  if (f.tipo !== "Beca" && rev.estado === "dudosa" && anterior?.estado === "abierta") avisos.push(`Posible cierre: ${rev.detalle}`)
  if (f.resultados && f.resultados <= hoy && !f.historial?.some((h) => h.nota?.startsWith("Resultados"))) avisos.push(`Fecha de resultados (${f.resultados}): revisa tu correo y el portal`)
  if (rev.estado === "cerrada" && rev.seguro && f.etapa === "Preparada") {
    f.etapa = "Vencida"
    f.historial = [...(f.historial ?? []), { fecha: hoy, etapa: "Vencida", nota: `Detectado por revisar.mjs: ${rev.detalle}` }]
    avisos.push("Pasó a Vencida (nunca se envió)")
  }
  if (rev.estado === "cerrada" && ["Enviada", "En revisión"].includes(f.etapa)) avisos.push("Ya enviada: el cierre puede significar que eligieron; revisa tu correo")
  const { seguro, ...guardar } = rev
  f.revision = { fecha: hoy, ...guardar, ...(avisos.length ? { cambio: avisos.join(" · "), cambio_fecha: hoy } : { cambio: anterior?.cambio ?? null, cambio_fecha: anterior?.cambio_fecha ?? null }) }
  writeFileSync(file, JSON.stringify(f, null, 2) + "\n")
  for (const a of avisos) cambios.push(`| ${hoy} | ${f.oportunidad} — ${f.organizacion} | ${f.etapa} | ${a} | ${f.enlace} |`)
  console.log(`${rev.estado.padEnd(7)} ${id}${avisos.length ? `  ← ${avisos.join(" · ")}` : ""}`)
}

const log = path.join(root, "cambios.md")
if (!existsSync(log)) writeFileSync(log, "# Cambios detectados\n\nLo anota `node scripts/revisar.mjs` cada noche.\n\n| Fecha | Postulación | Etapa | Cambio | Enlace |\n|---|---|---|---|---|\n")
if (cambios.length) appendFileSync(log, cambios.join("\n") + "\n")
console.log(`\nRevisadas: ${ids.length} · cambios: ${cambios.length}${cambios.length ? " (ver cambios.md)" : ""}`)
