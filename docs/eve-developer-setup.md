# EVE Developer Portal Setup

Use this setup for local development of PI Factory Manager as a static browser app.

## Create the Application

1. Go to the EVE Online developer portal applications page: `https://developers.eveonline.com/applications`.
2. Create a new application for PI Factory Manager.
3. Choose the browser/static-app option if the portal offers one. If it asks for an OAuth flow, use Authorization Code with PKCE.
4. Copy the generated client ID into `src/config.js` as `eveClientId`.
5. Do not put a client secret in this repo or in browser JavaScript. Static frontends cannot keep secrets.

## Callback URLs

Register every redirect URI you will use. The redirect URI must match exactly.

For local development:

```text
http://127.0.0.1:4173/
```

For GitHub Pages, add the final Pages URL, for example:

```text
https://YOUR_GITHUB_USER.github.io/YOUR_REPOSITORY_NAME/
```

If GitHub Pages serves the app from a custom domain, add that exact URL as well.

## Required Scopes

Add these scopes to the EVE application:

```text
esi-planets.manage_planets.v1
esi-assets.read_assets.v1
```

`esi-planets.manage_planets.v1` is required for:

- `GET /characters/{character_id}/planets/`
- `GET /characters/{character_id}/planets/{planet_id}/`

`esi-assets.read_assets.v1` is required for:

- `GET /characters/{character_id}/assets/`

## Local Config

Set `src/config.js` after creating the app:

```js
window.PI_FACTORY_MANAGER_CONFIG = {
  eveClientId: "YOUR_PUBLIC_CLIENT_ID",
  redirectUri: "http://127.0.0.1:4173/",
};
```

The client ID is public. The client secret is not public and should not be used by this static app.

## Local Auth Test Notes

This repo now has PKCE helpers in `src/data/auth.js`. The next milestone should finish callback handling, token validation, character identity extraction, refresh behavior, and ESI request wiring.

Sources checked on May 17, 2026:

- EVE SSO documentation: `https://developers.eveonline.com/docs/services/sso/`
- ESI overview: `https://developers.eveonline.com/docs/services/esi/overview/`
- ESI best practices: `https://developers.eveonline.com/docs/services/esi/best-practices/`
