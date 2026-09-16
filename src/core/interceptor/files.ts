import type { DetectionEngine, Finding } from '../detection';
import { maskText } from '../masking';
import type { MappingEntry } from '../masking';
import { resolveScanTypes } from '../detection/smart-pii';
import {
  DEFAULT_SMART_PII,
  filterTrustedFindings,
  type Policy,
  type SmartPiiSettings,
  type TrustedValue,
} from '../storage';
import { isAllowlisted } from './interceptor';
import { extractOfficeText, isOfficeFile } from './office';
import { extractPdfText, isPdfFile } from './pdf';

/** Attachments larger than this are passed through unscanned. */
export const MAX_SCAN_BYTES = 2 * 1024 * 1024;

const TEXT_MIME = new Set([
  'application/json',
  'application/xml',
  'application/x-yaml',
  'application/yaml',
  'application/javascript',
  'application/x-javascript',
  'application/sql',
  'application/x-sh',
  'application/x-httpd-php',
  'image/svg+xml',
]);

const TEXT_EXTENSIONS =
  /\.(txt|md|markdown|json|jsonl|yaml|yml|toml|ini|cfg|conf|csv|tsv|log|env|pem|key|crt|xml|html?|css|js|mjs|cjs|jsx|ts|tsx|py|rb|go|rs|java|kt|swift|c|h|cpp|hpp|cs|php|sh|bash|zsh|sql|tf|proto|gradle|properties|dockerfile|gitignore)$/i;

/** Can we read this attachment as text and scan it meaningfully? */
export function isScannableFile(file: File): boolean {
  if (file.size === 0 || file.size > MAX_SCAN_BYTES) return false;
  if (isOfficeFile(file) || isPdfFile(file)) return true;
  if (file.type.startsWith('text/')) return true;
  if (TEXT_MIME.has(file.type)) return true;
  // Extension fallback: browsers report odd/empty MIME types for code files
  // (e.g. `.ts` as video/mp2t), and dotfiles like `.env` have no type at all.
  return TEXT_EXTENSIONS.test(file.name) || /^\.[a-z0-9]+$/i.test(file.name);
}

interface AttachmentText {
  readonly text: string;
  /** False for OOXML / PDF: we can scan, but we must not rewrite the original. */
  readonly maskable: boolean;
}

async function readAttachment(file: File): Promise<AttachmentText | null> {
  if (file.size === 0 || file.size > MAX_SCAN_BYTES) return null;
  if (isOfficeFile(file) || isPdfFile(file)) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const text = isPdfFile(file) ? extractPdfText(bytes) : extractOfficeText(bytes);
      return text ? { text, maskable: false } : null;
    } catch {
      return null;
    }
  }
  if (!isScannableFile(file)) return null;
  try {
    return { text: await file.text(), maskable: true };
  } catch {
    return null;
  }
}

/** Per-file scan result shown in the review overlay. */
export type FileCoverageStatus = 'scanned' | 'not-scanned';

export interface FileCoverage {
  readonly name: string;
  readonly status: FileCoverageStatus;
  readonly findingCount: number;
  /** False when the file was scanned but cannot be rewritten (Office / PDF). */
  readonly maskable: boolean;
}

/** One attached file that produced findings. */
export interface FileFindingEntry {
  /** Position in the original attachment list. */
  readonly index: number;
  readonly name: string;
  readonly text: string;
  /** Offset of `text` inside the combined review document. */
  readonly base: number;
  readonly maskable: boolean;
}

/**
 * Decision for a batch of attached files. `review.combined` concatenates the
 * offending files (with `--- name ---` headers) so the existing review overlay
 * can preview masking; finding offsets are relative to that combined text.
 *
 * `coverage` is one row per attached file so the UI can show Scanned /
 * Not scanned instead of implying an unreadable file was protected.
 */
export type FileInterceptOutcome =
  | { readonly kind: 'allow'; readonly coverage: readonly FileCoverage[] }
  | { readonly kind: 'coverage'; readonly coverage: readonly FileCoverage[] }
  | {
      readonly kind: 'auto-mask';
      readonly files: readonly File[];
      readonly mappings: readonly MappingEntry[];
      readonly findings: readonly Finding[];
      readonly coverage: readonly FileCoverage[];
    }
  | {
      readonly kind: 'review';
      readonly files: readonly File[];
      readonly combined: string;
      readonly findings: readonly Finding[];
      readonly entries: readonly FileFindingEntry[];
      readonly canSendAnyway: boolean;
      readonly coverage: readonly FileCoverage[];
    };

