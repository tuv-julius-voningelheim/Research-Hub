"use client";

// Lightweight DE/EN UI language layer. Components pass their literal source
// string through t(); the EN map translates German-source strings for EN
// mode, the DE map translates English-source strings for DE mode. Unknown
// strings fall back to themselves, so nothing can break. Research jargon
// (Themes, Pain Points, Severity, …) deliberately stays English in both
// languages. Vault CONTENT is never translated, only the UI chrome.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "de" | "en";

// German UI string -> English
const EN: Record<string, string> = {
  // nav / shell
  "Menü": "Menu",
  "Menü öffnen": "Open menu",
  "Menü schließen": "Close menu",
  "Sync-Fehler": "Sync error",
  "Lokal · dieser Browser": "Local · this browser",
  "Verbinde…": "Connecting…",

  // banners
  "Der Server-Workspace ist leer, aber dieser Browser hat einen gespeicherten Stand.":
    "The server workspace is empty, but this browser has a saved copy.",
  "Stelle wieder her…": "Restoring…",
  "Auf Server wiederherstellen": "Restore to server",
  "Der Speicherdienst ist vorübergehend nicht erreichbar (Nutzungslimit). Deine Daten sind sicher — du arbeitest lokal, bis er wieder verfügbar ist.":
    "The storage service is temporarily unavailable (usage limit). Your data is safe — you are working locally until it is back.",
  "Der Workspace wurde von jemand anderem geändert.":
    "The workspace was changed by someone else.",
  "Lade…": "Loading…",
  "Neu laden": "Reload",
  "Du hast lokale Änderungen, die noch nicht im geteilten Workspace sind.":
    "You have local changes that are not in the shared workspace yet.",
  "Veröffentlichen": "Publish",
  "Veröffentliche…": "Publishing…",
  "Verwerfen": "Discard",

  // login
  "Passwort": "Password",
  "Team-Passwort": "Team password",
  "Falsches Passwort.": "Wrong password.",
  "Prüfe…": "Checking…",
  "Anmelden": "Sign in",

  // dashboard
  "Second-Brain-Exporte hochladen — Themes, Pain Points, Needs, Insights und Empfehlungen werden programmatisch ausgewertet und als gemeinsame, nachvollziehbare Erkenntnisse aufbereitet.":
    "Upload second-brain exports — themes, pain points, needs, insights and recommendations are evaluated programmatically and turned into shared, traceable findings.",
  "Noch keine Projekte": "No projects yet",
  "Lege unter Divisions → Programs → Projects deine Struktur an und lade dann einen Second-Brain-Export (ZIP) hoch. Oder starte mit den Beispieldaten.":
    "Create your structure under Divisions → Programs → Projects, then upload a second-brain export (ZIP). Or start with the sample data.",
  "Lade Beispieldaten…": "Loading sample data…",
  "Beispieldaten laden (MACE)": "Load sample data (MACE)",
  "Belegte Zitate": "Sourced quotes",

  // list pages
  "Keine Treffer": "No matches",
  "Filter anpassen.": "Adjust the filter.",
  "Filter zurücksetzen": "Reset filters",
  "Filter anpassen oder zurücksetzen.": "Adjust or reset the filters.",
  "Pain-Point-Register": "Pain point register",
  "Konsolidierte Übersichtstabelle aller Pain Points":
    "Consolidated overview table of all pain points",
  "Noch keine Divisions": "No divisions yet",
  "Lege die erste Division an, z. B. „Product Service“.":
    "Create the first division, e.g. “Product Service”.",
  "Beschreibung (optional)": "Description (optional)",
  "z. B. Product Service": "e.g. Product Service",
  "wirklich löschen? Alle zugehörigen Programs und Projects (inkl. hochgeladener Auswertungen) werden ebenfalls entfernt.":
    "— delete it? All related programs and projects (including uploaded analyses) will be removed as well.",
  "Noch keine Programs": "No programs yet",
  "Lege zuerst unter Divisions eine Division an.":
    "Create a division first under Divisions.",
  "Lege das erste Program an, z. B. „MACE“.":
    "Create the first program, e.g. “MACE”.",
  "Lege zuerst eine Division an": "Create a division first",
  "z. B. MACE": "e.g. MACE",
  "wirklich löschen? Alle zugehörigen Projects (inkl. hochgeladener Auswertungen) werden ebenfalls entfernt.":
    "— delete it? All related projects (including uploaded analyses) will be removed as well.",
  "Noch keine Projects": "No projects yet",
  "Lege ein Projekt an und lade danach den Second-Brain-Export (ZIP) hoch.":
    "Create a project, then upload its second-brain export (ZIP).",
  "Lege zuerst unter Divisions und Programs die Struktur an.":
    "Create the structure under Divisions and Programs first.",
  "Methode": "Method",
  "z. B. MACE Interviews Runde 1": "e.g. MACE Interviews Round 1",
  "z. B. User Interviews": "e.g. User Interviews",
  "inkl. hochgeladener Auswertung wirklich löschen?":
    "— delete it including its uploaded analysis?",

  // project detail
  "Kontext": "Context",
  "Notizen": "Notes",
  "Teilen": "Share",
  "Elemente": "Elements",
  "Projekt nicht gefunden": "Project not found",
  "Es wurde möglicherweise gelöscht.": "It may have been deleted.",
  "← Zurück zu Projects": "← Back to projects",
  "Keine": "No",
  "Lege manuell ein Element an oder lade einen Export hoch.":
    "Create an element manually or upload an export.",
  "ausgeblendet": "hidden",
  "Einblenden": "Show again",
  "Vault-Root": "Vault root",
  "Datei": "file",
  "Dateien": "files",

  // note card / drawer
  "Manuell": "Manual",
  "Bearbeitet": "Edited",
  "Zitate": "quotes",
  "Interviewquellen": "interview sources",
  "Evidenz prüfen": "Review evidence",
  "Pattern-Evidenz": "Pattern evidence",
  "Pattern-Evidenz prüfen": "Review pattern evidence",
  "Zitate ohne Interviewquelle": "quotes without an interview source",
  "Ein Positive Pattern braucht direkte Belege von mindestens zwei verschiedenen Interviewpersonen. Jedes Zitat muss dasselbe positive Muster stützen; problemorientierte Aussagen gehören zu einem Pain Point.":
    "A positive pattern needs direct evidence from at least two different interview participants. Every quote must support the same positive pattern; problem-focused statements belong to a pain point.",
  "Verknüpfungen": "links",
  "Bearbeiten": "Edit",
  "Ausblenden": "Hide",
  "Löschen": "Delete",
  "Öffnen →": "Open →",
  "Methodik": "Method",
  "Rohtranskript": "Raw transcript",
  "Notiz": "Note",
  "Verlinkt von": "Linked from",
  "Kategorie": "Category",
  "Kategorie:": "Category:",
  "Segment:": "Segment:",
  "Status:": "Status:",

  // levels / badges
  "Kritisch": "Critical",
  "Hoch": "High",
  "Mittel": "Medium",
  "Niedrig": "Low",
  "Funktional": "Functional",
  "Sozial": "Social",
  "Latent": "Latent",
  "Emotional": "Emotional",

  // overview
  "rangiert nach Severity × Confidence × Evidenz":
    "ranked by severity × confidence × evidence",
  "Pain Points nach Severity": "Pain points by severity",
  "Themes nach Confidence": "Themes by confidence",
  "Needs nach Kategorie": "Needs by category",
  "Risiko-Matrix: Severity × Confidence": "Risk matrix: severity × confidence",
  "Pain Points — oben links = dringend UND gut belegt.":
    "Pain points — top left = urgent AND well-evidenced.",
  "Themes & abgeleitete Evidenz": "Themes & derived evidence",
  "Recommendations & Nachvollziehbarkeit": "Recommendations & traceability",
  "Jede Empfehlung ist an genau ein Anker-Insight gebunden — Evidenz bleibt bis zum Originalzitat rückverfolgbar.":
    "Every recommendation anchors to exactly one insight — evidence stays traceable down to the original quote.",
  "Anker": "Anchor",
  "Offene Fragen & Research Gaps": "Open questions & research gaps",
  "Ausgeblendete verbergen": "Hide hidden ones",
  "ausgeblendet — anzeigen": "hidden — show",
  "Frage wieder einblenden": "Show question again",
  "Frage ausblenden": "Hide question",
  "Evidenz aus {n} Interview(s)": "Evidence from {n} interview(s)",

  // context tab
  "Ganz oben": "Very top",
  "Nach Shortlist": "After shortlist",
  "Nach Themes": "After themes",
  "Ganz unten": "Very bottom",
  "Hypothesen": "Hypotheses",
  "Relevante Links": "Related links",
  "Was soll dieses Research beantworten? Erscheint oben im Report & Share.":
    "What should this research answer? Shown at the top of report & share.",
  "Annahmen, die das Research prüfen soll.":
    "Assumptions the research should test.",
  "Relevante Dokumente, Prototypen, Miro-Boards …":
    "Relevant documents, prototypes, Miro boards …",
  "Neues Research Goal…": "New research goal…",
  "Neue Hypothese…": "New hypothesis…",
  "Bezeichnung (z. B. Prototyp)": "Label (e.g. prototype)",
  "Zusätzliche Report-Inhalte": "Additional report content",
  "Freie Inhalte für Report & Share — mit Position und Rich-Text (Überschriften, Fett, Kursiv, Listen …).":
    "Free-form content for report & share — with placement and rich text (headings, bold, italics, lists …).",
  "Noch keine zusätzlichen Inhalte.": "No additional content yet.",
  "Überschrift": "Heading",
  "Inhalt… (Überschriften, Fett, Kursiv, Listen über die Leiste oben)":
    "Content… (headings, bold, italics, lists via the toolbar above)",
  "Block entfernen": "Remove block",
  "Entfernen": "Remove",
  "Link entfernen": "Remove link",

  // rich text toolbar
  "Unterüberschrift": "Subheading",
  "Fett": "Bold",
  "Kursiv": "Italic",
  "Unterstrichen": "Underline",
  "Aufzählung": "Bullet list",
  "Nummerierte Liste": "Numbered list",
  "Zitat": "Quote",

  // insights & recs tab
  "Synthese über mehrere Themes hinweg — das „Warum“ hinter den Mustern. Ein Insight fasst zusammen, was die Evidenz aus mehreren Interviews strukturell bedeutet.":
    "Synthesis across several themes — the “why” behind the patterns. An insight sums up what the evidence from several interviews means structurally.",
  "Konkrete Handlungsempfehlungen — jede ist an genau ein Anker-Insight verankert, damit die Begründung bis zum Originalzitat nachvollziehbar bleibt.":
    "Concrete recommendations for action — each anchors to exactly one insight so the reasoning stays traceable down to the original quote.",

  // notes tab
  "Aufgaben, die aus der Auswertung folgen — für das ganze Team sichtbar.":
    "Tasks that follow from the analysis — visible to the whole team.",
  "Neuen Next Step hinzufügen…": "Add a next step…",
  "Noch keine Next Steps.": "No next steps yet.",
  "Als offen markieren": "Mark as open",
  "Als erledigt markieren": "Mark as done",
  "Freitext — speichert automatisch.": "Free text — saves automatically.",
  "Gespeichert": "Saved",
  "Speichert…": "Saving…",
  "Beobachtungen, Entscheidungen, Kontext für das Team…":
    "Observations, decisions, context for the team…",

  // requirements tab
  "Research Requirements": "Research requirements",
  "Aus dem Research-Upload eingelesene Anforderungsdokumente.":
    "Requirement documents imported from the research upload.",
  "Working File für das PDM-Team: Anforderungen aus der Research ableiten, priorisieren und abhaken. Einträge lassen sich aus Recommendations & Needs vorbefüllen.":
    "Working file for the PDM team: derive requirements from research, prioritise and check them off. Entries can be pre-filled from recommendations & needs.",
  "Aus Recommendations & Needs befüllen": "Fill from recommendations & needs",
  "Neue Anforderung hinzufügen…": "Add a requirement…",
  "Noch keine Anforderungen — manuell hinzufügen oder aus Recommendations & Needs befüllen.":
    "No requirements yet — add manually or fill from recommendations & needs.",

  // upload zone
  "Bitte eine ZIP-Datei hochladen (Second-Brain-Export).":
    "Please upload a ZIP file (second-brain export).",
  "Wird ausgewertet…": "Analysing…",
  "Second-Brain-Export (ZIP) hochladen": "Upload second-brain export (ZIP)",
  "Drag & drop oder klicken. Der Obsidian-Vault wird direkt im Browser geparst — Interviews, Themes, Pain Points, Needs, Insights, Recommendations, Personas.":
    "Drag & drop or click. The Obsidian vault is parsed right in the browser — interviews, themes, pain points, needs, insights, recommendations, personas.",

  // note editor
  "{x} bearbeiten": "Edit {x}",
  "{x} anlegen": "Create {x}",
  "Titel": "Title",
  "Titel des {x}": "Title of the {x}",
  "+ Zitat": "+ Quote",
  "Wörtliches Zitat…": "Verbatim quote…",
  "Quelle (z. B. INT-001)": "Source (e.g. INT-001)",
  "Zitat entfernen": "Remove quote",
  "Noch keine Zitate.": "No quotes yet.",
  "Abbrechen": "Cancel",
  "Speichern": "Save",
  "Bearbeitung verwerfen": "Discard edit",
  "Zugehöriges Theme": "Related theme",
  "Beschreibung": "Description",
  "Definition": "Definition",
  "Was beschreibt dieses Theme?": "What does this theme describe?",
  "Empfehlung": "Recommendation",
  "Erwarteter Effekt": "Expected effect",
  "Risiko": "Risk",
  "Anker-Insight": "Anchor insight",
  "Ziele": "Goals",
  "Warum es funktioniert": "Why it works",
  "Risiko bei Wegfall": "Risk if removed",

  // upload diff modal
  "Änderungen übernehmen": "Apply changes",
  "Der neue Export wurde mit dem aktuellen Stand abgeglichen. Manuell angelegte Elemente bleiben immer erhalten, deine Bearbeitungen werden beibehalten — nur bei Konflikten entscheidest du.":
    "The new export was compared with the current state. Manually created elements are always kept, your edits are preserved — you only decide on conflicts.",
  "Deine Version behalten": "Keep your version",
  "Neue Version übernehmen": "Take the new version",
  "Neu im Upload": "New in upload",
  "Deine Bearbeitung bleibt": "Your edit is kept",
  "Manuell — bleibt erhalten": "Manual — always kept",
  "Upstream entfernt — als manuell behalten": "Removed upstream — kept as manual",
  "Konflikte": "Conflicts",
  "neu": "new",
  "Bearbeitungen behalten": "edits kept",
  "manuell": "manual",
  "upstream entfernt": "removed upstream",
  "Übersicht": "Overview",
  "Upload übernehmen": "Apply upload",

  // share modal
  "Read-only-Link teilen": "Share read-only link",
  "Wer den Link hat, sieht die Ergebnisse {scope} — schreibgeschützt, mit eigener Suche, ohne Zugriff auf den Rest des Hubs. Links lassen sich jederzeit widerrufen.":
    "Anyone with the link sees the results {scope} — read-only, with its own search, and no access to the rest of the hub. Links can be revoked at any time.",
  "dieses Projekts": "of this project",
  "dieses Programs (inkl. aller Projekte)": "of this program (incl. all projects)",
  "dieser Division (inkl. aller Programs & Projekte)":
    "of this division (incl. all programs & projects)",
  "Noch kein Link erstellt.": "No link created yet.",
  "Kopiert ✓": "Copied ✓",
  "Kopieren": "Copy",
  "Link widerrufen": "Revoke link",
  "Offene Fragen & Research Gaps nicht mit teilen":
    "Don't share open questions & research gaps",
  "Offene Fragen & Research Gaps werden nicht geteilt":
    "Open questions & research gaps are not shared",
  "ohne offene Fragen": "no open questions",
  "+ Neuen Link erstellen (wird kopiert)": "+ Create new link (copied)",

  // search
  "Suchen… (z. B. „Appendix ABC“, „Timeline“, „EUDAMED“)":
    "Search… (e.g. “Appendix ABC”, “Timeline”, “EUDAMED”)",
  "Alle Typen": "All types",
  "Alle Projekte": "All projects",
  "Vorkommen": "occurrences",
  "Projekt": "project",
  "Projekte": "projects",
  "Suchbegriff eingeben": "Enter a search term",
  "Mindestens 2 Zeichen. Durchsucht Titel, Inhalte und Zitate — mit Statistik, wie oft und wo der Begriff vorkommt.":
    "At least 2 characters. Searches titles, content and quotes — with statistics on how often and where the term appears.",
  "Anderen Suchbegriff oder Filter probieren.": "Try a different term or filter.",
  "Volltextsuche über alle Projekte — mit Statistik: wie oft, in welchen Projekten und Notiz-Typen der Begriff vorkommt.":
    "Full-text search across all projects — with statistics: how often, and in which projects and note types the term appears.",
  "Noch keine Inhalte": "No content yet",
  "Lade zuerst in einem Projekt einen Second-Brain-Export (ZIP) hoch.":
    "Upload a second-brain export (ZIP) in a project first.",
  "Suche": "Search",

  // program / division detail
  "Konsolidierte Sicht über": "Consolidated view across",
  "Projekte (chronologisch)": "Projects (chronological)",
  "Noch kein Upload": "No upload yet",
  "Pain Points nach Severity (alle Projekte)": "Pain points by severity (all projects)",
  "Needs nach Kategorie (alle Projekte)": "Needs by category (all projects)",
  "Offene Fragen & Research Gaps im Programm":
    "Open questions & research gaps in this program",
  "Themes im Programm": "Themes in this program",
  "Über Projekte hinweg zusammengeführt (per Slug/Titel). Punkte zeigen die Confidence-Entwicklung je Runde — Muster sollten sich mit neuer Evidenz erhärten.":
    "Merged across projects (by slug/title). Dots show confidence development per round — patterns should harden with new evidence.",
  "Confidence je Projekt (chronologisch)": "Confidence per project (chronological)",
  "Noch kein Theme taucht in mehreren Projekten auf — bei künftigen Uploads werden wiederkehrende Muster hier zusammengeführt.":
    "No theme appears in more than one project yet — future uploads merge recurring patterns here.",
  "Pain-Point-Shortlist des Programms": "Program pain-point shortlist",
  "Top 10 über alle Projekte, rangiert nach Severity × Confidence × Evidenz":
    "Top 10 across all projects, ranked by severity × confidence × evidence",
  "Noch keine Projekte in diesem Programm": "No projects in this program yet",
  "Lege unter Projects ein Projekt an und wähle dieses Programm.":
    "Create a project under Projects and choose this program.",
  "Program nicht gefunden": "Program not found",
  "← Zurück zu Programs": "← Back to programs",
  "Division nicht gefunden": "Division not found",
  "← Zurück zu Divisions": "← Back to divisions",
  "Noch keine Programs in dieser Division": "No programs in this division yet",
  "Pain Points nach Severity (Division)": "Pain points by severity (division)",
  "Top-Themes": "Top themes",

  // share view
  "Noch keine Auswertung": "No analysis yet",
  "Für dieses Projekt wurde noch kein Export hochgeladen.":
    "No export has been uploaded for this project yet.",
  "Pain-Point-Shortlist": "Pain-point shortlist",
  "Top-Pain-Points über alle enthaltenen Projekte, rangiert nach Severity × Confidence × Evidenz":
    "Top pain points across all included projects, ranked by severity × confidence × evidence",
  "Lade geteilte Ergebnisse…": "Loading shared results…",
  "Link ungültig oder widerrufen": "Link invalid or revoked",
  "Dieser Freigabe-Link existiert nicht mehr. Bitte eine neue Freigabe anfordern.":
    "This share link no longer exists. Please request a new one.",
  "geteilte, schreibgeschützte Ansicht": "shared, read-only view",

  // distribution labels (translated after capitalisation)
  "Geplant": "Planned",
  "In Analyse": "In analysis",
  "Abgeschlossen": "Completed",

  // report
  "Goals & Hypothesen": "Goals & hypotheses",
  "Pain Points (alle)": "Pain points (all)",
  "Offene Fragen": "Open questions",
  "Next Steps & Notizen": "Next steps & notes",
  "← Zurück": "← Back",
  "Zurück": "Back",
  "Als PDF speichern / Drucken": "Save as PDF / Print",
  "Projekt nicht gefunden.": "Project not found.",
  "Export vom": "Export from",
  "Noch kein Second-Brain-Export hochgeladen.": "No second-brain export uploaded yet.",
  "Rangiert nach Severity × Confidence × Evidenz":
    "Ranked by severity × confidence × evidence",
  "Anker-Insight:": "Anchor insight:",
  "Generiert am": "Generated on",
  "programmatische Auswertung ohne KI": "programmatic analysis without AI",
};

