# Deploying My Notes to Google Play and the Apple App Store

This app is built with **Expo (SDK 58)**. You don't need Xcode or Android Studio on your Mac: **EAS Build** compiles and signs the app in the cloud, and **EAS Submit** uploads it to the stores.

```
Your code ──► EAS Build (cloud) ──► .aab (Android) / .ipa (iOS) ──► EAS Submit ──► Play Console / App Store Connect ──► Review ──► Live
```

---

## Part 0 — One-time setup (both stores)

### 0.1 Accounts you need

| Account | Cost | Sign up | Approval time |
|---|---|---|---|
| Expo account | Free tier is enough to start | https://expo.dev/signup | Instant |
| Google Play Console | $25 one-time | https://play.google.com/console/signup | Identity checks take a few days |
| Apple Developer Program | $99/year | https://developer.apple.com/programs/enroll | Usually 1–2 days; longer for organisations (needs a D-U-N-S number) |

> **Personal or organisation account?** On Google Play, a *personal* account created after Nov 2023 must run a closed test with **at least 12 testers for 14 days in a row** before you can publish to production. *Organisation* accounts skip this, but need a D-U-N-S number. Start the 14-day test early (Part A, step 6).

### 0.2 Pick your final app identity

Edit [app.json](app.json) **before your first store build**. You can't change these after publishing:

| Field | Current value | What it is |
|---|---|---|
| `expo.name` | `My Notes` | Name under the icon (the store name is set separately) |
| `expo.ios.bundleIdentifier` | `com.varshith.mynotes` | Permanent iOS ID. Must be unique worldwide. |
| `expo.android.package` | `com.varshith.mynotes` | Permanent Android ID. Must be unique worldwide. |
| `expo.version` | `1.0.0` | Version users see. Bump it for each release (1.0.1, 1.1.0…). |

Build numbers (`versionCode` / `buildNumber`) increase automatically. That's handled by `"autoIncrement": true` and `"appVersionSource": "remote"` in [eas.json](eas.json).

### 0.3 App icon and splash

All icons are generated from one source drawing, [assets/icon-source.svg](assets/icon-source.svg) (burgundy note on cream). After changing the SVG or the colours in [scripts/generate-icons.mjs](scripts/generate-icons.mjs), regenerate them:

```bash
npm run icons
```

It writes:

- `assets/icon.png`: iOS/App Store icon, 1024×1024, no alpha channel (Apple rejects transparency)
- `assets/android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`: Android adaptive and themed icon layers, with the artwork inside the safe zone
- `assets/notification-icon.png`: white status-bar icon for reminders on Android
- `assets/splash-icon.png`: splash logo, shown on the cream splash background
- `assets/favicon.png`: web favicon
- `assets/store/play-store-icon-512.png`: upload this as the **App icon** in the Play Console store listing

> **Icon licence:** the drawing comes from the Noun Project ("Note" by iconisme). Using it without the credit line in a store app needs a paid licence (Noun Pro or a one-off icon purchase). Make sure you have one before publishing.

### 0.4 Privacy policy URL (both stores require one)

1. Fill in the placeholders in [PRIVACY_POLICY.md](PRIVACY_POLICY.md).
2. Host it at a public URL. Easy free options: a GitHub Pages site, a public Notion page, or Google Sites.
3. Keep the URL handy. Both stores ask for it.

### 0.5 Install the tooling and link the project

```bash
npm install -g eas-cli
```

```bash
eas login
```

```bash
eas init
```

`eas init` creates the project on expo.dev and writes `extra.eas.projectId` into `app.json`.

### 0.6 Test on your phone first

