---
name: preparar-postulacion
description: Prepara una postulación completa a partir de una vacante o beca (README con requisitos, brechas y pasos; CV y carta adaptados de una página; respuestas del formulario; ficha.json para el seguimiento; PDF listos para adjuntar). Úsala cuando el usuario pase un enlace de vacante o elija una de buscar-vacantes.
---

# Preparar una postulación

Datos: todo sale de `perfil.md`. Lo que falte o esté marcado [CONFIRMAR] va como pregunta, nunca se inventa.

1. Abre el enlace oficial: requisitos, documentos pedidos, fecha de publicación y de cierre, forma de postular.
2. Crea `postulaciones/<AAAA-MM-DD>/<slug>/` (fecha de hoy) con:
   - `README.md`: qué es, organización, enlace, cierre, requisitos (✅ cumple / 🟡 parcial / ❌ no consta),
     por qué encaja (3 puntos), brechas honestas y pasos exactos para postular.
   - `cv.md` (1 página A4; reordena y destaca lo relevante del perfil, sin agregar nada) y `carta.md`
     (250–400 palabras, específica para la organización). En el idioma de la oferta. Si existen
     `documentos/cv-es.md`, `documentos/cv-en.md` o `documentos/carta-motivacion.md`, parte de ellos.
   - `respuestas.md`: borradores para las preguntas típicas del formulario.
   - `correo.md` solo si se postula por correo.
   - `ficha.json` (copia la forma de `ficha.ejemplo.json`): puntaje, publicada, cierre, enlace, etapa "Preparada",
     documentos pedidos (propios con su archivo; compartidos por id de `documentos/catalogo.json`) y habilidades
     pedidas (ids de `habilidades/catalogo.json`, obligatoria o deseable; agrega al catálogo las que falten).
3. `node scripts/pdf.mjs postulaciones/<AAAA-MM-DD>`: si un CV o carta no cabe en una página, recórtalo.
4. `node scripts/seguimiento.mjs` y `node scripts/habilidades.mjs`.
5. Resume: carpeta, documentos que faltan, preguntas para el usuario y los PDF a adjuntar.

Reglas: no envías nada ni llenas formularios; no copias cédula ni datos de referencias a ningún archivo.
