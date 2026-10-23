---
name: mapa-habilidades
description: Recopila y clasifica las tecnologías y habilidades que piden las vacantes y becas preparadas (quién las pide y cuándo), compara con el nivel del usuario y prioriza qué aprender, con un mini proyecto para la brecha principal. Úsala para "qué debo aprender", "qué piden las empresas".
---

# Mapa de habilidades

1. Revisa que cada `postulaciones/*/*/ficha.json` tenga `publicada` y `habilidades` (ids de
   `habilidades/catalogo.json`, obligatoria o deseable). Completa las que falten leyendo su README.
2. Si el usuario no ha marcado su nivel, propón el estado de cada habilidad del catálogo según `perfil.md`
   (tengo / parcial / falta; nunca "tengo" sin evidencia en el perfil) y pídele que lo confirme.
3. `node scripts/habilidades.mjs` → `HABILIDADES.md`: brechas por prioridad = Σ (obligatoria 2, deseable 1) ×
   puntaje de la vacante / 10, con quién la pide y cuándo.
4. Para la brecha técnica #1, propone en `habilidades/plan.md` un mini proyecto público de 1 a 3 tardes con
   recursos gratuitos oficiales y cómo contarlo en el CV.
