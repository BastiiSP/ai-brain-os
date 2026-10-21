# AI Brain OS – Anwendungsanweisungen

Stand: 21.10.2026. Geltungsbereich: `ai-brain/ai-brain-os/`.
Die gemeinsamen Regeln einschließlich KI-Rollen stehen im übergeordneten `../AGENTS.md` und `../CLAUDE.md`; beide bei Session-Start lesen. Dieses Paar ergänzt nur den Anwendungskontext.

## Entwicklungsstand und Ziel

- Aktuell Brainstorming und Anforderungsklärung mit Basti; Anwendung noch nicht implementiert. Dieser Ordner enthält Projektanweisungen, noch keinen Anwendungscode und kein eigenes Git-Repository.
- AI Brain OS soll die anpassbare interaktive Ansicht und Bedienoberfläche des vorhandenen Gedächtnisses werden. Bestätigt sind Suche, Verknüpfungen relevanter Dateien, visuelle Aufbereitung, persönliches Gedächtnis, Denkpartner und Arbeitszentrale.
- Dokumente und Links sollen einfach einbringbar sein; relevantes Wissen später automatisch extrahieren, einordnen und mit vorhandenen Inhalten verknüpfen. Ein gezielter Wissenschat ist vorgesehen.
- Konkrete Oberfläche, Verarbeitungsablauf, Stack, Architektur und Anbindung von ChatGPT, Codex, Claude und Claude Code sind offen. Keine technische Lösung oder eingerichtete Verbindung unterstellen.
- Bestätigte Anforderungen, Vorschläge und offene Entscheidungen getrennt führen. Maßgeblicher Detailkontext und Backlog: `../ai-brain-gedaechtnis/02 Projekte/AI Brain OS.md`.

## Zuständigkeiten und Dateien

- Anwendung und spätere Build-/Testdateien bleiben hier. Das bestehende Gedächtnis liegt unter `/Users/sebastianprehmus/Workspace/ai-brain/ai-brain-gedaechtnis`.
- Wissen, Anhänge, Projektnotiz und Daily Notes verbleiben im Gedächtnis; dessen Anweisungen vor dortigen Änderungen lesen. Keine zweite Wissensablage im Anwendungscode anlegen.
- Bei späterer Einrichtung ein eigenes Git-Repository nur für diese Anwendung verwenden. Das Gedächtnis-Repository und seine Historie bleiben eigenständig; noch kein GitHub-Repository der Anwendung angelegt.

## Entwicklungsaufträge, Prüfung und Übergabe

Bei Prompt-Anfragen gilt das gemeinsame Verfahren im Hauptordner mit dem lokalen Skill `aufgabenprompt`. Aktuelle Modell-/Effort-Wahl von technischer Rollenverteilung unterscheiden; die zwei unabhängigen KI-Rollen werden durch eine Empfehlung nicht eingerichtet.

- In jedem Entwicklungsauftrag die im Hauptordner geregelten Rollen KI A (Planung und unabhängige Prüfung) und KI B (Umsetzung und eigene Prüfung) erkennbar benennen. Empfohlen: Claude Code und Codex; Zusammenarbeit noch einzurichten.
- Vor Umsetzung Plan auf Widersprüche und Machbarkeit prüfen und vorhandenes projektbezogenes Tooling berücksichtigen. Keine gleichzeitigen Änderungen derselben Dateien durch verschiedene Instanzen.
- Übergabe nennt Ziel, Kontext, Grenzen, Erfolgskriterien, tatsächliche Änderungen, betroffene Dateien, reproduzierbare Prüfschritte und Ergebnisse, verbleibende Befunde sowie den konkreten Versionsstand. Sobald Git eingerichtet ist: Commit-ID und gegebenenfalls uncommittierten Diff angeben.
- KI A prüft Code, Prüfungen und sichtbare Oberfläche selbst am übergebenen Stand. Wesentliche Befunde behebt KI B; KI A prüft erneut. Nicht ausführbare Prüfungen offen lassen; die eigene Prüfung ersetzt keine unabhängige Abnahme.

## Vorgeschlagene Lieferstände

Noch von KI A zu konkretisieren und mit Erfolgskriterien zu versehen:

1. Auf Bastis Mac lokal nutzbare Ansicht: bestehendes Gedächtnis durchsuchen, Notizen lesen und vorhandenen Links folgen. Externe Dateiänderungen sind nach Aktualisierung sichtbar. Erste Wissensanbindung ausschließlich lesend; Originale erhalten.
2. Nachvollziehbarer Import von Dokumenten und Links einschließlich Herkunft, Wiederholungen und Fehlerbehandlung.
3. Gezielter Wissenschat mit Quellen und bewusster Übernahme von Erkenntnissen.

## Dieses Dateipaar pflegen

Vor Änderungen AGENTS.md und CLAUDE.md hier lesen und vergleichen, unterschiedliche Regeln zusammenführen. Änderungen unmittelbar in beiden Dateien durchführen und anschließend bytegenaue Übereinstimmung prüfen. Werkzeugspezifisches ausdrücklich kennzeichnen. Gemeinsame Regeln im Hauptordner pflegen; ausführliche Entwicklungshistorie in der Projektnotiz.

## Abschluss nach Implementierungsaufgaben

Das Claudian-Update verwenden; in Brainstorming-Gesprächen normal und knapp antworten:

```text
## Claudian-Update – [Datum]

### Implementiert
- [Was gebaut / geändert wurde]

### Getestet
- [Prüfung und Ergebnis; eigene und unabhängige Prüfung unterscheiden]

### Offen / Nächster Block
- [Verbleibende Befunde, nicht ausführbare Prüfungen und nächste Schritte]

### Technische Notizen
- [Version, wichtige Entscheidungen, neue Pakete oder IDs]
```
