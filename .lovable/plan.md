
## Auth Page UX Optimization + "Last Used" Sign-in Method

### Changes (all in `src/pages/Auth.tsx`)

**1. "Last used" badge on sign-in method**
- Save the last successful sign-in method (`google`, `apple`, or `email`) to `localStorage` when a user signs in successfully.
- On the email step, show a subtle "Last used" badge/chip next to the method the user previously used (e.g., a small pill saying "Last used" below the Google button, or next to the email input).
- This helps returning users instantly remember how they signed in before.

**2. Loading spinner icons**
- Import `Loader2` from lucide-react.
- Replace plain "Checking...", "Signing in...", "Please wait..." text with a spinning `Loader2` icon alongside the text for better visual feedback.

**3. Mail icon in email input**
- Import `Mail` from lucide-react.
- Add a `Mail` icon inside the email input (left-positioned) for visual polish.

**4. Password strength indicator (new accounts only)**
- When `accountStatus === 'new'`, show a simple colored bar below the password input:
  - Red (weak): < 8 chars
  - Yellow (medium): 8+ chars
  - Green (strong): 10+ chars with mixed case/numbers
- Replaces the static "Minimum 6 characters" text with dynamic feedback.

**5. User icon in email chip (step 2)**
- Import `User` from lucide-react.
- Add a small `User` icon before the email text in the chip on the password step.

**6. Terms/Privacy footer always visible**
- Move the Terms/Privacy text outside the `accountStatus === 'new'` conditional so it shows for all users as a trust signal.

### Technical Details

- **localStorage key**: `reptrack_last_auth_method` with values `"google"`, `"apple"`, or `"email"`
- Save on successful sign-in (after `handleGoogleSignIn`, Apple handler, and `handlePasswordSubmit`)
- Read on mount to determine which method gets the "Last used" badge
- Password strength is computed inline (no new dependencies) based on length and character variety
- All changes contained to `src/pages/Auth.tsx` -- no new files or dependencies
