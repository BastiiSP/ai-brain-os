# Übergabe Lieferstand 5 · 21.10.2026

**KI B:** Codex, Umsetzung und eigene Prüfung. **KI A:** Claude Code, Planung und unabhängige Prüfung. **Auftraggeber:** Basti.

**Stand:** `main`, Basis `0cd8da04d1f8099414c96bb97b85ad0f82f29cf9`, dazu der uncommittierte Diff und die vier unten aufgeführten neuen Dateien. Kein Commitversuch: `.git` ist laut geltenden Schreibrechten nur lesbar. KI A soll den übergebenen Stand unverändert committen, Codex als Umsetzer nennen und genau diesen Commit prüfen. Kein Push und keine unabhängige Abnahme durch KI B.

## Ziel, Planprüfung und Grenzen

O2–O6 und O8–O10 gemäß Auftrag; O1/O7 entfallen, echte Ordnernamen bleiben erhalten. Den von KI A präzisierten O8-Schreibvertrag erneut gelesen und umgesetzt: eine persistente Einstellungsdatei im Gedächtnis, genau eine vorige gültige Fassung darin, temporäre Datei ausschließlich im ignorierten Arbeitsordner der Anwendung. Kein weiterer wesentlicher Planeinwand nach der Präzisierung.

Keine Änderungen an AGENTS.md/CLAUDE.md, am realen Gedächtnis, an lokaler Konfiguration oder am laufenden Dienst. Kein `launchctl`, kein Aufruf von `scripts/access.mjs`, kein Start eines Anwendungsservers. Alle eigenen Schreibprüfungen verwendeten erfundene Gedächtnisse unter `.test-work/` im Anwendungsordner. Der Absturztest beendet ausschließlich seinen eigenen eigens gestarteten Testprozess. Projekt- und Daily-Notiz im Gedächtnis wurden wegen der Schreibgrenze nicht fortgeschrieben.

## Implementiert und eigene Nachweise

| Kriterium | Umsetzung / eigener Nachweis |
| --- | --- |
| O2 | Vier feste, aus der Farbwelt abgeleitete Farben. Automatische Entsättigung je Unterordnerebene; keine freie Unterordnerfarbe. Gemeinsame Berechnung für Navigationsmarken, Sockelgrundfarben und Chips. Kontrast der Marken mindestens 3:1 für alle vier Farben, beide Modi und 20 Ebenen getestet. Textfarben bleiben unverändert. Sichtprüfung offen. |
| O3 | Rekursive Ausblendung in Baum, Ordnerlisten und Raum, inklusive Wurzelnotizen und Pins. Verwaltungsansicht zum Wiedereinblenden; verwaiste Ausblendungen können entfernt werden. Such-/Linkabgleich bleibt unverändert. Der vollständige Graph-Endpunkt bleibt lesend und ungefiltert; der Raum filtert Chips/Bahnen. |
| O4 | Anzahl aller indexierten Notizen rekursiv einschließlich ausgeblendeter Notizen, ohne Anhänge; Regel in Oberfläche/README benannt und getestet. |
| O5 | Drag-Griff, ↑/↓-Schaltflächen und Alt+Pfeil oben/unten am Griff; Sortierung nur unter Geschwistern bzw. innerhalb der Pin-Liste. Gemeinsamer Verschiebealgorithmus geprüft. Neue Einträge nach bekannten; initial alphabetisch. Persistenz nach der ersten expliziten Einstellungsänderung. Browserereignisse noch nicht praktisch geprüft. |
| O6 | Angeheftete Notizen stehen oben; gespeicherte genaue Pfade bleiben beim Umbenennen/Löschen erhalten. Fehlende Ziele zeigen „nicht gefunden“, kein automatisches Umhängen. Test mit tatsächlicher Umbenennung im Test-Gedächtnis. |
| O8 | Festes Ziel, Schema v1, Größenlimits, aktueller/voriger Stand; atomarer Austausch über synchronisierte Temp-Datei. Ungültige Dateien gesperrt, Revision vor Austausch erneut geprüft. API mit Host-/Origin-/Cross-Site-/Methoden-/JSON-Schutz. Tests für fremde Änderungen, zwei Browserrevisionen, Symlinks, Hardlinks, defekte/zu große Dateien, Pfad-/Feldinjektion, gestreamte Anfragegröße, fsync-Fehler, Gerätekennung und EXDEV. |
| O9/G1 | Vollständige Test-Dateimanifeste mit Inhaltshash und Änderungszeit unverändert außerhalb der einen Ausnahme. Schreiboperationen zusätzlich instrumentiert: nur Arbeitsordner/Temp-Datei, Einstellungsordner und festes Ziel. Prozessabbruch nach Temp-fsync plus Neustartbereinigung getestet. Keine Manifestprüfung am realen Gedächtnis in diesem Lauf. |
| O10 | Offen: Bastis Urteil über Übersichtlichkeit und persönliche Nutzbarkeit. |
| G2–G6 | Keine Fernressourcen oder neuen Abhängigkeiten. Bisherige Tests einschließlich 2.000-Notizen-/4.000-Paare-Prüfung grün; Loopback-Bindung und Schutzheader erhalten. Bewegung und Tagesnotizschalter erhalten; keine neuen Animationen. README aktualisiert. Sicht-/Leistungsprüfung offen. |

## Geänderte Dateien (vollständig)

