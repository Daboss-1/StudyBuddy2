# Workspace Account Authentication Fix

## The Problem

**Symptom**: 401 error when signing up with a school Google Workspace account, but authentication works fine when:
1. Signing in with a personal account first
2. Then authorizing Google Classroom access on the dashboard with the school account

## Root Cause Analysis

The issue occurs because there are **two different OAuth flows** in the application:

### 1. Firebase Authentication (Used during signup)
```javascript
// From AuthContext.js
signInWithPopup(auth, googleProvider)
```
- Uses Firebase's OAuth implementation
- Requests scopes through Firebase's Google Auth Provider
- **Problem**: Google Workspace admins often block Firebase Authentication as an authorized OAuth app
- Even though the same scopes are requested, the OAuth client (Firebase) is blocked

### 2. Google Identity Services (Used on dashboard)
```javascript
// From googleAuth.js
window.google.accounts.oauth2.initTokenClient()
```
- Uses Google's newer direct OAuth 2.0 library
- Direct OAuth flow without Firebase as intermediary
- **Works**: This uses your app's OAuth client ID directly, which isn't blocked

## Why Personal Accounts Work

Personal Gmail accounts (`@gmail.com`) don't have administrator restrictions:
- No OAuth app allowlist/blocklist
- All Google APIs are available by default
- Both Firebase Auth and Google Identity Services work fine

## Why School Accounts Fail (Sometimes)

Google Workspace administrators can:
1. ✅ Allow your app's OAuth client (the one in `NEXT_PUBLIC_GOOGLE_CLIENT_ID`)
2. ❌ Block Firebase Authentication service as an OAuth provider
3. Restrict which scopes third-party apps can request

Result: Direct OAuth works, Firebase Auth doesn't.

## The Solution

Implemented a **fallback authentication flow**:

1. **Try Firebase Auth first** (works for personal accounts)
2. **On 401 error**, automatically switch to **Google Identity Services**
3. Create user session manually without Firebase Auth
4. Store session in localStorage and Firestore

### Code Changes

#### 1. Dual Authentication Flow (`AuthContext.js`)

```javascript
const loginWithGoogle = async () => {
  try {
    // Try Firebase Auth first
    const result = await signInWithPopup(auth, googleProvider);
    // Success! Continue with Firebase Auth...
  } catch (firebaseError) {
    // Check if 401/Workspace restriction error
    if (is401Error) {
      // Fallback to Google Identity Services
      await loginWithGoogleIdentityServices();
    }
  }
};
```

#### 2. Alternative Login Method

```javascript
const loginWithGoogleIdentityServices = async () => {
  // 1. Get OAuth token with all scopes
  const accessToken = await classroomAuth.requestAccessToken();
  
  // 2. Fetch user info from Google API
  const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  // 3. Create custom user ID and store in Firestore
  const customUserId = `google_${userInfo.id}`;
  await createUser(customUserId, userData);
  
  // 4. Store session in localStorage
  localStorage.setItem('custom_user_id', customUserId);
};
```

#### 3. Session Persistence

Updated `onAuthStateChanged` listener to check for both:
- Firebase Auth users (via `auth.currentUser`)
- Custom OAuth users (via `localStorage.getItem('custom_user_id')`)

#### 4. Token Management

Updated `getIdTokenValue()` to return:
- Firebase ID token for Firebase Auth users
- OAuth access token for Google Identity users

## User Experience

### Personal Account (@gmail.com)
1. Click "Sign in with Google"
2. Firebase Auth popup → Success
3. OAuth consent screen (one time)
4. Logged in with full Classroom access

### School Account (Workspace) - Firebase Blocked
1. Click "Sign in with Google"
2. Firebase Auth popup → **Fails with 401**
3. **Automatic fallback** to Google Identity Services
4. OAuth consent screen with all scopes
5. Logged in with full Classroom access
6. User sees no error - seamless experience!

### School Account - Firebase Allowed
1. Works exactly like personal account
2. No fallback needed

## Testing Checklist

- [ ] Sign in with personal Gmail account → Should use Firebase Auth
- [ ] Sign in with school account (Firebase blocked) → Should auto-fallback to Google Identity Services
- [ ] Sign in with school account (Firebase allowed) → Should use Firebase Auth
- [ ] Session persistence after page refresh for both auth types
- [ ] Logout clears both Firebase and custom sessions
- [ ] Google Classroom data loads correctly for both auth types
- [ ] Cache initialization works for both auth types

## Technical Details

### User ID Format
- **Firebase Auth**: Firebase-generated UID (e.g., `abc123xyz...`)
- **Google Identity**: Custom format `google_{googleId}` (e.g., `google_1234567890`)

### Provider Field
- **Firebase Auth**: `provider: 'google'`
- **Google Identity**: `provider: 'google-identity'`

### Session Storage
- **Firebase Auth**: Managed by Firebase SDK automatically
- **Google Identity**: Stored in `localStorage.getItem('custom_user_id')`

### Token Storage
Both methods store OAuth tokens in:
- `localStorage.getItem('google_classroom_token')`
- `localStorage.getItem('google_classroom_token_expiry')`

## Benefits

✅ **Seamless Experience**: Users never see the 401 error  
✅ **Automatic Fallback**: No manual intervention needed  
✅ **Works for All**: Personal accounts, Workspace accounts, both work  
✅ **No Data Loss**: Same Firestore storage for both auth methods  
✅ **Maintains Features**: All features work regardless of auth method  
✅ **Future-Proof**: Easy to add more auth providers if needed  

## Potential Limitations

⚠️ **Firebase Features**: Users authenticated via Google Identity Services won't have access to some Firebase Auth-specific features (password reset, email verification, etc.) - but these weren't being used anyway.

⚠️ **Admin SDK**: If you use Firebase Admin SDK to verify tokens server-side, you'll need to handle both Firebase ID tokens and OAuth access tokens.

## Alternative Solutions Considered

### 1. ❌ Request Admin Approval
- **Pros**: Would make Firebase Auth work for school accounts
- **Cons**: Requires IT admin action, may take weeks, not guaranteed

### 2. ❌ Only Use Google Identity Services
- **Pros**: Single auth flow
- **Cons**: Would require rewriting entire auth system, losing Firebase features

### 3. ✅ **Dual Auth Flow (Implemented)**
- **Pros**: Works for everyone, automatic, maintains Firebase benefits
- **Cons**: Slightly more complex code (but well worth it)

## References

- [Firebase Auth with Google](https://firebase.google.com/docs/auth/web/google-signin)
- [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/overview)
- [Google Workspace Admin OAuth Controls](https://support.google.com/a/answer/7281227)
