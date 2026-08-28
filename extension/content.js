const AUTH_KEY_RE = /^sb-.*-auth-token$/;

function persistRepTrackSession() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !AUTH_KEY_RE.test(key)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const session = parsed?.currentSession || parsed?.session || parsed;
      const accessToken = session?.access_token;
      if (typeof accessToken === 'string' && accessToken.length > 20) {
        chrome.storage.local.set({
          reptrackAccessToken: accessToken,
          reptrackAuthCapturedAt: Date.now(),
        });
        return true;
      }
    }
  } catch {
    // The popup will surface a sign-in instruction when no usable token exists.
  }
  return false;
}

persistRepTrackSession();
window.addEventListener('storage', persistRepTrackSession);
setInterval(persistRepTrackSession, 60_000);
