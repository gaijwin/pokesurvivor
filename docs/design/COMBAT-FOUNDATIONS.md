# Combat foundations — implementation and validation

## Implemented

- `G.Status` processes Poison and Burn on the host with elapsed-time-preserving clocks and individual stack expiry. A shared eight-stack cap prevents each co-op member adding another full target-health multiplier.
- Poison uses the capped source reference in `PLAN.md`. Burn keeps the original rate but snapshots the source's level.
- Type-chart immunity now returns zero before the softened positive multipliers are clamped. Both player and enemy hit paths respect it. Poison/Steel cannot be poisoned; Fire cannot be burned.
- Projectiles, trail fields, orbitals and traps provide explicit source information. Network status metadata is bounded and associated with the sending player, never a claimed owner ID. Replayed status applications are rejected using a per-connection sequence number. Mixed client versions are not supported by the new status protocol.
- Damage attribution excludes shield absorption and overkill. DOT never calls direct-hit life-steal hooks. Host reports use cumulative totals so duplicate or out-of-order reports cannot inflate guest DOT statistics.
- The run-end panel shows direct/Poison/Burn HP removed by move. Client-side direct-hit totals are still estimates until host confirmation; DOT totals are host-authoritative. This is not a complete anti-cheat protocol.
- English is fixed independently of browser locale and old language preferences. Newly added copy is English in both legacy changelog array positions; no new translations are authored.
- Firebase configuration is null. Cloud accounts, matchmaking and leaderboards require a separate fork-owned backend; original production services are not used.

## Automated checks

`node --test tests/*.test.cjs`: 24 tests covering clock invariance at 30/60/144 FPS and long dt, fractions, stack ownership, immunity, metadata, source attribution, shield/overkill, real projectile/trail/orbit paths, ghost casts and co-op message handlers.

`node tools/balance-audit.cjs`: original snapshot audit.

`node tools/balance-benchmark.cjs`: deterministic original/current comparison; output in `combat-benchmark.json`.

Build pipeline: `node tools/build.js`, `node tools/export_data.js`, `python tools/make_seo_pages.py`. Upstream tracked CRLF files retain their existing line endings; use `git -c core.whitespace=cr-at-eol diff --check`.

## Single-target model result

Move level 5 plus evolution, attack 3, cooldown multiplier 0.7, player level 40, neutral matchup, one guaranteed projectile hit per volley. No crit, shield, movement, overlap or multi-target effects. Simulation step: 0.01 s. This is not a full-game balance proof.

| 54,000 HP target | Original TTK | Current TTK | Current DOT share |
|---|---:|---:|---:|
| Ember | 89.29 s | 89.56 s | 14.3% |
| Sludge | 7.21 s | 94.83 s | 25.7% |
| Poison Sting | 6.61 s | 113.54 s | 25.7% |
| Water Gun | 113.20 s | 113.20 s | 0% |
| Thunder Shock | 111.10 s | 111.10 s | 0% |

Sludge now competes with these direct-damage references instead of killing every large-health target in a few seconds. No compensatory direct Poison buff or boss-HP reduction is applied yet; field geometry, accuracy, links, progression and longer playtests must justify further tuning.

## Remaining work

Desktop visual smoke validation is blocked in this environment: the Chromium process exits with SIGTRAP before opening a page. No visual pass is claimed. Engine-path and English-locale tests pass, but they do not replace a browser playtest. No mobile tests. Real multi-browser co-op sessions, long runs, performance profiling, arena return and legal-progression balance matrices remain future validation. Mega Evolution, Sanctuary, Rocket and the wider event system are planned next and are not present in this combat-only implementation.
