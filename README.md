# TÜV SÜD — UX Research Insight Hub

Ein Hub zum Auswerten von UX-Research: **Second-Brain-Exporte (Obsidian-Vault als ZIP)**
hochladen und als strukturierte, nachvollziehbare Erkenntnisse aufbereiten — komplett
**programmatisch, ohne KI-Auswertung**.

## Struktur

```
Division  →  Program  →  Project  →  Second-Brain-Export (ZIP)
```

Jedes Projekt hält genau einen Export. Der Vault wird direkt **im Browser** geparst
(JSZip). Gespeichert wird in einem geteilten Workspace auf **Vercel Blob** (Free Tier):
`/api/state` hält die Struktur, `/api/vault?projectId=…` je Projekt die geparste
Auswertung. Ohne konfigurierten Blob-Store (z. B. lokales `next dev` ohne Token)
fällt die App automatisch auf lokalen IndexedDB-Modus zurück — sichtbar am Badge
unten links („Shared · live“ vs. „Local · this browser“).

## Was wird ausgewertet?

Der Parser versteht die Second-Brain-Ordnerstruktur (`01_interviews` … `09_archive`)
und die Frontmatter der Notizen (`typ`, `confidence`, `severity`, `priority`, …):

- **Interviews** — Kontext, Meaning Units (Zitat + Code), Segment, Teilnehmer-ID
- **Themes** — Confidence, Interview-/Zitat-Zähler, verknüpfte Pain Points & Needs
- **Pain Points** — Severity × Confidence × Evidenz → **Priority Shortlist**
- **Needs** (Funktional / Emotional / Sozial / Latent)
- **Insights** und **Recommendations** — inkl. Anker-Insight-Nachvollziehbarkeit
- **Personas**, Methodik/SOP, Rohtranskripte (Archiv)
- `[[Wikilinks]]` werden aufgelöst und navigierbar, Backlinks werden angezeigt
- Offene Fragen & Research Gaps werden vault-weit eingesammelt

## Entwicklung

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # Produktionsbuild
```

## Deployment (Vercel via GitHub)

1. Repo auf GitHub pushen.
2. Auf [vercel.com](https://vercel.com) → **Add New Project** → dieses Repo importieren.
3. Framework-Preset **Next.js** wird automatisch erkannt — keine weiteren
   Einstellungen oder Umgebungsvariablen nötig.

## Beispieldaten

`public/demo/Second_Brain_Test_1.zip` ist ein Beispiel-Export (MACE / MHS User
Interviews). Auf dem leeren Dashboard lässt er sich per Klick laden — er durchläuft
exakt dieselbe Parsing-Pipeline wie ein manueller Upload.

## Hinweis zur Speicherung

Der geteilte Workspace nutzt Vercel Blob mit Last-Write-Wins-Semantik (die ganze
Struktur wird als ein JSON geschrieben). Für kleine Teams ist das unkritisch;
bei vielen gleichzeitigen Bearbeitenden wäre eine relationale Datenbank der
nächste Ausbauschritt. Blob-Objekte sind technisch öffentlich erreichbar, aber
nur über nicht erratbare Store-URLs — für vertrauliche Daten ggf. Zugriffsschutz
(Auth) ergänzen.
