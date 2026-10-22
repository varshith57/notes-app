// Google sign-in uses native SDKs, so backup is phone-only. The web preview gets this stub.
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

export interface GoogleUser {
  email: string;
  name: string | null;
}

export const isGoogleConfigured = false;

export async function restoreGoogleSession(): Promise<GoogleUser | null> {
  return null;
}

export async function signInWithGoogle(): Promise<GoogleUser | null> {
  throw new Error('Google sign-in is only available in the phone app.');
}

export async function signOutOfGoogle(): Promise<void> {}

export async function getDriveAccessToken(): Promise<string> {
  throw new Error('Google sign-in is only available in the phone app.');
}
