# Changelog

All notable changes to this project will be documented in this file.

## [1.8.0] - 2026-03-06
### Improved
- **Clair Mobile Optimization:** Enhanced Clair AI chat for mobile devices with improved viewport and keyboard handling using the `visualViewport` API. Added dynamic CSS variables for responsive height calculations and Safe-Area inset support.
- **Mobile Touch Targets:** Increased all touch targets in Clair to minimum 44px for better mobile usability. Optimized footer padding and disclaimer styling to ensure no content is clipped on smartphone screens (390x844 viewport).
- **Responsive Breakpoint:** Introduced 900px breakpoint specifically for Clair mobile layout with slide-from-bottom animation and dynamic panel height based on available viewport space.
### Fixed
- **Desktop CSS Isolation:** Fixed an issue where the mobile-only `overflow: hidden` rule was being applied globally, interfering with desktop components (e.g., sliders) when Clair was open. Now correctly scoped to mobile viewports only.
- **Keyboard Handling:** Improved iOS keyboard detection to prevent panel from being pushed above viewport when keyboard appears during chat.

## [1.7.9] - 2026-03-06
### Fixed
- **Auth Guard Stability:** Resolved an issue where users were "immediately kicked out" after login. The session validation is now more resilient against transient server errors and handles incomplete local data gracefully.
- **Database Optimization:** Optimized organization database connections to prevent redundant migrations and potential race conditions during high-concurrency requests.
- **Robust Configuration API:** The `/api/config` endpoint now handles invalid or malformed identifiers without crashing, ensuring reliable application startup.

## [1.7.8] - 2026-03-06
### Fixed
- **Critical Privacy Isolation:** Fixed a major issue where Claire chat history and local data were shared between accounts with the same User ID (e.g., users in different companies).
  - **Isolated Chat History:** Chat logs are now keyed by both `company_id` and `user_id`.
  - **Isolated Category Cache:** Category suggestions are now strictly separated per organization.
  - **Isolated Local Index:** The IndexedDB database for transactions is now uniquely named per company (`clarityIndex_[companyId]`).

## [1.7.7] - 2026-03-06
### Fixed
- **Version Management:** Fixed an issue where the application version was incorrectly displayed as "v0.0.0". The `/api/config` endpoint now correctly returns the application version from `package.json`.
- **User Preferences:** Implemented proper fetching and saving of user configuration (nickname, currency, language, AI tone) in the `/api/config` endpoints, replacing previous mock data.

## [1.7.6] - 2026-03-06
### Fixed
- **Login Response Structure:** Resolved "Server-Fehler beim Login" by wrapping the login response in a `{ user: ... }` object as expected by the frontend `auth.js`.
- **User Onboarding & Signup:** Implemented the missing `/api/users/signup` and `/api/users/change-password` endpoints.
- **Enhanced Password Security:** Added `must_change_password` support to the `users` table and API. Resetting a password now forces the user to choose a new one on their next login.

## [1.7.5] - 2026-03-06
### Fixed
- **Multi-Turn Vision Logic:** Die Behaltensdauer von Bild-Daten im aktiven KI-Kontext wurde von 2 auf 10 Gesprächsrunden erhöht. Dies löst das Problem, bei dem Claire in Folgefragen behauptete, das zuvor hochgeladene Bild nicht mehr sehen zu können.

## [1.7.5] - 2026-03-06
### Fixed
- **Login API Mismatch:** Fixed a server error during login by synchronizing the backend endpoint with the frontend. The login API is now consistently available at `/api/users/login`.