| Datei | Änderung |
| --- | --- |
| `.gitignore` | `.settings-work/` ignorieren. |
| `src/settings.ts` **neu** | Ausschließlich fester Einstellungszugriff, Schema-/Integritätsprüfung, atomarer Austausch und Startbereinigung. |
| `src/preferences.ts` **neu** | Gemeinsames Format, Palette, Abstufung, Ausblendung, Sortierung, Notizzähler und Raumfilter. |
| `src/navigation.ts` **neu** | DOM-basierte Navigation, Verwaltungsbedienung, Pins, Drag/Keyboard, Rückmeldungen. |
| `src/server.ts` | Feste Settings-API, begrenztes JSON-Lesen, Einstellungszustand und neue lokale Assets. |
| `src/http.ts` | Request-Body mit Backpressure und Größenprüfung durch den Handler, Startbereinigung, Anfragetimeout. |
| `src/client.ts` | Navigation anbinden, Einstellungen laden/speichern/neu laden, Raum invalidieren und filtern. |
| `src/room.ts` | Gemeinsame gewählte Farbwerte und Tiefenabstufung; bisherige Sockel-/Tagesnotiz-Abschwächung erhalten. |
| `src/graph.ts` | Eindeutiger interner Schlüssel für Wurzelnotizen statt Kollision mit echtem Ordner „Wurzel“. |
| `src/room-layout.ts` | Interner Wurzelschlüssel erhält weiterhin die sichtbare Bezeichnung „Wurzel“. |
| `src/vault.ts` | Echte Ordnernamen auch bei Endung `.md` erhalten; Kommentar zur getrennten Schreibschranke. |
| `public/index.html` | Hinweistext auf neue Einstellungspersistenz abgestimmt. |
| `public/style.css` | Navigation, Farbmarken, Verwaltungsbedienung, Fokus-/Ausblendungsdarstellung. |
| `tests/settings.test.ts` **neu** | 21 zusätzliche Prüfgruppen zu O2–O9, API/HTTP-Body und Fehler-/Abbruchszenarien. |
| `README.md` | Bedienung, Speicherformat, Grenzen, Architektur, Nachweise und offene Abnahme. |
| `HANDOFF.md` | Diese Übergabe; ältere Übergaben bleiben unten als Historie erhalten. |

`package.json` und `package-lock.json` bleiben unverändert. Keine neuen direkten oder transitiven Abhängigkeiten: Node-Dateisystemfunktionen reichen für den begrenzten Speicherzugriff; native DOM-/Drag-Ereignisse und das vorhandene Three.js genügen für die Darstellung.

## Befehle und Ergebnisse

Im Anwendungsordner, am hier übergebenen Arbeitsstand:

```bash
npm run typecheck
npm test
npm run check:lsp
npm audit
git diff --check
```

- Typprüfung: erfolgreich, Exitcode 0.
- Tests: **50/50 bestanden**, keine übersprungenen Tests; Build enthalten. Davon 29 bisherige und 21 neue Prüfgruppen.
- LSP: **17 TypeScript-Dateien, 0 Diagnosen**, Exitcode 0. `context canceled` ist die bekannte reguläre Shutdown-Meldung.
- Audit: **0 Schwachstellen**, Exitcode 0. Lockfile unverändert.
- Diff-Whitespace-Prüfung: erfolgreich.
- Keine Browser-/GPU-/FPS-Messung. Die portlosen Request- und Streamprüfungen sind kein Nachweis für eine echte Netzwerkverbindung oder tatsächliche Benutzerinteraktion.

## Entscheidungen, kleine Anpassungen und Grenzen

- Sicherung ist der vorige gültige **Einstellungsstand**, nicht eine zusätzliche Datei und keine rekursiv wachsende Historie. Wiederherstellung bei Bedarf manuell; kein zusätzlicher Schreibendpunkt.
- Limits: 128 KiB pro Einstellungsstand, 257 KiB ganze Datei, 129 KiB Anfrage. Synchroner, größenbegrenzter Speicherabschnitt verhindert das Ineinanderlaufen von Anwendungsanfragen vor dem Austausch. UUID und Prozess-ID im Temp-Namen; Bereinigung entfernt nur Dateien beendeter Prozesse. Eine wiederverwendete PID oder fehlende Berechtigung zur Lebensprüfung kann konservativ einen Rest im Arbeitsordner belassen.
- Pins behalten exakte Pfadschreibweisen. Es wird keine Normalisierung zur automatischen Neuzuordnung angewandt. Das vorhandene NFC-Verhalten der allgemeinen Lese-API bleibt erhalten.
- Anzeigen ohne Speichern erzeugt keine Datei. Entdeckungsreihenfolge wird vor der ersten expliziten Änderung nur innerhalb der Browserseite gehalten; danach wird sie mitgespeichert. Neue Einträge werden beim nächsten Speichern Teil der dauerhaften Reihenfolge.
- Zwei kleine Bestandskorrekturen sind für echte Namen und Wurzel-Ausblendung erforderlich: Ordner mit `.md`-Endung werden nicht mehr gekürzt; ein echter Ordner „Wurzel“ kollidiert intern nicht mehr mit Wurzelnotizen. Beide Fälle sind mit erfundenen Daten geprüft.
- Sockel verwenden die gewählte Grundfarbe abgeschwächt zum Hintergrund; Tagesnotizen behalten ihre bisherige blasse Darstellung aus Lieferstand 4. Das erhält die Trennung von Sockeln/Chips und R5.
- Das bestehende vertrauenswürdige lokale Dateisystem bleibt Voraussetzung. Zwischen dem letzten Revisionsvergleich und dem atomaren `rename` gibt es ohne kooperierende externe Schreiber keine Dateisystemtransaktion. Gleichzeitiger fremder Schreibzugriff exakt in diesem kurzen Fenster oder absichtliches fortlaufendes Austauschen von Verzeichnissen wird nicht als ausgeschlossen behauptet. Die normalen Änderungen seit dem Laden und während der Vorbereitung sind geprüft. Physischer Stromausfall ist ungeprüft; Dateisynchronisierung und Prozessabbruch sind getrennte Nachweise.

## Konkrete unabhängige Prüfung durch KI A

