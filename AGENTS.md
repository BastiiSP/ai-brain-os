# AI Brain OS – Anwendungsanweisungen

Stand: 21.10.2026. Geltungsbereich: `ai-brain/ai-brain-os/`.
Die gemeinsamen Regeln einschließlich KI-Rollen stehen im übergeordneten `../AGENTS.md` und `../CLAUDE.md`; beide bei Session-Start lesen. Dieses Paar ergänzt nur den Anwendungskontext.

## Entwicklungsstand und Ziel

- Lieferstand 1 ist umgesetzt und am 21.10.2026 von KI A unabhängig abgenommen (Commit `b9a96a3`, vor Umschreiben der Commit-Adresse `5df69a4`): lesende lokale Web-Anwendung für das Gedächtnis. Start mit `npm start`, Bedienung und Prüfbefehle in `README.md`. Weitere Lieferstände befinden sich in Anforderungsklärung mit Basti.
- AI Brain OS soll die anpassbare interaktive Ansicht und Bedienoberfläche des vorhandenen Gedächtnisses werden. Bestätigt sind Suche, Verknüpfungen relevanter Dateien, visuelle Aufbereitung, persönliches Gedächtnis, Denkpartner und Arbeitszentrale.
- Dokumente und Links sollen einfach einbringbar sein; relevantes Wissen später automatisch extrahieren, einordnen und mit vorhandenen Inhalten verknüpfen. Ein gezielter Wissenschat ist vorgesehen.
- Für Lieferstand 1 von KI A gewählt: lokale Web-Anwendung mit Node.js-LTS und TypeScript, Server nur an `127.0.0.1`, Index nur im Arbeitsspeicher; Begründung in der Projektnotiz. Oberfläche, Verarbeitungsablauf und Architektur späterer Lieferstände sowie die Anbindung von ChatGPT, Codex, Claude und Claude Code sind offen. Keine eingerichtete Verbindung unterstellen.
- Bestätigte Anforderungen, Vorschläge und offene Entscheidungen getrennt führen. Maßgeblicher Detailkontext und Backlog: `../ai-brain-gedaechtnis/02 Projekte/AI Brain OS.md`.

## Zuständigkeiten und Dateien

- Anwendung und spätere Build-/Testdateien bleiben hier. Das bestehende Gedächtnis liegt unter `/Users/sebastianprehmus/Workspace/ai-brain/ai-brain-gedaechtnis`.
- Wissen, Anhänge, Projektnotiz und Daily Notes verbleiben im Gedächtnis; dessen Anweisungen vor dortigen Änderungen lesen. Keine zweite Wissensablage im Anwendungscode anlegen.
- Eigenes Git-Repository nur für diese Anwendung, Branch `main`, Remote **öffentlich** `https://github.com/BastiiSP/ai-brain-os` (seit 21.10.2026). Das Gedächtnis-Repository und seine Historie bleiben eigenständig und privat.
- Öffentliches Repository: Testdaten erfunden; keine Inhalte aus dem Gedächtnis, keine personen- oder kundenbezogenen Daten, keine Zugangsdaten oder lokalen Konfigurationen (`config.local.json` bleibt ignoriert). KI A prüft den Diff darauf vor jedem Push. Commits verwenden die repo-lokal eingestellte GitHub-noreply-Adresse, nicht Bastis Arbeitsadresse. Gepusht wird erst nach abgeschlossener Prüfung durch KI A.

## Entwicklungsaufträge, Prüfung und Übergabe

Bei Prompt-Anfragen gilt das gemeinsame Verfahren im Hauptordner mit dem lokalen Skill `aufgabenprompt`. Aktuelle Modell-/Effort-Wahl von technischer Rollenverteilung unterscheiden; die zwei unabhängigen KI-Rollen werden durch eine Empfehlung nicht eingerichtet.

- In jedem Entwicklungsauftrag die im Hauptordner geregelten Rollen KI A (Planung und unabhängige Prüfung) und KI B (Umsetzung und eigene Prüfung) erkennbar benennen. Empfohlen: Claude Code und Codex. Bisher startet Claude Code Codex nicht interaktiv per `codex exec`; eine automatische Verbindung beider Systeme ist nicht eingerichtet.
- Codex-spezifisch: Die Codex-Sandbox kann nicht in `.git` schreiben. KI A committet den übergebenen Stand dann unverändert, nennt Codex als Umsetzer in der Commit-Nachricht und prüft genau diesen Commit.
- Vor Umsetzung Plan auf Widersprüche und Machbarkeit prüfen und vorhandenes projektbezogenes Tooling berücksichtigen. Keine gleichzeitigen Änderungen derselben Dateien durch verschiedene Instanzen.
- Übergabe nennt Ziel, Kontext, Grenzen, Erfolgskriterien, tatsächliche Änderungen, betroffene Dateien, reproduzierbare Prüfschritte und Ergebnisse, verbleibende Befunde sowie den konkreten Versionsstand mit Commit-ID und gegebenenfalls uncommittiertem Diff.
- KI A prüft Code, Prüfungen und sichtbare Oberfläche selbst am übergebenen Stand. Wesentliche Befunde behebt KI B; KI A prüft erneut. Nicht ausführbare Prüfungen offen lassen; die eigene Prüfung ersetzt keine unabhängige Abnahme.

## Lieferstände

Lieferstand 1 ist umgesetzt und abgenommen; Erfolgskriterien, Prüfergebnis und optionale Verbesserungen stehen in der Projektnotiz. Lieferstände 2 und 3 sind noch von KI A zu konkretisieren und mit Erfolgskriterien zu versehen:

1. Umgesetzt: Auf Bastis Mac lokal nutzbare Ansicht: bestehendes Gedächtnis durchsuchen, Notizen lesen und vorhandenen Links folgen. Externe Dateiänderungen sind nach Aktualisierung sichtbar. Erste Wissensanbindung ausschließlich lesend; Originale erhalten.
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
