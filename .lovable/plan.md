

# Link Google/Apple Accounts from Settings

## Overview
Add a "Linked Accounts" section to the Settings page so users can connect Google or Apple logins to their existing email/password account -- even if the social account uses a different email address.

## How It Works
1. User signs in with their existing email/password
2. Opens Settings > Account section
3. Sees a new "Linked Accounts" subsection showing Google and Apple
4. Taps "Link" next to a provider
5. Completes the OAuth flow and returns to Settings
6. Can now sign in with either email or the linked social account

## Changes

### 1. `src/hooks/useAuth.ts`
- Add a `linkOAuthProvider(provider: "google" | "apple")` method
- Imports `lovable` from `@/integrations/lovable/index`
- Calls `lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + '/settings' })` so the user lands back on Settings after linking

### 2. `src/pages/Settings.tsx`
- Add a new "Linked Accounts" subsection inside the Account collapse (after the Password section, around line 420)
- Show two rows: Google and Apple
- Read `user?.identities` to check which providers are already connected
- For each provider:
  - If linked: show a green checkmark and the associated email from `identity_data.email`
  - If not linked: show a "Link" button that calls `linkOAuthProvider`
- Add loading state for the linking process
- Show a toast on success/failure after redirect

### 3. UI Layout (inside Account collapse)

```text
+-------------------------------------------+
| Linked Accounts                           |
+-------------------------------------------+
|  [G] Google   user@gmail.com    [Linked]  |
|  [] Apple    [Link]                      |
+-------------------------------------------+
```

- Follows the same `bgcolor: 'action.hover', borderRadius: 2, p: 2` pattern as the Email and Password subsections
- Google icon (colored SVG) and Apple icon (currentColor SVG) reused from Auth.tsx
- "Linked" shown as a muted green badge; "Link" as a small outlined button

### Edge Cases
- If linking fails because the OAuth account is already tied to a different app account, show a clear error toast: "This account is already linked to another user"
- The linking works even when the Google/Apple email differs from the sign-up email, because the auth system links by authenticated session, not by email matching

