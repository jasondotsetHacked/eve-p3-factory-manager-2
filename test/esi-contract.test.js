import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ESI_BASE_URL = "https://esi.evetech.net/latest";
const OUTPUT_DIR = "dev/esi";
const COMPATIBILITY_DATE = "2026-05-17";
const REQUIRED_ENDPOINTS = {
  "/characters/{character_id}/planets/": "esi-planets.manage_planets.v1",
  "/characters/{character_id}/planets/{planet_id}/": "esi-planets.manage_planets.v1",
  "/characters/{character_id}/assets/": "esi-assets.read_assets.v1",
};

async function loadLocalEnv() {
  let text;

  try {
    text = await readFile(".env", "utf8");
  } catch {
    return;
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const index = line.indexOf("=");
    if (index === -1) {
      continue;
    }

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

if (process.env.npm_lifecycle_event === "test:esi") {
  await loadLocalEnv();
}

function headers(accessToken) {
  return {
    Accept: "application/json",
    "X-Compatibility-Date": COMPATIBILITY_DATE,
    "User-Agent": process.env.EVE_USER_AGENT || "PIFactoryManager/0.1.0 (+https://github.com/)",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function saveJson(name, value) {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(join(OUTPUT_DIR, name), `${JSON.stringify(value, null, 2)}\n`);
}

async function getJson(url, accessToken) {
  const response = await fetch(url, { headers: headers(accessToken) });
  const text = await response.text();
  let body = text;

  try {
    body = JSON.parse(text);
  } catch {
    // Keep raw response text for easier debugging.
  }

  return { response, body };
}

async function fetchPlanetsForTest(accessToken, characterId) {
  const { response, body } = await getJson(`${ESI_BASE_URL}/characters/${characterId}/planets/`, accessToken);
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body));
  await saveJson("characters-planets.json", body);
  return body;
}

test("ESI swagger exposes expected PI and asset scopes", async () => {
  const { response, body } = await getJson("https://esi.evetech.net/latest/swagger.json");
  assert.equal(response.status, 200);

  for (const [path, requiredScope] of Object.entries(REQUIRED_ENDPOINTS)) {
    const operation = body.paths[path]?.get;
    assert.ok(operation, `Missing GET ${path}`);

    const scopes = operation.security?.flatMap((entry) => entry.evesso ?? []) ?? [];
    assert.ok(scopes.includes(requiredScope), `Expected ${path} to require ${requiredScope}`);
  }

  await saveJson("swagger-endpoint-scope-snapshot.json", {
    checkedAt: new Date().toISOString(),
    endpoints: REQUIRED_ENDPOINTS,
  });
});

test("GET /characters/{character_id}/planets/ returns a colony list", async (t) => {
  const accessToken = process.env.EVE_ACCESS_TOKEN;
  const characterId = process.env.EVE_CHARACTER_ID;

  if (!accessToken || !characterId) {
    t.skip("Set EVE_ACCESS_TOKEN and EVE_CHARACTER_ID to run authenticated ESI checks.");
    return;
  }

  await fetchPlanetsForTest(accessToken, characterId);
});

test("GET /characters/{character_id}/planets/{planet_id}/ returns colony layout", async (t) => {
  const accessToken = process.env.EVE_ACCESS_TOKEN;
  const characterId = process.env.EVE_CHARACTER_ID;
  let planetId = process.env.EVE_PLANET_ID;

  if (!accessToken || !characterId) {
    t.skip("Set EVE_ACCESS_TOKEN and EVE_CHARACTER_ID to run colony layout checks.");
    return;
  }

  const planets = await fetchPlanetsForTest(accessToken, characterId);
  const configuredPlanet = planets.find((planet) => String(planet.planet_id) === String(planetId));
  planetId = configuredPlanet?.planet_id ?? planets[0]?.planet_id;

  if (!planetId) {
    t.skip("Character has no PI colonies to inspect.");
    return;
  }

  const { response, body } = await getJson(`${ESI_BASE_URL}/characters/${characterId}/planets/${planetId}/`, accessToken);
  await saveJson(`character-planet-${planetId}.json`, body);
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.pins), "Expected pins array");
  assert.ok(Array.isArray(body.links), "Expected links array");
});

test("GET /characters/{character_id}/assets/ returns character assets", async (t) => {
  const accessToken = process.env.EVE_ACCESS_TOKEN;
  const characterId = process.env.EVE_CHARACTER_ID;

  if (!accessToken || !characterId) {
    t.skip("Set EVE_ACCESS_TOKEN and EVE_CHARACTER_ID to run authenticated asset checks.");
    return;
  }

  const { response, body } = await getJson(`${ESI_BASE_URL}/characters/${characterId}/assets/`, accessToken);
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body));
  await saveJson("character-assets.json", body);
});
