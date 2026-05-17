export function getAuthStatus() {
  return {
    isAuthenticated: false,
    characterName: null,
  };
}

export function describeAuthPlan() {
  return "EVE SSO PKCE authentication will be implemented in a later milestone.";
}
