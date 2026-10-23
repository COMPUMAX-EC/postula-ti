# Postula TI

Herramientas abiertas para profesionales de TI en Ecuador y LATAM: dónde postular, cómo preparar cada postulación,
cómo seguir su estado y qué habilidades aprender según lo que de verdad piden las vacantes.

**Página con el directorio de plataformas:** https://compumax-ec.github.io/postula-ti/

## Qué incluye
- **`plataformas.json`**: 41 plataformas verificadas (bolsas de empleo, empresas grandes, sector público, bancos y
  cooperativas, becas), con cómo postular y si se pueden leer automáticamente.
- **Skills de Claude Code** (`.claude/skills/`): `buscar-vacantes`, `preparar-postulacion`,
  `seguimiento-postulaciones`, `mapa-habilidades`, `documentos-postulacion`.
- **Scripts** (Node.js 20+, sin cuentas ni claves):

| Comando | Qué hace |
|---|---|
| `npm run buscar` | Vacantes de TI abiertas a Ecuador/LATAM en Get on Board, Workable, Greenhouse y Lever (empresas de `fuentes.json`) → `fuentes/candidatas.json` |
| `npm run revisar` | Revisa si las vacantes se cerraron, si cambiaron las páginas de becas y si llegó la fecha de resultados → `cambios.md` |
| `npm run panel` | Panel en el navegador: lo que falta postular, archivos a adjuntar y casilla "Ya postulé" que guarda el cambio (abre http://127.0.0.1:4321) |
| `npm run seguimiento` | Panel `seguimiento.html` y `SEGUIMIENTO.md`: etapas, cola de envío, documentos que faltan, cierres |
| `npm run marcar` | Menú para marcar postulaciones como enviadas, en entrevista, rechazadas... |
| `npm run habilidades` | `HABILIDADES.md`: qué tecnologías piden, quién y cuándo, y tus brechas por prioridad |
| `npm run pdf` | Convierte CV, cartas y documentos `.md` a PDF (CV y carta en una página) |
| `npm run plataformas` | Regenera la página `docs/index.html` |

## Empezar
```bash
git clone https://github.com/COMPUMAX-EC/postula-ti.git
cd postula-ti
npm ci
```
1. Copia `perfil.ejemplo.md` como `perfil.md` y complétalo (no se sube a GitHub).
2. Con Claude Code: abre la carpeta y pide "busca vacantes para mí" o "prepara la postulación de <enlace>".
   Sin Claude: usa los comandos de arriba; cada postulación es una carpeta en `postulaciones/<fecha>/<slug>/` con
   un `ficha.json` como `ficha.ejemplo.json`.
3. Guarda tus escaneos (cédula, título, certificados) en `documentos/privados/` con el nombre de
   `documentos/catalogo.json`: esa carpeta tampoco se sube.

## Principios
- Nada se envía solo: las herramientas preparan, tú postulas.
- No se inventan datos: todo sale de tu `perfil.md`.
- Sin iniciar sesión en ningún portal.

## Contribuir
¿Falta una plataforma? Agrégala a `plataformas.json` y abre un pull request.

Hecho por [DevIALabs](https://github.com/COMPUMAX-EC). Licencia MIT.
