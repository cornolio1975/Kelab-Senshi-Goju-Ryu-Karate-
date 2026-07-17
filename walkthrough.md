# Walkthrough: Tournament Brackets & Scoreboard Point History Display

We have successfully implemented the Round Robin System, WKF Repechage System, and the Technique Point History Display optional feature. All features are fully verified, unit-tested, built, and ready for deployment.

## 1. Summary of Changes

### A. Tournament Brackets (Round Robin & Repechage)

* **[types.ts](file:///c:/Users/svana/Kelab%20Senshi%20Goju-Ryu%20Karate/src/db/types.ts)**: Added optional `format` field (`'knockout' | 'round_robin' | 'wkf_repechage'`) to the Category model.
* **[supabase_schema.sql](file:///c:/Users/svana/Kelab%20Senshi%20Goju-Ryu%20Karate/supabase_schema.sql)**: Updated SQL definition of categories table with format constraints.
* **[dbClient.ts](file:///c:/Users/svana/Kelab%20Senshi%20Goju-Ryu%20Karate/src/db/dbClient.ts)**: Updated `generateDraw` signature to support dynamic bracket formats.
* **[roundRobinRankings.ts](file:///c:/Users/svana/Kelab%20Senshi%20Goju-Ryu%20Karate/src/utils/roundRobinRankings.ts)**: New utility implementing WKF Round Robin tie-breaking rules: Wins -> Point Diff -> Total Points Scored -> Head-to-head results.
* **[mockStore.ts](file:///c:/Users/svana/Kelab%20Senshi%20Goju-Ryu%20Karate/src/db/mockStore.ts)**: Added auto-repechage generation, round-robin combinations, and proper seeding.
* **[categories/page.tsx](file:///c:/Users/svana/Kelab%20Senshi%20Goju-Ryu%20Karate/src/app/categories/page.tsx)**: Added "Tournament Format" dropdown selector to the Add Category modal.
* **[draws/page.tsx](file:///c:/Users/svana/Kelab%20Senshi%20Goju-Ryu%20Karate/src/app/draws/page.tsx)**: Added active format badges and auto-lock state checks.
* **[SportdataBracket.tsx](file:///c:/Users/svana/Kelab%20Senshi%20Goju-Ryu%20Karate/src/components/SportdataBracket.tsx)**: Added standings rendering and SVG pan/zoom controls.

### B. Technique Point History Display

* **[settings/page.tsx](file:///c:/Users/svana/Kelab%20Senshi%20Goju-Ryu%20Karate/src/app/settings/page.tsx)**: Added "Scoreboard Settings" section with tick boxes for Referee, Public, and Streaming layouts (`ts_show_point_history_referee`, `ts_show_point_history_public`, `ts_show_point_history_stream`) saved to local storage.
* **[scoring/page.tsx](file:///c:/Users/svana/Kelab%20Senshi%20Goju-Ryu%20Karate/src/app/scoring/page.tsx)**:
  * Tracks technique type (e.g. +1 Yuko, +2 Waza-ari, +3 Ippon) and score timestamps.
  * Handles JSON history parsing on load with legacy comma-separated string fallback.
  * Adjusts history correctly on Undo actions.
  * Renders small, clean WKF-style technique badges below the main scores.
* **[control/page.tsx](file:///c:/Users/svana/Kelab%20Senshi%20Goju-Ryu%20Karate/src/app/dashboard/control/page.tsx)**:
  * Tracks points history arrays and syncs them over the BroadcastChannel (`wkf-scoreboard-sync`).
  * Serializes events as JSON strings on match finish and clears history on rematch resets.
  * Pushes history to the undo stack.
* **[display/page.tsx](file:///c:/Users/svana/Kelab%20Senshi%20Goju-Ryu%20Karate/src/app/display/page.tsx)**:
  * Receives broadcast event payloads and reads settings dynamically.
  * Renders badges underneath the total score.
  * Supports real-time fallback updates via Supabase.

---

## 2. Validation & Testing

### Automated Test Coverage
Updated **[draws.test.ts](file:///c:/Users/svana/Kelab%20Senshi%20Goju-Ryu%20Karate/src/db/draws.test.ts)** with new test cases checking:
* JSON parsing vs legacy comma-separated lists fallback logic.
* Technique events insertion and correct subtraction on Undo actions.