## [1.7.4] - 2026-03-06
### Improved
- **AI Vision Precision:** Die maximale Bildauflösung beim Upload wurde auf 1200px erhöht, um die OCR-Qualität bei kleingedruckten Belegen zu verbessern.
- **Efficient Context Management:** Um Token-Limits zu sparen und die Aufmerksamkeit der KI zu bündeln, wird das Bild-Base64 nun nur noch im relevanten Gesprächskontext übertragen und in älteren Verläufen durch Platzhalter ersetzt.
- **Forceful Identity Enforcement:** Der [OCR MODE: CRITICAL] Befehl erzwingt nun die Nutzung der Bilddaten und unterbindet Verweigerungen ("Ich sehe nichts") durch doppelte Absicherung im System-Prompt.

## [1.7.4] - 2026-03-06
### Improved
- **AI Vision Core (Llama 3.2 11B):** Umstellung auf `Llama 3.2 11B Vision` als primäres Modell für maximale Stabilität bei der Texterkennung (OCR).
- **Aggressive Identity Enforcement:** Die KI wurde mit noch strikteren Anweisungen versehen, ihre Vision-Fähigkeiten nicht zu verleugnen, wenn Bilder im Verlauf vorhanden sind.
### Fixed
- **Missing Auth Routes:** Implemented missing GET routes for `/login`, `/signup`, and `/register-company` to ensure direct browser access to authentication and registration pages.

## [1.7.3] - 2026-03-06
### Fixed
- **Missing Logout Route:** Implemented the missing `/logout` route on the server to correctly serve the logout page and clear local session data.

## [1.7.2] - 2026-03-06
### Fixed
- **Budget Data Availability:** Fixed the "Error loading budgets" issue by implementing the missing `/api/categories/stats` and `/api/categories/:name/budget` endpoints.
- **Insights View RBAC:** Updated the Insights view to correctly pass `requester_id` for role-based authorization when loading and saving budget data.
- **Budget Modal Stability:** Fixed a JavaScript error in the budget modal where category identifiers were not properly quoted in the generated HTML.

## [1.7.1] - 2026-03-06
### Improved
- **AI Vision Stabilization (Scout & Llama 3.2):** Umstellung auf `Llama 4 Scout` und `Llama 3.2 11B Vision` als kombinierte Vision-Flaggschiffe. Maverick wurde aus der Vision-Pipeline entfernt, da es in der aktuellen API-Version keine Bilder mehr unterstützt.
- **Strict OCR Guardrails:** Claire wurde mit einer [SYSTEM: OCR MODE ACTIVE] Anweisung versehen, die Verweigerungen ("Ich kann keine Bilder sehen") endgültig unterbindet und direkte Datenextraktion erzwingt.

## [1.6.13] - 2026-03-06
### Fixed
- **Index Sync Engine:** Fixed a critical bug where the `IndexManager` reported 0 transactions despite data being present on the server. The `/api/transactions` endpoint now correctly returns the `{ eintraege: [] }` structure and supports `limit`, `offset`, and `id_gt` for paginated and incremental indexing.
- **Server-Side Index Status:** Updated `/api/transactions/index-status` to include `latest_id`, enabling robust staleness checks.
- **Deletion Sync:** Implemented the missing `/api/transactions/ids` endpoint, allowing the client to clean up local data when transactions are deleted from the server.

## [1.7.0] - 2026-03-06
### Added
- **Enhanced RBAC & Access Control:** New `authPage` middleware for direct HTML navigation. Non-admins are now automatically redirected to a dedicated "Access Denied" (403) page instead of receiving raw JSON errors.
- **Dedicated Access Denied Page:** Implemented `403.html` for a better user experience when permissions are insufficient.
- **Admin API Completion:** Implemented missing backend endpoints for the Admin Panel:
  - User Management (Update Role, Delete User, Reset Password)
  - Invite System (Generate & List Invites, Validate Codes)
  - Standardized Audit Log access with pagination and search.
- **Flexible Requester Validation:** The API now supports both `user_id` and `requester_id` for identity verification, ensuring compatibility across all client-side modules.

