// Recopila y clasifica las tecnologías y habilidades que piden las convocatorias, con quién las pide y cuándo.
// Fuentes: `habilidades` y `publicada` de cada ficha.json, y habilidades/catalogo.json (categoría y TU estado).
// Prioridad de una brecha = suma por convocatoria de (obligatoria 2, deseable 1) × puntaje de la convocatoria / 10.
// Cuentan todas las convocatorias, también las vencidas o descartadas: son demanda real del mercado.
// Genera HABILIDADES.md.  Uso:  node scripts/habilidades.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const POST = path.join(root, "postulaciones")
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(new Date())
const hace30 = new Date(Date.parse(hoy) - 30 * 86400000).toISOString().slice(0, 10)
const ESTADO = { tengo: "✅ tengo", parcial: "🟡 parcial", "en-curso": "⏳ en curso", falta: "❌ falta" }

const catalogo = JSON.parse(readFileSync(path.join(root, "habilidades", "catalogo.json"), "utf8")).habilidades
const fichas = readdirSync(POST).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().flatMap((fecha) =>
  readdirSync(path.join(POST, fecha), { withFileTypes: true }).filter((e) => e.isDirectory())
    .map((e) => `${fecha}/${e.name}`).filter((id) => existsSync(path.join(POST, id, "ficha.json")))
    .map((id) => ({ id, ...JSON.parse(readFileSync(path.join(POST, id, "ficha.json"), "utf8")) })))

const demanda = new Map() // id → [{ficha, tipo, fecha}]
for (const f of fichas) for (const h of f.habilidades ?? []) {
  if (!catalogo[h.id]) throw new Error(`${f.id}: la habilidad "${h.id}" no está en habilidades/catalogo.json`)
  const lista = demanda.get(h.id) ?? []
  lista.push({ f, tipo: h.tipo, fecha: f.publicada ?? f.preparada })
  demanda.set(h.id, lista)
}

const filas = [...demanda].map(([id, pedidos]) => {
  const c = catalogo[id]
  const prioridad = pedidos.reduce((s, p) => s + (p.tipo === "obligatoria" ? 2 : 1) * (p.f.puntaje ?? 6) / 10, 0)
  const obl = pedidos.filter((p) => p.tipo === "obligatoria").length
  const recientes = pedidos.filter((p) => p.fecha >= hace30).length
  const fechas = pedidos.map((p) => p.fecha).sort()
  return { id, ...c, pedidos, prioridad, obl, des: pedidos.length - obl, recientes, primera: fechas[0], ultima: fechas.at(-1) }
}).sort((a, b) => b.prioridad - a.prioridad || b.pedidos.length - a.pedidos.length)

const quien = (r) => r.pedidos.sort((a, b) => b.fecha.localeCompare(a.fecha))
  .map((p) => `${p.f.organizacion}: ${p.f.oportunidad.replace(/\|/g, "/")} (${p.fecha}${p.tipo === "deseable" ? ", deseable" : ""})`).join("; ")
const brechas = filas.filter((r) => r.estado !== "tengo")
const categorias = [...new Set(filas.map((r) => r.categoria))]

writeFileSync(path.join(root, "HABILIDADES.md"), `# Habilidades que piden las convocatorias

Actualizado el ${hoy} por \`node scripts/habilidades.mjs\` desde ${fichas.length} convocatorias (todas, también las vencidas).
Fecha = publicación de la oferta (o, si no se conoce, el día en que se preparó). Prioridad = Σ (obligatoria 2 · deseable 1) × puntaje/10.
Tu estado está en \`habilidades/catalogo.json\`: al aprender algo, cámbialo y agrega la evidencia (repo o certificado).

## Qué desarrollar primero (brechas por prioridad)
| # | Habilidad | Categoría | Tu estado | Prioridad | Obligatoria / deseable | Últimos 30 días | Quién la pide y cuándo |
|---|---|---|---|---|---|---|---|
${brechas.map((r, i) => `| ${i + 1} | **${r.nombre}** | ${r.categoria} | ${ESTADO[r.estado] ?? r.estado} | ${r.prioridad.toFixed(1)} | ${r.obl} / ${r.des} | ${r.recientes} | ${quien(r)} |`).join("\n")}

## Lo que ya tienes y piden (para destacarlo en el CV)
| Habilidad | Veces pedida | Evidencia | Quién la pide y cuándo |
|---|---|---|---|
${filas.filter((r) => r.estado === "tengo").map((r) => `| ${r.nombre} | ${r.pedidos.length} | ${r.evidencia ?? ""} | ${quien(r)} |`).join("\n")}

## Por categoría
${categorias.map((cat) => `### ${cat}\n${filas.filter((r) => r.categoria === cat).map((r) => `- ${ESTADO[r.estado] ?? r.estado} **${r.nombre}**: ${r.pedidos.length} convocatoria(s), de ${r.primera} a ${r.ultima}`).join("\n")}`).join("\n\n")}
`)
console.log(`Habilidades: ${filas.length} distintas, ${brechas.length} brechas → HABILIDADES.md`)
