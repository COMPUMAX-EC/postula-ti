---
name: documentos-postulacion
description: Organiza los documentos que comparten las postulaciones (cédula, pasaporte, título, récord, traducciones, certificado de inglés, cartas de recomendación, certificados laborales) y redacta los pedidos para conseguir los que faltan. Úsala para "qué documentos me faltan" o "cómo consigo la traducción del título".
---

# Documentos de postulación

- El catálogo está en `documentos/catalogo.json`; cada postulación los nombra por id en su `ficha.json`.
- Los escaneos van en `documentos/privados/` con el nombre del catálogo (por ejemplo `cedula.pdf`); esa carpeta
  no se sube a GitHub. Si el archivo existe, el documento cuenta como listo en todas las postulaciones.
- **Nunca abras ni copies el contenido de los escaneos**; solo comprueba si existen.

Pasos: lee la sección "Documentos compartidos" de `SEGUIMIENTO.md`, ordena los faltantes por cuántas postulaciones
los piden y por el cierre más cercano, y para los 2 primeros deja en `documentos/pedidos/<id>.md` a quién pedirlo,
el texto a enviar, los requisitos exactos (formato, idioma, firma) y el plazo.

Datos útiles para Ecuador: título y récord se apostillan en Cancillería; la traducción oficial la hace un perito
traductor acreditado por el Consejo de la Judicatura (pregunta antes si tu universidad emite los documentos en
inglés). Las becas Erasmus Mundus suelen pedir IELTS Academic 6.5 o TOEFL iBT, y no aceptan Duolingo.