1. Diff einschließlich neuer Dateien prüfen (öffentliches Repository), unverändert committen und am exakten Commit Typprüfung, Tests, LSP und Audit wiederholen.
2. Zunächst mit einem erfundenen Test-Gedächtnis prüfen: zwei Hauptordner, mehrere Ebenen, Wurzelnotizen, Anhang, Pin. In hell/dunkel Farben wählen und 3D vergleichen; einen Ordner, einen Unterordner und eine Wurzelnotiz aus-/einblenden. Suche und direkte Links weiterhin öffnen.
3. Mit Maus ziehen; mit Tab/Enter die ↑/↓-Schaltflächen sowie Alt+Pfeiltasten am Griff bedienen. Fokus, Reihenfolge nach Aktualisieren und Browserneustart sowie neu hinzugefügten Ordner am Ende prüfen. Pins sortieren; gepinnte Testnotiz außerhalb der Anwendung umbenennen/löschen und „nicht gefunden“ prüfen.
4. Zwei Browserseiten öffnen: in der ersten speichern, in der zweiten mit alter Revision ändern. Konflikthinweis, erhaltene fremde Datei und explizites Neuladen bestätigen. Defekte/unbekannte Testdatei, Größenlimit und vollständigen HTTP-Transport einschließlich 413 praktisch prüfen.
5. Nach der unabhängigen Code-/Testprüfung den Dienst selbst aktualisieren. Vor/nach der ersten realen Einstellungsspeicherung vollständiges Gedächtnis-Manifest erfassen: ausschließlich `.ai-brain-os/einstellungen.json` darf als Datei hinzukommen/wechseln. Keine Temp-Datei im Gedächtnis. Eingebettete vorige Fassung nach zweitem Speichern prüfen.
6. Oberfläche bei schmaler Breite, reduzierte Bewegung und 3D-Leistung nach bestehender README-Methode prüfen; O10 durch Basti bewerten lassen. Diese Prüfungen sowie die unabhängige Abnahme sind offen.

---

# Historische Übergaben (nicht der aktuelle Abnahmestatus)

# Übergabe Lieferstand 1 · Korrekturrunde 1 · 21.10.2026

**KI B:** Codex, Umsetzung und eigene Prüfung. **KI A:** Claude Code, Planung und unabhängige Prüfung. Auftraggeber: Basti.

**Versionsstand:** Branch `main`, Basis `90bb326ea46e32afe9914c88a9194af3e5d32876`, dazu der uncommittierte Diff der acht unten genannten Dateien. Kein Commitversuch, da `.git` laut geltenden Schreibrechten nur lesbar ist. KI A soll den Stand unverändert committen, Codex als Umsetzer nennen und diesen Commit unabhängig prüfen. Der ursprüngliche Lieferstand wurde von KI A an `5df69a4` abgenommen; die nachstehende historische Übergabe beschreibt den damaligen Zustand, nicht den aktuellen Abnahmestatus.

## Ziel, Grenzen und Planprüfung

Alle sechs beauftragten Korrekturen umgesetzt, keine wesentlichen Einwände oder zusätzlichen Funktionsänderungen. E1–E11 bleiben maßgeblich. Keine neuen Abhängigkeiten, keine Änderungen an AGENTS.md/CLAUDE.md oder am Gedächtnis. Automatisierte Tests ausschließlich mit eigenen temporären Daten unter `.test-work/`. Der Startversuch las den realen Bestand nur ein.

## Lösungen und Nachweise je Punkt

| Punkt | Lösung | Eigener Nachweis |
| --- | --- | --- |
| 1 · localhost | Gemeinsame exakte Host-Freigabe für `localhost:<Port>` und `127.0.0.1:<Port>`; Adapter erhält den tatsächlichen Ursprung. Origin muss zum jeweiligen Host passen; keine gegenseitige Cross-Origin-Freigabe. Bindung bleibt 127.0.0.1. | K1/E8 prüft beide Einstiege, Assets/Notiz/Refresh, fremde Hosts, Ports, HTTPS, Host-Abweichungen, fremde/null-Origin und Cross-Site. Echter Start und `lsof` erfolgreich. |
| 2 · Unicode-Adressen | NFC-Vergleich mit sichtbaren Indexeinträgen in Frontend und API, anschließend Zugriff über den Originalpfad. Mehrdeutige normalisierte Pfade werden in der API abgewiesen. Ausschlussprüfung vor Zuordnung, bestehende Live-Datei- und Symlinkprüfung danach. Auch Resolve-Quellen und Anhänge berücksichtigt. | K2/E8 prüft NFC/NFD-Notiz, Anhang und Quelle, Standard- und konfigurierten Umlautausschluss, versteckte Pfade, Traversal/absolute Pfade und nachträglichen Symlink-Austausch. Bestehende E8-Tests bleiben grün. |
| 3 · Frontmatter | Listenwerte kommagetrennt statt JSON-Array; HTML-Escaping bleibt wirksam. | Codeprüfung; visuelle Browserprüfung offen. Komplexe Objekte innerhalb von Listen behalten JSON-Darstellung. |
| 4 · Rückverweise | Quellnotiz gleich Zielnotiz wird ausgeschlossen. | K4/K5 prüft Selbstanker, ausgeschriebenen Selbstlink, fremde Links und API-Rückverweise; fremde Notiz erscheint nur einmal. |
| 5 · Ankertext | Selbstanker ohne Alias verwenden den dekodierten Anker als Text ohne führendes `#`. | K4/K5 prüft erzeugtes HTML, Umlaut/Prozentkodierung und explizite Aliasse einschließlich absichtlichem `#`. |
| 6 · Suchen | Suchschaltfläche schrumpft nicht und bleibt einzeilig (`flex-shrink:0`, `white-space:nowrap`, `overflow-wrap:normal`); Eingabefeld darf weiterhin schrumpfen. | CSS-Prüfung; visuelle Prüfung bei 1024 px offen. |

## Geänderte Dateien

- `src/main.ts`: Hostprüfung und Erhaltung des Request-Ursprungs.
- `src/server.ts`: gemeinsame Host-Freigabe, Same-Origin-Prüfung, Pfad-/Quellzuordnung.
- `src/vault.ts`: Zuordnung normalisierter Adressen, Selbstankertext, Rückverweise.
- `src/client.ts`: Unicode-Adressen und lesbare Frontmatter-Listen.
- `public/style.css`: Suchschaltfläche.
- `tests/app.test.ts`: drei zusätzliche Prüfgruppen K1, K2 und K4/K5.
- `README.md`: neue Einstiege, Verhalten und Testzahl.
- `HANDOFF.md`: aktuelle Übergabe; ursprüngliche Übergabe unten erhalten.

