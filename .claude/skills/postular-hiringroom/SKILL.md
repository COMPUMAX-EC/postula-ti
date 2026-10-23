---
name: postular-hiringroom
description: Guía y ayuda para postular en portales HiringRoom (hiringroom.com/jobs/get_vacancy/...): llena los campos que no son sensibles desde perfil.md y deja al usuario la cédula, la verificación de Cloudflare, subir el CV, aceptar la privacidad y enviar. Úsala cuando la vacante esté en HiringRoom.
---


## Antes de empezar (2 minutos)
- Ten a mano `postulaciones/<fecha>/<slug>/cv.pdf` (y `carta.md` si hay mensaje adicional).
- Revisa que `datos-formulario.md` no tenga [CONFIRMAR] que esta vacante pida (pretensión salarial, disponibilidad).

## El formulario
Dirección: `https://hiringroom.com/jobs/get_vacancy/<id>/candidates/new` (o desde la oferta, botón **Postularse**).
**No hace falta crear cuenta.** Son 3 pasos:

1. **Importa tu CV:** sube `cv.pdf`. HiringRoom lo lee y rellena parte de los pasos 2 y 3. Revisa lo que llenó.
2. **Datos personales** (todos obligatorios): nombre, apellido, email ×2, tipo y N° de documento, teléfono, tipo de
   teléfono, género, nacionalidad, país, provincia, localidad, domicilio, fecha de nacimiento.
3. **Información adicional:** al menos una educación y una experiencia (con mes y año de inicio y fin), idiomas,
   el CV como archivo adjunto, las preguntas propias de la empresa, pretensión salarial **bruta** en USD,
   disponibilidad horaria, mensaje adicional (pega la carta), Política de privacidad (obligatoria) y **Enviar
   postulación**.

## Trucos (lo que costó la primera vez)
- **Teléfono:** primero la bandera de Ecuador (+593) y luego los 9 dígitos sin el 0 (por ejemplo `98XXXXXXX`) en la casilla del
  número. Si escribes el número completo en el campo con formato, lo toma como código de país (98 = Irán).
- **Listas desplegables:** se puede escribir para filtrar y Enter para elegir. **Localidad depende de Provincia:**
  elige la provincia primero y luego escribe las primeras letras de tu ciudad.
- **Cloudflare** muestra "Verifique que es un ser humano": lo marcas tú.
- Deja **sin marcar** la invitación a Bumeran.
- Las preguntas de la empresa cambian por vacante (en Pague Ya: familiares en Banco Pichincha / Pague Ya y
  horario 8:00–17:00 o 9:00–18:00).

## Qué hace Claude y qué haces tú
| Claude | Tú |
|---|---|
| Abre el formulario y llena nombre, email, teléfono, tipo de teléfono, nacionalidad, residencia, educación, experiencia, idiomas y respuestas que ya estén en `perfil.md` | N° de cédula, género, fecha de nacimiento, domicilio, subir el CV (el navegador de Claude no puede adjuntar archivos), la verificación de Cloudflare, aceptar la Política de privacidad y pulsar **Enviar** |

Después de enviar: marca **Ya postulé** en el panel (`npm run panel`).
