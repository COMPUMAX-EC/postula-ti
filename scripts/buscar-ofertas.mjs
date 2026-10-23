// Busca vacantes de TI abiertas a alguien que vive en Ecuador en plataformas con datos públicos (sin login):
//   - Get on Board: API pública por categoría; se aceptan trabajos 100 % remotos o que nombran Ecuador.
//   - Workable, Greenhouse y Lever: tableros oficiales de las empresas listadas en fuentes.json; se aceptan los que
//     nombran Ecuador, Quito, Guayaquil o LATAM/Latinoamérica.
// Escribe fuentes/candidatas.json (se reemplaza cada noche; el historial vive en registro.md).
// Uso:  node scripts/buscar-ofertas.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { isITRole } from "./it-roles.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const config = JSON.parse(readFileSync(path.join(root, "fuentes.json"), "utf8"))
const OUT = path.join(root, "fuentes", "candidatas.json")
const MAX_AGE_DAYS = 60
const UA = "Mozilla/5.0 (compatible; postula-ti/1.0)"
const LATAM_OR_ECUADOR = /ecuador|quito|guayaquil|cuenca|latam|latin america|latinoam[eé]rica|south america|am[eé]rica latina/i

async function getJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } })
  if (!response.ok) throw new Error(`${response.status} en ${url}`)
  return response.json()
}
const daysAgo = (iso) => iso ? (Date.now() - Date.parse(iso)) / 864e5 : 0

async function getOnBoard() {
  const jobs = []
  for (const category of config.getonbrd.categorias) {
    for (let page = 1; page <= 5; page++) {
      const { data = [], meta } = await getJson(`https://www.getonbrd.com/api/v0/categories/${category}/jobs?per_page=100&page=${page}`)
      for (const { id, attributes: a, links } of data) {
        const countries = a.countries ?? []
        const eligible = a.remote_modality === "fully_remote" || countries.some((country) => /ecuador/i.test(country))
        const seniority = a.seniority?.data?.id ?? 0
        if (!eligible || seniority > config.getonbrd.senioridadMaxima) continue
        jobs.push({
          source: "Get on Board", id: `getonbrd-${id}`, title: a.title, company: a.company?.data?.attributes?.name ?? null,
          location: a.remote_modality === "fully_remote" ? "Remoto (cualquier país)" : countries.join(", "),
          publishedAt: a.published_at ? new Date(a.published_at * 1000).toISOString().slice(0, 10) : null,
          salary: a.min_salary || a.max_salary ? `USD ${a.min_salary ?? "?"}–${a.max_salary ?? "?"} / mes` : null,
          seniority, url: links?.public_url, category,
        })
      }
      if (!meta || page >= meta.total_pages) break
    }
  }
  return jobs
}

async function workable(account) {
  const { jobs = [] } = await getJson(`https://apply.workable.com/api/v1/widget/accounts/${account}`)
  return jobs
    .filter((job) => job.country === "Ecuador" || (job.locations ?? []).some((location) => location.country === "Ecuador" && !location.hidden))
    .map((job) => ({ source: "Workable", id: `workable-${account}-${job.shortcode}`, title: job.title, company: account, location: [job.city, job.country].filter(Boolean).join(", "), publishedAt: job.published_on ?? null, url: job.url }))
}

async function greenhouse(board) {
  const { jobs = [] } = await getJson(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`)
  return jobs
    .filter((job) => LATAM_OR_ECUADOR.test(job.location?.name ?? ""))
    .map((job) => ({ source: "Greenhouse", id: `greenhouse-${board}-${job.id}`, title: job.title, company: board, location: job.location?.name, publishedAt: (job.first_published ?? job.updated_at)?.slice(0, 10) ?? null, url: job.absolute_url }))
}

async function lever(company) {
  const jobs = await getJson(`https://api.lever.co/v0/postings/${company}?mode=json`)
  return jobs
    .filter((job) => LATAM_OR_ECUADOR.test([job.categories?.location, ...(job.categories?.allLocations ?? []), job.country].join(" ")))
    .map((job) => ({ source: "Lever", id: `lever-${company}-${job.id}`, title: job.text, company, location: job.categories?.location, publishedAt: job.createdAt ? new Date(job.createdAt).toISOString().slice(0, 10) : null, url: job.hostedUrl }))
}

const tasks = [
  ["Get on Board", getOnBoard],
  ...config.workable.map((account) => [`Workable ${account}`, () => workable(account)]),
  ...config.greenhouse.map((board) => [`Greenhouse ${board}`, () => greenhouse(board)]),
  ...config.lever.map((company) => [`Lever ${company}`, () => lever(company)]),
]

const found = []
const summary = []
for (const [name, run] of tasks) {
  try {
    const jobs = (await run()).filter((job) => isITRole(job.title) && daysAgo(job.publishedAt) <= MAX_AGE_DAYS)
    found.push(...jobs)
    summary.push(`${name}: ${jobs.length}`)
  } catch (error) {
    summary.push(`${name}: error (${error.message})`)
  }
}

const unique = [...new Map(found.map((job) => [job.url, job])).values()]
  .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
mkdirSync(path.dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), maxAgeDays: MAX_AGE_DAYS, sources: summary, jobs: unique }, null, 2) + "\n")
console.log(`${unique.length} vacantes de TI candidatas → fuentes/candidatas.json\n  ${summary.join("\n  ")}`)