// English UI string -> German (for chrome that was written in English)
const DE: Record<string, string> = {
  // nav / shell
  "Search": "Suche",
  "Shared · live": "Geteilt · live",

  // status
  "Planned": "Geplant",
  "In analysis": "In Analyse",
  "Completed": "Abgeschlossen",

  // dashboard
  "View projects": "Projekte ansehen",
  "Recent projects": "Zuletzt angelegte Projekte",
  "Projects by division": "Projekte nach Division",
  "Research files": "Research-Dateien",
  "Findings extracted": "Extrahierte Findings",
  "Findings": "Findings",

  // counters / small words
  "files": "Dateien",
  "file": "Datei",
  "participants": "Teilnehmer",
  "Participants": "Teilnehmer",
  "program": "Programm",
  "programs": "Programme",
  "project": "Projekt",
  "projects": "Projekte",
  "Projects": "Projekte",
  "Programs": "Programme",
  "Divisions": "Divisionen",
  "Interviews": "Interviews",

  // list pages
  "Filter divisions…": "Divisions filtern…",
  "Filter programs…": "Programs filtern…",
  "Filter projects…": "Projekte filtern…",
  "Organise research into divisions → programs → projects.":
    "Research in Divisions → Programs → Projects organisieren.",
  "Group related projects and see their insights consolidated.":
    "Verwandte Projekte bündeln und ihre Erkenntnisse konsolidiert sehen.",
  "Every research project, its master data and its uploaded second-brain export.":
    "Jedes Research-Projekt, seine Stammdaten und der hochgeladene Second-Brain-Export.",
  "+ New division": "+ Neue Division",
  "+ New program": "+ Neues Programm",
  "+ New project": "+ Neues Projekt",
  "New division": "Neue Division",
  "Edit division": "Division bearbeiten",
  "Delete division": "Division löschen",
  "New program": "Neues Programm",
  "Edit program": "Programm bearbeiten",
  "Delete program": "Programm löschen",
  "New project": "Neues Projekt",
  "Edit project": "Projekt bearbeiten",
  "Delete project": "Projekt löschen",
  "No description.": "Keine Beschreibung.",
  "No upload yet": "Noch kein Upload",
  "Open": "Öffnen",
  "Cancel": "Abbrechen",
  "Save": "Speichern",
  "Delete": "Löschen",
  "Add": "Hinzufügen",

  // project detail
  "Overview": "Übersicht",
  "Files": "Dateien",
  "Method": "Methode",
  "Last upload": "Letzter Upload",
  "Elements": "Elemente",

  // overview / shortlist
  "Priority shortlist": "Priority-Shortlist",
};

