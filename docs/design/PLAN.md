# PokéSurvivor expansion plan

Upstream baseline: `5bbc3b29288d6af4596f21188fb8b54e0e9b739f`.
Fork: https://github.com/gaijwin/pokesurvivor .
All new game copy and documentation use English only. Desktop validation only; mobile testing is excluded at the owner's request.

## Delivery sequence

1. **Combat foundations (implemented in this change).** Host-authoritative status clocks, individual stack expiry, capped Poison scaling, type and status immunity, source attribution and damage breakdown. Offline fork configuration and English-only runtime. Validate with unit tests, actual combat-path integration tests, a deterministic single-target benchmark and desktop smoke checks.
2. **Broader balance validation (seeded damage harness implemented; live validation remains).** `tools/balance-scenarios.cjs` measures 2/8/15/25/30-minute fixtures, 1/2/4-player HP scaling, boss and 8/32/64-enemy stationary geometry, overlapping fields/mines/orbits, Hex, crit and linked groups. See `BALANCE-RESULTS.md` for assumptions and results. Measure fields, overlapping trails, mines, orbit rehit, Hex, critical hits and 1–4 linked moves. Compare equally invested builds, HP tiers, weather, shields, shiny enemies and 1/2/4-player configurations. Geometry and survival measurements must precede broad damage or enemy-HP changes. Do not weaken bosses merely to compensate for removing the Poison exploit.
3. **EventDirector and Mega Sanctuary (implemented).** One major activity at a time, host-selected seed and result, no overlap with a boss/rift/Judgment, minimum 120 s between major events. Defer instead of silently discarding blocked events. No new events in the final two minutes before Judgment. The shipped trials stay on the map without teleportation; proximity interaction starts the optional challenge. Future arena variants require a ready check; idempotent reward claims per event/player.
4. **Mega Evolution (four forms implemented).** Key Stone and a species-compatible Mega Stone occupying the held-item slot; one Mega form per run. Shipped forms: Venusaur, Charizard X, Gengar and Lucario, including normal and shiny art. Venusaur uses generated artwork; the others use credited SpriteCollab assets. Charizard Y and Blastoise remain blocked on complete sprite assets; generation attempts were rejected. Correct form types, canon-inspired abilities and proper sprite assets are release requirements. Lucario uses the shared STAB implementation, with Adaptability replacing the base modifier. Do not substitute a generic attack buff for a named ability.
5. **Rocket Ambush (implemented) and usability.** Three telegraphed waves and a commander, a 60 s deadline, one TM selection and 60 shared run coins on success. No theft of permanent currencies. Target status expiry ranges and event reward previews are implemented. Damage measurements are recorded with explicit stationary-fixture limitations.
6. **Battle specializations (implemented).** Z-Moves, Terastallization, Dynamax and explicit starter species evolution routes use the contracts in `SPECIALIZATIONS.md`. One specialization per run, defensive Tera typing with original STAB, proportional temporary HP and unchanged Dynamax collision footprint. Gigantamax Snorlax ships with its own normal/shiny atlases and a bounded G-Max Replenish effect. Other Gigantamax species remain asset-dependent.

## Existing mechanics to preserve

Four move slots, one active group, linked casts earned through legendary rifts, move levels/evolutions, held items, weather, type hordes, golden hour, lost-Pokémon escorts, treasure thieves and Judgment at minute 30. Do not duplicate these events under new names. Rifts remain the main source of move bonds.

The game uses vanilla JavaScript and Canvas 2D. Edit `dev.html` and source modules, then generate `index.html`, `js/app.min.js`, `version.json`, exports and static pages. Preserve licenses, credits, saved progression and the updater. Never write fork test data to upstream production services.

## Verified cause of Poison dominance

Original nominal steady-state Poison DPS: `(0.012 × targetMaxHp × stacks + 1) / 0.6`.
At eight maintained stacks this is approximately 16% of target maximum HP each second. Original Burn DPS: `3.2 × stacks × (1 + 0.06 × playerLevel)`. Both statuses originally shared one refreshed expiry timer per status.

| Target HP | Original Poison, 8 stacks | Burn, 8 stacks, level 40 |
|---:|---:|---:|
| 1,000 | 161.67 DPS | 87.04 DPS |
| 14,000 | 2,241.67 DPS | 87.04 DPS |
| 54,000 | 8,641.67 DPS | 87.04 DPS |

14,000 HP is a solo rift legendary at minute 20; 54,000 HP is the last ordinary boss at its scheduled minute-15 spawn. These are steady-state numbers, not exact kill times: stack ramp, direct hits, discrete ticks, shields and movement matter.

