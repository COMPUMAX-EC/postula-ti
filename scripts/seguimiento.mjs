// Seguimiento normalizado de todas las postulaciones.
// La fuente de verdad es un ficha.json por carpeta de postulación (postulaciones/<fecha>/<slug>/ficha.json) más
// documentos/catalogo.json (documentos compartidos: cédula, título, IELTS, cartas de recomendación, CV base...).
// Genera: registro.md (tabla corta), SEGUIMIENTO.md (etapas, faltantes, cierres, enlaces) y seguimiento.html.
// Uso:  node scripts/seguimiento.mjs                                   (regenera todo)
//       node scripts/seguimiento.mjs etapa <fecha>/<slug> <Etapa> ["nota"]   (cambia la etapa y regenera)
// Si registro.md tiene una fila cuya carpeta no tiene ficha.json, crea la ficha a partir de esa fila.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const POST = path.join(root, "postulaciones")
export const ETAPAS = ["Preparada", "Enviada", "En revisión", "Entrevista", "Oferta", "Aceptada", "Rechazada", "Descartada", "Vencida"]
const CERRADAS = new Set(["Aceptada", "Rechazada", "Descartada", "Vencida"])
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(new Date())

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"))
const writeJson = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2) + "\n")
const dias = (desde, hasta) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000)
const fichaPath = (id) => path.join(POST, id, "ficha.json")

// --- Migración: filas de registro.md sin ficha.json ---
function migrarRegistro() {
  const file = path.join(root, "registro.md")
  if (!existsSync(file)) return
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const cells = line.split("|").slice(1, -1).map((c) => c.trim())
    if (cells.length < 8 || !/^\d{4}-\d{2}-\d{2}$/.test(cells[0])) continue
    const [fecha, oportunidad, organizacion, tipo, cierreTxt, enlace, carpeta, estado] = cells
    const id = carpeta.replace(/^postulaciones\//, "")
    if (!existsSync(path.join(POST, id)) || existsSync(fichaPath(id))) continue
    const [cierre, abre] = [cierreTxt.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null, cierreTxt.match(/abre (\d{4}-\d{2}-\d{2})/)?.[1] ?? null]
    const etapa = ETAPAS.includes(estado) ? estado : "Preparada"
    writeJson(fichaPath(id), {
      oportunidad, organizacion, tipo, preparada: fecha, abre, cierre, enlace, etapa,
      historial: [{ fecha, etapa: "Preparada" }],
      documentos: [{ doc: "cv", archivo: "cv.pdf" }, { doc: "carta", archivo: "carta.pdf" }],
      proxima_accion: "", notas: "",
    })
    console.log(`ficha creada desde registro.md: ${id}`)
  }
}

function cargarFichas() {
  if (!existsSync(POST)) return []
  return readdirSync(POST).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().flatMap((fecha) =>
    readdirSync(path.join(POST, fecha), { withFileTypes: true }).filter((e) => e.isDirectory())
      .map((e) => `${fecha}/${e.name}`).filter((id) => existsSync(fichaPath(id)))
      .map((id) => ({ id, ...readJson(fichaPath(id)) })))
}

// Un documento compartido está listo si su archivo existe; uno propio, si existe en la carpeta de la postulación.
function resolverDocs(ficha, catalogo) {
  return (ficha.documentos ?? []).map((d) => {
    const comp = catalogo.documentos[d.doc]
    if (comp) {
      const listo = existsSync(path.join(root, comp.archivo))
      return { ...d, compartido: true, nombre: comp.nombre, estado: listo ? "listo" : comp.estado, disponible_desde: listo ? null : comp.disponible_desde ?? null }
    }
    const listo = d.archivo && existsSync(path.join(POST, ficha.id, d.archivo))
    return { ...d, compartido: false, nombre: catalogo.propios[d.doc] ?? d.doc, estado: listo ? "listo" : d.estado ?? "falta" }
  })
}

