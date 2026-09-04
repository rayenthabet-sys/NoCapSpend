// ─────────────────────────────────────────────────────────────────
// NoCapSpend — Public Android APK Release Configuration
// Immutable trusted static release metadata.
// ─────────────────────────────────────────────────────────────────

export interface ReleaseConfig {
  /** Whether a verified release artifact is available for public download */
  available: boolean;
  /** Human-readable application semantic version */
  version: string;
  /** Monotonically increasing Android version code */
  versionCode: number;
  /** Name of the APK binary artifact */
  fileName: string;
  /**
   * Trusted, static HTTPS URL to the public APK binary.
   * Stored as null until an actual EAS build is completed and hosted on the verified releases page.
   * NEVER derived from query parameters or user-supplied input.
   */
  downloadUrl: string | null;
  /**
   * Verified SHA-256 checksum of the released APK.
   * Stored as null until an actual build artifact is verified.
   */
  sha256: string | null;
  /** Date of release (YYYY-MM-DD) */
  releaseDate: string | null;
  /** Minimum required Android version */
  minAndroidVersion: string;
  /** Estimated APK download size */
  sizeEstimate: string;
}

/**
 * Public release metadata for direct APK distribution.
 *
 * CURRENT STATUS: STATE A (Pending verified build)
 * - available: false
 * - downloadUrl: null
 * - sha256: null
 *
 * Once an official APK is built via EAS (`npx eas-cli build -p android --profile android-apk`)
 * and uploaded to the designated GitHub Releases page:
 * 1. Set `available: true`
 * 2. Set `downloadUrl` to the verified HTTPS release asset URL
 * 3. Set `sha256` to the output of `Get-FileHash <path-to-apk> -Algorithm SHA256`
 * 4. Set `releaseDate` to the release date string
 */
export const APK_RELEASE_CONFIG: ReleaseConfig = {
  available: true,
  version: '1.0.0',
  versionCode: 1,
  fileName: 'NoCapSpend-v1.0.0.apk',
  downloadUrl: 'https://github.com/rayenthabet004-spec/NoCapSpend/releases/download/v1.0.0/NoCapSpend-v1.0.0.apk',
  sha256: '25F5AB1C2EC4C3EB43853871947D73D4972A5521D3CD914B4AB67D99A47709AA',
  releaseDate: '2026-09-04',
  minAndroidVersion: 'Android 8.0+ (API 26)',
  sizeEstimate: '~65 MB',
};
