const SDE_MANIFEST_URL = "./src/data/sde/generated/manifest.json";

export async function fetchSdeManifest() {
  const response = await fetch(SDE_MANIFEST_URL);

  if (!response.ok) {
    throw new Error(`Failed to load SDE manifest: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function lookupTypeName(typeId) {
  return `Type ${typeId}`;
}

export function lookupSchematicName(schematicId) {
  return `Schematic ${schematicId}`;
}
