import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { interceptFileAttach } from '@/core/adapters/shared/file-attach';
import type { FileAttachContext, Unsubscribe } from '@/core/adapters';

const cleanups: Unsubscribe[] = [];
const track = (unsub: Unsubscribe): Unsubscribe => {
  cleanups.push(unsub);
  return unsub;
};

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const file = (name: string, content = 'x'): File =>
  new File([content], name, { type: 'text/plain' });

function setInputFiles(input: HTMLInputElement, files: readonly File[]): void {
  const dt = new DataTransfer();
  for (const f of files) dt.items.add(f);
  input.files = dt.files;
}

function transferEvent(type: string, prop: 'dataTransfer' | 'clipboardData', files: File[]): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  const dt = new DataTransfer();
  for (const f of files) dt.items.add(f);
  Object.defineProperty(ev, prop, { value: dt });
  return ev;
}

beforeEach(() => {
  document.body.innerHTML = '<input type="file" id="picker" /><div id="zone"></div>';
});

afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.restoreAllMocks();
});

describe('interceptFileAttach — file input', () => {
  it('blocks: clears the input and hides the change from the site', async () => {
    const input = document.querySelector<HTMLInputElement>('#picker')!;
    const siteChange = vi.fn();
    input.addEventListener('change', siteChange);

    track(interceptFileAttach(document, async () => ({ action: 'block' })));

    setInputFiles(input, [file('secret.txt')]);
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect(siteChange).not.toHaveBeenCalled();
    expect(input.files?.length ?? 0).toBe(0);
  });

  it('allows: re-dispatches change with the original files', async () => {
    const input = document.querySelector<HTMLInputElement>('#picker')!;
    let seenByHandler: FileAttachContext | null = null;
    const siteChange = vi.fn();
    input.addEventListener('change', siteChange);

    track(
      interceptFileAttach(document, async (ctx) => {
        seenByHandler = ctx;
        return { action: 'allow' };
      }),
    );

    setInputFiles(input, [file('ok.txt')]);
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect(seenByHandler!.trigger).toBe('input');
    expect(seenByHandler!.files[0]!.name).toBe('ok.txt');
    expect(siteChange).toHaveBeenCalledTimes(1);
    expect(input.files![0]!.name).toBe('ok.txt');
  });

  it('replaces: the site sees the masked copies', async () => {
    const input = document.querySelector<HTMLInputElement>('#picker')!;
    const siteChange = vi.fn();
    input.addEventListener('change', siteChange);

    track(
      interceptFileAttach(document, async () => ({
        action: 'replace',
        files: [file('leaky.txt', 'masked')],
      })),
    );

    setInputFiles(input, [file('leaky.txt', 'secret')]);
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect(siteChange).toHaveBeenCalledTimes(1);
    expect(await input.files![0]!.text()).toBe('masked');
  });
});

