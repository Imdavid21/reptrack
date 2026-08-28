# RepTrack Chrome Extension

A minimal Manifest V3 extension for logging food and water into RepTrack through the existing MCP write tools.

## What it does

- Natural-language food logging through `parse-food-text` -> MCP `log_meal`
- Food-photo analysis through `analyze-food` -> MCP `log_meal`
- One-tap 250 / 500 / 750 ml hydration logging through MCP `log_water`
- Custom water amount
- One-time Connect button that opens RepTrack auth and captures the resulting browser session
- Extension-only water reminders at 30, 60, 90, or 120 minute intervals
- Reminders only notify between 09:00 and 22:00 local time

## Install locally

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select this `extension/` directory.
4. Pin **RepTrack**.
5. Open the extension and press **Connect** once.
6. Sign in to RepTrack in the tab that opens. The extension captures the resulting session automatically.
7. Reopen the extension and it should show **Connected**.

## Authentication

The extension does not ask for an API key or store a RepTrack password. The Connect action opens RepTrack's normal auth surface. `content.js` only runs on RepTrack origins and copies the resulting Supabase access token into extension-local storage. All food and water writes still go through the authenticated RepTrack MCP endpoint and Row Level Security remains in force.

If the session expires, press **Connect** again.

## Water reminders

Reminders belong only to the Chrome extension. They do not create RepTrack reminders, database rows, or app notifications. Chrome alarms and notifications are stored and scheduled locally by the extension.

The default is enabled every 60 minutes. The popup can disable reminders or switch to 30, 60, 90, or 120 minutes.