## Reproduzierbare Prüfungen und Ergebnisse

- `npm run typecheck`: erfolgreich.
- `npm test`: 17/17 Prüfgruppen erfolgreich; umfasst Build und alle bisherigen 14 Gruppen.
- `npm audit`: erfolgreich, 0 bekannte Schwachstellen.
- `npm run check:lsp`: sieben TypeScript-Dateien, 0 Diagnosen, Exitcode 0; reguläre Shutdown-Meldung `context canceled`.
- `git diff --check`: erfolgreich.
- `cmp AGENTS.md CLAUDE.md`: bytegleich; beide unverändert.
- Nach dem Test-Build `node dist/src/main.js`: gestartet, 225 Notizen eingelesen. `lsof -nP -iTCP:3210 -sTCP:LISTEN`: nur `127.0.0.1:3210`. Eigenen Server anschließend beendet.

## Offen / unabhängige Prüfung

Kein nicht umgesetzter Auftragspunkt. Kein zusätzlicher Befund außerhalb der sechs Punkte. Die Begrenzung auf lokale origin-form Request-Ziele im Adapter gehört zu Punkt 1.

Der In-App-Browser war nicht verfügbar. Der anschließende Chrome-Aufruf von `http://localhost:3210` wurde durch die automatische Browser-Freigabe abgelehnt (keine Zugriffsfreigabe). Keine Umgehung. Daher keine eigene visuelle Bestätigung von Punkt 3 und 6 oder tatsächlicher Browsernavigation über localhost/NFC in dieser Runde. KI A prüft am neuen Commit insbesondere beide Einstiege, NFC-Adresse „00 Kontext/Über mich.md“, Frontmatter, Selbstanker/Rückverweise und Suche bei 1024 px. Die eigene Prüfung ersetzt keine unabhängige Abnahme; E1–E11 wurden nicht erneut vollständig am realen Bestand visuell abgenommen. Commit und unabhängige Prüfung stehen noch aus.

---

## Historische Übergabe vor der ersten Abnahme

# Übergabe Lieferstand 1 · 21.10.2026

**KI B:** Codex, Umsetzung und eigene Prüfung. **KI A:** Claude Code, Planung und ausstehende unabhängige Prüfung am Commit. Auftraggeber: Basti. **Kein Commit möglich:** Die Sandbox verweigert bereits `git init -b main` mit `.git: Operation not permitted`. Es wurde kein Repository und kein Remote eingerichtet. Der Stand liegt als unversionierte Dateien vor; KI A muss ihn vor der unabhängigen Abnahme lokal committen. Ein sauberer Git-Status ist hier deshalb nicht nachweisbar.

## Ziel und Planprüfung

Bestehendes Gedächtnis lokal durchsuchen, lesen und verknüpfen; externe Änderungen auf Anforderung neu einlesen. Die Originale bleiben unverändert. Verbindlich ist der Lieferstand-1-Plan in der Projektnotiz. Keine wesentlichen Widersprüche oder Machbarkeitshindernisse festgestellt. Die veraltete Aussage „Node fehlt“ war bereits im Auftrag korrigiert; Node 24.22.1/npm 12.2.0 wurden bestätigt.

Vorhandene `.claude/`- und `.agents/`-Einträge sind ausschließlich Verweise auf `aufgabenprompt`; `.codex/` fehlt. Sie wurden nicht verändert. AGENTS.md und CLAUDE.md wurden ebenfalls nicht verändert. Zunächst kein eigenständiges LSP-Werkzeug vorhanden; TypeScript 7 bringt einen LSP mit, der für die abschließende Analyse benutzt wurde.

## Umgesetzt

Anwendungscode in `src/`, lokale Browseroberfläche in `public/`, reproduzierbare Testdaten direkt in `tests/app.test.ts`, Hilfsprüfungen in `scripts/`. Konfiguration über optionale ignorierte `config.local.json`; dokumentiertes Beispiel. npm-Pakete, Build-Ausgaben, Cache und Testlaufdaten sind ignoriert. Alle eigenen Schreibzugriffe dieses Auftrags erfolgten innerhalb des Anwendungsordners. Kein Schreiben in Projektnotiz, Daily Notes oder sonstiges Gedächtnis.

## Eigene Nachweise und offene Abnahme

| Kriterium | Nachweis KI B | Noch durch KI A zu prüfen |
| --- | --- | --- |
| E1 | Start-/Build-Befehl, Konfiguration und HTTP-Handler geprüft; Bindung im Adapter fest 127.0.0.1 | Echter Start, Port-Bindung und Browser-Erreichbarkeit; hier kein Port geöffnet |
| E2 | Exakte Fixture-Dateiliste; reale sichtbare Liste unabhängig abgeglichen: 245 Dateien, davon 225 Notizen | Eigene Gegenliste am Abnahmestand |
| E3 | Markdown, Tabellenalias, Frontmatter, Callouts, Aufgaben, Code und Bilder in Fixture geprüft; 111 reale Notizen erzeugen HTML ohne Warnungen | Vollständigkeit/Lesbarkeit von mindestens zehn Notizen im Browser; Render-Test ist keine visuelle Abnahme |
| E4 | Alle vereinbarten Stufen/Linkformen, Vorschläge, Mehrdeutigkeit, Anker und Rückverweise automatisiert; real 34 offene/mehrdeutige Vorkommnisse | Unabhängiger Abgleich dieser Übersicht und Rückverweise zur Projektnotiz; reale Klickwege |
| E5 | Fixture-Suche einschließlich NFC, Metadaten, Titelrang und Ausschlüssen; real Übergaben: 5 Treffer/2,80 ms, Anwesenheitstool: 13 Treffer/3,11 ms | Eigene Stichproben |
| E6 | Anlegen, Ändern, Umbenennen, Löschen, paralleler Refresh und gescheiterter Refresh geprüft; real 261,70 ms | Bedienung und Aktualisierung im Browser mit temporärer Kopie |
| E7 | Fixture-Manifest und reales Manifest inklusive versteckter Dateien unverändert; realer Git-Status identisch | Manifest vor/nach eigener Browsernutzung |
| E8 | Traversal, kodierte/absolute Pfade, Symlinks auch nach Austausch, versteckte Dateien, Ausschlüsse, aktive Inhalte, CSP, Origin-/Methodenschutz geprüft | Eigene Gegenproben und tatsächliche Browserausführung/DOMPurify |
| E9 | Defektes/unvollständiges/zyklisches Frontmatter, nicht UTF-8, leer und >2 MiB mit Hinweisen, kein Absturz | Visuelle Hinweise |
| E10 | TypeScript und 14 Prüfgruppen bestanden; LSP sieben Dateien/0 Diagnosen; README vorhanden | Saubere Installation und Prüfungen am Commit unabhängig wiederholen |
| E11 | Original-Regelpaar bytegleich; Ignore-Regeln vorhanden; `git init` durch Sandbox blockiert | Repository lokal anlegen, Stand committen und sauberen Status bestätigen; kein Commit vorhanden |