describe('interceptFileAttach — drop and paste', () => {
  // No hidden file input on the page in these tests → the drop/paste event
  // itself is replayed. Input injection is covered separately below.
  beforeEach(() => {
    document.body.innerHTML = '<div id="zone"></div>';
  });

  it('intercepts dropped files and re-dispatches on allow', async () => {
    const zone = document.querySelector<HTMLElement>('#zone')!;
    const dropped: File[][] = [];
    zone.addEventListener('drop', (e) => {
      const dt = (e as DragEvent).dataTransfer;
      dropped.push(dt ? [...dt.files] : []);
    });

    let trigger = '';
    track(
      interceptFileAttach(document, async (ctx) => {
        trigger = ctx.trigger;
        return { action: 'allow' };
      }),
    );

    const original = transferEvent('drop', 'dataTransfer', [file('dropped.txt')]);
    zone.dispatchEvent(original);
    await flush();

    expect(original.defaultPrevented).toBe(true);
    expect(trigger).toBe('drop');
    expect(dropped).toHaveLength(1);
    expect(dropped[0]![0]!.name).toBe('dropped.txt');
  });

  it('resets the site drag UI immediately when a drop is intercepted', async () => {
    const zone = document.querySelector<HTMLElement>('#zone')!;
    const seen: string[] = [];
    document.addEventListener('dragleave', () => seen.push('dragleave'));
    document.addEventListener('dragend', () => seen.push('dragend'));

    let resolveDecision!: () => void;
    track(
      interceptFileAttach(document, () => {
        return new Promise((resolve) => {
          resolveDecision = () => resolve({ action: 'block' });
        });
      }),
    );

    zone.dispatchEvent(transferEvent('drop', 'dataTransfer', [file('secret.txt')]));

    // Synchronously, before the (possibly slow) review decision resolves.
    expect(seen).toEqual(['dragleave', 'dragend']);
    resolveDecision();
    await flush();
  });

  it('swallows dropped files entirely on block', async () => {
    const zone = document.querySelector<HTMLElement>('#zone')!;
    const siteDrop = vi.fn();
    zone.addEventListener('drop', siteDrop);

    track(interceptFileAttach(document, async () => ({ action: 'block' })));

    zone.dispatchEvent(transferEvent('drop', 'dataTransfer', [file('secret.txt')]));
    await flush();

    expect(siteDrop).not.toHaveBeenCalled();
  });

  it('replays on the preferred target when the drop target got unmounted', async () => {
    // Real sites drop onto a transient "drop files here" overlay that is
    // removed before the user resolves the review dialog.
    document.body.innerHTML = '<div id="app"><div id="composer"></div><div id="overlay"></div></div>';
    const app = document.querySelector<HTMLElement>('#app')!;
    const composer = document.querySelector<HTMLElement>('#composer')!;
    const overlay = document.querySelector<HTMLElement>('#overlay')!;

    const received: File[][] = [];
    app.addEventListener('drop', (e) => {
      const dt = (e as DragEvent).dataTransfer;
      received.push(dt ? [...dt.files] : []);
    });

    track(
      interceptFileAttach(
        document,
        async () => {
          overlay.remove();
          return { action: 'allow' };
        },
        { preferredReplayTarget: () => composer },
      ),
    );

    overlay.dispatchEvent(transferEvent('drop', 'dataTransfer', [file('late.txt')]));
    await flush();

    expect(received).toHaveLength(1);
    expect(received[0]![0]!.name).toBe('late.txt');
  });

  it('ignores text-only drops (no files)', async () => {
    const zone = document.querySelector<HTMLElement>('#zone')!;
    const siteDrop = vi.fn();
    zone.addEventListener('drop', siteDrop);
    const handler = vi.fn(async () => ({ action: 'allow' as const }));

    track(interceptFileAttach(document, handler));

    const ev = transferEvent('drop', 'dataTransfer', []);
    zone.dispatchEvent(ev);
    await flush();

    expect(handler).not.toHaveBeenCalled();
    expect(siteDrop).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(false);
  });

  it('routes dropped files through the site file input when one exists', async () => {
    document.body.innerHTML =
      '<div id="zone"></div><input type="file" id="hidden" multiple style="display:none" />';
    const zone = document.querySelector<HTMLElement>('#zone')!;
    const hidden = document.querySelector<HTMLInputElement>('#hidden')!;
    const siteChange = vi.fn();
    const siteDrop = vi.fn();
    hidden.addEventListener('change', siteChange);
    zone.addEventListener('drop', siteDrop);

    track(
      interceptFileAttach(document, async () => ({
        action: 'replace',
        files: [file('leaky.txt', 'masked')],
      })),
    );

    zone.dispatchEvent(transferEvent('drop', 'dataTransfer', [file('leaky.txt', 'secret')]));
    await flush();

    expect(siteChange).toHaveBeenCalledTimes(1);
    expect(await hidden.files![0]!.text()).toBe('masked');
    expect(siteDrop).not.toHaveBeenCalled();
  });

  it('skips file inputs whose accept attribute rejects the files', async () => {
    document.body.innerHTML =
      '<div id="zone"></div><input type="file" id="images" accept="image/*" style="display:none" />';
    const zone = document.querySelector<HTMLElement>('#zone')!;
    const images = document.querySelector<HTMLInputElement>('#images')!;
    const imagesChange = vi.fn();
    const siteDrop = vi.fn();
    images.addEventListener('change', imagesChange);
    zone.addEventListener('drop', siteDrop);

    track(interceptFileAttach(document, async () => ({ action: 'allow' })));

    zone.dispatchEvent(transferEvent('drop', 'dataTransfer', [file('notes.txt')]));
    await flush();

    expect(imagesChange).not.toHaveBeenCalled();
    expect(siteDrop).toHaveBeenCalledTimes(1);
  });

  it('replaces pasted files before the site sees them', async () => {
    const zone = document.querySelector<HTMLElement>('#zone')!;
    const pasted: File[][] = [];
    zone.addEventListener('paste', (e) => {
      const dt = (e as ClipboardEvent).clipboardData;
      pasted.push(dt ? [...dt.files] : []);
    });

    track(
      interceptFileAttach(document, async () => ({
        action: 'replace',
        files: [file('paste.txt', 'masked')],
      })),
    );

    zone.dispatchEvent(transferEvent('paste', 'clipboardData', [file('paste.txt', 'secret')]));
    await flush();

    expect(pasted).toHaveLength(1);
    expect(await pasted[0]![0]!.text()).toBe('masked');
  });
});
