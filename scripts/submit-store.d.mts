export function isAlreadyPublishedError(output: string): boolean;

export function classifySubmitResult(
  code: number | null,
  output: string,
): { exitCode: number; alreadyPublished: boolean };
