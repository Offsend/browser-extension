/** Firefox 140+ built-in data-collection consent for optional telemetry. */
const TELEMETRY_DATA_TYPE = 'technicalAndInteraction' as const;

interface FirefoxPermissionsSnapshot {
  data_collection?: string[];
}

function supportsFirefoxDataConsent(perms: FirefoxPermissionsSnapshot): boolean {
  return 'data_collection' in perms;
}

/** Whether Firefox has granted optional telemetry data collection. */
export async function hasTelemetryDataConsent(): Promise<boolean> {
  try {
    const perms = (await browser.permissions.getAll()) as FirefoxPermissionsSnapshot;
    if (!supportsFirefoxDataConsent(perms)) return true;
    return perms.data_collection?.includes(TELEMETRY_DATA_TYPE) ?? false;
  } catch {
    return true;
  }
}

/** Prompt for Firefox optional telemetry consent (no-op on other browsers). */
export async function requestTelemetryDataConsent(): Promise<boolean> {
  try {
    const perms = (await browser.permissions.getAll()) as FirefoxPermissionsSnapshot;
    if (!supportsFirefoxDataConsent(perms)) return true;
    if (perms.data_collection?.includes(TELEMETRY_DATA_TYPE)) return true;
    return await (
      browser.permissions.request as (req: {
        data_collection: string[];
      }) => Promise<boolean>
    )({ data_collection: [TELEMETRY_DATA_TYPE] });
  } catch {
    return false;
  }
}
