// Menú para marcar postulaciones (enviada, entrevista, rechazada...) sin editar JSON.
// Muestra las postulaciones abiertas numeradas; escribes los números, eliges la etapa y una nota opcional.
// Aplica cada cambio con seguimiento.mjs y sube el resultado a GitHub (commit sin coautor).
// Uso:  node scripts/marcar.mjs
import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { createInterface } from "node:readline/promises"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const POST = path.join(root, "postulaciones")
const ETAPAS = ["Enviada", "En revisión", "Entrevista", "Oferta", "Aceptada", "Rechazada", "Descartada", "Vencida", "Preparada"]
const CERRADAS = new Set(["Aceptada", "Rechazada", "Descartada", "Vencida"])

const fichas = readdirSync(POST).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().flatMap((fecha) =>
  readdirSync(path.join(POST, fecha), { withFileTypes: true }).filter((e) => e.isDirectory())
    .map((e) => `${fecha}/${e.name}`).filter((id) => existsSync(path.join(POST, id, "ficha.json")))
    .map((id) => ({ id, ...JSON.parse(readFileSync(path.join(POST, id, "ficha.json"), "utf8")) })))
  .filter((f) => !CERRADAS.has(f.etapa))

const rl = createInterface({ input: process.stdin, output: process.stdout })
console.log("\nPostulaciones abiertas:\n")
fichas.forEach((f, i) => console.log(`${String(i + 1).padStart(3)}. [${f.etapa}] ${f.oportunidad} — ${f.organizacion}`))
const elegidas = (await rl.question("\nNúmeros a marcar (ej.: 1 3 5), o Enter para salir: "))
  .split(/[\s,]+/).filter(Boolean).map(Number).filter((n) => n >= 1 && n <= fichas.length).map((n) => fichas[n - 1])
if (!elegidas.length) { rl.close(); process.exit(0) }

console.log("")
ETAPAS.forEach((e, i) => console.log(`${String(i + 1).padStart(3)}. ${e}`))
const etapa = ETAPAS[Number(await rl.question("Nueva etapa [1 = Enviada]: ") || 1) - 1]
if (!etapa) { console.log("Etapa inválida."); rl.close(); process.exit(1) }
const nota = (await rl.question("Nota opcional (ej.: 'por Get on Board'): ")).trim()
rl.close()

const node = (args) => execFileSync(process.execPath, args, { cwd: root, stdio: "inherit" })
for (const f of elegidas) node(["scripts/seguimiento.mjs", "etapa", f.id, etapa, ...(nota ? [nota] : [])])

const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "inherit" })
try {
  git("add", "-A", "--", "postulaciones", "registro.md", "SEGUIMIENTO.md", "seguimiento.html")
  git("commit", "-q", "-m", `Etapa ${etapa}: ${elegidas.map((f) => f.organizacion).join(", ")}`)
  git("push", "-q")
  console.log(`\nListo: ${elegidas.length} marcada(s) como ${etapa} y subidas a GitHub.`)
} catch {
  console.log("\nCambios guardados en la PC, pero no se pudieron subir a GitHub. La tarea nocturna los subirá.")
}
