import type { DetectionEngine, Finding } from '../detection';
import { maskText } from '../masking';
import type { MappingEntry } from '../masking';
import type { Policy } from '../storage';
import { isAllowlisted } from './interceptor';

/** Attachments larger than this are passed through unscanned. */
const MAX_SCAN_BYTES = 2 * 1024 * 1024;

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
  if (file.type.startsWith('text/')) return true;
  if (TEXT_MIME.has(file.type)) return true;
  // Extension fallback: browsers report odd/empty MIME types for code files
  // (e.g. `.ts` as video/mp2t), and dotfiles like `.env` have no type at all.
  return TEXT_EXTENSIONS.test(file.name) || /^\.[a-z0-9]+$/i.test(file.name);
}

/** One attached file that produced findings. */
export interface FileFindingEntry {
  /** Position in the original attachment list. */
  readonly index: number;
  readonly name: string;
  readonly text: string;
  /** Offset of `text` inside the combined review document. */
  readonly base: number;
}

/**
 * Decision for a batch of attached files. `review.combined` concatenates the
 * offending files (with `--- name ---` headers) so the existing review overlay
 * can preview masking; finding offsets are relative to that combined text.
 */
export type FileInterceptOutcome =
  | { readonly kind: 'allow' }
  | {
      readonly kind: 'auto-mask';
      readonly files: readonly File[];
      readonly mappings: readonly MappingEntry[];
      readonly findings: readonly Finding[];
    }
  | {
      readonly kind: 'review';
      readonly files: readonly File[];
      readonly combined: string;
      readonly findings: readonly Finding[];
      readonly entries: readonly FileFindingEntry[];
      readonly canSendAnyway: boolean;
    };

function maskedCopy(original: File, maskedText: string): File {
  return new File([maskedText], original.name, {
    type: original.type,
    lastModified: original.lastModified,
  });
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
): Promise<FileInterceptOutcome> {
  if (isAllowlisted(host, policy.allowlist)) return { kind: 'allow' };

  const texts = await Promise.all(
    files.map(async (file) => {
      if (!isScannableFile(file)) return null;
      try {
        return await file.text();
      } catch {
        return null;
      }
    }),
  );

  const scans = await Promise.all(
    texts.map((text) =>
      text === null
        ? Promise.resolve<Finding[]>([])
        : engine.scan(text, { types: policy.enabledTypes ?? undefined }),
    ),
  );
  if (scans.every((findings) => findings.length === 0)) return { kind: 'allow' };

  if (policy.mode === 'auto-mask') {
    const nextFiles = [...files];
    const mappings: MappingEntry[] = [];
    const findings: Finding[] = [];
    files.forEach((file, i) => {
      if (scans[i]!.length === 0) return;
      const result = maskText(texts[i]!, scans[i]!);
      nextFiles[i] = maskedCopy(file, result.masked);
      mappings.push(...result.mappings);
      findings.push(...scans[i]!);
    });
    return { kind: 'auto-mask', files: nextFiles, mappings, findings };
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
    combined += texts[i]!;
    entries.push({ index: i, name: file.name, text: texts[i]!, base });
    for (const f of scans[i]!) {
      findings.push({ ...f, start: f.start + base, end: f.end + base });
    }
  });

  return {
    kind: 'review',
    files,
    combined,
    findings,
    entries,
    canSendAnyway: policy.mode !== 'block',
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
