# Project rules

- Treat a saved positive workout duration as active minutes when computing net activity; it is authoritative after manual correction and must not have stored pauses subtracted again.
- Show the stored workout energy estimate in History and workout details, while daily totals recompute with the shared energy model; this keeps individual records visible without double-counting their linked burn entries.
- Keep password recovery on its own public route and exempt it from signed-in redirects, so recovery sessions can set a new password before reaching the dashboard.