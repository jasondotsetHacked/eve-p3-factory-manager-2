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

To run authenticated endpoint captures, create a local `.env` from `.env.example`, export the values into your shell, then run:

```sh
npm run test:esi
```

Required values for private endpoint calls:

```sh
export EVE_ACCESS_TOKEN="..."
export EVE_CHARACTER_ID="..."
export EVE_PLANET_ID="..."
export EVE_USER_AGENT="PIFactoryManager/0.1.0 (you@example.com; +https://github.com/your-name/pi-factory-manager)"
```

The tests write successful response snapshots to `dev/esi`.

## SDE Management

The updater uses CCP's official static data automation URLs. It downloads the latest JSON Lines archive into `dev/sde/downloads`, extracts PI-relevant files into `dev/sde/extracted`, and updates `src/data/sde/generated/manifest.json`.

Run:

```sh
npm run sde:update
```

The script expects the system `unzip` command to be available. The downloaded archive and extracted JSONL files stay ignored because they are large and reproducible.
