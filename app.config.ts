import type { ConfigContext, ExpoConfig } from 'expo/config';

// Extends app.json with values that come from the environment at build time.
//
// Google Sign-In (Drive backup) on iOS needs the reversed iOS OAuth client ID registered as
// a URL scheme. Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
// read by src/lib/googleAuth.ts) in .env locally or in eas.json / EAS environment variables.
// Without them the app builds normally and Settings says backup isn't set up.
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const iosUrlScheme = iosClientId
  ? `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`
  : 'com.googleusercontent.apps.not-configured';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    ['@react-native-google-signin/google-signin', { iosUrlScheme }],
  ],
});
