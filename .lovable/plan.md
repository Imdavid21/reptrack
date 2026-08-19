# MCP status badge cleanup and unlimited date ranges

## Status card

Today the card shows "Fitness MCP", a subtitle reading `ok · v1.1.0`, and a hard green chip labelled "ok".

Changes:
- Remove the `ok · v1.1.0` subtitle line entirely.
- Healthy state: soft green chip labelled **Operational** - muted green background with a dark green label so the text reads clearly instead of white-on-saturated-green.
- Any other state: red/amber chip showing the **exact error text** returned by the health check (message, status, or HTTP error string), not the generic word "unknown" or "unreachable". If the fetch throws, the thrown message is shown verbatim.
- Keep the check icon on success only.

## Date range limits

Remove every date-window restriction across the MCP server:
- Drop the 30-day backdating cap for writes (`MAX_BACKDATE_DAYS`). Writes still reject malformed dates and future dates; only the "too old" rule goes away.
- Remove the 90-day ceiling on `get_recent_fitness_data`.
- Remove the row-count ceilings on read tools that currently cap at 50/100/365 rows, so a long range returns the whole range. Payload capping (400KB) stays as the single safety net so a huge response never breaks the client.
- Update tool descriptions so ChatGPT no longer thinks limits exist.

## Technical notes

- `src/pages/McpStatus.tsx`: rewrite the status card block; derive a `{ label, tone }` from the health response, capture the real error message in the `catch` branch, and style the success chip with a soft green token pair rather than MUI's default `color="success"`.
- `supabase/functions/mcp/core.ts`: `assertWritableDate` keeps format and future checks, drops the age check; `MAX_BACKDATE_DAYS` removed.
- `supabase/functions/mcp/index.ts`: relax `limit(...)` maxima and the `days` max, refresh descriptions and the `logDate` description.
- `src/lib/mcpSecurity.test.ts`: update assertions that expect `DATE_TOO_OLD_...` so the suite reflects the new behavior.
- Redeploy the `mcp` edge function after the changes.