## [1.6.13] - 2026-03-06
### Fixed
- **AI Context Stability:** Ein Fehler wurde behoben, bei dem der Chat abstürzte (`TypeError: forEach`), wenn die Datenbank keine aktuellen Transaktionen oder Kategorien zurücklieferte. Die Erstellung der Datenbank-Zusammenfassung ist nun robuster gegen leere Datensätze.

## [1.6.12] - 2026-03-06
### Improved
- **AI Vision Engine (Maverick):** Umstellung auf `Llama 4 Maverick` als primäres Vision-Modell für überlegene OCR-Fähigkeiten.
- **Stabilized OCR Workflow:** Claire hat nun eine noch striktere Anweisung, bei Rechnungen sofort Daten zu extrahieren und das `add_transaction` Werkzeug zu nutzen, ohne vorherige Bestätigungsschleifen oder Suchvorgänge.

## [1.6.11] - 2026-03-06
### Improved
- **AI OCR Data Extraction:** Claire hat nun eine dedizierte Anweisung, Daten aus Bildern (wie Name, Betrag, Datum) direkt zu extrahieren und das `add_transaction` Tool ohne vorherige Suche zu nutzen. Dies stabilisiert den Workflow beim Verbuchen von Rechnungs-Fotos.

## [1.6.10] - 2026-03-06
### Fixed
- **Server Startup:** Ein Syntax-Fehler (`hasImage` double declaration) wurde behoben, der den Serverstart verhinderte.

## [1.6.9] - 2026-03-06
### Fixed
- **Multi-Turn Vision Stability:** Ein kritischer Fehler wurde behoben, bei dem Claire den Bild-Kontext in Folgefragen verlor. Das System nutzt nun auch für die Antwortgenerierung (Follow-Up) Vision-fähige Modelle (`GPT-OSS 120B`), sobald ein Bild im Verlauf vorhanden ist.
- **Vision Model Upgrade:** `GPT-OSS 120B` wurde als primäres Modell für komplexe Bildanalysen und Tool-Steuerung integriert.

## [1.6.8] - 2026-03-06
### Improved
- **AI Vision Context Reinforcement:** Der Vision-Hinweis wird nun sowohl am Anfang als auch am Ende des System-Prompts eingefügt, um die Aufmerksamkeit der KI in längeren Verläufen stabil zu halten.
- **Client-Side Image Compression:** Bilder werden nun vor dem Upload automatisch auf maximal 800px skaliert und komprimiert. Dies spart Bandbreite, reduziert die Latenz und verbessert die Erkennungsrate durch standardisierte Bildgrößen.

## [1.6.7] - 2026-03-06
### Improved
- **AI Vision Instruction Priority:** Der Vision-Hinweis wurde an die oberste Stelle des System-Prompts verschoben, um die Aufmerksamkeit der KI maximal auf den Bildinhalt zu lenken.
- **Enhanced Debugging:** Multi-modale Payloads werden nun strukturiert im Server-Log erfasst, um die Kommunikation mit den Vision-Modellen besser validieren zu können.

## [1.6.6] - 2026-03-06
### Fixed
- **AI Hallucination Guard:** Ein Problem wurde behoben, bei dem Claire den Bildinhalt zwar korrekt beschrieb, aber im nächsten Satz behauptete, keine Bilder sehen zu können. Der System-Prompt wurde verschärft, um diese widersprüchlichen Aussagen zu unterbinden.

## [1.6.5] - 2026-03-06
### Fixed
- **Vision Availability:** Korrektur der Modell-IDs für Groq (Llama 4 Scout als primäres Vision-Modell).
- **Vision Instruction Tuning:** Dynamischer System-Prompt-Zusatz (`[VISION MODE ACTIVE]`), wenn ein Bild übertragen wird, um Claire zur Analyse des Bildinhalts zu forcieren und Verweigerungen ("Ich kann keine Bilder sehen") zu eliminieren.

