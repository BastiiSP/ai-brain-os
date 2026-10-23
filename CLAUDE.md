# AI Brain OS – Anwendungsanweisungen

Lokale, anpassbare Wissensoberfläche mit Suche, Lesen, Verknüpfungen, 3D-Ansicht und Ordnernavigation. Anforderungen und freigegebene Lieferstände vor Änderungen bestätigen; geplante Assistenten-, Import- und Umbenennungsfunktionen nicht als implementiert darstellen.

## Grenzen und Betrieb

- Anwendungscode, Builds und Tests gehören hierher; vorhandene Wissensbestände nicht kopieren oder als zweite Ablage in den Code übernehmen.
- Der Server bindet ausschließlich an `127.0.0.1`. Der Suchindex bleibt im Arbeitsspeicher.
- Dokumentinhalte bleiben lesend; der gesondert freigegebene Schreibzugriff betrifft nur `.ai-brain-os/einstellungen.json` im ausgewählten Datenbestand. Weitere Schreibfunktionen brauchen einen ausdrücklichen Auftrag.
- Dokumente und Links später nachvollziehbar importieren; ein Assistent muss Quellen liefern. Tatsächliche Anbindungen und Berechtigungen prüfen.
- Dieses Repository ist öffentlich. Testdaten erfinden; keine privaten Dokumente, personenbezogenen oder kundenspezifischen Daten, Zugangsdaten oder lokalen Konfigurationen aufnehmen. `config.local.json` bleibt ignoriert.
- Getrennte Repositories und Historien erhalten; kein übergreifendes Repository anlegen. Nur auf Auftrag Repositories anlegen, umbenennen oder löschen.
- Vor jedem Push prüft KI A den tatsächlichen Diff auf private Inhalte. Repo-lokale GitHub-noreply-Adresse für Commits verwenden. Push erst nach KI-A-Prüfung und im autorisierten Umfang.

## Befehle

Node-Version gemäß `package.json`; `README.md` erklärt Einrichtung und Bedienung.
- `npm start` – bauen und lokal starten.
- `npm run typecheck` – TypeScript prüfen.
- `npm test` – Build und Tests.
- `npm run check:lsp` – vorhandene Sprachprüfung.
Prüfungen passend zur Änderung ausführen; Oberfläche bei sichtbaren Änderungen tatsächlich erproben.

## Entwicklungsaufträge und unabhängige Prüfung

- KI A verantwortet Ziel, Planung, Erfolgskriterien und unabhängige Prüfung; KI B Umsetzung und eigene Prüfung. Beide Rollen im Auftrag nennen. Empfohlen: Claude Code als KI A, Codex als KI B. Automatische Übergaben nicht unterstellen.
- Auftrag und Übergabe nennen Ziel, Kontext, Grenzen, überprüfbare Kriterien, Nachweise und konkreten Versionsstand (Commit und gegebenenfalls uncommittierten Diff).
- KI B prüft den Plan vor Umsetzung auf Machbarkeit und Widersprüche und berücksichtigt vorhandenes Tooling. Keine konkurrierenden Änderungen an denselben Dateien.
- KI A liest selbst den Code des übergebenen Stands, führt relevante Prüfungen aus und erprobt die Oberfläche. Erfolgsberichte ersetzen dies nicht.
- Relevante Fehler von optionalen Gestaltungswünschen trennen; KI B behebt wesentliche Befunde, KI A prüft erneut. Nach zwei bis drei erfolglosen Korrekturrunden Ursache und Plan neu bewerten.
- Abschluss erst bei erfüllten Kriterien, bestandenen angemessenen Prüfungen und ohne wesentliche offene Befunde; nicht ausführbare Prüfungen ausdrücklich offenlassen.
- **Codex-Delegation:** geltenden persönlichen Skill `codex-modellwahl` nutzen, Modell und Effort festlegen und nach Start prüfen.
- **Codex-Sandbox:** Falls `.git` nicht schreibbar ist, übernimmt KI A den unveränderten Stand, nennt Codex als Umsetzer und prüft den genauen Commit.
- Bei Prompt-Anfragen das vorhandene persönliche Aufgabenprompt-Verfahren nutzen, explizite Modellvorgaben erhalten und eine Empfehlung nicht mit eingerichteten Rollen verwechseln.

## Pflege dieses Dateipaars

Direkte aktuelle Nutzeraufträge haben Vorrang. Vor Regeländerungen beide Dateien lesen und Unterschiede inhaltlich zusammenführen; gültige Regeln erhalten. AGENTS.md und CLAUDE.md unmittelbar gemeinsam ändern und danach mit `cmp` auf Bytegleichheit prüfen. Anbieterunterschiede ausdrücklich kennzeichnen und in beiden Dateien führen. Codex lädt AGENTS.md; Claude Code lädt bei diesem Paar CLAUDE.md.

## Abschluss: AI Brain Update

Zum Abschluss, bei Übergabe oder Abbruch eines Arbeitsauftrags ein kompaktes, eigenständig verständliches Update in diesem Format ausgeben; auch bei Recherche, Planung und Dokumentation. Reine Zwischenfragen und Brainstorming normal und knapp beantworten. Projekt eindeutig benennen, Datum des Arbeitsstands in Europe/Berlin verwenden und tatsächliche Ergebnisse von Plänen unterscheiden. Alle vier Abschnitte beibehalten; fehlende Prüfungen und leere Angaben ehrlich kennzeichnen. Keine Zugangsdaten oder privaten absoluten Pfade aufnehmen. Das Update ersetzt keine unabhängige Prüfung und behauptet keine automatische Übertragung ins AI Brain.

Eigene und unabhängige Prüfung unterscheiden; verbleibende Befunde, nicht ausführbare Prüfungen und Version ausdrücklich ausweisen.

```text
## AI Brain Update – [Projekt] – [YYYY-MM-DD]

**Projektkennung:** [Workspace-Ordner oder Repository]
**Auftrag:** [Kurze Beschreibung]
**Stand:** [abgeschlossen / teilweise / blockiert; Version oder Commit, falls vorhanden]

### Ergebnis
- [Tatsächliche Änderungen oder Erkenntnisse; relevante Dateien/Artefakte]

### Prüfung
- [Durchgeführte Prüfung und Ergebnis; nicht geprüft bzw. unabhängige Abnahme offen ausdrücklich nennen]

### Offen / Nächster Schritt
- [Offene Punkte, Blocker und nächster Schritt; sonst keine]

### Hinweise
- [Bestätigte Entscheidungen von Vorschlägen trennen; fachliche/technische Besonderheiten, neue Pakete, IDs etc.; sonst keine]
```
