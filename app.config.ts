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

// Sideloaded APKs (eas.json "preview" profile sets SLIM_APK=1) ship one APK to every phone, so
// by default it carries native libraries for four CPU types. Keep only 64-bit ARM (nearly all
// phones since ~2017) and compress the libraries: ~100 MB → ~20 MB. Play Store AABs are already
// split per device by Google, so production builds keep every architecture.
const slimApk = process.env.SLIM_APK === '1';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    ['@react-native-google-signin/google-signin', { iosUrlScheme }],
    ...(slimApk
      ? [
          [
            'expo-build-properties',
            { android: { buildArchs: ['arm64-v8a'], useLegacyPackaging: true } },
          ] as [string, unknown],
        ]
      : []),
  ],
});
