# PI Factory Manager

PI Factory Manager is a static web app foundation for EVE Online Planetary Industry. The long-term goal is to authenticate an EVE character with browser-safe EVE SSO, fetch Planetary Industry colony data from ESI, render colony layouts visually, and combine live ESI data with selected Static Data Export lookups.

The app is intentionally plain HTML, CSS, and JavaScript so it can be hosted on GitHub Pages with minimal dependencies.

## Architecture

The frontend uses an atomic-style UI organization:

- `src/ui/primitives`: reusable low-level UI building blocks such as buttons, panels, cards, and tooltips.
- `src/ui/components`: focused UI pieces such as colony list items, SVG pin nodes, and inspector rows.
- `src/ui/modules`: feature sections such as the colony sidebar, colony map, and pin inspector.
- `src/ui/layouts`: page layout composition.
- `src/ui/pages`: page-level orchestration.

Supporting layers:

- `src/data`: authentication, ESI client code, ESI colony mapping, and static-data lookup helpers.
- `src/utils`: DOM helpers, formatting helpers, and layout geometry helpers.
- `src/styles`: reset, design tokens, base layout styles, and utilities.

## Current Milestone

The app now has a live ESI-backed PI colony shell:

- Header with an EVE SSO placeholder action.
- Left colony sidebar with live character colonies.
- Center SVG graph renderer.
- Right pin inspector panel.
- Live ESI colony pins and links.
- Pin hover tooltip.
- Pin click selection and inspector population.
- Browser EVE SSO PKCE login, callback handling, character JWT decoding, and logout.
- Authenticated ESI client helpers for PI planets, PI colony layouts, and character assets.
- Local ESI exploration tests that can capture authenticated responses into ignored `dev/esi`.
- Local SDE updater that downloads official JSONL exports into ignored `dev/sde`.

The renderer uses an abstract grid graph layout derived from ESI links, not a latitude/longitude planet projection.

## Local Development

Serve the app:

```sh
npm run serve
```

Run tests:

```sh
npm test
```

Update the local SDE cache and generated manifest:

```sh
npm run sde:update
```

See `docs/eve-developer-setup.md` for EVE developer portal setup and `docs/dev-workflow.md` for ESI/SDE exploration notes.

## Likely Next Milestones

1. Add EVE SSO PKCE authentication for a static browser app.
2. Fetch live colonies from `GET /characters/{character_id}/planets/`.
3. Fetch selected colony details from `GET /characters/{character_id}/planets/{planet_id}/`.
4. Add SDE-derived PI lookup JSON for type names, pin names, schematics, recipes, and cycle times.
5. Expand the SVG renderer with route visualization, status indicators, richer hover states, and building inspectors.
6. Research `GET /characters/{character_id}/assets/` for planetary customs office inventory display.