Der erste Versuch des rein lesenden Kurztests stoppte an einem Fehler in dessen unabhängiger Dateiliste: Dort fehlte NFC-Normalisierung bei Ausschlüssen. Der produktive Filter hatte `Tokens & Zugänge.md` bereits korrekt ausgeschlossen. Nach Korrektur der Gegenliste wurde derselbe Kurztest vollständig ausgeführt. Keine Inhalte oder Manifestdateien wurden gespeichert. Die Bestandszahlen weichen vom älteren Plan ab; dies ist die gemessene Momentaufnahme.

## Reproduzierbare Befehle

```bash
npm ci
npm run typecheck
npm test
npm run check:lsp
npm audit
npm start
```

`npm start` startet auf `http://127.0.0.1:3210`; der echte Serverstart ist für KI A offen. Der reine Build wurde ausgeführt. `npm test` braucht keinen Port. Der separate reale Lesetest steht in der README und gehört nicht zum automatisierten Testlauf.

## Konkretisierungen und Abweichungen

- Größenlimits: 2 MiB je Notiz (konfigurierbar), 64 MiB je Anhang. Große Notizen bleiben als Eintrag mit Hinweis sichtbar. Das war im Plan noch nicht zahlenmäßig bestimmt.
- Symbolische Links werden vollständig ausgeschlossen, auch interne. Das vereinfacht die gemeinsame Schutzgrenze; Hinweise stehen auf der Startseite. Am realen Kurztest entstand dadurch keine Abweichung zur sichtbaren Dateiliste.
- Zusätzliche Ausschlüsse ergänzen den verpflichtenden Standardausschluss, statt ihn versehentlich ersetzen zu können. Pfade, keine Glob-Muster.
- Roh-HTML wird als Text dargestellt; DOMPurify bereinigt zusätzlich im Browser. Externe Bilder werden zu Links, damit Lesen keine fremden Server kontaktiert.
- Callouts als lesbare Zitate mit Typbezeichnung, Aufgaben als statische Kästchen; kein Editierverhalten.
- Eigene Notiz-URLs verwenden Query-Parameter; Überschriften IDs aus NFC/Kleinschreibung/Leerzeichenersetzung. Blockanker öffnen nur die Notiz, wie vereinbart.

## Abhängigkeiten und Risiken

Drei Laufzeitpakete: markdown-it 15.0.3 (Markdown/Token-Erweiterung), yaml 2.9.1 (Frontmatter ohne Ausführung), DOMPurify 3.4.17 (zusätzliche Browserbereinigung). Entwicklung: TypeScript 7.0.2 (Compiler und LSP), @types/node 24 (passend zur Laufzeit). Lockfile maßgeblich. Keine Server-/UI-/Test-Frameworks. Auch der abschließende `npm audit` meldete 0 bekannte Schwachstellen. Saubere Installation mit `npm ci`, Typprüfung, 14/14 Tests und LSP liefen erfolgreich; AGENTS.md und CLAUDE.md sind bytegleich.

Offen sind die unabhängige Abnahme, tatsächliches Browserverhalten und Bastis Alltagsurteil. Nicht gegen Obsidian getestet. Kein atomarer Dateisystem-Snapshot und keine vollständige Isolation gegen einen bösartigen lokalen Prozess mit Schreibrechten; siehe README. Keine bekannte wesentliche Fehlfunktion aus den eigenen Prüfungen. Der Auftrag ist als implementierter Stand zur Prüfung übergeben, nicht als unabhängig abgenommen zu verstehen.

## Vollständige Liste der neu angelegten Dateien (Git-Fallback)

- `.gitignore`
- `.npmrc`
- `HANDOFF.md`
- `README.md`
- `config.example.json`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `public/index.html`
- `public/style.css`
- `src/client.ts`
- `src/config.ts`
- `src/main.ts`
- `src/markdown.ts`
- `src/server.ts`
- `src/vault.ts`
- `tests/app.test.ts`
- `scripts/language-check.mjs`
- `scripts/read-only-smoke.mjs`

Zusätzlich entstanden nur ignorierte lokale Ausgaben: `node_modules/`, `dist/`, `.npm-cache/` und das nach Bereinigung leere `.test-work/`. Die vorbestehenden AGENTS.md, CLAUDE.md und Skill-Verweise blieben unverändert.

Für KI A außerhalb dieser Sandbox, vor der Abnahme:

```bash
git init -b main
git add .gitignore .npmrc AGENTS.md CLAUDE.md HANDOFF.md README.md config.example.json package.json package-lock.json tsconfig.json public src tests scripts
git commit -m "Implement read-only AI Brain OS delivery 1"
git status --short
git rev-parse HEAD
```

Kein Remote anlegen. Danach den bezeichneten Commit unabhängig prüfen. Bis dahin ist E11 offen.

---

## Claudian-Update – 21.10.2026 · Lieferstand 4

### Implementiert

KI B: Codex (Umsetzung und eigene Prüfung). KI A: Claude Code (Planung und ausstehende unabhängige Prüfung). Auftraggeber: Basti.

