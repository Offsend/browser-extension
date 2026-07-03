import { describe, expect, it } from 'vitest';
import { messagesFor } from '@/core/i18n';
import { de } from '@/core/i18n/de';
import { en } from '@/core/i18n/en';
import { es } from '@/core/i18n/es';
import { fr } from '@/core/i18n/fr';
import { pt } from '@/core/i18n/pt';
import { ru } from '@/core/i18n/ru';

describe('messagesFor', () => {
  it('resolves base language from a BCP-47 tag', () => {
    expect(messagesFor('ru')).toBe(ru);
    expect(messagesFor('ru-RU')).toBe(ru);
    expect(messagesFor('en-US')).toBe(en);
  });

  it('falls back to English for unknown locales', () => {
    expect(messagesFor('ja')).toBe(en);
    expect(messagesFor('')).toBe(en);
  });

  it('resolves newly added locales', () => {
    expect(messagesFor('de')).toBe(de);
    expect(messagesFor('de-DE')).toBe(de);
    expect(messagesFor('es')).toBe(es);
    expect(messagesFor('es-ES')).toBe(es);
    expect(messagesFor('fr')).toBe(fr);
    expect(messagesFor('fr-FR')).toBe(fr);
    expect(messagesFor('pt')).toBe(pt);
    expect(messagesFor('pt-BR')).toBe(pt);
  });
});

describe('russian plural forms', () => {
  it('uses one/few/many forms for masked values', () => {
    expect(ru.toast.masked(1)).toBe('Замаскировано 1 значение');
    expect(ru.toast.masked(2)).toBe('Замаскировано 2 значения');
    expect(ru.toast.masked(5)).toBe('Замаскировано 5 значений');
    expect(ru.toast.masked(11)).toBe('Замаскировано 11 значений');
    expect(ru.toast.masked(21)).toBe('Замаскировано 21 значение');
  });
});

describe('english plural forms', () => {
  it('uses singular only for exactly one', () => {
    expect(en.toast.masked(1)).toBe('Masked 1 value');
    expect(en.toast.masked(2)).toBe('Masked 2 values');
  });
});
