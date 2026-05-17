import { getAuthStatus, handleAuthorizationCallback, hasAuthorizationResponse } from "./data/auth.js";
import { mapEsiColonyToViewModel } from "./data/colony-mapper.js";
import { fetchMyPlanetLayout, fetchMyPlanets, fetchUniverseNames } from "./data/esi-client.js";
import { fetchPiLookups } from "./data/static-data.js";
import { qs } from "./utils/dom.js";
import { DashboardPage } from "./ui/pages/DashboardPage.js";

const mount = qs("#app");

async function loadLiveColonies() {
  const planets = await fetchMyPlanets();
  let names = {};
  try {
    names = await fetchUniverseNames(planets.flatMap((planet) => [planet.planet_id, planet.solar_system_id]));
  } catch (error) {
    console.warn("Universe name lookup failed; rendering with numeric IDs.", error);
  }

  const lookups = await fetchPiLookups();
  const details = await Promise.all(
    planets.map(async (planet) => ({
      planet,
      detail: await fetchMyPlanetLayout(planet.planet_id),
    })),
  );

  return details.map(({ planet, detail }) => mapEsiColonyToViewModel({ planet, detail, names, lookups }));
}

async function startApp() {
  if (hasAuthorizationResponse()) {
    mount.textContent = "Completing EVE SSO sign in...";
    await handleAuthorizationCallback();
  }

  const authStatus = getAuthStatus();
  let colonies = [];
  let dataSource = authStatus.isAuthenticated ? "live" : "auth-required";
  let loadError = null;

  if (authStatus.isAuthenticated) {
    mount.textContent = "Loading live ESI colonies...";
    try {
      colonies = await loadLiveColonies();
    } catch (error) {
      console.error(error);
      dataSource = "live-error";
      loadError = error;
    }
  }

  DashboardPage({
    mount,
    colonies,
    authStatus,
    dataSource,
    loadError,
  });
}

startApp().catch((error) => {
  console.error(error);
  mount.textContent = error.message;
});