Ziel: den vorhandenen 3D-Platzhalter durch eine lokale Platine aus dem bestehenden Index ersetzen. Grundlage ist R1 in der von KI A präzisierten Fassung sowie R2–R10 und G1–G6. Der ursprüngliche Planeinwand ist damit erledigt; keine weiteren wesentlichen Planeinwände.

- Graphprojektion aus dem Index: genau ein Chip pro Notiz, eine Bahn pro ungeordnetem Notizpaar; Ressourcenlinks separat in der Karte. Keine erneute Linkauflösung, kein zusätzlicher Dateibestand.
- Sockel nach Hauptordner, themenabhängige Farben, Größen nach Knotengrad; Tagesnotizen blass/ausblendbar.
- Rechtwinklige Bahnen mit eigenen Höhen und Anschlüssen, Türkis-Pink-Verlauf, Hover-/Auswahlhervorhebung. Instanzierte Chips und gemeinsame Liniengeometrie.
- Drehen, Zoomen, Notizkarte, Ressourcenlinks, Lesen in Faktenansicht und Rückkehr mit erhaltener Kamera; ergänzende Tastatursteuerung und Notizauswahl.
- Chronologisches Wachstum, Datenimpulse, langsames Drehen/Schweben, Bewegungsschalter und dynamische Beachtung reduzierter Bewegung.
- Lokales Three.js ohne Änderung der CSP. Wiederverwendbarer HTTP-Adapter für den isolierten Teststart.
- Reproduzierbare erfundene Testmenge sowie Anzeige von Aufbauzeit, laufender Bildrate und 10-s-Mittelwert.

Vollständige Dateiliste des uncommittierten Übergabestands:

| Datei | Änderung |
| --- | --- |
| `README.md` | Bedienung, Datenregeln, Datumsregel, Messmethode und Teststart |
| `HANDOFF.md` | diese Übergabe; frühere Übergaben bleiben erhalten |
| `package.json` | Three.js und TypeScript-Typen |
| `package-lock.json` | exakte Abhängigkeiten |
| `public/style.css` | Raum, Steuerung, Karte, responsive Darstellung |
| `src/client.ts` | lazy geladene Raumansicht, Navigation und Lebenszyklus |
| `src/main.ts` | Aufruf des gemeinsamen HTTP-Adapters |
| `src/server.ts` | geschützter Graph-Endpunkt und feste lokale Modulrouten |
| `src/vault.ts` | Dateiänderungszeit im Index für R6 |
| `src/graph.ts` (neu) | Projektion des Index in Raumdaten |
| `src/http.ts` (neu) | bisheriger Loopback-HTTP-Adapter, unveränderte Herkunftsprüfungen |
| `src/room-layout.ts` (neu) | deterministische Platzierung und Bahngeometrie |
| `src/room.ts` (neu) | Three.js-Ansicht, Interaktion und Messanzeige |
| `src/three.module.d.ts` (neu) | Typen für lokal ausgeliefertes Three.js-Modul |
| `scripts/room-fixture.mjs` (neu) | Generator ausschließlich unter `.test-work/` |
| `scripts/room-benchmark.mjs` (neu) | eigener Testserver auf 127.0.0.1:3211 |
| `tests/room.test.mjs` (neu) | unabhängige Zählung, Geometrie, Datum, Ressourcen, Schutz, Manifest |

### Getestet

Eigene Prüfung am uncommittierten Stand auf Basis von `adcc194143f8abc7a2e3b49d703a2c032e8f9ead`:

| Befehl | Ergebnis |
| --- | --- |
| `npm run typecheck` | bestanden |
| `npm test` | 28/28 bestanden; einschließlich aller 24 bisherigen Tests |
| `npm audit` | 0 Schwachstellen |
| `npm run check:lsp` | 12 TypeScript-Dateien, 0 Diagnosen; Exitcode 0 (`context canceled` beim regulären Shutdown) |
| `git diff --check` | bestanden |
| `node --check scripts/room-fixture.mjs` | bestanden |
| `node --check scripts/room-benchmark.mjs` | bestanden |
| `node --check tests/room.test.mjs` | bestanden |

R1: unabhängiger Vergleich der tatsächlichen Paare und Notizpfade mit dem Index; Gegenrichtung, wiederholte Links, Selbstverweise, fehlende/mehrdeutige Ziele, Ressourcen und ausgeschlossene Inhalte enthalten. R3: unabhängiger Vergleich kollinearer Intervalle mit positiver Überlappung, einschließlich gerundeter Float32-Koordinaten. Eine gezielt überlappende Testgeometrie wird vom Prüfer abgewiesen. Große Testmenge: 2.000 Notizen, 4.000 Bahnen; zusätzlich Hub mit 1.999 Nachbarn. R2: große Menge hat mindestens 10 Welteinheiten Mittelpunktabstand. G1: Testdatei-Manifeste mit SHA-256, Änderungszeiten und Dateiliste bleiben nach Indexierung und Graphabrufen unverändert.

Letzte Messung: Layoutberechnung der großen Testmenge **1,2 ms**, vorherige Indexierung **5.149,3 ms**, gesamte Testsuite ca. 5,8 s. Diese Messungen sind **keine WebGL-Aufbau- oder FPS-Messung**. Die Indexierung erfolgt vor Start des HTTP-Servers; sie erfüllt keine hypothetische Zwei-Sekunden-Grenze für den gesamten Prozessstart. R8 wird als Aufbau des Raums aus dem bereits vorhandenen Index gemessen.

### Offen / Nächster Block

Keine unabhängige Abnahme erfolgt. Gemäß Auftrag bleiben Oberfläche und Commit bei KI A. Kein Browser gestartet, kein Port geöffnet, kein Dienst beendet, kein `launchctl` oder `scripts/access.mjs` aufgerufen. Kein Test am echten Gedächtnis; dort auch keine Manifestmessung durchgeführt. Das echte Gedächtnis wurde nur zur Anforderungslektüre gelesen.

KI A prüft insbesondere:

