import { getAuthSession, isSessionExpired } from "./auth.js";

const ESI_BASE_URL = "https://esi.evetech.net/latest";
const ESI_COMPATIBILITY_DATE = "2026-05-17";

export function getEsiBaseUrl() {
  return ESI_BASE_URL;
}

export function getAuthenticatedEsiContext() {
  const session = getAuthSession();

  if (!session || isSessionExpired(session)) {
    throw new Error("Sign in with EVE SSO before calling authenticated ESI endpoints.");
  }

  if (!session.characterId) {
    throw new Error("The EVE SSO token did not include a character id.");
  }

  return {
    characterId: session.characterId,
    accessToken: session.accessToken,
  };
}

async function esiRequest(path, { accessToken, searchParams } = {}) {
  if (!accessToken) {
    throw new Error("Missing EVE access token for authenticated ESI request.");
  }

  const url = new URL(`${ESI_BASE_URL}${path}`);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Compatibility-Date": ESI_COMPATIBILITY_DATE,
    },
  });

  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message = typeof body === "object" && body?.error ? body.error : response.statusText;
    throw new Error(`ESI request failed (${response.status}): ${message}`);
  }

  return body;
}

export async function fetchUniverseNames(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];

  if (!uniqueIds.length) {
    return {};
  }

  const entries = await Promise.all(uniqueIds.map((id) => fetchUniverseName(id)));
  return Object.fromEntries(entries.filter(Boolean).map((entry) => [entry.id, entry.name]));
}

async function fetchUniverseName(id) {
  const namesResponse = await fetch(`${ESI_BASE_URL}/universe/names/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Compatibility-Date": ESI_COMPATIBILITY_DATE,
    },
    body: JSON.stringify([id]),
  });

  if (namesResponse.ok) {
    const [entry] = await namesResponse.json();
    return entry;
  }

  const planetResponse = await fetch(`${ESI_BASE_URL}/universe/planets/${id}/`, {
    headers: {
      Accept: "application/json",
      "X-Compatibility-Date": ESI_COMPATIBILITY_DATE,
    },
  });

  if (planetResponse.ok) {
    const planet = await planetResponse.json();
    return { id, name: planet.name };
  }

  const systemResponse = await fetch(`${ESI_BASE_URL}/universe/systems/${id}/`, {
    headers: {
      Accept: "application/json",
      "X-Compatibility-Date": ESI_COMPATIBILITY_DATE,
    },
  });

  if (systemResponse.ok) {
    const system = await systemResponse.json();
    return { id, name: system.name };
  }

  console.warn(`Could not resolve ESI universe name for ${id}.`);
  return null;
}

export async function fetchCharacterPlanets({ characterId, accessToken }) {
  return esiRequest(`/characters/${characterId}/planets/`, { accessToken });
}

export async function fetchMyPlanets() {
  return fetchCharacterPlanets(getAuthenticatedEsiContext());
}

export async function fetchCharacterPlanetLayout({ characterId, planetId, accessToken }) {
  return esiRequest(`/characters/${characterId}/planets/${planetId}/`, { accessToken });
}

export async function fetchMyPlanetLayout(planetId) {
  return fetchCharacterPlanetLayout({
    ...getAuthenticatedEsiContext(),
    planetId,
  });
}

export async function fetchCharacterAssets({ characterId, accessToken, page = 1 }) {
  return esiRequest(`/characters/${characterId}/assets/`, {
    accessToken,
    searchParams: { page },
  });
}

export async function fetchMyAssets(page = 1) {
  return fetchCharacterAssets({
    ...getAuthenticatedEsiContext(),
    page,
  });
}