function maskedCopy(original: File, maskedText: string): File {
  return new File([maskedText], original.name, {
    type: original.type,
    lastModified: original.lastModified,
  });
}

function coverageOf(
  files: readonly File[],
  texts: readonly (AttachmentText | null)[],
  scans: readonly Finding[][],
): FileCoverage[] {
  return files.map((file, i) => ({
    name: file.name,
    status: texts[i] === null ? 'not-scanned' : 'scanned',
    findingCount: scans[i]?.length ?? 0,
    maskable: texts[i]?.maskable ?? false,
  }));
}

/**
 * Scan attached files against the policy. Pure aside from reading file text —
 * no DOM, no storage — so the whole decision is unit-testable.
 */
export async function interceptFiles(
  files: readonly File[],
  host: string,
  policy: Policy,
  engine: DetectionEngine,
  trustedValues: readonly TrustedValue[] = [],
  smartPii: SmartPiiSettings = DEFAULT_SMART_PII,
): Promise<FileInterceptOutcome> {
  if (isAllowlisted(host, policy.allowlist)) return { kind: 'allow', coverage: [] };

  const texts = await Promise.all(files.map((file) => readAttachment(file)));

  const scans = await Promise.all(
    texts.map(async (entry) => {
      if (entry === null) return [];
      return filterTrustedFindings(
        await engine.scan(entry.text, { types: resolveScanTypes(policy.enabledTypes, smartPii) }),
        trustedValues,
      );
    }),
  );
  const coverage = coverageOf(files, texts, scans);
  const hasUnscanned = coverage.some((c) => c.status === 'not-scanned');
  const hasFindings = scans.some((findings) => findings.length > 0);
  const hasUnmaskableFindings = files.some(
    (_, i) => (scans[i]?.length ?? 0) > 0 && texts[i]?.maskable === false,
  );

  if (!hasFindings) {
    return hasUnscanned
      ? { kind: 'coverage' as const, coverage }
      : { kind: 'allow' as const, coverage };
  }

  if (policy.mode === 'auto-mask' && !hasUnscanned && !hasUnmaskableFindings) {
    const nextFiles = [...files];
    const mappings: MappingEntry[] = [];
    const findings: Finding[] = [];
    files.forEach((file, i) => {
      if (scans[i]!.length === 0) return;
      const result = maskText(texts[i]!.text, scans[i]!);
      nextFiles[i] = maskedCopy(file, result.masked);
      mappings.push(...result.mappings);
      findings.push(...scans[i]!);
    });
    return { kind: 'auto-mask' as const, files: nextFiles, mappings, findings, coverage };
  }

  // Build the combined review document from the offending files only.
  let combined = '';
  const entries: FileFindingEntry[] = [];
  const findings: Finding[] = [];
  files.forEach((file, i) => {
    if (scans[i]!.length === 0) return;
    if (combined) combined += '\n\n';
    combined += `--- ${file.name} ---\n`;
    const base = combined.length;
    combined += texts[i]!.text;
    entries.push({
      index: i,
      name: file.name,
      text: texts[i]!.text,
      base,
      maskable: texts[i]!.maskable,
    });
    for (const f of scans[i]!) {
      findings.push({ ...f, start: f.start + base, end: f.end + base });
    }
  });

  return {
    kind: 'review' as const,
    files,
    combined,
    findings,
    entries,
    canSendAnyway: policy.mode !== 'block',
    coverage,
  };
}

/**
 * Apply the user's review selection: mask only the findings left enabled
 * (combined-document coordinates), file by file.
 */
export function maskReviewedFiles(
  outcome: Extract<FileInterceptOutcome, { kind: 'review' }>,
  enabledFindings: readonly Finding[],
): { files: readonly File[]; mappings: readonly MappingEntry[] } {
  const nextFiles = [...outcome.files];
  const mappings: MappingEntry[] = [];

  for (const entry of outcome.entries) {
    if (!entry.maskable) continue;
    const local = enabledFindings
      .filter((f) => f.start >= entry.base && f.end <= entry.base + entry.text.length)
      .map((f) => ({ ...f, start: f.start - entry.base, end: f.end - entry.base }));
    if (local.length === 0) continue;
    const result = maskText(entry.text, local);
    nextFiles[entry.index] = maskedCopy(outcome.files[entry.index]!, result.masked);
    mappings.push(...result.mappings);
  }

  return { files: nextFiles, mappings };
}
