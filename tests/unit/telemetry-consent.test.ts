import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasTelemetryDataConsent, requestTelemetryDataConsent } from '@/core/telemetry/consent';

describe('hasTelemetryDataConsent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows telemetry when Firefox data consent is unavailable', async () => {
    vi.spyOn(browser.permissions, 'getAll').mockResolvedValue({
      permissions: ['storage'],
    } as never);
    await expect(hasTelemetryDataConsent()).resolves.toBe(true);
  });

  it('requires optional technicalAndInteraction on Firefox', async () => {
    vi.spyOn(browser.permissions, 'getAll').mockResolvedValue({
      data_collection: [],
    } as never);
    await expect(hasTelemetryDataConsent()).resolves.toBe(false);
  });

  it('allows telemetry when Firefox optional consent is granted', async () => {
    vi.spyOn(browser.permissions, 'getAll').mockResolvedValue({
      data_collection: ['technicalAndInteraction'],
    } as never);
    await expect(hasTelemetryDataConsent()).resolves.toBe(true);
  });
});

describe('requestTelemetryDataConsent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is a no-op on browsers without Firefox data consent', async () => {
    const request = vi.spyOn(browser.permissions, 'request').mockResolvedValue(true as never);
    vi.spyOn(browser.permissions, 'getAll').mockResolvedValue({
      permissions: ['storage'],
    } as never);
    await expect(requestTelemetryDataConsent()).resolves.toBe(true);
    expect(request).not.toHaveBeenCalled();
  });

  it('requests optional technicalAndInteraction on Firefox', async () => {
    const request = vi.spyOn(browser.permissions, 'request').mockResolvedValue(true as never);
    vi.spyOn(browser.permissions, 'getAll').mockResolvedValue({
      data_collection: [],
    } as never);
    await expect(requestTelemetryDataConsent()).resolves.toBe(true);
    expect(request).toHaveBeenCalledWith({ data_collection: ['technicalAndInteraction'] });
  });
});
