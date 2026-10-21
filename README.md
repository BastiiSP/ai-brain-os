# AI Brain OS · Lieferstand 5

Lokale Ansicht eines Markdown-Gedächtnisses mit persönlichen Navigationseinstellungen: Ordnernavigation, Notizen mit Metadaten, Volltextsuche, Wikilinks und Markdown-Links, Rückverweise und Übersicht offener Verknüpfungen. Notizen und Anhänge bleiben unverändert; ausschließlich die Navigationseinstellungen werden in einer versteckten Datei gespeichert. Der Index lebt nur im Arbeitsspeicher. Keine Datenbank, keine Kopie des Gedächtnisses, kein externer Dienst.

## Einrichtung und Start

Voraussetzung: Node.js 24 LTS (ab 24.15), npm. Befehle im Anwendungsordner ausführen:

```bash
npm ci
npm start
```

`npm start` kompiliert TypeScript und startet die Anwendung unter **http://127.0.0.1:3210**. Die Bindung ist fest auf `127.0.0.1` beschränkt. Zum Beenden `Ctrl+C`. Kein Remote und keine globale Installation erforderlich. `http://localhost:3210` ist ebenfalls möglich. Host und Port müssen exakt einem dieser beiden Einstiege entsprechen; eine mitgesendete Herkunft muss zum jeweiligen Einstieg passen.

## Zugang nach Anmeldung am Mac

Als angemeldeter Benutzer im Anwendungsordner einmalig einrichten:

```bash
node scripts/access.mjs install
```

Das Skript führt `npm ci` und den Build aus, legt einen Benutzer-LaunchAgent unter `~/Library/LaunchAgents/io.github.ai-brain-os.local.plist` und die Dock-App unter `~/Applications/AI Brain OS.app` an und fügt sie dem Dock hinzu. Der Dienst startet bei der Anmeldung und wird nach Prozessende neu gestartet. Die App öffnet die lokale Oberfläche mit einem Klick. Wenn sie den Dienst nicht erreicht, zeigt sie einen Dialog mit einem Hinweis. Ein bereits belegter konfigurierter Port führt zum Abbruch; einen vorhandenen Server beendet das Skript nicht. Vor der Einrichtung einen manuell gestarteten `npm start` selbst beenden.

Nach Codeänderungen aktualisieren (Build, Dienstneustart und Dock-Icon):

```bash
node scripts/access.mjs update
```

Das Dock-Icon „Chip-Hirn“ stammt aus [`assets/icon-chip-hirn.svg`](assets/icon-chip-hirn.svg). `install` und `update` erzeugen daraus lokal mit Swift/AppKit ein Icon-Paket mit 16 bis 1024 Pixeln einschließlich Retina-Größen. Die erzeugte `.icns`-Datei liegt nur in der installierten App und wird nicht versioniert. `update` ersetzt das Icon einer bestehenden App ohne Ausbau; der Dock-Eintrag bleibt erhalten. Die Darstellung in Dock, Finder und App-Umschalter prüft KI A auf dem Mac.

Nach einer Änderung von `config.local.json`, insbesondere des Ports, erst entfernen und neu einrichten, damit Dock-App und Dienst dieselbe Adresse verwenden. Vollständig ausbauen:

```bash
node scripts/access.mjs uninstall
```

Der Ausbau stoppt den Dienst und entfernt LaunchAgent, Dock-Eintrag, App und Protokolle. Er verändert keine Gedächtnisdatei. Das Fehler- und Startprotokoll steht in `~/Library/Logs/AI Brain OS/server.log`, die vorige Generation in `server.log.1`; beide sind auf je 1 MiB begrenzt. Für die Einrichtung sind weder Homebrew noch die vollständige Xcode-App nötig; die macOS-Werkzeuge und Swift aus den Command Line Tools reichen. Die Dock-Einrichtung ändert gezielt den Einstellungsschlüssel `persistent-apps`, ohne die übrige Dock-Domäne zu importieren. Node muss am selben Pfad verfügbar bleiben, mit dem installiert wurde. Bleibt die Oberfläche unerreichbar, helfen `launchctl print gui/$(id -u)/io.github.ai-brain-os.local`, das Protokoll und `lsof -nP -iTCP:3210 -sTCP:LISTEN`.

