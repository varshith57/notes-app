import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

// Google sign-in for Drive backup (native builds only; see googleAuth.web.ts).
// Client IDs come from build-time env vars (see app.config.ts and DEPLOYMENT.md).
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/** Hidden per-app folder in the user's Drive: only this app can see or read it. */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

export interface GoogleUser {
  email: string;
  name: string | null;
}

export const isGoogleConfigured = Boolean(WEB_CLIENT_ID);

let configured = false;
function ensureConfigured() {
  if (configured || !isGoogleConfigured) return;
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    scopes: [DRIVE_SCOPE],
  });
  configured = true;
}

const toUser = (u: { user: { email: string; name: string | null } }): GoogleUser => ({
  email: u.user.email,
  name: u.user.name,
});

/** Restores a previous sign-in without UI; null if there isn't one. */
export async function restoreGoogleSession(): Promise<GoogleUser | null> {
  if (!isGoogleConfigured) return null;
  ensureConfigured();
  if (!GoogleSignin.hasPreviousSignIn()) return null;
  const res = await GoogleSignin.signInSilently();
  return res.type === 'success' ? toUser(res.data) : null;
}

/** Interactive sign-in. Resolves null if the user cancels. */
export async function signInWithGoogle(): Promise<GoogleUser | null> {
  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  try {
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return null;
    if (!res.data.scopes.includes(DRIVE_SCOPE)) {
      // The account chooser can let people untick Drive access; ask for it again.
      const added = await GoogleSignin.addScopes({ scopes: [DRIVE_SCOPE] });
      if (!added || !isSuccessResponse(added)) return null;
    }
    return toUser(res.data);
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return null;
    throw e;
  }
}

export async function signOutOfGoogle(): Promise<void> {
  ensureConfigured();
  await GoogleSignin.signOut();
}

/** A fresh Drive access token. Pass the stale one after a 401 to force a refresh. */
export async function getDriveAccessToken(stale?: string): Promise<string> {
  ensureConfigured();
  if (stale) await GoogleSignin.clearCachedAccessToken(stale);
  const { accessToken } = await GoogleSignin.getTokens();
  return accessToken;
}
