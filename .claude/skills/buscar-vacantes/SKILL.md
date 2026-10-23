---
name: buscar-vacantes
description: Busca vacantes de TI y becas vigentes para el perfil del usuario (APIs públicas de Get on Board, Workable, Greenhouse y Lever, más las plataformas de plataformas.json), confirma que siguen abiertas, las puntúa de 1 a 10 y propone solo las de 7 o más. Úsala cuando el usuario pida "busca vacantes", "qué hay para mí" o "busca becas".
---

# Buscar vacantes

1. Lee `perfil.md` (si no existe, pide al usuario que copie `perfil.ejemplo.md` y lo complete; no sigas sin él) y
   `registro.md` si existe (no repitas lo ya preparado).
2. `npm ci` si falta `node_modules`, luego `node scripts/buscar-ofertas.mjs` → `fuentes/candidatas.json`.
   Ajusta `fuentes.json` si el usuario busca en otras categorías o empresas.
3. Revisa además `plataformas.json`: las de recolectable "Fácil" o "Con navegador" que encajen con su sector y
   ciudad (ábrelas y lee sus vacantes), y busca en la web becas y vacantes recientes solo en fuentes oficiales.
4. Abre el enlace de cada candidata y confirma que sigue abierta.
5. Puntúa de 1 a 10: encaje con el perfil, urgencia (cierre cercano) y valor (sueldo, empresa, beca financiada).
   Baja el puntaje a las tiradas largas: requisitos obligatorios que no están en el perfil, cientos de postulantes,
   empresa que no responde hace meses.
6. Muestra una tabla con las de puntaje ≥ 7 (oportunidad, organización, puntaje y por qué, cierre, enlace) y una
   lista de espera con las de 6. Pregunta cuáles preparar (skill `preparar-postulacion`).

Reglas: no inicias sesión, no creas cuentas, no envías nada. Si una plataforma nueva aparece, propón agregarla a
`plataformas.json` (nombre, tipo, sector, url, plataforma, recolectable, como_postular).
