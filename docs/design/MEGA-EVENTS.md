# Mega Evolution and optional field trials

## Controls and run flow

From minute 8, look for a Mega Sanctuary beacon. Approach within 80 world units and press **F** to accept the trial. Charge each of three marked obelisks by standing within its circle for two seconds, then defeat Lucario before the 75-second deadline. Existing world enemies remain; ordinary spawning and scheduled bosses wait while the trial is active.

Success grants a run-scoped Key Stone. The reward screen offers a compatible Mega path, Tera types from current species/learned moves, a matching active-move Z-Crystal or a Dynamax Band. The Mega path grants Venusaurite to Venusaur, Charizardite X to Charizard, Gengarite to Gengar and Lucarionite to Lucario. Other partners, or partners that already used Mega Evolution, receive an alternative held item. Existing held items are replaced only through the normal keep/swap choice.

With the compatible stone equipped, press **M** to Mega Evolve once during the run. The form lasts until the stone is removed or the run ends. Removing and re-equipping a stone cannot grant another activation. Base species identity, collection entries and permanent upgrades are unchanged. A new run starts in the base form.

The schedule rotates Sanctuary, Rocket Ambush, Space-Time Distortion and Berry Grove, retaining four total offers. Press **F** at its beacon, defeat three telegraphed waves of Ekans, Koffing and Meowth, then defeat Persian before the 60-second deadline. Success grants 60 shared run coins and one reward selection: learn an eligible move in a free slot, upgrade a learned move, or recover HP. No fifth move slot is created. A choice invalidated by an intervening level-up recovers HP instead. Rewards for a downed co-op player wait until revival.

## Mega rules and budgets

| Form | Typing | Adapted effect | Direct damage budget |
|---|---|---|---|
| Mega Venusaur | Grass / Poison | Thick Fat halves incoming Fire/Ice damage | +10% attack; a 100-point Fire/Ice hit deals 80 instead of 160 with the softened type chart, before other defenses; pure damage bypasses Thick Fat |
| Mega Charizard X | Fire / Dragon | Tough Claws on an explicit contact-move list | +10% attack, ×1.15 contact damage; combined +26.5% on eligible moves |
| Mega Lucario | Fighting / Steel | Adaptability replaces native STAB (1.15 → 1.30) | +5% attack; combined advantage over base native STAB: about 18.7% |
| Mega Gengar | Ghost / Poison | Shadow Tag within 160 world units, host-authoritative | +20% attack; 25% slow on normal enemies, 8% on bosses |

These numbers and real-time effects are survivor adaptations. They are not the numeric effects of the turn-based Pokémon abilities. Positive damage modifiers are also included in the status-source reference so the Poison cap stays consistent with its move. Existing stronger slows take precedence.

SpriteCollab normal/shiny animations are included for Charizard X, Gengar and Lucario. Mega Venusaur uses newly generated normal/shiny atlases, packed into eight directions and seven states (two walking frames; other states are single poses). See [MEGA-CREDITS.md](../MEGA-CREDITS.md) and [GENERATED-SPRITES.md](GENERATED-SPRITES.md). Mega Charizard Y and Mega Blastoise remain unavailable: the pinned source lacks complete sprites and image generation rejected both attempts.

## Scheduling and authority

- Four offers maximum per run, starting no earlier than minute 8, with at least five minutes after a result before the next offer. An unaccepted beacon expires after 45 seconds and gives no reward.
- Offers defer while a legacy event, boss, rift or Judgment is present. Rifts and legacy events also defer while a trial/offer exists. New offers and acceptance stop at minute 28.
- Trials occur on the existing map. They do not teleport or relocate the party, so no arena-ready check is needed. The schedule and durations replace the earlier arena-only concept for this first release.
- The host owns entry validation, obelisk progress, wave/boss creation and outcome. Guest entry messages are checked against the current event ID and the sender's player position.
- Event IDs include the run seed. State revisions reject stale snapshots; completed/expired IDs cannot reopen. Rewards are claimed once. Failed trials dismiss remaining challenge enemies without rewards or kill credit.
- Challenge enemies have no ordinary loot drops. No extra move bonds or permanent currency are awarded. Rifts remain the bond source.
- Forms travel in the existing player-state frame and are validated against base species before visual/effect synchronization. Mixed-version co-op is not supported. This does not replace the game's existing client-trusted combat protocol with an anti-cheat system.

## Validation and limits

Automated tests cover the combat foundations plus activation prerequisites, once-per-run behavior, form removal/stat restoration, asset dimensions and credits, both event success paths, failure cleanup, event exclusion, proximity, host authority, stale/replayed messages, downed-player rewards, full move slots and TM choices interrupted by a shared level-up.

No mobile tests are run. Desktop visual smoke testing remains blocked by Chromium exiting with SIGTRAP before opening a page in this environment. Automated logic and asset checks are not substitutes for a human browser playtest. Timing, player progression, real multiplayer sessions and overall difficulty still need in-game validation before treating this as a polished release.

Space-Time Distortion is a 90-second field survival trial with at most eight active challenge foes. Every 15 seconds its favored type rotates Psychic → Ghost → Dragon → Ice; the HUD previews the next type for three seconds. Direct hits against its challenge enemies deal ×1.25 with the favored type and ×0.8 otherwise. Normal enemies and status ticks are unchanged. Success offers an explicit Psychic/Ghost/Dragon/Ice move pool, legal learned-move upgrades or recovery; no move bonds.

Berry Grove is a 45-second field defense trial. Rattata target the marked tree rather than chase players. Every raider reaching the tree removes 10 integrity per 1.5 seconds. A surviving tree gives healing scaled by its remaining integrity (minimum 25% harvest); a destroyed tree gives 20% harvest. The alternative reward is one Lum Berry: clear a slowdown now or automatically clear the next one. Wipes, Judgment and arena interruptions grant no harvest. There is no permanent currency penalty.

The existing ready-check-free map approach is retained: no new arena teleportation or recursive rift chain. See [SPECIALIZATIONS.md](SPECIALIZATIONS.md) for Z-Moves, Tera, Dynamax, Gigantamax asset requirements and evolution limits.
