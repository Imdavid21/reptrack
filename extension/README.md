# RepTrack Quick Log Chrome Extension

A Manifest V3 capture surface for fast food and water logging. It uses the existing RepTrack Supabase session and MCP endpoint, so extension logs land in the same `meals` and `water_logs` data used by the main app.

## V1

- Natural-language food logging through `parse-food-text` -> MCP `log_meal`
- Food-photo analysis through `analyze-food` -> MCP `log_meal`
- One-tap 250 / 500 / 750 ml hydration logging through MCP `log_water`
- Custom water amount
- Today's calories, protein, and water through MCP `get_nutrition`
- RepTrack light design tokens and domain colors
- No separate extension credentials. The content script captures the signed-in RepTrack Supabase session into extension-local storage.

## Install locally

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select this `extension/` directory.
4. Open `https://reptrack.fitness` and sign in once. Reload the page after first installing the extension so the content script can capture the session.
5. Pin **RepTrack Quick Log** and open it from the toolbar.

## Authentication

The extension never asks for an API key or password. `content.js` reads the existing Supabase access token only on RepTrack origins and saves it in `chrome.storage.local`. MCP validates the bearer token server-side and RepTrack Row Level Security remains in force.

If the token expires, open or reload the signed-in RepTrack app. Supabase refreshes the browser session and the content script captures the current access token again.

## Deliberate V1 limit

Undo/delete is not included. RepTrack's MCP write surface deliberately exposes no delete operation, including for meals and hydration. A future undo should be implemented server-side as a narrowly scoped MCP tool that can only reverse a Quick Log write by its returned ID/client key, rather than bypassing MCP or Row Level Security from the extension.
