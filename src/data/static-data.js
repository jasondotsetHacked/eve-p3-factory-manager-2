const SDE_MANIFEST_URL = "./src/data/sde/generated/manifest.json";
const PI_LOOKUPS_URL = "./src/data/sde/generated/pi-lookups.json";

let piLookupsPromise = null;

export async function fetchSdeManifest() {
  const response = await fetch(SDE_MANIFEST_URL);

  if (!response.ok) {
    throw new Error(`Failed to load SDE manifest: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchPiLookups() {
  if (!piLookupsPromise) {
    piLookupsPromise = fetch(PI_LOOKUPS_URL).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load PI lookups: ${response.status} ${response.statusText}`);
      }

      return response.json();
    });
  }

  return piLookupsPromise;
}

export function lookupTypeName(typeId, lookups = null) {
  return lookups?.typeNames?.[typeId] ?? `Type ${typeId}`;
}

export function lookupSchematicName(schematicId, lookups = null) {
  return lookups?.schematics?.[schematicId]?.name ?? `Schematic ${schematicId}`;
}

export function lookupSchematic(schematicId, lookups = null) {
  return lookups?.schematics?.[schematicId] ?? null;
}
