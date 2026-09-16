import { expect, test } from '@playwright/test';
import { strToU8, zipSync } from 'fflate';
import { launchExtensionContext, newFixturePage, offsendHost } from './helpers/extension';

test('file attach: warn mode reviews and masks secret text files', async () => {
  const context = await launchExtensionContext();
  try {
    const page = await newFixturePage(
      context,
      'https://chatgpt.com/c/offsend-files',
      'chatgpt.html',
    );
    await expect(offsendHost(page)).toBeAttached();

    await page.locator('#file-input').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('email alice@example.com'),
    });

    const dialog = page.getByRole('dialog', { name: /offsend review/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('1 sensitive value found');

    await page.getByRole('button', { name: /mask & attach/i }).click();
    await expect(dialog).toHaveCount(0);

    const attachment = page.locator('[data-role="attachment"]');
    await expect(attachment).toHaveCount(1);
    const attached = await page.locator('#file-input').evaluate(async (el: HTMLInputElement) => {
      const files = el.files ? [...el.files] : [];
      return Promise.all(files.map((file) => file.text()));
    });
    expect(attached[0]).toMatch(/\{\{EMAIL_1_[a-z0-9]+\}\}/);
    expect(attached[0]).not.toContain('alice@example.com');
  } finally {
    await context.close();
  }
});

test('file attach: unscanned image shows status and can be cancelled', async () => {
  const context = await launchExtensionContext();
  try {
    const page = await newFixturePage(
      context,
      'https://chatgpt.com/c/offsend-files',
      'chatgpt.html',
    );
    await expect(offsendHost(page)).toBeAttached();

    await page.locator('#file-input').setInputFiles({
      name: 'photo.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    });

    const dialog = page.getByRole('dialog', { name: /offsend review/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Attachment coverage');
    await expect(dialog).toContainText('photo.png');
    await expect(dialog).toContainText('Not scanned');
    await expect(dialog).not.toContainText('Protected');

    await dialog.getByRole('button', { name: /^cancel$/i }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('[data-role="attachment"]')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('file attach: docx text is scanned and not rewritten', async () => {
  const context = await launchExtensionContext();
  try {
    const page = await newFixturePage(
      context,
      'https://chatgpt.com/c/offsend-files',
      'chatgpt.html',
    );
    await expect(offsendHost(page)).toBeAttached();

    const zip = zipSync({
      'word/document.xml': strToU8(
        '<w:document><w:body><w:p><w:r><w:t>email alice@example.com</w:t></w:r></w:p></w:body></w:document>',
      ),
    });

    await page.locator('#file-input').setInputFiles({
      name: 'notes.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from(zip),
    });

    const dialog = page.getByRole('dialog', { name: /offsend review/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('1 sensitive value found');
    await expect(dialog).toContainText('alice@example.com');
    await expect(dialog).toContainText('Found, not hidden');
    await expect(dialog).toContainText('cannot hide it');
    await expect(dialog.getByRole('button', { name: /mask & attach/i })).toHaveCount(0);

    await dialog.getByRole('button', { name: /^cancel$/i }).click();
    await expect(dialog).toHaveCount(0);
  } finally {
    await context.close();
  }
});

function textPdf(shown: string): Buffer {
  const content = `BT /F1 12 Tf (${shown}) Tj ET\n`;
  const body = `%PDF-1.1\n1 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`;
  return Buffer.from(body);
}

test('file attach: pdf text is scanned and not rewritten', async () => {
  const context = await launchExtensionContext();
  try {
    const page = await newFixturePage(
      context,
      'https://chatgpt.com/c/offsend-files',
      'chatgpt.html',
    );
    await expect(offsendHost(page)).toBeAttached();

    await page.locator('#file-input').setInputFiles({
      name: 'notes.pdf',
      mimeType: 'application/pdf',
      buffer: textPdf('email alice@example.com'),
    });

    const dialog = page.getByRole('dialog', { name: /offsend review/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('1 sensitive value found');
    await expect(dialog).toContainText('alice@example.com');
    await expect(dialog).toContainText('Found, not hidden');
    await expect(dialog).toContainText('cannot hide it');
    await expect(dialog.getByRole('button', { name: /mask & attach/i })).toHaveCount(0);

    await dialog.getByRole('button', { name: /^cancel$/i }).click();
    await expect(dialog).toHaveCount(0);
  } finally {
    await context.close();
  }
});
