# Expansion balance measurements

`node tools/balance-scenarios.cjs` reproduces the complete report in [expansion-benchmark.json](expansion-benchmark.json). `--supplement` reuses the saved main matrix and recomputes sensitivity/close-range cases; `--quick` is a development subset.

The report contains 2,082 seeded simulations: five time tiers (2/8/15/25/30 minutes), 1/2/4 players, one boss-like target or 8/32/64 stationary enemies, eleven move/group configurations, and three seeds; plus weather/shield/shiny sensitivity and close-range fixtures. The engine's actual projectile collision, mine, trail, orbit, chain/Hex, critical-hit and status paths run for up to 12 seconds at 30 FPS. Effective HP damage excludes shields and overkill. Unknown TTK is explicitly censored rather than reported as a kill. This is a synthetic damage harness, not an enemy-AI, survival, legal acquisition or real multiplayer simulation. Native STAB is excluded to compare neutral investment and is covered separately by integration tests.

The main matrix uses Normal-type targets on stationary rings: Ghost moves correctly do zero damage. A second set uses synthetic typeless targets at close range to isolate otherwise hidden field and Hex behavior. The boss fixture is 75 units away in the main set and 24 in the close set. Mines/trails can miss outside their reach; close targets can stand inside an orbit's ring. Those are geometry effects, not evidence for blindly buffing a move.

| Minute-25 solo main fixture | Median effective DPS |
|---|---:|
| Sludge | 771.03 |
| Ember | 670.73 |
| Water Gun | 993.98 |
| Fire Spin | 778.30 |
| Sludge + Ember | 1,473.21 |

| Minute-25 solo, close typeless boss | Median effective DPS |
|---|---:|
| Sludge | 2,012.20 |
| Ember | 2,946.43 |
| Water Gun | 2,291.67 |
| Toxic | 443.55 |
| Spikes | 453.30 |
| Shadow Ball | 2,426.47 |
| Hex | 365.04 |
| Sludge + Hex | 2,661.29 |

Poison is not uniformly strongest in these fixtures. The provisional ±15% archetype target is not established: geometry, area clear, burst and uptime still create large differences. In particular, clustered mine damage and linked-group output need player movement and legal-progression playtests before further numeric nerfs. No boss HP was reduced to hide the Poison fix.

Specialization budget tests independently verify: STAB 1.15; Adaptability replaces it with 1.30; matching original Tera type 1.35 and new Tera type 1.25; Z total equals six source-reference seconds across any target count; Dynamax uses three pulses and preserves end HP across short/long frames; Thick Fat converts a 160-point Fire/Ice hit into 80 with the softened chart. HP cards earned during Dynamax persist. Multipliers do not stack across specializations.

Desktop browser and real multiplayer validation remain blocked/unperformed; the available Chromium crashes before loading a page. No mobile tests were performed. These numbers support the implementation and identify follow-up work; they do not certify complete gameplay balance or frame-rate performance.
