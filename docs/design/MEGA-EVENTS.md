# Mega Evolution and optional field trials

## Controls and run flow

From minute 8, look for a Mega Sanctuary beacon. Approach within 80 world units and press **F** to accept the trial. Charge each of three marked obelisks by standing within its circle for two seconds, then defeat Lucario before the 75-second deadline. Existing world enemies remain; ordinary spawning and scheduled bosses wait while the trial is active.

Success grants a run-scoped Key Stone. Venusaur receives Venusaurite; Charizard receives Charizardite X; Gengar receives Gengarite. Other partners, or partners that already used Mega Evolution, receive an alternative held item. Existing held items are replaced only through the normal keep/swap choice.

With the compatible stone equipped, press **M** to Mega Evolve once during the run. The form lasts until the stone is removed or the run ends. Removing and re-equipping a stone cannot grant another activation. Base species identity, collection entries and permanent upgrades are unchanged. A new run starts in the base form.

Rocket Ambush alternates with Sanctuary offers. Press **F** at its beacon, defeat three telegraphed waves of Ekans, Koffing and Meowth, then defeat Persian before the 60-second deadline. Success grants 60 shared run coins and one reward selection: learn an eligible move in a free slot, upgrade a learned move, or recover HP. No fifth move slot is created. A choice invalidated by an intervening level-up recovers HP instead. Rewards for a downed co-op player wait until revival.

## Mega rules and budgets

| Form | Typing | Adapted effect | Direct damage budget |
|---|---|---|---|
| Mega Venusaur | Grass / Poison | Thick Fat halves incoming Fire/Ice damage | +10% attack; a 100-point Fire/Ice hit deals 80 instead of 160 with the softened type chart, before other defenses; pure damage bypasses Thick Fat |
| Mega Charizard X | Fire / Dragon | Tough Claws on an explicit contact-move list | +10% attack, ×1.15 contact damage; combined +26.5% on eligible moves |
| Mega Gengar | Ghost / Poison | Shadow Tag within 160 world units, host-authoritative | +20% attack; 25% slow on normal enemies, 8% on bosses |

These numbers and real-time effects are survivor adaptations. They are not the numeric effects of the turn-based Pokémon abilities. Positive damage modifiers are also included in the status-source reference so the Poison cap stays consistent with its move. Existing stronger slows take precedence.

SpriteCollab normal/shiny animations are included for Charizard X and Gengar. Mega Venusaur uses newly generated normal/shiny atlases, packed into eight directions and seven states (two walking frames; other states are single poses). See [MEGA-CREDITS.md](../MEGA-CREDITS.md) and [GENERATED-SPRITES.md](GENERATED-SPRITES.md). Mega Charizard Y and Mega Blastoise remain unavailable: the pinned source lacks complete sprites and image generation rejected both attempts.

## Scheduling and authority

- Four offers maximum per run, starting no earlier than minute 8, with at least five minutes after a result before the next offer. An unaccepted beacon expires after 45 seconds and gives no reward.
- Offers defer while a legacy event, boss, rift or Judgment is present. Rifts and legacy events also defer while a trial/offer exists. New offers and acceptance stop at minute 28.
- Trials occur on the existing map. They do not teleport or relocate the party, so no arena-ready check is needed. The schedule and durations replace the earlier arena-only concept for this first release.
- The host owns entry validation, obelisk progress, wave/boss creation and outcome. Guest entry messages are checked against the current event ID and the sender's player position.
- Event IDs include the run seed. State revisions reject stale snapshots; completed/expired IDs cannot reopen. Rewards are claimed once. Failed trials dismiss remaining challenge enemies without rewards or kill credit.
- Challenge enemies have no ordinary loot drops. No extra move bonds or permanent currency are awarded. Rifts remain the bond source.
- Forms travel in the existing player-state frame and are validated against base species before visual/effect synchronization. Mixed-version co-op is not supported. This does not replace the game's existing client-trusted combat protocol with an anti-cheat system.

## Validation and limits

43 automated tests cover the previous combat foundations plus activation prerequisites, once-per-run behavior, form removal/stat restoration, asset dimensions and credits, both event success paths, failure cleanup, event exclusion, proximity, host authority, stale/replayed messages, downed-player rewards, full move slots and TM choices interrupted by a shared level-up.

No mobile tests are run. Desktop visual smoke testing remains blocked by Chromium exiting with SIGTRAP before opening a page in this environment. Automated logic and asset checks are not substitutes for a human browser playtest. Timing, player progression, real multiplayer sessions and overall difficulty still need in-game validation before treating this as a polished release.

Space-Time Distortion, Berry Grove, Z-Moves, Terastallization, Dynamax and additional Mega forms remain on the later roadmap. They are not claimed as implemented here.
