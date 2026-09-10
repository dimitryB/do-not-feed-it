# Do Not Feed It original artwork

Generated 2026-09-09 using the built-in OpenAI image_gen tool, without reference images. Two separate original generations, run in parallel. No third-party source assets, logos, real-person likenesses, or fonts were supplied.

## Files
- kitchen-creature.png — 1536 × 1024. Inspected: cinematic dark teal/amber industrial feeding kitchen, original moss-green alien, clear left space. The actual mouth center is approximately x70%, y39% with opening about 20% width × 20% height; gameplay target should align to the actual art rather than the requested coordinates.
- ingredient-sheet.png — 2172 × 724. Inspected: tin, mint pouch, coral chili, each occupying one equal third, clean separated silhouettes. Dark background appears slightly textured rather than guaranteed uniform #101b1c; use as a dark-backed sheet or extract with appropriate tools if transparency is needed.

## Exact prompts

### Kitchen
Use case: stylized-concept. Asset type: original cinematic environment art for browser arcade game Do Not Feed It. Create a wide landscape image, 1536x1024. Dark cinematic industrial subterranean feeding kitchen. Painterly high-end stylized 3D game concept art with tactile craftsmanship. Teal-black machinery, aged enamel metal, warm amber practical lighting, subtle drifting steam. Side-on gameplay composition: left 45 percent of frame is clear dark negative space for flying food, restrained wall texture only. On the right at 70 percent width a huge irresistibly expressive plump moss-green ORIGINAL alien creature behind a serving hatch. Wide open black mouth centered x70% y47%, mouth opening approximately 14% image width and 18% image height, ivory irregular teeth, soulful yellow eyes, amusing expectant expression. Its entire upper body visible, strong silhouette. Warm orange light on right and cool teal on left. Foreground workbench across lower 15 percent. Exceptionally polished distinctive premium game atmosphere, a lovable hungry monster with beautifully modeled wet nose and subtly leathery skin. No text, HUD, logos, numbers, humans, watermarks or unnecessary visual clutter. This is artwork only, not a UI screenshot.

### Ingredients
Use case: stylized-concept. Asset type: game food item sprite sheet for Do Not Feed It. Wide 3:1 horizontal image, three separated items each centered in its equal third with generous separation and margins. All on perfectly flat solid dark #101b1c background, no gradients or environmental shadows outside items. Left third: battered silver tin can with a small blank lime label, slightly tilted. Middle third: mint/cyan inflated food pouch with a knot at top, tactile wrinkled flexible packaging. Right third: glossy coral red chili pepper with green stem, gently curved. Beautiful tactile stylized 3D hand-painted game inventory art, dramatic soft lighting, consistent original art direction with a dark industrial kitchen and a moss-green monster. Objects large, detailed, immediately recognizable readable silhouettes, each entirely inside its third. No words, logos, labels containing writing, other items, text, borders or watermark.
# Launcher artwork

Generated 2026-09-09 using built-in OpenAI image_gen. One original generation, no reference images. Original preserved in /Users/dbur/.codex/generated_images/01a086b1-cf1a-7a32-a376-6d8a642fc31b/exec-214c008c-0066-49df-8ff0-cd5d444937d8.png.

Inspected: right-facing horizontal dark teal and brushed metal food cannon, copper bolts, pale lime stripe. No base, text or logos. Asset has a slight three-quarter view of the muzzle rather than strictly orthographic side-on. Actual silhouette occupies approximately x8–93%, y32–64%; backdrop is dark with subtle texture rather than guaranteed exact flat hex.

## Exact prompt
Use case: stylized-concept. Asset type: original game cannon barrel sprite for Do Not Feed It. Create one square 1024x1024 image. Side-view rotatable food-launching cannon barrel pointing EXACTLY RIGHT horizontally. View perfectly side-on as a 2D sprite, no perspective foreshortening. Isolated on perfectly flat solid dark #101b1c background. Polished hand-painted 3D stylized industrial kitchen equipment matching a dark teal and amber subterranean feeding kitchen. Dark desaturated teal enamel body, brushed metal barrel and muzzle, pale lime short safety stripe, copper bolts, subtle amber reflected light, rough worn tactile materials. Compact stout barrel silhouette. Barrel centered and fills image width from 15% to 85%, and height from 35% to 65%; muzzle at the right and breech at left. No pedestal or base. No text, logo, UI, hands, character, wheels, platform, environmental shadow, watermark or extra objects. Keep backdrop uniform and clean for sprite integration.

# Creature rig (branch `feat/creature-rig`, September 9 2026)

**No new image was generated.** The creature rig is built at runtime from the
existing `public/art/kitchen.png` by `lib/render/creature/rig.ts`, so there is
no new asset to license, no new prompt, and no risk of the art direction
drifting away from the painting.

What the rig does to that one file, once, on the first frame after it decodes:

- **Cuts** the two pupils and the tongue out of the painting with soft-edged
  masks. These are moved and scaled at draw time; the pixels are the painting's
  own. (Eyelids were originally cut the same way, from two bands of skin above
  and below each eye. A crop of real skin holds together only at the coverage it
  was cut at: at any other it stretches into a leaf-shaped sliver lying across
  the eyeball. The lids are now painted shapes in the skin colour sampled from
  the painting at (700, 300) and (640, 330), shaded with a rolled margin and a
  crease, and tinted arithmetically to follow whatever the skin is currently
  doing. No pixels are cut for them.)
- **Removes and rebuilds** the painted open mouth. Its outline was traced by
  hand off the picture (`MOUTH_OUTLINE` in `lib/render/creature/anatomy.ts`)
  and everything inside it — lips, teeth, tongue, cavity — is cut away and
  replaced with the creature's own chin skin (`CHIN_SOURCE`), tiled and flipped
  so the wrinkles keep running the right way, then relit through a soft-edged
  mask with the painting's own top-down falloff and a cast shadow under the
  nose. This is what lets the mouth close.
- **Removes and fills** each painted pupil the same way, so a new pupil can look
  around inside the sclera.
- **Paints one tooth** to the ivory sampled from the painting at (786, 200) in
  arena coordinates, with a little of the real tooth rubbed over it for grain.
  The painted fangs are small, low-contrast and half in shadow, so a cut of one
  cannot be scaled up into a whole jaw; every tooth in both rows is this sprite.

Everything else the creature does — head, jaw, belly, swallow, cheeks, antennae
— is a smooth displacement field applied to that same picture
(`lib/render/creature/warp.ts`). The creature is never cut out of the
background, so there is no silhouette edge that can tear.

The colours that are authored rather than sampled are the mouth cavity
(`rgb(46,16,14)` and `rgb(9,3,3)`), the tooth gradient, and the flush, pallor
and rage tints in `drawSkin` — all chosen against the painting's own palette,
and all applied through a soft silhouette mask derived from the same file so
they never end on a hard edge across the body.

Generator: none. Source file: `public/art/kitchen.png`, already recorded above.
