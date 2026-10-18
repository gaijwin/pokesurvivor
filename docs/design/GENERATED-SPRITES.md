# Generated Mega Venusaur sprites

Generated on 2026-10-18 with OpenAI image generation. These are custom game assets, not official game rips or SpriteCollab contributions. Character ownership remains with the respective Pokémon owners.

The normal atlas depicts a squat teal Mega Venusaur with a large pink flower, broad leaves, thick trunk and forehead flower. The shiny edit changes the body to green and flower to yellow, preserving the layout. Existing game sprites provided the pixel-art style reference. The intended layout is eight direction rows and eight pose columns: idle, two walking poses, attack, shoot, charge, hurt, faint. This describes the generation brief; source images are identified by their hashes below.

## Engine import

Run `node tools/pack_generated_venusaur.cjs normal-atlas.png shiny-atlas.png` with Sharp available through `CODEX_PRIMARY_RUNTIME_NODE_MODULES`. It normalizes the 1254×1254 source grid to 1280×1280 using nearest-neighbor sampling, splits 160×160 cells, downsamples them to 40×40, and packs the existing engine format with alpha and a 64-color palette. Both variants share geometry. Frame anchors are (20,35); eight direction rows, seven animation states, two walking frames, one pose per other state. This is a compact animation set rather than a fully in-betweened animation.

The packed sprites were visually inspected. Automated checks validate dimensions, normal/shiny loading, activation, item selection and combat behavior. Desktop browser rendering remains unverified because the available Chromium crashes at startup. No mobile checks were performed.

## Source SHA-256

Normal: `5d1f3c0afd513896ba7c1fcb662b2259cf11124920e1b98e0360512e435a41ce`

Shiny: `9cd29e5a93c081f6a0018a806b7e11479a6a63586dcc07df92b87036721a6a29`

## Unavailable forms

Mega Charizard Y and Mega Blastoise generation was rejected by the image tool. No placeholder form is unlocked for either. They still require complete, reviewed assets and their own gameplay abilities.
