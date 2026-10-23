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

## Abschluss: Claudian-Update

Nach jeder erledigten Implementierungsaufgabe dieses Format mit tatsächlichen Ergebnissen ausgeben; es ersetzt keine unabhängige Prüfung. In Brainstorming-Gesprächen normal und knapp antworten. Eigene und unabhängige Prüfung unterscheiden; verbleibende Befunde und nicht ausführbare Prüfungen sowie Version angeben:
```text
## Claudian-Update – [Datum]

### Implementiert
- [Was gebaut / geändert wurde]

### Getestet
- [Was getestet wurde und Ergebnis]

### Offen / Nächster Block
- [Was als nächstes kommt]

### Technische Notizen
- [Wichtige Entscheidungen, neue Pakete, IDs etc.]
```
