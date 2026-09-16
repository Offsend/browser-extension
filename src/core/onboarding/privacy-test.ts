import type { DetectionEngine, Finding } from '../detection';
import { maskText } from '../masking';

/**
 * Canned prompt for the in-extension privacy test. Values are fake and sized
 * to match current detectors — a short `sk-proj-example` would miss openai-key.
 */
export const PRIVACY_TEST_PROMPT = [
  'My email is john@example.com',
  'API_KEY=sk-proj-examplekey1234567890',
  'Database: postgres://admin:s3cret@db.internal:5432/app',
].join('\n');

/** Stable salt so the demo preview does not flicker between runs. */
const DEMO_SALT = 'demo';

export interface PrivacyTestResult {
  readonly findings: readonly Finding[];
  readonly masked: string;
}

/** Scan the canned prompt with the real engine. No network, no storage. */
export async function runPrivacyTest(engine: DetectionEngine): Promise<PrivacyTestResult> {
  const findings = await engine.scan(PRIVACY_TEST_PROMPT);
  const { masked } = maskText(PRIVACY_TEST_PROMPT, findings, DEMO_SALT);
  return { findings, masked };
}
