---
name: seguimiento-postulaciones
description: Lleva el seguimiento de todas las postulaciones (etapas, cola de envío priorizada, documentos que faltan, cierres) y revisa sin iniciar sesión si las vacantes se cerraron, si cambiaron las páginas de becas o si llegó la fecha de resultados. Úsala para "cómo van mis postulaciones", "ya envié X", "qué envío hoy".
---

# Seguimiento de postulaciones

- **Revisar cambios:** `node scripts/revisar.mjs` (vacantes cerradas por API de Lever, Greenhouse y Workable o por
  el botón de postular; cambios en páginas de becas; fechas de `resultados`). Pasa a "Vencida" solo las vacantes
  con cierre confirmado que nunca se enviaron. Historial en `cambios.md`.
- **Ver todo:** `node scripts/seguimiento.mjs` → `SEGUIMIENTO.md` y `seguimiento.html` (ábrelo en el navegador).
  Muestra la cola de envío: primero lo que cierra en 7 días, luego mayor puntaje, luego lo más antiguo.
- **Marcar una etapa:** `node scripts/seguimiento.mjs etapa <fecha>/<slug> Enviada "nota"`, o el menú
  interactivo `npm run marcar`. Etapas: Preparada, Enviada, En revisión, Entrevista, Oferta, Aceptada, Rechazada,
  Descartada, Vencida.

Al responder, empieza por los cambios detectados, luego "Para enviar hoy" (las 2 primeras de la cola, con enlace
y archivos a adjuntar) y los documentos que faltan. Una vacante enviada que se cerró no es un rechazo: sugiere
revisar el correo. Recomienda no tener más de 5 postulaciones listas sin enviar: enviar es el cuello de botella.
