# Postula TI

🇬🇧 **English** · 🇪🇨 [Español](README.es.md)

Open tools for IT professionals in Ecuador and Latin America: where to apply, how to prepare each application, how to
track its status and which skills to learn based on what job openings actually ask for. The tools, the Claude Code
skills and the documents they produce are in Spanish.

**Page with the platform directory:** https://compumax-ec.github.io/postula-ti/

## What it includes
- **`plataformas.json`**: 41 verified platforms (job boards, large companies, public sector, banks and cooperatives,
  scholarships), with how to apply and whether they can be read automatically.
- **Claude Code skills** (`.claude/skills/`): `buscar-vacantes`, `preparar-postulacion`,
  `seguimiento-postulaciones`, `mapa-habilidades`, `documentos-postulacion`.
- **Scripts** (Node.js 20+, no accounts or keys):

| Command | What it does |
|---|---|
| `npm run buscar` | IT openings available to Ecuador/LATAM on Get on Board, Workable, Greenhouse and Lever (companies in `fuentes.json`) → `fuentes/candidatas.json` |
| `npm run revisar` | Checks whether openings closed, whether scholarship pages changed and whether the results date arrived → `cambios.md` |
| `npm run panel` | Browser dashboard: what is left to apply to, files to attach, and an "I applied" checkbox that saves the change (opens http://127.0.0.1:4321) |
| `npm run seguimiento` | `seguimiento.html` dashboard and `SEGUIMIENTO.md`: stages, sending queue, missing documents, deadlines |
| `npm run marcar` | Menu to mark applications as sent, interviewing, rejected... |
| `npm run habilidades` | `HABILIDADES.md`: which technologies are asked for, by whom and when, and your gaps by priority |
| `npm run pdf` | Converts CVs, cover letters and `.md` documents to PDF (CV and letter on one page) |
| `npm run plataformas` | Regenerates the `docs/index.html` page |

## Getting started
```bash
git clone https://github.com/COMPUMAX-EC/postula-ti.git
cd postula-ti
npm ci
```
1. Copy `perfil.ejemplo.md` to `perfil.md` and fill it in (it is not pushed to GitHub).
2. With Claude Code: open the folder and ask "busca vacantes para mí" (find openings for me) or "prepara la
   postulación de <link>" (prepare the application for <link>). Without Claude: use the commands above; each
   application is a folder in `postulaciones/<date>/<slug>/` with a `ficha.json` like `ficha.ejemplo.json`.
3. Keep your scans (ID card, degree, certificates) in `documentos/privados/` with the names from
   `documentos/catalogo.json`: that folder is not pushed either.

## Principles
- Nothing is sent on its own: the tools prepare, you apply.
- No invented data: everything comes from your `perfil.md`.
- No logging in to any portal.

## Contributing
Missing a platform? Add it to `plataformas.json` and open a pull request.

Made by [DevIALabs](https://github.com/COMPUMAX-EC). MIT license.
