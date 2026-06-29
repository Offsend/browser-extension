import { useState } from 'react';
import { CUSTOM_RULE_LIMITS, type CustomRule } from '@/core/storage';
import { Button, Toggle, type Theme } from '@/ui';
import { CustomRuleModal } from './CustomRuleModal';

function newRule(): CustomRule {
  return {
    id: crypto.randomUUID(),
    name: '',
    pattern: '',
    enabled: true,
  };
}

function truncatePattern(pattern: string, max = 48): string {
  if (pattern.length <= max) return pattern;
  return `${pattern.slice(0, max - 1)}…`;
}

type ModalState =
  | { readonly kind: 'add' }
  | { readonly kind: 'edit'; readonly ruleId: string };

interface CustomRulesEditorProps {
  t: Theme;
  rules: readonly CustomRule[];
  onRulesChange: (rules: readonly CustomRule[]) => void;
}

export function CustomRulesEditor({ t, rules, onRulesChange }: CustomRulesEditorProps) {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [draft, setDraft] = useState<CustomRule>(() => newRule());

  const atLimit = rules.length >= CUSTOM_RULE_LIMITS.maxRules;

  const openAdd = () => {
    setDraft(newRule());
    setModal({ kind: 'add' });
  };

  const openEdit = (rule: CustomRule) => {
    setDraft({ ...rule });
    setModal({ kind: 'edit', ruleId: rule.id });
  };

  const closeModal = () => setModal(null);

  const toggleRule = (id: string) => {
    onRulesChange(
      rules.map((rule) => (rule.id === id ? { ...rule, enabled: !rule.enabled } : rule)),
    );
  };

  const submitModal = () => {
    if (modal?.kind === 'add') {
      onRulesChange([...rules, draft]);
    } else if (modal?.kind === 'edit') {
      onRulesChange(rules.map((rule) => (rule.id === draft.id ? draft : rule)));
    }
    closeModal();
  };

  const removeFromModal = () => {
    onRulesChange(rules.filter((rule) => rule.id !== draft.id));
    closeModal();
  };

  return (
    <>
      <div style={{ padding: '14px 0' }}>
        {rules.length === 0 ? (
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: t.textSub, lineHeight: 1.5 }}>
            No custom rules yet. Add a JavaScript regex to match company-specific values (without{' '}
            <code style={{ fontFamily: 'monospace' }}>/…/</code> delimiters).
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rules.map((rule, index) => (
              <div
                key={rule.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: index < rules.length - 1 ? `1px solid ${t.border}` : 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: rule.enabled ? t.text : t.textSub,
                    }}
                  >
                    {rule.name}
                  </div>
                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 11.5,
                      fontFamily: 'ui-monospace, monospace',
                      color: t.textMuted,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {truncatePattern(rule.pattern)}
                  </div>
                </div>
                <Button t={t} variant="outline" sm onClick={() => openEdit(rule)}>
                  Edit
                </Button>
                <Toggle t={t} on={rule.enabled} onChange={() => toggleRule(rule.id)} />
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <Button t={t} variant="outline" onClick={openAdd} disabled={atLimit}>
            Add rule
          </Button>
          {atLimit && (
            <span style={{ display: 'block', marginTop: 8, fontSize: 11.5, color: t.textSub }}>
              Maximum of {CUSTOM_RULE_LIMITS.maxRules} rules reached.
            </span>
          )}
        </div>
      </div>

      {modal && (
        <CustomRuleModal
          t={t}
          mode={modal.kind}
          draft={draft}
          onDraftChange={setDraft}
          onClose={closeModal}
          onSubmit={submitModal}
          onRemove={modal.kind === 'edit' ? removeFromModal : undefined}
        />
      )}
    </>
  );
}