function alertas(f) {
  const out = []
  const abierta = !CERRADAS.has(f.etapa)
  if (f.abre && f.abre > hoy) out.push(`Abre el ${f.abre}`)
  if (abierta && f.etapa === "Preparada" && f.cierre) {
    const n = dias(hoy, f.cierre)
    if (n < 0) out.push(`Cerró el ${f.cierre} sin enviarse`)
    else if (n <= 7) out.push(`Cierra en ${n} día${n === 1 ? "" : "s"}`)
  }
  if (f.revision?.cambio && f.revision.cambio_fecha && dias(f.revision.cambio_fecha, hoy) <= 7) out.push(`Revisión ${f.revision.cambio_fecha}: ${f.revision.cambio}`)
  if (f.resultados && !CERRADAS.has(f.etapa)) out.push(f.resultados <= hoy ? `Resultados desde el ${f.resultados}: revisa correo y portal` : `Resultados ≈ ${f.resultados}`)
  const limite = f.limite_ingles ?? f.cierre
  for (const d of f.docs) {
    if (abierta && d.disponible_desde && limite && d.disponible_desde > limite) out.push(`${d.doc} llega tarde (${d.disponible_desde} > ${limite})`)
  }
  return out
}

// Cola de envío: preparadas que ya se pueden enviar (abiertas hoy y sin documentos faltantes), por urgencia,
// puntaje y antigüedad. Su largo es el backlog que limita la tarea nocturna.
export const MAX_SIN_ENVIAR = 5
function colaDeEnvio(fichas) {
  const urgencia = (f) => (f.cierre && f.cierre >= hoy ? dias(hoy, f.cierre) : 999)
  return fichas.filter((f) => f.etapa === "Preparada" && !(f.abre && f.abre > hoy) && !(f.cierre && f.cierre < hoy) && !faltantes(f).length)
    .sort((a, b) => Math.min(urgencia(a), 8) - Math.min(urgencia(b), 8) || (b.puntaje ?? 0) - (a.puntaje ?? 0) || a.preparada.localeCompare(b.preparada))
}

const enlaceMd = (texto, url) => (url ? `[${texto.replace(/\|/g, "/")}](${url})` : texto)
const fechaCierre = (f) => (f.cierre ?? "No publicado") + (f.abre ? ` (abre ${f.abre})` : "")
const faltantes = (f) => f.docs.filter((d) => d.estado !== "listo" && !d.opcional)

function escribirRegistro(fichas) {
  const filas = fichas.map((f) => `| ${f.preparada} | ${f.oportunidad} | ${f.organizacion} | ${f.tipo} | ${fechaCierre(f)} | ${f.enlace} | postulaciones/${f.id} | ${f.etapa} |`)
  writeFileSync(path.join(root, "registro.md"), `# Registro de postulaciones

Generado por \`node scripts/seguimiento.mjs\` desde los \`ficha.json\` de cada carpeta: no lo edites a mano.
La vista completa (etapas, documentos que faltan, cierres) está en \`SEGUIMIENTO.md\` y \`seguimiento.html\`.
Para cambiar la etapa: \`node scripts/seguimiento.mjs etapa <fecha>/<slug> Enviada "nota"\`.

| Fecha | Oportunidad | Organización | Tipo | Cierre | Enlace | Carpeta | Estado |
|---|---|---|---|---|---|---|---|
${filas.join("\n")}
`)
}

