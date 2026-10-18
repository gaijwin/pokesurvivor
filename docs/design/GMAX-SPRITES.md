# Gigantamax Snorlax artwork

Generated using the built-in OpenAI image-generation tool on 2026-10-18, including an edit for the shiny palette. Pokémon characters belong to their respective owners. These assets are separate from credited SpriteCollab imports.

## Prompt set

Normal:

> Use case: stylized-concept. Transparent pixel-art sprite atlas for a top-down fan Pokemon game. Subject: Gigantamax Snorlax, an enormous round sleepy blue-and-cream Pokemon lying back with a small grassy forest, bushes and a tree growing on its cream belly. Compact mystery-dungeon pixel-art style, crisp dark outline, readable small silhouette, simple 2-tone shading. Exact grid 8 rows by 8 columns, equal cells and generous empty transparent padding inside every cell. No text, labels, grid lines, shadows outside cells or effects outside cells. Rows face: down, down-right, right, up-right, up, up-left, left, down-left. Columns: idle, walking step one, walking step two, attack, shoot, charge, hurt, faint. Keep the same round body and belly forest in every pose. True transparent background.

Shiny edit (normal atlas as edit target):

> Create the shiny color variant of this Gigantamax Snorlax pixel-art sprite atlas. Change only the dark teal-blue body to a clearer brighter royal blue, keeping the cream belly and forest greens. Preserve exactly the same 8 by 8 cell layout, direction rows, poses, alignment, silhouettes, forest trees, small-game pixel-art rendering and transparent background. Do not add, remove, move or resize anything. No text.

## Technical packing

`node tools/pack_generated_gmax.cjs normal-atlas.png shiny-atlas.png` uses Sharp to normalize the eight-by-eight grid to 1280×1280, split cells and downsample to 40×40 with nearest-neighbor sampling and a 64-color palette. Engine outputs are `assets/pokemon/gmax-snorlax/*.png` and `assets/pokemon/gmax-snorlax/s/*.png`; geometry is in `js/data/generated-gmax-sprites.js`. There are eight direction rows, two walking frames and one pose per other state (Idle/Attack/Shoot/Charge/Hurt/Faint). Both packed variants were visually inspected. Browser animation remains unverified.

Normal source SHA-256: `f2dc22fc1afe11811d7dc555470a0ce72788723ebdcbba50ee375903b07abf62`

Shiny source SHA-256: `f26b555328cf97e64230273bf45e69af198ccac888e2a333b56722388fadbe5a`
