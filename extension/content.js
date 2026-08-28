const AUTH_KEY_RE = /^sb-.*-auth-token$/;
const AUTH_STORAGE_KEYS = ['reptrackAccessToken', 'reptrackAuthCapturedAt'];

async function persistRepTrackSession() {
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
        await chrome.storage.local.set({
          reptrackAccessToken: accessToken,
          reptrackAuthCapturedAt: Date.now(),
        });
        return true;
      }
    }

    // If the RepTrack origin has no Supabase session anymore, mirror sign-out
    // into extension storage instead of pretending an expired connection is live.
    await chrome.storage.local.remove(AUTH_STORAGE_KEYS);
  } catch {
    // The popup will surface a sign-in instruction when no usable token exists.
  }
  return false;
}

void persistRepTrackSession();
window.addEventListener('storage', () => { void persistRepTrackSession(); });
window.addEventListener('focus', () => { void persistRepTrackSession(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void persistRepTrackSession();
});
// Same-document Supabase writes do not emit a storage event. A short poll keeps
// email sign-in and token refresh responsive without requiring page injection.
setInterval(() => { void persistRepTrackSession(); }, 5_000);
