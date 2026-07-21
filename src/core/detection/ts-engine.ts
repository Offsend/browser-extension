import { DETECTORS, type Detector } from './detectors';
import type { DetectionEngine, Finding, ScanOptions } from './types';

/** Default soft budget so custom / pathological regex cannot freeze the UI. */
export const DEFAULT_SCAN_BUDGET_MS = 50;

/** Cap matches from a single detector to bound ReDoS-ish matchAll loops. */
export const MAX_MATCHES_PER_DETECTOR = 200;

interface Candidate extends Finding {
  /** Lower = higher confidence (position in DETECTORS). */
  readonly priority: number;
}

function overlaps(a: Finding, b: Finding): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Pure-TypeScript regex detection engine (Phase 0). Same contract as the future
 * WASM engine. Overlapping matches are resolved in favour of the
 * higher-confidence detector, then the longer match.
 */
export class TsEngine implements DetectionEngine {
  private readonly detectors: readonly Detector[];

  constructor(detectors: readonly Detector[] = DETECTORS) {
    this.detectors = detectors;
  }

  async scan(text: string, opts?: ScanOptions): Promise<Finding[]> {
    if (!text) return [];
    const typeFilter = opts?.types ? new Set(opts.types) : null;
    const budgetMs = opts?.budgetMs ?? DEFAULT_SCAN_BUDGET_MS;
    const started = performance.now();
    const timedOut = () => performance.now() - started >= budgetMs;

    const candidates: Candidate[] = [];
    for (let priority = 0; priority < this.detectors.length; priority++) {
      if (timedOut()) break;
      const detector = this.detectors[priority]!;
      if (typeFilter && !typeFilter.has(detector.type)) continue;
      const re = detector.pattern();
      let matchCount = 0;
      for (const match of text.matchAll(re)) {
        if (timedOut() || matchCount >= MAX_MATCHES_PER_DETECTOR) break;
        matchCount += 1;
        const value = match[0];
        if (match.index === undefined) continue;
        if (detector.validate && !detector.validate(value)) continue;
        candidates.push({
          type: detector.type,
          value,
          start: match.index,
          end: match.index + value.length,
          detector: detector.id,
          priority,
        });
      }
    }

    // Greedy resolution: best detector first, then longest match.
    candidates.sort(
      (a, b) => a.priority - b.priority || b.value.length - a.value.length || a.start - b.start,
    );

    const accepted: Finding[] = [];
    for (const c of candidates) {
      if (accepted.some((a) => overlaps(a, c))) continue;
      accepted.push({
        type: c.type,
        value: c.value,
        start: c.start,
        end: c.end,
        detector: c.detector,
      });
    }

    accepted.sort((a, b) => a.start - b.start);
    return accepted;
  }
}
