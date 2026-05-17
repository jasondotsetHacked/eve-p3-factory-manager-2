import { EVE_SSO_ENDPOINTS, EVE_SSO_SCOPES, EVE_SSO_STORAGE_KEYS, getEveClientId, getRedirectUri } from "./sso-config.js";

const CLOCK_SKEW_SECONDS = 30;

function base64UrlEncode(bytes) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
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

function decodeJwtPayload(jwt) {
  const [, payload] = jwt.split(".");

  if (!payload) {
    throw new Error("EVE SSO returned an invalid JWT.");
  }

  return JSON.parse(base64UrlDecode(payload));
}

function characterIdFromSubject(subject) {
  const match = /^CHARACTER:EVE:(\d+)$/.exec(subject ?? "");
  return match ? Number(match[1]) : null;
}

function createSession(token) {
  const accessTokenPayload = decodeJwtPayload(token.access_token);
  const expiresIn = Number(token.expires_in ?? 0);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = expiresIn ? now + expiresIn : accessTokenPayload.exp;

  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? null,
    tokenType: token.token_type ?? "Bearer",
    expiresAt,
    characterId: characterIdFromSubject(accessTokenPayload.sub),
    characterName: accessTokenPayload.name ?? "EVE Character",
    scopes: typeof accessTokenPayload.scp === "string" ? accessTokenPayload.scp.split(" ") : accessTokenPayload.scp ?? [],
    jwt: {
      issuer: accessTokenPayload.iss,
      subject: accessTokenPayload.sub,
      audience: accessTokenPayload.aud,
    },
  };
}

export function getAuthSession() {
  const sessionJson = sessionStorage.getItem(EVE_SSO_STORAGE_KEYS.session);

  if (!sessionJson) {
    return null;
  }

  try {
    const session = JSON.parse(sessionJson);
    if (!session.accessToken || !session.expiresAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function isSessionExpired(session = getAuthSession()) {
  if (!session?.expiresAt) {
    return true;
  }

  return Math.floor(Date.now() / 1000) >= session.expiresAt - CLOCK_SKEW_SECONDS;
}

export function getAuthStatus() {
  const session = getAuthSession();

  if (!session || isSessionExpired(session)) {
    return {
      isAuthenticated: false,
      characterName: null,
      characterId: null,
      scopes: [],
    };
  }

  return {
    isAuthenticated: true,
    characterName: session.characterName,
    characterId: session.characterId,
    scopes: session.scopes,
  };
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

export function hasAuthorizationResponse(url = window.location.href) {
  const parsed = new URL(url);
  return parsed.searchParams.has("code") || parsed.searchParams.has("error");
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
  const session = createSession(token);
  sessionStorage.setItem(EVE_SSO_STORAGE_KEYS.session, JSON.stringify(session));
  sessionStorage.removeItem(EVE_SSO_STORAGE_KEYS.state);
  sessionStorage.removeItem(EVE_SSO_STORAGE_KEYS.verifier);
  return session;
}

export async function handleAuthorizationCallback(url = window.location.href) {
  const callback = parseAuthorizationResponse(url);

  if (callback.error) {
    throw new Error(callback.errorDescription || callback.error);
  }

  if (!callback.code) {
    return null;
  }

  assertValidAuthorizationState(callback.state);
  const session = await exchangeCodeForToken({ code: callback.code });
  window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
  return session;
}

export function logout() {
  sessionStorage.removeItem(EVE_SSO_STORAGE_KEYS.session);
  sessionStorage.removeItem(EVE_SSO_STORAGE_KEYS.state);
  sessionStorage.removeItem(EVE_SSO_STORAGE_KEYS.verifier);
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