Die Anmeldung, ein echter Neustart, hartes Beenden des Serverprozesses, Ruhezustand/Aufwachen, Dock-Darstellung und die 30-/10-Sekunden-Grenzen müssen auf dem Mac geprüft werden. Ein Neustart des Mac erfolgt nur mit Bastis Zustimmung. Wenn ein vorhandener manueller Server auf Port 3210 läuft, erst nach dessen geplantem Beenden einrichten.

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

- Oben zwischen **Fakten** und **3D** wechseln. Die 3D-Ansicht zeigt die Notizen als Chips auf Ordnersockeln. „Lesen“ in der Notizkarte öffnet dieselbe Notiz in der Faktenansicht; „3D“ kehrt zur erhaltenen Kamera zurück (innerhalb derselben Browserseite).
- **Hell**, **Dunkel** oder **System** wählen. Die Wahl wird im Browser gespeichert; „System“ folgt der Betriebssystemeinstellung. Die Oberfläche beachtet „Bewegung reduzieren“. Bei gesperrtem Browser-Speicher gilt vorübergehend „System“.
- Nunito für Fließtext und JetBrains Mono für Pfade, Metadaten und Zähler werden lokal ausgeliefert. Die WOFF2-Dateien und OFL-Lizenzen stehen unter `public/fonts/`; zur Laufzeit werden keine Schriften aus dem Netz geladen. Quelle der vier Dateien: `@fontsource-variable/nunito@5.3.0` und `@fontsource-variable/jetbrains-mono@5.3.0`, jeweils `files/*-latin-wght-normal.woff2` und `LICENSE`. Diese Pakete sind keine Laufzeitabhängigkeiten.
- Links einen Ordner aufklappen oder „Ordner öffnen“ wählen; Notizen und Anhänge haben eigene URLs.
- Suche mit Eingabetaste oder „Suchen“ auslösen. Durchsucht Titel, Pfad, Text und Frontmatter; Titeltreffer stehen zuerst, Ergebnisse enthalten Textausschnitte.
- „Aktualisieren“ liest den gesamten Bestand neu. Die aktuelle Ansicht wird erneut geladen, gelöschte Notizen erhalten eine verständliche Meldung. Zeitpunkt und Dauer stehen oben. Es gibt keine automatische Live-Aktualisierung.
- Direkte Notiz-, Ordner- und Anhangadressen funktionieren in NFC- und NFD-Schreibweise. Die Anwendung verwendet anschließend den indexierten Originalpfad; mehrdeutige normalisierte Dateipfade werden von der API abgewiesen.
- Frontmatter-Listen erscheinen als kommagetrennte Werte. Selbstanker zeigen die Überschrift ohne führendes `#`; explizite Aliasse behalten Vorrang.
- Rückverweise stehen unter einer Notiz. „Offene Verknüpfungen“ zeigt nicht aufgelöste und mehrdeutige Verweise. Mehrdeutige Ziele müssen ausgewählt werden; Vorschläge sind als „Möglicherweise gemeint“ markiert.
- Zurück/Vor im Browser navigiert zwischen Ansichten. Überschriftenanker scrollen zum Ziel; fehlt die Überschrift, erscheint ein Hinweis. Blockanker öffnen die Notiz.
- Externe Links sind markiert und öffnen separat. Externe Bilder werden als Link angezeigt; beim Lesen werden keine externen Bilder geladen.

## Linkvertrag

NFC-Normalisierung, Groß-/Kleinschreibung ignoriert, `\|` entspricht `|`. Alias nach `|` ist Anzeigetext, `#` trennt Anker. Codeblöcke und Inline-Code werden nicht als Links ausgewertet.

