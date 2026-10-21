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