function escribirSeguimiento(fichas, catalogo) {
  const conteo = ETAPAS.map((e) => [e, fichas.filter((f) => f.etapa === e).length]).filter(([, n]) => n)
  const urgentes = fichas.filter((f) => !CERRADAS.has(f.etapa) && f.alertas.some((a) => !a.startsWith("Abre") && !a.startsWith("Resultados ≈") && !a.startsWith("Revisión")))
  const revisadas = fichas.filter((f) => f.revision?.cambio && f.revision.cambio_fecha && dias(f.revision.cambio_fecha, hoy) <= 7)
  const ultimaRevision = fichas.map((f) => f.revision?.fecha).filter(Boolean).sort().pop()
  const proximas = fichas.filter((f) => !CERRADAS.has(f.etapa) && (f.cierre || f.abre))
    .sort((a, b) => (a.cierre ?? a.abre).localeCompare(b.cierre ?? b.abre))
  const usos = (doc) => fichas.filter((f) => !CERRADAS.has(f.etapa) && f.documentos?.some((d) => d.doc === doc)).length
  const tabla = fichas.map((f, i) => {
    const falta = faltantes(f).map((d) => d.doc).join(", ") || "—"
    return `| ${i + 1} | ${f.preparada} | ${enlaceMd(f.oportunidad, f.enlace)} | ${f.organizacion} | ${f.tipo} | ${f.puntaje ?? "—"} | **${f.etapa}** | ${fechaCierre(f)} | ${falta} | [carpeta](postulaciones/${f.id}) |`
  })
  const cola = colaDeEnvio(fichas)
  const colaMd = cola.map((f, i) => `${i + 1}. ${enlaceMd(f.oportunidad, f.enlace)} — ${f.organizacion} · ${f.puntaje ?? "?"}/10 · preparada ${f.preparada}${f.cierre ? ` · cierra ${f.cierre}` : ""}${f.proxima_accion ? ` · ${f.proxima_accion}` : ""}`)
  const docs = Object.entries(catalogo.documentos).map(([id, d]) => {
    const listo = existsSync(path.join(root, d.archivo))
    return `| \`${id}\` | ${d.nombre} | ${listo ? "listo" : d.estado}${!listo && d.disponible_desde ? ` (≈ ${d.disponible_desde})` : ""} | ${usos(id)} | ${d.nota ?? ""} |`
  })
  const porPostulacion = fichas.filter((f) => !CERRADAS.has(f.etapa) && faltantes(f).length).map((f) =>
    `### ${f.oportunidad} — ${f.organizacion}\n${faltantes(f).map((d) => `- ${d.estado === "en-tramite" ? "⏳" : "☐"} ${d.nombre}${d.compartido ? " (compartido)" : ""}${d.nota ? ` — ${d.nota}` : ""}`).join("\n")}${f.proxima_accion ? `\n- **Próxima acción:** ${f.proxima_accion}` : ""}`)

  writeFileSync(path.join(root, "SEGUIMIENTO.md"), `# Seguimiento de postulaciones

Actualizado el ${hoy} por \`node scripts/seguimiento.mjs\` (no lo edites a mano: edita los \`ficha.json\` o \`documentos/catalogo.json\`).
Etapas: ${ETAPAS.join(" → ")}.

**${fichas.length} postulaciones:** ${conteo.map(([e, n]) => `${e} ${n}`).join(" · ")}

## Cola de envío
**Sin enviar (listas para enviar hoy): ${cola.length}** · límite ${MAX_SIN_ENVIAR}: ${cola.length >= MAX_SIN_ENVIAR ? "**alcanzado: la tarea nocturna no prepara nuevas**" : "la tarea nocturna puede preparar nuevas"}.
Envía de arriba hacia abajo (primero lo que cierra en 7 días, luego mayor puntaje, luego lo más antiguo).

${colaMd.join("\n") || "Nada listo para enviar."}

## Cambios detectados (últimos 7 días)
Revisión automática de enlaces y resultados: ${ultimaRevision ?? "aún no se ha corrido"} (\`node scripts/revisar.mjs\`; historial en \`cambios.md\`).

${revisadas.map((f) => `- **${f.oportunidad}** (${f.organizacion}, ${f.etapa}): ${f.revision.cambio} — ${enlaceMd("enlace", f.enlace)}`).join("\n") || "Sin cambios."}

## Urgente
${urgentes.length ? urgentes.map((f) => `- **${f.oportunidad}** (${f.organizacion}): ${f.alertas.join("; ")} — ${enlaceMd("enlace", f.enlace)}`).join("\n") : "Nada urgente."}

## Próximos cierres y aperturas
| Oportunidad | Etapa | Abre | Cierre | Faltan |
|---|---|---|---|---|
${proximas.map((f) => `| ${enlaceMd(f.oportunidad, f.enlace)} | ${f.etapa} | ${f.abre ?? "—"} | ${f.cierre ?? "—"}${f.limite_ingles ? ` (inglés hasta ${f.limite_ingles})` : ""} | ${faltantes(f).length} |`).join("\n")}

## Todas las postulaciones
| # | Preparada | Oportunidad | Organización | Tipo | Puntaje | Etapa | Cierre | Documentos que faltan | Carpeta |
|---|---|---|---|---|---|---|---|---|---|
${tabla.join("\n")}

## Documentos compartidos
Los escaneos van en \`documentos/privados/\` (no se suben a GitHub). Al guardar el archivo, queda listo en todas las postulaciones que lo piden.

| Id | Documento | Estado | Lo piden (abiertas) | Nota |
|---|---|---|---|---|
${docs.join("\n")}

## Lo que falta por postulación
${porPostulacion.join("\n\n") || "Nada pendiente."}
`)
}

