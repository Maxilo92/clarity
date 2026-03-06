# Clarity Performance Baseline

## API Performance (Baseline 2026-03-05)
Measurements taken on a local development environment (darwin).

| Endpoint | Method | Status | Duration | Type |
| --- | --- | --- | --- | --- |
| Home (Static) | GET | 200 | 27.76ms | Static HTML |
| Dashboard (Static) | GET | 200 | 2.53ms | Static HTML |
| Transactions (DB) | GET | 200 | 4.34ms | Database Query |
| Categories (DB) | GET | 200 | 3.23ms | Database Query |
| Invites (DB) | GET | 200 | 2.85ms | Database Query |
| Index Status (DB) | GET | 200 | 3.60ms | Database Query |

## Client-Side KPIs (Q2 2026)
- **Target First Dashboard Load (TTI):** < 2.0s
- **Critical UI-Bugs per Release:** 0

## Analysis & Future Optimizations
- **Static Content:** Very fast, served directly via Express.
- **Database:** SQLite performance is excellent for current data volumes (~800-1000 transactions).
- **Potential Bottlenecks:** LLM calls via `/api/chat` (typically 1-3s depending on model) and complex graph rendering in the frontend for large timeframes.
- **Next Steps:** Implement frontend-side performance markers (Performance API) to measure actual TTI/LCP in the browser.
