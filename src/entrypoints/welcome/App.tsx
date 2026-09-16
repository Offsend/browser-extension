import { useEffect, useState } from 'react';
import { TsEngine } from '@/core/detection';
import { t as i18n } from '@/core/i18n';
import {
  PRIVACY_TEST_PROMPT,
  runPrivacyTest,
  type PrivacyTestResult,
} from '@/core/onboarding/privacy-test';
import { Badge, Brand, Button, FONT_MONO, useTheme } from '@/ui';

type Step = 'intro' | 'result';

const engine = new TsEngine();

export function App() {
  const t = useTheme();
  const M = i18n();
  const [step, setStep] = useState<Step>('intro');
  const [result, setResult] = useState<PrivacyTestResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = M.welcome.documentTitle;
  }, [M.welcome.documentTitle]);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await runPrivacyTest(engine);
      setResult(next);
      setStep('result');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: t.bg0, color: t.text }}>
      <main
        style={{
          maxWidth: 440,
          margin: '0 auto',
          padding: '48px 20px 64px',
        }}
      >
        <Brand t={t} subtitle={M.popup.localOnly} />

        {step === 'intro' ? (
          <>
            <h1
              style={{
                margin: '28px 0 0',
                fontSize: 22,
                fontWeight: 600,
                lineHeight: 1.35,
              }}
            >
              {M.welcome.introTitle}
            </h1>
            <ul
              style={{
                margin: '22px 0 0',
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {[M.welcome.trustLocal, M.welcome.trustAccount, M.welcome.trustOpen].map((label) => (
                <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Badge t={t} tone="ok" dot>
                    {label}
                  </Badge>
                </li>
              ))}
            </ul>
            <pre
              style={{
                margin: '22px 0 0',
                padding: 12,
                background: t.bg2,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                fontSize: 12,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: FONT_MONO,
                color: t.textSub,
              }}
            >
              {PRIVACY_TEST_PROMPT}
            </pre>
            <div style={{ marginTop: 22 }}>
              <Button t={t} variant="primary" disabled={busy} onClick={() => void run()}>
                {M.welcome.runTest}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1
              style={{
                margin: '28px 0 0',
                fontSize: 22,
                fontWeight: 600,
                lineHeight: 1.35,
              }}
            >
              {M.overlay.sensitiveFound(result?.findings.length ?? 0)}
            </h1>
            <p style={{ margin: '10px 0 0', fontSize: 13, color: t.textSub }}>
              {M.welcome.localNote}
            </p>
            <div
              style={{
                marginTop: 18,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {result?.findings.map((f, i) => (
                <Badge key={`${f.detector}:${i}`} t={t} tone="warn">
                  {M.type[f.type]}
                </Badge>
              ))}
            </div>
            <p
              style={{
                margin: '22px 0 8px',
                fontSize: 12,
                color: t.textMuted,
              }}
            >
              {M.welcome.maskedPreview}
            </p>
            <pre
              style={{
                margin: 0,
                padding: 12,
                background: t.bg2,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                fontSize: 12,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: FONT_MONO,
                color: t.textSub,
              }}
            >
              {result?.masked ?? ''}
            </pre>
            <p
              style={{
                margin: '22px 0 0',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {M.welcome.done}
            </p>
            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <Button t={t} variant="outline" onClick={() => setStep('intro')}>
                {M.welcome.runTest}
              </Button>
              <Button t={t} variant="primary" onClick={() => browser.runtime.openOptionsPage()}>
                {M.popup.settings}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
