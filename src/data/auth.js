import { EVE_SSO_ENDPOINTS, EVE_SSO_SCOPES, EVE_SSO_STORAGE_KEYS, getEveClientId, getRedirectUri } from "./sso-config.js";

function base64UrlEncode(bytes) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomBase64Url(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256Base64Url(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return base64UrlEncode(new Uint8Array(digest));
}

export function getAuthStatus() {
  const tokenJson = sessionStorage.getItem(EVE_SSO_STORAGE_KEYS.token);

  if (!tokenJson) {
    return {
      isAuthenticated: false,
      characterName: null,
    };
  }

  try {
    const token = JSON.parse(tokenJson);
    return {
      isAuthenticated: Boolean(token.access_token),
      characterName: token.characterName ?? "EVE Character",
    };
  } catch {
    return {
      isAuthenticated: false,
      characterName: null,
    };
  }
}

export async function buildAuthorizationRequest({ clientId = getEveClientId(), redirectUri = getRedirectUri(), scopes = EVE_SSO_SCOPES } = {}) {
  if (!clientId) {
    throw new Error("Missing EVE SSO client id. Set window.PI_FACTORY_MANAGER_CONFIG.eveClientId.");
  }

  const state = randomBase64Url(24);
  const codeVerifier = randomBase64Url(32);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return {
    url: `${EVE_SSO_ENDPOINTS.authorize}?${params.toString()}`,
    state,
    codeVerifier,
    redirectUri,
    scopes,
  };
}

export async function beginEveSsoLogin(options = {}) {
  const request = await buildAuthorizationRequest(options);
  sessionStorage.setItem(EVE_SSO_STORAGE_KEYS.state, request.state);
  sessionStorage.setItem(EVE_SSO_STORAGE_KEYS.verifier, request.codeVerifier);
  window.location.assign(request.url);
}

export function parseAuthorizationResponse(url = window.location.href) {
  const parsed = new URL(url);
  const code = parsed.searchParams.get("code");
  const state = parsed.searchParams.get("state");
  const error = parsed.searchParams.get("error");
  const errorDescription = parsed.searchParams.get("error_description");

  return { code, state, error, errorDescription };
}

export function assertValidAuthorizationState(returnedState) {
  const expectedState = sessionStorage.getItem(EVE_SSO_STORAGE_KEYS.state);

  if (!expectedState || !returnedState || expectedState !== returnedState) {
    throw new Error("Invalid EVE SSO state returned from authorization callback.");
  }
}

export async function exchangeCodeForToken({ code, clientId = getEveClientId(), redirectUri = getRedirectUri() }) {
  const codeVerifier = sessionStorage.getItem(EVE_SSO_STORAGE_KEYS.verifier);

  if (!codeVerifier) {
    throw new Error("Missing PKCE code verifier from session storage.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  });

  const response = await fetch(EVE_SSO_ENDPOINTS.token, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`EVE SSO token exchange failed: ${response.status} ${response.statusText}`);
  }

  const token = await response.json();
  sessionStorage.setItem(EVE_SSO_STORAGE_KEYS.token, JSON.stringify(token));
  sessionStorage.removeItem(EVE_SSO_STORAGE_KEYS.state);
  sessionStorage.removeItem(EVE_SSO_STORAGE_KEYS.verifier);
  return token;
}

export function logout() {
  sessionStorage.removeItem(EVE_SSO_STORAGE_KEYS.token);
}

export function getRequiredScopes() {
  return [...EVE_SSO_SCOPES];
}

export function getAuthStatusMessage() {
  return {
    isAuthenticated: getAuthStatus().isAuthenticated,
    scopes: getRequiredScopes(),
  };
}

export function describeAuthPlan() {
  return "EVE SSO PKCE helpers are ready; UI callback handling and token validation are planned for the next milestone.";
}
