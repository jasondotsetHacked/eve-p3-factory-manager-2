export const EVE_SSO_SCOPES = [
  "esi-planets.manage_planets.v1",
  "esi-assets.read_assets.v1",
];

export const EVE_SSO_STORAGE_KEYS = {
  state: "piFactoryManager.sso.state",
  verifier: "piFactoryManager.sso.codeVerifier",
  token: "piFactoryManager.sso.token",
};

export const EVE_SSO_ENDPOINTS = {
  metadata: "https://login.eveonline.com/.well-known/oauth-authorization-server",
  authorize: "https://login.eveonline.com/v2/oauth/authorize",
  token: "https://login.eveonline.com/v2/oauth/token",
};

export function getEveClientId() {
  return window.PI_FACTORY_MANAGER_CONFIG?.eveClientId || "";
}

export function getRedirectUri() {
  return window.PI_FACTORY_MANAGER_CONFIG?.redirectUri || window.location.origin + window.location.pathname;
}
