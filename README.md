# AI Brain OS · Lieferstand 1

Lokale, ausschließlich lesende Ansicht eines Markdown-Gedächtnisses: Ordnernavigation, Notizen mit Metadaten, Volltextsuche, Wikilinks und Markdown-Links, Rückverweise und Übersicht offener Verknüpfungen. Der Index lebt nur im Arbeitsspeicher. Keine Datenbank, keine Kopie des Gedächtnisses, kein externer Dienst.

## Einrichtung und Start

Voraussetzung: Node.js 24 LTS (ab 24.15), npm. Befehle im Anwendungsordner ausführen:

```bash
npm ci
npm start
```

`npm start` kompiliert TypeScript und startet die Anwendung unter **http://127.0.0.1:3210**. Die Bindung ist fest auf `127.0.0.1` beschränkt. Zum Beenden `Ctrl+C`. Kein Remote und keine globale Installation erforderlich. `localhost` ist wegen der strikten Host-Prüfung absichtlich kein alternativer Einstieg.

## Konfiguration

Ohne Konfigurationsdatei wird `../ai-brain-gedaechtnis` gelesen. Optional `config.example.json` nach `config.local.json` im Anwendungsordner kopieren und bearbeiten; diese Datei wird nicht versioniert. Nach Konfigurationsänderungen neu starten.

| Feld | Bedeutung |
| --- | --- |
| `root` | Gedächtniswurzel, absolut oder relativ zum Anwendungsordner |
| `port` | Port 1024–65535, Standard 3210; Host bleibt unveränderlich 127.0.0.1 |
| `exclude` | Zusätzliche vollständige relative Datei-/Ordnerpfade, keine Globs; Ordnerausschlüsse gelten rekursiv |
| `maxNoteBytes` | Grenze je Notiz, Standard 2 MiB; konfigurierbar von 1 KiB bis 16 MiB |

`00 Kontext/Tokens & Zugänge.md` ist immer ausgeschlossen. Ausschlüsse gelten unabhängig von Großschreibung und Unicode-Normalform. Alle Dateien und Ordner mit führendem Punkt in einem Pfadsegment werden ausgelassen. Symbolische Links werden grundsätzlich nicht verfolgt, auch innerhalb der Wurzel; die Startseite zeigt dazu Hinweise. Diese Regeln gelten für Navigation, Suche, Linkziele und direkte Dateiabrufe.

## Nutzung

- Links einen Ordner aufklappen oder „Ordner öffnen“ wählen; Notizen und Anhänge haben eigene URLs.
- Suche mit Eingabetaste oder „Suchen“ auslösen. Durchsucht Titel, Pfad, Text und Frontmatter; Titeltreffer stehen zuerst, Ergebnisse enthalten Textausschnitte.
- „Aktualisieren“ liest den gesamten Bestand neu. Die aktuelle Ansicht wird erneut geladen, gelöschte Notizen erhalten eine verständliche Meldung. Zeitpunkt und Dauer stehen oben. Es gibt keine automatische Live-Aktualisierung.
- Rückverweise stehen unter einer Notiz. „Offene Verknüpfungen“ zeigt nicht aufgelöste und mehrdeutige Verweise. Mehrdeutige Ziele müssen ausgewählt werden; Vorschläge sind als „Möglicherweise gemeint“ markiert.
- Zurück/Vor im Browser navigiert zwischen Ansichten. Überschriftenanker scrollen zum Ziel; fehlt die Überschrift, erscheint ein Hinweis. Blockanker öffnen die Notiz.
- Externe Links sind markiert und öffnen separat. Externe Bilder werden als Link angezeigt; beim Lesen werden keine externen Bilder geladen.

## Linkvertrag

NFC-Normalisierung, Groß-/Kleinschreibung ignoriert, `\|` entspricht `|`. Alias nach `|` ist Anzeigetext, `#` trennt Anker. Codeblöcke und Inline-Code werden nicht als Links ausgewertet.

Die erste passende Stufe entscheidet: Pfad ab Wurzel (optional `.md`), relativ zum Quellordner, eindeutiger Pfad-Suffix, eindeutiger Dateiname bei Zielen ohne `/`, danach Ordner (Wurzel oder relativ). Mehrere Treffer derselben Stufe führen zur Auswahl, nicht zum Weiterprobieren. Nicht aufgelöste alte Pfade können gleichnamige sichtbare Dateien als Vorschlag anbieten. Explizit versteckte/ausgeschlossene Ziele liefern auch keine Vorschläge. Markdown-Links verwenden dieselben Stufen; Prozentkodierung wird einmal dekodiert. Aufgelöste eindeutige Links erzeugen Rückverweise; mehrdeutige Links und Vorschläge nicht.

Notiz-Embeds erscheinen als Links, Bild-Embeds werden angezeigt. Überschriften-IDs basieren auf sichtbarem Text in Kleinschreibung/NFC mit Bindestrichen statt Leerzeichen; wiederholte Überschriften erhalten Nummern. Obsidian-spezifische Blockanker, Bases, Dataview und Notiz-Transklusion sind nicht implementiert. Callouts erscheinen als Zitat mit Typbezeichnung; Aufgabenlisten als nicht editierbare Kästchen.

## Prüfung

```bash
npm run typecheck
npm test
npm run check:lsp
npm audit
```

