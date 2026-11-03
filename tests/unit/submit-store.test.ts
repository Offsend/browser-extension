import { describe, expect, it } from 'vitest';
import { classifySubmitResult, isAlreadyPublishedError } from '../../scripts/submit-store.mjs';

const FIREFOX_409 = `
Response: {
  "_data": {
    "version": [
      "Version 0.4.0 already exists."
    ]
  }
}
[error] [POST] "https://addons.mozilla.org/api/v5/addons/addon/***/versions/": 409 Conflict
`;

describe('submit store already-published', () => {
  it('treats an AMO 409 for an existing version as already published', () => {
    expect(isAlreadyPublishedError(FIREFOX_409)).toBe(true);
    expect(classifySubmitResult(1, FIREFOX_409)).toEqual({
      exitCode: 0,
      alreadyPublished: true,
    });
  });

  it('keeps a successful submit successful', () => {
    expect(classifySubmitResult(0, '')).toEqual({
      exitCode: 0,
      alreadyPublished: false,
    });
  });

  it('still fails on other store errors', () => {
    const output = '[error] [POST] "https://addons.mozilla.org/api/v5/addons/": 401 Unauthorized';
    expect(isAlreadyPublishedError(output)).toBe(false);
    expect(classifySubmitResult(1, output)).toEqual({
      exitCode: 1,
      alreadyPublished: false,
    });
  });

  it('does not ignore a 409 that is not a duplicate version', () => {
    const output = '409 Conflict: upload is still processing';
    expect(classifySubmitResult(1, output).exitCode).toBe(1);
  });
});