Die erste passende Stufe entscheidet: Pfad ab Wurzel (optional `.md`), relativ zum Quellordner, eindeutiger Pfad-Suffix, eindeutiger Dateiname bei Zielen ohne `/`, danach Ordner (Wurzel oder relativ). Mehrere Treffer derselben Stufe führen zur Auswahl, nicht zum Weiterprobieren. Nicht aufgelöste alte Pfade können gleichnamige sichtbare Dateien als Vorschlag anbieten. Explizit versteckte/ausgeschlossene Ziele liefern auch keine Vorschläge. Markdown-Links verwenden dieselben Stufen; Prozentkodierung wird einmal dekodiert. Aufgelöste eindeutige Links aus anderen Notizen erzeugen Rückverweise; mehrdeutige Links und Vorschläge nicht.

Notiz-Embeds erscheinen als Links, Bild-Embeds werden angezeigt. Überschriften-IDs basieren auf sichtbarem Text in Kleinschreibung/NFC mit Bindestrichen statt Leerzeichen; wiederholte Überschriften erhalten Nummern. Obsidian-spezifische Blockanker, Bases, Dataview und Notiz-Transklusion sind nicht implementiert. Callouts erscheinen als Zitat mit Typbezeichnung; Aufgabenlisten als nicht editierbare Kästchen.

## Prüfung

```bash
npm run typecheck
npm test
npm run check:lsp
npm audit
```

Tests erzeugen und entfernen ihr eigenes Gedächtnis unter `.test-work/`. Sie lesen **nie** das reale Gedächtnis. Die Prüfgruppen testen Dateiliste, Linkformen und Stufen, NFC, Metadaten, Suche, externe Änderungen, Unverändertheit, Traversal, Symlinks, Ausschlüsse, HTML, HTTP-Schutz, lokale Font-Auslieferung und die E9-Fehlerfälle. Ein eigener Test berechnet WCAG-Kontrastwerte der Farbtoken und prüft die lokalen Schriftlizenzen. Server-Requests laufen direkt über den Fetch-Handler, ohne Port. Der TypeScript-7-LSP wird separat über stdio für alle TypeScript-Dateien abgefragt. Die Meldung `context canceled` beim regulären LSP-Shutdown stammt vom Language Server; maßgeblich sind Diagnosen und Exitcode.

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
- `src/client.ts`, `public/`: TypeScript-Oberfläche ohne UI-Framework; zusätzliche HTML-Bereinigung mit DOMPurify vor jeder HTML-Einfügung. Farbmodi als CSS-Variablen, Auswahl im Browser-Speicher, lokale variable WOFF2-Schriften und der lokal gerenderte 3D-Wissensraum.