## [1.6.4] - 2026-03-06
### Improved
- **AI Vision Reliability:** Claire wurde explizit in ihrem System-Prompt auf ihre Bildverarbeitungs-Fähigkeiten hingewiesen, um "Halluzinationen" (Aussagen, sie könne keine Bilder sehen) zu vermeiden.
- **Model Tuning:** Bevorzugte Nutzung von `llama-3.2-11b-vision-instruct` für stabilere OCR-Ergebnisse und schnellere Analyse von Belegen.

## [1.6.3] - 2026-03-06
### Fixed
- **Vision Model Migration:** Aktualisierung der Groq-Modelle auf die neueste Generation (`Llama 4 Scout` & `Llama 3.2 Vision Instruct`), da ältere Preview-Modelle deaktiviert wurden.
- **Robust Multi-Modal Fallback:** Ein Fehler wurde behoben, bei dem der Chat abstürzte, wenn eine Bild-Anfrage auf ein Text-Modell (Fallback) zurückfiel. Das System bereinigt nun automatisch Bild-Metadaten für reine Text-Modelle.

## [1.6.2] - 2026-03-06
### Added
- **Global Drag & Drop:** Claire öffnet sich nun automatisch, wenn eine Datei (z.B. ein Beleg) über das Browserfenster gezogen wird.
- **Visual Dropzone:** Ein neues visuelles Overlay ("Hier ablegen") im Chat-Panel gibt klares Feedback während des Drag-Vorgangs.

## [1.6.1] - 2026-03-06
### Fixed
- **AI Image Analysis:** Ein `PayloadTooLargeError` wurde behoben, der auftrat, wenn größere Bilder in den Chat hochgeladen wurden. Das Server-Limit wurde auf 50MB angehoben.

## [1.6.0] - 2026-03-06
### Added
- **AI Image Support (Vision):** Claire unterstützt nun das Anhängen von Bildern (z.B. Rechnungen, Belegen).
- **Drag & Drop UI:** Dateien können einfach per Drag & Drop in das Chat-Panel gezogen oder über ein neues Büroklammer-Icon ausgewählt werden.
- **Multi-Modal Processing:** Integration von `llama-3.2-11b-vision` im Backend zur Analyse von Bildinhalten (OCR / Beleg-Auswertung).

## [1.5.9] - 2026-03-06
### Fixed
- **AI Data Access (Reporting):** Ein Problem wurde behoben, bei dem Claire behauptete, keinen Zugriff auf Finanzdaten für spezifische Zeiträume (z.B. Q3 2025) zu haben. Das Tool `get_spending_analysis` wurde erweitert, um nun auch Quartale und frei definierbare Zeiträume (`period`) verarbeiten zu können.

## [1.5.8] - 2026-03-06
### Added
- **AI Upgrade (Paket D - Safety, Governance & Trust):**
  - **Prompt Hardening:** Einführung von Schutzmechanismen gegen Prompt-Injection und System-Prompt-Leaks im KI-Kern. Claire lehnt nun Versuche ab, ihre internen Anweisungen preiszugeben.
  - **Policy Layer:** Ein neuer Sicherheits-Layer im System-Prompt definiert klare Antwortregeln für sensible Aktionen und erzwingt eine strikte Datenzugriffs-Policy für die aktuelle Organisation und den Nutzer.
  - **Action Guardrails:** Erhöhte Sensibilisierung bei Löschvorgängen und Massen-Operationen durch explizite Bestätigungsvorgaben.

## [1.5.7] - 2026-03-06
### Improved
- **AI Upgrade (Paket C - Memory & Personalization):**
  - **Conversation Continuity:** Der System-Prompt von Claire wurde optimiert, um den gesamten bisherigen Chat-Verlauf stärker zu gewichten und Antworten kohärenter an vorherige Aussagen anzupassen.
  - **Attachment-Aware Reasoning:** Bei angehängten Transaktionen erhält Claire nun den vollständigen Daten-Kontext (ID, Kategorie, exaktes Datum). Ein striktes `[BEREITS IN DATENBANK]`-Flag verhindert zudem, dass Claire fälschlicherweise versucht, angehängte Transaktionen erneut zu buchen, sondern deren Daten nur für Analysen und Antworten nutzt.

