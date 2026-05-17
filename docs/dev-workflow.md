# Development Workflow

## Ignored `dev/` Workspace

The root `dev/` directory is ignored by git. Use it for disposable API captures and large downloaded files:

- `dev/esi`: authenticated ESI response captures from local tests.
- `dev/sde/downloads`: downloaded SDE archives.
- `dev/sde/extracted`: selected SDE JSONL files extracted for inspection.

The repeatable tooling is tracked outside `dev/`:

- `test/esi-contract.test.js`
- `scripts/update-sde.js`

## ESI Exploration Tests

Run the public contract checks:

```sh
npm test
```

To run authenticated endpoint captures, create a local `.env` from `.env.example`, then run:

```sh
npm run test:esi
```

Required values for private endpoint calls:

```sh
EVE_ACCESS_TOKEN=...
EVE_CHARACTER_ID=...
EVE_PLANET_ID=
EVE_USER_AGENT=PIFactoryManager/0.1.0 local-dev
```

The tests write successful response snapshots to `dev/esi`.

## SDE Management

The updater uses CCP's official static data automation URLs. It downloads the latest JSON Lines archive into `dev/sde/downloads`, extracts PI-relevant files into `dev/sde/extracted`, and updates `src/data/sde/generated/manifest.json`.

Run:

```sh
npm run sde:update
```

The script reads the current `buildNumber` from CCP's `latest.jsonl` metadata. For extraction, it tries these options in order:

1. Native Node ZIP extraction for selected JSONL files.
2. `unzip`
3. `tar`
4. Windows PowerShell `Expand-Archive`

The downloaded archive and extracted JSONL files stay ignored because they are large and reproducible.

The current extracted files are:

- `types.jsonl`
- `planetSchematics.jsonl`
- `planetResources.jsonl`
- `mapPlanets.jsonl`

In the current JSONL SDE, `planetSchematics.jsonl` contains the schematic `pins` and input/output `types` data that older exports exposed through separate map files.