Laufzeitabhängigkeiten (exakte Versionen im Lockfile): [markdown-it](https://github.com/markdown-it/markdown-it) für CommonMark/Tabellen und Token-Erweiterungen, [yaml](https://eemeli.org/yaml/) für strukturiertes Frontmatter mit Aliaslimit, [DOMPurify](https://github.com/cure53/DOMPurify) für zusätzliche Bereinigung im Browser. Entwicklung: TypeScript mit integriertem LSP und Node-24-Typen. Node liefert HTTP und Test-Runner; kein zusätzlicher Server, Bundler oder Test-Framework nötig.

## Grenzen und Schutzmodell

Keine Bearbeitung, Importe, KI-Funktionen oder Persistenz des Graphen. Fehlerhafte und leere Notizen bleiben mit Hinweis sichtbar. Über dem Größenlimit wird eine Notiz **nicht teilweise** angezeigt oder durchsucht; nach Erhöhung des Limits neu starten. Anhänge sind auf 64 MiB pro Abruf begrenzt; Bilder und PDF dürfen separat geöffnet werden, andere Typen werden heruntergeladen. SVG erhält eine restriktive Sandbox-CSP, eingebettete Skripte dürfen nicht laufen. HTML-Dateien werden nur als Download ausgeliefert.

Eine erfolgreiche Aktualisierung ersetzt den Index atomar. Bei nicht erreichbarer Wurzel bleibt die vorherige Generation bestehen und die Oberfläche meldet den Fehler. Kein Dateisystem-Snapshot: Änderungen während des Einlesens können Hinweise oder einen gemischten Zeitstand erzeugen; danach erneut aktualisieren. Gleichzeitige Refresh-Anfragen werden zusammengefasst.

Die Anwendung ist für Bastis vertrauenswürdiges lokales Dateisystem gedacht. Pfad- und Symlinkprüfungen reduzieren auch Austauschrennen, stellen aber keine Betriebssystem-Isolation gegen einen bösartigen lokalen Prozess dar, der Verzeichnisse fortlaufend austauscht. Keine Authentifizierung und kein Netzwerkbetrieb. Vertrauliche Dateien innerhalb der Wurzel müssen explizit ausgeschlossen sein; Git-Ignore-Regeln werden nicht automatisch als Wissensausschlüsse interpretiert.

## Wissensraum: Darstellung und Regeln

Ziehen dreht die Kamera, Scrollen/Trackpad zoomt, Klick auf einen Chip öffnet die Karte. Pfeiltasten und +/− bedienen die Kamera ebenfalls; die Notizauswahl unter dem Raum ist per Tastatur erreichbar. „Kamera zurücksetzen“ stellt den Überblick her. Bei fehlendem WebGL bleibt die Faktenansicht über den vorhandenen Umschalter erreichbar.

- Ein Chip je indexierter, nicht über die Navigation ausgeblendeter Notiz. Ein Sockel je sichtbarem Hauptordner, zusätzlich „Wurzel“ für Notizen ohne Ordner. Nummern im Ordnernamen bleiben erhalten, ansonsten erhalten Sockel eine Anzeigezahl. Die gewählten Ordnerfarben gelten auch im Raum; Unterordner werden je Ebene weniger kräftig. Sockel verwenden dieselbe Grundfarbe mit zurückgenommener Intensität, damit Chips sichtbar abgesetzt bleiben. Mehr verknüpfte Chips sind größer; bei maximaler Chipbreite 6 bleiben mindestens 4 Welteinheiten Abstand zwischen Chips.
- Eine Bahn je ungeordnetem Paar verschiedener Notizen mit mindestens einem eindeutig aufgelösten Link. Wiederholungen, Gegenrichtung und Selbstverweise erzeugen keine zusätzliche Bahn. Aufgelöste Links auf Anhänge/Ordner erscheinen als einzeln gezählte Linkvorkommen in der Karte. Nicht aufgelöste und mehrdeutige Links erscheinen dort nicht.
- Bahnen laufen rechtwinklig über eigene Höhen und getrennte Anschlusspunkte innerhalb der Chipoberfläche. Überkreuzungen sind möglich; gemeinsame Streckenabschnitte sind ausgeschlossen. Die Tests prüfen die tatsächliche Float32-Genauigkeit der Renderkoordinaten, auch mit 2.000 Notizen/4.000 Bahnen und einem Hub mit 1.999 Nachbarn. Bei Hover und Auswahl werden die zugehörigen Bahnen farbig hervorgehoben, die übrigen zum Hintergrund hin gedimmt.
- Notizen unter `05 Daily Notes/` erscheinen blass. Der Schalter blendet ihre Chips und verbundenen Bahnen aus; die Zähler zeigen dargestellte und gesamte Mengen.
- „Wachstum abspielen“ zeigt über acht Sekunden die chronologische Reihenfolge: gültige, mit `Date.parse` lesbare Frontmatter-Zeichenfolge `date`, sonst indexierte Dateiänderungszeit. Datum ohne Uhrzeit wird als UTC interpretiert; gleiche Zeitpunkte werden nach der stabilen Pfadreihenfolge aufgelöst. Fehlt wegen eines Lesefehlers auch die Änderungszeit, wird 0 verwendet. „Alle zeigen“ beendet die Wiedergabe.
- „Bewegung“ schaltet Impulse, langsames Drehen und gemeinsames Schweben der Platine ein/aus. Ohne Bewegung ist auch Wachstum gesperrt. Die Systemeinstellung „Bewegung reduzieren“ erzwingt dies, auch bei Änderung während der Nutzung. In der Faktenansicht ist die Render-Schleife pausiert.
- Die Ansicht bleibt innerhalb der Browserseite erhalten. „Aktualisieren“ verwirft den alten Raum und lädt den aktuellen Index; die Kamera bleibt erhalten. Kein Raumzustand wird ins Gedächtnis geschrieben.

### Reproduzierbare R8-Messung für KI A

```bash
npm run build
node scripts/room-benchmark.mjs
```

Das Skript erzeugt ein neues, rein erfundenes Test-Gedächtnis unter `.test-work/room-*` im Anwendungsordner: **2.000 Notizen, 4.000 unterschiedliche Notizpaare** in sieben Hauptordnern. Es nutzt den normalen Index und HTTP-Adapter mit eigener Wurzel auf **127.0.0.1:3211**, ohne `config.local.json` zu ändern und ohne Dienststeuerung. Öffne `http://127.0.0.1:3211/?view=3d`. Ein belegter Port führt zu einer Fehlermeldung; fremde Prozesse werden nicht beendet. Mit Ctrl+C nur diesen Testprozess beenden. Bei Ctrl+C oder SIGTERM nach dem Serverstart wird nur das von diesem Lauf erzeugte Test-Gedächtnis entfernt; ebenso bei einem Startfehler. Ein erzwungenes SIGKILL kann Reste unter `.test-work/` hinterlassen.

Die Anzeige „Aufbau“ misst vom Einstieg in die 3D-Route einschließlich Laden der lokalen Module und Graphdaten bis zum ersten abgeschlossenen Render-Aufruf. Sie ist bei einer frischen Seite zu erfassen, nicht bei der Rückkehr zum bereits aufgebauten Raum. Serverstart und vorherige Indexierung werden getrennt betrachtet: Der Index entsteht vor dem HTTP-Start; seine Dauer steht oben in der Anwendung. Der erste Render-Aufruf garantiert noch keinen gemessenen GPU-Abschluss.

Für die Bildrate: gleicher Browser, Vordergrund-Tab, gleiche Fenstergröße, Browserzoom 100 %, Netzbetrieb und keine geöffneten Entwicklertools. Alle Notizen anzeigen, Wachstum beendet, Bewegung aus, Kamera in Übersicht. Nach fünf Sekunden Aufwärmen dreimal „10 Sekunden messen“ verwenden und alle drei Mittelwerte protokollieren; zusätzlich den laufenden 1-s-Zähler beobachten. Die Anzeige nennt die Renderauflösung. Danach denselben Ablauf mit Bewegung an und beim Drehen/Selektieren als ergänzende Belastungsprobe durchführen. Verdeckte Tabs und Ansichtswechsel verwerfen laufende Messungen. Ziel: mindestens 30 Bilder/s mit Testmenge, mindestens 50 Bilder/s beim realen Bestand; Raumaufbau jeweils unter 2.000 ms. Browser-/macOS-Version, Hardware, Auflösung, Bewegungszustand und Einzelwerte festhalten.

Die Messung des echten Bestands führt KI A nach Aktualisierung des Dienstes auf Port 3210 durch. **KI B hat keine Browser-Bildrate oder visuelle Abnahme gemessen.** Eine schnelle reine Layoutberechnung belegt R8 nicht.

### Erweiterte Architektur

`src/graph.ts` leitet die Raumdaten ausschließlich aus einem vollständigen Index ab. `src/room-layout.ts` berechnet deterministisch Sockel, Chips, Anschlüsse und Bahnen, ohne DOM oder WebGL. `src/room.ts` rendert mit instanzierten Chips und einem gemeinsamen Linienpuffer; Geometrie und Farben werden nur bei Zustandswechseln aktualisiert. `src/http.ts` enthält den bisherigen Loopback-HTTP-Adapter, den normaler Start und Teststart gemeinsam nutzen.

Neue direkte Abhängigkeiten: **three 0.186.1** (MIT), verbreitete WebGL-Bibliothek für instanzierte Geometrie, Kamera und Picking; **@types/three 0.186.0** nur zur Entwicklung. Versionen und transitive Abhängigkeiten stehen im Lockfile. Keine weiteren Laufzeitdienste oder Bundler. Die zwei Three.js-Module werden über die feste Asset-Liste aus `node_modules/three/build` ausgeliefert. Die CSP bleibt unverändert; weder CDN, Importmap, Inline-Skript noch `unsafe-eval` ist nötig. Beschriftungen entstehen lokal auf einer zweiten Canvas in Bildschirmkoordinaten mit 14 CSS-Pixeln; sie schrumpfen beim Herauszoomen nicht.

### Korrekturrunde 1: dichte Graphen untersuchen

Im 3D-Modus nutzt die Bühne die gesamte Anwendungsbreite und 72 % der Fensterhöhe (mindestens 520 px auf größeren Fenstern). Die Ordnernavigation bleibt in der Faktenansicht verfügbar. Die Karte steht unterhalb der Bühne und verdeckt keine Chips. Sockelnamen und die fünf am stärksten verknüpften Notizen werden mit 14 CSS-Pixeln, Hintergrundfläche und Zuordnungslinie beschriftet. Die Chipkörper sind 2,5 Einheiten hoch und abhängig vom Knotengrad 3,5 bis 6 Einheiten breit.

**Unterscheidbarkeit durch Einzelverfolgung:** Das vollständige Netz bleibt als blasser Kontext erhalten. Beim Hover oder Auswählen werden die zugehörigen Verbindungen verstärkt; genau eine davon wird zusätzlich mit einer 3 px breiten, vollständig deckenden Spur und 9 px breiter Hintergrundkontur in Bildschirmkoordinaten nachgezeichnet. Dadurch unterbrechen dahinterliegende Kreuzungen die verfolgte Bahn nicht. „Vorige Bahn“/„Nächste Bahn“ erschließen alle sichtbaren Verbindungen der ausgewählten Notiz; in der Karte wählt „Bahn verfolgen“ direkt die Verbindung zum jeweiligen Nachbarn. Endpunkte werden beschriftet, und oberhalb steht das Notizpaar. Ausgeblendete Tagesnotizen werden beim Durchschalten übersprungen. Es wird kein Mindestabstand für die gleichzeitig dargestellten 4.000 Kontextbahnen behauptet: Die alternative Darstellungsregel ist die eindeutige Einzelverfolgung, automatisiert auf vollständige Erreichbarkeit sämtlicher 1.999 Kanten eines Hubs geprüft. Die bisherigen Tests auf gemeinsame geometrische Abschnitte bleiben bestehen.

Der Aufbauzähler umfasst weiterhin Module, Daten, Aufbau und ersten Render-Aufruf einschließlich der neuen Beschriftung. Zusätzliche Teilzeiten zeigen Layout, Renderpuffer, DOM-Erstellung, Renderer-Konstruktion und kumulierte Vorbereitung der Chip-/Linienattribute. Der Vorbereitungszähler steigt auch bei späteren Interaktionen; der Aufbauwert bleibt unverändert. Die Statuszeile ist die maßgebliche Browsermessung; Teilzeiten ersetzen sie nicht.

Für eine getrennte CPU-Messung ohne Browser:

```bash
npm run build
node scripts/room-profile.mjs
```

Das Skript erzeugt ein eigenes erfundenes Gedächtnis, durchläuft den normalen Index und misst fünfmal Graphprojektion, Layout und Positionspuffer (32.000 Vertices). Es entfernt seine Daten auch bei Fehlern. DOM, GPU-Upload, Shader, Instanzmatrizen und erster Browserframe sind darin nicht enthalten. Diese Messung kann die Zwei-Sekunden-Grenze im Browser nicht bestätigen.


## Persönliche Navigation (Lieferstand 5)

Unter „Dein Gedächtnis“ **Anpassen** wählen. Jede Änderung wird unmittelbar gespeichert; „Gespeichert“ bestätigt den Abschluss. Ohne eine Änderung wird keine Einstellungsdatei angelegt.

- Hauptordner haben vier wählbare Farben: Türkis, Pink, Malve und Grautürkis. Ohne Auswahl gilt Türkis. Unterordner erhalten je Ebene automatisch weniger kräftige Töne. Die Textfarbe bleibt für Lesbarkeit unabhängig davon. Dieselbe Grundfarbe steuert die Chips und Sockel im Raum; die bestehende blasse Darstellung der Tagesnotizen bleibt erhalten.
- Ordner und Dateien lassen sich ausblenden, einschließlich Notizen direkt an der Wurzel. Das gilt rekursiv in Navigation, Ordnerlisten und Raum. **Ausgeblendete zeigen** macht die Einträge zur Verwaltung wieder sichtbar; „Einblenden“ hebt ihre eigene Ausblendung auf. Bei einem ausgeblendeten Elternordner muss auch dieser eingeblendet werden. Suche, Notizinhalte, Links und direkte Dateiabrufe bleiben erreichbar. Ausblenden ist keine Zugriffssperre.
- Die Zahl am Ordner zählt alle indexierten Notizen in seinen Unterordnern einschließlich ausgeblendeter Notizen; Anhänge zählen nicht mit.
- Am Griff **↕** innerhalb desselben Ordners ziehen oder die Schaltflächen **↑/↓** per Tab und Eingabetaste nutzen. Am Griff funktionieren auch **Alt+Pfeil oben/unten**. Ordner werden dabei nicht verschoben oder umbenannt. Ohne eigene Umsortierung gilt die alphabetische Standardreihenfolge. Nur beim Umsortieren wird die Reihenfolge der direkten Einträge dieses Ordners gespeichert, ohne Unterordnerinhalte oder andere Ordner mitzuerfassen. Neue Einträge folgen der gespeicherten Reihenfolge alphabetisch am Ende, sobald du aktualisierst; dafür wird nicht gespeichert. Ausblenden, Farben und Anheften erzeugen oder erweitern keine Ordnerreihenfolgen.
- **Anheften** stellt eine Notiz an den Anfang der Navigation. Pins lassen sich ebenfalls sortieren und lösen. Eine umbenannte oder gelöschte Notiz bleibt am exakt gespeicherten Pfad als **nicht gefunden** stehen. Es gibt keine automatische Zuordnung zu gleichnamigen Notizen. Ausblenden gilt auch für Pins; „Ausgeblendete zeigen“ macht diese wieder sichtbar.
- **Aktualisieren** und **Einstellungen neu laden** lesen Bestand und Einstellungsdatei neu. Bei einem Speicherkonflikt bleibt die fremde Fassung erhalten. Nach dem Neuladen die gewünschte Änderung erneut vornehmen; eine automatische Zusammenführung findet nicht statt.

### Speicherformat und Schreibgrenze

`src/settings.ts` kapselt sämtliche Gedächtnisschreibzugriffe. Die einzige Zieldatei ist `.ai-brain-os/einstellungen.json`. Der Ordner darf beim ersten Speichern entstehen. Der normale Wissensindex und alle allgemeinen Datei-/Linkendpunkte schließen diesen versteckten Pfad weiterhin aus. `GET /api/settings` liefert die geprüften aktuellen Einstellungen und einen Revisionswert. `PUT /api/settings` akzeptiert ausschließlich `{current, revision}`, JSON, den vorhandenen lokalen Host-/Herkunftsschutz und `X-Brain-Request: 1`. Weder URL-Parameter noch zusätzliche Zielpfade sind zulässig.

Die Datei enthält `{version: 1, current: {...}, previous: {...} | null}`. `current` und `previous` haben jeweils die Felder `colors`, `hidden`, `order` und `pinned`. Ohne ausdrückliche Umsortierung ist `order` leer (`{}`). Bei einer Umsortierung enthält es nur den betroffenen Elternordner und dessen direkte Einträge in der gewählten Reihenfolge; die Wurzelebene verwendet den Schlüssel `""`. Die vollständige Geschwisterliste dieses einen Ordners hält bereits vorhandene Einträge vor später neu hinzukommenden. Sie wird bei Bestandsänderungen weder automatisch ergänzt noch bereinigt. Die Sicherung enthält genau den vorigen gültigen Einstellungsstand ohne weitere verschachtelte Historie. Grenzen: **128 KiB** je Einstellungsstand, **257 KiB** für die ganze Datei und **129 KiB** für den Anfrageinhalt; begrenzte Pfadlängen und Listen kommen hinzu. Unbekannte Versionen/Felder, defekte Daten, übergroße Dateien, Symlinks und Hardlinks sperren das Speichern mit Hinweis. Die Datei bleibt erhalten; zum Lesen der Anwendung gelten vorübergehend die Standardeinstellungen. Erst nach manueller Bereinigung neu laden. Das Revisionsmerkmal berücksichtigt Dateiidentität, Änderungszeiten und Inhalt; vor dem Austausch wird erneut verglichen.

Temporäre Dateien entstehen ausschließlich in **`.settings-work/` im Anwendungsordner**, der in Git ignoriert und mit Modus 0700 angelegt wird. Die Datei wird exklusiv mit 0600 erstellt, vollständig geschrieben, mit `fsync` synchronisiert und nach erneuter Prüfung atomar zum festen Ziel verschoben. Der Zielordner wird anschließend synchronisiert; beim erstmaligen Anlegen auch sein Elternordner. Unterschiedliche Dateisysteme werden abgewiesen. Beim Start werden dort temporäre Dateien beendeter Prozesse entfernt; Dateien laufender Prozesse bleiben erhalten. Ein Prozessabbruch hinterlässt keine temporäre Datei im Gedächtnis. Die Anwendung führt keine Git-Operationen aus.

Das vorhandene Schutzmodell eines vertrauenswürdigen lokalen Dateisystems bleibt maßgeblich: Der abschließende Vergleich und `rename` erfolgen synchron ohne dazwischenlaufende Anwendungsanfrage. Gegen einen unabhängigen lokalen Prozess, der genau zwischen diesen Betriebssystemaufrufen schreibt oder Verzeichnisse austauscht, besteht keine transaktionale Dateisystemsperre. Normale externe Änderungen seit dem Laden sowie Änderungen während der Vorbereitung werden erkannt. Ein physischer Stromausfall wurde nicht getestet. Die integrierte vorige Fassung ist eine Rückfallmöglichkeit bei gültiger Datei; eine Wiederherstellung erfolgt bei Bedarf manuell, nicht über einen zusätzlichen Schreibendpunkt.

### Nachweise und noch notwendige Abnahme

`tests/settings.test.ts` ergänzt die bisherigen Tests um Manifestvergleiche, protokollierte Schreibziele, Schema-/Größengrenzen, fremde Revisionen, Symlinks, Hardlinks, Synchronisierungs- und Dateisystemfehler, einen abrupt beendeten eigenen Testprozess und anschließende Startbereinigung. Der HTTP-Body-Adapter wird mit gestreamten Daten ohne Netzwerkport geprüft. Weitere Tests prüfen Farbkontrast und Abstufung, Notizanzahlen, Reihenfolge, fehlende Pins und unveränderte Suche/Linkauflösung. F1-Regressionstests prüfen zusätzlich, dass Ausblenden, Farben und Pins auch mit 6.000 erfundenen Indexeinträgen keine Reihenfolgelisten erzeugen, dass Umsortieren nur den betroffenen Ordner erfasst und dass neue Einträge ohne Einstellungsänderung erscheinen. Alle Test-Dateien liegen ausschließlich unter `.test-work/`.

Keine neuen Abhängigkeiten. Gemeinsame Darstellungsregeln stehen in `src/preferences.ts`, die DOM-basierte Bedienung in `src/navigation.ts`. Sichtprüfung, echtes Drag-and-drop und Tastaturbedienung im Browser, Netzwerktransport, Darstellung/Leistung des 3D-Raums sowie die erste Speicherung im echten Gedächtnis bleiben Aufgaben der unabhängigen Prüfung durch KI A. O10 erfordert Bastis Urteil. Der aktuelle Übergabestand und die eigenen Ergebnisse stehen am Anfang von [HANDOFF.md](HANDOFF.md).
