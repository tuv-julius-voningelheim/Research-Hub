# Roadmap — UX Research Insight Hub

Priorisierter Umsetzungsplan. Phasen sind einzeln shippbar; jede baut auf der
vorherigen auf, ohne sie vorauszusetzen.

## Phase 1 — Absicherung & Team-Basics

| # | Was | Warum | Aufwand |
|---|-----|-------|---------|
| 1.1 | ✅ **Passwortschutz** (Middleware + Login-Seite, `APP_PASSWORD` als Env-Var) | Interview-Daten mit Klarnamen dürfen nicht offen im Netz stehen | erledigt |
| 1.2 | **Konfliktschutz beim Sync**: Versionszähler im State; bei veraltetem Stand Hinweis „Workspace wurde geändert — neu laden" statt stillem Überschreiben | Verhindert Datenverlust bei parallelem Arbeiten | S |
| 1.3 | **Auto-Refresh**: Workspace bei Fenster-Fokus (und optional per Intervall) neu laden, sofern keine ungespeicherten Änderungen | „Shared · live" wird wirklich live | S |
| 1.4 | **Papierkorb/Soft-Delete** für Divisions/Programs/Projects mit Wiederherstellen | Löschen kaskadiert aktuell unwiderruflich | M |

## Phase 2 — Auswertung vertiefen (der inhaltliche Kern)

| # | Was | Warum | Aufwand |
|---|-----|-------|---------|
| 2.1 | **Program-/Divisions-Aggregation**: Themes & Pain Points über alle Projekte eines Programs konsolidiert; Confidence-Entwicklung über Runden sichtbar | Macht das Second-Brain-Prinzip „anreichern statt duplizieren" sichtbar | M |
| 2.2 | **SOP-Qualitätschecks** („Vault-Lint"): Persona < 3 Interviews ⇒ proto, Pain Point ohne Theme, Recommendation ohne Anker-Insight, Confidence vs. Interview-Count inkonsistent — als Report pro Upload | Automatisiert die Qualitäts-Checkliste aus `08_methods` | M |
| 2.3 | **Codes-Explorer**: alle `#code/…`-Tags mit Häufigkeit, Filter, Sprung zu Meaning Units | Unterstützt Dedup-Entscheidungen beim Coden | S |
| 2.4 | **Teilnehmer-Ansicht**: alle Zitate eines Interviews (INT-XXX) quer durch Themes/PPs/Insights | Member-Checks, Bias-Erkennung | S |
| 2.5 | **Evidenz-Graph**: interaktive Graph-Visualisierung Interview → Theme → PP → Insight → Rec | Traceability auf einen Blick, zeigt Waisen-Notizen | L |

## Phase 3 — Workflow & Reporting

| # | Was | Warum | Aufwand |
|---|-----|-------|---------|
| 3.1 | **Markdown-/PDF-Export** des Projekt-Overviews (Management Summary) | Stakeholder-Reports ohne Copy-Paste | M |
| 3.2 | **Upload-Historie + Diff**: Versionen behalten, Änderungen zwischen Runden anzeigen („2 neue Themes, PP-03 Mittel → Hoch") | Fortschritt zwischen Analyse-Runden dokumentieren | M |
| 3.3 | **Eigene Notizen & Next Steps** pro Projekt, „Track"-Buttons an offenen Fragen | Manuelle Arbeitsebene neben der programmatischen Auswertung | M |
| 3.4 | **Komfort**: Filter/Sortierung in Tabs (Severity, Confidence, Segment), „Link kopieren" an Notizen, Drag-and-drop auf Projektkarten, Mobile-Layout | Alltagstauglichkeit | S–M |

## Phase 4 — Infrastruktur (erst bei Wachstum)

| # | Was | Warum | Aufwand |
|---|-----|-------|---------|
| 4.1 | **Original-ZIPs mitspeichern** (Blob) und Re-Parse-Button | Parser-Verbesserungen rückwirkend anwendbar | S |
| 4.2 | **Neon Postgres** (free) statt Blob-JSON; serverseitige Volltextsuche | Nötig ab mehreren parallel arbeitenden Teams | L |
| 4.3 | **SSO/NextAuth** statt Shared Password | Personenbezogene Zugriffe, Audit | L |

Aufwand: S ≈ Stunden, M ≈ ein Tag, L ≈ mehrere Tage.

**Empfohlene Reihenfolge:** 1.2 → 1.3 → 2.1 → 2.2 → 3.1, den Rest nach Bedarf.