## [1.5.6] - 2026-03-06
### Changed
- **Unified Support Channel:** Die Konfiguration der Support-E-Mail wurde aus dem Admin-Panel entfernt. Das System nutzt nun konsistent die in der `.env`-Datei definierten Werte (`SUPPORT_EMAIL_RECEIVER` oder `SMTP_USER`), um eine einheitliche Support-Infrastruktur für alle Organisationen zu gewährleisten.

## [1.5.5] - 2026-03-06
### Added
- **Developer Tools: Automated Repair:** Der Konsistenzscan wurde um eine automatisierte Reparaturfunktion erweitert. Administratoren können nun gefundene Probleme (0-Euro-Beträge, fehlende Kategorien, Zukunfts-Daten) mit einem Klick einzeln oder gesammelt ("Repair All") beheben.
- **Backend Repair Engine:** Neuer API-Endpunkt `/api/transactions/consistency-repair` zur sicheren Durchführung von Korrektur-Operationen inklusive Audit-Logging.

## [1.5.4] - 2026-03-06
### Fixed
- **AI Chat Timestamps:** Ein Fehler wurde behoben, bei dem im Chat-Verlauf von Claire immer die aktuelle Uhrzeit statt des tatsächlichen Sendezeitpunkts angezeigt wurde. Zeitstempel werden nun korrekt aus dem Verlauf geladen und konsistent gespeichert.

## [1.5.3] - 2026-03-06
### Improved
- **Smart Reply Fallback:** Wenn das E-Mail-Feld im Support-Formular leer gelassen wird, nutzt das System nun automatisch die E-Mail-Adresse des aktuell angemeldeten Benutzers für Antworten.
- **Simplified Email Template:** Die Support-E-Mails wurden für eine bessere Lesbarkeit optimiert, da nun immer eine gültige Antwort-Adresse vorhanden ist.

## [1.5.2] - 2026-03-06
### Added
- **Optional Reply Email:** Nutzer können nun optional eine E-Mail-Adresse im Support-Formular angeben.
- **Improved Reply Workflow:** Wenn eine Kontakt-E-Mail angegeben wird, wird diese automatisch als `replyTo` gesetzt, sodass Admins direkt aus ihrem E-Mail-Programm antworten können.
- **Anonymous Support Support:** Anfragen ohne Kontakt-E-Mail sind weiterhin möglich, werden aber im System deutlich als "nicht antwortbar" markiert.

## [1.5.1] - 2026-03-06
### Added
- **Configurable Support Email:** Administratoren können nun in den "Organization Settings" eine eigene Ziel-E-Mail-Adresse für Support-Anfragen hinterlegen.
- **Dynamic Routing:** Support-Anfragen werden automatisch an die organisationsspezifische E-Mail-Adresse geroutet, mit automatischem Fallback auf System-Standardwerte.

## [1.5.0] - 2026-03-06
### Added
- **Support Email Integration:** Die Support-Seite kann nun echte E-Mails über SMTP versenden. Anfragen werden automatisch dem richtigen Nutzer und Unternehmen zugeordnet.
- **SMTP Fallback (Demo Mode):** Wenn kein SMTP-Server konfiguriert ist, werden Support-Anfragen zur Demonstration in der Server-Konsole protokolliert.
- **Improved UX:** Der Sendevorgang auf der Support-Seite zeigt nun einen Ladezustand und detailliertes Feedback (Erfolg/Fehler) an.