```bash
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android). SQLite, local notifications, the date picker and gradients all work in Expo Go.

For a build that matches the store version exactly, install a preview build on Android:

```bash
eas build --platform android --profile preview
```

This produces an `.apk` you can install straight from the link EAS gives you.

---

## Part A — Google Play Store (Android)

### A1. Build the release bundle

```bash
eas build --platform android --profile production
```

- On the first run, choose **"Generate a new Android Keystore"**. EAS stores it securely.
  ⚠️ This keystore signs every future update. Don't delete it from EAS. Optionally download a backup with `eas credentials`.
- The output is an **.aab** (Android App Bundle), the format Google Play requires.

### A2. Create the app in Play Console

1. Go to https://play.google.com/console and click **Create app**.
2. Enter the app name (e.g. "My Notes – Notes, Money & Tasks"), default language, **App** (not game), **Free**.
3. Accept the declarations and click **Create app**.

### A3. Complete "Set up your app" (Dashboard → App content)

| Section | What to answer for this app |
|---|---|
| **Privacy policy** | Your hosted URL from 0.4 |
| **App access** | "All functionality is available without special access" (there's no login) |
| **Ads** | No, the app has no ads |
| **Content rating** | Fill the IARC questionnaire. Category: *Utility/Productivity*. Answer "No" to violence and similar. Expect a rating of Everyone / PEGI 3. |
| **Target audience** | 18+ (or 13+). Avoid "under 13", which triggers the Families policy. |
| **News app** | No |
| **Data safety** | **"Does your app collect or share any of the required user data types?" → No.** All data stays on the device and is never transmitted. Encryption in transit isn't applicable because nothing is transmitted. |
| **Government app** | No |
| **Financial features** | Declare that the app is a personal expense/budget tracker that does **not** provide loans, banking, payments, trading or crypto. Pick the option that matches. |
| **Health** | No health features |

### A4. Store listing (Grow → Store presence → Main store listing)

- **App name** (≤30 chars), **Short description** (≤80), **Full description** (≤4000)
- **App icon** 512×512 PNG: use `assets/store/play-store-icon-512.png`
- **Feature graphic** 1024×500
- **Phone screenshots**: at least 2 (up to 8), 16:9 or 9:16, min 320px. Take them from the preview build: Home, Notes, Note editor with colours, Finance, Tasks/Agenda.
- **Category**: Productivity. **Contact email** is required.

### A5. Connect EAS Submit to Google Play (one time)

1. In Google Cloud Console, create a **service account** and download its **JSON key**.
   Expo's step-by-step guide: https://expo.fyi/creating-google-service-account
2. In Play Console → **Users and permissions**, invite the service-account email and grant release permissions for this app.
3. Give the key to EAS:

```bash
eas credentials --platform android
```

Choose *production* → *Google Service Account* → upload the JSON. Don't commit the key to git.

### A6. Upload and run the closed test (required for new personal accounts)

```bash
eas submit --platform android --latest
```

[eas.json](eas.json) sends this to the **internal** track as a **draft**. Then in Play Console:

1. **Testing → Closed testing → Create track**. Add the build from the app bundle library.
2. Add testers by Google-account email or a Google Group. You need **at least 12** people who **opt in** via the link and keep the app installed.
3. Roll out the release. Testers install it from the Play Store via the opt-in link.
4. Keep 12+ testers opted in for **14 consecutive days**. Ask them to actually use the app.
5. After 14 days: **Dashboard → Apply for production**. Answer the short questionnaire about your testing.

*(Organisation accounts can skip straight to A7.)*

### A7. Release to production

1. **Production → Create new release** → add the build (or promote it from closed testing).
2. Release notes, e.g. "First release: personal notes, finance tracker, tasks & reminders."
3. Pick **Countries/regions**.
4. **Review release → Start rollout to Production**.
5. Review usually takes a few hours to a few days. You'll get an email when it's live.

### A8. Shipping updates (Android)

1. Bump `"version"` in `app.json` (e.g. `1.0.1`).
2. Build and submit:

```bash
eas build --platform android --profile production --auto-submit
```

3. Promote the release from the internal track to production in Play Console.

---

## Part B — Apple App Store (iOS)

### B1. Register the bundle ID and build

```bash
eas build --platform ios --profile production
```

When prompted, sign in with your **Apple Developer** account. EAS will automatically:

- register the bundle ID `com.varshith.mynotes`
- create the distribution certificate and provisioning profile

The output is an **.ipa**.

> `ITSAppUsesNonExemptEncryption: false` is already set in `app.json`. The app only uses standard OS encryption, so App Store Connect won't ask the export-compliance question on every upload.

### B2. Create the app in App Store Connect

1. Go to https://appstoreconnect.apple.com → **Apps → + → New App**.
2. Platform **iOS**. Name (≤30 chars, must be unique on the App Store). Primary language. Bundle ID `com.varshith.mynotes`. SKU (any internal ID, e.g. `mynotes-001`). **Full Access**.

(If you skip this step, `eas submit` can create the app record for you.)

### B3. Upload the build

```bash
eas submit --platform ios --latest
```

Sign in with your Apple ID when asked. EAS creates an **App Store Connect API key** and reuses it from then on. Processing takes 5–30 minutes. Apple emails you when the build is ready.

### B4. Test with TestFlight (strongly recommended)

1. App Store Connect → your app → **TestFlight**.
2. **Internal testing**: add yourself and up to 100 team members. Builds are available right away, with no review.
3. Optional **External testing**: up to 10,000 testers via email or a public link. The first build needs a brief Beta App Review (about a day).
4. Install the **TestFlight** app on your iPhone and test everything: notes autosave, colours, finance categories and custom subcategories, month history, agenda, and reminders (check that the notification fires).

### B5. Fill in the App Store listing (App Store tab → version 1.0)

| Item | Requirement / suggestion |
|---|---|
| **Screenshots** | Required for **6.9" iPhone** (1320×2868 or 1290×2796). Apple scales these down for smaller phones. Because `supportsTablet: true`, **13" iPad** screenshots (2064×2752) are also required. If you don't want to support iPad, set `"supportsTablet": false` in app.json. 3–10 per size. |
| **Promotional text** | ≤170 chars, editable any time |
| **Description** | ≤4000 chars |
| **Keywords** | ≤100 chars, comma-separated, e.g. `notes,journal,expense,budget,todo,reminder,planner,agenda,tasks` |
| **Support URL** | Required. Can be the same site that hosts your privacy policy. |
| **Build** | Select the build you uploaded |
| **App Review Information** | Contact info. **Sign-in required: No.** Notes for the reviewer, e.g. "All data is stored locally. No account needed. Reminders use local notifications." |
| **Version release** | Manual or automatic after approval |

### B6. App Privacy and other required sections (App Store Connect → App Privacy, App Information)

- **Privacy Policy URL**: your hosted URL.
- **Data collection** → **"No, we do not collect data from this app."** Apple defines "collect" as transmitting data off the device. This app doesn't, so the label will read **"Data Not Collected"**.
- **Age rating questionnaire** → answer None/No throughout → 4+.
- **Category**: Productivity (secondary: Finance).
- **Pricing and Availability**: Free, choose countries.

### B7. Submit for review

Click **Add for Review → Submit to App Review**. Review usually takes 24–48 hours.

Common rejection reasons to avoid:

- **Guideline 4.2 (minimum functionality)**: the app needs to feel complete. This one has three full sections, which helps. Use real screenshots, not mock-ups.
- **Crashes or placeholder content**: test the exact TestFlight build first.
- **Missing iPad screenshots** while `supportsTablet` is true.
- **Notification permission requested at launch**: this app only asks when you save your first reminder, which is what Apple prefers.

### B8. Shipping updates (iOS)

1. Bump `"version"` in `app.json`.
2. Build and submit:

```bash
eas build --platform ios --profile production --auto-submit
```

3. In App Store Connect, create the new version (**+ Version**), select the build, and add "What's New".
4. Submit for review.

---

## Part C — Both platforms at once

```bash
eas build --platform all --profile production --auto-submit
```

### Optional: over-the-air (OTA) updates

For JavaScript/UI-only fixes (no new native packages), `eas update` can push changes without a store review. Set it up with `npx expo install expo-updates` and `eas update:configure`, then run `eas update --channel production`. Any change that adds a native module still needs a new store build.

---

## Part D — End-to-end tests on real phone builds

[.maestro/](.maestro/) holds Maestro flows that drive the real app on a phone: notes, finance, tasks, plus the phone's own navigation (iOS edge-swipe back, Android back button, back cancelling a multi-select, keyboard covering Save, backgrounding the app). They use a separate `e2e-test` build profile (iOS simulator build + Android APK, no signing needed).

**Run them in the cloud (no Xcode or Android Studio needed):**

```bash
npx eas-cli@latest workflow:run .eas/workflows/e2e-android.yml
```

```bash
npx eas-cli@latest workflow:run .eas/workflows/e2e-ios.yml
```

Each builds the app, boots an emulator/simulator on EAS, runs all four flows and shows pass/fail with screenshots in the expo.dev dashboard.

**Or locally** on a connected phone, emulator or simulator with the `e2e-test` build installed:

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
```

```bash
maestro test .maestro/
```

Run them before every store submission.

## Pre-launch checklist

- [ ] Final `bundleIdentifier` / `package` set in `app.json`
- [ ] Icons generated (`npm run icons`) and the Noun Project icon licence purchased
- [ ] Privacy policy filled in and hosted publicly
- [ ] Tested on a real Android phone (preview APK) and iPhone (TestFlight)
- [ ] Reminder notification fires on both platforms, and tapping it opens the task
- [ ] Maestro E2E flows pass on Android and iOS (Part D)
- [ ] Screenshots captured (phone, plus iPad if `supportsTablet` is true)
- [ ] Play: Data safety = no data collected; content rating, target audience and financial features done
- [ ] Play: 14-day closed test with 12+ testers finished (new personal accounts)
- [ ] Apple: App Privacy = Data Not Collected; age rating done
- [ ] `version` bumped for every new release

## A note on user data

All data lives in the on-device SQLite file `notes.db`. Uninstalling the app deletes it. iCloud and Google device backups normally include it, but there's no in-app export or sync yet. If people will rely on the app for years of financial history, consider adding **Export to CSV/JSON** (via `expo-sharing` and `expo-file-system`) before or soon after launch.