1. Aus dem unveränderten Übergabestand committen (Codex als Umsetzer nennen), genau diesen Commit prüfen und den Dienst selbst aktualisieren. Aktuell laufender Dienst ist nicht aktualisiert.
2. `npm run build` und `node scripts/room-benchmark.mjs`; Browser auf `http://127.0.0.1:3211/?view=3d`. Daten bleiben erfunden im ignorierten `.test-work/room-*`. Start/Bindung und Browser-Importe wurden hier nur durch portlose Assettests vorbereitet, nicht als echter Serverstart geprüft.
3. R8 nach README messen: mindestens 30 Bilder/s mit Testmenge, mindestens 50 Bilder/s im echten Bestand und Raumaufbau unter 2 Sekunden. Aufbauzähler endet nach dem ersten Render-Aufruf, kein GPU-Timing. Zahlen sind noch **offen**. Keine Aussage über Hardwareleistung aus der reinen Layoutzeit ableiten.
4. R2/R3 visuell: lesbare Sockel, passende Abstände/Farben, vollständige hervorgehobene Bahnen, Auswahl und Hover auch bei großer Menge. Unterschiedliche geometrische Abschnitte können bei Übersicht in dieselben Bildschirmpixel fallen; Unterscheidbarkeit bei Auswahl/Zoom muss visuell abgenommen werden.
5. R4: Pointer/Trackpad/Tastatur, Notizkarte einschließlich Ressourcen, Lesen derselben Notiz, Kamera bei Rückkehr, Browser Vor/Zurück, Aktualisierung und WebGL-Ausfall.
6. R5–R7/R9: Tagesnotizen, Datumssortierung im Wachstum, Stoppen/Alle zeigen, Bewegung aus, Systemeinstellung während Nutzung ändern, Hell/Dunkel/System, schmale Fenster. Automatisierte Prüfungen ersetzen keine Browserprüfung dieser Interaktionen.
7. G1/G2/G3: reales Manifest vor/nach Browsernutzung, lokale Netzwerkrequests/CSP, Diffprüfung auf private Inhalte vor Push. Testmanifeste und unveränderte CSP sind bereits belegt.
8. R10 bleibt Bastis Urteil.

### Technische Notizen

- Basis: `adcc194143f8abc7a2e3b49d703a2c032e8f9ead` auf `main`, plus oben gelisteter uncommittierter Diff. Kein Git-Schreibversuch: `.git` ist laut Laufumgebung nur lesbar und der Auftrag weist den Commit KI A zu.
- Neue direkte Abhängigkeiten: `three@0.186.1` (MIT) für GPU-Instanzierung, Kamera und Picking; `@types/three@0.186.0` als Entwicklungsabhängigkeit. Sechs transitive Pakete der Typabhängigkeit sind im Lockfile erfasst. Keine weiteren direkten Pakete.
- Keine Änderungen an AGENTS.md, CLAUDE.md, Konfiguration oder Gedächtnis. Keine Lockerung der CSP.
- Kleine konkretisierte Gestaltungsentscheidungen: zusätzlicher Wurzel-Sockel; eigene Bahnanschlüsse und Höhen statt des überlappenden Routings der Skizze; gemeinsames Schweben von Chips und Bahnen hält Anschlüsse zusammen; keine Vorschläge/Netzwerk-Umschaltung aus der Skizze übernommen, da außerhalb Lieferstand 4. Datumsfallback und Messgrenzen stehen in README.
- Kamera und Raumzustand gelten nur für dieselbe Browserseite. Es gibt keine dauerhafte Kameraspeicherung. Der Index bleibt die einzige Datenquelle; Testdaten und Prüfergebnisse enthalten kein reales Wissen.

---

## Claudian-Update – 21.10.2026 · Lieferstand 4, Korrekturrunde 1

### Implementiert

KI B: Codex. KI A: Claude Code, unabhängige Nachprüfung ausstehend. Basis ist der saubere Commit `9252902654d79ccb36fc0fce5643a2c0542b17f2`.

- **F1:** Direkte Referenzen auf die 2.000 Auswahloptionen statt wiederholter Zugriffe über die lebende `select.options`-Sammlung. Optionen werden in einem Fragment eingefügt, `disabled` nur bei tatsächlicher Änderung gesetzt. Dies beseitigt einen plausiblen browserabhängigen Aufwand im Aufbaupfad; die konkrete Ursache der von KI A gemessenen 17.788 ms ist ohne Browserprofil nicht abschließend bewiesen. Farben für die fünf Verlaufspunkte werden pro Aktualisierung statt pro Vertex erzeugt. Die Canvas-Texturen und deren erneute Erzeugung nach Font-Laden entfallen. Positionspuffer und Nachbarschaftslisten entstehen in einem getrennt messbaren Modul.
- **F2:** Alternative zur unpraktikablen Darstellung aller Bahnen mit sichtbarem Mindestabstand: Jede Verbindung lässt sich einzeln verfolgen. Genau eine Bahn wird in Bildschirmkoordinaten als vollständig deckende 3-px-Spur mit 9-px-Hintergrundkontur über dem Kontextnetz gezeichnet. Alle anderen Bahnen bleiben deutlich gedimmt; die übrigen zur fokussierten Notiz gehörenden Bahnen bleiben stärker als der restliche Kontext. Vorige/Nächste sowie „Bahn verfolgen“ in der Karte erschließen alle sichtbaren Nachbarn. Beide Endpunkte werden beschriftet. Die ursprünglichen, formal getrennten Bahnabschnitte bleiben erhalten. Für die Kontextbahnen wird **kein sichtbarer Mindestabstand** behauptet.
- **F2 Beschriftung/Körper:** Sockelnamen, fünf meistverknüpfte Notizen und fokussierte Endpunkte erhalten 14 CSS-Pixel große Bildschirmbeschriftungen mit Hintergrund und Zuordnungslinie. Überlappungen werden beim Platzieren verschoben. Chipkörper sind nun 2,5 Einheiten hoch und 3,5–6 Einheiten breit, abhängig vom Knotengrad; der Abstand bleibt mindestens 4 Einheiten. Beleuchtung reduziert, damit die Ordnerfarbe nicht so stark aufgehellt wird.
- **F3:** 3D nutzt die volle Anwendungsbreite bei 72 vh Bühnenhöhe; die Navigation wird in diesem Modus ausgeblendet und bleibt in Fakten erreichbar. Die Notizkarte steht außerhalb der Bühne darunter und verdeckt sie nicht.
- Optionaler Hinweis umgesetzt: Testserver entfernt bei Ctrl+C/SIGTERM nach dem Start und bei Startfehlern ausschließlich sein eigenes erzeugtes Test-Gedächtnis. SIGKILL kann weiterhin Reste hinterlassen.