## [1.4.4] - 2026-03-06
### Fixed
- **Sync Fix (RBAC):** Ein Fehler wurde behoben, durch den der IndexManager aufgrund fehlender Berechtigungs-IDs (`requester_id`) keine Status-Updates vom Server abrufen konnte. Dies führte zu dauerhaften "Out of sync"-Meldungen trotz Reindexing.
- **API Security:** Der Endpunkt für den ID-Abgleich (`/api/transactions/ids`) ist nun ebenfalls durch die `isAdmin`-Middleware geschützt.

## [1.4.3] - 2026-03-06
### Improved
- **Sync Robustness:** Die Synchronisationslogik des IndexManagers wurde gehärtet. Er erkennt nun auch Änderungen, bei denen die Anzahl der Datensätze gleich bleibt, aber Inhalte (IDs) variieren (z.B. gleichzeitiges Löschen und Hinzufügen).
- **Metadata Auto-Correction:** Nach jedem Deletion-Sync werden die lokalen Metadaten (`latest_id`) nun zwingend mit dem Server abgeglichen, um "Out of sync"-Meldungen in den Dev-Tools zu vermeiden.

## [1.4.2] - 2026-03-06
### Fixed
- **Sync Status Consistency:** Ein Anzeigefehler in den Dev-Tools wurde behoben, bei dem der Index fälschlicherweise als "Out of sync" markiert wurde, obwohl die Anzahl der Datensätze übereinstimmte. Die Vergleichslogik ist nun robuster gegenüber Datentyp-Unterschieden bei IDs.
- **Improved Deletion Sync:** Der IndexManager aktualisiert nun nach einer lokalen Bereinigung (Deletion Sync) seine Metadaten direkt vom Server, um sofortige Konsistenz zu gewährleisten.

## [1.4.1] - 2026-03-06
### Improved
- **Smart Incremental Indexing:** Das Indexing-System wurde optimiert, um bei Löschvorgängen keinen vollständigen Rebuild mehr zu benötigen. Ein neuer ID-Sync-Mechanismus erkennt gelöschte Transaktionen auf dem Server und bereinigt den lokalen Index gezielt.
- **Efficient Deletion Tracking:** Neuer API-Endpunkt `/api/transactions/ids` liefert kompakte ID-Listen für performante Integritätschecks.

## [1.4.0] - 2026-03-06
### Added
- **RBAC v1 (Server-Side Security):** Vollständige technische Durchsetzung von Rollenrechten im Backend. Kritische Endpunkte (User-Verwaltung, Audit-Logs, Einladungen, Dev-Tools) sind nun durch eine neue `isAdmin`-Middleware geschützt.
- **Requester Validation:** Alle administrativen API-Calls validieren nun die Identität und Rolle des anfragenden Nutzers (`requester_id`), um unbefugten Zugriff auf Organisationsdaten zu verhindern.
- **Enhanced Category Security:** Das Erstellen, Bearbeiten und Löschen von Kategorien sowie Budget-Anpassungen sind jetzt exklusiv Administratoren vorbehalten.

## [1.3.0] - 2026-03-06
### Added
- **Admin Panel Performance:** Infinite Scroll für die Mitarbeiter- und Audit-Listen implementiert, um auch große Organisationen performant zu verwalten.
- **Advanced Filtering:** Neue Such- und Filterfunktionen für das Audit-Log und die Mitgliederverwaltung.
- **Scalable API:** Unterstützung für Pagination (limit/offset) und serverseitige Suche in den Admin-Endpunkten.

## [1.2.5] - 2026-03-06
### Fixed
- **Startup Issue:** Ein Syntaxfehler im KI-System-Prompt (nicht maskierte Backticks), der den Server-Start verhinderte, wurde behoben.

## [1.2.4] - 2026-03-06
### Added
- **Company Context Profiles:** Administratoren können nun im Admin Panel ein Organisationsprofil bzw. spezifische Regeln hinterlegen (z. B. "Wir sind ein Tech-Startup", "Mittagsbudget beträgt 50€"). Claire liest diesen Kontext bei jeder Anfrage aus und passt ihre Beratung und Analysen an die Unternehmenskultur und -vorgaben an.