function escribirHtml(fichas, catalogo) {
  const data = JSON.stringify({ hoy, etapas: ETAPAS, cola: colaDeEnvio(fichas).map((f) => f.id), max: MAX_SIN_ENVIAR, fichas: fichas.map(({ documentos, ...f }) => f), catalogo: Object.fromEntries(Object.entries(catalogo.documentos).map(([id, d]) => [id, { ...d, estado: existsSync(path.join(root, d.archivo)) ? "listo" : d.estado }])) }).replace(/</g, "\\u003c")
  writeFileSync(path.join(root, "seguimiento.html"), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Seguimiento de postulaciones</title>
<style>
:root{--bg:#f7f8fa;--card:#fff;--fg:#1f2933;--muted:#616e7c;--line:#e4e7eb;--accent:#0b3d63;--ok:#1f7a4d;--warn:#b25e09;--bad:#b42318}
@media (prefers-color-scheme:dark){:root{--bg:#111418;--card:#1a1f25;--fg:#e4e7eb;--muted:#9aa5b1;--line:#2c333b;--accent:#7cb4e8;--ok:#5fc48e;--warn:#f0a43c;--bad:#f27166}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 "Segoe UI",system-ui,sans-serif}
main{max-width:1200px;margin:0 auto;padding:24px 16px}h1{margin:0 0 4px;color:var(--accent)}h2{margin:28px 0 10px;font-size:1.1em;color:var(--accent)}
.muted{color:var(--muted)}.bar{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
.chip{border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:999px;padding:4px 12px;cursor:pointer;font:inherit}
.chip[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:var(--bg)}
input,select{font:inherit;padding:6px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px}
.card h3{margin:0 0 2px;font-size:1em}.card a{color:var(--accent)}.meta{font-size:.88em;color:var(--muted)}
.etapa{display:inline-block;font-size:.8em;font-weight:600;padding:2px 8px;border-radius:6px;background:var(--line)}
.alert{color:var(--warn);font-size:.88em;margin:6px 0 0}.docs{margin:8px 0 0;padding:0;list-style:none;font-size:.88em}
.docs li::before{margin-right:6px}.listo::before{content:"✓";color:var(--ok)}.falta::before{content:"☐";color:var(--bad)}.en-tramite::before{content:"⏳"}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:12px;font-size:.9em}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}.wrap{overflow-x:auto}
.top{display:flex;justify-content:space-between;gap:8px;margin-bottom:4px}.files{margin:8px 0 0}
.acciones{margin-top:10px;padding-top:10px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:8px}
.postule{font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px}.postule input{width:18px;height:18px}
.link{background:none;border:0;color:var(--muted);font:inherit;font-size:.85em;cursor:pointer;text-decoration:underline}
.aviso{background:var(--card);border:1px solid var(--warn);border-radius:8px;padding:10px 12px}
details{margin-top:28px}summary{cursor:pointer;font-weight:600;color:var(--accent)}
</style></head><body><main>
<h1>Mis postulaciones</h1>
<div class="muted" id="resumen"></div>
<p class="aviso" id="aviso" hidden>Para marcar lo que ya postulaste, abre el panel con <code>npm run panel</code>.</p>
<h2 id="t-listas"></h2>
<p class="muted">Ordenadas por prioridad: primero lo que cierra pronto, luego mayor puntaje. Al enviar una, marca <b>Ya postulé</b>.</p>
<div class="grid" id="listas"></div>
<h2 id="t-espera"></h2>
<p class="muted">Aún no se pueden enviar: les falta algún documento o la convocatoria todavía no abre.</p>
<div class="grid" id="espera"></div>
<details><summary id="t-hist"></summary>
<p class="muted">Cambia la etapa cuando te respondan (En revisión, Entrevista, Oferta, Rechazada...).</p>
<div class="grid" id="hist"></div></details>
<details><summary>Documentos compartidos · <a href="HABILIDADES.md">Habilidades que piden</a> · <a href="cambios.md">Historial de cambios</a></summary>
<div class="wrap"><table><thead><tr><th>Documento</th><th>Estado</th><th>Lo piden</th><th>Nota</th></tr></thead><tbody id="docs"></tbody></table></div></details>
</main>
<script>
const D=${data};
const $=(id)=>document.getElementById(id), esc=(s)=>String(s??"").replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const PANEL=location.protocol.startsWith("http"), CERRADAS=["Aceptada","Rechazada","Descartada","Vencida"];
$("aviso").hidden=PANEL;
const vencida=(f)=>f.cierre&&f.cierre<D.hoy;
const porPostular=D.fichas.filter((f)=>f.etapa==="Preparada"&&!vencida(f));
const listas=D.cola.map((id)=>D.fichas.find((f)=>f.id===id));
const espera=porPostular.filter((f)=>!D.cola.includes(f.id)).sort((a,b)=>(a.abre||a.cierre||"9").localeCompare(b.abre||b.cierre||"9"));
const hist=D.fichas.filter((f)=>!porPostular.includes(f)).reverse();
$("resumen").textContent="Por postular: "+porPostular.length+" · ya postuladas: "+D.fichas.filter((f)=>!["Preparada","Vencida","Descartada"].includes(f.etapa)).length+" · actualizado el "+D.hoy;
$("t-listas").textContent="Listas para enviar ("+listas.length+")";
$("t-espera").textContent="Esperando documentos o apertura ("+espera.length+")";
$("t-hist").textContent="Postuladas y cerradas ("+hist.length+")";
const archivos=(f)=>["README","cv","carta","respuestas"].map((n)=>'<a href="postulaciones/'+esc(f.id)+"/"+n+'.pdf" target="_blank">'+(n==="README"?"Guía":n==="cv"?"CV":n[0].toUpperCase()+n.slice(1))+"</a>").join(" · ")+' · <a href="postulaciones/'+esc(f.id)+'/" target="_blank">Carpeta</a>';
function tarjeta(f,modo){
  const acciones=modo==="hist"
    ?'<label class="meta">Etapa: <select data-id="'+esc(f.id)+'" class="etapa-sel"'+(PANEL?"":" disabled")+">"+D.etapas.map((e)=>"<option"+(e===f.etapa?" selected":"")+">"+e+"</option>").join("")+"</select></label>"
    :'<label class="postule"><input type="checkbox" data-id="'+esc(f.id)+'" class="ya"'+(PANEL?"":" disabled")+"> Ya postulé</label>"+(PANEL?' <button class="link descartar" data-id="'+esc(f.id)+'">Descartar</button>':"");
  return '<article class="card"><div class="top"><span class="etapa">'+esc(f.etapa)+'</span><span class="meta">'+esc(f.tipo)+(f.puntaje?" · "+f.puntaje+"/10":"")+"</span></div>"+
    '<h3><a href="'+esc(f.enlace)+'" target="_blank" rel="noopener">'+esc(f.oportunidad)+'</a></h3><div class="meta">'+esc(f.organizacion)+" · cierre: "+esc(f.cierre||"no publicado")+(f.abre?" · abre "+esc(f.abre):"")+"</div>"+
    '<p class="meta files">'+archivos(f)+"</p>"+f.alertas.map((a)=>'<p class="alert">'+esc(a)+"</p>").join("")+
    (modo==="hist"?"":'<ul class="docs">'+f.docs.filter((d)=>d.estado!=="listo").map((d)=>'<li class="'+d.estado+'">Falta: '+esc(d.nombre)+(d.disponible_desde?" · ≈ "+esc(d.disponible_desde):"")+"</li>").join("")+"</ul>")+
    (f.proxima_accion&&modo!=="hist"?'<p class="meta"><b>Cómo:</b> '+esc(f.proxima_accion)+"</p>":"")+'<div class="acciones">'+acciones+"</div></article>";
}
$("listas").innerHTML=listas.map((f)=>tarjeta(f)).join("")||'<p class="muted">Nada listo para enviar.</p>';
$("espera").innerHTML=espera.map((f)=>tarjeta(f)).join("")||'<p class="muted">Nada en espera.</p>';
$("hist").innerHTML=hist.map((f)=>tarjeta(f,"hist")).join("");
async function guardar(id,etapa,nota){
  const r=await fetch("/api/etapa",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id,etapa,nota})});
  if(!r.ok){alert("No se pudo guardar: "+await r.text());return false}
  location.reload();return true;
}
document.addEventListener("change",async(ev)=>{
  const el=ev.target;
  if(el.classList.contains("ya")&&el.checked){
    const f=D.fichas.find((x)=>x.id===el.dataset.id);
    if(!confirm("¿Marcar como postulada?\\n\\n"+f.oportunidad+" — "+f.organizacion)){el.checked=false;return}
    if(!await guardar(f.id,"Enviada","Marcada desde el panel"))el.checked=false;
  }
  if(el.classList.contains("etapa-sel"))await guardar(el.dataset.id,el.value,"Cambiada desde el panel");
});
document.addEventListener("click",async(ev)=>{
  if(!ev.target.classList.contains("descartar"))return;
  const motivo=prompt("¿Por qué la descartas? (opcional)");
  if(motivo!==null)await guardar(ev.target.dataset.id,"Descartada",motivo||"Descartada desde el panel");
});
$("docs").innerHTML=Object.entries(D.catalogo).map(([id,d])=>"<tr><td>"+esc(d.nombre)+'</td><td class="docs"><span class="'+d.estado+'">'+esc(d.estado)+(d.estado!=="listo"&&d.disponible_desde?" (≈ "+esc(d.disponible_desde)+")":"")+"</span></td><td>"+D.fichas.filter((f)=>f.docs.some((x)=>x.doc===id)).length+"</td><td>"+esc(d.nota)+"</td></tr>").join("");
</script></body></html>
`)
}

function cambiarEtapa(id, etapa, nota) {
  if (!existsSync(fichaPath(id))) throw new Error(`No existe ${fichaPath(id)}`)
  if (!ETAPAS.includes(etapa)) throw new Error(`Etapa inválida "${etapa}". Usa: ${ETAPAS.join(", ")}`)
  const ficha = readJson(fichaPath(id))
  ficha.etapa = etapa
  ficha.historial = [...(ficha.historial ?? []), { fecha: hoy, etapa, ...(nota ? { nota } : {}) }]
  writeJson(fichaPath(id), ficha)
  console.log(`${id}: ${etapa}`)
}

const [cmd, ...args] = process.argv.slice(2)
if (cmd === "etapa") cambiarEtapa(args[0], args[1], args[2])
else if (cmd) throw new Error(`Comando desconocido "${cmd}"`)

migrarRegistro()
const catalogo = readJson(path.join(root, "documentos", "catalogo.json"))
const fichas = cargarFichas().map((f) => {
  if (!ETAPAS.includes(f.etapa)) throw new Error(`${f.id}: etapa inválida "${f.etapa}"`)
  const conDocs = { ...f, docs: resolverDocs(f, catalogo) }
  return { ...conDocs, alertas: alertas(conDocs) }
})
escribirRegistro(fichas)
escribirSeguimiento(fichas, catalogo)
escribirHtml(fichas, catalogo)
console.log(`Seguimiento: ${fichas.length} postulaciones → registro.md, SEGUIMIENTO.md, seguimiento.html`)
const sinEnviar = colaDeEnvio(fichas).length
console.log(`Sin enviar: ${sinEnviar} (límite ${MAX_SIN_ENVIAR})${sinEnviar >= MAX_SIN_ENVIAR ? " → LÍMITE ALCANZADO: no preparar postulaciones nuevas" : ""}`)
