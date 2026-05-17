const ESI_BASE_URL = "https://esi.evetech.net/latest";

export function getEsiBaseUrl() {
  return ESI_BASE_URL;
}

export async function fetchCharacterPlanets() {
  throw new Error("Live ESI colony fetching is not implemented yet.");
}

export async function fetchCharacterPlanetLayout() {
  throw new Error("Live ESI colony layout fetching is not implemented yet.");
}

export async function fetchCharacterAssets() {
  throw new Error("Character asset research is not implemented yet.");
}
