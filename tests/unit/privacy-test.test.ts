import { describe, expect, it } from 'vitest';
import { TsEngine } from '@/core/detection';
import { PRIVACY_TEST_PROMPT, runPrivacyTest } from '@/core/onboarding';

describe('privacy test payload', () => {
  it('detects email, OpenAI key, and database URL', async () => {
    const { findings, masked } = await runPrivacyTest(new TsEngine());

    expect(findings.map((f) => f.detector).sort()).toEqual([
      'database-url-password',
      'email',
      'openai-key',
    ]);
    expect(PRIVACY_TEST_PROMPT).toContain('john@example.com');
    expect(masked).toMatch(/\{\{EMAIL_1_demo\}\}/);
    expect(masked).toMatch(/\{\{API_KEY_1_demo\}\}/);
    expect(masked).toMatch(/\{\{SECRET_1_demo\}\}/);
    expect(masked).not.toContain('john@example.com');
    expect(masked).not.toContain('sk-proj-examplekey1234567890');
    expect(masked).not.toContain('postgres://admin:s3cret@db.internal:5432/app');
  });
});