Correction to the initial audit: upstream intentionally softens chart immunity to ×0.3; it does **not** return zero. This change deliberately introduces true chart immunity. Poison/Steel status immunity and Fire burn immunity are separate checks. The original status tick reset also discarded elapsed-time remainder and made damage depend on FPS.

`tools/balance-audit.cjs` retains the original snapshot analysis. `tools/balance-benchmark.cjs` compares original and current status behavior under an explicit single-target model. See `COMBAT-FOUNDATIONS.md` for implementation evidence and remaining limits.

## Poison v1 contract

Total target DPS: `(stacks / 8) × min(0.025 × targetMaxHp, 0.35 × strongestSourceReferenceDps)`.

Reference DPS uses one projectile per volley, source move level/evolution, attack and cooldown at application. It excludes crit, target type, weather, proc damage, overlapping fields and projectile count. Trail reference interval is 0.5 s, orbit uses its rehit interval and turret uses its firing rate. This prevents the reference from recursively growing with Poison damage or boss HP.

The target has a shared maximum of eight stacks, each with its own 4 s lifetime. An owner refreshes their oldest stack; a new stronger owner can replace weaker stacks. A single application cannot repeatedly select the same stack. Damage is attributed by source weight. Weak foreign applications cannot keep another player's stacks alive.

Burn retains its original per-stack rate as a baseline, now snapshotting the source player's level with individual 3 s expiry. Both clocks carry elapsed time and fractional damage, process long frames chronologically, and exclude life steal/procs. First tick occurs after the interval, not immediately on application; refreshing cannot generate instant ticks. A tick exactly at expiry counts consistently at every frame rate.

## Canon and adaptations

Mega Evolution's Key Stone and matching Mega Stone requirements: https://pokemonletsgo.pokemon.com/en-us/story/ and https://mega.pokemon.com/en-us/ . Z-Moves are once per battle in the source games: https://www.nintendo.com/en-gb/News/2016/August/Z-Moves-and-undiscovered-Pokemon-announced-for-Pokemon-Sun-and-Pokemon-Moon-1128345.html .

Run duration, unlock timing, item-slot cost and numeric effects below are adaptations, not claims about canonical game values:
- Mega unlock: Sanctuary trial, then a compatible stone offer after minute 8; no off-species stone drops.
- Mega budget: roughly 20–30% real DPS or comparable survival benefit versus the competing held item. Avoid simultaneously multiplying attack, rate and projectile count.
- Venusaur / Thick Fat: Fire/Ice damage mitigation instead of additional Poison scaling.
- Charizard X / Tough Claws: contact-tagged moves only; Fire/Dragon typing.
- Charizard Y / Drought: use the existing sun system, with a deterministic host weather conflict rule.
- Blastoise / Mega Launcher: explicitly pulse/aura-tagged moves, not all Water attacks.
- Gengar / Shadow Tag: local movement control, reduced effect on bosses; no permanent boss immobilization.
- Z-Move prototype budget: six seconds of reference move DPS in one attack, once per run, without linked duplication or proc recursion.

## Event backlog

| Event | Challenge | Reward | Failure |
|---|---|---|---|
| Mega Sanctuary | Three obelisks and a mini-boss, 75 s | Compatible stone or ordinary item alternative | Return without the stone |
| Rocket Ambush | Three waves and a commander, 60 s | TM selection and run resources | No loss of permanent resources |
| Space-Time Distortion | Arena with two telegraphed rotating type conditions, 90 s | Move from an explicit pool | Return, no recursive rift chain |
| Berry Grove | Defend a berry tree, 45 s | Healing or one-use status cleanse | Reduced harvest |

All four optional field challenges are implemented on the existing map without teleportation. Distortion uses a 90-second survival trial with rotating direct-hit resonance; Grove uses a 45-second tree-defense trial. Target no more than four additional major activities in a 30-minute run. Do not simultaneously increase existing rift frequency or award extra move bonds from every event.

## Acceptance criteria

Use 2/8/15/25/30-minute scenarios, controlled progression tiers, 1/2/4 players, bosses and 8/32/64-enemy hordes. Distinguish legally attainable builds from stress tests. Measure median/p90 TTK, effective HP damage, survival, stack ramp, uptime and event completion time. Use shared seeds for stochastic geometry tests; deterministic models need no random-seed claims.

Provisional target: equally invested neutral boss archetypes within ±15% of the comparison median, with meaningful matchup advantages rather than one universally best status. This is a target, not a claim already established by the initial model.

Tests must cover zero damage, immunity, shields, overkill, stack replacement/expiry, dead owners, long frames, duplicate/out-of-order network status reports, old saves, arena return and Judgment. Full multiplayer-session and broad geometry validation remain required before a public gameplay release. No mobile validation is planned.