Tests erzeugen und entfernen ihr eigenes Gedächtnis unter `.test-work/`. Sie lesen **nie** das reale Gedächtnis. Die 14 Prüfgruppen prüfen Dateiliste, Linkformen und Stufen, NFC, Metadaten, Suche, externe Änderungen, Unverändertheit, Traversal, Symlinks, Ausschlüsse, HTML, HTTP-Schutz und alle E9-Fehlerfälle. Server-Requests laufen direkt über den Fetch-Handler, ohne Port. Der TypeScript-7-LSP wird separat über stdio für alle TypeScript-Dateien abgefragt. Die Meldung `context canceled` beim regulären LSP-Shutdown stammt vom Language Server; maßgeblich sind Diagnosen und Exitcode.

Ein optionaler **rein lesender** Kurztest gegen den konfigurierten Bestand ist ausdrücklich getrennt:

```bash
npm run build
node scripts/read-only-smoke.mjs
```

Er hält Prüfsummen und Änderungszeiten inklusive versteckter Dateien nur im Speicher, vergleicht die sichtbare Dateiliste unabhängig, misst Suche/Einlesen und prüft unveränderten Git-Status mit deaktivierten optionalen Git-Locks. Er setzt ein bestehendes Git-Repository im Gedächtnis voraus, kopiert keine Inhalte und öffnet keinen Port. Die Renderprüfung bestätigt erzeugtes HTML, nicht die visuelle Lesbarkeit im Browser.

KI A muss am übergebenen Commit noch selbst prüfen: Start/Bindung (`lsof -nP -iTCP:3210 -sTCP:LISTEN`), Darstellung von mindestens zehn realen Notizen einschließlich Daily Note, großer KI-Entwicklungsnotiz, Tabelle/Alias und Umlauten, Bilder/Anhänge, Anker, Suche, Vor/Zurück und Aktualisierung an einer **Kopie**. Zusätzlich unabhängigen Link- und Rückverweisabgleich sowie eigene Sicherheitsgegenproben durchführen. Details und gemessene Ergebnisse: [HANDOFF.md](HANDOFF.md).

## Architektur und Abhängigkeiten

- `src/vault.ts`: zentrale Leseschranke, flüchtiger Index, Linkauflösung, Suche und Rückverweise. Dateizugriff mit `lstat`, `realpath`, `O_RDONLY | O_NOFOLLOW` und Identitätsprüfung; keine Schreibfunktion.
- `src/markdown.ts`: Markdown-Token-Verarbeitung; kein Ersetzen von Wikilinks innerhalb von Code. Roh-HTML wird als Text maskiert, erzeugte Attribute werden escaped.
- `src/server.ts`: portlos testbarer Request-Handler, feste Asset-Liste, Same-Origin-/Host-Schutz, CSP, kein CORS.
- `src/main.ts`: Node-HTTP-Adapter mit fester Loopback-Bindung.
- `src/client.ts`, `public/`: TypeScript-Oberfläche ohne UI-Framework; zusätzliche HTML-Bereinigung mit DOMPurify vor jeder HTML-Einfügung.

Laufzeitabhängigkeiten (exakte Versionen im Lockfile): [markdown-it](https://github.com/markdown-it/markdown-it) für CommonMark/Tabellen und Token-Erweiterungen, [yaml](https://eemeli.org/yaml/) für strukturiertes Frontmatter mit Aliaslimit, [DOMPurify](https://github.com/cure53/DOMPurify) für zusätzliche Bereinigung im Browser. Entwicklung: TypeScript mit integriertem LSP und Node-24-Typen. Node liefert HTTP und Test-Runner; kein zusätzlicher Server, Bundler oder Test-Framework nötig.

## Grenzen und Schutzmodell

Keine Bearbeitung, Importe, KI-Funktionen, Graphansicht oder Persistenz. Fehlerhafte und leere Notizen bleiben mit Hinweis sichtbar. Über dem Größenlimit wird eine Notiz **nicht teilweise** angezeigt oder durchsucht; nach Erhöhung des Limits neu starten. Anhänge sind auf 64 MiB pro Abruf begrenzt; Bilder und PDF dürfen separat geöffnet werden, andere Typen werden heruntergeladen. SVG erhält eine restriktive Sandbox-CSP, eingebettete Skripte dürfen nicht laufen. HTML-Dateien werden nur als Download ausgeliefert.

Eine erfolgreiche Aktualisierung ersetzt den Index atomar. Bei nicht erreichbarer Wurzel bleibt die vorherige Generation bestehen und die Oberfläche meldet den Fehler. Kein Dateisystem-Snapshot: Änderungen während des Einlesens können Hinweise oder einen gemischten Zeitstand erzeugen; danach erneut aktualisieren. Gleichzeitige Refresh-Anfragen werden zusammengefasst.

Die Anwendung ist für Bastis vertrauenswürdiges lokales Dateisystem gedacht. Pfad- und Symlinkprüfungen reduzieren auch Austauschrennen, stellen aber keine Betriebssystem-Isolation gegen einen bösartigen lokalen Prozess dar, der Verzeichnisse fortlaufend austauscht. Keine Authentifizierung und kein Netzwerkbetrieb. Vertrauliche Dateien innerhalb der Wurzel müssen explizit ausgeschlossen sein; Git-Ignore-Regeln werden nicht automatisch als Wissensausschlüsse interpretiert.
