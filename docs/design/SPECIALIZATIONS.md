# Battle specializations and evolution

## Controls and cost

A successful Mega Sanctuary offers a single reward choice. Select a specialization rather than stacking all bonuses. The Mega path grants the Key Stone and compatible held Mega Stone; Z requires a matching held crystal; Tera and Dynamax use their unlocked run equipment without occupying the held-item slot. Activation commits the run to that specialization. Removing a stone, fainting or spending a burst does not clear the commitment. Selecting Tera/Z/Dynamax equipment reserves that path before activation.

| Key | Action | Adapted budget |
|---|---|---|
| M | Mega Evolve with Key Stone and compatible held stone | Once per run; form persists while its stone is equipped |
| Z | Use matching active move with held Z-Crystal | Once per run; six seconds of one-source reference DPS, shared across nearby nonimmune targets |
| T | Terastallize to the selected type | Once per run; one defensive type, original offensive STAB preserved; ends on fainting |
| X | Dynamax | Once per run; 18 seconds; +50% HP proportionally, +15% move damage, three one-reference-second Max pulses |
| V | Accept an eligible species evolution | Available starter routes at their evolution levels; collection/ranking identity stays unchanged |
| F | Accept nearby field challenge | Optional, shared four-offer schedule |

STAB is explicitly 1.15 for moves matching the current species' original types. Mega Lucario's Adaptability replaces this with 1.30; its attack multiplier is 1.05. Tera grants 1.25 for a new matching type or 1.35 for a Tera type already in the original types. Other original types retain 1.15. These are survivor adaptations, not cartridge numeric values. All normal combat paths and status-source snapshots use the same multiplier function.

Z and Max pulses do not duplicate linked moves or trigger critical hits, status stacks, life steal or secondary procs. They share one fixed budget across targets before target typing, weather and Distortion resonance. A Z charge is not consumed when there is no eligible target. The crystal's type is set when its reward is selected, and the active move must match it.

Dynamax enlarges the visual sprite while preserving the collision footprint. HP returns proportionally at expiry, fainting, rift entry or Judgment; it cannot heal through repeated activation. HP upgrades earned during the transformation persist. Normal Max pulses slow foes (Max Strike), Fire invokes sun (Max Flare), and Water invokes rain (Max Geyser). The host owns shared weather; guest weather effects are resolved from synchronized active moves. Existing weather is replaced; stable host player iteration resolves same-tick effects, with the subsequent Mega Drought update taking precedence when triggered. Specialization state, defensive typing, visual scale and evolved species travel in the player frame.

## Evolution routes

Explicit routes currently cover the nine starter families from generations 1–3: Bulbasaur, Charmander, Squirtle, Chikorita, Cyndaquil, Totodile, Treecko, Torchic and Mudkip. There is no invented universal level rule for stone, friendship, trade, branching or regional evolutions. Evolution requires a complete target sprite and the appropriate level. It preserves learned moves, held item, permanent perks, HP fraction and original collection/ranking identity; subsequent level-up move pools use the evolved species. Evolution waits while a Mega/Tera/Dynamax form is active. Evolved Venusaur/Charizard can use their compatible Mega stones.

## Asset-dependent forms

Mega Lucario ships with credited normal/shiny SpriteCollab animations. Drought and Mega Launcher implementations and tests exist for Mega Charizard Y and Mega Blastoise, but their forms stay locked because complete sprites are unavailable and image-generation attempts were rejected again. Mega Launcher uses an explicit Aura Sphere/Dark Pulse list; ordinary Water attacks are not boosted. Drought summons 30 seconds of sun at most once every 60 seconds, host-only and outside arenas/Judgment.

Gigantamax Snorlax is available as an additional Sanctuary choice for Snorlax. It uses generated normal/shiny sprites and the same 18-second HP/damage budget as Dynamax. Normal Max pulses become G-Max Replenish; the first successful pulse can restore one previously consumed Lum Berry once, with no repeated replenishment loop. The restored berry clears a future slowdown. This is a real-time adaptation of berry restoration. Other Gigantamax forms remain unavailable: the pinned source has no complete Idle/Walk/Attack sets, and each needs its own reviewed art and G-Max behavior. See [GMAX-SPRITES.md](GMAX-SPRITES.md).

## Canon references

- https://swordshield.pokemon.com/en-gb/gameplay/pokemon-become-huge-dynamax/ — once-per-battle Dynamax, three turns and Max Moves.
- https://www.pokemon.com/us/features/dynamax-pokemon-battle-strategies-for-pokemon-sword-and-pokemon-shield — type-specific Max effects.
- https://press.pokemon.com/en/MORE-POKEMON-SIGHTED-IN-POKEMON-SWORD-AND-POKEMON-SHIELD-AND-COMING-TO — Gigantamax Snorlax and berry-restoring G-Max Replenish.
- https://mega.pokemon.com/en-us/ — Mega forms.

The run duration, equipment reward flow, damage budgets and real-time effects here are adaptations. Automated logic and atlas checks do not establish full multiplayer or browser playability.