Geänderte Dateien (vollständig):

- `README.md`: neue Darstellung, Messung, Aufräumen und CPU-Profil erläutert; überholte Angaben zu Chipgröße und Canvas-Texturen korrigiert.
- `HANDOFF.md`: diese Übergabe.
- `public/style.css`: große Bühne, Karte außerhalb, Bildschirmoverlay.
- `src/client.ts`: Modusklasse für die große Bühne.
- `src/room-layout.ts`: größere Chipkörper und passende Anschlusshöhe.
- `src/room.ts`: DOM-Optimierung, Attribute, Einzelverfolgung, Beschriftung, Instrumentierung.
- `src/room-data.ts` (neu): messbarer Positionspuffer, Nachbarschaften, Hubs, Auswahl einer isolierten Bahn.
- `src/server.ts`: feste lokale Route für das neue Modul.
- `scripts/room-benchmark.mjs`: gezieltes Aufräumen.
- `scripts/room-profile.mjs` (neu): fünf CPU-Messungen am normalen Index mit erfundenen Daten; abschließendes Aufräumen.
- `tests/room.test.mjs`: zusätzliche Modulroute und Regressionstest für Positionspuffer/Einzelverfolgung.

### Getestet

Eigene Prüfung:

- `npm run typecheck`: bestanden.
- `npm test`: 29/29 bestanden, alle bisherigen Tests erhalten. Der neue Test prüft die exakten Float32-Renderpositionen, das Durchschalten aller 1.999 Bahnen eines Hubs in beide Richtungen, leeren Fokus und Filterung ausgeblendeter Ziele. Die bisherigen Zähl- und Überlappungstests mit 2.000 Notizen/4.000 Bahnen bleiben grün.
- `npm audit`: 0 Schwachstellen.
- `npm run check:lsp`: 13 TypeScript-Dateien, 0 Diagnosen; reguläres `context canceled` beim Shutdown.
- `node --check scripts/room-benchmark.mjs`, `node --check scripts/room-profile.mjs`: bestanden.
- `git diff --check`: bestanden.
- `npm run build` (durch Tests) und `node scripts/room-profile.mjs`: bestanden.

CPU-Profil mit 2.000 erfundenen Notizen und 4.000 Bahnen, fünf aufeinanderfolgenden Läufen im selben Node-Prozess:

| Phase | erster Lauf | Spanne aller fünf Läufe |
| --- | ---: | ---: |
| Graphprojektion aus Index | 2,26 ms | 1,39–2,26 ms |
| Layout | 1,29 ms | 0,44–1,29 ms |
| Positionspuffer, Nachbarschaften und Hubs | 0,85 ms | 0,48–0,87 ms |

Puffergröße: 32.000 Vertices. Vorherige Indexierung: 5.105,99 ms, weiterhin außerhalb des Raumaufbauzählers. Das Profil verwendet die tatsächlichen Funktionen der Anwendung, **misst jedoch weder DOM noch Three.js-Renderer, GPU-Upload, Instanzmatrizen oder Browserframe**. Es bestätigt deshalb nicht die Zwei-Sekunden-Grenze.

Die Browseranzeige „Aufbau“ behält Start und Ende der bisherigen Messung bei und schließt jetzt auch das Zeichnen des Bildschirmoverlays ein. Zusätzliche Teilzeiten: Layout, Puffer, DOM, Renderer-Konstruktion und kumulierte Vorbereitung der Instanz-/Linienattribute. Letzterer Wert wächst bei weiteren Interaktionen; der Aufbauwert bleibt fest.

### Offen / Nächster Block

**F1 ist noch nicht durch eine Browsermessung geschlossen.** Der optimierte Stand muss mit `npm run build` / `node scripts/room-benchmark.mjs` auf Port 3211 erneut geöffnet werden. KI A protokolliert Aufbau und Teilzeiten für 2.000/4.000 sowie die Bildrate. Die vorherigen 17.788 ms und die realen 1.804 ms stammen aus KI As Prüfung des Ausgangsstands, nicht aus einer Messung dieser Korrektur.

**F2/F3 benötigen visuelle Nachprüfung:** Lesbarkeit der 14-px-Namen, Chipkörper und Ordnerfarben, vollständige isolierte Spur trotz Kreuzungen, direkte Bahnauswahl, große Bühne und Karte unterhalb. Bei sehr langen Namen oder sehr kleinen Fenstern können Bildschirmbeschriftungen weiter überlappen oder am Rand abgeschnitten werden; dies ist keine automatisch geprüfte Kollisionsfreiheit. Auch die Bildrate der neuen Overlayzeichnung ist im Browser offen. Testserverstart/Signal-Aufräumen wurden syntaktisch, nicht durch Öffnen eines Ports geprüft.

Keine unabhängige Abnahme behauptet. Kein laufender Dienst beendet/aktualisiert, keine `launchctl`- oder Access-Skript-Aufrufe, keine Schreibzugriffe auf Gedächtnis oder `.git`. Keine Browserprüfung in dieser Runde. Alle Tests verwenden erfundene Daten im Anwendungsordner.

### Technische Notizen

Uncommittierter Diff auf `9252902654d79ccb36fc0fce5643a2c0542b17f2`, vollständige Dateiliste oben. Kein Commit. Keine neuen Abhängigkeiten, keine Lockfileänderung, keine CSP-Lockerung. AGENTS.md und CLAUDE.md unverändert. Die Einzelverfolgung ist die ausdrücklich angebotene alternative Darstellungsregel für F2b; der Graph selbst und seine Zählung werden nicht reduziert.