## [1.2.3] - 2026-03-06
### Added
- **Multi-Currency Support:** Claire beherrscht nun echte Währungsumrechnungen. Basierend auf den Nutzerpräferenzen werden Finanzdaten in Echtzeit mittels der Frankfurter API (EZB-Daten) umgerechnet. Dies betrifft sowohl die Chat-Zusammenfassungen als auch die detaillierten Spending-Analysen.
- **Currency Caching:** Um die Performance zu optimieren, werden Wechselkurse serverseitig für eine Stunde zwischengespeichert.

## [1.2.2] - 2026-03-06
### Added
- **User Preference Memory:** Nutzer können nun in den Einstellungen ihre bevorzugte Währung, Sprache und den Antwort-Stil (Tonalität) von Claire anpassen. Diese Präferenzen werden dauerhaft gespeichert und fließen direkt in den Kontext der KI-Interaktionen ein.

## [1.2.1] - 2026-03-06
### Improved
- **Intent Router v2:** Der System-Prompt wurde optimiert, um Claire eine klarere Logik für die Werkzeugwahl (Tool Routing) zu geben. Sie unterscheidet nun präziser zwischen Buchungen, Analysen, Filtern und Löschvorgängen.

## [1.2.0] - 2026-03-06
### Added
- **Major Feature Update: Insights & Intelligence:**
  - **Category Assistant (Preview):** Vorbereitungen für intelligente Kategorie-Vorschläge.
  - **Smart Alerts:** Proaktive Warnungen bei Budgetüberschreitungen und Preisänderungen von Abos.
  - **Explainability:** Detaillierte Begründungen für Finanz-Prognosen (Trends, Saisonalität).
  - **Budget Coach:** Claire gibt nun proaktive Spartipps basierend auf der Budget-Auslastung.
  - **Anomaly Explainer:** Automatischer Vergleich zum Vormonat mit Ursachenanalyse bei starken Abweichungen.
  - **Subscription Intelligence:** Verbesserte Erkennung variabler Abos und flexibler Intervalle.
  - **Audit Logging:** Vollständige Traceability aller kritischen Aktionen (Transaktionen, Kategorien, KI-Aktionen).
  - **Fallback Chain:** Erhöhte Ausfallsicherheit der KI durch automatische Modell-Wechsel.

## [1.1.58] - 2026-03-06

### Added
- **Audit Logging (Traceability):** Ein umfassendes Audit-Log-System wurde implementiert. Alle kritischen Aktionen (Hinzufügen/Löschen von Transaktionen, Budget-Anpassungen, Kategorie-Änderungen) werden nun mit Zeitstempel, Benutzer-ID und Details protokolliert.
- **Admin Audit UI:** Administratoren können die letzten Aktivitäten der Organisation nun direkt im Admin Panel einsehen, was für mehr Transparenz und Sicherheit sorgt.
- **AI Action Tracking:** Auch von Claire (KI) initiierte Aktionen werden im Audit-Log speziell markiert (`ADD_TRANSACTION_AI`).

## [1.1.53] - 2026-03-06
### Added
- **Developer Tools: Consistency Scan:** Ein neues Tool ("Konsistenzscan") wurde dem Dev-Tools-Bereich hinzugefügt. Administratoren können nun die Datenbank auf fehlerhafte Einträge prüfen (fehlende Kategorien, 0-Euro Beträge, Transaktionen in der Zukunft), um eine hohe Datenqualität für die KI und Insights-Berechnungen sicherzustellen.

## [1.1.52] - 2026-03-06
### Added
- **Smart Alerts:** Die Insights-Seite wurde um einen "Smart Alerts"-Bereich erweitert. Dieser informiert den Nutzer proaktiv über Preiserhöhungen bei erkannten Abonnements und warnt bei Überschreitung (oder nahendem Limit) der gesetzten Monatsbudgets.

