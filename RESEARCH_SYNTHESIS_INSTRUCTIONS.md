# Copilot Instructions: Research-Synthese

Nutze diese Regeln verbindlich, wenn du Interviewdaten in einen Research-Datenraum
überführst. Zielgruppe sind Produkt-, Design- und Fachkolleg:innen, die nicht an den
Interviews beteiligt waren.

## 1. Verständliche Sprache

- Schreibe klar, konkret und ohne unnötigen Fachjargon.
- Verwende kurze Sätze und jeweils nur eine Kernaussage pro Absatz.
- Erkläre Abkürzungen und Fachbegriffe bei der ersten Verwendung.
- Formuliere Titel so, dass sie ohne Ordner- oder Interviewkontext verständlich sind.
- Benenne Akteur, Situation und Auswirkung konkret statt abstrakter Sammelbegriffe.
- Behalte die Sprache des Projekts konsequent bei. Mische Deutsch und Englisch nicht.
- Trenne Beobachtung, Interpretation und Empfehlung sichtbar voneinander.
- Erfinde keine Aussagen, Zusammenhänge, Prioritäten oder Evidenz.

Vor dem Speichern: Lies jeden Eintrag aus Sicht einer fachfremden Person. Vereinfache
ihn, wenn er ohne Zusatzwissen nicht beim ersten Lesen verständlich ist.

## 2. Evidenz richtig zählen

- Zähle unterschiedliche Interviewpersonen, nicht die Anzahl der Zitate.
- Mehrere Zitate derselben Person sind eine Evidenzquelle.
- Hinterlege jede Evidenz mit einer anonymisierten Teilnehmer-ID, zum Beispiel
  `INT-003`.
- `interview_ids` enthält jede Teilnehmer-ID nur einmal.
- `evidence_count` entspricht der Anzahl unterschiedlicher Teilnehmer-IDs.
- Verwende nur Zitate, die die Aussage direkt und inhaltlich stützen.
- Ein plausibel klingendes, aber thematisch unpassendes Zitat darf nicht als Beleg
  verwendet werden.

## 3. Positive Pattern oder Pain Point

Erstelle ein **Positive Pattern** nur, wenn alle Bedingungen erfüllt sind:

1. Es beschreibt ein bestehendes Verhalten, einen Ablauf oder eine Lösung, die für
   die Beteiligten nachweislich gut funktioniert.
2. Mindestens zwei verschiedene Interviewpersonen belegen dasselbe Muster direkt.
3. Jedes zugeordnete Zitat bezieht sich auf genau dieses positive Muster.
4. Die Evidenz ist nicht überwiegend negativ, problemorientiert oder rein hypothetisch.

Sind diese Bedingungen nicht erfüllt:

- Negative Reibung, Fehler oder unerfüllte Erwartungen werden als **Pain Point**
  dokumentiert.
- Ein positiver Einzelhinweis wird als Beobachtung festgehalten, aber noch nicht als
  wiederkehrendes Pattern bezeichnet.
- Gemischte Evidenz wird getrennt: der funktionierende Anteil als möglicher positiver
  Hinweis, der problematische Anteil als Pain Point.

## 4. Qualitätsprüfung vor Ausgabe

Prüfe für jeden Eintrag:

- Ist der Titel ohne Kontext verständlich?
- Ist klar, was beobachtet wurde und welche Auswirkung es hat?
- Stützt jedes Zitat die Kernaussage direkt?
- Entspricht die Evidenzzahl den unterschiedlichen Interviewpersonen?
- Ist ein Positive Pattern wirklich positiv und wiederkehrend?
- Wurde Unsicherheit als niedrige Confidence kenntlich gemacht?

Wenn eine dieser Fragen nicht sicher mit Ja beantwortet werden kann, kennzeichne den
Eintrag zur manuellen Prüfung, statt Evidenz oder Sicherheit zu unterstellen.