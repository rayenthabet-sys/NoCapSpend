# NoCapSpend — Public Android APK Release & Operational Guide

This document outlines the end-to-end procedure for producing, verifying, and publishing public Android APK release artifacts for NoCapSpend without Google Play Store dependencies.

---

## 1. Prerequisites & EAS Authentication

EAS Build compiles the native Android binary in a clean cloud container. Before initiating an APK build:

1. Confirm the EAS CLI is authenticated with the project owner account:
   ```bash
   npx eas-cli whoami
   ```
   Expected user: `rayenthabet111` (Project ID: `9e0edfba-f283-42a7-8bb3-313bea0c6417`).

2. If not logged in:
   ```bash
   npx eas-cli login
   ```

---

## 2. Monotonic Versioning Policy

Every Android APK release requires:
- A human-readable semantic version string in `app.json` (`version`, e.g. `"1.0.0"`).
- A strictly monotonically increasing integer in `app.json` (`versionCode`, e.g. `1`, `2`, `3`).

**Rules:**
- `versionCode` must NEVER be decreased or reset.
- Increment `versionCode` by 1 for each successive production build.
- Update `version` and `versionCode` in both `app.json` and `src/config/releaseConfig.ts`.

---

## 3. Building the Production APK

To build a standalone production APK (rather than a Google Play AAB bundle):

```bash
npx eas-cli build -p android --profile android-apk
```

**Build Properties:**
- Profile: `android-apk` (configured in `eas.json`).
- `buildType`: `apk` (produces installable `.apk` file).
- `distribution`: `internal`.
- Environment: Inherits production public variables (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).

---

## 4. Retrieving and Verifying the Artifact

1. Once the EAS build completes, download the generated APK from the URL provided by the CLI (or via the Expo/EAS dashboard).
2. Save the artifact locally using the standardized naming format:
   ```
   NoCapSpend-v<version>.apk
   Example: NoCapSpend-v1.0.0.apk
   ```

3. Calculate the SHA-256 integrity checksum:
   ```powershell
   # PowerShell
   Get-FileHash .\NoCapSpend-v1.0.0.apk -Algorithm SHA256
   ```

   ```bash
   # Linux / macOS
   sha256sum NoCapSpend-v1.0.0.apk
   ```

---

## 5. Security & Pre-Release Audit

Before distributing any APK, verify that the artifact does NOT leak secrets:

1. Verify package identity:
   ```bash
   Package: com.rayenthabet.budgetbuddy
   ```
2. Search unzipped APK contents (or decompiled strings) to confirm:
   - Zero `service_role` Supabase keys.
   - Zero database passwords (`DB_PASS`) or `postgres://` connection strings.
   - Zero Cloudflare API tokens or GitHub PATs.
   - Zero localhost or developer development server URLs (`http://localhost`, `10.0.2.2`).
3. Confirm that only the public Supabase URL and public anon key are present.

---

## 6. Hosting & Web Download Activation

**Do NOT commit large APK binaries directly to the Git repository.**

1. Upload the verified artifact to the designated GitHub repository's Releases page after confirming the repository and release tag.
   - Target Repository: Confirmed Git remote repository (`https://github.com/rayenthabet-sys/nocapspend`).
   - Create a release tag matching the version (e.g. `v1.0.0`).
   - Upload `NoCapSpend-v1.0.0.apk`.
   - Copy the direct download link to the uploaded asset.

2. Activate the download page in `src/config/releaseConfig.ts`:
   ```typescript
   export const APK_RELEASE_CONFIG: ReleaseConfig = {
     available: true,
     version: '1.0.0',
     versionCode: 1,
     fileName: 'NoCapSpend-v1.0.0.apk',
     downloadUrl: 'https://github.com/rayenthabet-sys/nocapspend/releases/download/v1.0.0/NoCapSpend-v1.0.0.apk',
     sha256: '<PASTE_CONFIRMED_SHA256_HASH_HERE>',
     releaseDate: '2026-09-04',
     minAndroidVersion: 'Android 8.0+ (API 26)',
     sizeEstimate: '~65 MB',
   };
   ```

3. Export and deploy the updated web client:
   ```bash
   npx expo export -p web
   ```

---

## 7. Android Device Sideload Verification Checklist

Install and verify the APK on a physical Android device or emulator:
- [ ] APK downloads via direct HTTPS from the `/download` page.
- [ ] Android prompts: "Do you want to install this app?".
- [ ] Application opens to the splash screen and loads custom typography (`Bebas Neue`, `Space Grotesk`).
- [ ] Can successfully log in or create an account against production Supabase.
- [ ] Offline caching and pending transaction queues function when airplane mode is toggled.
- [ ] Daily Lock UX operates when spending limits are reached.
- [ ] Sign out purges disposable cache while preserving user preferences.

---

## 8. Critical Security Prohibitions

The following must **NEVER** be committed to Git:
- Android signing keystores (`*.keystore`, `*.jks`).
- Private signing keys or alias passwords.
- EAS robot tokens or personal access tokens.
- Database passwords or Supabase `service_role` keys.
- Cloudflare API tokens or credentials.
- Large compiled APK binaries.
