import { DETECTORS, type Detector } from './detectors';
import type { DetectionEngine, Finding, ScanOptions } from './types';

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

    const candidates: Candidate[] = [];
    this.detectors.forEach((detector, priority) => {
      if (typeFilter && !typeFilter.has(detector.type)) return;
      const re = detector.pattern();
      for (const match of text.matchAll(re)) {
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
    });

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
