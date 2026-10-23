// Genera docs/index.html (la página de GitHub Pages) desde plataformas.json y las skills de .claude/skills.
// Uso:  node scripts/plataformas.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const REPO = "https://github.com/COMPUMAX-EC/postula-ti"
const { plataformas } = JSON.parse(readFileSync(path.join(root, "plataformas.json"), "utf8"))
const skills = readdirSync(path.join(root, ".claude", "skills")).sort().map((name) => {
  const md = readFileSync(path.join(root, ".claude", "skills", name, "SKILL.md"), "utf8")
  return { name, description: md.match(/^description:\s*(.+)$/m)?.[1] ?? "" }
})
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
const data = JSON.stringify(plataformas).replace(/</g, "\\u003c")

writeFileSync(path.join(root, "docs", "index.html"), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Postula TI</title>
<meta name="description" content="Directorio de plataformas para postular a empleos de TI y becas en Ecuador y LATAM, con skills de Claude Code y scripts para preparar y seguir tus postulaciones.">
<style>
:root{--bg:#f7f8fa;--card:#fff;--fg:#1f2933;--muted:#5f6b7a;--line:#e1e5ea;--accent:#0b5cad;--chip:#eef3f9;--ok:#1f7a4d;--warn:#a35b00;--no:#8a94a3}
@media (prefers-color-scheme:dark){:root{--bg:#0f1317;--card:#171c22;--fg:#e4e7eb;--muted:#9aa5b1;--line:#29313a;--accent:#7cb4e8;--chip:#1e2731;--ok:#5fc48e;--warn:#f0a43c;--no:#7b8794}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 "Segoe UI",system-ui,sans-serif}
main{max-width:1100px;margin:0 auto;padding:32px 16px 64px}a{color:var(--accent)}
h1{margin:0;font-size:2rem;letter-spacing:-.01em}h2{margin:40px 0 12px;font-size:1.25rem}.lead{color:var(--muted);max-width:760px}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px;margin-top:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
pre{margin:8px 0 0;padding:10px 12px;background:var(--chip);border-radius:8px;overflow-x:auto;font-size:.85rem}
.btn{display:inline-block;margin:16px 8px 0 0;padding:9px 16px;border-radius:8px;background:var(--accent);color:var(--bg);text-decoration:none;font-weight:600}
.btn.alt{background:transparent;color:var(--accent);border:1px solid var(--accent)}
.bar{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
input,select{font:inherit;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg)}
input{flex:1;min-width:200px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.p h3{margin:0 0 4px;font-size:1rem}.meta{font-size:.85rem;color:var(--muted)}.p p{margin:8px 0 0;font-size:.9rem}
.tag{display:inline-block;font-size:.75rem;font-weight:600;padding:2px 8px;border-radius:6px;background:var(--chip);margin-right:4px}
.r-API,.r-Fácil{color:var(--ok)}.r-Con{color:var(--warn)}.r-No,.r-Por{color:var(--no)}
.skills{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.skills code{font-weight:600}footer{margin-top:48px;color:var(--muted);font-size:.85rem}
</style></head><body><main>
<h1>Postula TI</h1>
<p class="lead">Las plataformas donde vale la pena postular a empleos de TI y becas desde Ecuador y LATAM, y las
herramientas para buscar vacantes, preparar cada postulación, seguir su estado y saber qué habilidades aprender.
Gratis y de código abierto, por DevIALabs.</p>
<a class="btn" href="${REPO}/archive/refs/heads/main.zip">Descargar (.zip)</a>
<a class="btn alt" href="${REPO}">Ver en GitHub</a>

<h2>Cómo usarlo</h2>
<div class="steps">
<div class="card"><b>1. Descarga e instala</b><p class="meta">Necesitas Node.js 20 o más.</p><pre>git clone ${REPO}.git
cd postula-ti
npm ci</pre></div>
<div class="card"><b>2. Tu perfil</b><p class="meta">Copia <code>perfil.ejemplo.md</code> como <code>perfil.md</code> y complétalo. No se sube a GitHub.</p></div>
<div class="card"><b>3a. Con Claude Code</b><p class="meta">Abre la carpeta con Claude Code y pide, por ejemplo:</p><pre>busca vacantes para mí
prepara la postulación de &lt;enlace&gt;
¿cómo van mis postulaciones?</pre></div>
<div class="card"><b>3b. Solo con scripts</b><pre>npm run buscar        # vacantes por API
npm run revisar       # cierres y resultados
npm run panel         # panel: marcar Ya postulé
npm run marcar        # marcar enviadas
npm run habilidades   # qué aprender
npm run pdf           # CV y carta en PDF</pre></div>
</div>

<h2>Skills incluidas</h2>
<div class="skills">${skills.map((s) => `<div class="card"><code>${esc(s.name)}</code><p class="meta">${esc(s.description)}</p></div>`).join("")}</div>

<h2>Directorio de plataformas</h2>
<p class="meta" id="cuenta"></p>
<div class="bar"><input id="q" type="search" placeholder="Buscar empresa, sector o plataforma">
<select id="tipo"><option value="">Todos los tipos</option></select>
<select id="reco"><option value="">Cualquier acceso</option></select></div>
<p class="meta"><b>API</b>: datos públicos, se leen automáticamente · <b>Fácil</b>: página o feed sin login · <b>Con navegador</b>: carga con JavaScript · <b>No</b>: correo, LinkedIn o portal con cuenta.</p>
<div class="grid" id="lista"></div>

<footer>¿Conoces una plataforma que falta? Agrégala a <code>plataformas.json</code> con un pull request en
<a href="${REPO}">GitHub</a>. Verificado por última vez: ${esc(plataformas.map((p) => p.verificado).sort().pop())}.
Las skills nunca envían postulaciones ni inician sesión por ti.</footer>
</main>
<script>
const P=${data};
const $=(id)=>document.getElementById(id),esc=(s)=>String(s??"").replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
[...new Set(P.map((p)=>p.tipo))].sort().forEach((t)=>$("tipo").add(new Option(t,t)));
[...new Set(P.map((p)=>p.recolectable))].forEach((r)=>$("reco").add(new Option(r,r)));
["q","tipo","reco"].forEach((id)=>$(id).oninput=pintar);
function pintar(){
  const q=$("q").value.toLowerCase(),t=$("tipo").value,r=$("reco").value;
  const l=P.filter((p)=>(!t||p.tipo===t)&&(!r||p.recolectable===r)&&(!q||[p.nombre,p.sector,p.plataforma,p.pais].join(" ").toLowerCase().includes(q)));
  $("cuenta").textContent=l.length+" de "+P.length+" plataformas";
  $("lista").innerHTML=l.map((p)=>'<article class="card p"><h3>'+(p.url?'<a href="'+esc(p.url)+'" target="_blank" rel="noopener">'+esc(p.nombre)+"</a>":esc(p.nombre))+"</h3>"+
    '<div class="meta"><span class="tag">'+esc(p.tipo)+'</span>'+esc(p.sector)+" · "+esc(p.pais)+"</div>"+
    '<p><b>Plataforma:</b> '+esc(p.plataforma)+' · <span class="r-'+esc(p.recolectable.split(" ")[0])+'"><b>'+esc(p.recolectable)+"</b></span></p>"+
    "<p>"+esc(p.como_postular)+"</p>"+(p.nota?'<p class="meta">'+esc(p.nota)+"</p>":"")+"</article>").join("");
}
pintar();
</script></body></html>
`)
console.log(`docs/index.html: ${plataformas.length} plataformas, ${skills.length} skills`)
