# Clarity Roadmap

## Historie / Abgeschlossen (Q3 2026)
- **Financial Insights v1:** Trend-Alerts, Forecast-Erklärbarkeit und Budget-Coach integriert.
- **Clair Reliability:** Robustere Tool-Auswahl, Streaming-Antworten und transparentes Feedback.
- **Audit Logging:** Vollständige Traceability aller kritischen Aktionen (Transaktionen, KI-Aktionen).
- **Admin UX:** Tab-basiertes Interface mit High-Performance Listen (Infinite Scroll) und Filtern.
- **Support System:** Echte E-Mail-Integration (SMTP) für Support-Anfragen.
- **Dev-Tools Basics:** Konsistenzscan für Datenqualität integriert.

## Q4 2026 – Team- & Admin-Funktionen
- **RBAC v1 (Rollenmodell):** Technische Durchsetzung von Rollenrechten auf Server-Ebene (Admin, Manager, User).
- **Security Hardening:** Server-seitige Validierung der Admin-Berechtigungen für alle sensiblen Endpunkte.
- **Dev-Tools Erweiterung:** Automatisierte Reparatur-Vorschläge nach Konsistenzscan.
- **KPI:** 100% nachvollziehbare Admin-Änderungen, < 5 Min Mean Time to Diagnose bei Datenproblemen.

### Konkrete Deliverables (Q4)
- `RBAC Middleware`: Zentrale Prüfung der Nutzerrollen bei jedem API-Call.
- `Admin Protection`: Schutzmechanismen (Bestätigungs-Dialoge, Undo) bei risikoreichen Aktionen (v1 done).

### Meilensteine (Q4)
- **M1 (Oktober):** Rollenmatrix technisch durchgesetzt (SERVER-SIDE).
- **M3 (Dezember):** Dev-Tools-Diagnose-Flow produktionsreif.

## Claire/Clair Upgrade-Programm (Erweitert)

### Upgrade Paket C – Memory & Personalization (Q4 2026)
- `Conversation Continuity`: bessere Anschlussfähigkeit über mehrere Chat-Turns hinweg.
- `Attachment-Aware Reasoning`: sauberer Umgang mit angehängten Transaktionen/Belegen.
- **Abnahmekriterium:** höhere Nutzerzufriedenheit bei wiederkehrenden Tasks.

### Upgrade Paket D – Safety, Governance & Trust (Q4 2026 – Q1 2027)
- `Prompt Hardening`: Schutz gegen Prompt Injection und missbräuchliche Tool-Nutzung.
- `Data Access Policies`: KI-Antworten strikt auf berechtigte Datenbereiche begrenzen.
- `Policy Layer`: klare Antwortregeln für sensible Finanz- und Admin-Aktionen.
- **Abnahmekriterium:** 0 kritische Sicherheitsvorfälle durch KI-Interaktion.

### Upgrade Paket E – Observability & Continuous Improvement (ab Q1 2027)
- `AI Quality Dashboard`: Success Rate, Time-to-Answer, Fallback-Rate, Undo-Rate.
- `Feedback Loop`: direktes User-Feedback in Priorisierung/Prompt-Tuning integrieren.
- `Eval Suite`: Regressionstests für typische Finanzdialoge und Tool-Flows.
- **Abnahmekriterium:** stabile Qualitätssteigerung über mehrere Releases.

## Q1 2027 – Produktreife & Skalierung
- API-Härtung (Rate Limits, bessere Fehlercodes, Monitoring/Alerting).
- Multi-Company-Skalierung optimieren (DB-Wartung, Backup/Restore, Migrationstools).
- **KPI:** 99.9% Uptime im Demo-/Pilotbetrieb, planbare Releases ohne Hotfix-Dringlichkeit.

## Q2 2027 – Wachstum & Integrationen
- CSV/Bank-Import (MVP) für schnellere Datenaufnahme.
- Export für Reporting (CSV/PDF) für Admin und Management.
- **KPI:** 40% schnellere Ersteinrichtung neuer Accounts.