interface LangCtxValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (s: string) => string;
  /** t with {placeholder} substitution */
  tf: (s: string, vars: Record<string, string | number>) => string;
  /** date locale for toLocaleDateString */
  dateLocale: string;
}

const LangCtx = createContext<LangCtxValue>({
  lang: "de",
  setLang: () => {},
  t: (s) => s,
  tf: (s) => s,
  dateLocale: "de-DE",
});

const STORAGE_KEY = "hub-lang";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("de");

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "en") setLangState("en");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage unavailable */
    }
  };

  const t = (s: string) => (lang === "en" ? (EN[s] ?? s) : (DE[s] ?? s));
  const tf = (s: string, vars: Record<string, string | number>) => {
    let out = t(s);
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v));
    }
    return out;
  };

  return (
    <LangCtx.Provider
      value={{ lang, setLang, t, tf, dateLocale: lang === "en" ? "en-GB" : "de-DE" }}
    >
      {children}
    </LangCtx.Provider>
  );
}

export function useLang() {
  return useContext(LangCtx);
}

/** small DE | EN segmented switch */
export function LangToggle({ compact }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  const btn = (l: Lang, label: string) => (
    <button
      type="button"
      onClick={() => setLang(l)}
      aria-pressed={lang === l}
      className={`cursor-pointer rounded-md px-2 py-1 text-xs font-bold transition-colors ${
        lang === l
          ? "bg-white text-[#0057b8] shadow-sm ring-1 ring-neutral-200"
          : "text-neutral-400 hover:text-neutral-600"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div
      className={`flex items-center gap-0.5 rounded-lg bg-neutral-100 p-0.5 ${compact ? "" : "w-fit"}`}
      role="group"
      aria-label="Sprache / Language"
    >
      {btn("de", "DE")}
      {btn("en", "EN")}
    </div>
  );
}