## [1.1.51] - 2026-03-06
### Added
- **Fallback Chain:** Es wurde ein Fallback-Mechanismus für die KI-Modelle implementiert (z. B. `llama-3.3-70b-versatile` -> `llama-3.1-8b-instant` -> `mixtral-8x7b-32768`), um Ausfallzeiten der API oder Limitierungen automatisch abzufangen und eine höhere Zuverlässigkeit von Claire zu gewährleisten.

## [1.1.50] - 2026-03-06
### Added
- **Tool Guardrails & Reliability:** Striktere Validierung für das Hinzufügen von Transaktionen (Betrag darf nicht 0 sein, Kategorie ist Pflicht).
- **Smart Date Parsing:** Claire versteht nun relative Datumsangaben wie "heute", "gestern" oder "yesterday" beim Buchen von Transaktionen.
- **Improved Tool Feedback:** Alle KI-Tools liefern nun detaillierte Erfolgs-Zusammenfassungen zurück, was Claire ermöglicht, präzisere und natürlichere Bestätigungen zu geben.

## [1.1.49] - 2026-03-06
### Fixed
- **Spending Analysis Tool:** Das Tool `get_spending_analysis` wurde im Backend implementiert. Claire kann nun detaillierte Berichte für den aktuellen Monat, das laufende Jahr oder den gesamten Zeitraum erstellen, indem sie aggregierte Statistiken aus der Datenbank abruft.

## [1.1.48] - 2026-03-06
### Fixed
- **Stable AI Streaming:** Die Streaming-Logik wurde sowohl im Frontend als auch im Backend grundlegend überarbeitet. Ein Puffer-System verhindert nun Datenverlust bei zerstückelten Paketen, und Claire zeigt keine leeren Sprechblasen mehr an.
- **AI Feedback Guarantee:** Claire gibt nun immer eine verbale Bestätigung oder einen Status-Text (z. B. "Ich bereite die Löschung vor..."), selbst wenn die KI-Antwort primär aus technischen Tool-Befehlen besteht.
- **Reliable Tool Execution:** Die Erkennung und Ausführung von Transaktions-Löschungen und Dashboard-Filtern nach dem Stream-Ende wurde stabilisiert.

## [1.1.47] - 2026-03-05
### Added
- **Real-Time Streaming:** Claire antwortet nun in Echtzeit. Der Text erscheint Wort für Wort, genau in der Geschwindigkeit, in der die KI ihn generiert, was für eine natürlichere Konversation sorgt.
- **Bulk Deletion UI:** Mehrere Transaktionen können nun gleichzeitig gelöscht werden. Das System zeigt eine einzige, gesammelte Bestätigungsabfrage für alle betroffenen Posten an.

## [1.1.46] - 2026-03-05
### Fixed
- **Server Stability:** Das Timeout für KI-Anfragen wurde auf 45s erhöht, um komplexe Operationen zuverlässig zu verarbeiten.
- **Transaction Context:** Claire sieht nun die IDs von Transaktionen im Kontext, was präzise Löschvorgänge ermöglicht.

## [1.1.45] - 2026-03-05
### Added
- **AI Tool Transparency:** Nachrichten mit KI-Aktionen erhalten nun Info-Tags. Beim Hovern zeigt ein Tooltip die exakten verwendeten Daten an.
- **Confidence Intervals:** Der Dashboard-Graph visualisiert nun statistische Unsicherheiten als schattierte Bereiche um die Forecast-Linien.

## [1.1.44] - 2026-03-05
### Fixed
- **Data Integrity:** Validierung verhindert NaN-Beträge in der Datenbank.
- **UI Scaling:** Beträge in Dashboard-Karten werden bei Platzmangel nun sauber mit "..." gekürzt statt abgeschnitten.

... (ältere Einträge gekürzt)
